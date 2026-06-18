/**
 * @file reviews.routes.ts
 * @description Routes API pour la gestion des avis produits.
 *
 * FONCTIONNALITÉS :
 * - Récupération publique des avis par produit (avec nom de l'auteur).
 * - Création d'avis (soumise à authentification et vérification de commande livrée).
 * - Modification et suppression d'avis (réservées à l'auteur de l'avis).
 * - Mise à jour automatique de la note moyenne de la boutique à chaque changement (POST/PUT/DELETE).
 *
 * SÉCURITÉ :
 * - `authMiddleware` : Garantit que l'utilisateur est connecté.
 * - Vérification de propriété : Un utilisateur ne peut modifier ou supprimer que ses propres avis.
 * - Unicité : Un utilisateur ne peut laisser qu'un seul avis par produit.
 */
import express from "express";
import type { Request, Response } from "express";
import { pool } from "../db/index.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { clientMiddleware } from "../middlewares/client.middleware.js";

const router = express.Router();

/**
 * GET /api/reviews/product/{id}
 * @summary Retourne les avis d'un produit, triés par date décroissante
 * @tags Avis
 * @param {number} id.path.required - Identifiant du produit
 * @return {array<Avis>} 200 - Liste des avis du produit - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 */
router.get("/product/:id", async (req: Request, res: Response) => {
  try {
    const produitId = Number(req.params.id);

    const result = await pool.query(
      `SELECT
         a.id,
         a.note,
         a.commentaire,
         a.cree_le,
         a.utilisateur_id,
         u.name AS auteur
       FROM avis a
       JOIN "user" u ON u.id = a.utilisateur_id
       WHERE a.produit_id = $1
       ORDER BY a.cree_le DESC`,
      [produitId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur GET /reviews/product/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * POST /api/reviews/product/{id}
 * @summary Soumet un avis sur un produit (un seul avis par utilisateur par produit)
 * @tags Avis
 * @param {number} id.path.required - Identifiant du produit à noter
 * @param {object} request.body.required - Données de l'avis
 * @param {number} request.body.note.required - Note de 1 à 5
 * @param {string} request.body.commentaire - Commentaire optionnel
 * @return {Avis} 201 - Avis créé avec succès - application/json
 * @return {ErrorResponse} 400 - Note invalide (doit être entre 1 et 5) - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 409 - Avis déjà existant pour ce produit - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.post("/product/:id", authMiddleware, clientMiddleware, async (req: Request, res: Response) => {
  try {
    const produitId = Number(req.params.id);
    const userId = (req as any).user.id;
    const { note, commentaire } = req.body;

    // Validation note
    if (!note || note < 1 || note > 5) {
      res.status(400).json({ error: "La note doit être entre 1 et 5" });
      return;
    }
    if (commentaire && commentaire.length > 1000) {
      res.status(400).json({ error: "Le commentaire ne peut pas dépasser 1000 caractères" });
      return;
    }
    // Vérifier que le client a bien commandé ce produit ET l'a reçu (LIVRE)
    const eligibilite = await pool.query(
      `SELECT ac.id
       FROM articles_commande ac
       JOIN variantes_produit vp ON vp.id = ac.variante_id
       JOIN commandes cmd        ON cmd.id = ac.commande_id
       WHERE vp.produit_id = $1
         AND cmd.client_id = $2
         AND ac.statut = 'LIVRE'
       LIMIT 1`,
      [produitId, userId]
    );

    if (eligibilite.rows.length === 0) {
      res.status(403).json({
        error: "Vous devez avoir reçu ce produit pour laisser un avis",
      });
      return;
    }

    // Vérifier qu'il n'a pas déjà posté un avis
    const dejaAvis = await pool.query(
      `SELECT id FROM avis WHERE produit_id = $1 AND utilisateur_id = $2`,
      [produitId, userId]
    );

    if (dejaAvis.rows.length > 0) {
      res.status(409).json({ error: "Vous avez déjà posté un avis pour ce produit" });
      return;
    }

    // Insérer l'avis
    const insertion = await pool.query(
      `INSERT INTO avis (produit_id, utilisateur_id, note, commentaire)
       VALUES ($1, $2, $3, $4)
       RETURNING id, note, commentaire, cree_le`,
      [produitId, userId, note, commentaire || null]
    );

    // Recalculer la note moyenne
    await pool.query(
      `UPDATE boutiques b
       SET note_moyenne = (
         SELECT COALESCE(AVG(a.note), 0)
         FROM avis a
         JOIN produits p ON p.id = a.produit_id
         WHERE p.boutique_id = b.id
       )
       WHERE b.id = (
         SELECT boutique_id FROM produits WHERE id = $1
       )`,
      [produitId]
    );

    res.status(201).json(insertion.rows[0]);
  } catch (error) {
    console.error("Erreur POST /reviews/product/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * PUT /api/reviews/{id}
 * @summary Modifie un avis existant (auteur uniquement)
 * @tags Avis
 * @param {number} id.path.required - Identifiant de l'avis à modifier
 * @param {object} request.body.required - Nouvelles données de l'avis
 * @param {number} request.body.note.required - Nouvelle note de 1 à 5
 * @param {string} request.body.commentaire - Nouveau commentaire optionnel
 * @return {Avis} 200 - Avis mis à jour - application/json
 * @return {ErrorResponse} 400 - Note invalide - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 404 - Avis introuvable ou non autorisé - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.put("/:id", authMiddleware, clientMiddleware, async (req: Request, res: Response) => {
  try {
    const avisId = Number(req.params.id);
    const userId = (req as any).user.id;
    const { note, commentaire } = req.body;

    // Validation note
    if (!note || note < 1 || note > 5) {
      res.status(400).json({ error: "La note doit être entre 1 et 5" });
      return;
    }

    // Vérifier que l'avis appartient bien à cet utilisateur
    const existing = await pool.query(
      `SELECT id, produit_id FROM avis WHERE id = $1 AND utilisateur_id = $2`,
      [avisId, userId]
    );

    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Avis introuvable ou non autorisé" });
      return;
    }

    const produitId = existing.rows[0].produit_id;

    // Mettre à jour l'avis
    const updated = await pool.query(
      `UPDATE avis
       SET note = $1, commentaire = $2
       WHERE id = $3
       RETURNING id, note, commentaire, cree_le`,
      [note, commentaire || null, avisId]
    );

    // Recalculer la note moyenne
    await pool.query(
      `UPDATE boutiques b
       SET note_moyenne = (
         SELECT COALESCE(AVG(a.note), 0)
         FROM avis a
         JOIN produits p ON p.id = a.produit_id
         WHERE p.boutique_id = b.id
       )
       WHERE b.id = (
         SELECT boutique_id FROM produits WHERE id = $1
       )`,
      [produitId]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error("Erreur PUT /reviews/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * DELETE /api/reviews/{id}
 * @summary Supprime un avis (auteur uniquement)
 * @tags Avis
 * @param {number} id.path.required - Identifiant de l'avis à supprimer
 * @return {MessageResponse} 200 - Avis supprimé avec succès - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 404 - Avis introuvable ou non autorisé - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.delete("/:id", authMiddleware, clientMiddleware, async (req: Request, res: Response) => {
  try {
    const avisId = Number(req.params.id);
    const userId = (req as any).user.id;

    // Vérifier que l'avis appartient bien à cet utilisateur
    const avis = await pool.query(
      `SELECT id, produit_id FROM avis WHERE id = $1 AND utilisateur_id = $2`,
      [avisId, userId]
    );

    if (avis.rows.length === 0) {
      res.status(404).json({ error: "Avis introuvable ou non autorisé" });
      return;
    }

    const produitId = avis.rows[0].produit_id;

    await pool.query(`DELETE FROM avis WHERE id = $1`, [avisId]);

    // Recalculer la note moyenne après suppression
    await pool.query(
      `UPDATE boutiques b
       SET note_moyenne = (
         SELECT COALESCE(AVG(a.note), 0)
         FROM avis a
         JOIN produits p ON p.id = a.produit_id
         WHERE p.boutique_id = b.id
       )
       WHERE b.id = (
         SELECT boutique_id FROM produits WHERE id = $1
       )`,
      [produitId]
    );

    res.json({ message: "Avis supprimé avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /reviews/:id :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
