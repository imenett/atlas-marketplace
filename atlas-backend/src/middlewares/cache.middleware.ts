/**
 * @file cache.middleware.ts
 * @description Cache HTTP en mémoire pour les routes GET publiques.
 *
 * Fonctionnement :
 * 1. Une requête GET arrive (ex: GET /api/products?page=1&limite=6)
 * 2. Le middleware génère une clé unique basée sur l'URL complète
 * 3. Cache HIT : si la clé existe et n'a pas expiré → réponse immédiate
 * 4. Cache MISS : la requête passe au controller, la réponse est interceptée,
 *    stockée avec un TTL, puis envoyée au client
 *
 * Invalidation : appeler `clearCache(prefix)` après toute mutation de données
 * (création, modification, suppression de produit ou boutique).
 */
import type { Request, Response, NextFunction } from "express";

/** Entrée stockée dans le cache */
interface CacheEntry {
  /** Réponse JSON sérialisée */
  data: any;
  /** Timestamp d'expiration (ms depuis epoch) */
  expireAt: number;
}

/** Stockage en mémoire du process Node.js (clé: `prefix:url`) */
const cache = new Map<string, CacheEntry>();

/**
 * Middleware de cache pour les routes GET.
 * Ignore les méthodes non-GET. Les requêtes identiques (même URL + query params)
 * sont servies depuis la mémoire pendant la durée du TTL.
 * @param {string} prefix - Identifiant du groupe de cache (ex: "products", "boutiques")
 *   utilisé pour l'invalidation ciblée via `clearCache(prefix)`
 * @param {number} [ttlMs=60000] - Durée de vie du cache en millisecondes (défaut: 60 s)
 * @returns {(req: Request, res: Response, next: NextFunction) => void} Middleware Express
 * @example
 * router.get('/', cacheMiddleware('products', 60_000), getProduitsPublic);
 */
export function cacheMiddleware(prefix: string, ttlMs: number = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `${prefix}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expireAt > Date.now()) {
      console.log(`Cache HIT  [${prefix}] ${req.originalUrl}`);
      res.json(cached.data);
      return;
    }

    console.log(`Cache MISS [${prefix}] ${req.originalUrl}`);

    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      cache.set(cacheKey, {
        data: body,
        expireAt: Date.now() + ttlMs,
      });
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalide toutes les entrées du cache dont la clé commence par `prefix:`.
 * À appeler après toute opération POST/PUT/DELETE qui modifie les données cachées.
 * @param {string} prefix - Préfixe du groupe à invalider (ex: "products", "boutiques")
 * @returns {void}
 * @example
 * clearCache("products"); // supprime toutes les pages du catalogue en cache
 */
export function clearCache(prefix: string) {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(`${prefix}:`)) {
      cache.delete(key);
      count++;
    }
  }
  if (count > 0) {
    console.log(`Cache CLEAR [${prefix}] — ${count} entrée(s) supprimée(s)`);
  }
}
