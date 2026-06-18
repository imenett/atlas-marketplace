/**
 * @file components/ui/Textarea.tsx
 * @description Zone de texte multiligne stylisée, redimensionnable verticalement.
 */
import { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`flex min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary-indigo focus:border-transparent transition-colors resize-y ${className}`}
      {...props}
    />
  );
}
