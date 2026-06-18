/**
 * @file auth.middleware.ts
 * @description Middleware d'authentification basé sur BetterAuth.
 * Vérifie la session via le cookie httpOnly `better-auth.session_token` et injecte
 * `req.user` (id, role, email, name…) pour les controllers suivants.
 */
import type  { Request, Response, NextFunction } from "express";
import { auth } from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";

/**
 * Vérifie qu'une session BetterAuth valide est présente dans les headers de la requête.
 * Si valide, injecte les données utilisateur dans `req.user` et appelle `next()`.
 * Si invalide ou absente, répond 401 et interrompt la chaîne.
 * @param {Request} req - Requête Express (cookie `better-auth.session_token` requis)
 * @param {Response} res - Réponse Express : 401 si session absente ou expirée
 * @param {NextFunction} next - Fonction de passage au middleware suivant
 * @returns {Promise<void>}
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({
        error: "Non authentifié — veuillez vous connecter"
      });
      return;
    }

    (req as any).user = session.user;

    next();

  } catch (error) {
    console.error("Erreur authMiddleware :", error);
    res.status(401).json({
      error: "Session invalide ou expirée"
    });
  }
}
