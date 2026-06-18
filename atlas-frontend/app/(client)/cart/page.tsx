import React from "react";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { CartItemRow } from "@/components/cart/CartItemRow";

export const revalidate = 0;

/**
 * Récupère les données du panier depuis l'API en transmettant les cookies
 * de session (nécessaires côté serveur dans un Server Component).
 *
 * @returns Les articles du panier et le total, ou un objet vide si la requête échoue.
 */
async function getCartData() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart`, {
    method: "GET",
    headers: { 
      Cookie: allCookies,
      "Content-Type": "application/json"
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Erreur fetch panier:", res.status);
    return { articles: [], total: 0 };
  }
  return res.json();
}

/**
 * Page panier du client (Server Component).
 *
 * Charge les articles directement côté serveur pour éviter un flash de contenu vide.
 * Groupe les articles par boutique avant l'affichage via `CartItemRow`.
 * Le récapitulatif de prix est affiché dans une colonne latérale sticky.
 *
 * @returns La page panier avec les articles groupés par vendeur et le résumé de commande.
 */
export default async function PanierPage() {
  const { articles: articlesPanier, total } = await getCartData();

  const groupesBoutiques = articlesPanier.reduce((acc: any, item: any) => {
    const bId = item.boutique_id || "inconnu";
    if (!acc[bId]) {
      acc[bId] = { nom: item.boutique_nom || "Vendeur Atlas", articles: [] };
    }
    acc[bId].articles.push(item);
    return acc;
  }, {} as any);

  const nbArticles = articlesPanier.reduce(
    (acc: number, item: any) => acc + item.quantite,
    0
  );

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Back link — same style as "Mon compte" */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au catalogue
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6">
        {/* Page title — same style as "Mon compte" */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Mon Panier</h1>
          <p className="text-sm text-slate-400 mt-1">
            {nbArticles}{" "}
            {nbArticles > 1 ? "articles sélectionnés" : "article sélectionné"}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Articles */}
          <div className="lg:col-span-2 space-y-6">
            {articlesPanier.length > 0 ? (
              Object.entries(groupesBoutiques).map(
                ([bId, groupe]: [string, any]) => (
                  <section
                    key={bId}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">
                        Vendeur :
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {groupe.nom}
                      </span>
                    </div>
                    <div className="p-6 divide-y divide-slate-100">
                      {groupe.articles.map((item: any) => (
                        <CartItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                )
              )
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <ShoppingBag className="mx-auto text-slate-200 mb-4" size={56} />
                <p className="text-slate-400 text-base">
                  Votre panier est tristement vide…
                </p>
                <Link
                  href="/catalogue"
                  className="mt-6 inline-block bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Découvrir nos produits
                </Link>
              </div>
            )}
          </div>

          {/* Summary — card style matching "Mon compte" sidebar */}
          <aside className="lg:col-span-1 sticky top-24">
            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-6 pb-4 border-b border-indigo-100">
                Récapitulatif
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Sous-total</span>
                  <span className="font-semibold text-slate-800">
                    {Number(total).toFixed(2)} €
                  </span>
                </div>
                <div className="border-t border-indigo-100 pt-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900">Total TTC</span>
                  <span className="text-base font-bold text-indigo-600">
                    {Number(total).toFixed(2)} €
                  </span>
                </div>

                {articlesPanier.length > 0 ? (
                  <Link
                    href="/checkout"
                    className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors mt-2"
                  >
                    Passer au paiement
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full bg-slate-100 text-slate-400 text-sm font-semibold py-3 rounded-xl cursor-not-allowed mt-2"
                  >
                    Panier vide
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}