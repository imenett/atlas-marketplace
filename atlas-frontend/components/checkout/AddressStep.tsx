"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AddressData } from "@/lib/checkout";

/** Props du composant AddressStep. */
interface AddressStepProps {
  /** Données d'adresse pré-remplies (depuis le profil utilisateur), ou null pour un formulaire vide. */
  initial?: AddressData | null;
  /** Appelé avec les données validées quand l'utilisateur clique sur "Continuer". */
  onNext: (data: AddressData) => void;
}

/** Valeurs initiales vides du formulaire d'adresse. */
const EMPTY: AddressData = {
  firstName: "",
  lastName: "",
  address: "",
  postalCode: "",
  city: "",
  phone: "",
};

/**
 * Étape 1 du tunnel de commande : saisie de l'adresse de livraison.
 *
 * Affiche un formulaire avec prénom, nom, adresse, code postal, ville et téléphone.
 * Valide que tous les champs sont remplis avant d'appeler `onNext` avec les données.
 *
 * @param initial - Adresse pré-remplie (depuis le profil) ou `null` pour un formulaire vide.
 * @param onNext - Callback appelé avec l'adresse validée pour passer à l'étape suivante.
 */
export function AddressStep({ initial, onNext }: AddressStepProps) {
  const [form, setForm] = useState<AddressData>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Partial<AddressData>>({});

  const update = (field: keyof AddressData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<AddressData> = {};
    if (!form.firstName.trim()) newErrors.firstName = "Requis";
    if (!form.lastName.trim()) newErrors.lastName = "Requis";
    if (!form.address.trim()) {
      newErrors.address = "Requis";
    } else if (form.address.trim().length < 5) {
      newErrors.address = "Adresse trop courte";
    }
    if (!form.postalCode.trim()) {
      newErrors.postalCode = "Requis";
    } else if (!/^\d{5}$/.test(form.postalCode.trim())) {
      newErrors.postalCode = "5 chiffres requis";
    }
    if (!form.city.trim()) newErrors.city = "Requis";
    if (!form.phone.trim()) {
      newErrors.phone = "Requis";
    } else if (form.phone.replace(/[\s\+\-\.]/g, "").length < 8) {
      newErrors.phone = "Numéro trop court";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onNext(form);
  };

  return (
    <div
      className="bg-white rounded-2xl p-8"
      style={{ border: "1px solid var(--border-section)", boxShadow: "var(--shadow-elevated)" }}
    >
      <h2 className="text-xl font-bold text-slate-900 mb-6">Adresse de livraison</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prénom" error={errors.firstName} required>
            <Input
              placeholder="Jean"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className={errors.firstName ? "border-red-400" : ""}
            />
          </Field>
          <Field label="Nom" error={errors.lastName} required>
            <Input
              placeholder="Dupont"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className={errors.lastName ? "border-red-400" : ""}
            />
          </Field>
        </div>

        <Field label="Adresse" error={errors.address} required>
          <Input
            placeholder="123 Rue de la Paix"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className={errors.address ? "border-red-400" : ""}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Code postal" error={errors.postalCode} required>
            <Input
              placeholder="75001"
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
              className={errors.postalCode ? "border-red-400" : ""}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Ville" error={errors.city} required>
              <Input
                placeholder="Paris"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={errors.city ? "border-red-400" : ""}
              />
            </Field>
          </div>
        </div>

        <Field label="Téléphone" error={errors.phone} required>
          <Input
            type="tel"
            placeholder="+33 6 12 34 56 78"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={errors.phone ? "border-red-400" : ""}
          />
        </Field>

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition-all mt-2"
        >
          Continuer vers la livraison →
        </button>
      </div>
    </div>
  );
}

/**
 * Conteneur de champ de formulaire avec étiquette et message d'erreur optionnel.
 *
 * @param label - Texte de l'étiquette affiché au-dessus du champ.
 * @param error - Message d'erreur de validation affiché en rouge sous le champ.
 * @param children - L'élément de saisie (Input, Select…).
 */
function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
