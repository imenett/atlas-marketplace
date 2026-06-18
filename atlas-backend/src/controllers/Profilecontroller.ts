/**
 * @file Profilecontroller.ts
 * @description Contrôleur de gestion du profil utilisateur et des adresses de livraison.
 * Toutes les fonctions lisent req.user injecté par authMiddleware.
 */
import type { Request, Response } from "express";
import { pool } from "../db/index.js";
import { supabaseAdmin } from "../lib/supabase.js";

// ─────────────────────────────────────────────────────────────
// UTILISATEUR
// ─────────────────────────────────────────────────────────────

/**
 * Retourne les informations du profil de l'utilisateur connecté.
 * @param {Request} req - Requête Express (req.user.id requis via authMiddleware)
 * @param {Response} res - Réponse JSON : 200 (profil) | 404 (introuvable) | 500 (erreur)
 * @returns {Promise<void>}
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT id, name, email, "emailVerified", role, numero_telephone, url_avatar, "createdAt"
       FROM public.user
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Utilisateur introuvable" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("[getMe]", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

/**
 * Met à jour les informations de l'utilisateur connecté.
 * Seuls les champs fournis dans le body sont mis à jour (mise à jour partielle).
 * Vérifie l'unicité de l'email si celui-ci est modifié.
 * @param {Request} req - Body : { name?, email?, numero_telephone? }
 * @param {Response} res - Réponse JSON : 200 (profil mis à jour) | 400 | 409 | 500
 * @returns {Promise<void>}
 */
