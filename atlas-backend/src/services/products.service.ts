/**
 * @file products.service.ts
 * @description Logique métier pour la gestion des produits et de leurs variantes.
 * Ce service effectue toutes les requêtes SQL liées aux produits :
 * lecture (publique et vendeur), création, mise à jour, soft delete et gestion du stock.
 */
import { pool } from "../db/index.js";

/**
 * Génère un SKU unique pour une nouvelle variante produit.
 * Format : B{boutiqueId}-P{produitId}-{séquence sur 3 chiffres}
 * La séquence est calculée en comptant les variantes existantes du produit + 1.
 * @param {object} client - Client PostgreSQL de la transaction en cours
 * @param {number} boutiqueId - Identifiant de la boutique propriétaire
 * @param {number} produitId - Identifiant du produit parent
 * @returns {Promise<string>} SKU unique (ex: "B3-P12-001")
 */
async function generateSku(client: any, boutiqueId: number, produitId: number): Promise<string> {
  const result = await client.query(
    `SELECT COUNT(*) FROM variantes_produit WHERE produit_id = $1`,
    [produitId]
  );
  const count = parseInt(result.rows[0].count) + 1;
  const numero = String(count).padStart(3, "0");
  return `B${boutiqueId}-P${produitId}-${numero}`;
}

// ─────────────────────────────────────────────
// READ — Récupérer un produit par ID (route publique)
// ─────────────────────────────────────────────

/**
 * Retourne le détail d'un produit actif pour la vue publique (page détail).
 * Inclut les variantes actives, la boutique, la catégorie, la note moyenne et le nombre d'avis.
 * @param {number} id - Identifiant du produit
 * @returns {Promise<object | null>} Produit complet avec variantes, ou null si introuvable/inactif
 */
export async function getProduitPublicById(id: number) {
  const result = await pool.query(
    `SELECT
        p.id,
        p.nom,
        p.description,
        p.prix,
        p.prix_compare,
        p.images,
        p.actif,
        b.nom        AS boutique_nom,
        b.url_logo   AS boutique_url_logo,
        c.nom        AS categorie_nom,
        COALESCE(AVG(a.note), 0)      AS note_moyenne,
        COUNT(DISTINCT a.id)          AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]')
         FROM variantes_produit v
         WHERE v.produit_id = p.id AND v.actif = true)   AS variantes
     FROM produits p
     JOIN boutiques b ON p.boutique_id = b.id
     JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN avis a ON a.produit_id = p.id
     WHERE p.id = $1 AND p.actif = true
     GROUP BY p.id, b.nom, b.url_logo, c.nom`,
    [id]
  );
  return result.rows[0] ?? null;
}

// ─────────────────────────────────────────────
// READ — Récupérer les produits (Catalogue public avec filtres)
// ─────────────────────────────────────────────

/**
 * Retourne le catalogue produits public filtré et paginé.
 * Construit une requête SQL dynamique basée sur les filtres fournis.
 * N'inclut que les produits actifs avec au moins une variante en stock.
 * @param {object} filters - Critères de filtrage
 * @param {string} [filters.recherche] - Terme de recherche libre
 * @param {string} [filters.recherche_type] - Portée de la recherche : produit | boutique | categorie
 * @param {number} [filters.prix_min] - Prix minimum (filtre inclusif)
 * @param {number} [filters.prix_max] - Prix maximum (filtre inclusif)
 * @param {string} [filters.categories] - Noms de catégories séparés par des virgules
 * @param {number} [filters.note_min] - Note moyenne minimale (1-5)
 * @param {string} [filters.tri] - Tri : price-asc | price-desc | rating | newest
 * @param {string} [filters.page] - Numéro de page (défaut: 1)
 * @param {string} [filters.limite] - Produits par page (défaut: 9)
 * @returns {Promise<{ produits: object[], totalCount: number, totalPages: number, currentPage: number }>}
 */
