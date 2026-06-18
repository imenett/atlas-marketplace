/**
 * @file ModalAddProduct.tsx
 * - SKU supprimé (généré automatiquement côté backend)
 * - Attributs saisis en paires clé/valeur
 * - Import CSV possible pour les attributs
 * - Si aucune variante n'est créée manuellement, une variante "Par défaut" est
 *   automatiquement ajoutée au submit (stock = 0, seuil = 5)
 */
"use client";

import { X, Plus, Trash2, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Produit, Variante } from "./page";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  produitInitial?: Produit | null;
}

type Categorie = {
  id: number;
  nom: string;
};

type AttributPaire = {
  cle: string;
  valeur: string;
};

type FormVariante = {
  id?: number;
  attributs: AttributPaire[];
  prix_supplementaire: string;
  stock: string;
  seuil_stock_faible: string;
  supprimee?: boolean;
};

type FormData = {
  nom: string;
  description: string;
  prix: string;
  prix_compare: string;
  categorie_id: string;
  images: string[];
  actif: boolean;
  variantes: FormVariante[];
};

const ATTRIBUT_VIDE: AttributPaire = { cle: "", valeur: "" };

const VARIANTE_VIDE: FormVariante = {
  attributs: [{ ...ATTRIBUT_VIDE }],
  prix_supplementaire: "0.00",
  stock: "",
  seuil_stock_faible: "5",
};

const FORM_VIDE: FormData = {
  nom: "",
  description: "",
  prix: "",
  prix_compare: "",
  categorie_id: "",
  images: [],
  actif: true,
  variantes: [{ ...VARIANTE_VIDE, attributs: [{ ...ATTRIBUT_VIDE }] }],
};

function toFormVariantes(variantes: Variante[]): FormVariante[] {
  if (!variantes || variantes.length === 0) return [{ ...VARIANTE_VIDE }];
  return variantes.map((v) => ({
    id: v.id,
    attributs: Object.entries(v.attributs || {}).map(([cle, valeur]) => ({
      cle,
      valeur: String(valeur),
    })),
    prix_supplementaire: String(v.prix_supplementaire),
    stock: String(v.stock),
    seuil_stock_faible: String(v.seuil_stock_faible),
  }));
}

function pairesToObjet(paires: AttributPaire[]): Record<string, string> {
  const obj: Record<string, string> = {};
  paires.forEach(({ cle, valeur }) => {
    if (cle.trim() && valeur.trim()) {
      const cleNorm = cle.trim().charAt(0).toUpperCase() + cle.trim().slice(1).toLowerCase();
      const valNorm = valeur.trim().charAt(0).toUpperCase() + valeur.trim().slice(1).toLowerCase();
      obj[cleNorm] = valNorm;
    }
  });
  return obj;
}

