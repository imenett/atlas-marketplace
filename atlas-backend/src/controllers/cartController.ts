/**
 * @file cartController.ts
 * @description Contrôleur du panier d'achat (CRUD complet).
 *
 * Gère toutes les opérations sur le panier de l'utilisateur connecté :
 * - Récupération du panier avec le détail des articles (produits, variantes, boutiques)
 * - Ajout d'un article avec fusion automatique si déjà présent
 * - Modification de la quantité d'un article
 * - Suppression d'un article
 * - Vidage complet du panier
 *
 * Chaque utilisateur possède un seul panier créé automatiquement à la première action.
 * Toutes les opérations incluent une vérification du stock et une sécurité
 * cross-user (un utilisateur ne peut pas modifier le panier d'un autre).
 *
 * Routes associées : /api/cart (cart.routes.ts)
 */
import type { Request, Response } from "express";
import { pool } from "../db/index.js";

/**
 * Récupère l'identifiant du panier de l'utilisateur ou en crée un nouveau.
 * Cette fonction garantit qu'il n'y a jamais qu'un seul panier par utilisateur.
 * @param {string} userId - UUID de l'utilisateur (BetterAuth)
 * @returns {Promise<number>} Identifiant du panier existant ou nouvellement créé
 */
async function getOrCreatePanier(userId: string): Promise<number> {
  const existing = await pool.query(
    `SELECT id FROM paniers WHERE utilisateur_id = $1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await pool.query(
    `INSERT INTO paniers (utilisateur_id) VALUES ($1) RETURNING id`,
    [userId]
  );
  return created.rows[0].id;
}

/**
 * Retourne le panier de l'utilisateur avec le détail complet de chaque article
 * (produit, variante, boutique, prix calculé avec supplément éventuel).
 * @param {Request} req - Requête Express (req.user.id requis via authMiddleware)
 * @param {Response} res - Réponse JSON : 200 ({ panier_id, articles, total }) | 500
 * @returns {Promise<void>}
 */
export async function getCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const panierId = await getOrCreatePanier(userId);

    const result = await pool.query(
      `SELECT
        ap.id,
        ap.quantite,
        ap.variante_id,
        p.id AS produit_id,
        p.nom AS produit_nom,
        p.prix AS prix_base,
        COALESCE(p.images, '[]'::jsonb) AS images,
        p.boutique_id,
        COALESCE(b.nom, 'Vendeur inconnu') AS boutique_nom,
        (COALESCE(p.prix, 0) + COALESCE(vp.prix_supplementaire, 0)) AS prix_unitaire,
        COALESCE(vp.attributs, '{}'::jsonb) AS variante_attributs
       FROM articles_panier ap
       LEFT JOIN variantes_produit vp ON vp.id = ap.variante_id
       LEFT JOIN produits p ON p.id = vp.produit_id
       LEFT JOIN boutiques b ON b.id = p.boutique_id
       WHERE ap.panier_id = $1`,
      [panierId]
    );

    const articles = result.rows;
    const total = articles.reduce(
      (sum: number, a: any) => sum + parseFloat(a.prix_unitaire || 0) * a.quantite,
      0
    );

    res.json({ panier_id: panierId, articles, total });
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Ajoute un article au panier.
 * Si la variante est déjà dans le panier, les quantités sont fusionnées.
 * Vérifie que le stock disponible est suffisant avant l'ajout ou la fusion.
 * @param {Request} req - Body : { variante_id: number, quantite?: number }
 * @param {Response} res - Réponse JSON : 201 (article ajouté/mis à jour) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function addItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { variante_id, quantite = 1 } = req.body;

    if (!variante_id) {
      res.status(400).json({ error: "variante_id requis" });
      return;
    }

    // Vérifier l'existence de la variante et son stock
    const varianteRes = await pool.query(
      `SELECT id, stock FROM variantes_produit WHERE id = $1`,
      [variante_id]
    );
    const variante = varianteRes.rows[0];
    if (!variante) {
      res.status(404).json({ error: "Variante introuvable" });
      return;
    }

    const panierId = await getOrCreatePanier(userId);

    // Vérifier si la variante est déjà dans le panier
    const existantRes = await pool.query(
      `SELECT id, quantite FROM articles_panier WHERE panier_id = $1 AND variante_id = $2`,
      [panierId, variante_id]
    );
    const existant = existantRes.rows[0];

    if (existant) {
      // Fusion : additionner les quantités
      const nouvelleQuantite = existant.quantite + quantite;
      if (variante.stock < nouvelleQuantite) {
        res.status(400).json({ error: `Désolé, il ne reste que ${variante.stock} articles en stock.` });
        return;
      }
      const updated = await pool.query(
        `UPDATE articles_panier SET quantite = $1 WHERE id = $2 RETURNING *`,
        [nouvelleQuantite, existant.id]
      );
      res.status(201).json(updated.rows[0]);
    } else {
      // Nouvel article
      if (variante.stock < quantite) {
        res.status(400).json({ error: "Stock insuffisant" });
        return;
      }
      const inserted = await pool.query(
        `INSERT INTO articles_panier (panier_id, variante_id, quantite) VALUES ($1, $2, $3) RETURNING *`,
        [panierId, variante_id, quantite]
      );
      res.status(201).json(inserted.rows[0]);
    }

    await pool.query(
      `UPDATE paniers SET mis_a_jour_le = NOW() WHERE id = $1`,
      [panierId]
    );
  } catch (err) {
    console.error("addItem error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Met à jour la quantité d'un article existant dans le panier.
 * Vérifie que la nouvelle quantité ne dépasse pas le stock disponible.
 * @param {Request} req - Params : { itemId } — Body : { quantite: number }
 * @param {Response} res - Réponse JSON : 200 (article mis à jour) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function updateItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const itemId = parseInt(req.params.itemId as string);
    const { quantite } = req.body;

    if (!quantite || quantite < 1) {
      res.status(400).json({ error: "Quantité invalide (min 1)" });
      return;
    }

    const panierId = await getOrCreatePanier(userId);

    const articleRes = await pool.query(
      `SELECT ap.*, vp.stock FROM articles_panier ap
       JOIN variantes_produit vp ON vp.id = ap.variante_id
       WHERE ap.id = $1 AND ap.panier_id = $2`,
      [itemId, panierId]
    );
    const article = articleRes.rows[0];

    if (!article) {
      res.status(404).json({ error: "Article introuvable" });
      return;
    }
    if (article.stock < quantite) {
      res.status(400).json({ error: "Stock insuffisant" });
      return;
    }

    const updated = await pool.query(
      `UPDATE articles_panier SET quantite = $1 WHERE id = $2 RETURNING *`,
      [quantite, itemId]
    );

    await pool.query(
      `UPDATE paniers SET mis_a_jour_le = NOW() WHERE id = $1`,
      [panierId]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("updateItem error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Supprime un article du panier de l'utilisateur.
 * Vérifie que l'article appartient bien au panier de l'utilisateur (sécurité cross-user).
 * @param {Request} req - Params : { itemId } — Identifiant de l'article à supprimer
 * @param {Response} res - Réponse JSON : 200 (message) | 404 | 500
 * @returns {Promise<void>}
 */
export async function removeItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const itemId = parseInt(req.params.itemId as string);
    const panierId = await getOrCreatePanier(userId);

    const deleted = await pool.query(
      `DELETE FROM articles_panier WHERE id = $1 AND panier_id = $2 RETURNING *`,
      [itemId, panierId]
    );

    if (!deleted.rows[0]) {
      res.status(404).json({ error: "Article introuvable" });
      return;
    }

    await pool.query(
      `UPDATE paniers SET mis_a_jour_le = NOW() WHERE id = $1`,
      [panierId]
    );

    res.json({ message: "Article supprimé" });
  } catch (err) {
    console.error("removeItem error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Vide complètement le panier de l'utilisateur (supprime tous les articles).
 * Le panier lui-même est conservé en base (la table paniers n'est pas modifiée).
 * @param {Request} req - Requête Express (req.user.id requis)
 * @param {Response} res - Réponse JSON : 200 (message) | 500
 * @returns {Promise<void>}
 */
export async function clearCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const panierId = await getOrCreatePanier(userId);

    await pool.query(
      `DELETE FROM articles_panier WHERE panier_id = $1`,
      [panierId]
    );

    await pool.query(
      `UPDATE paniers SET mis_a_jour_le = NOW() WHERE id = $1`,
      [panierId]
    );

    res.json({ message: "Panier vidé" });
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
