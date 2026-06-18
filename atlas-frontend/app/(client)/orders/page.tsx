"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/contexts/AuthModalContext";
import {
  Package,
  ArrowLeft,
  ShoppingBag,
  XCircle,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

// Types --------------------------------------------------------------------

/** Représente un article dans une commande client, incluant les infos produit et de suivi. */
interface ArticleCommande {
  id: number;
  produit_nom: string;
  quantite: number;
  prix_unitaire: number;
  article_statut: string;
  boutique_nom: string;
  images: string[];
  variante_attributs: Record<string, string>;
  numero_suivi?: string;
  transporteur?: string;
  sku: string;
  produit_id: number;
}

/** Représente une commande complète avec ses articles, adresse de livraison et statut. */
interface Commande {
  id: number;
  statut: string;
  sous_total: number;
  frais_livraison: number;
  montant_total: number;
  methode_paiement: string;
  adresse_livraison: {
    nom: string;
    rue: string;
    ville: string;
    code_postal: string;
    pays: string;
  } | null;
  cree_le: string;
  articles: ArticleCommande[];
}

/**
 * Configuration visuelle de chaque statut de commande.
 * Associe un libellé lisible, une couleur de point, une couleur de texte et un fond.
 */
const STATUT_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  EN_ATTENTE_PAIEMENT: { label: "En attente", dot: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50" },
  PAYEE: { label: "Payée", dot: "bg-blue-500", text: "text-blue-800", bg: "bg-blue-50" },
  EN_PREPARATION: { label: "En préparation", dot: "bg-violet-500", text: "text-violet-900", bg: "bg-violet-50" },
  PARTIELLEMENT_EXPEDIEE: { label: "Part. expédiée", dot: "bg-cyan-500", text: "text-cyan-900", bg: "bg-cyan-50" },
  EXPEDIEE: { label: "Expédiée", dot: "bg-cyan-500", text: "text-cyan-900", bg: "bg-cyan-50" },
  TERMINEE: { label: "Terminée", dot: "bg-green-500", text: "text-green-900", bg: "bg-green-50" },
  ANNULEE: { label: "Annulée", dot: "bg-red-500", text: "text-red-900", bg: "bg-red-50" },
  REMBOURSEE: { label: "Remboursée", dot: "bg-slate-500", text: "text-slate-800", bg: "bg-slate-50" },

  // Articles
  EN_ATTENTE: { label: "En attente", dot: "bg-amber-500", text: "text-amber-600", bg: "bg-transparent" },
  EXPEDIE: { label: "Expédiée", dot: "bg-cyan-500", text: "text-cyan-600", bg: "bg-transparent" },
  LIVRE: { label: "Livrée", dot: "bg-green-500", text: "text-green-600", bg: "bg-transparent" },
  RETOURNE: { label: "Retournée", dot: "bg-red-500", text: "text-red-600", bg: "bg-transparent" },
  REMBOURSE: { label: "Remboursée", dot: "bg-slate-500", text: "text-slate-600", bg: "bg-transparent" },
};

/**
 * Retourne la configuration visuelle d'un statut.
 * Utilise une valeur par défaut neutre si le statut est inconnu.
 *
 * @param statut - Code du statut de la commande ou de l'article.
 * @returns Les propriétés d'affichage (label, couleurs).
 */
function getStatut(statut: string) {
  return STATUT_CONFIG[statut] ?? { label: statut, dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50" };
}

/**
 * Badge coloré affichant le statut d'une commande ou d'un article.
 *
 * @param statut - Code du statut (ex: `"PAYEE"`, `"EXPEDIEE"`, `"ANNULEE"`).
 */
function StatutBadge({ statut }: { statut: string }) {
  const cfg = getStatut(statut);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${cfg.text} ${cfg.bg}`}>
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/**
 * Affiche la liste des articles d'une commande avec image, nom, variante et statut.
 *
 * @param articles - Tableau des articles de la commande.
 */
function ArticlesSummary({ articles }: { articles: ArticleCommande[] }) {
  if (articles.length === 0) return <span className="text-slate-400 text-[13px]">—</span>;

  return (
    <div className="flex flex-col gap-3 w-full">
      {articles.map((article, index) => {
        const img = article.images?.[0];
        const varianteStr = article.variante_attributs
          ? Object.values(article.variante_attributs).join(", ")
          : "";

        const statutCfg = getStatut(article.article_statut);

        return (
          <Link
            key={article.id || index}
            href={`/products/${article.produit_id}`}
            className="flex items-center gap-2.5 w-full group"
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={article.produit_nom} className="w-12 h-12 rounded-md object-cover border border-slate-200 shrink-0 group-hover:opacity-80 transition-opacity" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <Package size={20} className="text-slate-300" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                {article.produit_nom}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold">x{article.quantite}</span>
                {varianteStr && <span className="opacity-80"> • {varianteStr}</span>}
                <span className="opacity-30">|</span>
                <span className={`font-medium ${statutCfg.text}`}>{statutCfg.label}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Vendu par <span className="font-medium text-slate-500">{article.boutique_nom || "Atlas"}</span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Page historique des commandes du client connecté.
 *
 * Affiche toutes les commandes passées avec leurs articles, statut, montant
 * et adresse de livraison. Permet d'annuler une commande (si statut le permet).
 * Redirige vers `/login` si l'utilisateur n'est pas authentifié.
 *
 * @returns La page "Mes commandes" avec la liste détaillée des commandes.
 */
export default function MesCommandesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const { openLogin } = useAuthModal();


  useEffect(() => {
    if (!isLoading && !isAuthenticated) openLogin();
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetch(`/api/orders`, { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setCommandes)
      .catch(() => setError("Impossible de charger vos commandes."))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  async function handleCancel(id: number) {
    setConfirmId(null);
    setCancelling(id);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: "PUT", credentials: "include" });
      if (!res.ok) { const e = await res.json(); setError(e.error || "Erreur lors de l'annulation."); return; }
      setCommandes(prev => prev.map(c => c.id === id ? { ...c, statut: "ANNULEE" } : c));
      setNotification(`Commande #${id} annulée.`);
      setTimeout(() => setNotification(null), 4000);
    } finally { setCancelling(null); }
  }

  // Loading --------------------------------------------------------------------
  if (isLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-9 h-9 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Chargement…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header page */}
      <div className="bg-white border-b border-slate-200 py-5">
        <div className="max-w-[1100px] mx-auto px-6">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1.5 text-slate-400 text-[13px] no-underline mb-3 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft size={14} /> Catalogue
          </Link>

          <div className="flex items-end justify-between">
            <div>
              <h1 className="m-0 text-[22px] font-bold text-slate-900 tracking-tight">
                Mes commandes
              </h1>
              <p className="m-0 mt-1 text-[13px] text-slate-400">
                {commandes.length} commande{commandes.length !== 1 ? "s" : ""} au total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-[1100px] mx-auto px-6 pt-7 pb-16">

        {/* Notification */}
        {notification && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4 text-[13px] font-semibold text-green-700 animate-pulse">
            <CheckCircle2 size={15} /> {notification}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4 text-[13px] font-semibold text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* État vide */}
        {!error && commandes.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-[72px] px-6 text-center">
            <ShoppingBag size={48} className="text-slate-200 mx-auto mb-4" />
            <h2 className="m-0 mb-1.5 text-[17px] font-bold text-slate-800">
              Aucune commande
            </h2>
            <p className="m-0 mb-6 text-sm text-slate-400">
              Vos commandes apparaîtront ici dès que vous passerez commande.
            </p>
            <Link href="/catalogue">
              <button className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-[13px] border-none hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
                Explorer le catalogue
              </button>
            </Link>
          </div>
        )}

        {/* Tableau */}
        {commandes.length > 0 && (
          <div className="bg-transparent md:bg-white md:rounded-xl md:border md:border-slate-200 overflow-hidden">
            <table className="w-full border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    { label: "N° commande", w: "10%" },
                    { label: "Date", w: "12%" },
                    { label: "Articles", w: "28%" },
                    { label: "Livraison", w: "15%" },
                    { label: "Total", w: "12%" },
                    { label: "Statut", w: "13%" },
                    { label: "", w: "10%" },
                  ].map(({ label, w }) => (
                    <th key={label} className="py-3 px-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400" style={{ width: w }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {commandes.map((cmd) => {
                  const date = new Date(cmd.cree_le).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  const peutAnnuler = ["EN_ATTENTE_PAIEMENT", "PAYEE"].includes(cmd.statut);

                  return (
                    <tr key={cmd.id} className="block md:table-row bg-white border border-slate-200 md:border-x-0 md:border-t-0 md:border-b-2 md:border-b-slate-100 rounded-xl md:rounded-none mb-4 md:mb-0 transition-colors md:hover:bg-indigo-50/30 overflow-hidden">
                      
                      {/* N° */}
                      <td className="flex justify-between items-center md:table-cell p-4 border-b border-slate-100 md:border-transparent md:align-middle text-right md:text-left">
                        <span className="md:hidden text-[11px] font-bold uppercase text-slate-400 tracking-wider">N° commande</span>
                        <span className="text-[13px] font-bold text-[#19244B] font-mono">#{cmd.id}</span>
                      </td>

                      {/* Date */}
                      <td className="flex justify-between items-center md:table-cell p-4 border-b border-slate-100 md:border-transparent md:align-middle text-right md:text-left">
                        <span className="md:hidden text-[11px] font-bold uppercase text-slate-400 tracking-wider">Date</span>
                        <span className="text-[13px] text-slate-600 whitespace-nowrap">{date}</span>
                      </td>

                      {/* Articles */}
                      <td className="flex flex-col md:flex-row md:items-center md:table-cell p-4 border-b border-slate-100 md:border-transparent md:align-middle">
                        <span className="md:hidden text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">Articles</span>
                        <ArticlesSummary articles={cmd.articles} />
                      </td>

                      {/* Livraison */}
                      <td className="flex justify-between items-center md:items-start md:table-cell p-4 border-b border-slate-100 md:border-transparent md:align-middle text-right md:text-left">
                        <span className="md:hidden text-[11px] font-bold uppercase text-slate-400 tracking-wider">Livraison</span>
                        <div className="flex flex-col items-end md:items-start">
                          <span className="text-[13px] text-slate-600">{Number(cmd.frais_livraison).toFixed(2)} €</span>
                          {cmd.adresse_livraison && (
                            <div className="text-[12px] text-slate-400 mt-1.5 leading-snug">
                              <span className="text-slate-600 font-semibold">{cmd.adresse_livraison.nom}</span><br />
                              {cmd.adresse_livraison.rue}<br />
                              {cmd.adresse_livraison.code_postal} {cmd.adresse_livraison.ville}<br />
                              {cmd.adresse_livraison.pays}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="flex justify-between items-center md:table-cell p-4 border-b border-slate-100 md:border-transparent md:align-middle text-right md:text-left">
                        <span className="md:hidden text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total</span>
                        <span className="text-[14px] font-bold text-slate-900">{Number(cmd.montant_total).toFixed(2)} €</span>
                      </td>

                      {/* Statut */}
                      <td className="flex justify-between items-center md:table-cell p-4 border-b border-slate-100 md:border-transparent md:align-middle">
                        <span className="md:hidden text-[11px] font-bold uppercase text-slate-400 tracking-wider">Statut</span>
                        <StatutBadge statut={cmd.statut} />
                      </td>

                      {/* Actions */}
                      <td className="flex justify-end items-center md:table-cell p-4 bg-slate-50 md:bg-transparent md:align-middle rounded-b-xl md:rounded-none">
                        {peutAnnuler ? (
                          <button
                            onClick={() => setConfirmId(cmd.id)}
                            disabled={cancelling === cmd.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold bg-transparent border border-red-300 text-red-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-red-50 whitespace-nowrap"
                          >
                            <XCircle size={12} />
                            {cancelling === cmd.id ? "…" : "Annuler"}
                          </button>
                        ) : (
                          <span className="text-[12px] text-slate-300">—</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal confirmation annulation */}
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={() => setConfirmId(null)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 transition-colors">
              <X size={15} className="text-slate-400" />
            </button>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <XCircle size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Annuler la commande ?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              La commande <span className="font-semibold text-slate-700">#{confirmId}</span> sera définitivement annulée.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Retour
              </button>
              <button
                onClick={() => handleCancel(confirmId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