export async function getProduitsPublicFiltres(filters: any) {
  const values: any[] = [];
  let paramIndex = 1;

  let whereClauses = `p.actif = true
    AND EXISTS (
      SELECT 1 FROM variantes_produit v
      WHERE v.produit_id = p.id AND v.stock > 0
    )`;

  if (filters.recherche) {
    const searchTerm = `%${filters.recherche}%`;
    switch (filters.recherche_type) {
      case 'boutique':
      case 'vendeur':
        whereClauses += ` AND b.nom ILIKE $${paramIndex}`;
        break;
      case 'categorie':
        whereClauses += ` AND c.nom ILIKE $${paramIndex}`;
        break;
      case 'produit':
        whereClauses += ` AND (p.nom ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        break;
      default:
        whereClauses += ` AND (p.nom ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR b.nom ILIKE $${paramIndex} OR c.nom ILIKE $${paramIndex})`;
        break;
    }
    values.push(searchTerm);
    paramIndex++;
  }

  if (filters.prix_min !== undefined) {
    whereClauses += ` AND p.prix >= $${paramIndex}`;
    values.push(filters.prix_min);
    paramIndex++;
  }

  if (filters.prix_max !== undefined) {
    whereClauses += ` AND p.prix <= $${paramIndex}`;
    values.push(filters.prix_max);
    paramIndex++;
  }

  if (filters.categories) {
    const cats = filters.categories.split(',');
    const placeholders = cats.map((_: any, i: number) => `$${paramIndex + i}`).join(', ');
    whereClauses += ` AND c.nom IN (${placeholders})`;
    values.push(...cats);
    paramIndex += cats.length;
  }

  let havingClause = '';
  if (filters.note_min !== undefined && filters.note_min > 0) {
    havingClause = `HAVING FLOOR(COALESCE(AVG(a.note), 0)) = $${paramIndex}`;
    values.push(Number(filters.note_min));
    paramIndex++;
  }

  let orderBy = 'cree_le DESC';
  if (filters.tri) {
    switch (filters.tri) {
      case 'popular':    orderBy = 'nombre_avis DESC NULLS LAST, note_moyenne DESC NULLS LAST'; break;
      case 'price-asc':  orderBy = 'prix ASC'; break;
      case 'price-desc': orderBy = 'prix DESC'; break;
      case 'rating':     orderBy = 'note_moyenne DESC NULLS LAST'; break;
      case 'newest':     orderBy = 'cree_le DESC'; break;
    }
  }

  const page   = filters.page   ? Math.max(1, parseInt(filters.page))   : 1;
  const limite = filters.limite ? Math.max(1, parseInt(filters.limite)) : 9;
  const offset = (page - 1) * limite;

  const query = `
    WITH filtered AS (
      SELECT
        p.id,
        p.nom,
        p.description,
        p.prix,
        p.prix_compare,
        p.images,
        p.cree_le,
        b.nom          AS boutique_nom,
        b.url_logo     AS boutique_url_logo,
        c.nom          AS categorie_nom,
        COALESCE(AVG(a.note), 0)   AS note_moyenne,
        COUNT(DISTINCT a.id)       AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]')
         FROM variantes_produit v
         WHERE v.produit_id = p.id AND v.actif = true) AS variantes
      FROM produits p
      JOIN boutiques b ON p.boutique_id = b.id
      JOIN categories c ON p.categorie_id = c.id
      LEFT JOIN avis a ON a.produit_id = p.id
      WHERE ${whereClauses}
      GROUP BY p.id, b.nom, b.url_logo, c.nom
      ${havingClause}
    )
    SELECT
      *,
      COUNT(*) OVER() AS total_count
    FROM filtered
    ORDER BY ${orderBy}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  values.push(limite, offset);

  const result = await pool.query(query, values);
  const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
  const produits = result.rows.map(row => {
    const { total_count, ...produit } = row;
    return produit;
  });

  return {
    produits,
    totalCount,
    totalPages: Math.ceil(totalCount / limite),
    currentPage: page,
  };
}

// ─────────────────────────────────────────────
// READ — Récupérer les produits par Boutique (Vendeur)
// ─────────────────────────────────────────────

/**
 * Retourne tous les produits d'une boutique (vue vendeur — inclut produits inactifs).
 * Triés par date de création décroissante.
 * @param {number} boutiqueId - Identifiant de la boutique
 * @returns {Promise<object[]>} Liste des produits avec variantes, note et avis
 */
