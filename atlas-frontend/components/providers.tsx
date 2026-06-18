"use client";

/**
 * @file components/providers.tsx
 * @description Wrapper regroupant tous les providers de contexte de l'application.
 * À utiliser dans `app/layout.tsx` pour encapsuler l'arbre de composants
 * sans alourdir le fichier de layout principal.
 */
import { AuthProvider } from "@/contexts/AuthContext";

/**
 * Agrégateur de providers React (AuthProvider, CartProvider, AuthModalProvider…).
 * @param {{ children: React.ReactNode }} props
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}