-- =============================================================================
-- SCRIPT DE SEED — Commandes de test pour la page historique
-- =============================================================================
-- Ce script crée des commandes réalistes pour les clients existants en base.
-- Il récupère dynamiquement les IDs des clients, produits et boutiques
-- pour s'adapter à n'importe quel état de la base.
--
-- UTILISATION :
--   Depuis psql ou Supabase SQL Editor, coller et exécuter ce fichier.
-- =============================================================================

DO $$
DECLARE
  -- Variables pour les clients (les 2 premiers clients trouvés)
  v_client1_id   TEXT;
  v_client2_id   TEXT;

  -- Variables pour les variantes (les 4 premières trouvées)
  v_var1_id      INT;
  v_var2_id      INT;
  v_var3_id      INT;
  v_var4_id      INT;

  -- Variables pour les boutiques associées aux produits
  v_boutique1_id INT;
  v_boutique2_id INT;

  -- Variables pour les prix des variantes
  v_prix1       NUMERIC;
  v_prix2       NUMERIC;
  v_prix3       NUMERIC;
  v_prix4       NUMERIC;

  -- IDs des commandes créées
  v_cmd1_id      INT;
  v_cmd2_id      INT;
  v_cmd3_id      INT;
  v_cmd4_id      INT;
  v_cmd5_id      INT;

