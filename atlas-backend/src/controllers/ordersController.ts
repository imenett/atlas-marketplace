/**
 * @file ordersController.ts
 * @description Contrôleur des commandes pour les clients.
 *
 * Expose les opérations suivantes :
 *  - createOrder    : crée une commande depuis le panier (SANS toucher au stock)
 *  - confirmPayment : passe la commande de EN_ATTENTE_PAIEMENT → PAYEE
 *  - getMyOrders    : liste toutes les commandes du client connecté
 *  - getOrderById   : détail complet d'une commande spécifique
 *  - cancelOrder    : annulation + restock automatique
 *
 * Logique stock :
 *  - Le stock est décrémenté dans paymentController.ts → stripeWebhook
 *    UNIQUEMENT après payment_intent.succeeded
 *  - Le stock est restitué dans cancelOrder si la commande était PAYEE
 */
import type { Request, Response } from "express";
import { pool } from "../db/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────────────────────

type ShippingId = "standard" | "express" | "next-day";

const SHIPPING_METHODS: Record<ShippingId, { label: string; delai: string; price: number }> = {
  "standard":  { label: "Livraison Standard",  delai: "5-7 jours ouvrés",    price: 0 },
  "express":   { label: "Livraison Express",   delai: "2-3 jours ouvrés",    price: 9.99 },
  "next-day":  { label: "Livraison Lendemain", delai: "Commandez avant 14h", price: 14.99 },
};

interface AddressInput {
  firstName: string;
  lastName:  string;
  address:   string;
  postalCode: string;
  city:      string;
  phone:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valide les champs de l'adresse et la méthode de livraison.
 * @param {AddressInput} address - Données d'adresse du formulaire checkout
 * @param {string} shippingId - Identifiant de la méthode de livraison
 * @returns {{ field: string, message: string }[]} Tableau d'erreurs (vide si valide)
 */
function validateOrderPayload(address: AddressInput, shippingId: string) {
  const errors: { field: string; message: string }[] = [];
  if (!address?.firstName?.trim())  errors.push({ field: "firstName",  message: "Prénom requis" });
  if (!address?.lastName?.trim())   errors.push({ field: "lastName",   message: "Nom requis" });
  if (!address?.address?.trim())    errors.push({ field: "address",    message: "Adresse requise" });
  if (!address?.postalCode?.trim()) errors.push({ field: "postalCode", message: "Code postal requis" });
  if (!address?.city?.trim())       errors.push({ field: "city",       message: "Ville requise" });
  if (!address?.phone?.trim())      errors.push({ field: "phone",      message: "Téléphone requis" });
  if (address?.postalCode && !/^\d{5}$/.test(address.postalCode.trim())) {
    errors.push({ field: "postalCode", message: "Code postal invalide (5 chiffres)" });
  }
  if (!shippingId || !Object.keys(SHIPPING_METHODS).includes(shippingId)) {
    errors.push({ field: "shippingId", message: "Mode de livraison invalide" });
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Crée la commande + les lignes articles.
// ⚠️  NE décrémente PAS le stock — c'est fait dans le webhook Stripe.
// ⚠️  NE vide PAS le panier — c'est fait dans le webhook Stripe.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Crée une commande depuis le contenu actuel du panier.
 * ⚠️ NE décrémente PAS le stock — fait dans stripeWebhook après payment_intent.succeeded.
 * ⚠️ NE vide PAS le panier — fait dans stripeWebhook après payment_intent.succeeded.
 * @param {Request} req - Body : { address: AddressInput, shippingId: ShippingId }
 * @param {Response} res - Réponse JSON : 201 ({ success, commandeId, total }) | 400 | 409 (stock) | 500
 * @returns {Promise<void>}
 */
export async function createOrder(req: Request, res: Response) {
  const userId = (req as any).user.id as string;
  const { address, shippingId } = req.body as { address: AddressInput; shippingId: ShippingId };

  // 1. Validation
  const errors = validateOrderPayload(address, shippingId);
  if (errors.length > 0) {
    res.status(400).json({ error: "Données invalides", details: errors });
    return;
  }

  const shipping = SHIPPING_METHODS[shippingId];

  // 2. Récupérer le panier
  const panierRes = await pool.query<{ id: number }>(
    `SELECT id FROM paniers WHERE utilisateur_id = $1`,
    [userId]
  );
  if (panierRes.rows.length === 0) {
    res.status(400).json({ error: "Le panier est vide" });
    return;
  }
  const panierId = panierRes.rows[0]!.id;

  // 3. Snapshot adresse (pur JS, pas de DB)
  const adresseLivraison = {
    prenom:      address.firstName,
    nom:         address.lastName,
    rue:         address.address,
    code_postal: address.postalCode,
    ville:       address.city,
    telephone:   address.phone,
  };

  // ── Transaction ────────────────────────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 4. Lire les articles et verrouiller les lignes variantes_produit
    // FOR UPDATE OF vp empêche deux commandes simultanées de valider le même stock
    const itemsRes = await client.query(
      `SELECT
         ap.id            AS articles_panier_id,
         ap.quantite,
         vp.id            AS variante_id,
         vp.stock,
         vp.sku,
         vp.prix_supplementaire,
         p.id             AS produit_id,
         p.nom            AS nom_produit,
         p.prix           AS prix_base,
         p.boutique_id
       FROM articles_panier ap
       JOIN variantes_produit vp ON vp.id = ap.variante_id
       JOIN produits p            ON p.id = vp.produit_id
       WHERE ap.panier_id = $1
       FOR UPDATE OF vp`,
      [panierId]
    );

    const items = itemsRes.rows;
    if (items.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Le panier est vide" });
      return;
    }

    // 5. Vérifier le stock (atomique : les lignes sont verrouillées)
    const outOfStock = items.filter((item) => item.stock < item.quantite);
    if (outOfStock.length > 0) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Stock insuffisant",
        items: outOfStock.map((item) => ({
          variante_id:       item.variante_id,
          nom_produit:       item.nom_produit,
          sku:               item.sku,
          stock_disponible:  item.stock,
          quantite_demandee: item.quantite,
        })),
      });
      return;
    }

