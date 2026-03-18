// src/components/ai/NaturalLanguageFilter.tsx
// Reusable natural-language filter toggle for CRM, SEO, Analytics, Blog, and Forms.
// Rendered only for full_signal plan users (canUseNaturalLanguage gate).
// Usage: place next to existing search/filter inputs, pass module key + callback.

import { useState, useCallback } from 'react'
import { Sparkles, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSignalTier } from '@/hooks/useSignalTier'
import { echoApi } from '@/lib/signal-api'

export interface NaturalLanguageFilterProps {
  /** Module key forwarded to Echo so it can apply the right resolver (crm, seo, analytics, blog, forms) */
  module: string
  /** Callback fired with structured filter object after successful resolution */
  onFiltersResolved: (filters: Record<string, any>) => void
  /** Additional class names for the wrapper */
  className?: string
  /** Input placeholder text */
  placeholder?: string
}

export function NaturalLanguageFilter({
  module,
  onFiltersResolved,
  className,
  placeholder,
}: NaturalLanguageFilterProps) {
  const { canUseNaturalLanguage } = useSignalTier()
  const [isNLMode, setIsNLMode] = useState(false)
  const [query, setQuery] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isActive, setIsActive] = useState(false)

  const resolveFilter = useCallback(async () => {
    if (!query.trim()) return
    setIsResolving(true)
    try {
      const result = await echoApi.command(
        `Filter ${module}: ${query}`,
        { module },
      )
      if (result?.action?.filters) {
        onFiltersResolved(result.action.filters)
        setIsActive(true)
      } else {
        // No structured filters returned — still mark active so user sees feedback
        onFiltersResolved({})
        setIsActive(true)
      }
    } catch (err) {
      console.error('[NaturalLanguageFilter] Resolution failed:', err)
    } finally {
      setIsResolving(false)
    }
  }, [query, module, onFiltersResolved])

  const clearNL = useCallback(() => {
    setQuery('')
    setIsActive(false)
    setIsNLMode(false)
    onFiltersResolved({})
  }, [onFiltersResolved])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        resolveFilter()
      }
      if (e.key === 'Escape') {
        clearNL()
      }
    },
    [resolveFilter, clearNL],
  )

  // Hidden for non-full_signal plans
  if (!canUseNaturalLanguage) return null

  // Collapsed toggle button
  if (!isNLMode) {
    return (
      <button
        type="button"
        onClick={() => setIsNLMode(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
          'text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]',
          'bg-[var(--surface-secondary)] hover:bg-[var(--brand-primary)]/10',
          'border border-transparent hover:border-[var(--brand-primary)]/20',
          'transition-all duration-200',
          className,
        )}
        title="Filter using natural language (Full Signal)"
      >
        <Sparkles className="h-3 w-3" />
        <span>AI Filter</span>
      </button>
    )
  }

  // Expanded input
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg min-w-[220px]',
        'bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20',
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)] shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Describe what you're looking for…"}
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      {isResolving ? (
        <Loader2 className="h-3.5 w-3.5 text-[var(--brand-primary)] animate-spin shrink-0" />
      ) : isActive ? (
        <span className="text-[10px] font-medium text-[var(--brand-primary)] shrink-0 select-none">
          Active
        </span>
      ) : null}
      <button
        type="button"
        onClick={clearNL}
        className="p-0.5 rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        title="Clear AI filter"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
