'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SellerSidebar } from '@/app/(vendor)/dashboard/SellerSidebar';
import { Truck } from 'lucide-react';

// Types -----------------------------------------------

/** Produit associé à une variante dans une commande vendeur. */
interface Produit { id: number; nom: string; images: string[] }
/** Variante commandée avec ses attributs (taille, couleur…) et son SKU. */
interface Variante { id: number; attributs: Record<string, string>; sku: string; produits: Produit }
/** Commande reçue par la boutique, avec informations client et adresse de livraison. */
interface Commande {
  id: number; cree_le: string; statut: string;
  adresse_livraison: { nom:string; rue:string; ville:string; code_postal:string; pays:string };
  user: { name: string; email: string };
}
/** Article d'une commande géré par le vendeur, avec statut d'expédition et numéro de suivi. */
interface Article {
  id: number; quantite: number; prix_unitaire: number;
  statut: string; numero_suivi: string | null; transporteur: string | null;
  commandes: Commande; variantes_produit: Variante;
}

/** Liste ordonnée des statuts possibles pour un article vendu. */
const STATUTS = ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIE', 'LIVRE', 'RETOURNE'] as const;

/** Configuration visuelle de chaque statut : libellé et classes CSS du badge. */
const statutConfig: Record<string, { label: string; badge: string }> = {
  EN_ATTENTE:     { label: 'En attente',      badge: 'bg-yellow-100 text-yellow-800' },
  EN_PREPARATION: { label: 'En préparation',  badge: 'bg-orange-100 text-orange-800' },
  EXPEDIE:        { label: 'Expédiée',        badge: 'bg-blue-100 text-blue-800'     },
  LIVRE:          { label: 'Livrée',          badge: 'bg-green-100 text-green-800'   },
  RETOURNE:       { label: 'Retournée',       badge: 'bg-red-100 text-red-800'       },
  REMBOURSE:      { label: 'Remboursée',      badge: 'bg-gray-100 text-gray-600'     },
};


