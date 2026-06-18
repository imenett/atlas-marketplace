/**
 * @file swagger.types.ts
 * @description Définitions de types partagés pour la documentation Swagger (express-jsdoc-swagger).
 * Ce fichier ne contient aucun code d'exécution : uniquement des blocs @typedef JSDoc
 * qui seront lus par express-jsdoc-swagger pour générer la section "Schemas" de l'API.
 */

// ─────────────────────────────────────────────────────────────────────────────
// COMMUN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Message d'erreur lisible
 */

/**
 * @typedef {object} MessageResponse
 * @property {string} message - Message de confirmation
 */

// ─────────────────────────────────────────────────────────────────────────────
// PRODUITS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} VarianteProduit
 * @property {number} id - Identifiant de la variante
 * @property {number} produit_id - Identifiant du produit parent
 * @property {string} sku - Code SKU unique (format B{boutiqueId}-P{produitId}-{seq})
 * @property {object} attributs - Attributs de la variante (ex: {"taille":"M","couleur":"rouge"})
 * @property {number} prix_supplementaire - Supplément de prix par rapport au prix de base
 * @property {number} stock - Quantité disponible en stock
 * @property {number} seuil_stock_faible - Seuil d'alerte stock faible (défaut: 5)
 * @property {boolean} actif - Variante active ou supprimée (soft delete)
 */

/**
 * @typedef {object} Produit
 * @property {number} id - Identifiant du produit
 * @property {string} nom - Nom du produit
 * @property {string} description - Description détaillée
 * @property {number} prix - Prix de base en euros
 * @property {number} [prix_compare] - Prix barré (prix conseillé avant promotion)
 * @property {array<string>} images - URLs des images du produit
 * @property {boolean} actif - Produit actif (false = supprimé en soft delete)
 * @property {string} cree_le - Date de création (ISO 8601)
 * @property {number} categorie_id - Identifiant de la catégorie
 * @property {string} categorie_nom - Nom de la catégorie
 * @property {number} boutique_id - Identifiant de la boutique vendeur
 * @property {string} boutique_nom - Nom de la boutique vendeur
 * @property {number} note_moyenne - Note moyenne des avis (0 à 5)
 * @property {number} nombre_avis - Nombre total d'avis
 * @property {array<VarianteProduit>} variantes - Variantes du produit
 */

/**
 * @typedef {object} PaginatedProductsResponse
 * @property {array<Produit>} produits - Liste des produits de la page courante
 * @property {number} totalCount - Nombre total de produits correspondant aux filtres
 * @property {number} totalPages - Nombre total de pages
 * @property {number} currentPage - Page courante
 */

// ─────────────────────────────────────────────────────────────────────────────
// CATÉGORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Categorie
 * @property {number} id - Identifiant de la catégorie
 * @property {string} nom - Nom de la catégorie
 * @property {number} [parent_id] - Identifiant de la catégorie parente (null si racine)
 * @property {number} count - Nombre de produits actifs dans cette catégorie
 */

// ─────────────────────────────────────────────────────────────────────────────
// BOUTIQUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Boutique
 * @property {number} id - Identifiant de la boutique
 * @property {string} nom - Nom de la boutique
 * @property {string} [description] - Description de la boutique
 * @property {string} [url_logo] - URL du logo de la boutique (Supabase Storage)
 * @property {string} [url_cover] - URL de l'image de couverture (Supabase Storage)
 * @property {boolean} actif - Boutique active
 * @property {number} note_moyenne - Note moyenne sur les produits de la boutique
 * @property {number} nb_produits - Nombre de produits actifs
 */

/**
 * @typedef {object} VendeurShop
 * @property {number} id - Identifiant de la boutique
 * @property {string} nom - Nom de la boutique
 * @property {string} [description] - Description
 * @property {string} [iban] - IBAN du vendeur pour les virements
 * @property {string} [url_logo] - URL du logo
 * @property {string} [url_cover] - URL de la couverture
 * @property {boolean} actif - Boutique active
 * @property {string} proprietaire_id - UUID du propriétaire (table user BetterAuth)
 * @property {string} cree_le - Date de création
 */

/**
 * @typedef {object} ShopStats
 * @property {number} nb_produits - Nombre total de produits
 * @property {number} nb_commandes - Nombre de commandes reçues
 * @property {number} note_moyenne - Note moyenne des avis
 * @property {number} nb_avis - Nombre total d'avis
 */

// ─────────────────────────────────────────────────────────────────────────────
// PANIER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} ArticlePanier
 * @property {number} id - Identifiant de l'article dans le panier
 * @property {number} variante_id - Identifiant de la variante produit
 * @property {number} quantite - Quantité souhaitée
 * @property {string} produit_nom - Nom du produit
 * @property {number} prix - Prix unitaire en euros
 * @property {array<string>} images - Images du produit
 * @property {object} variante_attributs - Attributs de la variante sélectionnée
 * @property {string} sku - SKU de la variante
 * @property {number} stock_disponible - Stock restant disponible
 * @property {string} boutique_nom - Nom de la boutique vendeur
 * @property {number} boutique_id - Identifiant de la boutique
 */

/**
 * @typedef {object} Panier
 * @property {number} id - Identifiant du panier
 * @property {string} utilisateur_id - UUID de l'utilisateur propriétaire
 * @property {array<ArticlePanier>} articles - Articles du panier
 */