export async function getProduitsByBoutique(boutiqueId: number) {
  const result = await pool.query(
    `SELECT 
        p.*, 
        b.nom AS boutique_nom, 
        c.nom AS categorie_nom,
        COALESCE(AVG(a.note), 0) AS note_moyenne,
        COUNT(DISTINCT a.id) AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]') 
         FROM variantes_produit v 
         WHERE v.produit_id = p.id AND v.actif = true) AS variantes
     FROM produits p
     JOIN boutiques b ON p.boutique_id = b.id
     JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN avis a ON a.produit_id = p.id
     WHERE p.boutique_id = $1
     GROUP BY p.id, b.nom, c.nom
     ORDER BY p.cree_le DESC`,
    [boutiqueId]
  );
  return result.rows;
}

// ─────────────────────────────────────────────
// READ — Récupérer un produit par ID (Vendeur)
// ─────────────────────────────────────────────

/**
 * Retourne le détail d'un produit en vérifiant qu'il appartient à la boutique (vue vendeur).
 * @param {number} id - Identifiant du produit
 * @param {number} boutiqueId - Identifiant de la boutique propriétaire (isolation vendeur)
 * @returns {Promise<object | undefined>} Produit complet ou undefined si introuvable/non autorisé
 */
export async function getProduitById(id: number, boutiqueId: number) {
  const result = await pool.query(
    `SELECT 
        p.*, 
        b.nom AS boutique_nom,
        b.url_logo AS boutique_url_logo,
        c.nom AS categorie_nom,
        COALESCE(AVG(a.note), 0) AS note_moyenne,
        COUNT(DISTINCT a.id) AS nombre_avis,
        (SELECT COALESCE(JSON_AGG(v.*), '[]') 
         FROM variantes_produit v 
         WHERE v.produit_id = p.id AND v.actif = true) AS variantes
     FROM produits p
     JOIN boutiques b ON p.boutique_id = b.id
     JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN avis a ON a.produit_id = p.id
     WHERE p.id = $1 AND p.boutique_id = $2
     GROUP BY p.id, b.nom, b.url_logo, c.nom`,
    [id, boutiqueId]
  );
  return result.rows[0];
}

// ─────────────────────────────────────────────
// CREATE — Créer un produit
// ─────────────────────────────────────────────

/**
 * Crée un produit et ses variantes dans une transaction atomique.
 * Pour chaque variante, un SKU unique est généré si non fourni.
 * Si aucune variante n'est fournie, une variante par défaut vide est créée.
 * @param {object} data - Données du produit
 * @param {number} data.boutiqueId - Identifiant de la boutique propriétaire
 * @param {number} data.categorieId - Identifiant de la catégorie
 * @param {string} data.nom - Nom du produit
 * @param {string} [data.description] - Description du produit
 * @param {number} data.prix - Prix de base en euros
 * @param {number} [data.prixCompare] - Prix barré (avant promotion)
 * @param {string[]} [data.images] - URLs des images
 * @param {boolean} [data.actif] - Visibilité publique (défaut: true)
 * @param {object[]} [data.variantes] - Variantes du produit
 * @param {number} [data.stock] - Stock initial si variante par défaut auto-créée
 * @returns {Promise<object>} Produit créé (sans les variantes dans la réponse directe)
 * @throws {Error} En cas d'erreur SQL — la transaction est rollbackée automatiquement
 */
