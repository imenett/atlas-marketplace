/**
 * @file boutiques.routes.ts
 * @description Route publique de récupération des boutiques actives.
 * Un cache mémoire de 60 secondes est appliqué pour réduire la charge sur PostgreSQL.
 * Le cache est invalidé automatiquement quand un vendeur modifie les informations de sa boutique.
 */
import express from "express";
import { pool } from "../db/index.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const router = express.Router();

/**
 * GET /api/boutiques
 * @summary Retourne toutes les boutiques actives avec leurs statistiques
 * @tags Boutiques
 * @return {array<Boutique>} 200 - Liste des boutiques triées par note puis date de création - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 */
/*WHERE b.statut = 'ACTIVE'* => on ajoute cette ligne quand on regle le problème de statut de boutique*/
router.get("/", cacheMiddleware("boutiques", 60_000), async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.nom,
        b.description,
        b.url_logo,
        b.url_image_couverture,
        b.note_moyenne,
        b.cree_le,
        u.name AS proprietaire_nom,
        COUNT(DISTINCT p.id) AS nb_produits
      FROM boutiques b
      JOIN public.user u ON u.id = b.proprietaire_id
      LEFT JOIN produits p ON p.boutique_id = b.id AND p.actif = true
      WHERE b.statut = 'ACTIVE'
      GROUP BY b.id, u.name
      ORDER BY b.note_moyenne DESC, b.cree_le DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erreur GET /boutiques:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
