/**
 * @file products.routes.ts (vendor)
 * @description Routes de gestion des produits réservées aux vendeurs.
 * Toutes les routes sont protégées par authMiddleware et vendorMiddleware.
 * L'isolation des données est assurée dans le controller :
 * un vendeur ne peut accéder et modifier que les produits de SA boutique.
 * Montées sur /api/vendor/products dans app.ts.
 */
import express from "express";
import * as productsController from "../../controllers/products.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { vendorMiddleware } from "../../middlewares/vendor.middleware.js";

const vendorProductsRouter = express.Router();

vendorProductsRouter.use(authMiddleware);
vendorProductsRouter.use(vendorMiddleware);

/**
 * GET /api/vendor/products
 * @summary Retourne tous les produits de la boutique du vendeur connecté
 * @tags Produits Vendeur
 * @return {array<Produit>} 200 - Liste des produits avec variantes, triée par date décroissante - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable pour ce vendeur - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorProductsRouter.get("/", productsController.getProduits);

/**
 * GET /api/vendor/products/{id}
 * @summary Retourne le détail d'un produit de la boutique du vendeur
 * @tags Produits Vendeur
 * @param {number} id.path.required - Identifiant du produit
 * @return {Produit} 200 - Détail du produit avec variantes et statistiques - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Produit introuvable ou n'appartenant pas à la boutique - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorProductsRouter.get("/:id", productsController.getProduit);

/**
 * POST /api/vendor/products
 * @summary Crée un nouveau produit dans la boutique du vendeur
 * @tags Produits Vendeur
 * @param {object} request.body.required - Données du produit
 * @param {string} request.body.nom.required - Nom du produit
 * @param {number} request.body.prix.required - Prix de base en euros
 * @param {number} request.body.categorie_id.required - Identifiant de la catégorie
 * @param {string} request.body.description - Description du produit
 * @param {number} request.body.prix_compare - Prix barré (avant promotion)
 * @param {array<string>} request.body.images - URLs des images
 * @param {boolean} request.body.actif - Produit visible publiquement (défaut: true)
 * @param {array<object>} request.body.variantes - Variantes du produit (auto-injectée si absent)
 * @return {Produit} 201 - Produit créé avec ses variantes et SKU générés - application/json
 * @return {ErrorResponse} 400 - Champs obligatoires manquants - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur lors de la création - application/json
 * @security cookieAuth
 */
vendorProductsRouter.post("/", productsController.createProduit);

/**
 * PUT /api/vendor/products/{id}
 * @summary Met à jour un produit existant de la boutique du vendeur
 * @tags Produits Vendeur
 * @param {number} id.path.required - Identifiant du produit à mettre à jour
 * @param {object} request.body.required - Champs à mettre à jour
 * @param {string} request.body.nom - Nouveau nom
 * @param {string} request.body.description - Nouvelle description
 * @param {number} request.body.prix - Nouveau prix
 * @param {number} request.body.prix_compare - Nouveau prix barré
 * @param {array<string>} request.body.images - Nouvelles URLs d'images
 * @param {boolean} request.body.actif - Visibilité du produit
 * @param {number} request.body.categorie_id - Nouvelle catégorie
 * @param {array<object>} request.body.variantes - Variantes mises à jour (upsert + soft delete)
 * @return {Produit} 200 - Produit mis à jour - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Produit introuvable ou non autorisé - application/json
 * @return {ErrorResponse} 500 - Erreur lors de la mise à jour - application/json
 * @security cookieAuth
 */
vendorProductsRouter.put("/:id", productsController.updateProduit);

/**
 * DELETE /api/vendor/products/{id}
 * @summary Désactive un produit (soft delete — le produit reste en base mais devient invisible)
 * @tags Produits Vendeur
 * @param {number} id.path.required - Identifiant du produit à désactiver
 * @return {object} 200 - message + produit désactivé - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Produit introuvable ou non autorisé - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorProductsRouter.delete("/:id", productsController.deleteProduit);

/**
 * GET /api/vendor/products/{id}/stock
 * @summary Retourne les niveaux de stock de toutes les variantes d'un produit
 * @tags Produits Vendeur
 * @param {number} id.path.required - Identifiant du produit
 * @return {array<StockVariante>} 200 - Liste des variantes avec stock et indicateur stock_faible - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorProductsRouter.get("/:id/stock", productsController.getStock);

/**
 * PUT /api/vendor/products/{id}/stock/{varianteId}
 * @summary Définit le stock absolu d'une variante (remplace la valeur actuelle)
 * @tags Produits Vendeur
 * @param {number} id.path.required - Identifiant du produit parent
 * @param {number} varianteId.path.required - Identifiant de la variante
 * @param {object} request.body.required - Nouveau stock
 * @param {number} request.body.stock.required - Quantité en stock (>= 0)
 * @return {VarianteProduit} 200 - Variante mise à jour avec le nouveau stock - application/json
 * @return {ErrorResponse} 400 - Stock invalide (négatif ou absent) - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Variante introuvable ou non autorisée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorProductsRouter.put("/:id/stock/:varianteId", productsController.updateStock);

/**
 * PATCH /api/vendor/products/{produitId}/stock/{varianteId}/reapprovisionner
 * @summary Ajoute une quantité au stock existant d'une variante (réapprovisionnement)
 * @tags Produits Vendeur
 * @param {number} produitId.path.required - Identifiant du produit parent
 * @param {number} varianteId.path.required - Identifiant de la variante à réapprovisionner
 * @param {object} request.body.required - Quantité à ajouter
 * @param {number} request.body.quantite.required - Quantité à ajouter au stock (doit être > 0)
 * @return {VarianteProduit} 200 - Variante avec le nouveau stock (stock += quantite) - application/json
 * @return {ErrorResponse} 400 - Quantité invalide (doit être > 0) - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Variante introuvable ou non autorisée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorProductsRouter.patch(
  "/:produitId/stock/:varianteId/reapprovisionner",
  productsController.reapprovisionnerVariante
);

export default vendorProductsRouter;
