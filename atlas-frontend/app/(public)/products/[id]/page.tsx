/**
 * @file page.tsx
 * @description Page publique de détail d'un produit.
 * Accessible à tous les visiteurs sans authentification.
 * Charge le produit depuis GET /api/products/:id (route publique).
 * Affiche les images, le prix, le vendeur, les avis et la description.
 * Permet de sélectionner une variante, une quantité et d'ajouter au panier.
 * Les vendeurs voient les attributs en lecture seule mais pas le panier ni le formulaire d'avis.
 * Le client peut créer, modifier (via bouton texte) et supprimer son avis.
 * le client peut ajouter un commentaire
 */
"use client";
import { useState, useEffect, use } from "react";
import { Star, ShoppingCart, Minus, Plus, Store, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useCart } from "@/contexts/CartContext";
// TYPES --------------------------------

type Variante = {
  id: number;
  sku: string;
  attributs: Record<string, string>;
  prix_supplementaire: number;
  stock: number;
};

type ProduitDetail = {
  id: number;
  boutique_id: number;
  categorie_id: number;
  nom: string;
  description: string;
  prix: number | string;
  prix_compare?: number | string | null;
  images: string[];
  actif: boolean;
  boutique_nom: string;
  boutique_url_logo?: string | null;
  categorie_nom: string;
  avis_count: number;
  note_moyenne: number;
  variantes: Variante[];
};

type Avis = {
  id: number;
  note: number;
  commentaire: string;
  cree_le: string;
  auteur: string;
  utilisateur_id: string;
};

// COMPOSANT PRINCIPAL ---------------------------

