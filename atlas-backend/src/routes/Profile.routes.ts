/**
 * @file Profile.routes.ts
 * @description Routes de gestion du profil utilisateur et de ses adresses de livraison.
 * Toutes ces routes nécessitent une session active (authMiddleware).
 * Accessibles aussi bien aux clients qu'aux vendeurs.
 * Montées sur /api/profile dans app.ts.
 */
import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getMe,
  updateMe,
  uploadAvatar,
  getAdresses,
  createAdresse,
  setDefaultAdresse,
  deleteAdresse,
} from "../controllers/Profilecontroller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont autorisées."));
  },
});

const router = Router();

// Toutes les routes de ce fichier nécessitent d'être connecté
router.use(authMiddleware);

/**
 * GET /api/profile/me
 * @summary Retourne les informations du profil de l'utilisateur connecté
 * @tags Profil
 * @return {Utilisateur} 200 - Données du profil utilisateur - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/me", getMe);

/**
 * PATCH /api/profile/me
 * @summary Met à jour les informations du profil de l'utilisateur connecté
 * @tags Profil
 * @param {object} request.body.required - Champs à mettre à jour (tous optionnels)
 * @param {string} request.body.name - Nouveau nom complet
 * @param {string} request.body.email - Nouvel email
 * @param {string} request.body.numero_telephone - Nouveau numéro de téléphone
 * @return {Utilisateur} 200 - Profil mis à jour - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.patch("/me", updateMe);

/**
 * POST /api/profile/avatar
 * @summary Téléverse une photo de profil vers Supabase Storage et met à jour url_avatar
 * @tags Profil
 * @param {file} image.formData.required - Fichier image (max 5 Mo)
 * @return {object} 200 - URL publique de l'avatar ({ url: string }) - application/json
 * @return {ErrorResponse} 400 - Fichier manquant - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.post("/avatar", upload.single("image"), uploadAvatar);

/**
 * GET /api/profile/adresses
 * @summary Retourne toutes les adresses de livraison de l'utilisateur
 * @tags Profil
 * @return {array<Adresse>} 200 - Liste des adresses, adresse par défaut en premier - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.get("/adresses", getAdresses);

/**
 * POST /api/profile/adresses
 * @summary Crée une nouvelle adresse de livraison (maximum 10 par utilisateur)
 * @tags Profil
 * @param {object} request.body.required - Données de l'adresse
 * @param {string} request.body.prenom.required - Prénom du destinataire
 * @param {string} request.body.nom.required - Nom du destinataire
 * @param {string} request.body.rue.required - Adresse (numéro et rue)
 * @param {string} request.body.ville.required - Ville
 * @param {string} request.body.code_postal.required - Code postal
 * @param {string} request.body.pays.required - Pays (ex: "France")
 * @param {string} request.body.telephone - Numéro de téléphone du destinataire
 * @return {Adresse} 201 - Adresse créée - application/json
 * @return {ErrorResponse} 400 - Limite de 10 adresses atteinte ou champs manquants - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.post("/adresses", createAdresse);

/**
 * PATCH /api/profile/adresses/{id}/default
 * @summary Définit une adresse comme adresse par défaut
 * @tags Profil
 * @param {number} id.path.required - Identifiant de l'adresse à définir par défaut
 * @return {Adresse} 200 - Adresse mise à jour comme adresse par défaut - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 404 - Adresse introuvable ou non autorisée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.patch("/adresses/:id/default", setDefaultAdresse);

/**
 * DELETE /api/profile/adresses/{id}
 * @summary Supprime une adresse de livraison
 * @tags Profil
 * @param {number} id.path.required - Identifiant de l'adresse à supprimer
 * @return {MessageResponse} 200 - Adresse supprimée - application/json
 * @return {ErrorResponse} 401 - Non authentifié - application/json
 * @return {ErrorResponse} 404 - Adresse introuvable ou non autorisée - application/json
 * @return {ErrorResponse} 500 - Erreur serveur - application/json
 * @security cookieAuth
 */
router.delete("/adresses/:id", deleteAdresse);

export default router;
