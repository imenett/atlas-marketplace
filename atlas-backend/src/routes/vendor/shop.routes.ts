/**
 * @file shop.routes.ts
 * @description Routes de gestion de la boutique vendeur.
 * Toutes les routes sont protégées par authMiddleware et vendorMiddleware.
 * Montées sur /api/vendor/shop dans app.ts.
 *
 * Le statut de la boutique est calculé automatiquement à chaque modification :
 * - ACTIVE si : nom, description, iban, url_logo et url_image_couverture sont tous renseignés
 * - EN_ATTENTE sinon (boutique incomplète, non visible publiquement)
 */
import express from "express";
import multer from "multer";
import { auth } from "../../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { pool } from "../../db/index.js";
import { supabaseAdmin } from "../../lib/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées."));
    }
  },
});

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { vendorMiddleware } from "../../middlewares/vendor.middleware.js";
import { clearCache } from "../../middlewares/cache.middleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(vendorMiddleware);

/**
 * Mappe une ligne de la table boutiques vers un objet camelCase pour la réponse API.
 * @param {object} b - Ligne brute de la table boutiques
 * @returns {object} Objet boutique formaté en camelCase
 */
function mapShopRow(b: any) {
  return {
    id: b.id,
    ownerId: b.proprietaire_id,
    name: b.nom,
    description: b.description,
    logoUrl: b.url_logo,
    coverImageUrl: b.url_image_couverture,
    status: b.statut,
    iban: b.iban,
    siret: b.siret,
    averageRating: parseFloat(b.note_moyenne || "0"),
    createdAt: b.cree_le,
  };
}

/**
 * GET /api/vendor/shop/me
 * @summary Retourne les informations de la boutique du vendeur connecté
 * @tags Boutique Vendeur
 * @return {VendeurShop} 200 - Données de la boutique en camelCase - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique non trouvée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/me", async (req, res) => {
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    res.json(mapShopRow(result.rows[0]));
  } catch (error) {
    console.error("Erreur GET /shop/me:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /api/vendor/shop/stats
 * @summary Retourne les statistiques globales de la boutique du vendeur
 * @tags Boutique Vendeur
 * @return {ShopStats} 200 - Statistiques de la boutique (produits, ventes, notes) - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique non trouvée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/stats", async (req, res) => {
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM produits p WHERE p.boutique_id = b.id AND p.actif = true) as product_count,
         (SELECT COALESCE(SUM(ac.quantite), 0) FROM articles_commande ac JOIN commandes c ON ac.commande_id = c.id WHERE ac.boutique_id = b.id AND c.statut NOT IN ('ANNULEE', 'EN_ATTENTE_PAIEMENT')) as sales_count,
         b.note_moyenne,
         (SELECT COUNT(*) FROM avis a JOIN produits p ON a.produit_id = p.id WHERE p.boutique_id = b.id) as review_count
       FROM boutiques b
       WHERE b.proprietaire_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    const row = result.rows[0];
    res.json({
      productCount: parseInt(row.product_count || "0", 10),
      salesCount: parseInt(row.sales_count || "0", 10),
      averageRating: parseFloat(row.note_moyenne || "0"),
      reviewCount: parseInt(row.review_count || "0", 10),
    });
  } catch (error) {
    console.error("Erreur GET /shop/stats:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * Détermine le statut de la boutique en fonction des champs renseignés.
 * La boutique est ACTIVE uniquement si tous les champs obligatoires sont remplis.
 * @param {object} shopData - Données actuelles de la boutique
 * @param {string} shopData.nom - Nom de la boutique
 * @param {string} shopData.description - Description
 * @param {string} shopData.iban - IBAN du vendeur
 * @param {string} shopData.url_logo - URL du logo
 * @param {string} shopData.url_image_couverture - URL de l'image de couverture
 * @returns {"ACTIVE" | "EN_ATTENTE"} Statut calculé
 */
