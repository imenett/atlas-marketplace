/**
 * @file orders.controller.ts
 * @description Contrôleur des commandes pour les vendeurs.
 *
 * Expose les opérations suivantes :
 * - getVendorOrders   : liste les commandes reçues par la boutique du vendeur
 * - updateOrderStatus : met à jour le statut d'un article commande
 *
 * Après chaque mise à jour d'article, le statut global de la commande
 * est recalculé automatiquement via updateOrderStatusFromItems (order.service.ts).
 */
import type { Request, Response } from "express";
import { pool } from "../db/index.js";
import { updateOrderStatusFromItems } from "../services/order.service.js";

/**
 * Récupère l'identifiant de la boutique du vendeur connecté.
 * @param {string} userId - UUID BetterAuth du vendeur
 * @returns {Promise<number | null>} Identifiant de la boutique, ou null si non trouvée
 */
async function getBoutiqueId(userId: string): Promise<number | null> {
  const result = await pool.query(
    `SELECT id FROM boutiques WHERE proprietaire_id = $1`,
    [userId]
  );
  return result.rows[0]?.id || null;
}

// GET — Commandes reçues par la boutique ------------------------------

/**
 * Récupère toutes les commandes contenant des articles
 * appartenant à la boutique du vendeur connecté
 * GET /api/vendor/orders
 */
/**
 * Retourne toutes les commandes contenant des articles de la boutique du vendeur.
 * Exclut les commandes EN_ATTENTE_PAIEMENT (non payées).
 * Les données sont formatées pour correspondre au format attendu par le frontend vendeur.
 * @param {Request} req - Requête Express (req.user.id requis via authMiddleware + vendorMiddleware)
 * @param {Response} res - Réponse JSON : 200 (array d'articles avec commande et produit imbriqués) | 404 | 500
 * @returns {Promise<void>}
 */
export async function getVendorOrders(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);

    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }

    const result = await pool.query(
      `SELECT
        ac.id,
        ac.quantite,
        ac.prix_unitaire,
        ac.statut,
        ac.numero_suivi,
        ac.transporteur,
        ac.commande_id,

        -- Infos commande
        c.cree_le        AS commande_cree_le,
        c.statut         AS commande_statut,
        c.adresse_livraison,

        -- Infos client
        u.id             AS client_id,
        u.name           AS client_nom,
        u.email          AS client_email,

        -- Infos variante
        vp.id            AS variante_id,
        vp.attributs     AS variante_attributs,
        vp.sku,

        -- Infos produit
        p.id             AS produit_id,
        p.nom            AS produit_nom,
        p.images         AS produit_images

      FROM articles_commande ac
      JOIN commandes c   ON c.id  = ac.commande_id
      JOIN "user"    u   ON u.id  = c.client_id
      JOIN variantes_produit vp ON vp.id = ac.variante_id
      JOIN produits  p   ON p.id  = vp.produit_id

      WHERE ac.boutique_id = $1 AND c.statut != 'EN_ATTENTE_PAIEMENT'
      ORDER BY ac.commande_id DESC`,
      [boutiqueId]
    );

    // Reformater les données pour coller au format attendu par le front
    const articles = result.rows.map((row) => ({
      id: row.id,
      quantite: row.quantite,
      prix_unitaire: row.prix_unitaire,
      statut: row.statut,
      numero_suivi: row.numero_suivi,
      transporteur: row.transporteur,
      commandes: {
        id: row.commande_id,
        cree_le: row.commande_cree_le,
        statut: row.commande_statut,
        adresse_livraison: row.adresse_livraison,
        user: {
          id: row.client_id,
          name: row.client_nom,
          email: row.client_email,
        },
      },
      variantes_produit: {
        id: row.variante_id,
        attributs: row.variante_attributs,
        sku: row.sku,
        produits: {
          id: row.produit_id,
          nom: row.produit_nom,
          images: row.produit_images,
        },
      },
    }));

    res.status(200).json(articles);

  } catch (error) {
    console.error("Erreur getVendorOrders :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// PUT — MAJ statut d'un article commande ------------------------------

/**
 * Met à jour le statut d'un article commande
 * Vérifie que l'article appartient bien à la boutique du vendeur
 * PUT /api/vendor/orders/:id
 * Body : { statut, numero_suivi?, transporteur? }
 */
/**
 * Met à jour le statut de tous les articles d'une commande appartenant à la boutique.
 * Si statut = EXPEDIE, le numero_suivi et le transporteur sont obligatoires.
 * Après mise à jour, recalcule le statut global de la commande via updateOrderStatusFromItems.
 * @param {Request} req - Params : { id } (articleId) | Body : { statut, numero_suivi?, transporteur? }
 * @param {Response} res - Réponse JSON : 200 ({ message, articles }) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const boutiqueId = await getBoutiqueId(user.id);

    if (!boutiqueId) {
      res.status(404).json({ error: "Aucune boutique trouvée pour ce vendeur" });
      return;
    }

    const articleId = Number(req.params.id);
    const { statut, numero_suivi, transporteur } = req.body;

    const statutsValides = ["EN_ATTENTE", "EN_PREPARATION", "EXPEDIE", "LIVRE", "RETOURNE", "REMBOURSE"];
    if (!statut || !statutsValides.includes(statut)) {
      res.status(400).json({ error: `Statut invalide. Valeurs acceptées : ${statutsValides.join(", ")}` });
      return;
    }

    if (statut === "EXPEDIE" && (!numero_suivi || !transporteur)) {
      res.status(400).json({ error: "numero_suivi et transporteur sont requis pour le statut EXPEDIE" });
      return;
    }

    // Récupère la commande_id de cet article
    const check = await pool.query(
      `SELECT id, commande_id FROM articles_commande WHERE id = $1 AND boutique_id = $2`,
      [articleId, boutiqueId]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Article introuvable ou non autorisé" });
      return;
    }

    const commandeId = check.rows[0].commande_id;

    // Met à jour TOUS les articles de cette commande appartenant à la boutique
    const result = await pool.query(
      `UPDATE articles_commande
       SET statut       = $1,
           numero_suivi = $2,
           transporteur = $3
       WHERE commande_id = $4 AND boutique_id = $5
       RETURNING *`,
      [statut, numero_suivi || null, transporteur || null, commandeId, boutiqueId]
    );

    await updateOrderStatusFromItems(commandeId);

    res.status(200).json({
      message: "Statut mis à jour avec succès",
      articles: result.rows,
    });

  } catch (error) {
    console.error("Erreur updateOrderStatus :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}