// ─────────────────────────────────────────────────────────────────────────────
// ADRESSES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Adresse
 * @property {number} id - Identifiant de l'adresse
 * @property {string} prenom - Prénom du destinataire
 * @property {string} nom - Nom du destinataire
 * @property {string} rue - Adresse (numéro et rue)
 * @property {string} ville - Ville
 * @property {string} code_postal - Code postal
 * @property {string} pays - Pays (ex: "France")
 * @property {string} [telephone] - Numéro de téléphone du destinataire
 * @property {boolean} est_defaut - Adresse par défaut de l'utilisateur
 */

// ─────────────────────────────────────────────────────────────────────────────
// COMMANDES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} ArticleCommande
 * @property {number} id - Identifiant de l'article commande
 * @property {number} commande_id - Identifiant de la commande parente
 * @property {string} produit_nom - Nom du produit au moment de la commande
 * @property {number} quantite - Quantité commandée
 * @property {number} prix_unitaire - Prix unitaire en euros au moment de la commande
 * @property {string} article_statut - Statut de l'article (EN_ATTENTE, EXPEDIE, LIVRE, ANNULE, REMBOURSE)
 * @property {string} boutique_nom - Nom de la boutique vendeur
 * @property {number} boutique_id - Identifiant de la boutique
 * @property {array<string>} images - Images du produit
 * @property {object} variante_attributs - Attributs de la variante
 * @property {string} sku - SKU de la variante
 * @property {string} [numero_suivi] - Numéro de suivi de livraison
 * @property {string} [transporteur] - Nom du transporteur
 */

/**
 * @typedef {object} AdresseLivraison
 * @property {string} nom - Nom complet du destinataire
 * @property {string} rue - Adresse complète
 * @property {string} ville - Ville
 * @property {string} code_postal - Code postal
 * @property {string} pays - Pays
 */

/**
 * @typedef {object} Commande
 * @property {number} id - Identifiant de la commande
 * @property {string} statut - Statut global (EN_ATTENTE_PAIEMENT, PAYEE, EXPEDIEE, PARTIELLEMENT_EXPEDIEE, TERMINEE, ANNULEE, REMBOURSEE)
 * @property {number} sous_total - Montant HT des articles en euros
 * @property {number} frais_livraison - Frais de livraison en euros
 * @property {number} montant_total - Montant total TTC en euros
 * @property {string} methode_paiement - Méthode de paiement (stripe, etc.)
 * @property {string} methode_livraison - Méthode de livraison (standard, express, next_day)
 * @property {AdresseLivraison} [adresse_livraison] - Adresse de livraison snapshotée
 * @property {string} [payment_id] - Identifiant PaymentIntent Stripe
 * @property {string} cree_le - Date de création (ISO 8601)
 * @property {array<ArticleCommande>} articles - Articles de la commande
 */

// ─────────────────────────────────────────────────────────────────────────────
// AVIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Avis
 * @property {number} id - Identifiant de l'avis
 * @property {number} note - Note de 1 à 5
 * @property {string} [commentaire] - Texte du commentaire
 * @property {string} auteur_nom - Nom de l'auteur de l'avis
 * @property {string} cree_le - Date de création (ISO 8601)
 * @property {string} [mis_a_jour_le] - Date de dernière modification
 */

// ─────────────────────────────────────────────────────────────────────────────
// PROFIL UTILISATEUR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} Utilisateur
 * @property {string} id - UUID BetterAuth de l'utilisateur
 * @property {string} name - Nom complet
 * @property {string} email - Adresse email
 * @property {string} role - Rôle (CLIENT, VENDEUR, ADMIN)
 * @property {string} [numero_telephone] - Numéro de téléphone
 * @property {string} [url_avatar] - URL de l'avatar
 * @property {string} createdAt - Date de création du compte
 */

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD VENDEUR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} DashboardKPIs
 * @property {number} revenus_total - Chiffre d'affaires total en euros (commandes PAYEE ou plus)
 * @property {number} nb_commandes - Nombre de commandes reçues
 * @property {number} nb_produits - Nombre de produits actifs listés
 * @property {number} note_moyenne - Note moyenne de la boutique (0 à 5)
 */

/**
 * @typedef {object} TopProduit
 * @property {number} produit_id - Identifiant du produit
 * @property {string} nom - Nom du produit
 * @property {array<string>} images - Images du produit
 * @property {number} quantite_vendue - Quantité totale vendue
 * @property {number} revenus - Revenus générés par ce produit en euros
 */

/**
 * @typedef {object} AlerteStock
 * @property {number} produit_id - Identifiant du produit
 * @property {string} produit_nom - Nom du produit
 * @property {array<string>} images - Images du produit
 * @property {array<VarianteProduit>} variantes - Variantes en stock faible
 */

/**
 * @typedef {object} CommandeRecente
 * @property {number} id - Identifiant de la commande
 * @property {string} statut - Statut de la commande
 * @property {number} montant_total - Montant total en euros
 * @property {string} cree_le - Date de création
 * @property {string} client_nom - Nom du client
 * @property {number} nb_articles - Nombre d'articles dans la commande
 */

// ─────────────────────────────────────────────────────────────────────────────
// PAIEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} PaymentIntentResponse
 * @property {string} clientSecret - Secret côté client pour Stripe.js (format pi_xxx_secret_xxx)
 * @property {string} paymentIntentId - Identifiant du PaymentIntent Stripe (format pi_xxx)
 */

// ─────────────────────────────────────────────────────────────────────────────
// STOCK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} StockVariante
 * @property {number} id - Identifiant de la variante
 * @property {string} sku - SKU de la variante
 * @property {number} stock - Quantité en stock
 * @property {number} seuil_stock_faible - Seuil d'alerte stock faible
 * @property {object} attributs - Attributs de la variante
 * @property {boolean} stock_faible - True si stock <= seuil_stock_faible
 */

export {};