export async function createProduit(data: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productQuery = `
      INSERT INTO produits (boutique_id, categorie_id, nom, description, prix, prix_compare, images, actif)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`;

    const productValues = [
      data.boutiqueId,
      data.categorieId,
      data.nom,
      data.description,
      data.prix,
      data.prixCompare || null,
      JSON.stringify(data.images || []),
      data.actif ?? true,
    ];

    const productResult = await client.query(productQuery, productValues);
    const newProduct = productResult.rows[0];

    if (data.variantes && data.variantes.length > 0) {
      for (const v of data.variantes) {
        const sku = v.sku || await generateSku(client, data.boutiqueId, newProduct.id);
        await client.query(
          `INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock, seuil_stock_faible)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newProduct.id,
            sku,
            JSON.stringify(v.attributs || {}),
            v.prix_supplementaire || 0,
            v.stock || 0,
            v.seuil_stock_faible || 5,
          ]
        );
      }
    } else {
      const autoSku = await generateSku(client, data.boutiqueId, newProduct.id);
      await client.query(
        `INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock, seuil_stock_faible)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newProduct.id,
          autoSku,
          JSON.stringify({}),
          0,
          data.stock || 0,
          5,
        ]
      );
    }

    await client.query('COMMIT');
    return newProduct;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// UPDATE — Modifier un produit
// ─────────────────────────────────────────────

/**
 * Met à jour un produit et synchronise ses variantes dans une transaction atomique.
 * Logique variantes :
 * - Variante avec `id` et sans `supprimee` → mise à jour (attributs, prix, stock, seuil)
 * - Variante avec `id` et `supprimee: true` → soft delete (actif = false)
 * - Variante sans `id` et sans `supprimee` → insertion avec SKU généré automatiquement
 * - Variantes existantes absentes de la liste → soft delete + stock mis à 0
 * @param {number} id - Identifiant du produit à modifier
 * @param {number} boutiqueId - Identifiant de la boutique (isolation vendeur)
 * @param {object} data - Données de mise à jour
 * @param {string} [data.nom] - Nouveau nom
 * @param {string} [data.description] - Nouvelle description
 * @param {number} [data.prix] - Nouveau prix
 * @param {number} [data.prix_compare] - Nouveau prix barré
 * @param {string[]} [data.images] - Nouvelles URLs d'images
 * @param {boolean} [data.actif] - Visibilité publique
 * @param {number} [data.categorie_id] - Nouvelle catégorie
 * @param {object[]} [data.variantes] - Liste des variantes à synchroniser
 * @returns {Promise<object>} Produit mis à jour
 * @throws {Error} "PRODUIT_NON_TROUVE" si le produit n'existe pas ou n'appartient pas à la boutique
 */
