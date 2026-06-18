"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ShoppingBag, Search, Store, Sparkles } from "lucide-react";

/** Représente une boutique vendeur récupérée depuis l'API `/api/boutiques`. */
interface Boutique {
  id: number;
  nom: string;
  description: string;
  url_logo: string | null;
  url_image_couverture: string | null;
  note_moyenne: number;
  nb_produits: number;
  proprietaire_nom: string;
  cree_le: string;
}

/**
 * Affiche une rangée de 5 étoiles colorées selon la note donnée.
 *
 * @param note - Note entre 0 et 5. Arrondie à l'entier le plus proche.
 */
function StarRating({ note }: { note: number }) {
  const rounded = Math.round(note);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="h-3.5 w-3.5"
          fill={s <= rounded ? "#F59E0B" : "none"}
          stroke={s <= rounded ? "#F59E0B" : "#94A3B8"}
        />
      ))}
    </div>
  );
}

/**
 * Carte visuelle représentant une boutique dans le répertoire des vendeurs.
 *
 * Affiche la bannière de couverture (ou un dégradé coloré), le logo,
 * le nom du vendeur, la description, la note moyenne et le nombre de produits.
 * Un clic redirige vers le catalogue filtré par nom de boutique.
 *
 * @param boutique - Données de la boutique à afficher.
 * @param index - Position dans la liste (utilisée pour alterner les dégradés).
 */
function BoutiqueCard({ boutique, index }: { boutique: Boutique; index: number }) {
  const cover = boutique.url_image_couverture || null;
  const logo = boutique.url_logo || null;
  const initiale = boutique.nom.charAt(0).toUpperCase();

  const gradients = [
    "from-[#2D4A8A] via-[#3B5FA8] to-[#4F72C4]",
    "from-[#283E7A] via-[#3B5FA8] to-[#6366F1]",
    "from-[#2D4A8A] via-[#3D6BBF] to-[#5B82D4]",
    "from-[#2D4A8A] via-[#4F46E5] to-[#7C7FEA]",
    "from-[#283E7A] via-[#3B5FA8] to-[#4AABCC]",
    "from-[#2D4A8A] via-[#4060B8] to-[#8B9FDE]",
  ];
  const grad = gradients[index % gradients.length];

  return (
    <Link
      href={`/catalogue?q=${encodeURIComponent(boutique.nom)}&recherche_type=boutique`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100"
    >
      {/* Cover */}
      <div className={`relative h-36 bg-gradient-to-br ${grad} overflow-hidden`}>
        {cover ? (
          <img
            src={cover}
            alt={boutique.nom}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : null}

        {/* Formes décoratives douces */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute top-8 right-12 w-12 h-12 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
        </div>

        {/* Nom dans la cover */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 pb-3 pt-8"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)" }}
        >
          <p className="text-white font-semibold text-sm truncate drop-shadow">{boutique.nom}</p>
        </div>

        {/* Logo */}
        <div className="absolute top-4 right-4">
          {logo ? (
            <img
              src={logo}
              alt={`Logo ${boutique.nom}`}
              className="w-11 h-11 rounded-xl object-cover border-2 border-white/40 shadow-lg bg-white"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl border-2 border-white/40 shadow-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg">
              {initiale}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-5 py-4">
        <p className="text-xs text-indigo-500 font-medium truncate">
          par {boutique.proprietaire_nom}
        </p>

        {boutique.description && (
          <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {boutique.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <StarRating note={Number(boutique.note_moyenne)} />
            <span className="text-xs font-semibold text-amber-500">
              {Number(boutique.note_moyenne).toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full">
            <ShoppingBag className="h-3 w-3" />
            {boutique.nb_produits} produit{Number(boutique.nb_produits) !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Page publique listant toutes les boutiques vendeurs actives.
 *
 * Comporte une section hero avec statistiques agrégées (nombre de boutiques,
 * total de produits, note moyenne), une barre de recherche pour filtrer
 * localement les boutiques, et une grille de cartes `BoutiqueCard`.
 *
 * Les données sont chargées une seule fois au montage depuis `GET /api/boutiques`.
 *
 * @returns La page du répertoire des vendeurs Atlas.
 */
export default function VendeursPage() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const API = "";

  useEffect(() => {
    fetch(`${API}/api/boutiques`)
      .then((r) => r.json())
      .then(setBoutiques)
      .catch(() => setBoutiques([]))
      .finally(() => setLoading(false));
  }, [API]);

  const filtered = boutiques.filter((b) =>
    b.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #1C3461 0%, #243D75 25%, #2D4A8A 45%, #C7D4F0 65%, #EEF2FF 82%, #F5F6FA 100%)",
      }}
    >
      {/*  Hero --------------------------------------------------------- */}
      <div className="relative pt-16 pb-40 px-4 text-center overflow-hidden">

        {/* Bulles lumineuses uniquement — pas de grille */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-10 right-1/4 w-64 h-64 rounded-full bg-indigo-300/15 blur-3xl" />
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-48 rounded-full bg-indigo-200/20 blur-2xl" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
          <span className="text-white/85 text-xs font-medium tracking-wide uppercase">Notre communauté</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-sm">
          Les Vendeurs{" "}
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, #A5B4FC, #C7D4FF)" }}
          >
            Atlas
          </span>
        </h1>

        <p className="text-white text-xl leading-relaxed max-w-xl mx-auto font-medium">
          Découvrez nos boutiques partenaires et leurs produits sélectionnés avec soin.
        </p>

        {/* Barre de recherche */}
        <div className="mt-8 max-w-md mx-auto flex items-center bg-white/15 border border-white/30 rounded-2xl px-4 gap-2 backdrop-blur-md shadow-lg shadow-black/10">
          <Search className="h-4 w-4 text-white/50 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher une boutique..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder:text-white/40 py-3.5 text-sm focus:outline-none"
          />
        </div>

        {/* Stats */}
        {!loading && (
          <div className="mt-8 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white drop-shadow">{boutiques.length}</p>
              <p className="text-blue-200/70 text-xs mt-0.5">Boutiques</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white drop-shadow">
                {boutiques.reduce((s, b) => s + Number(b.nb_produits), 0)}
              </p>
              <p className="text-blue-200/70 text-xs mt-0.5">Produits</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white drop-shadow">
                {boutiques.length > 0
                  ? (boutiques.reduce((s, b) => s + Number(b.note_moyenne), 0) / boutiques.length).toFixed(1)
                  : "—"}
              </p>
              <p className="text-blue-200/70 text-xs mt-0.5">Note moyenne</p>
            </div>
          </div>
        )}
      </div>

      {/*  Grille boutiques ---------------------------------------------- */}
      <div className="relative max-w-6xl mx-auto px-4 pb-16" style={{ marginTop: "-6rem" }}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
                <div className="h-36 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm">
            <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {search
                ? `Aucune boutique trouvée pour "${search}"`
                : "Aucune boutique disponible pour le moment."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-3 text-sm text-indigo-600 hover:underline cursor-pointer"
              >
                Réinitialiser la recherche
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5 font-medium">
              {filtered.length} boutique{filtered.length !== 1 ? "s" : ""} disponible{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((b, i) => (
                <BoutiqueCard key={b.id} boutique={b} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}