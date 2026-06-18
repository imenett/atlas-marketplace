/**
 * @file auth.ts
 * @description Configuration de BetterAuth pour Atlas.
 *
 * Authentification par email/mot de passe avec session httpOnly cookie.
 * Champs utilisateur étendus : `role` (CLIENT | VENDEUR), `numero_telephone`, `url_avatar`.
 *
 * Variables d'environnement requises :
 * - `DATABASE_URL`        : connexion PostgreSQL (pool Kysely)
 * - `BETTER_AUTH_SECRET`  : clé secrète pour signer les sessions
 * - `BETTER_AUTH_URL`     : URL de base du backend (ex: http://localhost:3005)
 * - `FRONTEND_URL`        : URL du frontend pour CORS/trustedOrigins
 * - `NODE_ENV`            : "production" active les cookies Secure + SameSite=None
 *
 * Durée de session : 7 jours, renouvelée automatiquement après 24 h d'inactivité.
 */
import { betterAuth } from "better-auth";
import { Kysely, PostgresDialect } from "kysely";
import pkg from "pg";
import dotenv from "dotenv";

const { Pool } = pkg;
dotenv.config();

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = new Kysely({
  dialect: new PostgresDialect({ pool: dbPool }),
});

const isProd = process.env.NODE_ENV === "production";

/**
 * Instance BetterAuth exportée et consommée par `authMiddleware`
 * et montée sur `/api/auth` dans `app.ts`.
 */
export const auth = betterAuth({
  database: {
    db: db,
    type: "postgres",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
  advanced: {
    defaultCookieAttributes: {
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      httpOnly: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      /** Rôle de l'utilisateur : "CLIENT" (défaut) ou "VENDEUR" */
      role: {
        type: "string",
        required: false,
        defaultValue: "CLIENT",
        input: true,
      },
      /** Numéro de téléphone optionnel */
      numero_telephone: {
        type: "string",
        required: false,
      },
      /** URL de l'avatar optionnel */
      url_avatar: {
        type: "string",
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});