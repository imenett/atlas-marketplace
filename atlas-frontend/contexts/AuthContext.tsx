"use client";

/**
 * @file contexts/AuthContext.tsx
 * @description Contexte React d'authentification global.
 * Synchronise l'état de session BetterAuth avec les composants React.
 * Normalise le rôle "SELLER" → "VENDEUR" pour la cohérence avec le backend.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useSession, signOut } from "@/lib/auth-client";

/** Données utilisateur exposées par le contexte */
interface User {
  id: string;
  name: string;
  email: string;
  /** Rôle normalisé : "CLIENT" | "VENDEUR" */
  role: string;
  image?: string | null;
  /** URL de la photo de profil (champ custom BetterAuth) */
  url_avatar?: string | null;
  [key: string]: unknown;
}

/** Valeur exposée par AuthContext */
interface AuthContextType {
  /** Utilisateur connecté, ou null si non authentifié */
  user: User | null;
  /** true pendant le chargement initial de la session */
  isLoading: boolean;
  /** true si un utilisateur est connecté */
  isAuthenticated: boolean;
  /** Déconnecte l'utilisateur et redirige vers la page d'accueil */
  logout: () => Promise<void>;
  /**
   * Met à jour immédiatement url_avatar dans le contexte sans attendre
   * un rechargement de la session BetterAuth (utilisé après upload d'avatar).
   */
  updateAvatarUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  updateAvatarUrl: () => {},
});

/**
 * Fournisseur du contexte d'authentification.
 * Lit la session BetterAuth via `useSession` et la transforme en `User`.
 * À placer au niveau de la racine de l'application (dans `providers.tsx`).
 * @param {{ children: ReactNode }} props
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  // Override local de l'avatar : mis à jour immédiatement après upload
  // sans attendre le rechargement de la session BetterAuth.
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  // Quand la session démarre, fetch url_avatar directement depuis la BDD
  // car BetterAuth n'inclut pas toujours les additionalFields dans useSession().
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/profile/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.url_avatar) setAvatarOverride(data.url_avatar); })
      .catch(() => {});
  }, [session?.user?.id]);

  const sessionUser = session?.user
    ? ({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role:
          ((session.user as Record<string, unknown>).role as string) === "SELLER"
            ? "VENDEUR"
            : ((session.user as Record<string, unknown>).role as string) || "CLIENT",
        image: session.user.image,
        url_avatar: (session.user as Record<string, unknown>).url_avatar as string | null | undefined,
      } as User)
    : null;

  // Applique l'override local si présent, sinon la valeur de session
  const user = sessionUser
    ? { ...sessionUser, url_avatar: avatarOverride ?? sessionUser.url_avatar }
    : null;

  const logout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isPending,
        isAuthenticated: !!user,
        logout,
        updateAvatarUrl: setAvatarOverride,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook pour accéder au contexte d'authentification dans n'importe quel composant client.
 * @returns {AuthContextType} Utilisateur, état de chargement, et fonction de déconnexion
 * @throws {Error} Si utilisé en dehors d'un AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
