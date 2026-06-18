"use client";

/**
 * @file components/ui/separator.tsx
 * @description Séparateur horizontal ou vertical basé sur Radix UI Separator.
 */
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

function Separator({
  className = "",
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={`shrink-0 bg-gray-200 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px ${className}`}
      {...props}
    />
  );
}

export { Separator };
