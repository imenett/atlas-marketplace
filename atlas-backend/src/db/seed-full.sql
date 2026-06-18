-- =============================================================================
-- SCRIPT DE SEED COMPLET — AVEC COMPTES PRINTS (Mot de passe : password123)
-- =============================================================================
-- 1. Crée un nouveau Vendeur et un nouveau Client avec mot de passe fonctionnel.
--    Identifiants : 
--       Client  : email=client@atlas.com  | mdp=password123
--       Vendeur : email=vendeur@atlas.com | mdp=password123
-- 2. Crée la Boutique, les Catégories, les Produits, etc.
-- 3. Crée les fameuses 4 Commandes pour le client.
-- =============================================================================

DO $$
DECLARE
  v_vendeur_id TEXT := 'seed_vendeur_100';
  v_client_id  TEXT := 'seed_client_100';
  v_mdp_hash   TEXT := '$2b$10$IvOZTR9F1xzsN//z92iJq.KwFG7lA57r5sdaoQIEgukbPsurMCq6C'; -- 'password123' encrypté par bcrypt
  
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
  -- 1. CRÉATION DES UTILISATEURS AVEC COMPTES (BetterAuth)
  -- ────────────────────────────────────────────────────────────────────────
  
  -- === VENDEUR ===
  IF NOT EXISTS (SELECT 1 FROM public.user WHERE email = 'vendeur@atlas.com') THEN
    INSERT INTO public.user (id, name, email, role, "emailVerified", "createdAt", "updatedAt") 
    VALUES (v_vendeur_id, 'Vendeur Pro', 'vendeur@atlas.com', 'VENDEUR', true, NOW(), NOW());
    
    INSERT INTO public.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (md5(random()::text), 'vendeur@atlas.com', 'credential', v_vendeur_id, v_mdp_hash, NOW(), NOW());
  ELSE
    SELECT id INTO v_vendeur_id FROM public.user WHERE email = 'vendeur@atlas.com';
  END IF;

  -- === CLIENT ===
  IF NOT EXISTS (SELECT 1 FROM public.user WHERE email = 'client@atlas.com') THEN
    INSERT INTO public.user (id, name, email, role, "emailVerified", "createdAt", "updatedAt") 
    VALUES (v_client_id, 'Client Test', 'client@atlas.com', 'CLIENT', true, NOW(), NOW());
    
    INSERT INTO public.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES (md5(random()::text), 'client@atlas.com', 'credential', v_client_id, v_mdp_hash, NOW(), NOW());
  ELSE
    SELECT id INTO v_client_id FROM public.user WHERE email = 'client@atlas.com';
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- 2. BOUTIQUE
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_boutique_id FROM boutiques WHERE proprietaire_id = v_vendeur_id LIMIT 1;
  IF v_boutique_id IS NULL THEN
    INSERT INTO boutiques (proprietaire_id, nom, description, statut, url_logo) 
    VALUES (
      v_vendeur_id, 
      'Atlas Tech Hub ' || substr(md5(random()::text), 1, 4),
      'Super boutique', 
      'ACTIVE',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop'
    )
    RETURNING id INTO v_boutique_id;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- 3. CATÉGORIE
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_categorie_id FROM categories WHERE nom = 'High-Tech' LIMIT 1;
  IF v_categorie_id IS NULL THEN
    INSERT INTO categories (nom) VALUES ('High-Tech') RETURNING id INTO v_categorie_id;
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- 4. PRODUITS & VARIANTES
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
  -- 5. COMMANDES POUR LE CLIENT 'client@atlas.com'
  -- ────────────────────────────────────────────────────────────────────────
  
  -- Commande 1 : TERMINÉE
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, (89.99 + 49.99), 5.99, (89.99 + 49.99 + 5.99), 'TERMINEE', 'CARTE_BANCAIRE',
    '{"nom": "Client Test", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
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
    '{"nom": "Client Test", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '3 days'
  ) RETURNING id INTO v_cmd2_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut, transporteur, numero_suivi)
  VALUES (v_cmd2_id, v_var3_id, v_boutique_id, 2, 54.99, 'EXPEDIE', 'Colissimo', '8W123456789');

  -- Commande 3 : EN_ATTENTE_PAIEMENT (Test annulation)
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, 89.99, 4.50, (89.99 + 4.50), 'EN_ATTENTE_PAIEMENT', 'VIREMENT',
    '{"nom": "Client Test", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '2 hours'
  ) RETURNING id INTO v_cmd3_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES (v_cmd3_id, v_var1_id, v_boutique_id, 1, 89.99, 'EN_ATTENTE');

  -- Commande 4 : ANNULÉE
  INSERT INTO commandes (client_id, sous_total, frais_livraison, montant_total, statut, methode_paiement, adresse_livraison, cree_le)
  VALUES (
    v_client_id, 49.99, 5.00, (49.99 + 5.00), 'ANNULEE', 'CARTE_BANCAIRE',
    '{"nom": "Client Test", "rue": "Avenue Test", "ville": "Lille", "code_postal": "59000", "pays": "France"}'::jsonb,
    NOW() - INTERVAL '8 days'
  ) RETURNING id INTO v_cmd4_id;

  INSERT INTO articles_commande (commande_id, variante_id, boutique_id, quantite, prix_unitaire, statut)
  VALUES (v_cmd4_id, v_var2_id, v_boutique_id, 1, 49.99, 'REMBOURSE');

  RAISE NOTICE '==================================================';
  RAISE NOTICE '✅ SEED RÉUSSI AVEC SUCCÈS !';
  RAISE NOTICE 'IDENTIFIANTS (Mot de passe pour les deux : password123) :';
  RAISE NOTICE ' 🔐 CLIENT  → client@atlas.com';
  RAISE NOTICE ' 🔐 VENDEUR → vendeur@atlas.com';
  RAISE NOTICE '==================================================';

END $$;
