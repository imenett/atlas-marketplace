"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

// Pages publiques accessibles à tout le monde, y compris les vendeurs
const VENDOR_ALLOWED_PATHS = ["/about", "/contact", "/legal", "/privacy", "/terms"];

/**
 * Layout de restriction pour le groupe de routes publiques.
 * Bloque les vendeurs sur les pages réservées aux acheteurs (catalogue, produits, vendeurs)
 * et affiche une page d'accès refusé avec un bouton vers leur dashboard.
 * Les pages informationnelles restent accessibles à tous.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5c59f2]" />
      </div>
    );
  }

  const isAllowed = VENDOR_ALLOWED_PATHS.some((p) => pathname.startsWith(p));

  if (user?.role === "VENDEUR" && !isAllowed) {
    return (
      <div className="min-h-[70vh] bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <LayoutDashboard className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B3E] mb-3">Espace non accessible</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            En tant que vendeur, vous n&apos;avez pas accès aux pages de shopping. Votre espace est le tableau de bord vendeur.
          </p>
          <Link href="/dashboard">
            <button className="w-full bg-[#5c59f2] hover:bg-[#4a47d1] text-white py-3.5 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <LayoutDashboard className="w-4 h-4" />
              Retourner au Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