export async function updateProduit(id: number, boutiqueId: number, data: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productQuery = `
      UPDATE produits 
      SET nom = COALESCE($1, nom), description = $2, prix = $3, 
          prix_compare = $4, images = $5, actif = $6, categorie_id = $7, mis_a_jour_le = now()
      WHERE id = $8 AND boutique_id = $9 RETURNING *`;
    
    const productResult = await client.query(productQuery, [
      data.nom, data.description, data.prix, data.prix_compare, 
      JSON.stringify(data.images), data.actif, data.categorie_id, id, boutiqueId
    ]);

    if (productResult.rows.length === 0) throw new Error("PRODUIT_NON_TROUVE");

    if (data.variantes && Array.isArray(data.variantes)) {
      const activeIds = data.variantes
        .filter((v: any) => v.id && !v.supprimee)
        .map((v: any) => v.id);

      const softDeleteQuery = `
      UPDATE variantes_produit 
      SET actif = false, stock = 0
      WHERE produit_id = $1 
      AND id NOT IN (${activeIds.length > 0 ? activeIds.join(',') : '0'})`;
      
      await client.query(softDeleteQuery, [id]);

      for (const v of data.variantes) {
        if (v.supprimee && v.id) {
          await client.query(`UPDATE variantes_produit SET actif = false WHERE id = $1`, [v.id]);
        } else if (v.id) {
          await client.query(
            `UPDATE variantes_produit 
             SET attributs = $1, prix_supplementaire = $2, stock = $3, seuil_stock_faible = $4, actif = true
             WHERE id = $5 AND produit_id = $6`,
            [JSON.stringify(v.attributs), v.prix_supplementaire, v.stock, v.seuil_stock_faible, v.id, id]
          );
        } else if (!v.supprimee) {
          const newSku = await generateSku(client, boutiqueId, id);
          await client.query(
            `INSERT INTO variantes_produit (produit_id, sku, attributs, prix_supplementaire, stock, seuil_stock_faible, actif)
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [id, newSku, JSON.stringify(v.attributs), v.prix_supplementaire, v.stock, v.seuil_stock_faible]
          );
        }
      }
    }

    await client.query('COMMIT');
    return productResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

/**
 * Supprime logiquement un produit (soft delete : actif = false) et remet tous ses stocks à 0.
 * Le produit reste en base pour la cohérence des commandes et avis existants.
 * @param {number} id - Identifiant du produit
 * @param {number} boutiqueId - Identifiant de la boutique (isolation vendeur)
 * @returns {Promise<object | null>} Produit désactivé, ou null si introuvable/non autorisé
 * @throws {Error} En cas d'erreur SQL — la transaction est rollbackée automatiquement
 */
export async function deleteProduit(id: number, boutiqueId: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `UPDATE produits
       SET actif = false, mis_a_jour_le = now()
       WHERE id = $1 AND boutique_id = $2
       RETURNING *`,
      [id, boutiqueId]
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE variantes_produit
       SET stock = 0
       WHERE produit_id = $1`,
      [id]
    );

    await client.query("COMMIT");
    return productResult.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// STOCKS
// ─────────────────────────────────────────────

/**
 * Retourne le stock de toutes les variantes actives d'un produit (vue vendeur).
 * Inclut un indicateur `stock_faible` calculé en comparant stock et seuil_stock_faible.
 * @param {number} produitId - Identifiant du produit
 * @param {number} boutiqueId - Identifiant de la boutique (isolation vendeur)
 * @returns {Promise<object[]>} Liste des variantes avec id, sku, stock, seuil, attributs, stock_faible
 */
export async function getStockProduit(produitId: number, boutiqueId: number) {
  const result = await pool.query(
    `SELECT 
        v.id, v.sku, v.stock, v.seuil_stock_faible, v.attributs,
        CASE WHEN v.stock <= v.seuil_stock_faible THEN true ELSE false END AS stock_faible
     FROM variantes_produit v
     JOIN produits p ON v.produit_id = p.id
     WHERE v.produit_id = $1 AND p.boutique_id = $2`,
    [produitId, boutiqueId]
  );
  return result.rows;
}

/**
 * Remplace la valeur de stock d'une variante par une valeur absolue.
 * Vérifie que la variante appartient bien à la boutique du vendeur.
 * @param {number} varianteId - Identifiant de la variante produit
 * @param {number} boutiqueId - Identifiant de la boutique (isolation vendeur)
 * @param {number} stock - Nouvelle valeur de stock (absolue, pas un delta)
 * @returns {Promise<object | undefined>} Variante mise à jour, ou undefined si non trouvée/non autorisée
 */
export async function updateStock(varianteId: number, boutiqueId: number, stock: number) {
  const result = await pool.query(
    `UPDATE variantes_produit v
     SET stock = $1
     FROM produits p
     WHERE v.id = $2 AND v.produit_id = p.id AND p.boutique_id = $3
     RETURNING v.*`,
    [stock, varianteId, boutiqueId]
  );
  return result.rows[0];
}

/**
 * Ajoute une quantité au stock actuel d'une variante (réapprovisionnement additif).
 * Contrairement à `updateStock`, cette fonction incrémente le stock existant.
 * Vérifie que la variante appartient bien à la boutique du vendeur.
 * @param {number} varianteId - Identifiant de la variante produit
 * @param {number} boutiqueId - Identifiant de la boutique (isolation vendeur)
 * @param {number} quantiteAjouter - Quantité à ajouter au stock actuel (delta positif)
 * @returns {Promise<object | null>} Variante mise à jour, ou null si non trouvée/non autorisée
 */
export async function reapprovisionnerVariante(
  varianteId: number,
  boutiqueId: number,
  quantiteAjouter: number
) {
  const result = await pool.query(
    `UPDATE variantes_produit v
     SET stock = v.stock + $1
     FROM produits p
     WHERE v.id = $2 AND v.produit_id = p.id AND p.boutique_id = $3
     RETURNING v.*`,
    [quantiteAjouter, varianteId, boutiqueId]
  );
  return result.rows[0] ?? null;
}