function getNewStatus(shopData: any): string {
  const hasRequiredFields =
    shopData.nom?.trim() &&
    shopData.description?.trim() &&
    shopData.iban?.trim() &&
    shopData.url_logo?.trim() &&
    shopData.url_image_couverture?.trim();

  return hasRequiredFields ? "ACTIVE" : "EN_ATTENTE";
}

/**
 * PUT /api/vendor/shop/info
 * @summary Met à jour les informations textuelles de la boutique (nom, description, IBAN)
 * @tags Boutique Vendeur
 * @param {object} request.body.required - Informations à mettre à jour
 * @param {string} request.body.name - Nouveau nom de la boutique
 * @param {string} request.body.description - Nouvelle description
 * @param {string} request.body.iban - Nouvel IBAN pour les virements
 * @return {object} 200 - message + shop mis à jour - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique non trouvée - application/json
 * @return {ErrorResponse} 500 - Erreur lors de la mise à jour - application/json
 * @security cookieAuth
 */
router.put("/info", async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, iban } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    // Construire l'objet avec les valeurs actuelles ou nouvelles
    const currentShop = existing.rows[0];
    const updatedShop = {
      nom: name || currentShop.nom,
      description: description !== undefined ? description : currentShop.description,
      iban: iban !== undefined ? iban : currentShop.iban,
      url_logo: currentShop.url_logo,
      url_image_couverture: currentShop.url_image_couverture,
    };

    // Déterminer le nouveau statut
    const newStatus = getNewStatus(updatedShop);

    const result = await pool.query(
      `UPDATE boutiques
       SET nom = COALESCE($1, nom),
           description = COALESCE($2, description),
           iban = COALESCE($3, iban),
           statut = $4
       WHERE proprietaire_id = $5 RETURNING *`,
      [name, description, iban, newStatus, userId]
    );

    clearCache("boutiques"); // Invalider le cache de la page vendeurs
    res.json({
      message: "Informations enregistrées avec succès",
      shop: mapShopRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Erreur PUT /shop/info:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

/**
 * PUT /api/vendor/shop/visuals
 * @summary Met à jour les visuels de la boutique (URL logo et image de couverture)
 * @tags Boutique Vendeur
 * @param {object} request.body.required - URLs des visuels
 * @param {string} request.body.logoUrl - URL publique du logo (obtenue via POST /upload?type=logo)
 * @param {string} request.body.coverImageUrl - URL publique de la couverture (obtenue via POST /upload?type=cover)
 * @return {object} 200 - message + shop mis à jour - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique non trouvée - application/json
 * @return {ErrorResponse} 500 - Erreur lors de la mise à jour - application/json
 * @security cookieAuth
 */
router.put("/visuals", async (req, res) => {
  const userId = (req as any).user.id;
  const { logoUrl, coverImageUrl } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    // Construire l'objet avec les valeurs actuelles ou nouvelles
    const currentShop = existing.rows[0];
    const updatedShop = {
      nom: currentShop.nom,
      description: currentShop.description,
      iban: currentShop.iban,
      url_logo: logoUrl !== undefined ? logoUrl : currentShop.url_logo,
      url_image_couverture: coverImageUrl !== undefined ? coverImageUrl : currentShop.url_image_couverture,
    };

    // Déterminer le nouveau statut
    const newStatus = getNewStatus(updatedShop);

    const result = await pool.query(
      `UPDATE boutiques
       SET url_logo = COALESCE($1, url_logo),
           url_image_couverture = COALESCE($2, url_image_couverture),
           statut = $3
       WHERE proprietaire_id = $4 RETURNING *`,
      [logoUrl, coverImageUrl, newStatus, userId]
    );

    clearCache("boutiques"); // Invalider le cache de la page vendeurs
    res.json({
      message: "Visuels enregistrés avec succès",
      shop: mapShopRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Erreur PUT /shop/visuals:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

/**
 * PUT /api/vendor/shop
 * @summary Met à jour toutes les informations de la boutique (déprécié — préférer /info et /visuals)
 * @tags Boutique Vendeur
 * @deprecated
 * @param {object} request.body.required - Données de la boutique
 * @param {string} request.body.name - Nom de la boutique
 * @param {string} request.body.description - Description
 * @param {string} request.body.logoUrl - URL du logo
 * @param {string} request.body.coverImageUrl - URL de la couverture
 * @param {string} request.body.iban - IBAN du vendeur
 * @return {object} 200 - message + shop mis à jour - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique non trouvée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.put("/", async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, logoUrl, coverImageUrl, iban } = req.body;

  try {
    const existing = await pool.query(
      `SELECT * FROM boutiques WHERE proprietaire_id = $1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    // Construire l'objet avec les valeurs actuelles ou nouvelles
    const currentShop = existing.rows[0];
    const updatedShop = {
      nom: name || currentShop.nom,
      description: description !== undefined ? description : currentShop.description,
      iban: iban !== undefined ? iban : currentShop.iban,
      url_logo: logoUrl !== undefined ? logoUrl : currentShop.url_logo,
      url_image_couverture: coverImageUrl !== undefined ? coverImageUrl : currentShop.url_image_couverture,
    };

    // Déterminer le nouveau statut
    const newStatus = getNewStatus(updatedShop);

    const result = await pool.query(
      `UPDATE boutiques
       SET nom = COALESCE($1, nom),
           description = COALESCE($2, description),
           url_logo = COALESCE($3, url_logo),
           url_image_couverture = COALESCE($4, url_image_couverture),
           iban = COALESCE($5, iban),
           statut = $6
       WHERE proprietaire_id = $7 RETURNING *`,
      [name, description, logoUrl, coverImageUrl, iban, newStatus, userId]
    );

    res.json({
      message: "Boutique mise à jour avec succès",
      shop: mapShopRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Erreur PUT /shop:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

/**
 * DELETE /api/vendor/shop
 * @summary Supprime définitivement la boutique du vendeur
 * @tags Boutique Vendeur
 * @return {MessageResponse} 200 - Boutique supprimée avec succès - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique non trouvée - application/json
 * @return {ErrorResponse} 500 - Erreur lors de la suppression - application/json
 * @security cookieAuth
 */
router.delete("/", async (req, res) => {
  const userId = (req as any).user.id;

  try {
    const result = await pool.query(
      `DELETE FROM boutiques WHERE proprietaire_id = $1 RETURNING id`,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Boutique non trouvée" });
      return;
    }

    res.json({ message: "Boutique supprimée avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /shop:", error);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

/**
 * POST /api/vendor/shop/upload
 * @summary Téléverse une image (logo ou couverture) vers Supabase Storage
 * @tags Boutique Vendeur
 * @param {string} type.query.required - Type d'image : logo | cover
 * @param {file} image.formData.required - Fichier image (JPEG, PNG, WebP — max 5 Mo)
 * @return {object} 200 - URL publique de l'image téléversée ({ url: string }) - application/json
 * @return {ErrorResponse} 400 - Fichier manquant ou type invalide - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 500 - Erreur lors du téléversement vers Supabase - application/json
 * @security cookieAuth
 */
router.post("/upload", upload.single("image"), async (req, res) => {
  const userId = (req as any).user.id;
  const file = req.file;
  const type = req.query.type as string; // "logo" ou "cover"

  if (!file) {
    res.status(400).json({ error: "Aucun fichier fourni." });
    return;
  }

  if (!type || !["logo", "cover"].includes(type)) {
    res.status(400).json({ error: "Type invalide. Utilisez 'logo' ou 'cover'." });
    return;
  }

  try {
    const folder = type === "logo" ? "logos" : "covers";
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `${folder}/${userId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("boutiques-images")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Erreur upload Supabase:", uploadError);
      res.status(500).json({ error: "Erreur lors du téléversement vers le stockage." });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("boutiques-images")
      .getPublicUrl(fileName);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("Erreur POST /shop/upload:", error);
    res.status(500).json({ error: "Erreur serveur lors du téléversement." });
  }
});

export default router;
