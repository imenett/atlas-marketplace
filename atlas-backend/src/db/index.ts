/**
 * @file db/index.ts
 * @description Configuration et export du pool de connexions PostgreSQL.
 * Utilise la variable d'environnement `DATABASE_URL` pour la chaîne de connexion.
 * SSL activé avec `rejectUnauthorized: false` (compatible Supabase/Neon).
 * En cas d'erreur inattendue sur le pool, le processus est arrêté (exit -1).
 */
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

/**
 * Pool de connexions PostgreSQL partagé par tous les services et controllers.
 * Configuré via `process.env.DATABASE_URL`.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  console.error("Erreur inattendue sur le pool PostgreSQL :", err);
  process.exit(-1);
});
