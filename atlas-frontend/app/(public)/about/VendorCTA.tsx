"use client";

import { useState } from "react";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, X } from "lucide-react";

/**
 * Bouton d'appel à l'action "Ouvrir ma boutique" affiché sur la page À propos.
 *
 * Adapte son comportement selon l'état de l'utilisateur :
 * - **Non connecté** : ouvre la modale d'inscription en mode "seller".
 * - **Connecté en tant que VENDEUR** : redirige vers `/dashboard`.
 * - **Connecté en tant que CLIENT** : affiche une modale demandant à l'utilisateur
 *   de se déconnecter d'abord (un client ne peut pas devenir vendeur sans se déconnecter).
 *
 * @returns Le bouton CTA avec sa modale de déconnexion conditionnelle.
 */
export function VendorCTA() {
  const { openRegister } = useAuthModal();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleOpenShopClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user?.role === "VENDEUR") {
      router.push("/dashboard");
    } else if (isAuthenticated && user?.role === "CLIENT") {
      setShowLogoutModal(true);
    } else if (!isAuthenticated) {
      openRegister("seller");
    }
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await logout();
    // Le contexte Auth gère la redirection et la purge de session.
    // L'utilisateur devra cliquer de lui-même pour s'inscrire après la déconnexion.
  };

  return (
    <>
      <button
        onClick={handleOpenShopClick}
        className="inline-flex items-center gap-2 bg-white text-[#1C3461] hover:bg-white/90 font-semibold px-7 py-3 rounded-xl transition-colors text-sm shadow-lg cursor-pointer"
      >
        Ouvrir ma boutique
        <ArrowRight className="h-4 w-4" />
      </button>

      {/* Custom Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          
          {/* Modal Panel */}
          <div 
            className="relative bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mt-2 mb-6">
              <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <LogOut className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1C3461] mb-2">
                Déconnexion requise
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Vous êtes actuellement connecté en tant que client. Pour vous inscrire en tant que vendeur, vous devez d'abord vous déconnecter de ce compte.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogoutConfirm}
                className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer text-sm"
              >
                Se déconnecter
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-2.5 bg-transparent text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
