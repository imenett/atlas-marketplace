"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Home } from "lucide-react";
import Link from "next/link";

/**
 * Layout de protection pour les pages réservées aux clients.
 *
 * Vérifie que l'utilisateur est authentifié avec le rôle `CLIENT`.
 * Comportement selon l'état de session :
 * - **Chargement en cours** : spinner centré.
 * - **Non connecté** : page d'accès refusé avec bouton de retour à l'accueil.
 * - **Connecté en tant que VENDEUR** : page d'accès refusé avec bouton vers `/dashboard`.
 * - **Connecté en tant que CLIENT** : rendu normal de `children`.
 *
 * @param children - La page client à protéger (panier, commandes, profil, checkout).
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Pendant la vérification de la session, on affiche un loader minimaliste
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5c59f2]" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté ou n'est pas client, on affiche la page d'accès refusé
  if (!isAuthenticated || user?.role !== "CLIENT") {
    const isVendor = user?.role === "VENDEUR";
    const redirectUrl = isVendor ? "/dashboard" : "/";
    const buttonText = isVendor ? "Retour au Dashboard" : "Retourner à l'accueil";

    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] mb-3">Accès Client Requis</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Cette page est strictement réservée aux clients. En tant que vendeur (ou visiteur non connecté), vous n'avez pas accès à ces fonctionnalités (panier, commandes, etc.).
          </p>
          <Link href={redirectUrl}>
            <button className="w-full bg-[#5c59f2] hover:bg-[#4a47d1] text-white py-3.5 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <Home className="w-4 h-4" />
              {buttonText}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // L'utilisateur est autorisé, on rend le contenu de la page (panier, checkout, commandes client)
  return <>{children}</>;
}
