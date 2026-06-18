/**
 * @file lib/checkout.ts
 * @description Types et constantes partagés pour le tunnel d'achat multi-étapes.
 * Utilisé par les composants de checkout et le contexte de commande.
 */

/** Étapes du tunnel d'achat dans leur ordre chronologique */
export type CheckoutStep = "address" | "shipping" | "payment" | "confirmation";

/** Données de l'adresse de livraison saisie par le client */
export interface AddressData {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
}

/** Mode de livraison sélectionnable par le client */
export interface ShippingMethod {
  /** Identifiant unique du mode de livraison */
  id: "standard" | "express" | "next-day";
  /** Libellé affiché dans l'interface */
  label: string;
  /** Description du délai de livraison estimé */
  description: string;
  /** Frais de livraison en euros (0 = gratuit) */
  price: number;
}

/** Données de paiement saisies par le client (usage UI uniquement — le paiement réel passe par Stripe) */
export interface PaymentData {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

/** État global du tunnel d'achat accumulé au fil des étapes */
export interface CheckoutState {
  /** Adresse de livraison choisie à l'étape 1 */
  address: AddressData | null;
  /** Mode de livraison choisi à l'étape 2 */
  shipping: ShippingMethod | null;
  /** Données de paiement (non utilisées pour la confirmation Stripe) */
  payment: PaymentData | null;
  /** Numéro de commande affiché à l'étape de confirmation */
  orderNumber: string | null;
}

/**
 * Liste des modes de livraison disponibles sur Atlas.
 * Les frais sont ajoutés au sous-total lors de la création de commande.
 */
export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "standard",
    label: "Livraison Standard",
    description: "5-7 jours ouvrés",
    price: 0,
  },
  {
    id: "express",
    label: "Livraison Express",
    description: "2-3 jours ouvrés",
    price: 9.99,
  },
  {
    id: "next-day",
    label: "Livraison Lendemain",
    description: "Commandez avant 14h",
    price: 14.99,
  },
];
