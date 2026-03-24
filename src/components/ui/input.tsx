import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[var(--radius-sm)] px-3 py-2 text-base md:text-sm",
        "bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]",
        "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
        "transition-all duration-200",
        "focus:outline-none focus:bg-[var(--glass-bg)] focus:border-[var(--brand-primary)]",
        "focus:ring-2 focus:ring-[var(--brand-primary)]/20",
        "selection:bg-[var(--brand-primary)] selection:text-white",
        "file:border-0 file:bg-[var(--glass-bg)] file:text-[var(--text-primary)]",
        "file:text-sm file:font-medium file:mr-3 file:px-3 file:py-1 file:rounded-[var(--radius-xs)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[var(--accent-red)] aria-invalid:ring-2 aria-invalid:ring-[var(--accent-red)]/20",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
