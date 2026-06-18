/**
 * @file page.tsx
 * @description Page "Mes Produits" du dashboard vendeur. 
 * Filtrage par statut (Actif/Inactif) avec les labels originaux.
 */
"use client";
import { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Package as PackageIcon, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalAddProduct } from "./ModalAddProduct";
import { SellerSidebar } from "@/app/(vendor)/dashboard/SellerSidebar";
import Link from "next/link";

// TYPES
export type Variante = {
  id?: number;
  produit_id?: number;
  sku: string;
  attributs: Record<string, string>;
  stock: number;
  prix_supplementaire: number;
  seuil_stock_faible: number;
};

export type Produit = {
  id: number;
  boutique_id: number;
  categorie_id: number;
  nom: string;
  description: string;
  prix: number;
  prix_compare?: number;
  images: string[];
  actif: boolean;
  variantes: Variante[];
  boutique_nom: string;
  categorie_nom: string;
};

// ─── Modale de confirmation de suppression ────────────────────────────────────

function DeleteConfirmModal({
  produit,
  onClose,
  onConfirm,
  isLoading,
}: {
  produit: Produit;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={{ animation: "modalIn 0.2s ease-out" }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-rose-500" />

        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1e293b]">
                Désactiver ce produit ?
              </h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                <span className="font-medium text-gray-700">« {produit.nom} »</span> sera
                masqué du catalogue et son stock sera remis à zéro. L&apos;historique des
                commandes associées est conservé.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 mb-5 border border-gray-100">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
              {produit.images?.[0] ? (
                <img
                  src={produit.images[0]}
                  alt={produit.nom}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PackageIcon className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{produit.nom}</p>
              <p className="text-xs text-gray-400">#{produit.id} · {Number(produit.prix).toFixed(2)} €</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-sm shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Désactivation...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Désactiver
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MesProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("Toutes les catégories");
  const [statutFiltre, setStatutFiltre] = useState<"tous" | "actif" | "inactif">("tous");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [produitAModifier, setProduitAModifier] = useState<Produit | null>(null);

  const [produitASupprimer, setProduitASupprimer] = useState<Produit | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const chargerProduits = () => {
    fetch('/api/vendor/products', { credentials: "include" })  // ← URL relative via proxy Vercel
      .then((res) => res.json())
      .then((data) => setProduits(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erreur chargement produits:", err));
  };

  useEffect(() => {
    chargerProduits();
    fetch('/api/categories', { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.map((c: { nom: string }) => c.nom));
        }
      })
      .catch(() => {});
  }, []);

  const handleSupprimer = (produit: Produit) => {
    setProduitASupprimer(produit);
  };

  const confirmerSuppression = async () => {
    if (!produitASupprimer) return;
    setSuppressionEnCours(true);
    try {
      await fetch(`/api/vendor/products/${produitASupprimer.id}`, {  // ← URL relative via proxy Vercel
        method: "DELETE",
        credentials: "include",
      });
      setProduits((prev) => prev.filter((p) => p.id !== produitASupprimer.id));
    } finally {
      setSuppressionEnCours(false);
      setProduitASupprimer(null);
    }
  };

  const handleModifier = (produit: Produit) => {
    setProduitAModifier(produit);
    setIsModalOpen(true);
  };

  const handleAjouterClick = () => {
    setProduitAModifier(null);
    setIsModalOpen(true);
  };

  const produitsFiltres = produits.filter((p) => {
    const matchRecherche = p.nom.toLowerCase().includes(recherche.toLowerCase());
    const matchCategorie =
      filtreCategorie === "Toutes les catégories" || p.categorie_nom === filtreCategorie;
    const matchStatut = 
      statutFiltre === "tous" ? true :
      statutFiltre === "actif" ? p.actif === true :
      p.actif === false;

    return matchRecherche && matchCategorie && matchStatut;
  });

  const boutiqueNom = produits.length > 0 ? produits[0].boutique_nom : "Ma Boutique";

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <SellerSidebar sellerName={boutiqueNom} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 md:pt-6 min-w-0">
        <div className="mb-4">
          <p className="text-sm text-gray-400">
            Accueil / Dashboard /{" "}
            <span className="text-gray-600 font-medium">Mes Produits</span>
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b]">Mes Produits</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {produits.length} produits au total dans votre catalogue
            </p>
          </div>
          <Button
            onClick={handleAjouterClick}
            className="bg-[#5c59f2] hover:bg-[#4a47d1] text-white rounded-xl px-6 py-6 flex gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 w-full sm:w-auto justify-center text-sm font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un produit</span>
          </Button>
        </div>

        {/* Barre de Filtres */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border-none bg-gray-50 outline-none focus:ring-2 focus:ring-[#5c59f2]/10 text-sm transition-all"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="w-full sm:w-48 appearance-none bg-gray-50 border-none px-4 py-2.5 rounded-xl outline-none cursor-pointer pr-10 text-sm font-medium text-gray-700"
                value={filtreCategorie}
                onChange={(e) => setFiltreCategorie(e.target.value)}
              >
                <option>Toutes les catégories</option>
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Toggle de Statut Segmenté */}
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-start sm:self-center">
            {(["tous", "actif", "inactif"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatutFiltre(s)}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all ${
                  statutFiltre === s 
                    ? "bg-white text-[#5c59f2] shadow-sm ring-1 ring-black/5" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {s === "actif" ? "Actif" : s === "inactif" ? "Inactif" : "Tous"}
              </button>
            ))}
          </div>
        </div>

        {/* Table Desktop */}
        <div className="hidden md:block bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/30">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Produit</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Catégorie</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Prix</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Statut</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {produitsFiltres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <PackageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium text-sm">Aucun produit trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                produitsFiltres.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm">
                          {p.images?.length > 0 ? (
                            <img src={p.images[0]} alt="" className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <PackageIcon className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-sm leading-tight truncate">{p.nom}</div>
                          <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">#{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wide">
                        {p.categorie_nom}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                      {Number(p.prix).toFixed(2)} €
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                        p.actif 
                          ? "bg-green-50 border-green-100 text-green-700" 
                          : "bg-gray-50 border-gray-200 text-gray-500"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${p.actif ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {p.actif ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleModifier(p)} className="p-2 text-gray-400 hover:text-[#5c59f2] hover:bg-indigo-50 rounded-xl transition-all">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleSupprimer(p)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Vue Mobile */}
        <div className="md:hidden space-y-3">
          {produitsFiltres.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
                <img src={p.images?.[0] || "/placeholder.png"} alt="" className="object-cover w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm truncate">{p.nom}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-[#5c59f2] text-xs">{Number(p.prix).toFixed(2)} €</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${p.actif ? "bg-green-50 border-green-100 text-green-600" : "bg-gray-50 text-gray-400"}`}>
                    {p.actif ? "ACTIF" : "INACTIF"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleModifier(p)} className="p-2 text-blue-500 bg-blue-50 rounded-xl"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleSupprimer(p)} className="p-2 text-red-500 bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {produitASupprimer && (
        <DeleteConfirmModal
          produit={produitASupprimer}
          onClose={() => setProduitASupprimer(null)}
          onConfirm={confirmerSuppression}
          isLoading={suppressionEnCours}
        />
      )}

      <ModalAddProduct
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProduitAModifier(null);
        }}
        onSuccess={chargerProduits}
        produitInitial={produitAModifier}
      />
    </div>
  );
}