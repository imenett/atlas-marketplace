/**
 * @file cart.routes.ts
 * @description Routes de gestion du panier d'achat pour les clients authentifiés.
 * Toutes les routes nécessitent une session active (authMiddleware) et le rôle CLIENT (clientMiddleware).
 * Montées sur /api/cart dans app.ts.
 *
 * Le panier est persisté en base de données et lié à l'utilisateur connecté.
 * Si un article est ajouté alors qu'il existe déjà dans le panier, les quantités sont fusionnées.
 */
import { Router } from "express";
import { getCart, addItem, updateItem, removeItem, clearCart } from "../controllers/cartController.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { clientMiddleware } from "../middlewares/client.middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(clientMiddleware);

/**
 * GET /api/cart
 * @summary Retourne le panier de l'utilisateur connecté avec le détail de chaque article
 * @tags Panier
 * @return {Panier} 200 - Panier avec articles, prix et informations de stock - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/", getCart);

/**
 * POST /api/cart/items
 * @summary Ajoute un article au panier (fusionne si la variante existe déjà)
 * @tags Panier
 * @param {object} request.body.required - Article à ajouter
 * @param {number} request.body.variante_id.required - Identifiant de la variante produit
 * @param {number} request.body.quantite - Quantité à ajouter (défaut: 1)
 * @return {ArticlePanier} 201 - Article ajouté ou mis à jour dans le panier - application/json
 * @return {ErrorResponse} 400 - variante_id manquant ou stock insuffisant - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 404 - Variante produit introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.post("/items", addItem);

/**
 * PUT /api/cart/items/{itemId}
 * @summary Met à jour la quantité d'un article dans le panier
 * @tags Panier
 * @param {number} itemId.path.required - Identifiant de l'article dans le panier
 * @param {object} request.body.required - Nouvelle quantité
 * @param {number} request.body.quantite.required - Quantité souhaitée (doit être > 0 et <= stock)
 * @return {ArticlePanier} 200 - Article mis à jour - application/json
 * @return {ErrorResponse} 400 - Quantité invalide ou supérieure au stock disponible - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 404 - Article introuvable dans le panier - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.put("/items/:itemId", updateItem);

/**
 * DELETE /api/cart/items/{itemId}
 * @summary Supprime un article du panier
 * @tags Panier
 * @param {number} itemId.path.required - Identifiant de l'article à supprimer
 * @return {MessageResponse} 200 - Article supprimé - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.delete("/items/:itemId", removeItem);

/**
 * DELETE /api/cart
 * @summary Vide entièrement le panier de l'utilisateur
 * @tags Panier
 * @return {MessageResponse} 200 - Panier vidé - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.delete("/", clearCart);

export default router;
