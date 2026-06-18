"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { AddressStep } from "@/components/checkout/AddressStep";
import { ShippingStep } from "@/components/checkout/ShippingStep";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { ConfirmationStep } from "@/components/checkout/ConfirmationStep";
import { Separator } from "@/components/ui/separator";
import {
  CheckoutStep,
  CheckoutState,
  AddressData,
  ShippingMethod,
} from "@/lib/checkout";
import { useCart } from "@/contexts/CartContext";

/** Ordre des étapes du tunnel de commande. */
const STEP_ORDER: CheckoutStep[] = ["address", "shipping", "payment", "confirmation"];
const API_URL = "";

/**
 * Colonne latérale affichant le récapitulatif de commande pendant le checkout.
 *
 * Charge le total du panier depuis l'API et calcule le total final
 * en ajoutant les frais de livraison sélectionnés.
 *
 * @param shippingCost - Coût de livraison en euros (0 pour standard).
 * @param shippingLabel - Libellé de la méthode de livraison choisie, ou `null` si non encore choisie.
 */
function OrderSummarySidebar({
  shippingCost,
  shippingLabel,
}: {
  shippingCost: number;
  shippingLabel: string | null;
}) {
  const [cartTotal, setCartTotal] = useState<number | null>(null);
  const [nbArticles, setNbArticles] = useState<number>(0);

  useEffect(() => {
    fetch(`${API_URL}/api/cart`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ articles = [], total = 0 }) => {
        setCartTotal(Number(total));
        setNbArticles(
          articles.reduce((acc: number, i: { quantite: number }) => acc + i.quantite, 0)
        );
      })
      .catch(() => { });
  }, []);

  const grandTotal = (cartTotal ?? 0) + shippingCost;

  return (
    <div
      className="bg-white rounded-2xl p-6 sticky top-24"
      style={{
        border: "1px solid var(--border-section)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      <h3 className="font-bold text-slate-900 mb-5 pb-4 border-b border-slate-100">
        Récapitulatif
      </h3>
      <div className="space-y-3 text-sm mb-5">
        <div className="flex justify-between text-slate-600">
          <span>Articles ({nbArticles})</span>
          <span className="font-semibold text-slate-900">
            {cartTotal !== null ? `${cartTotal.toFixed(2)} €` : "—"}
          </span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>{shippingLabel ?? "Livraison"}</span>
          <span className="font-semibold text-slate-900">
            {shippingCost === 0 ? "Gratuit" : `${shippingCost.toFixed(2)} €`}
          </span>
        </div>
      </div>
      <Separator className="mb-4" />
      <div className="flex justify-between items-center">
        <span className="font-black text-slate-900">Total TTC</span>
        <span className="text-xl font-black text-blue-600">
          {cartTotal !== null ? `${grandTotal.toFixed(2)} €` : "—"}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        Paiement 100% sécurisé · SSL
      </p>
    </div>
  );
}

/**
 * Page de tunnel de commande multi-étapes.
 *
 * Guide le client à travers 4 étapes séquentielles :
 * 1. **address** : sélection de l'adresse de livraison et de facturation.
 * 2. **shipping** : choix de la méthode de livraison (standard / express / next-day).
 * 3. **payment** : paiement via Stripe (création du PaymentIntent puis confirmation).
 * 4. **confirmation** : résumé final après paiement réussi.
 *
 * La commande est créée en base de données avant le paiement Stripe,
 * puis le stock est décrémenté par le webhook Stripe une fois le paiement confirmé.
 *
 * @returns La page checkout avec l'indicateur d'étapes et la sidebar de résumé.
 */
export default function CheckoutPage() {
  const { clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");
  const [completedSteps, setCompletedSteps] = useState<CheckoutStep[]>([]);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // Stripe-specific state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [commandeId, setCommandeId] = useState<number | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const [state, setState] = useState<CheckoutState>({
    address: null,
    shipping: null,
    payment: null,
    orderNumber: null,
  });

  const advance = (from: CheckoutStep) => {
    setCompletedSteps((prev) => (prev.includes(from) ? prev : [...prev, from]));
    const next = STEP_ORDER[STEP_ORDER.indexOf(from) + 1];
    if (next) setCurrentStep(next);
  };

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1]);
    setStepError(null);
  };

  // Step 1: Address ---------------------------------------------------------
  const handleAddress = (data: AddressData) => {
    setState((prev) => ({ ...prev, address: data }));
    advance("address");
  };

  // Step 2: Shipping ---------------------------------------------------------
  // When user selects shipping and clicks continue:
  //   1. Create the order (commande EN_ATTENTE_PAIEMENT)
  //   2. Create a Stripe PaymentIntent for that order
  //   3. Store the clientSecret → advance to payment step
  const handleShipping = async (method: ShippingMethod) => {
    if (!state.address) return;

    setState((prev) => ({ ...prev, shipping: method }));
    setShippingCost(method.price);
    setStepError(null);
    setIsCreatingOrder(true);

    try {
      // 1. Créer la commande
      const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: state.address,
          shippingId: method.id,
        }),
      });

      const orderJson = await orderRes.json();

      if (!orderRes.ok) {
        if (orderRes.status === 409 && orderJson.items) {
          const names = orderJson.items
            .map((i: { nom_produit?: string; sku: string }) => i.nom_produit ?? i.sku)
            .join(", ");
          setStepError(`Stock insuffisant pour : ${names}.`);
          return;
        }
        setStepError(orderJson.error ?? "Erreur lors de la création de la commande.");
        return;
      }

      const newCommandeId: number = orderJson.commandeId;
      setCommandeId(newCommandeId);

      // 2. Créer le PaymentIntent Stripe
      const intentRes = await fetch(`${API_URL}/api/payment/create-intent`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandeId: newCommandeId }),
      });

      const intentJson = await intentRes.json();

      if (!intentRes.ok) {
        setStepError(intentJson.error ?? "Erreur lors de l'initialisation du paiement.");
        return;
      }

      setClientSecret(intentJson.clientSecret);
      advance("shipping");
    } catch {
      setStepError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Step 3: Payment success ------------------------------------------------
  // Stripe has confirmed the payment client-side.
  // The webhook (payment_intent.succeeded) will update the DB on the backend.
  // We reset the cart count immediately so the badge disappears without waiting
  // for the async webhook to fire.
  const handlePaymentSuccess = () => {
    clearCart();
    setState((prev) => ({
      ...prev,
      orderNumber: `ATL-${commandeId}`,
    }));
    advance("payment");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">


      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-2xl font-black text-slate-900 mb-8">
          Finaliser la commande
        </h1>

        <CheckoutSteps currentStep={currentStep} completedSteps={completedSteps} />

        <div
          className={
            currentStep === "confirmation"
              ? "flex justify-center"
              : "grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
          }
        >
          <div
            className={
              currentStep === "confirmation"
                ? "w-full max-w-2xl"
                : "lg:col-span-2"
            }
          >

            {currentStep === "address" && (
              <AddressStep initial={state.address} onNext={handleAddress} />
            )}

            {currentStep === "shipping" && (
              <>
                {stepError && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                    {stepError}
                  </div>
                )}
                <ShippingStep
                  initial={state.shipping}
                  onNext={handleShipping}
                  onBack={goBack}
                  isSubmitting={isCreatingOrder}
                />
              </>
            )}

            {currentStep === "payment" && clientSecret && (
              <PaymentStep
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onBack={goBack}
              />
            )}

            {currentStep === "confirmation" && state.orderNumber && (
              <ConfirmationStep orderNumber={state.orderNumber} />
            )}

          </div>

          {currentStep !== "confirmation" && (
            <div className="lg:col-span-1">
              <OrderSummarySidebar
                shippingCost={shippingCost}
                shippingLabel={state.shipping?.label ?? null}
              />
            </div>
          )}
        </div>
      </main>

    </div>
  );
}