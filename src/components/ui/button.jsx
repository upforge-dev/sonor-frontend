import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { UptradeSpinner } from "@/components/UptradeLoading"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-primary)] text-white shadow-md hover:bg-[var(--brand-primary)]/90 hover:shadow-lg",
        destructive:
          "bg-[var(--accent-red)] text-white shadow-md hover:bg-[var(--accent-red-hover)] hover:shadow-lg",
        outline:
          "border border-[var(--glass-border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--glass-bg)] hover:border-[var(--glass-border)]",
        secondary:
          "bg-[var(--glass-bg-inset)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]",
        ghost:
          "text-[var(--text-primary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]",
        link: 
          "text-[var(--brand-primary)] underline-offset-4 hover:underline",
        // Liquid Glass variants
        glass:
          "bg-[var(--glass-bg)] backdrop-blur-[var(--blur-md)] border border-[var(--glass-border)] text-[var(--text-primary)] shadow-[var(--shadow-glass)] hover:bg-[var(--glass-bg-hover)] hover:shadow-[var(--shadow-lg)]",
        "glass-primary":
          "bg-[var(--brand-primary)]/80 backdrop-blur-[var(--blur-md)] border border-[var(--brand-primary)]/30 text-white shadow-[var(--shadow-glass)] hover:bg-[var(--brand-primary)] hover:shadow-[var(--shadow-lg)]",
        "glass-destructive":
          "bg-[var(--accent-red)]/80 backdrop-blur-[var(--blur-md)] border border-[var(--accent-red)]/30 text-white shadow-[var(--shadow-glass)] hover:bg-[var(--accent-red)] hover:shadow-[var(--shadow-lg)]",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-[var(--radius-sm)] gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-[var(--radius-md)] px-6 text-base has-[>svg]:px-4",
        icon: "size-10 rounded-[var(--radius-sm)]",
        "icon-sm": "size-8 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className = '',
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <UptradeSpinner size="sm" className="gap-0 py-0 [&_svg]:m-0 [&_p]:hidden" />
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants }
