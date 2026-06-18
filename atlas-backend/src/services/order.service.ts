import { pool } from "../db/index.js";

/**
 * @file order.service.ts
 * @description Services centraux pour la gestion de la logique métier des commandes.
 */

/**
 * Recalcule et met à jour automatiquement le statut global d'une commande
 * en analysant les statuts de tous ses articles enfants (gestion multi-vendeur).
 *
 * À appeler après chaque modification de statut d'un article commande
 * (ex: "Marquer comme expédié" dans l'interface vendeur).
 *
 * Arbre de décision des statuts :
 * - Tous annulés/remboursés → REMBOURSEE
 * - Tous les actifs livrés  → TERMINEE
 * - Tous les actifs expédiés ou livrés → EXPEDIEE
 * - Certains expédiés/livrés, d'autres pas → PARTIELLEMENT_EXPEDIEE
 * - Sinon → PAYEE (retour à l'état de base après paiement)
 *
 * N'affecte pas les commandes EN_ATTENTE_PAIEMENT ni ANNULEE.
 *
 * @param {number} commandeId - Identifiant de la commande à recalculer
 * @returns {Promise<string | null>} Nouveau statut de la commande, ou null si non trouvée
 */
export async function updateOrderStatusFromItems(commandeId: number): Promise<string | null> {
  // 1 - Récupérer le statut actuel de la commande (pour éviter les conflits si non-payée)
  const orderRes = await pool.query(
    `SELECT statut FROM commandes WHERE id = $1`,
    [commandeId]
  );


  
  if (orderRes.rows.length === 0) return null;
  const statutInitial = orderRes.rows[0].statut;

  // Si on est en attente de paiement ou déjà annulée intégralement par le client, on ignore la logique de fulfillment
  if (statutInitial === 'EN_ATTENTE_PAIEMENT' || statutInitial === 'ANNULEE') {
    return statutInitial;
  }

  // 2 - Analyser les statuts de tous les articles
  const articlesRes = await pool.query(
    `SELECT statut FROM articles_commande WHERE commande_id = $1`,
    [commandeId]
  );
  const articles = articlesRes.rows;
  const total = articles.length;
  
  if (total === 0) return statutInitial;

  // 3 - Calculer les différentes quantités selon les statuts
  const annules = articles.filter(a => a.statut === 'REMBOURSE' || a.statut === 'RETOURNE').length;
  const totalActifs = total - annules; // On exclut les articles annulés du compte actif
  
  const livres = articles.filter(a => a.statut === 'LIVRE').length;
  const expedies = articles.filter(a => a.statut === 'EXPEDIE').length;

  let nouveauStatutGlobale = statutInitial;

  // 4 - Arbre de décision
  if (annules === total) {
    nouveauStatutGlobale = 'REMBOURSEE';
  } 
  else if (totalActifs > 0 && livres === totalActifs) {
    // Tout ce qui n'a pas été annulé est finalement livré 
    nouveauStatutGlobale = 'TERMINEE';
  }
  else if (totalActifs > 0 && (livres + expedies) === totalActifs) {
    // Plus rien n'est dans les entrepôts
    nouveauStatutGlobale = 'EXPEDIEE';
  }
  else if ((livres > 0 || expedies > 0) && (livres + expedies < totalActifs)) {
    // Un vendeur a expédié, l'autre traîne encore
    nouveauStatutGlobale = 'PARTIELLEMENT_EXPEDIEE';
  }
  else {
    // Soit on repasse à PAYEE, soit ça reste tel quel
    nouveauStatutGlobale = 'PAYEE'; 
  }

  // 5 - Appliquer la modification si le statut a réellement évolué
  if (nouveauStatutGlobale !== statutInitial) {
    await pool.query(
      `UPDATE commandes SET statut = $1 WHERE id = $2`,
      [nouveauStatutGlobale, commandeId]
    );
  }
          
  return nouveauStatutGlobale;
}