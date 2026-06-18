"use client";

/**
 * @file components/ui/Hero.tsx
 * @description Section hero de la page d'accueil.
 * Charge les 3 premiers produits du catalogue pour les afficher en cartes flottantes animées.
 * Intègre une barre de recherche qui redirige vers /catalogue avec le terme en query param.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeroProductcard from "@/components/ui/HeroProductcard";

const tags = [
  { icon: "✦", label: "1000+ produits" },
  { icon: "✦", label: "50+ vendeurs" },
  { icon: "✦", label: "Livraison rapide" },
];

const categoryTabs = ["Tout", "Mode", "Maison", "Tech"];

interface Produit {
  id: number;
  nom: string;
  prix: number;
  images: string[];
  boutique_nom: string;
  note_moyenne?: number;
}

/**
 * Composant hero pleine hauteur avec barre de recherche, tags et cartes produits animées.
 * Sur mobile, les cartes sont affichées en défilement horizontal.
 */
export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?limite=3')
      .then((res) => res.json())
      .then((data) => {
        const produitsArray = data.produits || [];
        setProducts(produitsArray.slice(0, 3));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement produits hero :", err);
        setLoading(false);
      });
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/catalogue?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/catalogue");
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col pt-[60px]">
      {/* Background glows */}
      <div className="hero-glow" style={{ left: "-100px", top: "100px" }} />
      <div
        className="absolute w-64 h-64 md:w-96 md:h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(120,60,255,0.12) 0%, transparent 70%)",
          right: "10%",
          bottom: "20%",
        }}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center gap-10 px-6 sm:px-10 lg:px-20 py-10 max-w-[1280px] mx-auto w-full">

        {/* ── Left column ── */}
        <div className="flex-1 w-full max-w-xl mx-auto lg:mx-0">

          <h1
            className="animate-fade-up font-extrabold leading-tight mb-5 text-white text-4xl sm:text-5xl lg:text-[52px]"
            style={{
              fontFamily: "Syne, sans-serif",
              opacity: 0,
              animationDelay: "0s",
              animationFillMode: "forwards",
            }}
          >
            Le marché des{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #3b6bff, #7b9fff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              vendeurs indépendants
            </span>
          </h1>

          <p
            className="animate-fade-up text-base sm:text-lg mb-8"
            style={{
              fontFamily: "DM Sans, sans-serif",
              color: "rgba(255,255,255,0.75)",
              opacity: 0,
              animationDelay: "0.1s",
              animationFillMode: "forwards",
            }}
          >
            Des milliers de vendeurs passionnés. Des produits uniques.
          </p>

          {/* Search bar */}
          <div
            className="animate-fade-up flex gap-2 mb-6"
            style={{ opacity: 0, animationDelay: "0.2s", animationFillMode: "forwards" }}
          >
            <div
              className="flex-1 flex items-center gap-3 rounded-2xl px-4"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.2)",
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Rechercher un produit..."
                className="flex-1 bg-transparent border-none outline-none text-white text-sm sm:text-base py-4"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            <button
              onClick={handleSearch}
              className="btn-primary rounded-2xl text-sm sm:text-base font-semibold whitespace-nowrap px-4 sm:px-7 py-4 cursor-pointer"
            >
              <span className="hidden sm:inline">Rechercher</span>
              <svg className="sm:hidden" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>

          {/* Tags */}
          <div
            className="animate-fade-up flex flex-wrap gap-2 mb-6"
            style={{ opacity: 0, animationDelay: "0.3s", animationFillMode: "forwards" }}
          >
            {tags.map((t) => (
              <span key={t.label} className="tag-pill text-xs sm:text-sm px-3 sm:px-4 py-1.5">
                <span style={{ color: "#3b6bff" }}>{t.icon}</span>
                {t.label}
              </span>
            ))}
          </div>

          {/* Category tags */}
          <div
            className="animate-fade-up flex flex-wrap gap-2 mb-8"
            style={{ opacity: 0, animationDelay: "0.35s", animationFillMode: "forwards" }}
          >
            {categoryTabs.map((tab) => (
              <span
                key={tab}
                className="text-sm px-4 sm:px-5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 select-none cursor-default"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {tab}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div
            className="animate-fade-up"
            style={{ opacity: 0, animationDelay: "0.4s", animationFillMode: "forwards" }}
          >
            <Link href="/catalogue">
              <button
                className="btn-primary flex items-center gap-2 px-6 sm:px-7 py-4 rounded-xl text-sm sm:text-base font-semibold cursor-pointer"
              >
                Explorer le catalogue
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>
        </div>

        {/* ── Right column — floating cards ── */}
        {/* Hidden on mobile, visible from lg up */}
        <div className="hidden lg:block flex-1 relative h-[500px] min-w-[420px]">
          {loading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 text-sm"
              style={{ fontFamily: "DM Sans, sans-serif" }}>
              Chargement...
            </div>
          )}
          {!loading && products[0] && (
            <div className="animate-float absolute left-0 top-[30px] z-[2]">
              <HeroProductcard
                image={products[0].images?.[0] || "/placeholder.png"}
                nom={products[0].nom}
                prix={products[0].prix}
                boutique={products[0].boutique_nom}
                note={products[0].note_moyenne || 0}
              />
            </div>
          )}
          {!loading && products[1] && (
            <div className="animate-float-delay absolute right-0 top-0 z-[1]">
              <HeroProductcard
                image={products[1].images?.[0] || "/placeholder.png"}
                nom={products[1].nom}
                prix={products[1].prix}
                boutique={products[1].boutique_nom}
                note={products[1].note_moyenne || 0}
              />
            </div>
          )}
          {!loading && products[2] && (
            <div className="animate-float absolute z-[3]" style={{ left: "110px", bottom: "20px", animationDelay: "0.8s" }}>
              <HeroProductcard
                image={products[2].images?.[0] || "/placeholder.png"}
                nom={products[2].nom}
                prix={products[2].prix}
                boutique={products[2].boutique_nom}
                note={products[2].note_moyenne || 0}
              />
            </div>
          )}
        </div>

        {/* ── Mobile product preview — horizontal scroll ── */}
        {/* Visible on mobile/tablet only, hidden on lg */}
        {!loading && products.length > 0 && (
          <div className="lg:hidden w-full">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {products.map((p) => (
                <div key={p.id} className="snap-start shrink-0">
                  <HeroProductcard
                    image={p.images?.[0] || "/placeholder.png"}
                    nom={p.nom}
                    prix={p.prix}
                    boutique={p.boutique_nom}
                    note={p.note_moyenne || 0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="px-6 sm:px-10 lg:px-20 pb-5 max-w-[1280px] mx-auto w-full">
        <div className="divider" />
        <div
          className="text-center mt-3 text-[11px] tracking-[3px] uppercase"
          style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.3)" }}
        >
          Produits Populaires
        </div>
      </div>
    </section>
  );
}