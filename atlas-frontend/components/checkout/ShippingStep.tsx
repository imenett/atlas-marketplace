"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShippingMethod, SHIPPING_METHODS } from "@/lib/checkout";

/** Props du composant ShippingStep. */
interface ShippingStepProps {
  /** Mode de livraison pré-sélectionné (depuis une étape précédente), ou `null` pour le défaut "standard". */
  initial?: ShippingMethod | null;
  /** Appelé avec le mode de livraison choisi pour passer à l'étape de paiement. */
  onNext: (method: ShippingMethod) => void;
  /** Appelé pour revenir à l'étape d'adresse. */
  onBack: () => void;
  /** Si `true`, désactive les boutons pendant la création de la commande côté serveur. */
  isSubmitting?: boolean;
}

/**
 * Étape 2 du tunnel de commande : choix du mode de livraison.
 *
 * Affiche les modes de livraison disponibles (définis dans `SHIPPING_METHODS`) sous forme
 * de boutons radio. La sélection est mémorisée localement ; un clic sur "Continuer" appelle
 * `onNext` avec le mode sélectionné.
 *
 * @param initial - Mode de livraison pré-sélectionné, ou `null` pour "standard" par défaut.
 * @param onNext - Callback appelé avec le mode choisi pour passer au paiement.
 * @param onBack - Callback pour revenir à l'adresse de livraison.
 * @param isSubmitting - Bloque les boutons pendant la création de commande en cours.
 */
export function ShippingStep({ initial, onNext, onBack, isSubmitting }: ShippingStepProps) {
  const [selected, setSelected] = useState<ShippingMethod["id"]>(
    initial?.id ?? "standard"
  );

  const handleNext = () => {
    const method = SHIPPING_METHODS.find((m) => m.id === selected)!;
    onNext(method);
  };

  return (
    <div
      className="bg-white rounded-2xl p-8"
      style={{ border: "1px solid var(--border-section)", boxShadow: "var(--shadow-elevated)" }}
    >
      <h2 className="text-xl font-bold text-slate-900 mb-6">Mode de livraison</h2>

      <RadioGroup
        value={selected}
        onValueChange={(v) => setSelected(v as ShippingMethod["id"])}
        className="space-y-3"
      >
        {SHIPPING_METHODS.map((method) => {
          const isSelected = selected === method.id;
          return (
            <label
              key={method.id}
              htmlFor={method.id}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <RadioGroupItem value={method.id} id={method.id} />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 text-sm">{method.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{method.description}</div>
              </div>
              <div
                className={`font-bold text-sm ${
                  isSelected ? "text-blue-600" : "text-slate-700"
                }`}
              >
                {method.price === 0 ? "Gratuit" : `${method.price.toFixed(2)} €`}
              </div>
            </label>
          );
        })}
      </RadioGroup>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl transition-all text-sm disabled:opacity-50"
        >
          ← Retour
        </button>
        <button
          onClick={handleNext}
          disabled={isSubmitting}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Création de la commande…" : "Continuer vers le paiement →"}
        </button>
      </div>
    </div>
  );
}