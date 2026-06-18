"use client";

import { useState } from "react";
import { ShoppingCart, Star, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

// TYPES --------------------------------------

/**
 * Structure d'un produit affiché dans la carte catalogue.
 * Exportée pour être réutilisée par les pages qui gèrent la liste de produits.
 */
export interface Product {
  id: number;
  variantes?: Array<{ id: number; sku: string; stock: number }>;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  badge?: string;
  actif?: boolean;
}

// COMPOSANT ÉTOILES --------------------------

/**
 * Affiche 5 étoiles colorées selon la note (arrondie à l'entier inférieur).
 *
 * @param rating - Note entre 0 et 5.
 */
function StarRating({ rating }: { rating: number }) {
  const validRating = Number(rating) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const i = star - 1;
        const pleine = i < Math.floor(validRating);
        const demie = !pleine && i < validRating;
        return (
          <span key={star} className="relative inline-block w-3.5 h-3.5">
            <Star className="w-3.5 h-3.5 absolute inset-0" fill="#D1D5DB" stroke="#D1D5DB" />
            {(pleine || demie) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: pleine ? "100%" : "50%" }}
              >
                <Star className="w-3.5 h-3.5" fill="#F59E0B" stroke="#F59E0B" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// COMPOSANT CARTE PRODUIT ---------------------

/** Props du composant `ProductCard`. */
interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

/**
 * Carte produit utilisée dans le catalogue et sur la page d'accueil.
 *
 * Affiche l'image, le nom, la boutique vendeur (cliquable), la note, le prix
 * et un bouton d'ajout au panier. Le clic sur la carte navigue vers la fiche produit.
 *
 * Le bouton panier gère 4 états visuels : `idle` → `loading` → `added` / `error`.
 * Si l'utilisateur n'est pas connecté (401), redirige vers `/login`.
 *
 * @param product - Données du produit à afficher.
 * @param onAddToCart - Callback optionnel appelé après un ajout réussi au panier.
 */
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { refreshCart } = useCart();
  const { openLogin } = useAuthModal();

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === "loading" || status === "added") return;

    // Multiple variants → redirect to product page so the user makes an explicit choice
    if (product.variantes && product.variantes.length > 1) {
      router.push(`/products/${product.id}`);
      return;
    }

    const targetVarianteId =
      product.variantes && product.variantes.length === 1
        ? product.variantes[0].id
        : null;

    if (!targetVarianteId) {
      setErrorMessage("Aucune variante disponible");
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 3000);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/cart/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            variante_id: targetVarianteId,
            quantite: 1,
          }),
        }
      );

      if (res.ok) {
        setStatus("added");
        refreshCart();
        onAddToCart?.(product);
        setTimeout(() => setStatus("idle"), 1500);
      } else if (res.status === 401) {
        setStatus("idle");
        openLogin();
      } else if (res.status === 400) {
        const data = await res.json();
        setErrorMessage(data.error || "Stock insuffisant");
        setStatus("error");
        setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 3000);
      } else {
        setErrorMessage("Erreur lors de l'ajout");
        setStatus("error");
        setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 3000);
      }
    } catch (err) {
      setErrorMessage("Erreur réseau");
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 3000);
    }
  };

  const buttonClass = {
    idle: "bg-indigo-600 hover:bg-indigo-700 active:scale-95",
    loading: "bg-indigo-400 cursor-not-allowed",
    added: "bg-green-500 scale-90",
    error: "bg-red-500",
  }[status];

  return (
    <div
      onClick={() => router.push(`/products/${product.id}`)}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col relative cursor-pointer"
    >
      {/* Image du produit */}
      <div className="relative overflow-hidden bg-slate-50 aspect-[4/3]">
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-600 text-white">
            {product.badge}
          </span>
        )}
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Contenu de la carte */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-indigo-500 mt-0.5 font-medium">
            Vendu par{" "}
            <span
              className="hover:underline cursor-pointer relative z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/catalogue?q=${encodeURIComponent(product.brand)}&recherche_type=boutique`);
              }}
            >
              {product.brand}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <StarRating rating={product.rating} />
          <span className="text-xs text-slate-400">({product.reviewCount})</span>
        </div>

        {/* Prix + bouton panier */}
        <div className="flex items-center justify-between mt-auto pt-2 relative">
          <span className="text-xl font-bold text-slate-800">
            {product.price.toFixed(2)} €
          </span>

          {/* Message d'erreur */}
          {errorMessage && (
            <div className="absolute bottom-12 right-0 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-20 animate-in fade-in zoom-in duration-200">
              {errorMessage}
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-red-500 rotate-45" />
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={status === "loading" || product.actif === false}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer ${
              product.actif === false ? "bg-slate-200 cursor-not-allowed" : buttonClass
            }`}
          >
            {product.actif === false ? (
              <ShoppingCart className="h-4 w-4 text-slate-400" />
            ) : status === "added" ? (
              <Check className="h-4 w-4 text-white" />
            ) : status === "loading" ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}