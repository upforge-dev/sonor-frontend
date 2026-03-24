import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20",
        secondary:
          "bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] border border-[var(--glass-border)]",
        destructive:
          "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/20",
        success:
          "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/20",
        warning:
          "bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border border-[var(--accent-orange)]/20",
        info:
          "bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20",
        outline:
          "text-[var(--text-primary)] border border-[var(--glass-border-strong)] bg-transparent",
        glass:
          "bg-[var(--glass-bg)] backdrop-blur-[var(--blur-sm)] text-[var(--text-primary)] border border-[var(--glass-border)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
