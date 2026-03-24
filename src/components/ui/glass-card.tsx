import * as React from "react"
import { cn } from "@/lib/utils"

const glassCardVariants = {
  default: `
      bg-[var(--glass-bg)]
      backdrop-blur-[var(--blur-lg)]
      border border-[var(--glass-border)]
      shadow-[var(--shadow-glass)]
    `,
  elevated: `
      bg-[var(--glass-bg-elevated)]
      backdrop-blur-[var(--blur-xl)]
      border border-[var(--glass-border)]
      shadow-[var(--shadow-glass-elevated)]
    `,
  inset: `
      bg-[var(--glass-bg-inset)]
      border border-[var(--glass-border)]
    `,
  outline: `
      bg-transparent
      border border-[var(--glass-border-strong)]
    `,
} as const

type GlassCardVariant = keyof typeof glassCardVariants

export type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: GlassCardVariant
  hover?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    { className, variant = "default", hover = false, ...props },
    ref,
  ) => {
    const hoverStyles = hover
      ? `
    transition-all duration-200 ease-out
    hover:bg-[var(--glass-bg-hover)]
    hover:shadow-[var(--shadow-lg)]
    hover:-translate-y-0.5
    cursor-pointer
  `
      : ""

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-xl)]",
          glassCardVariants[variant],
          hoverStyles,
          className,
        )}
        {...props}
      />
    )
  },
)
GlassCard.displayName = "GlassCard"

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
    {...props}
  />
))
GlassCardHeader.displayName = "GlassCardHeader"

const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-[var(--text-primary)]",
      className,
    )}
    {...props}
  />
))
GlassCardTitle.displayName = "GlassCardTitle"

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--text-secondary)]", className)}
    {...props}
  />
))
GlassCardDescription.displayName = "GlassCardDescription"

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GlassCardContent.displayName = "GlassCardContent"

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-4 border-t border-[var(--glass-border)]",
      className,
    )}
    {...props}
  />
))
GlassCardFooter.displayName = "GlassCardFooter"

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
}
