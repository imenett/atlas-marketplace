/**
 * @file lib/supabase.ts
 * @description Client Supabase avec clé service_role pour les opérations serveur.
 * Utilisé pour l'upload/suppression de fichiers dans le bucket "atlas-media".
 *
 * Variables d'environnement requises :
 * - `SUPABASE_URL`               : URL du projet Supabase
 * - `SUPABASE_SERVICE_ROLE_KEY`  : clé service_role (accès total, ne jamais exposer côté client)
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Client Supabase admin — bypass les règles RLS.
 * À utiliser uniquement côté serveur pour les uploads d'images (logos, covers, produits).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