    // 6. Calculer les totaux
    const sousTotal = items.reduce((acc: number, item: any) => {
      return acc + (Number(item.prix_base) + Number(item.prix_supplementaire)) * item.quantite;
    }, 0);
    const fraisLivraison = shipping.price;
    const montantTotal   = Math.round((sousTotal + fraisLivraison) * 100) / 100;

    // 7. Insérer la commande
    const commandeRes = await client.query<{ id: number }>(
      `INSERT INTO commandes
         (client_id, sous_total, frais_livraison, montant_total,
          statut, methode_paiement, adresse_livraison, adresse_facturation)
       VALUES ($1, $2, $3, $4, 'EN_ATTENTE_PAIEMENT', 'CARTE', $5, $5)
       RETURNING id`,
      [
        userId,
        Math.round(sousTotal * 100) / 100,
        fraisLivraison,
        montantTotal,
        JSON.stringify(adresseLivraison),
      ]
    );

    if (!commandeRes.rows[0]) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: "Erreur serveur" });
      return;
    }

    const commandeId = commandeRes.rows[0].id;

    // 8. Insérer les articles_commande
    for (const item of items) {
      const prixUnitaire =
        Math.round((Number(item.prix_base) + Number(item.prix_supplementaire)) * 100) / 100;

      await client.query(
        `INSERT INTO articles_commande
           (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
         VALUES ($1, $2, $3, $4, $5, 'EN_ATTENTE')`,
        [commandeId, item.variante_id, item.boutique_id, item.quantite, prixUnitaire]
      );
    }

    // ✅ PAS de décrémentation stock ici
    // ✅ PAS de vidage panier ici
    // → Les deux sont faits dans paymentController.ts après webhook Stripe

    await client.query("COMMIT");

    res.status(201).json({
      success:    true,
      commandeId: commandeId,
      total:      montantTotal,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createOrder error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/confirm
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Confirme manuellement le paiement d'une commande (passe EN_ATTENTE_PAIEMENT → PAYEE).
 * Utilisé comme fallback si le webhook Stripe n'est pas reçu à temps.
 * @param {Request} req - Params : { id } | Body : { paiementId: string }
 * @param {Response} res - Réponse JSON : 200 ({ success: true }) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function confirmPayment(req: Request, res: Response) {
  try {
    const userId     = (req as any).user.id as string;
    const commandeId = parseInt(req.params.id as string, 10);
    const { paiementId } = req.body;

    if (isNaN(commandeId)) {
      res.status(400).json({ error: "ID de commande invalide" });
      return;
    }
    if (!paiementId) {
      res.status(400).json({ error: "paiementId requis" });
      return;
    }

    const result = await pool.query(
      `UPDATE commandes
       SET statut = 'PAYEE', paiement_id = $1
       WHERE id = $2 AND client_id = $3 AND statut = 'EN_ATTENTE_PAIEMENT'
       RETURNING id`,
      [paiementId, commandeId, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Commande introuvable ou déjà confirmée" });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("confirmPayment error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Retourne toutes les commandes du client connecté avec leurs articles.
 * Les articles sont récupérés en une seule requête puis groupés par commande côté JS.
 * @param {Request} req - req.user.id requis via authMiddleware + clientMiddleware
 * @param {Response} res - Réponse JSON : 200 (array<Commande>) | 500
 * @returns {Promise<void>}
 */
export async function getMyOrders(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    const commandesRes = await pool.query(
      `SELECT
         c.id,
         c.statut,
         c.sous_total,
         c.frais_livraison,
         c.montant_total,
         c.methode_paiement,
         c.adresse_livraison,
         c.cree_le
       FROM commandes c
       WHERE c.client_id = $1
       ORDER BY c.cree_le DESC`,
      [userId]
    );

    if (commandesRes.rows.length === 0) {
      res.json([]);
      return;
    }

    const commandeIds = commandesRes.rows.map((c: any) => c.id);

    const articlesRes = await pool.query(
      `SELECT
         ac.id,
         ac.commande_id,
         ac.quantite,
         ac.prix_unitaire,
         ac.statut        AS article_statut,
         ac.numero_suivi,
         ac.transporteur,
         p.id             AS produit_id,
         p.nom            AS produit_nom,
         COALESCE(p.images, '[]'::jsonb) AS images,
         vp.attributs     AS variante_attributs,
         vp.sku,
         COALESCE(b.nom, 'Vendeur Atlas') AS boutique_nom
       FROM articles_commande ac
       LEFT JOIN variantes_produit vp ON vp.id = ac.variante_id
       LEFT JOIN produits p           ON p.id  = vp.produit_id
       LEFT JOIN boutiques b          ON b.id  = ac.boutique_id
       WHERE ac.commande_id = ANY($1::int[])
       ORDER BY ac.commande_id, ac.id`,
      [commandeIds]
    );

    const articlesParCommande: Record<number, any[]> = {};
    for (const article of articlesRes.rows) {
      if (!articlesParCommande[article.commande_id]) {
        articlesParCommande[article.commande_id] = [];
      }
      articlesParCommande[article.commande_id]!.push(article);
    }

    const commandes = commandesRes.rows.map((c: any) => ({
      ...c,
      articles: articlesParCommande[c.id] ?? [],
    }));

    res.json(commandes);
  } catch (err) {
    console.error("getMyOrders error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Retourne le détail complet d'une commande spécifique du client.
 * Vérifie que la commande appartient bien au client connecté (filtrage par client_id).
 * @param {Request} req - Params : { id } — Identifiant de la commande
 * @param {Response} res - Réponse JSON : 200 (Commande avec articles) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function getOrderById(req: Request, res: Response) {
  try {
    const userId     = (req as any).user.id;
    const commandeId = parseInt(req.params.id as string, 10);

    if (isNaN(commandeId)) {
      res.status(400).json({ error: "ID de commande invalide" });
      return;
    }

    const commandeRes = await pool.query(
      `SELECT
         c.id, c.statut, c.sous_total, c.frais_livraison, c.montant_total,
         c.methode_paiement, c.paiement_id, c.adresse_livraison,
         c.adresse_facturation, c.cree_le
       FROM commandes c
       WHERE c.id = $1 AND c.client_id = $2`,
      [commandeId, userId]
    );

    if (!commandeRes.rows[0]) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    const articlesRes = await pool.query(
      `SELECT
         ac.id, ac.quantite, ac.prix_unitaire,
         ac.statut        AS article_statut,
         ac.numero_suivi, ac.transporteur,
         p.nom            AS produit_nom,
         p.description    AS produit_description,
         COALESCE(p.images, '[]'::jsonb) AS images,
         vp.sku, vp.attributs AS variante_attributs,
         COALESCE(b.nom, 'Vendeur Atlas') AS boutique_nom
       FROM articles_commande ac
       LEFT JOIN variantes_produit vp ON vp.id = ac.variante_id
       LEFT JOIN produits p           ON p.id  = vp.produit_id
       LEFT JOIN boutiques b          ON b.id  = ac.boutique_id
       WHERE ac.commande_id = $1
       ORDER BY ac.id`,
      [commandeId]
    );

    res.json({ ...commandeRes.rows[0], articles: articlesRes.rows });
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/orders/:id/cancel
// Annule la commande et restitue le stock si elle était PAYEE.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Annule une commande et restitue le stock si elle était déjà PAYEE.
 * - Statut EN_ATTENTE_PAIEMENT → ANNULEE : pas de restitution de stock (jamais décrémenté)
 * - Statut PAYEE → ANNULEE : stock restauré pour chaque article de la commande
 * @param {Request} req - Params : { id } — Identifiant de la commande à annuler
 * @param {Response} res - Réponse JSON : 200 (message) | 400 (statut non annulable) | 404 | 500
 * @returns {Promise<void>}
 */
export async function cancelOrder(req: Request, res: Response) {
  try {
    const userId     = (req as any).user.id;
    const commandeId = parseInt(req.params.id as string, 10);

    if (isNaN(commandeId)) {
      res.status(400).json({ error: "ID de commande invalide" });
      return;
    }

    const commandeRes = await pool.query(
      `SELECT id, statut FROM commandes WHERE id = $1 AND client_id = $2`,
      [commandeId, userId]
    );

    if (!commandeRes.rows[0]) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    const { statut } = commandeRes.rows[0];
    const statutsAnnulables = ["EN_ATTENTE_PAIEMENT", "PAYEE"];

    if (!statutsAnnulables.includes(statut)) {
      res.status(400).json({
        error: `Impossible d'annuler une commande avec le statut : ${statut}`,
      });
      return;
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query("BEGIN");

      // Annuler la commande et ses articles
      await dbClient.query(
        `UPDATE commandes SET statut = 'ANNULEE' WHERE id = $1`,
        [commandeId]
      );
      await dbClient.query(
        `UPDATE articles_commande SET statut = 'REMBOURSE' WHERE commande_id = $1`,
        [commandeId]
      );

      // ✅ Restituer le stock UNIQUEMENT si la commande était déjà PAYEE
      // (si EN_ATTENTE_PAIEMENT le stock n'a pas encore été décrémenté)
      if (statut === "PAYEE") {
        const articlesRes = await dbClient.query(
          `SELECT variante_id, quantite FROM articles_commande WHERE commande_id = $1`,
          [commandeId]
        );
        for (const article of articlesRes.rows) {
          await dbClient.query(
            `UPDATE variantes_produit SET stock = stock + $1 WHERE id = $2`,
            [article.quantite, article.variante_id]
          );
        }
      }

      await dbClient.query("COMMIT");
      res.json({ message: "Commande annulée avec succès" });
    } catch (err) {
      await dbClient.query("ROLLBACK");
      throw err;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    console.error("cancelOrder error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}