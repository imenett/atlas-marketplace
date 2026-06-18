/**
 * @file auth.routes.ts
 * @description Routeur Express dédié aux routes d'authentification BetterAuth.
 *
 * Toutes les requêtes arrivant sur /api/auth/* sont transmises directement à
 * l'instance BetterAuth via `toNodeHandler`. BetterAuth gère de manière transparente :
 * - POST /api/auth/sign-up/email    — Inscription par email/mot de passe
 * - POST /api/auth/sign-in/email    — Connexion (création du cookie de session)
 * - POST /api/auth/sign-out         — Déconnexion (suppression du cookie)
 * - GET  /api/auth/session          — Récupération de la session courante
 * - GET  /api/auth/get-session      — Alias de session
 *
 * Le cookie de session `better-auth.session_token` est httpOnly et utilisé
 * automatiquement par le navigateur sur toutes les requêtes authentifiées.
 */
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.js";

const authRouter = express.Router();

/**
 * Intercepteur de toutes les requêtes arrivant sur ce routeur.
 * `toNodeHandler(auth)` convertit l'instance BetterAuth en un handler
 * compatible avec le format de requête/réponse natif de Node.js.
 * Les routes exactes exposées dépendent de la configuration de BetterAuth dans auth.ts.
 */
authRouter.use((req, res) => {
  return toNodeHandler(auth)(req, res);
});

export default authRouter;
