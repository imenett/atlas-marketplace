/**
 * @file components/ui/Card.tsx
 * @description Composant de carte générique avec ombre et bordure standardisées.
 */
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Carte de mise en page avec ombre et bordure CSS variables.
 * @param {CardProps} props
 */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl overflow-hidden ${className}`}
      style={{
        border: "1px solid var(--border-section)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      {children}
    </div>
  );
}
