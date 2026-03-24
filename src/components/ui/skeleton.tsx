import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-[var(--glass-bg-inset)] animate-pulse rounded-[var(--radius-md)]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
