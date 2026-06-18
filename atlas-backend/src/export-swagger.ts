/**
 * @file export-swagger.ts
 * @description Script utilitaire pour exporter la spécification OpenAPI en fichier JSON statique.
 *
 * Ce script initialise express-jsdoc-swagger avec la même configuration que app.ts,
 * capture la spécification générée via l'événement "finish", puis l'écrit dans
 * atlas-backend/docs/swagger.json.
 *
 * Le serveur Express n'est jamais démarré : aucune connexion à la base de données
 * ni à Stripe n'est effectuée. La bibliothèque lit uniquement les fichiers source
 * pour en extraire les annotations JSDoc.
 *
 * Usage :
 *   npm run docs:swagger
 *   (alias de : npx tsx src/export-swagger.ts)
 *
 * Sortie :
 *   atlas-backend/docs/swagger.json  — spécification OpenAPI 3.0 complète
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import expressJSDocSwagger from "express-jsdoc-swagger";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const swaggerOptions = {
  info: {
    version: "1.0.0",
    title: "Atlas API",
    description:
      "Documentation interactive de l'API Atlas — marketplace multi-vendeur. " +
      "Authentification par cookie httpOnly (better-auth.session_token). " +
      "Se connecter via POST /api/auth/sign-in/email avant d'utiliser les routes protégées.",
  },
  baseDir: __dirname,
  filesPattern: "./**/*.{ts,js}",
  swaggerUIPath: "/api-docs",
  exposeSwaggerUI: false,
  exposeApiDocs: true,
  apiDocsPath: "/v3/api-docs",
  security: {
    cookieAuth: {
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
      description:
        "Token de session BetterAuth (httpOnly cookie). " +
        "Obtenu après connexion via POST /api/auth/sign-in/email.",
    },
  },
};

// @ts-ignore — les typages de express-jsdoc-swagger ne couvrent pas l'EventEmitter retourné
const instance = expressJSDocSwagger(app)(swaggerOptions);

instance.on("finish", (swaggerObject: unknown) => {
  const outputDir = path.join(__dirname, "..", "docs");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, "swagger.json");
  writeFileSync(outputPath, JSON.stringify(swaggerObject, null, 2), "utf-8");
  console.log(`Specification OpenAPI exportée → ${outputPath}`);
  process.exit(0);
});

instance.on("error", (error: Error) => {
  console.error("Erreur lors de l'export Swagger :", error.message);
  process.exit(1);
});
