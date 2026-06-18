/**
 * @file orders.routes.ts (vendor)
 * @description Routes de gestion des commandes pour les vendeurs.
 * Toutes les routes sont protégées par authMiddleware et vendorMiddleware.
 * Un vendeur ne peut voir et modifier que les commandes contenant
 * des articles de SA boutique. Montées sur /api/vendor/orders dans app.ts.
 *
 * Différence avec les routes client (/api/orders) :
 * - Le vendeur voit les commandes qu'il doit EXPÉDIER
 * - Le client voit les commandes qu'il a PASSÉES
 */
import express from "express";
import * as ordersController from "../../controllers/orders.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { vendorMiddleware } from "../../middlewares/vendor.middleware.js";

const vendorOrdersRouter = express.Router();

vendorOrdersRouter.use(authMiddleware);
vendorOrdersRouter.use(vendorMiddleware);

/**
 * GET /api/vendor/orders
 * @summary Retourne toutes les commandes reçues par la boutique du vendeur
 * @tags Commandes Vendeur
 * @description Liste les commandes contenant au moins un article de la boutique du vendeur,
 * avec les informations client et le détail des articles à expédier.
 * @return {array<Commande>} 200 - Liste des commandes reçues, triées par date décroissante - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorOrdersRouter.get("/", ordersController.getVendorOrders);

/**
 * PUT /api/vendor/orders/{id}
 * @summary Met à jour le statut d'un article commande (ex: marquer comme expédié)
 * @tags Commandes Vendeur
 * @param {number} id.path.required - Identifiant de la commande
 * @param {object} request.body.required - Mise à jour du statut
 * @param {number} request.body.articleId.required - Identifiant de l'article commande à mettre à jour
 * @param {string} request.body.statut.required - Nouveau statut : EN_ATTENTE | EXPEDIE | LIVRE | ANNULE | REMBOURSE
 * @param {string} request.body.numero_suivi - Numéro de suivi (requis si statut = EXPEDIE)
 * @param {string} request.body.transporteur - Nom du transporteur (ex: "Colissimo", "UPS")
 * @return {object} 200 - Statut de l'article et de la commande mis à jour - application/json
 * @return {ErrorResponse} 400 - articleId ou statut manquant - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis ou article n'appartenant pas à la boutique - application/json
 * @return {ErrorResponse} 404 - Commande ou article introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
vendorOrdersRouter.put("/:id", ordersController.updateOrderStatus);

export default vendorOrdersRouter;
