-- =============================================================================
-- SCRIPT FINAL : NETTOYAGE + CRÉATION DE DONNÉES SUR VOS VRAIS COMPTES
-- =============================================================================
-- Ce script fait 2 choses :
-- 1. Il supprime les les faux comptes ("seed_client_xxx") que j'avais créés
--    précédemment et qui bloquaient la connexion.
-- 2. Il utilise VOS vrais comptes (test40@vendeur.com et test40@client.com)
--    pour créer une boutique, des produits, et générer les 4 commandes.
-- =============================================================================

DO $$
DECLARE
  v_vendeur_id   TEXT;
  v_client_id    TEXT;
  v_boutique_id  INT;
  v_categorie_id INT;
  v_produit1_id  INT;
  v_produit2_id  INT;
  v_var1_id      INT;
  v_var2_id      INT;
  v_var3_id      INT;
  v_cmd1_id      INT;
  v_cmd2_id      INT;
  v_cmd3_id      INT;
  v_cmd4_id      INT;
BEGIN

  -- ────────────────────────────────────────────────────────────────────────
  -- 1. NETTOYAGE DES ANCIENS COMPTES FANTÔMES (seed_...)
  -- ────────────────────────────────────────────────────────────────────────
  
  -- S'il y a des commandes/boutiques sur les anciens comptes, on les supprime d'abord en cascade
  DELETE FROM articles_commande WHERE commande_id IN (SELECT id FROM commandes WHERE client_id LIKE 'seed_%');
  DELETE FROM commandes WHERE client_id LIKE 'seed_%';
  
  DELETE FROM variantes_produit WHERE produit_id IN (SELECT id FROM produits WHERE boutique_id IN (SELECT id FROM boutiques WHERE proprietaire_id LIKE 'seed_%'));
  DELETE FROM produits WHERE boutique_id IN (SELECT id FROM boutiques WHERE proprietaire_id LIKE 'seed_%');
  DELETE FROM boutiques WHERE proprietaire_id LIKE 'seed_%';

  -- Supprimer les identifiants et les fausses sessions
  DELETE FROM public.account WHERE "userId" LIKE 'seed_%';
  DELETE FROM public.session WHERE "userId" LIKE 'seed_%';
  DELETE FROM public.user WHERE id LIKE 'seed_%';

  RAISE NOTICE '✅ Les anciens comptes de test ont été supprimés.';

  -- ────────────────────────────────────────────────────────────────────────
  -- 2. RÉCUPÉRATION DE VOS VRAIS COMPTES
  -- ────────────────────────────────────────────────────────────────────────
  
  SELECT id INTO v_vendeur_id FROM public.user WHERE email = 'test40@vendeur.com';
  SELECT id INTO v_client_id FROM public.user WHERE email = 'test40@client.com';

  IF v_vendeur_id IS NULL THEN
    RAISE EXCEPTION '❌ Le compte vendeur "test40@vendeur.com" est introuvable. Avez-vous bien créé ce compte ?';
  END IF;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION '❌ Le compte client "test40@client.com" est introuvable. Avez-vous bien créé ce compte ?';
  END IF;

  RAISE NOTICE '✅ Vrai Vendeur trouvé : %', v_vendeur_id;
  RAISE NOTICE '✅ Vrai Client trouvé : %', v_client_id;

  -- ────────────────────────────────────────────────────────────────────────
  -- 3. CRÉATION BOUTIQUE + CATÉGORIE
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_boutique_id FROM boutiques WHERE proprietaire_id = v_vendeur_id LIMIT 1;
  IF v_boutique_id IS NULL THEN
    INSERT INTO boutiques (proprietaire_id, nom, description, statut, url_logo) 
    VALUES (
      v_vendeur_id, 
      'La Boutique de test40',
      'Matériel de très haute qualité', 
      'ACTIVE',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop'
    )
    RETURNING id INTO v_boutique_id;
  END IF;

  SELECT id INTO v_categorie_id FROM categories WHERE nom = 'High-Tech' LIMIT 1;
  IF v_categorie_id IS NULL THEN
    INSERT INTO categories (nom) VALUES ('High-Tech') RETURNING id INTO v_categorie_id;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- 4. CRÉATION DES PRODUITS & VARIANTES
  -- ────────────────────────────────────────────────────────────────────────
  INSERT INTO produits (boutique_id, categorie_id, nom, description, prix, images, actif)
  VALUES (
    v_boutique_id, v_categorie_id, 'Clavier Mécanique RGB Pro', 'Clavier gamer test', 89.99, 
    '["https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=600&auto=format&fit=crop"]'::jsonb, true
  ) RETURNING id INTO v_produit1_id;

  INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock)
  VALUES (v_produit1_id, 'CLAV-' || substr(md5(random()::text), 1, 5), '{"Couleur": "Noir", "Format": "100%"}'::jsonb, 0, 50) 
  RETURNING id INTO v_var1_id;

  INSERT INTO produits (boutique_id, categorie_id, nom, description, prix, images, actif)
  VALUES (
    v_boutique_id, v_categorie_id, 'Souris Ergonomique Sans Fil', 'Ergonomie test', 49.99, 
    '["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop"]'::jsonb, true
  ) RETURNING id INTO v_produit2_id;

  INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock)
  VALUES (v_produit2_id, 'SOUR-NR-' || substr(md5(random()::text), 1, 5), '{"Couleur": "Noir"}'::jsonb, 0, 30) RETURNING id INTO v_var2_id;
  
  INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock)
  VALUES (v_produit2_id, 'SOUR-BL-' || substr(md5(random()::text), 1, 5), '{"Couleur": "Blanc mat"}'::jsonb, 5.00, 15) RETURNING id INTO v_var3_id;

  -- ────────────────────────────────────────────────────────────────────────
  -- 5. CRÉATION DES COMMANDES POUR test40@client.com
  -- ────────────────────────────────────────────────────────────────────────
  
  -- Commande 1 : TERMINÉE
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, (89.99 + 49.99), 5.99, (89.99 + 49.99 + 5.99), 'TERMINEE', 'CARTE_BANCAIRE',
    '{"nom": "Client Test 40", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '15 days'
  ) RETURNING id INTO v_cmd1_id;
  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES 
    (v_cmd1_id, v_var1_id, v_boutique_id, 1, 89.99, 'LIVRE'),
    (v_cmd1_id, v_var2_id, v_boutique_id, 1, 49.99, 'LIVRE');

  -- Commande 2 : EXPÉDIÉE
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, (54.99 * 2), 0.00, (54.99 * 2), 'EXPEDIEE', 'PAYPAL',
    '{"nom": "Client Test 40", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_cmd2_id;
  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut, transporteur, numero_suivi)
  VALUES (v_cmd2_id, v_var3_id, v_boutique_id, 2, 54.99, 'EXPEDIE', 'Colissimo', '8W123456789');

  -- Commande 3 : EN_ATTENTE_PAIEMENT (Test annulation)
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, 89.99, 4.50, (89.99 + 4.50), 'EN_ATTENTE_PAIEMENT', 'VIREMENT',
    '{"nom": "Client Test 40", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '2 hours'
  ) RETURNING id INTO v_cmd3_id;
  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES (v_cmd3_id, v_var1_id, v_boutique_id, 1, 89.99, 'EN_ATTENTE');

  -- Commande 4 : ANNULÉE
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, 49.99, 5.00, (49.99 + 5.00), 'ANNULEE', 'CARTE_BANCAIRE',
    '{"nom": "Client Test 40", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '8 days'
  ) RETURNING id INTO v_cmd4_id;
  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES (v_cmd4_id, v_var2_id, v_boutique_id, 1, 49.99, 'REMBOURSE');

  RAISE NOTICE '==================================================';
  RAISE NOTICE '🎉 SUCCÈS ! Les données ont été assignées à vos vrais comptes.';
  RAISE NOTICE 'Les commandes apparaissent maintenant pour test40@client.com.';
  RAISE NOTICE '==================================================';

END $$;
