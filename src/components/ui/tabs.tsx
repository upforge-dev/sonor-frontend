"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex min-h-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] inline-flex h-10 w-fit items-center justify-center rounded-[var(--radius-lg)] p-1 gap-1",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-[var(--shadow-sm)] data-[state=active]:backdrop-blur-[var(--blur-sm)] focus-visible:ring-[var(--accent-primary)]/30 text-[var(--text-secondary)] inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:text-[var(--text-primary)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 min-h-0 overflow-hidden outline-none",
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