export default function FicheProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // États produit 
  const [produit, setProduit] = useState<ProduitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageActive, setImageActive] = useState(0);
  const [quantite, setQuantite] = useState(1);
  const [tabActive, setTabActive] = useState<"description" | "avis">("description");

  // États variante et attributs sélectionnés 
  const [varianteSelectionnee, setVarianteSelectionnee] = useState<Variante | null>(null);
  const [attributsSelectionnes, setAttributsSelectionnes] = useState<Record<string, string>>({});

  // États panier 
  const [cartSuccess, setCartSuccess] = useState(false);
  const [cartError, setCartError] = useState("");

  // États utilisateur connecté 
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // États avis 
  const [avis, setAvis] = useState<Avis[]>([]);
  const [noteForm, setNoteForm] = useState(5);
  const [commentaireForm, setCommentaireForm] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { openLogin } = useAuthModal();
  const { refreshCart } = useCart();
  // État mode modification 
  const [modeModification, setModeModification] = useState(false);

  // CHARGEMENT DES DONNÉES AU MONTAGE ---------------------------

  useEffect(() => {
    async function fetchProduit() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        setProduit(data);
        if (data.variantes && data.variantes.length > 0) {
          const premiereDisponible = data.variantes.find((v: Variante) => v.stock > 0);
          const initVariante = premiereDisponible ?? data.variantes[0];
          setVarianteSelectionnee(initVariante);
          setAttributsSelectionnes(initVariante.attributs || {});
        }
      } catch (err) {
        console.error("Erreur chargement produit", err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchAvis() {
      try {
        const res = await fetch(`/api/reviews/product/${id}`);
        const data = await res.json();
        setAvis(Array.isArray(data) ? data : []);
      } catch {
        setAvis([]);
      }
    }

    async function fetchMe() {
      try {
        const res = await fetch(`/api/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user) {
          setUserRole(data.user.role);
          setUserId(data.user.id);
        }
      } catch {
        // Non connecté
      }
    }

    fetchProduit();
    fetchAvis();
    fetchMe();
  }, [id]);

  // Pré-remplir le formulaire si le client a déjà un avis
  useEffect(() => {
    if (userId && avis.length > 0) {
      const monAvis = avis.find((a) => a.utilisateur_id === userId);
      if (monAvis) {
        setNoteForm(monAvis.note);
        setCommentaireForm(monAvis.commentaire || "");
      }
    }
  }, [avis, userId]);

  // ÉTATS DE CHARGEMENT / ERREUR ---------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-gray-400">
        Chargement...
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-gray-400">
        Produit introuvable.
      </div>
    );
  }

  // HELPER : Rendu des étoiles ---------------------------

  const renderEtoiles = (note: number) => {
    const validNote = Number(note) || 0;
    return [...Array(5)].map((_, i) => {
      const pleine = i < Math.floor(validNote);
      const demie = !pleine && i < validNote;
      return (
        <span key={i} className="relative w-4 h-4 inline-block">
          <Star className="w-4 h-4 text-gray-200 fill-current absolute inset-0" />
          {(pleine || demie) && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: pleine ? "100%" : "50%" }}
            >
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
            </span>
          )}
        </span>
      );
    });
  };

  // HANDLER : Ajouter au panier ---------------------------

  async function handleAddToCart() {
    setCartError("");
    setCartSuccess(false);

    if (!varianteSelectionnee) {
      setCartError("Veuillez sélectionner une variante.");
      return;
    }
    try {
    const res = await fetch(`/api/cart/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variante_id: varianteSelectionnee.id,
          quantite: quantite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          openLogin();
        } else {
          setCartError(data.error || "Erreur lors de l'ajout au panier");
        }
      } else {
        refreshCart();
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 3000);
      }
    } catch {
      setCartError("Erreur réseau, veuillez réessayer.");
    }
  }

  // HANDLER : Créer un avis ---------------------------

  async function handleSubmitAvis() {
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/reviews/product/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteForm, commentaire: commentaireForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Erreur lors de l'envoi");
      } else {
        setSubmitSuccess(true);
        const updated = await fetch(`/api/reviews/product/${id}`);
        const updatedData = await updated.json();
        const nouvellesAvis = Array.isArray(updatedData) ? updatedData : [];
        setAvis(nouvellesAvis);
        setProduit((prev) => prev ? { ...prev, avis_count: nouvellesAvis.length } : prev);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch {
      setSubmitError("Erreur réseau, veuillez réessayer.");
    } finally {
      setSubmitLoading(false);
    }
  }

  // HANDLER : Modifier un avis ---------------------------

  async function handleModifierAvis(avisId: number) {
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/reviews/${avisId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteForm, commentaire: commentaireForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Erreur lors de la modification");
      } else {
        setSubmitSuccess(true);
        const updated = await fetch(`/api/reviews/product/${id}`);
        const updatedData = await updated.json();
        const nouvellesAvis = Array.isArray(updatedData) ? updatedData : [];
        setAvis(nouvellesAvis);
        setProduit((prev) => prev ? { ...prev, avis_count: nouvellesAvis.length } : prev);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch {
      setSubmitError("Erreur réseau");
    } finally {
      setSubmitLoading(false);
    }
  }

  // HANDLER : Supprimer un avis ---------------------------

  async function handleDeleteAvis(avisId: number) {
    try {
      await fetch(`/api/reviews/${avisId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setAvis((prev) => {
        const nouveauxAvis = prev.filter((a) => a.id !== avisId);
        setProduit((p) => p ? { ...p, avis_count: nouveauxAvis.length } : p);
        return nouveauxAvis;
      });
      setModeModification(false);
      setNoteForm(5);
      setCommentaireForm("");
    } catch {
      console.error("Erreur suppression avis");
    }
  }

  // RENDU ---------------------------

  return (
    <main className="min-h-screen bg-[#F5F6FA]">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">

        {/* BREADCRUMB */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={userRole === "VENDEUR" ? "/products" : "/catalogue"}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {userRole === "VENDEUR" ? "Retour à mes produits" : "Retour au catalogue"}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-400 truncate">{produit.nom}</span>
        </div>

        {/* LAYOUT PRINCIPAL */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* GAUCHE : Images */}
          <div className="lg:w-[55%] flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm aspect-[4/3]">
              {produit.images && produit.images.length > 0 ? (
                <img
                  src={produit.images[imageActive]}
                  alt={produit.nom}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Aucune image disponible
                </div>
              )}
            </div>

            {produit.images && produit.images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {produit.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImageActive(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${i === imageActive
                        ? "border-indigo-500 opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80"
                      }`}
                  >
                    <img src={img} alt={`${produit.nom} ${i + 1}`} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DROITE : Infos produit */}
          <div className="lg:w-[45%] flex flex-col gap-5">

            {/* Catégorie + Nom + Note globale */}
            <div>
              <span className="text-xs font-medium text-indigo-500 uppercase tracking-wider">
                {produit.categorie_nom}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b] mt-1 leading-snug">
                {produit.nom}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {renderEtoiles(produit.note_moyenne)}
                </div>
                <span className="text-sm text-gray-500">({avis.length} avis)</span>
              </div>
            </div>

            {/* Prix */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-[#1e293b]">
                {Number(produit.prix || 0).toFixed(2)} €
              </span>
              {produit.prix_compare && (
                <span className="text-xl text-gray-400 line-through">
                  {Number(produit.prix_compare).toFixed(2)} €
                </span>
              )}
              {produit.prix_compare && (
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  -{Math.round((1 - Number(produit.prix) / Number(produit.prix_compare)) * 100)}%
                </span>
              )}
            </div>

            {/* Badge disponibilité basé sur la sélection courante */}
            <div className="flex items-center gap-2">
              {!varianteSelectionnee && Object.keys(attributsSelectionnes).length > 0 ? (
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                  Indisponible dans cette combinaison
                </span>
              ) : produit.actif && (varianteSelectionnee?.stock ?? 0) > 0 ? (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                  ✓ En stock
                </span>
              ) : (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
                  ✗ En rupture de stock
                </span>
              )}
            </div>

            {/* Carte vendeur */}
            <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {produit.boutique_url_logo ? (
                  <img src={produit.boutique_url_logo} className="w-full h-full object-cover rounded-xl" alt="logo boutique" />
                ) : (
                  <Store className="text-indigo-500 w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Vendu par</p>
                <p className="font-semibold text-[#1e293b] text-sm">{produit.boutique_nom}</p>
              </div>
            </div>

            {/* ATTRIBUTS — visibles pour TOUT LE MONDE */}
            {produit.variantes &&
              produit.variantes.length > 0 &&
              Object.keys(produit.variantes[0]?.attributs ?? {}).length > 0 && (
                <div className="space-y-3">
                  {Object.keys(produit.variantes[0]?.attributs ?? {}).map((attributKey) => {
                    const valeursUniques = [
                      ...new Set(
                        produit.variantes.map((v) => v.attributs[attributKey]).filter(Boolean)
                      ),
                    ];
                    return (
                      <div key={attributKey} className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-[#1e293b] capitalize w-16">
                          {attributKey} :
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {valeursUniques.map((valeur) => {
                            const estSelectionnee = attributsSelectionnes[attributKey] === valeur;

                            return (
                              <button
                                key={valeur}
                                disabled={userRole === "VENDEUR"}
                                onClick={() => {
                                  if (userRole !== "VENDEUR") {
                                    // Mise à jour de l'état des attributs
                                    const nouveauxAttributs = { ...attributsSelectionnes, [attributKey]: valeur };
                                    setAttributsSelectionnes(nouveauxAttributs);

                                    // Recherche de la variante exacte qui correspond aux attributs
                                    const correspondanceExacte = produit.variantes.find((v) => {
                                      return Object.keys(nouveauxAttributs).every(
                                        (k) => v.attributs[k] === nouveauxAttributs[k]
                                      );
                                    });

                                    setVarianteSelectionnee(correspondanceExacte || null);
                                    setQuantite(1);
                                    setCartError("");
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                                    userRole === "VENDEUR"
                                      ? "border-gray-200 text-gray-500 cursor-default bg-gray-50"
                                      : estSelectionnee
                                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                                        : "border-gray-200 text-gray-700 hover:border-indigo-400"
                                  }`}
                              >
                                {valeur}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {varianteSelectionnee &&
                    varianteSelectionnee.stock > 0 &&
                    varianteSelectionnee.stock <= 5 && (
                      <p className="text-xs text-orange-500 font-medium">
                        ⚠️ Plus que {varianteSelectionnee.stock} en stock !
                      </p>
                    )}
                </div>
              )}

            {/* PANIER + QUANTITÉ — masqués pour les vendeurs */}
            {userRole !== "VENDEUR" && (
              <>
                {(() => {
                  const combinaisonInexistante = !varianteSelectionnee;
                  const stockDisponible = varianteSelectionnee?.stock ?? 0;
                  const enRupture = !produit.actif || stockDisponible <= 0 || combinaisonInexistante;

                  return (
                    <>
                      {/* Affichage d'erreur si la combinaison choisie n'existe pas */}
                      {combinaisonInexistante && Object.keys(attributsSelectionnes).length > 0 && (
                        <div className="bg-red-50 border border-red-100 px-4 py-3 rounded-xl mb-2 text-center">
                          <p className="text-sm font-medium text-red-600">
                            Cette combinaison ({Object.values(attributsSelectionnes).join(" - ")}) n'est pas disponible.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-[#1e293b]">Quantité :</span>
                        <div className="flex items-center gap-3">
                          <button
                            disabled={enRupture}
                            onClick={() => { setCartError(""); setQuantite(Math.max(1, quantite - 1)); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full border transition ${enRupture
                                ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                : "border-gray-200 hover:bg-gray-100"
                              }`}
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>

                          <span className={`font-semibold w-5 text-center ${enRupture ? 'text-gray-400' : 'text-[#1e293b]'}`}>
                            {enRupture ? 0 : quantite}
                          </span>

                          <button
                            disabled={enRupture}
                            onClick={() => {
                              if (quantite >= stockDisponible) {
                                setCartError(`Stock limité à ${stockDisponible} article${stockDisponible > 1 ? "s" : ""}`);
                              } else {
                                setCartError("");
                                setQuantite(quantite + 1);
                              }
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-full border transition ${enRupture
                                ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                : "border-gray-200 hover:bg-gray-100"
                              }`}
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {cartSuccess && (
                        <div className="text-green-600 bg-green-50 rounded-xl px-4 py-2 text-sm font-medium">
                          ✓ Produit ajouté au panier !
                        </div>
                      )}
                      {cartError && <p className="text-sm text-red-500 font-medium">{cartError}</p>}

                      <Button
                        disabled={enRupture}
                        onClick={handleAddToCart}
                        className={`w-full h-12 rounded-2xl text-base font-semibold gap-3 transition-all ${enRupture
                            ? "bg-slate-200 text-slate-500 hover:bg-slate-200 cursor-not-allowed border-none"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                      >
                        <ShoppingCart className="w-5 h-5" />
                        {combinaisonInexistante ? "Combinaison introuvable" : enRupture ? "Rupture de stock" : "Ajouter au panier"}
                      </Button>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* TABS : Description / Avis */}
        <div className="mt-10">
          <div className="flex gap-2 mb-4">
            {(["description", "avis"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTabActive(tab)}
                className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all ${tabActive === tab
                    ? "bg-white border-gray-200 text-[#1e293b] shadow-sm"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
              >
                {tab === "description" ? "Description" : `Avis (${avis.length})`}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100">

            {/* TAB DESCRIPTION */}
            {tabActive === "description" ? (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#1e293b]">Description du produit</h2>
                <p className="text-gray-500 leading-relaxed">{produit.description}</p>
              </div>

            ) : (

              /* TAB AVIS */
              <div className="space-y-6">

                {/* Liste des avis */}
                {avis.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 italic">
                    Aucun avis pour ce produit pour le moment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {avis.map((a) => (
                      <div key={a.id} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                              {a.auteur.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-sm text-[#1e293b]">{a.auteur}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex">{renderEtoiles(a.note)}</div>
                            <span className="text-xs text-gray-400">
                              {new Date(a.cree_le).toLocaleDateString("fr-FR")}
                            </span>
                            {/* Boutons Modifier + Supprimer — visibles seulement pour l'auteur */}
                            {userId === a.utilisateur_id && (
                              <div className="flex items-center gap-3 ml-2">
                                <button
                                  onClick={() => {
                                    setNoteForm(a.note);
                                    setCommentaireForm(a.commentaire || "");
                                    setModeModification(true);
                                    setTabActive("avis");
                                    setTimeout(() => {
                                      document.getElementById("formulaire-avis")?.scrollIntoView({ behavior: "smooth" });
                                    }, 100);
                                  }}
                                  className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                                >
                                  Modifier
                                </button>
                                <button
                                  onClick={() => handleDeleteAvis(a.id)}
                                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                >
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {a.commentaire && (
                          <p className="text-sm text-gray-600 leading-relaxed">{a.commentaire}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* FORMULAIRE AVIS */}
                {userRole === "CLIENT" && (
                  <div className="border-t border-gray-100 pt-6" id="formulaire-avis">
                    {(() => {
                      const monAvis = avis.find((a) => a.utilisateur_id === userId);

                      // Message succès
                      if (submitSuccess) {
                        return (
                          <div className="text-green-600 bg-green-50 rounded-xl p-4 text-sm">
                            ✓ Votre avis a été {monAvis ? "mis à jour" : "publié"} avec succès !
                          </div>
                        );
                      }

                      // Formulaire de modification — ouvert seulement si le client clique "Modifier"
                      if (monAvis && modeModification) {
                        return (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-[#1e293b] mb-2">Modifier votre avis</h3>

                            {/* Sélecteur étoiles */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Votre note :</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} onClick={() => setNoteForm(star)}>
                                    <Star
                                      className={`w-6 h-6 cursor-pointer transition-colors ${star <= noteForm
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300 fill-gray-300"
                                        }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Commentaire */}
                            <textarea
                              value={commentaireForm}
                              onChange={(e) => setCommentaireForm(e.target.value)}
                              rows={4}
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                            />

                            {submitError && <p className="text-sm text-red-500">{submitError}</p>}

                            <div className="flex gap-4 items-center">
                              <Button
                                disabled={submitLoading}
                                onClick={async () => {
                                  // Ne rien faire si rien n'a changé
                                  if (
                                    noteForm === monAvis.note &&
                                    (commentaireForm || "") === (monAvis.commentaire || "")
                                  ) {
                                    setModeModification(false);
                                    return;
                                  }
                                  await handleModifierAvis(monAvis.id);
                                  setModeModification(false);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6"
                              >
                                {submitLoading ? "Envoi..." : "Enregistrer"}
                              </Button>

                              {/* Annuler — remet les valeurs originales */}
                              <button
                                onClick={() => {
                                  setModeModification(false);
                                  setNoteForm(monAvis.note);
                                  setCommentaireForm(monAvis.commentaire || "");
                                  setSubmitError("");
                                }}
                                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Formulaire de création (pas encore d'avis)
                      if (!monAvis) {
                        return (
                          <div className="space-y-4">
                            <h3 className="font-semibold text-[#1e293b] mb-2">Laissez un avis</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Votre note :</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} onClick={() => setNoteForm(star)}>
                                    <Star
                                      className={`w-6 h-6 cursor-pointer transition-colors ${star <= noteForm
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300 fill-gray-300"
                                        }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              value={commentaireForm}
                              onChange={(e) => setCommentaireForm(e.target.value)}
                              placeholder="Partagez votre expérience avec ce produit..."
                              rows={4}
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                            />
                            {submitError && <p className="text-sm text-red-500">{submitError}</p>}
                            <Button
                              disabled={submitLoading}
                              onClick={handleSubmitAvis}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6"
                            >
                              {submitLoading ? "Envoi..." : "Publier mon avis"}
                            </Button>
                          </div>
                        );
                      }

                      // Avis existant et pas en mode modification → rien à afficher
                      return null;
                    })()}
                  </div>
                )}

                {/* Message si non connecté */}
                {userRole === null && (
                  <div className="border-t border-gray-100 pt-6 text-center text-sm text-gray-500">
                    <button onClick={openLogin} className="text-indigo-600 hover:underline font-medium">
                      Connectez-vous
                    </button>{" "}
                    pour laisser un avis.
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}