BEGIN

  -- ── 1. Récupérer deux clients existants ──────────────────────────────────
  SELECT id INTO v_client1_id FROM public.user WHERE role = 'CLIENT' ORDER BY "createdAt" ASC LIMIT 1;
  SELECT id INTO v_client2_id FROM public.user WHERE role = 'CLIENT' ORDER BY "createdAt" ASC OFFSET 1 LIMIT 1;

  IF v_client1_id IS NULL THEN
    RAISE EXCEPTION 'Aucun client trouvé en base. Créez au moins un utilisateur avec role=CLIENT avant d''exécuter ce script.';
  END IF;

  RAISE NOTICE 'Client 1 : %', v_client1_id;
  RAISE NOTICE 'Client 2 : %', COALESCE(v_client2_id, '(aucun second client)');

  -- ── 2. Récupérer des variantes existantes avec leurs prix ─────────────────
  SELECT
    vp.id,
    (p.prix + COALESCE(vp.prix_supplementaire, 0)),
    p.boutique_id
  INTO v_var1_id, v_prix1, v_boutique1_id
  FROM variantes_produit vp
  JOIN produits p ON p.id = vp.produit_id
  WHERE p.actif = true AND p.boutique_id IS NOT NULL
  ORDER BY vp.id ASC
  LIMIT 1;

  SELECT
    vp.id,
    (p.prix + COALESCE(vp.prix_supplementaire, 0)),
    p.boutique_id
  INTO v_var2_id, v_prix2, v_boutique2_id
  FROM variantes_produit vp
  JOIN produits p ON p.id = vp.produit_id
  WHERE p.actif = true AND p.boutique_id IS NOT NULL
  ORDER BY vp.id ASC
  OFFSET 1 LIMIT 1;

  SELECT
    vp.id,
    (p.prix + COALESCE(vp.prix_supplementaire, 0))
  INTO v_var3_id, v_prix3
  FROM variantes_produit vp
  JOIN produits p ON p.id = vp.produit_id
  WHERE p.actif = true
  ORDER BY vp.id ASC
  OFFSET 2 LIMIT 1;

  SELECT
    vp.id,
    (p.prix + COALESCE(vp.prix_supplementaire, 0))
  INTO v_var4_id, v_prix4
  FROM variantes_produit vp
  JOIN produits p ON p.id = vp.produit_id
  WHERE p.actif = true
  ORDER BY vp.id ASC
  OFFSET 3 LIMIT 1;

  -- Fallback : si moins de 4 variantes, on réutilise la première
  IF v_var2_id IS NULL THEN v_var2_id := v_var1_id; v_prix2 := v_prix1; v_boutique2_id := v_boutique1_id; END IF;
  IF v_var3_id IS NULL THEN v_var3_id := v_var1_id; v_prix3 := v_prix1; END IF;
  IF v_var4_id IS NULL THEN v_var4_id := v_var2_id; v_prix4 := v_prix2; END IF;

  IF v_var1_id IS NULL THEN
    RAISE EXCEPTION 'Aucune variante de produit trouvée. Ajoutez des produits avant d''exécuter ce script.';
  END IF;

  RAISE NOTICE 'Variante 1 : % — prix : %', v_var1_id, v_prix1;
  RAISE NOTICE 'Variante 2 : % — prix : %', v_var2_id, v_prix2;

  -- ══════════════════════════════════════════════════════════════════════════
  -- COMMANDES DU CLIENT 1
  -- ══════════════════════════════════════════════════════════════════════════

  -- ── Commande 1 : LIVREE (il y a 15 jours) ────────────────────────────────
  INSERT INTO commandes (
    client_id, sous_total, frais_livraison, montant_total,
    statut, methode_paiement,
    adresse_livraison,
    cree_le
  ) VALUES (
    v_client1_id,
    (v_prix1 * 2) + v_prix2,
    5.99,
    (v_prix1 * 2) + v_prix2 + 5.99,
    'LIVREE',
    'CARTE_BANCAIRE',
    '{"nom": "Dupont Jean", "rue": "12 rue de la Paix", "ville": "Paris", "code_postal": "75001", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '15 days'
  ) RETURNING id INTO v_cmd1_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES
    (v_cmd1_id, v_var1_id, v_boutique1_id, 2, v_prix1, 'LIVRE'),
    (v_cmd1_id, v_var2_id, v_boutique2_id, 1, v_prix2, 'LIVRE');

  RAISE NOTICE 'Commande 1 créée (LIVREE) : ID=%', v_cmd1_id;

  -- ── Commande 2 : EXPEDIEE (il y a 3 jours) ───────────────────────────────
  INSERT INTO commandes (
    client_id, sous_total, frais_livraison, montant_total,
    statut, methode_paiement,
    adresse_livraison,
    cree_le
  ) VALUES (
    v_client1_id,
    v_prix3 * 1,
    0,
    v_prix3 * 1,
    'EXPEDIEE',
    'PAYPAL',
    '{"nom": "Dupont Jean", "rue": "12 rue de la Paix", "ville": "Paris", "code_postal": "75001", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_cmd2_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut, numero_suivi, transporteur)
  VALUES
    (v_cmd2_id, v_var3_id, v_boutique1_id, 1, v_prix3, 'EXPEDIE', 'FR123456789', 'Colissimo');

  RAISE NOTICE 'Commande 2 créée (EXPEDIEE) : ID=%', v_cmd2_id;

  -- ── Commande 3 : EN_PREPARATION (aujourd'hui) ────────────────────────────
  INSERT INTO commandes (
    client_id, sous_total, frais_livraison, montant_total,
    statut, methode_paiement,
    adresse_livraison,
    cree_le
  ) VALUES (
    v_client1_id,
    (v_prix1 + v_prix4),
    4.90,
    (v_prix1 + v_prix4) + 4.90,
    'EN_PREPARATION',
    'CARTE_BANCAIRE',
    '{"nom": "Dupont Jean", "rue": "12 rue de la Paix", "ville": "Paris", "code_postal": "75001", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO v_cmd3_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES
    (v_cmd3_id, v_var1_id, v_boutique1_id, 1, v_prix1, 'EN_PREPARATION'),
    (v_cmd3_id, v_var4_id, v_boutique2_id, 1, v_prix4, 'EN_PREPARATION');

  RAISE NOTICE 'Commande 3 créée (EN_PREPARATION) : ID=%', v_cmd3_id;

  -- ── Commande 4 : ANNULEE (il y a 7 jours) ────────────────────────────────
  INSERT INTO commandes (
    client_id, sous_total, frais_livraison, montant_total,
    statut, methode_paiement,
    adresse_livraison,
    cree_le
  ) VALUES (
    v_client1_id,
    v_prix2 * 3,
    7.50,
    (v_prix2 * 3) + 7.50,
    'ANNULEE',
    'CARTE_BANCAIRE',
    '{"nom": "Dupont Jean", "rue": "12 rue de la Paix", "ville": "Paris", "code_postal": "75001", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '7 days'
  ) RETURNING id INTO v_cmd4_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES
    (v_cmd4_id, v_var2_id, v_boutique2_id, 3, v_prix2, 'ANNULE');

  RAISE NOTICE 'Commande 4 créée (ANNULEE) : ID=%', v_cmd4_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- COMMANDES DU CLIENT 2 (si disponible)
  -- ══════════════════════════════════════════════════════════════════════════

  IF v_client2_id IS NOT NULL THEN

    -- ── Commande 5 : PAYEE (il y a 2 jours) ──────────────────────────────
    INSERT INTO commandes (
      client_id, sous_total, frais_livraison, montant_total,
      statut, methode_paiement,
      adresse_livraison,
      cree_le
    ) VALUES (
      v_client2_id,
      v_prix1 + v_prix3,
      3.99,
      v_prix1 + v_prix3 + 3.99,
      'PAYEE',
      'CARTE_BANCAIRE',
      '{"nom": "Martin Sophie", "rue": "8 avenue des Fleurs", "ville": "Lyon", "code_postal": "69001", "pays": "France"}'::jsonb,
      NOW() - INTERVAL '2 days'
    ) RETURNING id INTO v_cmd5_id;

    INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
    VALUES
      (v_cmd5_id, v_var1_id, v_boutique1_id, 1, v_prix1, 'EN_ATTENTE'),
      (v_cmd5_id, v_var3_id, v_boutique1_id, 1, v_prix3, 'EN_ATTENTE');

    RAISE NOTICE 'Commande 5 créée (PAYEE, client 2) : ID=%', v_cmd5_id;

  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Seed terminé avec succès — % commandes créées.', 
    CASE WHEN v_client2_id IS NOT NULL THEN 5 ELSE 4 END;

END $$;

-- Vérification rapide
SELECT
  c.id,
  u.name AS client,
  c.statut,
  c.montant_total,
  c.cree_le::date,
  COUNT(ac.id) AS nb_articles
FROM commandes c
JOIN public.user u ON u.id = c.client_id
LEFT JOIN articles_commande ac ON ac.commande_id = c.id
GROUP BY c.id, u.name, c.statut, c.montant_total, c.cree_le
ORDER BY c.cree_le DESC;
