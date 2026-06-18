/**
 * @file vendor.middleware.ts
 * @description Middleware de contrôle d'accès pour les routes réservées aux vendeurs.
 * Doit être chaîné après `authMiddleware` qui injecte `req.user`.
 */
import type { Request, Response, NextFunction } from "express";

/**
 * Vérifie que l'utilisateur connecté possède le rôle "VENDEUR".
 * Bloque les clients et les utilisateurs non authentifiés avec les codes HTTP appropriés.
 * @param {Request} req - Requête Express (`req.user.role` injecté par authMiddleware)
 * @param {Response} res - Réponse Express : 401 si user absent, 403 si rôle insuffisant
 * @param {NextFunction} next - Fonction de passage au middleware suivant
 * @returns {void}
 */
export function vendorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      error: "Non authentifié — authMiddleware manquant"
    });
    return;
  }

  if (user.role !== "VENDEUR") {
    res.status(403).json({
      error: "Accès refusé — cette action est réservée aux vendeurs"
    });
    return;
  }

  next();
}
