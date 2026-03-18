import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className = '',
  type = 'text',
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex h-10 w-full min-w-0 rounded-[var(--radius-sm)] px-3 py-2 text-base md:text-sm",
        "bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]",
        "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
        // Transitions
        "transition-all duration-200",
        // Focus state - glass glow
        "focus:outline-none focus:bg-[var(--glass-bg)] focus:border-[var(--brand-primary)]",
        "focus:ring-2 focus:ring-[var(--brand-primary)]/20",
        // Selection
        "selection:bg-[var(--brand-primary)] selection:text-white",
        // File input
        "file:border-0 file:bg-[var(--glass-bg)] file:text-[var(--text-primary)]",
        "file:text-sm file:font-medium file:mr-3 file:px-3 file:py-1 file:rounded-[var(--radius-xs)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state
        "aria-invalid:border-[var(--accent-red)] aria-invalid:ring-2 aria-invalid:ring-[var(--accent-red)]/20",
        className
      )}
      {...props} />
  );
}

export { Input }
