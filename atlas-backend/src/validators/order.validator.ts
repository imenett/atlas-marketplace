/**
 * @file order.validator.ts
 * @description Validation des données du tunnel de checkout.
 */

export interface AddressInput {
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_SHIPPING_IDS = ["standard", "express", "next-day"] as const;
export type ShippingId = (typeof VALID_SHIPPING_IDS)[number];

export function validateAddress(address: AddressInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!address?.firstName?.trim()) errors.push({ field: "firstName", message: "Prénom requis" });
  if (!address?.lastName?.trim())  errors.push({ field: "lastName",  message: "Nom requis" });
  if (!address?.address?.trim())   errors.push({ field: "address",   message: "Adresse requise" });
  if (!address?.postalCode?.trim()) errors.push({ field: "postalCode", message: "Code postal requis" });
  if (!address?.city?.trim())      errors.push({ field: "city",      message: "Ville requise" });
  if (!address?.phone?.trim())     errors.push({ field: "phone",     message: "Téléphone requis" });

  if (address?.postalCode && !/^\d{5}$/.test(address.postalCode.trim())) {
    errors.push({ field: "postalCode", message: "Code postal invalide (5 chiffres)" });
  }

  return errors;
}

export function validateShippingId(shippingId: string): ValidationError[] {
  if (!shippingId) {
    return [{ field: "shippingId", message: "Mode de livraison requis" }];
  }
  if (!VALID_SHIPPING_IDS.includes(shippingId as ShippingId)) {
    return [{ field: "shippingId", message: "Mode de livraison invalide" }];
  }
  return [];
}

export function validateOrderPayload(body: {
  address: AddressInput;
  shippingId: string;
}): ValidationError[] {
  return [
    ...validateAddress(body.address),
    ...validateShippingId(body.shippingId),
  ];
}