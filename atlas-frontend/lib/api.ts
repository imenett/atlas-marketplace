/**
 * @file lib/api.ts
 * @description Client HTTP centralisé pour les appels à l'API Atlas.
 * Toutes les fonctions transmettent automatiquement les cookies de session (`credentials: 'include'`).
 * Les erreurs HTTP sont transformées en exceptions JavaScript.
 */

const API_BASE_URL = typeof window === "undefined"
  ? process.env.API_URL  // server-side: direct to Render
  : "";                  // client-side: through Vercel proxy
/**
 * Fonction utilitaire générique pour les appels à l'API backend.
 * Ajoute l'en-tête `Content-Type: application/json` par défaut.
 * @template T - Type de la réponse JSON attendue
 * @param {string} path - Chemin relatif de l'endpoint (ex: "/api/products")
 * @param {RequestInit} [options] - Options `fetch` (method, body, headers…)
 * @returns {Promise<T>} Données JSON typées
 * @throws {Error} Si la réponse HTTP n'est pas 2xx
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Cart ──────────────────────────────────────────────────────────────────────

/**
 * Ajoute une variante produit au panier du client connecté.
 * @param {number} varianteId - Identifiant de la variante produit
 * @param {number} [quantity=1] - Quantité à ajouter
 * @returns {Promise<object>} Article panier créé ou mis à jour
 * @throws {Error} Si la variante est introuvable ou le stock insuffisant
 */
export async function addToCart(varianteId: number, quantity: number = 1) {
  const res = await fetch(`${API_BASE_URL}/api/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variante_id: varianteId,
      quantite: quantity
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Erreur lors de l'ajout au panier");
  }

  return res.json();
}

/**
 * Met à jour la quantité d'un article du panier.
 * @param {number} itemId - Identifiant de l'article panier
 * @param {number} newQuantity - Nouvelle quantité souhaitée
 * @returns {Promise<object>} Article mis à jour
 * @throws {Error} Si la quantité dépasse le stock disponible
 */
export async function updateCartQuantity(itemId: number, newQuantity: number) {
  const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantite: newQuantity }),
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Erreur lors de la mise à jour");
  }

  return data;
}

/**
 * Supprime un article du panier.
 * @param {number} itemId - Identifiant de l'article panier à supprimer
 * @returns {Promise<object>} Confirmation de suppression
 */
export async function removeFromCart(itemId: number) {
  const res = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }

  // Handle 204 No Content (empty body)
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** Catégorie retournée par l'API */
export interface CategoryFromAPI {
  /** Identifiant unique */
  id: number;
  /** Nom de la catégorie */
  nom: string;
  /** Identifiant de la catégorie parente (null si catégorie racine) */
  parent_id: number | null;
  /** Nombre de produits actifs dans cette catégorie */
  count: number;
}

/**
 * Récupère toutes les catégories disponibles avec leur nombre de produits.
 * @returns {Promise<CategoryFromAPI[]>} Liste des catégories
 */
export async function getCategories(): Promise<CategoryFromAPI[]> {
  return apiFetch<CategoryFromAPI[]>("/api/categories");
}

// ─── Products ─────────────────────────────────────────────────────────────────

/** Produit retourné par l'API publique */
export interface ProductFromAPI {
  id: number;
  variante_id: number | null;
  nom: string;
  description: string;
  prix: number;
  prix_compare: number | null;
  images: string[];
  actif: boolean;
  cree_le: string;
  categorie_id: number;
  categorie_nom: string;
  boutique_id: number;
  boutique_nom: string;
  note_moyenne?: number;
  nombre_avis?: number;
  stock_total?: number;
}

/** Paramètres de filtrage du catalogue produits */
export interface ProductsFilters {
  /** Noms de catégories séparés par des virgules */
  categories?: string;
  prix_min?: number;
  prix_max?: number;
  /** Terme de recherche libre */
  recherche?: string;
  /** Portée de la recherche : produit | boutique | categorie */
  recherche_type?: string;
  /** Note minimale (1-5) */
  note_min?: number;
  /** Tri : price-asc | price-desc | rating | newest */
  tri?: string;
  page?: number;
  /** Produits par page */
  limite?: number;
}

/** Réponse paginée du catalogue produits */
export interface PaginatedProductsFromAPI {
  produits: ProductFromAPI[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Récupère le catalogue produits filtré et paginé.
 * @param {ProductsFilters} [filters] - Critères de filtrage et pagination
 * @returns {Promise<PaginatedProductsFromAPI>} Page de produits avec métadonnées de pagination
 */
export async function getProducts(filters?: ProductsFilters): Promise<PaginatedProductsFromAPI> {
  const params = new URLSearchParams();
  if (filters?.categories) params.set("categories", filters.categories);
  if (filters?.prix_min !== undefined) params.set("prix_min", String(filters.prix_min));
  if (filters?.prix_max !== undefined) params.set("prix_max", String(filters.prix_max));
  if (filters?.recherche) params.set("recherche", filters.recherche);
  if (filters?.recherche_type) params.set("recherche_type", filters.recherche_type);
  if (filters?.note_min !== undefined) params.set("note_min", String(filters.note_min));
  if (filters?.tri) params.set("tri", filters.tri);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limite) params.set("limite", String(filters.limite));

  const query = params.toString();
  return apiFetch<PaginatedProductsFromAPI>(`/api/products${query ? `?${query}` : ""}`);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

/** Article d'une commande retourné par l'API */
export interface ArticleCommandeFromAPI {
  id: number;
  commande_id: number;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  /** Statut de l'article : EN_ATTENTE | EN_PREPARATION | EXPEDIE | LIVRE | RETOURNE | REMBOURSE */
  article_statut: string;
  boutique_nom: string;
  images: string[];
  variante_attributs: Record<string, string>;
  sku: string;
  numero_suivi?: string;
  transporteur?: string;
}

/** Commande retournée par l'API */
export interface OrderFromAPI {
  id: number;
  /** Statut global : EN_ATTENTE_PAIEMENT | PAYEE | EXPEDIEE | PARTIELLEMENT_EXPEDIEE | TERMINEE | REMBOURSEE | ANNULEE */
  statut: string;
  sous_total: number;
  frais_livraison: number;
  montant_total: number;
  methode_paiement: string;
  adresse_livraison: {
    nom: string;
    rue: string;
    ville: string;
    code_postal: string;
    pays: string;
  } | null;
  cree_le: string;
  articles: ArticleCommandeFromAPI[];
}

/**
 * Récupère toutes les commandes du client connecté.
 * @returns {Promise<OrderFromAPI[]>} Liste des commandes triées par date décroissante
 * @throws {Error} Si la session est invalide
 */
export async function getMyOrders(): Promise<OrderFromAPI[]> {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Récupère le détail d'une commande par son identifiant.
 * @param {number} id - Identifiant de la commande
 * @returns {Promise<OrderFromAPI>} Commande avec ses articles
 * @throws {Error} Si la commande est introuvable ou n'appartient pas au client connecté
 */
export async function getOrderById(id: number): Promise<OrderFromAPI> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * Annule une commande (uniquement si son statut est EN_ATTENTE_PAIEMENT ou PAYEE).
 * @param {number} id - Identifiant de la commande à annuler
 * @returns {Promise<{ message: string }>} Message de confirmation
 * @throws {Error} Si la commande ne peut pas être annulée
 */
export async function cancelOrder(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/orders/${id}/cancel`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}
