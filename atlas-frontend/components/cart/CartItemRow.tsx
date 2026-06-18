"use client";
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { updateCartQuantity, removeFromCart } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

/**
 * Modale de confirmation avant suppression d'un article du panier.
 *
 * @param productName - Nom du produit à supprimer, affiché dans le message.
 * @param onConfirm - Callback appelé quand l'utilisateur confirme la suppression.
 * @param onCancel - Callback appelé quand l'utilisateur annule.
 */
function DeleteModal({
  productName,
  onConfirm,
  onCancel,
}: {
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h3 className="text-base font-bold text-slate-900 text-center mb-1">
          Supprimer cet article ?
        </h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          <span className="font-semibold text-slate-700">{productName}</span> sera retiré de votre panier.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ligne d'article dans la page panier.
 *
 * Affiche l'image, le nom, les attributs de variante (couleur, taille…), le prix unitaire
 * et le total. Permet d'ajuster la quantité (avec validation de stock) et de supprimer l'article.
 *
 * La mise à jour de quantité est optimiste : l'UI est mise à jour immédiatement,
 * et annulée si l'API retourne une erreur (ex: stock insuffisant).
 *
 * @param item - Article du panier (données brutes de l'API).
 * @param onCartUpdate - Callback optionnel appelé après toute modification réussie.
 */
export function CartItemRow({ item, onCartUpdate }: { item: any; onCartUpdate?: () => void }) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [optimisticQty, setOptimisticQty] = useState<number>(item.quantite);
  const [isDeleting, setIsDeleting] = useState(false);
  const { refreshCart } = useCart();

  const handleQuantity = async (newQty: number) => {
    if (newQty < 1) {
      setShowDeleteModal(true);
      return;
    }
    
    setStockError(null);
    const previousQty = optimisticQty;
    setOptimisticQty(newQty);

    try {
      await updateCartQuantity(item.id, newQty);
      onCartUpdate?.();
      refreshCart();
      router.refresh();
    } catch (err: any) {
      setOptimisticQty(previousQty);
      setStockError(err.message || "Stock insuffisant");
    }
  };

  const handleRemove = async () => {
    // Optimistic Update: Hide the UI element immediately
    setIsDeleting(true);
    setShowDeleteModal(false);

    try {
      await removeFromCart(item.id);
      onCartUpdate?.();
      refreshCart();
      router.refresh();
    } catch (err) {
      // Rollback if the API fails
      setIsDeleting(false);
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression. Veuillez réessayer.");
    }
  };

  // If the item is marked as deleting, don't render it
  if (isDeleting) return null;

  const attributs: Record<string, string> = item.variante_attributs || item.attributs || {};
  const attributsEntries = Object.entries(attributs);

  return (
    <>
      <div className="py-4 flex gap-3 sm:gap-5 items-start border-b last:border-0">
        <img
          src={item.images?.[0] ?? "/placeholder.png"}
          alt={item.produit_nom}
          className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg object-cover border"
        />

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <Link href={`/products/${item.produit_id}`}>
              <h3 className="font-bold text-sm sm:text-base truncate hover:text-indigo-600 transition-colors cursor-pointer">
                {item.produit_nom}
              </h3>
            </Link>
            <span className="text-sm sm:text-lg font-black whitespace-nowrap flex-shrink-0">
              {(item.prix_unitaire * optimisticQty).toFixed(2)} €
            </span>
          </div>

          <p className="text-indigo-600 font-bold text-sm mt-0.5">{item.prix_unitaire} €</p>

          {attributsEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {attributsEntries.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
                >
                  <span className="text-slate-400 capitalize">{key} :</span>
                  <span className="font-semibold">{value}</span>
                </span>
              ))}
            </div>
          )}

          {stockError && (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <X size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-medium text-red-600">{stockError}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 sm:mt-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuantity(optimisticQty - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer text-base font-medium"
              >
                −
              </button>
              <span className="w-5 text-center font-bold text-sm">
                {optimisticQty}
              </span>
              <button
                onClick={() => handleQuantity(optimisticQty + 1)}
                disabled={!!stockError}
                className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors text-base font-medium ${
                  stockError
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                }`}
              >
                +
              </button>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-500 flex items-center gap-1 text-xs font-bold cursor-pointer hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteModal
          productName={item.produit_nom}
          onConfirm={handleRemove}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}