"use client";

import { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

/** Instance Stripe initialisée une seule fois avec la clé publique de l'environnement. */
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

/**
 * Configuration de l'apparence du formulaire Stripe.
 * Adapte les couleurs, polices et bordures au design system clair de l'application.
 */
const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary:       "#2563eb",
    colorBackground:    "#ffffff",
    colorText:          "#0f172a",
    colorDanger:        "#ef4444",
    fontFamily:         "inherit",
    borderRadius:       "12px",
    spacingUnit:        "4px",
  },
  rules: {
    ".Input": {
      border:    "1px solid #e2e8f0",
      boxShadow: "none",
      padding:   "10px 14px",
    },
    ".Input:focus": {
      border:    "1px solid #2563eb",
      boxShadow: "0 0 0 3px rgba(37,99,235,0.1)",
    },
    ".Label": {
      fontSize:   "13px",
      fontWeight: "500",
      color:      "#475569",
    },
  },
};

/** Props du formulaire interne Stripe, rendu à l'intérieur du provider `<Elements>`. */
interface StripeFormProps {
  /** Appelé quand le paiement est confirmé avec succès côté client. */
  onSuccess: () => void;
  /** Appelé pour revenir à l'étape précédente (livraison). */
  onBack:    () => void;
}

/**
 * Formulaire de paiement interne utilisant les hooks Stripe (`useStripe`, `useElements`).
 * Doit être rendu à l'intérieur d'un provider `<Elements>`.
 *
 * Soumet le paiement via `stripe.confirmPayment()` avec `redirect: "if_required"` pour
 * éviter une redirection sur les paiements par carte standard.
 *
 * @param onSuccess - Callback déclenché si le paiement réussit.
 * @param onBack - Callback pour retourner à l'étape de livraison.
 */
function StripeForm({ onSuccess, onBack }: StripeFormProps) {
  const stripe   = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      // redirect: "if_required" keeps the user on the page for card payments
      // (no redirect needed for standard cards)
      confirmParams: {
        return_url: `${window.location.origin}/checkout`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Paiement échoué. Veuillez réessayer.");
      setIsProcessing(false);
      return;
    }

    // Payment succeeded client-side — parent will call /api/orders/:id/confirm
    // via the webhook on the backend (payment_intent.succeeded)
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {errorMessage && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl transition-all text-sm disabled:opacity-50"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !stripe}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Lock className="h-4 w-4" />
          {isProcessing ? "Traitement en cours…" : "Confirmer le paiement"}
        </button>
      </div>
    </div>
  );
}

/** Props du composant public PaymentStep. */
interface PaymentStepProps {
  /** Secret client Stripe (`pi_xxx_secret_xxx`) fourni par le backend pour initialiser le formulaire. */
  clientSecret: string;
  /** Appelé quand le paiement est confirmé avec succès. */
  onSuccess:    () => void;
  /** Appelé pour revenir à l'étape de livraison. */
  onBack:       () => void;
}

/**
 * Étape 3 du tunnel de commande : paiement via Stripe.
 *
 * Initialise le provider Stripe `<Elements>` avec le `clientSecret` reçu du backend,
 * puis rend le formulaire `StripeForm`. Affiche un badge "Paiement sécurisé" dans l'en-tête.
 *
 * @param clientSecret - Secret client Stripe pour le PaymentIntent en cours.
 * @param onSuccess - Callback déclenché après confirmation du paiement.
 * @param onBack - Callback pour retourner à l'étape précédente.
 */
export function PaymentStep({ clientSecret, onSuccess, onBack }: PaymentStepProps) {
  return (
    <div
      className="bg-white rounded-2xl p-8"
      style={{
        border:     "1px solid var(--border-section)",
        boxShadow:  "var(--shadow-elevated)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">Paiement</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
          <span>Paiement sécurisé</span>
        </div>
      </div>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: STRIPE_APPEARANCE,
        }}
      >
        <StripeForm onSuccess={onSuccess} onBack={onBack} />
      </Elements>
    </div>
  );
}