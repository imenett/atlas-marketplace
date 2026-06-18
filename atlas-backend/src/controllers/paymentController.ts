/**
 * @file paymentController.ts
 * @description Gestion des paiements Stripe et des remboursements.
 *
 * POST /api/payment/create-intent  → crée un PaymentIntent Stripe
 * POST /api/payment/webhook        → reçoit payment_intent.succeeded
 * POST /api/payment/refund         → effectue un remboursement Stripe + restaure les stocks
 */

import type { Request, Response } from "express";
import Stripe from "stripe";
import { pool } from "../db/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-intent
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Crée un PaymentIntent Stripe pour une commande en attente de paiement.
 * Stocke le paiement_id Stripe dans la table commandes.
 * Le clientSecret retourné est utilisé par Stripe.js côté client pour confirmer le paiement.
 * @param {Request} req - Body : { commandeId: number } | req.user.id via authMiddleware
 * @param {Response} res - Réponse JSON : 200 ({ clientSecret }) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function createPaymentIntent(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id as string;
    const { commandeId } = req.body;

    if (!commandeId) {
      res.status(400).json({ error: "commandeId requis" });
      return;
    }

    const commandeRes = await pool.query(
      `SELECT id, montant_total, statut FROM commandes WHERE id = $1 AND client_id = $2`,
      [commandeId, userId]
    );

    const commande = commandeRes.rows[0];
    if (!commande) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    if (commande.statut !== "EN_ATTENTE_PAIEMENT") {
      res.status(400).json({ error: "Cette commande n'est plus en attente de paiement" });
      return;
    }

    const montantCentimes = Math.round(Number(commande.montant_total) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: montantCentimes,
      currency: "eur",
      metadata: {
        commande_id: commandeId.toString(),
        user_id: userId,
      },
    });

    await pool.query(
      `UPDATE commandes SET paiement_id = $1 WHERE id = $2`,
      [paymentIntent.id, commandeId]
    );

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("createPaymentIntent error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/refund
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Effectue un remboursement Stripe complet pour une commande payée
 * et restaure les stocks des variantes concernées.
 * Opération transactionnelle : si le remboursement Stripe échoue, la BDD n'est pas modifiée.
 * @param {Request} req - Body : { commandeId: number } | req.user.id via authMiddleware
 * @param {Response} res - Réponse JSON : 200 ({ success, message, refundId }) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function refundOrder(req: Request, res: Response) {
  const dbClient = await pool.connect();
  try {
    const userId = (req as any).user.id as string;
    const { commandeId } = req.body;

    if (!commandeId) {
      res.status(400).json({ error: "commandeId requis" });
      return;
    }

    // 1. Vérifier la légitimité de la demande
    const commandeRes = await dbClient.query(
      `SELECT id, paiement_id, statut FROM commandes WHERE id = $1 AND client_id = $2`,
      [commandeId, userId]
    );

    const commande = commandeRes.rows[0];
    if (!commande) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    if (commande.statut !== "PAYEE") {
      res.status(400).json({ error: "Seules les commandes payées peuvent être remboursées" });
      return;
    }
    if (!commande.paiement_id) {
      res.status(400).json({ error: "Aucun identifiant de paiement Stripe associé" });
      return;
    }

    await dbClient.query("BEGIN");

    // 2. Déclencher le remboursement Stripe (Sandbox compatible)
    const refund = await stripe.refunds.create({
      payment_intent: commande.paiement_id,
    });

    // 3. Mettre à jour le statut en base
    await dbClient.query(
      `UPDATE commandes SET statut = 'REMBOURSEE' WHERE id = $1`,
      [commandeId]
    );

    // 4. Restaurer le stock des articles annulés
    const articlesRes = await dbClient.query(
      `SELECT variante_id, quantite FROM articles_commande WHERE commande_id = $1`,
      [commandeId]
    );

    for (const article of articlesRes.rows) {
      await dbClient.query(
        `UPDATE variantes_produit 
         SET stock = stock + $1 
         WHERE id = $2`,
        [article.quantite, article.variante_id]
      );
    }

    await dbClient.query("COMMIT");
    console.log(`✅ Commande #${commandeId} remboursée — stocks restaurés`);
    
    res.status(200).json({ 
      success: true, 
      message: "Remboursement effectué avec succès",
      refundId: refund.id 
    });

  } catch (err: any) {
    await dbClient.query("ROLLBACK");
    console.error("Erreur refundOrder:", err);
    res.status(500).json({ error: "Erreur lors de la procédure de remboursement" });
  } finally {
    dbClient.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Handler du webhook Stripe pour l'événement payment_intent.succeeded.
 * Vérifie la signature HMAC du webhook avec STRIPE_WEBHOOK_SECRET.
 * Sur succès : passe la commande à PAYEE, décrémente le stock des articles,
 * et vide le panier du client.
 * ⚠️ Nécessite express.raw() (pas express.json()) pour la vérification de signature.
 * @param {Request} req - Body brut (Buffer) requis — headers["stripe-signature"] requis
 * @param {Response} res - Réponse JSON : 200 ({ received: true }) | 400 (signature invalide)
 * @returns {Promise<void>}
 */
export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature invalide:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  if (event.type !== "payment_intent.succeeded") {
    res.json({ received: true });
    return;
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const commandeIdStr = paymentIntent.metadata?.commande_id;

  if (!commandeIdStr) {
    res.json({ received: true });
    return;
  }

  const commandeId = parseInt(commandeIdStr, 10);
  const dbClient = await pool.connect();

  try {
    await dbClient.query("BEGIN");

    const updateRes = await dbClient.query(
      `UPDATE commandes
       SET statut = 'PAYEE'
       WHERE id = $1 AND statut = 'EN_ATTENTE_PAIEMENT'
       RETURNING client_id`,
      [commandeId]
    );

    if (updateRes.rowCount === 0) {
      await dbClient.query("ROLLBACK");
      res.json({ received: true });
      return;
    }

    const clientId = updateRes.rows[0].client_id;
    const articlesRes = await dbClient.query(
      `SELECT variante_id, quantite FROM articles_commande WHERE commande_id = $1`,
      [commandeId]
    );

    for (const article of articlesRes.rows) {
      const stockResult = await dbClient.query(
        `UPDATE variantes_produit
         SET stock = stock - $1
         WHERE id = $2 AND stock >= $1`,
        [article.quantite, article.variante_id]
      );
      if (stockResult.rowCount === 0) {
        throw new Error(`stock_insuffisant:variante=${article.variante_id}:quantite=${article.quantite}`);
      }
    }

    const panierRes = await dbClient.query(
      `SELECT id FROM paniers WHERE utilisateur_id = $1`,
      [clientId]
    );
    if (panierRes.rows[0]) {
      await dbClient.query(
        `DELETE FROM articles_panier WHERE panier_id = $1`,
        [panierRes.rows[0].id]
      );
    }

    await dbClient.query("COMMIT");
    console.log(`✅ Commande #${commandeId} confirmée via Webhook`);
  } catch (err: any) {
    await dbClient.query("ROLLBACK");
    if (err.message?.startsWith("stock_insuffisant:")) {
      console.error(`Webhook: ${err.message} — commande #${commandeId} PAYÉE mais stock non décrémenté`);
    } else {
      console.error(`Erreur webhook commande #${commandeId}:`, err);
    }
  } finally {
    dbClient.release();
  }

  res.json({ received: true });
}