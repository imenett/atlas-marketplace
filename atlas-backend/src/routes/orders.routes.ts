/**
 * @file orders.routes.ts
 * @description Routes des commandes pour les clients connectés.
 * Toutes les routes sont protégées par authMiddleware et clientMiddleware.
 * Montées sur /api/orders dans app.ts.
 *
 * Cycle de vie d'une commande :
 * 1. POST /       — Création depuis le panier (statut: EN_ATTENTE_PAIEMENT)
 * 2. Paiement Stripe côté client (via /api/payment/create-intent)
 * 3. PATCH /:id/confirm — Confirmation après paiement réussi (statut: PAYEE)
 */
import { Router } from "express";
import {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
} from "../controllers/ordersController.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { clientMiddleware } from "../middlewares/client.middleware.js";

const router = Router();

router.use(authMiddleware);
router.use(clientMiddleware);

/**
 * POST /api/orders
 * @summary Crée une commande à partir du contenu actuel du panier
 * @tags Commandes
 * @param {object} request.body.required - Informations de livraison
 * @param {number} request.body.adresse_id.required - Identifiant de l'adresse de livraison
 * @param {string} request.body.methode_livraison.required - Méthode : standard | express | next_day
 * @return {Commande} 201 - Commande créée avec statut EN_ATTENTE_PAIEMENT - application/json
 * @return {ErrorResponse} 400 - Panier vide, adresse invalide ou méthode de livraison invalide - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.post("/", createOrder);

/**
 * PATCH /api/orders/{id}/confirm
 * @summary Confirme le paiement d'une commande (passe le statut à PAYEE)
 * @tags Commandes
 * @param {number} id.path.required - Identifiant de la commande à confirmer
 * @return {Commande} 200 - Commande confirmée et panier vidé - application/json
 * @return {ErrorResponse} 400 - Commande déjà payée ou dans un état incompatible - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 404 - Commande introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.patch("/:id/confirm", confirmPayment);

/**
 * GET /api/orders
 * @summary Retourne toutes les commandes de l'utilisateur connecté
 * @tags Commandes
 * @return {array<Commande>} 200 - Liste des commandes avec articles, triée par date décroissante - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/", getMyOrders);

/**
 * GET /api/orders/{id}
 * @summary Retourne le détail d'une commande spécifique
 * @tags Commandes
 * @param {number} id.path.required - Identifiant de la commande
 * @return {Commande} 200 - Détail complet de la commande avec tous ses articles - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis ou commande appartenant à un autre utilisateur - application/json
 * @return {ErrorResponse} 404 - Commande introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/:id", getOrderById);

/**
 * PUT /api/orders/{id}/cancel
 * @summary Annule une commande (possible uniquement si statut EN_ATTENTE_PAIEMENT ou PAYEE)
 * @tags Commandes
 * @param {number} id.path.required - Identifiant de la commande à annuler
 * @return {Commande} 200 - Commande annulée et stock restauré - application/json
 * @return {ErrorResponse} 400 - Commande dans un état non annulable (ex: déjà expédiée) - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle CLIENT requis - application/json
 * @return {ErrorResponse} 404 - Commande introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.put("/:id/cancel", cancelOrder);

export default router;