function StatusModal({
  article, onClose, onConfirm, isLoading,
}: {
  article: Article;
  onClose: () => void;
  onConfirm: (id: number, statut: string, suivi: string, transporteur: string) => void;
  isLoading: boolean;
}) {
  const [statut, setStatut] = useState(article.statut);
  const [suivi, setSuivi] = useState(article.numero_suivi || '');
  const [transporteur, setTransporteur] = useState(article.transporteur || '');
  const [error, setError] = useState('');

  const isExpedieInvalid = statut === 'EXPEDIE' && (!transporteur.trim() || !suivi.trim());

  const handleConfirm = () => {
    if (statut === 'EXPEDIE' && (!transporteur.trim() || !suivi.trim())) {
      setError('Le transporteur et le numéro de suivi sont obligatoires pour le statut "Expédié".');
      return;
    }
    setError('');
    onConfirm(article.id, statut, suivi, transporteur);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
        <h2 className="text-base font-semibold text-[#0D1B3E] mb-1">Modifier le statut</h2>
        <p className="text-sm text-[#6F727B] mb-5">
          Commande #{article.commandes?.id}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs font-medium mb-4">
            {error}
          </div>
        )}

        <label className="block text-xs text-[#6F727B] mb-1">Nouveau statut</label>
        <select
          value={statut}
          onChange={(e) => { setStatut(e.target.value); setError(''); }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0D1B3E] mb-4 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>{statutConfig[s].label}</option>
          ))}
        </select>

        {statut === 'EXPEDIE' && (
          <>
            <label className="block text-xs text-[#6F727B] mb-1">
              Transporteur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ex: Colissimo, DHL..."
              value={transporteur}
              onChange={(e) => { setTransporteur(e.target.value); setError(''); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                !transporteur.trim() && error ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            <label className="block text-xs text-[#6F727B] mb-1">
              Numéro de suivi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="ex: FR123456789"
              value={suivi}
              onChange={(e) => { setSuivi(e.target.value); setError(''); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${
                !suivi.trim() && error ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          </>
        )}

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-[#6F727B] hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || statut === article.statut}
            className="px-4 py-2 text-sm bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338ca] disabled:opacity-50"
          >
            {isLoading ? 'Mise à jour...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorOrdersPage() {
  // ── SUPPRIMÉ : const apiUrl = process.env.NEXT_PUBLIC_API_URL
  // Toutes les requêtes passent par le proxy Vercel via URLs relatives.

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('TOUS');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch('/api/vendor/orders', { credentials: 'include' })  // ← URL relative via proxy Vercel
      .then((r) => r.json())
      .then((data) => {
        // Guard: l'API peut renvoyer une erreur JSON ({error:...}) au lieu d'un tableau
        // ce qui causait "l.forEach is not a function"
        setArticles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateStatut = async (
    articleId: number, statut: string,
    numero_suivi: string, transporteur: string
  ) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/vendor/orders/${articleId}`, {  // ← URL relative via proxy Vercel
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ statut, numero_suivi, transporteur }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.articles)) {
        const updatedIds = new Set(data.articles.map((a: Article) => a.id));
        setArticles((prev) =>
          prev.map((a) =>
            updatedIds.has(a.id)
              ? { ...a, statut, numero_suivi: numero_suivi || a.numero_suivi, transporteur: transporteur || a.transporteur }
              : a
          )
        );
      }
    } finally {
      setUpdating(false);
      setSelectedArticle(null);
    }
  };

  // Regrouper les articles par commande
  const commandesMap = new Map<number, Article[]>();
  articles.forEach((a) => {
    const cid = a.commandes?.id;
    if (!commandesMap.has(cid)) commandesMap.set(cid, []);
    commandesMap.get(cid)!.push(a);
  });

  const commandesFiltrees = [...commandesMap.entries()].filter(([, arts]) =>
    filter === 'TOUS' || arts.some((a) => a.statut === filter)
  );

  const formatId = (id: number) => `ATL-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <SellerSidebar />

      <main className="flex-1 p-8">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0D1B3E]">Gestion des commandes</h1>
          <p className="text-sm text-[#6F727B] mt-1">
            {commandesMap.size} commande{commandesMap.size > 1 ? 's' : ''} au total
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'TOUS',           label: 'Toutes'          },
            { key: 'EN_ATTENTE',     label: 'En attente'      },
            { key: 'EN_PREPARATION', label: 'En préparation'  },
            { key: 'EXPEDIE',        label: 'Expédiées'       },
            { key: 'LIVRE',          label: 'Livrées'         },
            { key: 'RETOURNE',       label: 'Retournées'      },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
                filter === key
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-white border border-gray-200 text-[#6F727B] hover:border-[#4F46E5] hover:text-[#4F46E5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Liste commandes */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse border border-gray-100">
                <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-64 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : commandesFiltrees.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <p className="text-[#6F727B]">Aucune commande pour ce filtre.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commandesFiltrees.map(([commandeId, arts]) => {
              const commande = arts[0].commandes;
              const sousTotal = arts.reduce(
                (sum, a) => sum + Number(a.prix_unitaire) * a.quantite, 0
              );
              const ordre = ['EN_ATTENTE', 'EN_PREPARATION', 'EXPEDIE', 'LIVRE', 'RETOURNE', 'REMBOURSE'];
              const statutGlobal = arts.reduce((prev, curr) =>
                ordre.indexOf(curr.statut) > ordre.indexOf(prev.statut) ? curr : prev, arts[0]).statut;
              const config = statutConfig[statutGlobal] ?? { label: statutGlobal, badge: 'bg-gray-100 text-gray-600' };
              const expedie = arts.find((a) => a.statut === 'EXPEDIE');

              return (
                <div
                  key={commandeId}
                  className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
                >
                  {/* Header commande */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-[#0D1B3E]">
                        {formatId(commandeId)}
                      </p>
                      <p className="text-xs text-[#6F727B] mt-0.5">
                        {new Date(commande?.cree_le).toLocaleDateString('fr-FR')}
                        &nbsp;·&nbsp;
                        Client : {commande?.user?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.badge}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Articles */}
                  <p className="text-xs font-medium text-[#6F727B] uppercase tracking-wide mb-2">
                    Articles commandés
                  </p>
                  <div className="border border-gray-100 rounded-lg overflow-hidden mb-4">
                    {arts.map((article) => {
                      const produit = article.variantes_produit?.produits;
                      const image = produit?.images?.[0];
                      return (
                        <div
                          key={article.id}
                          className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={produit?.nom}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                              img
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-[#0D1B3E]">{produit?.nom}</p>
                            <p className="text-xs text-[#6F727B]">
                              {Object.values(article.variantes_produit?.attributs || {}).join(' / ')}
                            </p>
                          </div>
                          <p className="text-xs text-[#6F727B]">x{article.quantite}</p>
                          <p className="text-sm font-medium text-[#0D1B3E]">
                            {(Number(article.prix_unitaire) * article.quantite).toFixed(2)} €
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tracking si expédié */}
                  {expedie?.numero_suivi && (
                    <div className="flex items-center gap-1.5 text-xs text-[#4F46E5] mb-3">
                      <Truck className="h-3 w-3" />
                      {expedie.transporteur} — {expedie.numero_suivi}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <p className="text-sm text-[#0D1B3E]">
                      Sous-total vendeur :{' '}
                      <span className="font-semibold">{sousTotal.toFixed(2)} €</span>
                    </p>
                    {statutGlobal !== 'LIVRE' && statutGlobal !== 'RETOURNE' && statutGlobal !== 'REMBOURSE' && (
                      <button
                        onClick={() => setSelectedArticle(arts[0])}
                        className="px-4 py-1.5 text-sm border border-[#4F46E5] text-[#4F46E5] rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                      >
                        Modifier le statut
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedArticle && (
        <StatusModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onConfirm={updateStatut}
          isLoading={updating}
        />
      )}
    </div>
  );
}