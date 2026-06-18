/**
 * @file products.routes.ts
 * @description Routes publiques pour la consultation du catalogue produits.
 * Ces routes sont accessibles sans authentification.
 * Un cache mémoire de 60 secondes est appliqué sur la liste des produits
 * pour réduire la charge sur PostgreSQL lors des pics de trafic.
 */
import express from "express";
import {
  getProduitsPublic,
  getProduitPublic
} from "../controllers/products.controller.js";
import { cacheMiddleware } from "../middlewares/cache.middleware.js";

const productsRouter = express.Router();

/**
 * GET /api/products
 * @summary Retourne le catalogue produits paginé avec filtres
 * @tags Produits
 * @param {string} recherche.query - Terme de recherche libre
 * @param {string} recherche_type.query - Type de recherche : produit | boutique | categorie (défaut: tous les champs)
 * @param {number} prix_min.query - Prix minimum en euros (filtre inclusif)
 * @param {number} prix_max.query - Prix maximum en euros (filtre inclusif)
 * @param {string} categories.query - Noms de catégories séparés par des virgules (ex: "Électronique,Mode")
 * @param {number} note_min.query - Note moyenne minimale de 1 à 5
 * @param {string} tri.query - Tri : price-asc | price-desc | rating | newest (défaut: newest)
 * @param {number} page.query - Numéro de page (défaut: 1)
 * @param {number} limite.query - Nombre de produits par page (défaut: 9)
 * @return {PaginatedProductsResponse} 200 - Liste paginée des produits - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 */
productsRouter.get("/", cacheMiddleware("products", 60_000), getProduitsPublic);

/**
 * GET /api/products/{id}
 * @summary Retourne le détail d'un produit par son identifiant
 * @tags Produits
 * @param {number} id.path.required - Identifiant du produit
 * @return {Produit} 200 - Détail du produit avec variantes et avis - application/json
 * @return {ErrorResponse} 404 - Produit introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 */
productsRouter.get("/:id", getProduitPublic);

export default productsRouter;
