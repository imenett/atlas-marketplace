"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronDown, X, Star, Check } from "lucide-react";

/**
 * Représente une catégorie de produits dans le panneau de filtres.
 * Exportée pour être réutilisée par les pages qui construisent la liste de catégories.
 */
export interface Category {
  id: string;
  name: string;
  count: number;
}

/** Props du composant `FiltersSidebar`. Tous les filtres sont contrôlés par le parent. */
interface FiltersSidebarProps {
  categories: Category[];
  priceRange: [number, number];
  selectedCategories: string[];
  sortBy: string;
  minRating: number;
  onPriceChange: (range: [number, number]) => void;
  onCategoryToggle: (category: string) => void;
  onSortChange: (sort: string) => void;
  onRatingChange: (rating: number) => void;
  onReset: () => void;
}

/**
 * Section repliable dans la sidebar de filtres.
 * Affiche un titre cliquable qui masque/affiche son contenu.
 *
 * @param title - Titre de la section (ex: "Prix", "Catégorie").
 * @param children - Contenu de la section (inputs, checkboxes…).
 * @param defaultOpen - Si `true`, la section est ouverte au premier rendu. Par défaut `true`.
 */
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-1 text-slate-800 hover:text-indigo-600 transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 text-slate-400 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * Panneau de filtres latéral du catalogue produits.
 *
 * Composant entièrement contrôlé : tous les états sont gérés par le composant parent
 * (`CatalogueContent`) qui appelle les callbacks lors des changements.
 *
 * Sections disponibles :
 * - **Trier par** : dropdown avec 5 options de tri.
 * - **Prix** : plage min/max avec champs numériques et slider.
 * - **Note client** : sélection d'une note minimale (1 à 5 étoiles, ou "Toutes").
 * - **Catégorie** : cases à cocher pour filtrer par catégorie(s).
 *
 * @param categories - Liste des catégories disponibles avec leur nombre de produits.
 * @param priceRange - Plage de prix actuellement sélectionnée `[min, max]`.
 * @param selectedCategories - Noms des catégories actuellement sélectionnées.
 * @param sortBy - Critère de tri actif.
 * @param minRating - Note minimale filtrée (0 = toutes les notes).
 * @param onPriceChange - Appelé quand la fourchette de prix change.
 * @param onCategoryToggle - Appelé avec le nom de la catégorie cochée/décochée.
 * @param onSortChange - Appelé avec la nouvelle valeur de tri.
 * @param onRatingChange - Appelé avec la nouvelle note minimale.
 * @param onReset - Appelé pour réinitialiser tous les filtres.
 */
export function FiltersSidebar({
  categories,
  priceRange,
  selectedCategories,
  sortBy,
  minRating,
  onPriceChange,
  onCategoryToggle,
  onSortChange,
  onRatingChange,
  onReset,
}: FiltersSidebarProps) {
  const activeCount =
    selectedCategories.length +
    (priceRange[0] > 0 || priceRange[1] < 1000 ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    { value: "popular", label: "Popularité" },
    { value: "newest", label: "Nouveautés" },
    { value: "price-asc", label: "Prix croissant" },
    { value: "price-desc", label: "Prix décroissant" },
    { value: "rating", label: "Meilleures notes" },
  ];

  const selectedSortLabel =
    sortOptions.find((o) => o.value === sortBy)?.label || "Trier par";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ratingOptions = [
    { value: 0, label: "Toutes les notes" },
    { value: 5, stars: 5, label: "5 étoiles" },
    { value: 4, stars: 4, label: "4 étoiles" },
    { value: 3, stars: 3, label: "3 étoiles" },
    { value: 2, stars: 2, label: "2 étoiles" },
    { value: 1, stars: 1, label: "1 étoile"  },
  ];

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
          <h2 className="font-bold text-slate-800 text-base">Filtres</h2>
          {activeCount > 0 && (
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3 w-3" /> Effacer
          </button>
        )}
      </div>

      {/* Trier par */}
      <FilterSection title="Trier par">
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center justify-between w-full text-sm text-slate-600 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <span className="font-medium text-slate-700">{selectedSortLabel}</span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
          </button>

          {sortOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-1.5 flex flex-col gap-0.5">
                {sortOptions.map((option) => {
                  const isSelected = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => { onSortChange(option.value); setSortOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors w-full text-left ${isSelected ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      {option.label}
                      {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </FilterSection>

      {/* Prix */}
      <FilterSection title="Prix">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
              <input
                type="number"
                min={0}
                value={priceRange[0]}
                onChange={(e) => onPriceChange([parseInt(e.target.value) || 0, priceRange[1]])}
                className="w-full pl-7 pr-2 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Min"
              />
            </div>
            <div className="h-px w-4 bg-slate-300" />
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
              <input
                type="number"
                min={0}
                value={priceRange[1]}
                onChange={(e) => onPriceChange([priceRange[0], parseInt(e.target.value) || 1000])}
                className="w-full pl-7 pr-2 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Max"
              />
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            step={10}
            value={priceRange[1]}
            onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value)])}
            className="w-full accent-indigo-600"
          />
        </div>
      </FilterSection>

      {/* ✅ Note client — corrigé avec option "Toutes" + style amélioré */}
      <FilterSection title="Note client">
        <div className="space-y-1.5">
          {ratingOptions.map((option) => {
            const isSelected = minRating === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onRatingChange(option.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600"
                }`}
              >
                {option.value === 0 ? (
                  <span className="text-sm font-medium">{option.label}</span>
                ) : (
                  <>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < (option.stars ?? 0)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-200 fill-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-indigo-600 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Catégories */}
      <FilterSection title="Catégorie">
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group/item">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.name)}
                onChange={() => onCategoryToggle(cat.name)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600 group-hover/item:text-slate-900 transition-colors flex-1 truncate">
                {cat.name}
              </span>
              <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                {cat.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}