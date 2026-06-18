/**
 * @file app.ts
 * @description Point d'entrée de l'application Express Atlas.
 * Configure le middleware CORS, le parser JSON, les routes API et la documentation Swagger.
 * Le webhook Stripe est enregistré avant express.json() pour préserver le body brut.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import expressJSDocSwagger from "express-jsdoc-swagger";
import profileRouter from "./routes/Profile.routes.js";

// CHARGEMENT ENV EN PREMIER
dotenv.config();

import authRouter from "./routes/auth.routes.js";
import { auth } from "./auth.js";
import { fromNodeHeaders } from "better-auth/node";
import vendorRouter from "./routes/vendor/register.routes.js";
import productsRouter from "./routes/products.routes.js";
import categoriesRouter from "./routes/categories.routes.js";
import shopRouter from "./routes/vendor/shop.routes.js";
import vendorProductsRouter from "./routes/vendor/products.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import ordersRouter from "./routes/orders.routes.js";
import dashboardRouter from "./routes/vendor/dashboard.routes.js";
import reviewsRouter from "./routes/reviews.routes.js";
import vendorOrdersRouter from "./routes/vendor/orders.routes.js";
import boutiquesRouter from "./routes/boutiques.routes.js";
import paymentRouter from "./routes/payment.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3005;

const swaggerOptions = {
  info: {
    version: '1.0.0',
    title: 'Atlas API',
    description: "Documentation interactive de l'API Atlas — marketplace multi-vendeur",
  },
  baseDir: __dirname,
  filesPattern: './**/*.{ts,js}',
  swaggerUIPath: '/api-docs',
  exposeSwaggerUI: true,
  security: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'better-auth.session_token',
      description: "Token de session BetterAuth (httpOnly cookie). Obtenu après connexion via POST /api/auth/sign-in/email.",
    },
  },
};

// @ts-ignore
expressJSDocSwagger(app)(swaggerOptions);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// ⚠️  STRIPE WEBHOOK — doit être AVANT express.json()
// Stripe envoie un body binaire signé. Si express.json() le parse en premier,
// la vérification de signature échoue.
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

// Parser JSON global pour toutes les autres routes
app.use(express.json());

// ── Routes API ────────────────────────────────────────────────────────────
app.use("/api/payment", paymentRouter);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

// Routes vendeur
app.use("/api/vendor", vendorRouter);
app.use("/api/vendor/shop", shopRouter);
app.use("/api/vendor/dashboard", dashboardRouter);
app.use("/api/vendor/products", vendorProductsRouter);
app.use("/api/vendor/orders", vendorOrdersRouter);

// Routes produits et catégories
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/boutiques", boutiquesRouter);

/**
 * GET /health
 * @summary Vérifie que le serveur est opérationnel (utilisé par UptimeRobot)
 * @tags Système
 * @return {object} 200 - Serveur en ligne - application/json
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * GET /api/me
 * @summary Retourne les informations de l'utilisateur et de la session courante
 * @tags Authentification
 * @return {object} 200 - Utilisateur et session BetterAuth - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
app.get("/api/me", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }
    res.json({
      user: session.user,
      session: session.session,
    });
  } catch (error) {
    console.error("Erreur /api/me :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.listen(port, () => {
  console.log(`Atlas Backend démarré sur http://localhost:${port}`);
  console.log(`Documentation Swagger disponible sur http://localhost:${port}/api-docs`);
});

export default app;