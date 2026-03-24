"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className = '',
  ...props
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-[var(--brand-primary)] data-[state=unchecked]:bg-[var(--glass-bg-inset)] focus-visible:ring-[var(--accent-primary)]/30 inline-flex h-[1.25rem] w-9 shrink-0 items-center rounded-full border border-[var(--glass-border)] shadow-[var(--shadow-sm)] transition-all duration-200 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white shadow-[var(--shadow-sm)] pointer-events-none block size-4 rounded-full ring-0 transition-transform duration-200 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5"
        )} />
    </SwitchPrimitive.Root>
  );
}

export { Switch }
