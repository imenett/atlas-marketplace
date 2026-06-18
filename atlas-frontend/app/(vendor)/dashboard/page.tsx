'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SellerSidebar } from './SellerSidebar';
import {
  Package,
  ShoppingBag,
  BarChart3,
  Star,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** KPIs principaux du dashboard (chiffre d'affaires, commandes, produits actifs, note). */
interface KpiData {
  revenue:        { value: string; trend: string; isPositive: boolean };
  orders:         { value: string; trend: string; isPositive: boolean };
  activeProducts: { value: string; trend: string; isPositive: boolean };
  averageRating:  { value: string; trend: string; isPositive: boolean };
}

/** Produit le plus vendu affiché dans le classement du dashboard. */
interface TopProduct {
  id:        number;
  name:      string;
  category:  string;
  unitsSold: number;
  revenue:   number;
  image:     string;
}

/** Variante d'un produit dont le stock est sous le seuil d'alerte. */
interface VarianteAlerte {
  varianteId: number;
  label:      string;
  stock:      number;
  seuil:      number;
}

/** Alerte de stock faible regroupant toutes les variantes en dessous du seuil pour un produit. */
interface StockAlert {
  produitId:   number;
  productName: string;
  variantes:   VarianteAlerte[];
}

/** Commande récente affichée dans le tableau de bord vendeur. */
interface RecentOrder {
  id:     string;
  client: string;
  items:  number;
  amount: number;
  status: 'EN_ATTENTE' | 'EN_PREPARATION' | 'EXPEDIE' | 'LIVRE' | 'ANNULEE' | 'PAYEE';
}

/** Variante affichée dans la modale de réapprovisionnement de stock. */
interface VarianteModal {
  id:        number;
  produitId: number;
  label:     string;
  stock:     number;
}

/** Données de la modale de réapprovisionnement (produit + liste de variantes à restockér). */
interface ReapproModal {
  produitNom: string;
  variantes:  VarianteModal[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Retourne les classes Tailwind de couleur pour un badge de statut de commande.
 *
 * @param status - Code du statut (ex: `"PAYEE"`, `"EXPEDIE"`).
 * @returns Classes CSS pour le fond et le texte du badge.
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'EN_ATTENTE':     return 'bg-gray-100 text-gray-600';
    case 'EN_PREPARATION': return 'bg-orange-100 text-orange-600';
    case 'EXPEDIE':        return 'bg-blue-100 text-blue-600';
    case 'LIVRE':          return 'bg-green-100 text-green-600';
    case 'ANNULEE':        return 'bg-red-100 text-red-500';
    case 'PAYEE':          return 'bg-emerald-100 text-emerald-600';
    default:               return 'bg-gray-100 text-gray-500';
  }
};

/**
 * Retourne le libellé français d'un statut de commande.
 *
 * @param status - Code du statut.
 * @returns Libellé lisible par un humain.
 */
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'EN_ATTENTE':     return 'En attente';
    case 'EN_PREPARATION': return 'En préparation';
    case 'EXPEDIE':        return 'Expédiée';
    case 'LIVRE':          return 'Livrée';
    case 'ANNULEE':        return 'Annulée';
    case 'PAYEE':          return 'Payée';
    default:               return status;
  }
};

/**
 * Badge stock — moins agressif visuellement.
 * Rupture    → rouge doux
 * Stock très bas (≤ seuil/2) → orange doux
 * Stock bas (≤ seuil)        → jaune/ambre
 */
function getStockBadge(stock: number, seuil: number): { className: string; label: string } {
  if (stock === 0)
    return { className: 'bg-red-100 text-red-600 hover:bg-red-100 border border-red-200',           label: 'Rupture'           };
  if (stock <= Math.floor(seuil / 2))
    return { className: 'bg-orange-100 text-orange-600 hover:bg-orange-100 border border-orange-200', label: `${stock} restants` };
  return   { className: 'bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200',      label: `${stock} restants` };
}

/**
 * Vérifie que la réponse de l'API KPI a bien la forme attendue.
 * Évite le crash "e.data.isPositive" quand le backend renvoie une erreur JSON.
 */
function isValidKpiData(data: unknown): data is KpiData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const keys: (keyof KpiData)[] = ['revenue', 'orders', 'activeProducts', 'averageRating'];
  return keys.every((k) => {
    const field = d[k];
    return (
      field !== null &&
      typeof field === 'object' &&
      'isPositive' in (field as object)
    );
  });
}

// ─────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────

