/**
 * @file payment.routes.ts
 * @description Routes de traitement des paiements Stripe.
 * Montées sur /api/payment dans app.ts.
 *
 * ⚠️  IMPORTANT — ordre dans app.ts :
 * La route webhook DOIT être enregistrée AVANT app.use(express.json())
 * car elle a besoin du body brut (raw buffer) pour vérifier la signature Stripe.
 * Voir le commentaire dans app.ts.
 *
 * Flux de paiement :
 * 1. POST /create-intent  — Crée un PaymentIntent Stripe pour une commande
 * 2. Stripe.js côté client confirme le paiement
 * 3. POST /webhook        — Stripe notifie le succès via webhook (signature HMAC vérifiée)
 *                           → Décrémente le stock, met à jour le statut commande
 */
import { Router } from "express";
import { createPaymentIntent, stripeWebhook } from "../controllers/paymentController.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * POST /api/payment/webhook
 * @summary Point d'entrée du webhook Stripe (événements payment_intent.succeeded, etc.)
 * @tags Paiement
 * @description Reçoit les événements Stripe signés par HMAC-SHA256.
 * La signature est vérifiée avec STRIPE_WEBHOOK_SECRET.
 * Sur payment_intent.succeeded : décrémente le stock des articles et passe la commande à PAYEE.
 * ⚠️ Cette route utilise express.raw() et non express.json() — body brut requis.
 * @return {MessageResponse} 200 - Événement traité - application/json
 * @return {ErrorResponse} 400 - Signature Stripe invalide ou événement non supporté - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 */
router.post("/webhook", stripeWebhook);

/**
 * POST /api/payment/create-intent
 * @summary Crée un PaymentIntent Stripe pour une commande existante
 * @tags Paiement
 * @param {object} request.body.required - Données de la commande à payer
 * @param {number} request.body.commande_id.required - Identifiant de la commande à payer
 * @return {PaymentIntentResponse} 200 - clientSecret et paymentIntentId pour Stripe.js - application/json
 * @return {ErrorResponse} 400 - Commande invalide ou déjà payée - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 404 - Commande introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur Stripe ou serveur - application/json
 * @security cookieAuth
 */
router.post("/create-intent", authMiddleware, createPaymentIntent);

export default router;
