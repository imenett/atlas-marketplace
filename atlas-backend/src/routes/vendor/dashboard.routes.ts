/**
 * @file dashboard.routes.ts
 * @description Routes API pour le tableau de bord (Dashboard) des vendeurs.
 * Toutes les routes sont protégées par authMiddleware et vendorMiddleware.
 * Chaque route vérifie que l'utilisateur possède une boutique via getVendorBoutique().
 * Les données sont filtrées strictement par boutique_id — un vendeur ne voit jamais
 * les données d'une autre boutique.
 * Montées sur /api/vendor/dashboard dans app.ts.
 */
import express from 'express';
import type { Request, Response } from 'express';
import { auth } from '../../auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { pool } from '../../db/index.js';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { vendorMiddleware } from '../../middlewares/vendor.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(vendorMiddleware);

/**
 * Vérifie la session BetterAuth et récupère la boutique du vendeur connecté.
 * Répond automatiquement avec 401 ou 404 si la vérification échoue.
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @returns {Promise<{id: number, note_moyenne: string} | null>} Données de la boutique ou null si erreur
 */
async function getVendorBoutique(req: Request, res: Response) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: 'Non authentifié' });
    return null;
  }

  const result = await pool.query(
    `SELECT id, note_moyenne FROM boutiques WHERE proprietaire_id = $1`,
    [session.user.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Boutique introuvable' });
    return null;
  }

  return result.rows[0] as { id: number; note_moyenne: string };
}

