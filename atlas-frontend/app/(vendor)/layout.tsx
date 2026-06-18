"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Home, Store, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Layout de protection pour les pages réservées aux vendeurs.
 *
 * Vérifie que l'utilisateur est authentifié avec le rôle `VENDEUR`.
 * Vérifie également que la boutique du vendeur est active.
 * Comportement selon l'état de session :
 * - **Chargement en cours** : spinner centré.
 * - **Non authentifié ou rôle incorrect** : page "Accès Refusé" avec bouton vers l'accueil.
 * - **Boutique EN_ATTENTE et page autre que /shop** : écran bloquant invitant à compléter le profil.
 * - **Connecté en tant que VENDEUR avec boutique active** : rendu normal de `children`.
 *
 * @param children - La page vendeur à protéger.
 */
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const [shopLoading, setShopLoading] = useState(true);

  // Fetch shop status once the user is authenticated as VENDEUR
  // Re-fetch on navigation (pathname change) to get the latest status if updated
  useEffect(() => {
    if (isLoading || !isAuthenticated || user?.role !== "VENDEUR") {
      setShopLoading(false);
      return;
    }

    fetch(`/api/vendor/shop/me?t=${Date.now()}`, { 
      credentials: "include",
      cache: "no-store" 
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Shop not found");
      })
      .then((data) => {
        setShopStatus(data.status || "EN_ATTENTE");
      })
      .catch(() => {
        setShopStatus("EN_ATTENTE");
      })
      .finally(() => setShopLoading(false));
  }, [isLoading, isAuthenticated, user?.role, pathname]);
  
  // Pendant la vérification de la session, on affiche un loader minimaliste
  if (isLoading || shopLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5c59f2]" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "VENDEUR") {

    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] mb-3">Accès Refusé</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Cette page est un espace sécurisé strictement réservé aux vendeurs. Si vous possédez une boutique sur Atlas, veuillez vous connecter avec le bon compte.
          </p>
          <Link href="/">
            <button className="w-full bg-[#5c59f2] hover:bg-[#4a47d1] text-white py-3.5 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <Home className="w-4 h-4" />
              Retourner à l'accueil
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Block vendor from dashboard/products when shop is EN_ATTENTE
  // Allow access to /shop so they can fill in their info
  const isShopPage = pathname === "/shop";
  if (shopStatus === "EN_ATTENTE" && !isShopPage) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 max-w-lg w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Store className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] mb-3">Boutique incomplète</h1>
          <p className="text-gray-500 mb-4 text-sm leading-relaxed">
            Votre boutique est actuellement <span className="font-semibold text-amber-600">en attente d'activation</span>.
            Vous devez compléter toutes les informations de votre boutique avant de pouvoir gérer vos produits et votre stock.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-800 mb-2">Informations requises :</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Nom de la boutique</li>
              <li>• Description</li>
              <li>• IBAN pour les paiements</li>
              <li>• Logo de la boutique</li>
              <li>• Image de couverture</li>
            </ul>
          </div>
          <Link href="/shop">
            <button className="w-full bg-[#5c59f2] hover:bg-[#4a47d1] text-white py-3.5 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <ArrowRight className="w-4 h-4" />
              Compléter ma boutique
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // L'utilisateur est autorisé, on rend le contenu de la page (dashboard, products, shop...)
  return <>{children}</>;
}
