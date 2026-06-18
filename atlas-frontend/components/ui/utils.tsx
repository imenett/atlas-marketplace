/**
 * @file components/ui/utils.tsx
 * @description Utilitaire de composition de classes Tailwind CSS.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind CSS en résolvant les conflits.
 * Combine `clsx` (conditionnalité) et `tailwind-merge` (déduplication).
 * @param {...ClassValue} inputs - Classes CSS conditionnelles ou statiques
 * @returns {string} Chaîne de classes CSS fusionnée sans conflits
 * @example cn("px-2 py-1", isActive && "bg-blue-500", "px-4") // → "py-1 bg-blue-500 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}