/**
 * GET /api/vendor/dashboard/kpis
 * @summary Retourne les indicateurs clés de performance (KPIs) de la boutique
 * @tags Dashboard Vendeur
 * @description Retourne le chiffre d'affaires total, le nombre de commandes,
 * le nombre de produits actifs et la note moyenne. Les valeurs de tendance
 * sont actuellement fixes (+0%) et seront calculées dynamiquement à l'avenir.
 * @return {DashboardKPIs} 200 - KPIs de la boutique formatés pour l'affichage - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(ac.prix_unitaire * ac.quantite), 0) AS total
       FROM articles_commande ac
       JOIN commandes c ON c.id = ac.commande_id
       WHERE ac.boutique_id = $1
         AND c.statut NOT IN ('ANNULEE', 'EN_ATTENTE_PAIEMENT')`,
      [boutique.id]
    );

    const ordersResult = await pool.query(
      `SELECT COUNT(DISTINCT ac.commande_id) AS count
       FROM articles_commande ac
       JOIN commandes c ON c.id = ac.commande_id
       WHERE ac.boutique_id = $1
         AND c.statut NOT IN ('ANNULEE', 'EN_ATTENTE_PAIEMENT')`,
      [boutique.id]
    );

    const activeProductsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM produits
       WHERE boutique_id = $1 AND actif = true`,
      [boutique.id]
    );

    const revenue        = Number(revenueResult.rows[0].total);
    const orders         = Number(ordersResult.rows[0].count);
    const activeProducts = Number(activeProductsResult.rows[0].count);
    const averageRating  = Number(boutique.note_moyenne ?? 0);

    res.json({
      revenue: {
        value:      revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
        trend:      '+0%',
        isPositive: true,
      },
      orders: {
        value:      String(orders),
        trend:      '+0%',
        isPositive: true,
      },
      activeProducts: {
        value:      String(activeProducts),
        trend:      '+0%',
        isPositive: true,
      },
      averageRating: {
        value:      averageRating.toFixed(1),
        trend:      '+0%',
        isPositive: true,
      },
    });
  } catch (error) {
    console.error('Erreur /kpis :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/vendor/dashboard/top-products
 * @summary Retourne les 5 produits les plus vendus de la boutique
 * @tags Dashboard Vendeur
 * @description Les produits sont classés par quantité vendue décroissante.
 * Inclut le revenu généré par chaque produit et l'URL de la première image.
 * @return {array<TopProduit>} 200 - Top 5 des produits (quantite_vendue + revenus) - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const result = await pool.query(
      `SELECT
         p.id,
         p.nom     AS name,
         p.images,
         c.nom     AS category,
         SUM(ac.quantite)                    AS "unitsSold",
         SUM(ac.prix_unitaire * ac.quantite) AS revenue
       FROM articles_commande ac
       JOIN variantes_produit vp ON vp.id = ac.variante_id
       JOIN produits p           ON p.id  = vp.produit_id
       LEFT JOIN categories c    ON c.id  = p.categorie_id
       JOIN commandes cmd        ON cmd.id = ac.commande_id
       WHERE ac.boutique_id = $1
         AND cmd.statut NOT IN ('ANNULEE', 'EN_ATTENTE_PAIEMENT')
       GROUP BY p.id, p.nom, p.images, c.nom
       ORDER BY "unitsSold" DESC
       LIMIT 5`,
      [boutique.id]
    );

    const topProducts = result.rows.map((row: any) => {
      const images = Array.isArray(row.images) ? row.images : [];
      return {
        id:        row.id,
        name:      row.name,
        category:  row.category ?? 'Sans catégorie',
        unitsSold: Number(row.unitsSold),
        revenue:   Number(row.revenue),
        image:     images[0] ?? '/placeholder.png',
      };
    });

    res.json(topProducts);
  } catch (error) {
    console.error('Erreur /top-products :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/vendor/dashboard/stock-alerts
 * @summary Retourne les variantes en stock faible, groupées par produit
 * @tags Dashboard Vendeur
 * @description Retourne les variantes dont stock <= seuil_stock_faible.
 * La réponse est groupée par produit : un objet par produit avec un tableau variantes[].
 * Un produit avec 5 variantes en rupture génère 1 entrée (pas 5) dans la réponse.
 * Le varianteId est exposé pour permettre les requêtes de réapprovisionnement :
 * PATCH /api/vendor/products/:produitId/stock/:varianteId/reapprovisionner
 * @return {array<AlerteStock>} 200 - Alertes stock groupées par produit - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get('/stock-alerts', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const result = await pool.query(
      `SELECT
         vp.id                  AS "varianteId",
         p.id                   AS "produitId",
         p.nom                  AS "productName",
         vp.attributs,
         vp.stock,
         vp.seuil_stock_faible  AS seuil
       FROM variantes_produit vp
       JOIN produits p ON p.id = vp.produit_id
       WHERE p.boutique_id = $1
         AND p.actif = true
         AND vp.actif = true
         AND vp.stock <= vp.seuil_stock_faible
       ORDER BY p.id ASC, vp.stock ASC`,
      [boutique.id]
    );

    // Grouper les lignes par produit
    const map = new Map<number, {
      produitId:   number;
      productName: string;
      variantes:   { varianteId: number; label: string; stock: number; seuil: number }[];
    }>();

    for (const row of result.rows) {
      const attrs  = row.attributs as Record<string, string> | null;
      const label  =
        attrs && Object.keys(attrs).length > 0
          ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ')
          : 'Variante unique';

      const produitId   = Number(row.produitId);
      const productName = row.productName as string;

      if (!map.has(produitId)) {
        map.set(produitId, { produitId, productName, variantes: [] });
      }

      map.get(produitId)!.variantes.push({
        varianteId: Number(row.varianteId),
        label,
        stock:      Number(row.stock ?? 0),
        seuil:      Number(row.seuil ?? 5),
      });
    }

    res.json(Array.from(map.values()));
  } catch (error) {
    console.error('Erreur /stock-alerts :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/vendor/dashboard/recent-orders
 * @summary Retourne les 10 dernières commandes contenant au moins un article de la boutique
 * @tags Dashboard Vendeur
 * @description Les commandes sont triées par date de création décroissante.
 * Chaque commande inclut le nom du client, le nombre d'articles et le montant total.
 * @return {array<CommandeRecente>} 200 - 10 dernières commandes de la boutique - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 403 - Rôle VENDEUR requis - application/json
 * @return {ErrorResponse} 404 - Boutique introuvable - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get('/recent-orders', async (req: Request, res: Response) => {
  try {
    const boutique = await getVendorBoutique(req, res);
    if (!boutique) return;

    const result = await pool.query(
      `SELECT
         cmd.id,
         cmd.statut,
         SUM(ac.prix_unitaire * ac.quantite) AS montant_total,
         cmd.cree_le,
         u.name           AS "clientName",
         SUM(ac.quantite) AS "itemsCount"
       FROM commandes cmd
       JOIN articles_commande ac ON ac.commande_id = cmd.id
       JOIN "user" u             ON u.id = cmd.client_id
       WHERE ac.boutique_id = $1
       GROUP BY cmd.id, cmd.statut, cmd.montant_total, cmd.cree_le, u.name
       ORDER BY cmd.cree_le DESC
       LIMIT 10`,
      [boutique.id]
    );

    const recentOrders = result.rows.map((row: any) => ({
      id:     `#${row.id}`,
      client: row.clientName,
      items:  Number(row.itemsCount),
      amount: Number(row.montant_total),
      status: row.statut,
    }));

    res.json(recentOrders);
  } catch (error) {
    console.error('Erreur /recent-orders :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