/**
 * Tableau de bord principal du vendeur.
 *
 * Affiche en temps réel (rechargement toutes les 30 secondes) :
 * - **KPIs** : chiffre d'affaires, nombre de commandes, produits actifs, note moyenne.
 * - **Alertes de stock** : variantes dont le stock est sous le seuil configuré.
 * - **Commandes récentes** : 5 dernières commandes avec statut.
 * - **Top produits** : classement par revenus générés.
 *
 * Inclut également une modale de réapprovisionnement rapide directement depuis le dashboard.
 *
 * @returns La page tableau de bord vendeur avec toutes ses sections.
 */
export default function SellerDashboardPage() {

  // ── SUPPRIMÉ : const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  // Toutes les requêtes passent désormais par le proxy Vercel via des URLs relatives.

  const [kpiData,         setKpiData]         = useState<KpiData | null>(null);
  const [kpiLoading,      setKpiLoading]      = useState(true);
  const [topProducts,     setTopProducts]     = useState<TopProduct[]>([]);
  const [topLoading,      setTopLoading]      = useState(true);

  // État initial = null (inconnu) — pas [] — pour différencier "pas encore chargé" de "0 alertes"
  const [stockAlerts,     setStockAlerts]     = useState<StockAlert[] | null>(null);
  const [stockLoading,    setStockLoading]    = useState(true);
  const [stockRefreshing, setStockRefreshing] = useState(false);

  const [recentOrders,    setRecentOrders]    = useState<RecentOrder[]>([]);
  const [ordersLoading,   setOrdersLoading]   = useState(true);

  const [reapproModal,         setReapproModal]         = useState<ReapproModal | null>(null);
  const [selectedVarianteIdx,  setSelectedVarianteIdx]  = useState(0);
  const [quantite,             setQuantite]             = useState<string | number>(10);
  const [reapproLoading,       setReapproLoading]       = useState(false);
  const [reapproError,         setReapproError]         = useState<string | null>(null);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── fetchStockAlerts ───────────────────────────────────────────────────
  const fetchStockAlerts = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setStockLoading(true);
    else               setStockRefreshing(true);
    try {
      const data: StockAlert[] = await fetch(
        '/api/vendor/dashboard/stock-alerts',  // ← URL relative via proxy Vercel
        { credentials: 'include' }
      ).then((r) => r.json());
      setStockAlerts(Array.isArray(data) ? data : []);
    } catch {
      // conserve les données précédentes sur erreur réseau
    } finally {
      setStockLoading(false);
      setStockRefreshing(false);
    }
  }, []);

  // ── Chargement initial + auto-refresh ─────────────────────────────────
  useEffect(() => {
    // KPIs — URLs relatives via proxy Vercel (fix 401)
    fetch('/api/vendor/dashboard/kpis', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        // Guard contre une réponse d'erreur JSON (ex: 401 {"error":"..."})
        // qui causait "TypeError: undefined is not an object (evaluating 'e.data.isPositive')"
        setKpiData(isValidKpiData(d) ? d : null);
        setKpiLoading(false);
      })
      .catch(() => setKpiLoading(false));

    fetch('/api/vendor/dashboard/top-products', { credentials: 'include' })  // ← URL relative
      .then((r) => r.json())
      .then((d) => { setTopProducts(Array.isArray(d) ? d : []); setTopLoading(false); })
      .catch(() => setTopLoading(false));

    fetchStockAlerts();

    fetch('/api/vendor/dashboard/recent-orders', { credentials: 'include' })  // ← URL relative
      .then((r) => r.json())
      .then((d) => { setRecentOrders(Array.isArray(d) ? d : []); setOrdersLoading(false); })
      .catch(() => setOrdersLoading(false));

    refreshIntervalRef.current = setInterval(() => fetchStockAlerts({ silent: true }), 30_000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [fetchStockAlerts]);

  // ── Ouvre le modal réappro ─────────────────────────────────────────────
  const openReapproModal = (alert: StockAlert) => {
    setSelectedVarianteIdx(0);
    setQuantite(10);
    setReapproError(null);
    setReapproModal({
      produitNom: alert.productName,
      variantes:  alert.variantes.map((v) => ({
        id: v.varianteId, produitId: alert.produitId, label: v.label, stock: v.stock,
      })),
    });
  };

  // ── Réappro ───────────────────────────────────────────────────────────
  async function handleReappro() {
    if (!reapproModal) return;

    const qStr = String(quantite);
    if (!/^\d+$/.test(qStr) || parseInt(qStr) <= 0) {
      setReapproError("La quantité doit être un nombre entier supérieur à 0.");
      return;
    }

    const variante = reapproModal.variantes[selectedVarianteIdx];
    setReapproLoading(true);
    try {
      await fetch(
        `/api/vendor/products/${variante.produitId}/stock/${variante.id}/reapprovisionner`,  // ← URL relative
        { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantite }) }
      );
      setReapproModal(null);
      await fetchStockAlerts({ silent: true });
    } catch (err) {
      console.error('Erreur réappro :', err);
    } finally {
      setReapproLoading(false);
    }
  }

  // ── Header de la section stock — conditionnel ─────────────────────────
  // stockAlerts === null  → pas encore chargé (stockLoading = true)
  // stockAlerts === []    → tout va bien
  // stockAlerts.length>0  → alertes présentes
  const StockSectionHeader = () => {
    if (stockLoading || stockAlerts === null) {
      return <h2 className="text-lg md:text-xl font-semibold text-[#0D1B3E]">Stocks</h2>;
    }
    if (stockAlerts.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
          <h2 className="text-lg md:text-xl font-semibold text-[#0D1B3E]">Stocks</h2>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-500 flex-shrink-0" />
        <h2 className="text-lg md:text-xl font-semibold text-[#0D1B3E]">Alertes stock</h2>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] overflow-x-hidden">

      <SellerSidebar />

      <main className="flex-1 p-4 sm:p-6 md:p-8 pt-16 md:pt-8 min-w-0">

        {/* En-tête */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-[#0D1B3E]">Tableau de bord</h1>
          <p className="text-sm text-[#6F727B]">Bienvenue, voici un aperçu de votre activité</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          {kpiLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 md:p-6 bg-white border border-gray-200 shadow-sm animate-pulse">
                <div className="h-6 w-6 bg-gray-200 rounded mb-4" />
                <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-100 rounded" />
              </Card>
            ))
          ) : kpiData ? (
            [
              { label: "Chiffre d'Affaires", data: kpiData.revenue,        icon: BarChart3   },
              { label: 'Commandes',           data: kpiData.orders,         icon: ShoppingBag },
              { label: 'Produits actifs',     data: kpiData.activeProducts, icon: Package     },
              { label: 'Note moyenne',        data: kpiData.averageRating,  icon: Star        },
            ].map((kpi, i) => (
              <Card key={i} className="p-4 md:p-6 bg-white border border-gray-200 shadow-sm">
                <div className="p-2 md:p-3 rounded-lg bg-[#4F46E5]/10 w-fit mb-3 md:mb-4">
                  <kpi.icon className="h-4 w-4 md:h-6 md:w-6 text-[#4F46E5]" />
                </div>
                <div className="text-xl md:text-3xl font-bold mb-1 text-[#0D1B3E]">
                  {kpi.data.value}
                  {kpi.label === 'Note moyenne' && (
                    <Star className="inline h-4 w-4 md:h-5 md:w-5 ml-1 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <div className="text-xs md:text-sm text-[#6F727B]">{kpi.label}</div>
              </Card>
            ))
          ) : (
            [
              { label: "Chiffre d'Affaires", icon: BarChart3   },
              { label: 'Commandes',           icon: ShoppingBag },
              { label: 'Produits actifs',     icon: Package     },
              { label: 'Note moyenne',        icon: Star        },
            ].map((kpi, i) => (
              <Card key={i} className="p-4 md:p-6 bg-white border border-gray-200 shadow-sm">
                <div className="p-2 md:p-3 rounded-lg bg-[#4F46E5]/10 w-fit mb-3 md:mb-4">
                  <kpi.icon className="h-4 w-4 md:h-6 md:w-6 text-[#4F46E5]" />
                </div>
                <div className="text-xl md:text-3xl font-bold mb-1 text-[#0D1B3E]">--</div>
                <div className="text-xs md:text-sm text-[#6F727B]">{kpi.label}</div>
              </Card>
            ))
          )}
        </div>

        {/* ── Top Produits + Alertes Stock ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8 items-start">

          {/* Top Produits */}
          <Card className="p-4 md:p-6 bg-white border border-gray-200 shadow-sm">
            <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-[#0D1B3E]">Top Produits</h2>
            {topLoading ? (
              <div className="text-sm text-[#6F727B]">Chargement...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#6F727B]">Aucun produit vendu pour le moment.</div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs md:text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={product.image} alt={product.name} className="object-cover w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs md:text-sm truncate text-[#0D1B3E]">{product.name}</div>
                      <div className="text-xs text-[#6F727B]">{product.category}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">
                        {product.unitsSold} vendus
                      </Badge>
                      <div className="text-xs md:text-sm font-semibold mt-1 text-[#0D1B3E]">
                        {product.revenue.toLocaleString()} €
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Alertes Stock — design moins agressif */}
          <Card className="p-4 md:p-6 bg-white border border-gray-200 shadow-sm">

            <div className="flex items-center justify-between mb-4 md:mb-5">
              <StockSectionHeader />
              <button
                onClick={() => fetchStockAlerts({ silent: true })}
                disabled={stockRefreshing || stockLoading}
                className="p-1.5 rounded-lg text-[#6F727B] hover:bg-gray-100 transition-colors disabled:opacity-40"
                title="Rafraîchir"
              >
                <RefreshCw className={`h-4 w-4 ${stockRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {stockLoading || stockAlerts === null ? (
              <div className="text-sm text-[#6F727B]">Chargement...</div>
            ) : stockAlerts.length === 0 ? (
              <div className="py-5 text-center text-sm text-green-600 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <span>Tous les stocks sont suffisants.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stockAlerts.map((alert) => (
                  <div
                    key={alert.produitId}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#0D1B3E] truncate mb-1.5">
                        {alert.productName}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {alert.variantes.map((v) => {
                          const badge = getStockBadge(v.stock, v.seuil);
                          return (
                            <div key={v.varianteId} className="flex items-center gap-1 text-xs text-[#6F727B]">
                              <span>{v.label}</span>
                              <Badge className={`${badge.className} text-xs px-1.5 py-0`}>{badge.label}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      className="self-start sm:self-center flex-shrink-0 text-xs font-medium text-[#4F46E5] hover:text-white border border-[#4F46E5]/30 hover:bg-[#4F46E5] hover:border-[#4F46E5] px-3 py-1.5 rounded-lg transition-all"
                      onClick={() => openReapproModal(alert)}
                    >
                      Réapprovisionner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Commandes Récentes */}
        <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-[#0D1B3E]">Commandes récentes</h2>
          </div>
          <div className="overflow-x-auto">
            {ordersLoading ? (
              <div className="p-6 text-sm text-[#6F727B]">Chargement...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6F727B]">Aucune commande récente.</div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['ID Commande', 'Client', 'Articles', 'Montant', 'Statut'].map((head) => (
                      <th key={head} className="px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6F727B]">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-[#0D1B3E]">{order.id}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-[#0D1B3E]">{order.client}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-[#6F727B]">{order.items}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-semibold text-[#0D1B3E]">{order.amount.toFixed(2)} €</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <Badge className={`${getStatusColor(order.status)} text-xs`}>{getStatusLabel(order.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Modal Réappro */}
        {reapproModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[340px] shadow-lg">
              <h2 className="text-lg font-semibold text-[#0D1B3E] mb-1">Réapprovisionner</h2>
              <p className="text-sm text-[#6F727B] mb-4">{reapproModal.produitNom}</p>
              <div className="space-y-2 mb-4">
                {reapproModal.variantes.map((v, i) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVarianteIdx(i)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      i === selectedVarianteIdx ? 'border-[#4F46E5] bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-medium text-[#0D1B3E]">{v.label}</span>
                    <Badge className={v.stock === 0 ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}>
                      {v.stock === 0 ? 'Rupture' : `${v.stock} en stock`}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setQuantite((q) => Math.max(1, (Number(q) || 0) - 1)); setReapproError(null); }} className="w-8 h-8 rounded-lg border border-gray-200 text-lg font-medium hover:bg-gray-50">−</button>
                <input
                  type="text" value={quantite}
                  onChange={(e) => { setQuantite(e.target.value); setReapproError(null); }}
                  className={`flex-1 h-8 border rounded-lg text-center text-sm font-medium ${reapproError ? "border-red-300 bg-red-50/30" : "border-gray-200"}`}
                />
                <button onClick={() => { setQuantite((q) => (Number(q) || 0) + 1); setReapproError(null); }} className="w-8 h-8 rounded-lg border border-gray-200 text-lg font-medium hover:bg-gray-50">+</button>
              </div>
              {reapproError && <p className="text-xs text-red-500 text-center mb-2">{reapproError}</p>}
              <p className="text-xs text-center text-[#6F727B] mb-4">
                Nouveau stock : <span className="text-[#4F46E5] font-medium">{(reapproModal.variantes[selectedVarianteIdx]?.stock ?? 0) + (Number(quantite) || 0)}</span>
              </p>
              <Button onClick={handleReappro} disabled={reapproLoading} className="w-full bg-[#4F46E5] text-white hover:bg-[#4338ca] mb-2">
                {reapproLoading ? 'Enregistrement...' : 'Confirmer'}
              </Button>
              <Button variant="outline" onClick={() => setReapproModal(null)} className="w-full text-sm">Annuler</Button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}