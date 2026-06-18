"use client";

/**
 * @file components/ui/radio-group.tsx
 * @description Groupe de boutons radio accessible basé sur Radix UI RadioGroup.
 * Exports : RadioGroup (conteneur), RadioGroupItem (option individuelle).
 */
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

function RadioGroup({
  className = "",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      className={`grid gap-3 ${className}`}
      {...props}
    />
  );
}

function RadioGroupItem({
  className = "",
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={`aspect-square h-4 w-4 shrink-0 rounded-full border border-gray-300 bg-white shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 ${className}`}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
