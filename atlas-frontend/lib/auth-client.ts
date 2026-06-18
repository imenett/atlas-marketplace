/**
 * @file lib/auth-client.ts
 * @description Initialisation et export du client BetterAuth côté navigateur.
 * Les cookies de session sont envoyés automatiquement via `credentials: 'include'`.
 *
 * Variable d'environnement requise :
 * - `NEXT_PUBLIC_API_URL` : URL du backend Express (ex: http://localhost:3005)
 *
 * Exports :
 * - `authClient` : instance complète du client BetterAuth
 * - `signIn`     : connexion par email/mot de passe
 * - `signUp`     : inscription avec champs additionnels (role, etc.)
 * - `signOut`    : déconnexion (supprime le cookie de session)
 * - `useSession` : hook React retournant `{ data: session, isPending, error }`
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
baseURL: typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL,
  fetchOptions: {
    credentials: "include",
  }
});

export const { signIn, signUp, signOut, useSession } = authClient;
