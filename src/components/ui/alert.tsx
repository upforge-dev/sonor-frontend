import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[var(--radius-lg)] border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current backdrop-blur-[var(--blur-sm)] transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)]",
        destructive:
          "text-[var(--accent-red)] bg-[var(--accent-red)]/10 border-[var(--accent-red)]/20 [&>svg]:text-current *:data-[slot=alert-description]:text-[var(--accent-red)]/80",
        success:
          "text-[var(--accent-green)] bg-[var(--accent-green)]/10 border-[var(--accent-green)]/20 [&>svg]:text-current *:data-[slot=alert-description]:text-[var(--accent-green)]/80",
        warning:
          "text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/20 [&>svg]:text-current *:data-[slot=alert-description]:text-[var(--accent-orange)]/80",
        info:
          "text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/20 [&>svg]:text-current *:data-[slot=alert-description]:text-[var(--accent-blue)]/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props} />
  );
}

function AlertTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props} />
  );
}

function AlertDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-[var(--text-secondary)] col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription }
