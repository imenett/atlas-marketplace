"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Produit en vedette récupéré depuis l'API et mappé pour `ProductCard`. */
interface Produit {
  id: number;
  variante_id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
}

/**
 * Section "Produits en vedette" de la page d'accueil.
 *
 * Charge les 4 premiers produits du catalogue depuis l'API et les affiche
 * dans une grille responsive (1 colonne → 2 colonnes → 4 colonnes).
 * Utilise `ProductCard` pour le rendu de chaque produit.
 *
 * Affiche des squelettes animés (`animate-pulse`) pendant le chargement.
 *
 * @returns La section des produits en vedette avec lien "Voir tout" vers le catalogue.
 */
export default function ProduitVedette() {
  const [products, setProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?limite=4&tri=popular')
      .then((res) => res.json())
      .then((data) => {
        const mapped = (data.produits || []).map((p: any) => ({
          id: p.id,
          variantes: p.variantes,
          name: p.nom,
          brand: p.boutique_nom,
          category: p.categorie_nom,
          price: Number(p.prix),
          rating: p.note_moyenne ? Number(p.note_moyenne) : 0,
          reviewCount: p.nombre_avis ? Number(p.nombre_avis) : 0,
          image: p.images?.[0] || "/placeholder.png",
          actif: p.actif
        }));
        setProducts(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement produits vedette :", err);
        setLoading(false);
      });
  }, []);

  return (
    <section className="bg-slate-50 py-12 md:py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header section with proper spacing */}
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <div className="space-y-2">
            <h2 className="font-bold text-2xl md:text-3xl text-slate-900">
              Produits en vedette
            </h2>
            <p className="text-sm md:text-base text-slate-500">
              Sélection de nos meilleures offres
            </p>
          </div>

          <Link
            href="/catalogue"
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            Voir tout
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Responsive Grid: 1 column on mobile, 2 on tablet, 4 on desktop */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}