export function ModalAddProduct({ isOpen, onClose, onSuccess, produitInitial }: ModalProps) {
  const [form, setForm] = useState<FormData>(FORM_VIDE);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erreurSauvegarde, setErreurSauvegarde] = useState<string | null>(null);
  const [erreurUpload, setErreurUpload] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedAttr, setFocusedAttr] = useState<{ v: number; a: number } | null>(null);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const csvInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLoadingCategories(true);
    fetch(`/api/categories`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erreur chargement catégories:", err))
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setErreurSauvegarde(null);
    if (produitInitial) {
      setForm({
        nom: produitInitial.nom,
        description: produitInitial.description,
        prix: String(produitInitial.prix),
        prix_compare: produitInitial.prix_compare ? String(produitInitial.prix_compare) : "",
        categorie_id: String(produitInitial.categorie_id),
        images: produitInitial.images,
        actif: produitInitial.actif,
        variantes: toFormVariantes(produitInitial.variantes),
      });
    } else {
      setForm(FORM_VIDE);
    }
  }, [produitInitial, isOpen]);

  const handleChange = (champ: keyof FormData, valeur: any) => {
    setForm((prev) => ({ ...prev, [champ]: valeur }));
  };

  const ajouterVariante = () => {
    setForm((prev) => ({
      ...prev,
      variantes: [...prev.variantes, { ...VARIANTE_VIDE, attributs: [{ ...ATTRIBUT_VIDE }] }],
    }));
  };

  const supprimerVariante = (index: number) => {
    setForm((prev) => {
      const variantes = [...prev.variantes];
      const v = variantes[index];
      if (v.id) {
        variantes[index] = { ...v, supprimee: true };
      } else {
        variantes.splice(index, 1);
      }
      return { ...prev, variantes };
    });
  };

  const handleVarianteChange = (
    varianteIndex: number,
    champ: keyof Omit<FormVariante, "attributs">,
    valeur: string
  ) => {
    setForm((prev) => {
      const variantes = [...prev.variantes];
      variantes[varianteIndex] = { ...variantes[varianteIndex], [champ]: valeur };
      return { ...prev, variantes };
    });
  };

  const ajouterAttribut = (varianteIndex: number) => {
    setForm((prev) => {
      const variantes = [...prev.variantes];
      variantes[varianteIndex] = {
        ...variantes[varianteIndex],
        attributs: [...variantes[varianteIndex].attributs, { ...ATTRIBUT_VIDE }],
      };
      return { ...prev, variantes };
    });
  };

  const supprimerAttribut = (varianteIndex: number, attributIndex: number) => {
    setForm((prev) => {
      const variantes = [...prev.variantes];
      variantes[varianteIndex] = {
        ...variantes[varianteIndex],
        attributs: variantes[varianteIndex].attributs.filter((_, i) => i !== attributIndex),
      };
      return { ...prev, variantes };
    });
  };

  const handleAttributChange = (
    varianteIndex: number,
    attributIndex: number,
    champ: "cle" | "valeur",
    valeur: string
  ) => {
    setForm((prev) => {
      const variantes = [...prev.variantes];
      const attributs = [...variantes[varianteIndex].attributs];
      attributs[attributIndex] = { ...attributs[attributIndex], [champ]: valeur };
      variantes[varianteIndex] = { ...variantes[varianteIndex], attributs };
      return { ...prev, variantes };
    });
  };

  const handleImportCSV = (varianteIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lignes = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const paires: AttributPaire[] = lignes
        .map((ligne) => {
          const parts = ligne.split(",");
          return { cle: parts[0]?.trim() ?? "", valeur: parts.slice(1).join(",").trim() };
        })
        .filter((p) => p.cle && p.valeur);
      if (paires.length === 0) return;
      setForm((prev) => {
        const variantes = [...prev.variantes];
        const existants = variantes[varianteIndex].attributs.filter((a) => a.cle.trim() && a.valeur.trim());
        variantes[varianteIndex] = { ...variantes[varianteIndex], attributs: [...existants, ...paires] };
        return { ...prev, variantes };
      });
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploadEnCours(true);
    setErreurUpload(null);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { setErreurUpload(`${file.name} dépasse 5MB`); continue; }
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("boutiques-images").upload(fileName, file);
      if (error) { setErreurUpload("Erreur lors de l'upload, réessaie."); continue; }
      const { data } = supabase.storage.from("boutiques-images").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, images: [...prev.images, data.publicUrl] }));
    }
    setUploadEnCours(false);
  };

  const supprimerImage = (index: number) => {
    handleChange("images", form.images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (!form.nom.trim()) return setFormError("Le nom du produit est obligatoire.");
      if (!form.prix) return setFormError("Le prix de base est obligatoire.");
      if (!/^\d+(\.\d+)?$/.test(form.prix) || parseFloat(form.prix) <= 0) return setFormError("Le prix de base doit être un nombre valide supérieur à 0.");

      // ── Validation du prix barré ────────────────────────────────────────
      if (form.prix_compare) {
        if (!/^\d+(\.\d+)?$/.test(form.prix_compare)) {
          return setFormError("Le prix barré doit être un nombre valide.");
        }
        const prixCompare = parseFloat(form.prix_compare);
        const prixBase = parseFloat(form.prix);
        if (prixCompare <= 0) {
          return setFormError("Le prix barré doit être un nombre positif.");
        }
        if (prixCompare <= prixBase) {
          return setFormError("Le prix barré doit être supérieur au prix de base (il représente l'ancien prix avant réduction).");
        }
      }

      if (!form.categorie_id) return setFormError("Veuillez sélectionner une catégorie.");
      if (form.images.length === 0) return setFormError("Veuillez ajouter au moins une image.");

      const variantesActives = form.variantes.filter((v) => !v.supprimee);

      // ── Validation du stock obligatoire ──────────────────────────────────
      // Le stock doit être explicitement saisi pour au moins la première variante.
      // Les attributs peuvent rester vides (variante par défaut), mais le stock est requis.
      const hasAnyStockSet = variantesActives.some((v) => v.stock !== "");
      if (!hasAnyStockSet) {
        return setFormError("Le stock est obligatoire. Veuillez saisir le stock pour au moins une variante.");
      }

      // ── Construction des variantes à soumettre ───────────────────────────
      // Si aucun attribut n'est renseigné, on crée une variante par défaut
      // avec le stock saisi par le vendeur.
      const hasAttributes = variantesActives.some(
        (v) => v.attributs.some((a) => a.cle.trim() && a.valeur.trim())
      );

      const variantesToSubmit = hasAttributes
        ? variantesActives
        : [
            {
              ...variantesActives[0],
              attributs: [] as AttributPaire[],
            },
          ];

      const variantesFormatees = [];
      for (let i = 0; i < variantesToSubmit.length; i++) {
        const v = variantesToSubmit[i];
        if ((v as FormVariante).supprimee) continue;

        if (v.stock === "") {
          return setFormError(`Le stock de la variante ${i + 1} est obligatoire.`);
        }
        if (!/^\d+$/.test(v.stock)) {
          return setFormError(`Le stock de la variante ${i + 1} doit être un entier positif valide.`);
        }
        if (v.prix_supplementaire && !/^\d+(\.\d+)?$/.test(v.prix_supplementaire)) {
          return setFormError(`Le prix supplémentaire de la variante ${i + 1} doit être un nombre valide.`);
        }
        if (v.seuil_stock_faible && !/^\d+$/.test(v.seuil_stock_faible)) {
          return setFormError(`Le seuil d'alerte de la variante ${i + 1} doit être un nombre entier valide.`);
        }

        const keys = v.attributs.map((a) => a.cle.trim().toLowerCase()).filter(Boolean);
        const uniqueKeys = new Set(keys);
        if (keys.length !== uniqueKeys.size) {
          return setFormError(`La variante ${i + 1} contient des noms d'attributs en double.`);
        }

        variantesFormatees.push({
          id: (v as FormVariante).id,
          attributs: pairesToObjet(v.attributs),
          prix_supplementaire: parseFloat(v.prix_supplementaire) || 0,
          stock: parseInt(v.stock),
          seuil_stock_faible: parseInt(v.seuil_stock_faible) || 5,
        });
      }

      if (variantesFormatees.length === 0) {
        return setFormError("Vous devez avoir au moins une variante.");
      }

      const payload = {
        nom: form.nom,
        description: form.description,
        prix: parseFloat(form.prix) || 0,
        prix_compare: form.prix_compare ? parseFloat(form.prix_compare) : null,
        categorie_id: parseInt(form.categorie_id),
        images: form.images,
        actif: form.actif,
        variantes: variantesFormatees,
      };

      const response = await fetch(
        produitInitial
          ? `/api/vendor/products/${produitInitial.id}`
          : `/api/vendor/products`,
        {
          method: produitInitial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const errorData = await response.json();
        console.error("Erreur serveur :", errorData.error);
        setErreurSauvegarde(errorData.error || "Un champ obligatoire est manquant.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allKnownKeys = Array.from(
    new Set(
      form.variantes
        .flatMap((v) => v.attributs.map((a) => a.cle.trim()))
        .filter(Boolean)
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative">

        <button onClick={onClose} className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold text-[#1e293b]">
            {produitInitial ? "Modifier le produit" : "Nouveau produit"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {produitInitial
              ? "Modifiez les informations de votre produit"
              : "Ajoutez un nouveau produit à votre catalogue"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-2 space-y-6">

          {/* Nom */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium text-gray-700">Nom du produit <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Ex: Écouteurs Sans Fil"
              value={form.nom}
              onChange={(e) => handleChange("nom", e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#5c59f2]/50 focus:ring-4 focus:ring-[#5c59f2]/5 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium text-gray-700">Description</label>
            <textarea
              rows={4}
              placeholder="Décrivez votre produit..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#5c59f2]/50 transition-all resize-none"
            />
          </div>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[15px] font-medium text-gray-700">Prix de base (€) <span className="text-red-500">*</span></label>
              <input
                type="text" placeholder="0.00" value={form.prix}
                onChange={(e) => handleChange("prix", e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#5c59f2]/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[15px] font-medium text-gray-700">Prix barré (optionnel)</label>
              <input
                type="text" placeholder="0.00" value={form.prix_compare}
                onChange={(e) => handleChange("prix_compare", e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 outline-none focus:border-[#5c59f2]/50 transition-all"
              />
            </div>
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium text-gray-700">Catégorie <span className="text-red-500">*</span></label>
            <select
              value={form.categorie_id}
              onChange={(e) => handleChange("categorie_id", e.target.value)}
              disabled={loadingCategories}
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 outline-none bg-white disabled:opacity-50"
            >
              <option value="">{loadingCategories ? "Chargement..." : "Sélectionner une catégorie"}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>{cat.nom}</option>
              ))}
            </select>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <label className="text-[15px] font-medium text-gray-700">Images <span className="text-red-500">*</span></label>
            {form.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {form.images.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`image-${i}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                    <button
                      onClick={() => supprimerImage(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs hidden group-hover:flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <label className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center space-y-2 hover:border-[#5c59f2]/30 transition-colors cursor-pointer block">
              <input
                type="file" accept="image/png, image/jpeg, image/webp" multiple className="hidden"
                onChange={(e) => { handleImageUpload(e.target.files); e.target.value = ""; }}
              />
              {uploadEnCours ? (
                <p className="text-[#5c59f2] font-medium animate-pulse">Upload en cours...</p>
              ) : (
                <>
                  <p className="text-gray-500 font-medium">Cliquez pour télécharger ou glissez-déposez</p>
                  <p className="text-gray-400 text-xs">PNG, JPG, WEBP jusqu'à 5MB</p>
                </>
              )}
            </label>
            {erreurUpload && <p className="text-red-500 text-sm mt-1">{erreurUpload}</p>}
          </div>

          {/* Actif */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="actif" checked={form.actif}
              onChange={(e) => handleChange("actif", e.target.checked)}
              className="w-4 h-4 accent-[#5c59f2]"
            />
            <label htmlFor="actif" className="text-[15px] font-medium text-gray-700">
              Produit actif (visible dans le catalogue)
            </label>
          </div>

          {/* Variantes */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">Variantes</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Les attributs sont optionnels, mais le <span className="text-red-500 font-semibold">stock est obligatoire</span>.
                </p>
              </div>
              <button
                type="button" onClick={ajouterVariante}
                className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
                Ajouter une variante
              </button>
            </div>

            {form.variantes.map((variante, varianteIndex) => {
              if (variante.supprimee) return null;
              return (
                <div key={varianteIndex} className="p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-600">Variante {varianteIndex + 1}</span>
                    <button
                      type="button" onClick={() => supprimerVariante(varianteIndex)}
                      className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </button>
                  </div>

                  {/* Attributs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-gray-500 uppercase">Attributs</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file" accept=".csv" className="hidden"
                          ref={(el) => { csvInputRefs.current[varianteIndex] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImportCSV(varianteIndex, file);
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => csvInputRefs.current[varianteIndex]?.click()}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#5c59f2] border border-gray-200 hover:border-[#5c59f2]/40 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          Importer CSV
                        </button>
                        <button
                          type="button" onClick={() => ajouterAttribut(varianteIndex)}
                          className="flex items-center gap-1.5 text-xs text-[#5c59f2] border border-[#5c59f2]/30 hover:bg-[#5c59f2]/5 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Ajouter attribut
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {variante.attributs.map((attr, attributIndex) => {
                        const keysInVariant = new Set(
                          variante.attributs
                            .filter((_, i) => i !== attributIndex)
                            .map((a) => a.cle.trim().toLowerCase())
                            .filter(Boolean)
                        );
                        const suggestions = allKnownKeys.filter(
                          (k) => !keysInVariant.has(k.toLowerCase()) &&
                            (attr.cle === "" || k.toLowerCase().includes(attr.cle.toLowerCase()))
                        );
                        const isActive = focusedAttr?.v === varianteIndex && focusedAttr?.a === attributIndex;

                        return (
                          <div key={attributIndex} className="flex items-start gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text" placeholder="Clé" value={attr.cle}
                                onChange={(e) => handleAttributChange(varianteIndex, attributIndex, "cle", e.target.value)}
                                onFocus={() => setFocusedAttr({ v: varianteIndex, a: attributIndex })}
                                onBlur={() => setTimeout(() => setFocusedAttr(null), 150)}
                                className="w-full p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#5c59f2]/50 focus:ring-2 focus:ring-[#5c59f2]/10 transition-all"
                              />
                              {isActive && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100/80 p-3">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggestions</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {suggestions.map((k) => (
                                      <button
                                        key={k} type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleAttributChange(varianteIndex, attributIndex, "cle", k);
                                          setFocusedAttr(null);
                                        }}
                                        className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100/80 font-medium transition-colors cursor-pointer"
                                      >{k}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <input
                              type="text" placeholder="Valeur" value={attr.valeur}
                              onChange={(e) => handleAttributChange(varianteIndex, attributIndex, "valeur", e.target.value)}
                              className="flex-1 p-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#5c59f2]/50 focus:ring-2 focus:ring-[#5c59f2]/10 transition-all"
                            />
                            {variante.attributs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => supprimerAttribut(varianteIndex, attributIndex)}
                                className="mt-0.5 p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prix + Stock */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Prix suppl.</label>
                      <input
                        type="text" value={variante.prix_supplementaire}
                        onChange={(e) => handleVarianteChange(varianteIndex, "prix_supplementaire", e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Stock <span className="text-red-500">*</span></label>
                      <input
                        type="text" value={variante.stock}
                        placeholder="Requis"
                        onChange={(e) => handleVarianteChange(varianteIndex, "stock", e.target.value)}
                        className={`w-full p-3 rounded-xl border text-sm outline-none ${
                          variante.stock === "" ? "border-red-300 bg-red-50/30" : "border-gray-200"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase ml-1">Alerte</label>
                      <input
                        type="text" value={variante.seuil_stock_faible}
                        onChange={(e) => handleVarianteChange(varianteIndex, "seuil_stock_faible", e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {erreurSauvegarde && (
          <div className="mx-8 mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">⚠</div>
            <p className="text-sm font-medium">{erreurSauvegarde}</p>
            <button onClick={() => setErreurSauvegarde(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 bg-white border-t border-gray-50 flex flex-col gap-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-4">
            <button
              type="button" onClick={onClose}
              className="px-8 py-3 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="button" onClick={handleSubmit} disabled={uploadEnCours || isSubmitting}
              className="px-8 py-3 rounded-xl bg-[#5c59f2] text-white font-bold hover:bg-[#4a47d1] shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Enregistrement..." : produitInitial ? "Enregistrer" : "Créer le produit"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}