export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { name, email, numero_telephone } = req.body as {
      name?: string;
      email?: string;
      numero_telephone?: string | null;
    };

    // Validation
    if (name !== undefined && name.trim().length < 2) {
      res.status(400).json({ message: "Le nom doit contenir au moins 2 caractères" });
      return;
    }
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ message: "Email invalide" });
      return;
    }

    // Vérifier unicité email si changement
    if (email) {
      const existing = await pool.query(
        `SELECT id FROM public.user WHERE email = $1 AND id != $2`,
        [email, userId]
      );
      if (existing.rows.length > 0) {
        res.status(409).json({ message: "Cet email est déjà utilisé" });
        return;
      }
    }

    // Construction dynamique de l'UPDATE (seuls les champs fournis sont mis à jour)
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(email.toLowerCase().trim());
    }
    if (numero_telephone !== undefined) {
      fields.push(`numero_telephone = $${idx++}`);
      values.push(numero_telephone || null);
    }

    if (fields.length === 0) {
      res.status(400).json({ message: "Aucun champ à mettre à jour" });
      return;
    }

    fields.push(`"updatedAt" = now()`);
    values.push(userId);

    const updated = await pool.query(
      `UPDATE public.user
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING id, name, email, numero_telephone, url_avatar, "emailVerified", role`,
      values
    );

    res.json(updated.rows[0]);
  } catch (error) {
    console.error("[updateMe]", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ─────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────

/**
 * Upload l'avatar de l'utilisateur vers Supabase Storage et met à jour url_avatar.
 * Reçoit le fichier via multer (req.file) en mémoire.
 * @param {Request} req - req.file : fichier image (max 5 Mo)
 * @param {Response} res - Réponse JSON : 200 ({ url }) | 400 | 500
 */
export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) {
    res.status(400).json({ message: "Aucun fichier fourni." });
    return;
  }

  try {
    const ext = file.originalname.split(".").pop() || "jpg";
    const fileName = `avatars/${userId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("boutiques-images")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[uploadAvatar] Supabase:", uploadError);
      res.status(500).json({ message: "Erreur lors du téléversement." });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("boutiques-images")
      .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;

    await pool.query(
      `UPDATE public.user SET url_avatar = $1, "updatedAt" = now() WHERE id = $2`,
      [avatarUrl, userId]
    );

    res.json({ url: avatarUrl });
  } catch (error) {
    console.error("[uploadAvatar]", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
}

// ─────────────────────────────────────────────────────────────
// ADRESSES
// ─────────────────────────────────────────────────────────────

/**
 * Retourne toutes les adresses de livraison de l'utilisateur connecté,
 * triées avec l'adresse par défaut en premier.
 * @param {Request} req - Requête Express (req.user.id requis)
 * @param {Response} res - Réponse JSON : 200 (liste d'adresses) | 500
 * @returns {Promise<void>}
 */
export async function getAdresses(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT id, nom, rue, ville, code_postal, pays, par_defaut
       FROM public.adresses
       WHERE utilisateur_id = $1
       ORDER BY par_defaut DESC, id ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("[getAdresses]", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

/**
 * Crée une nouvelle adresse de livraison pour l'utilisateur connecté.
 * Limite à 10 adresses par utilisateur.
 * Si par_defaut=true, l'ancienne adresse par défaut est automatiquement désactivée.
 * @param {Request} req - Body : { nom, rue, ville, code_postal, pays, par_defaut? }
 * @param {Response} res - Réponse JSON : 201 (adresse créée) | 400 | 500
 * @returns {Promise<void>}
 */
export async function createAdresse(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const { nom, rue, ville, code_postal, pays, par_defaut = false } = req.body as {
      nom: string;
      rue: string;
      ville: string;
      code_postal: string;
      pays: string;
      par_defaut?: boolean;
    };

    // Validation des champs obligatoires
    if (!nom?.trim())         { res.status(400).json({ message: "Le nom est obligatoire" }); return; }
    if (!rue?.trim())         { res.status(400).json({ message: "La rue est obligatoire" }); return; }
    if (!ville?.trim())       { res.status(400).json({ message: "La ville est obligatoire" }); return; }
    if (!code_postal?.trim()) { res.status(400).json({ message: "Le code postal est obligatoire" }); return; }
    if (!pays?.trim())        { res.status(400).json({ message: "Le pays est obligatoire" }); return; }

    // Limite 10 adresses par utilisateur
    const count = await pool.query(
      `SELECT COUNT(*) FROM public.adresses WHERE utilisateur_id = $1`,
      [userId]
    );
    if (parseInt(count.rows[0].count) >= 10) {
      res.status(400).json({ message: "Vous ne pouvez pas avoir plus de 10 adresses" });
      return;
    }

    // Si par_defaut, retirer l'ancienne adresse par défaut
    if (par_defaut) {
      await pool.query(
        `UPDATE public.adresses SET par_defaut = false WHERE utilisateur_id = $1`,
        [userId]
      );
    }

    const result = await pool.query(
      `INSERT INTO public.adresses (utilisateur_id, nom, rue, ville, code_postal, pays, par_defaut)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nom, rue, ville, code_postal, pays, par_defaut`,
      [userId, nom.trim(), rue.trim(), ville.trim(), code_postal.trim(), pays.trim(), par_defaut]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("[createAdresse]", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

/**
 * Définit une adresse comme adresse par défaut de l'utilisateur.
 * Opération transactionnelle : retire d'abord l'ancienne adresse par défaut,
 * puis définit la nouvelle.
 * @param {Request} req - Params : { id } — Identifiant de l'adresse à définir par défaut
 * @param {Response} res - Réponse JSON : 200 (message) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function setDefaultAdresse(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const adresseId = parseInt(req.params["id"] as string, 10);

    if (isNaN(adresseId)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    // Vérifier que l'adresse appartient bien à cet utilisateur
    const check = await pool.query(
      `SELECT id FROM public.adresses WHERE id = $1 AND utilisateur_id = $2`,
      [adresseId, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ message: "Adresse introuvable" });
      return;
    }

    // Transaction : retirer l'ancienne par défaut, définir la nouvelle
    await pool.query("BEGIN");
    await pool.query(
      `UPDATE public.adresses SET par_defaut = false WHERE utilisateur_id = $1`,
      [userId]
    );
    await pool.query(
      `UPDATE public.adresses SET par_defaut = true WHERE id = $1`,
      [adresseId]
    );
    await pool.query("COMMIT");

    res.json({ message: "Adresse par défaut mise à jour" });
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("[setDefaultAdresse]", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

/**
 * Supprime une adresse de livraison.
 * Si l'adresse supprimée était l'adresse par défaut, la suivante (tri par id ASC)
 * est automatiquement promue en nouvelle adresse par défaut.
 * @param {Request} req - Params : { id } — Identifiant de l'adresse à supprimer
 * @param {Response} res - Réponse : 204 (succès sans corps) | 400 | 404 | 500
 * @returns {Promise<void>}
 */
export async function deleteAdresse(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.id;
    const adresseId = parseInt(req.params["id"] as string, 10);

    if (isNaN(adresseId)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    // Vérifier appartenance + récupérer par_defaut
    const check = await pool.query<{ par_defaut: boolean }>(
      `SELECT par_defaut FROM public.adresses WHERE id = $1 AND utilisateur_id = $2`,
      [adresseId, userId]
    );
    if (check.rows.length === 0) {
      res.status(404).json({ message: "Adresse introuvable" });
      return;
    }

    const wasDefault = check.rows[0]?.par_defaut ?? false;

    await pool.query("BEGIN");

    await pool.query(`DELETE FROM public.adresses WHERE id = $1`, [adresseId]);

    // Si c'était la par défaut, promouvoir la suivante automatiquement
    if (wasDefault) {
      await pool.query(
        `UPDATE public.adresses
         SET par_defaut = true
         WHERE id = (
           SELECT id FROM public.adresses
           WHERE utilisateur_id = $1
           ORDER BY id ASC
           LIMIT 1
         )`,
        [userId]
      );
    }

    await pool.query("COMMIT");

    res.status(204).send();
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("[deleteAdresse]", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
}
