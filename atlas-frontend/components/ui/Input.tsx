/**
 * @file components/ui/Input.tsx
 * @description Champ de saisie stylisé avec anneau de focus indigo.
 */
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * Champ de saisie HTML stylisé. Accepte toutes les props natives `<input>`.
 * @param {InputProps} props - Props natives HTMLInputElement + className optionnel
 */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-indigo focus:border-transparent transition-colors ${className}`}
      {...props}
    />
  );
}
