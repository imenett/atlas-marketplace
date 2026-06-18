/**
 * @file categories.routes.ts
 * @description Route publique de récupération des catégories produits.
 * Retourne toutes les catégories avec le nombre de produits actifs associés.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { pool } from "../db/index.js";

const router = Router();

/**
 * GET /api/categories
 * @summary Retourne toutes les catégories avec le nombre de produits actifs
 * @tags Catégories
 * @return {array<Categorie>} 200 - Liste des catégories triées par nom - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.nom,
        c.parent_id,
        COUNT(p.id)::int AS count
      FROM categories c
      LEFT JOIN produits p
        ON p.categorie_id = c.id AND p.actif = true
      GROUP BY c.id
      ORDER BY c.nom ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
