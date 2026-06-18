"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react"; // Ajout de Suspense
import { Search, X, PackageSearch, ChevronDown, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/catalog/ProductCard";
import { FiltersSidebar } from "@/components/catalog/FiltersSidebar";
import { getProducts, getCategories, ProductFromAPI, CategoryFromAPI } from "@/lib/api";
import type { Product } from "@/components/catalog/ProductCard";
import type { Category } from "@/components/catalog/FiltersSidebar";

/** Nombre de produits affichés par page dans le catalogue. */
const ITEMS_PER_PAGE = 9;

/**
 * Transforme un produit tel que renvoyé par l'API en format interne utilisé
 * par le composant `ProductCard`.
 *
 * @param p - Produit brut venant de l'API.
 * @returns Produit formaté pour l'affichage dans la carte produit.
 */
function mapProduct(p: ProductFromAPI): Product {
  return {
    id: p.id,
    variantes: (p as any).variantes || [],
    name: p.nom,
    brand: p.boutique_nom,
    category: p.categorie_nom,
    price: Number(p.prix),
    rating: p.note_moyenne ? Number(p.note_moyenne) : 0,
    reviewCount: p.nombre_avis ? Number(p.nombre_avis) : 0,
    image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "/placeholder.png",
    actif: (p as any).actif ?? true,
  };
}

/**
 * Transforme une catégorie telle que renvoyée par l'API en format interne
 * utilisé par le composant `FiltersSidebar`.
 *
 * @param c - Catégorie brute venant de l'API.
 * @returns Catégorie formatée avec `id` en string pour les filtres.
 */
function mapCategory(c: CategoryFromAPI): Category {
  return {
    id: String(c.id),
    name: c.nom,
    count: c.count,
  };
}

/**
 * Contenu principal de la page catalogue avec tous les filtres et la grille de produits.
 *
 * Gère l'état complet du catalogue :
 * - Filtres actifs : catégories, fourchette de prix, note minimale, recherche, tri.
 * - Synchronisation avec les paramètres d'URL (`?q=`, `?categorie=`, `?recherche_type=`).
 * - Pagination côté serveur (9 produits par page).
 * - Panneau de filtres mobile en tiroir.
 *
 * Ce composant utilise `useSearchParams()` et doit être enveloppé dans `<Suspense>`.
 *
 * @returns La page catalogue complète avec sidebar de filtres et grille de produits.
 */
function CatalogueContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Visual states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get("categorie");
    return cat ? [cat] : [];
  });
  const [sortBy, setSortBy] = useState("newest");
  const [minRating, setMinRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [searchType, setSearchType] = useState(() => searchParams.get("recherche_type") || "tous");

  const [searchTypeOpen, setSearchTypeOpen] = useState(false);
  const searchTypeRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchTypeOptions = [
    { value: "tous", label: "Par défaut" },
    { value: "produit", label: "Par Produit" },
    { value: "boutique", label: "Par Boutique" },
    { value: "vendeur", label: "Par Vendeur" },
  ];

  const selectedSearchTypeLabel =
    searchTypeOptions.find((o) => o.value === searchType)?.label || "Par défaut";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeRef.current && !searchTypeRef.current.contains(event.target as Node)) {
        setSearchTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Synchronise les filtres quand l'URL change (ex: clic sur nom de boutique)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const type = searchParams.get("recherche_type") || "tous";
    setSearchQuery(q);
    setSearchType(type);
    setAppliedFilters((prev) => ({
      ...prev,
      searchQuery: q,
      searchType: type,
    }));
    setCurrentPage(1);
  }, [searchParams]);

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    priceRange: [0, 1000] as [number, number],
    selectedCategories: searchParams.get("categorie") ? [searchParams.get("categorie") as string] : [],
    sortBy: "newest",
    minRating: 0,
    searchQuery: searchParams.get("q") || "",
    searchType: searchParams.get("recherche_type") || "tous",
  }));

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Synchronisation avec l'URL (ex: quand on clique sur une boutique dans une carte produit)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const type = searchParams.get("recherche_type") || "tous";
    const cat = searchParams.get("categorie");

    let hasChanges = false;

    setAppliedFilters((prev) => {
      const nextCats = cat ? [cat] : prev.selectedCategories;

      if (
        prev.searchQuery !== q ||
        prev.searchType !== type ||
        JSON.stringify(prev.selectedCategories) !== JSON.stringify(nextCats)
      ) {
        hasChanges = true;

        // Met à jour les états visuels pour refléter l'URL
        setSearchQuery(q);
        setSearchType(type);
        if (cat) setSelectedCategories([cat]);

        return {
          ...prev,
          searchQuery: q,
          searchType: type,
          selectedCategories: nextCats
        };
      }
      return prev;
    });

    if (hasChanges) {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.map(mapCategory)))
      .catch(() => setCategories([]));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts({
        categories: appliedFilters.selectedCategories.length > 0 ? appliedFilters.selectedCategories.join(",") : undefined,
        prix_min: appliedFilters.priceRange[0] > 0 ? appliedFilters.priceRange[0] : undefined,
        prix_max: appliedFilters.priceRange[1] < 1000 ? appliedFilters.priceRange[1] : undefined,
        recherche: appliedFilters.searchQuery || undefined,
        recherche_type: appliedFilters.searchType,
        note_min: appliedFilters.minRating > 0 ? appliedFilters.minRating : undefined,
        tri: appliedFilters.sortBy,
        page: currentPage,
        limite: ITEMS_PER_PAGE,
      });
      setProducts(data.produits.map(mapProduct));
      setTotalPages(data.totalPages);
      setTotalItems(data.totalCount);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryToggle = (cat: string) => {
    const next = selectedCategories.includes(cat) ? selectedCategories.filter((c) => c !== cat) : [...selectedCategories, cat];
    setSelectedCategories(next);
    setAppliedFilters((prev) => ({ ...prev, selectedCategories: next }));
    setCurrentPage(1);
  };

  const handlePriceChange = (range: [number, number]) => {
    setPriceRange(range);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, priceRange: range }));
      setCurrentPage(1);
    }, 400);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setAppliedFilters((prev) => ({ ...prev, sortBy: sort }));
    setCurrentPage(1);
  };

  const handleRatingChange = (rating: number) => {
    setMinRating(rating);
    setAppliedFilters((prev) => ({ ...prev, minRating: rating }));
    setCurrentPage(1);
  };
  const handleSearch = () => {
    setAppliedFilters((prev) => ({ ...prev, searchQuery, searchType }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 1000]);
    setMinRating(0);
    setSearchQuery("");
    setSearchType("tous");
    setSortBy("newest");
    setAppliedFilters({
      priceRange: [0, 1000],
      selectedCategories: [],
      sortBy: "newest",
      minRating: 0,
      searchQuery: "",
      searchType: "tous",
    });
    setCurrentPage(1);
  };

  const renderGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-6 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">{error}</p>
          <button onClick={fetchProducts} className="mt-3 text-sm text-indigo-600 hover:underline">Réessayer</button>
        </div>
      );
    }
    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <PackageSearch className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-500">Aucun produit trouvé</p>
          <button onClick={resetFilters} className="mt-3 text-sm text-indigo-600 hover:underline">Réinitialiser les filtres</button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6FA]">
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 sticky top-24">
              <FiltersSidebar
                categories={categories}
                priceRange={priceRange}
                selectedCategories={selectedCategories}
                sortBy={sortBy}
                minRating={minRating}
                onPriceChange={handlePriceChange}
                onCategoryToggle={handleCategoryToggle}
                onSortChange={handleSortChange}
                onRatingChange={handleRatingChange}
                onReset={resetFilters}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <h1 className="text-3xl font-bold text-[#19244B]">Catalogue</h1>
                  <p className="text-sm text-slate-500 mt-1">
                    {loading ? "Recherche en cours..." : `${totalItems} résultat${totalItems !== 1 ? "s" : ""} trouvé${totalItems !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button className="lg:hidden px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white shadow-sm" onClick={() => setMobileFiltersOpen(true)}>Filtres</button>
              </div>

              <div className="flex w-full items-center bg-white border border-slate-200 rounded-2xl overflow-visible shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <div className="relative hidden sm:block h-full" ref={searchTypeRef}>
                  <button onClick={() => setSearchTypeOpen(!searchTypeOpen)} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border-r border-slate-200 text-slate-700 text-sm py-4 px-5 font-medium transition-colors h-full w-40 rounded-l-2xl cursor-pointer">
                    <span className="truncate flex-1 text-left">{selectedSearchTypeLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${searchTypeOpen ? "rotate-180" : ""}`} />
                  </button>
                  {searchTypeOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden z-50 p-1.5">
                      {searchTypeOptions.map((option) => (
                        <button key={option.value} onClick={() => { setSearchType(option.value); setSearchTypeOpen(false); }} className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors text-left cursor-pointer ${searchType === option.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                          {option.label}
                          {searchType === option.value && <Check className="h-4 w-4 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative flex-1 flex items-center h-full">
                  <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input type="text" placeholder="Que recherchez-vous aujourd'hui ?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="w-full pl-11 pr-10 py-3.5 text-base bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400 h-full" />
                  {searchQuery && <button onClick={() => { setSearchQuery(""); setAppliedFilters((prev) => ({ ...prev, searchQuery: "" })); }} className="absolute right-3 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>}
                </div>
                <button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 font-medium transition-colors hidden sm:block cursor-pointer rounded-r-2xl h-full">Rechercher</button>
              </div>
            </div>

            {renderGrid()}

            {!loading && totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Précédent</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 text-sm rounded-lg transition-colors font-medium ${page === currentPage ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{page}</button>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Suivant</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-slate-800 text-lg">Filtres</h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <FiltersSidebar categories={categories} priceRange={priceRange} selectedCategories={selectedCategories} sortBy={sortBy} minRating={minRating} onPriceChange={handlePriceChange} onCategoryToggle={handleCategoryToggle} onSortChange={handleSortChange} onRatingChange={handleRatingChange} onReset={resetFilters} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Page catalogue (export par défaut).
 *
 * Enveloppe `CatalogueContent` dans `<Suspense>` pour éviter l'erreur de build
 * liée à `useSearchParams()`, qui nécessite un rendu côté client uniquement.
 *
 * @returns La page catalogue avec son indicateur de chargement.
 */
export default function CataloguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Chargement du catalogue...</p>
        </div>
      </div>
    }>
      <CatalogueContent />
    </Suspense>
  );
}