/**
 * SignalSuggestsPanel — Collapsible panel showing AI-generated suggestions for a module.
 *
 * Fetches suggestions from the Signal API on mount, caches per module,
 * and re-fetches every 15 minutes. Collapse state is persisted per module
 * in localStorage.
 *
 * Plan-gated: Standard-plan users see a single teaser suggestion with an
 * upgrade prompt instead of real data.
 */
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, ChevronDown, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { echoApi } from '@/lib/signal-api'
import { useSignalTier } from '@/hooks/useSignalTier'
import { SignalUpgradePrompt } from '@/components/ai/SignalUpgradePrompt'

interface Suggestion {
  id: string
  type: string
  severity?: 'info' | 'warning' | 'critical'
  title: string
  description: string
  action?: {
    label: string
    prompt: string
  }
}

interface SignalSuggestsPanelProps {
  module: string
  className?: string
  compact?: boolean
}

const STORAGE_KEY_PREFIX = 'signal-suggests-collapsed:'

const severityColors: Record<string, string> = {
  info: 'var(--brand-primary, #3b82f6)',
  warning: '#f59e0b',
  critical: '#ef4444',
}

function getSeverityColor(severity?: string): string {
  return severityColors[severity ?? 'info'] ?? severityColors.info
}

function dispatchEchoPrompt(prompt: string, module: string) {
  window.dispatchEvent(
    new CustomEvent('open-echo', {
      detail: {
        context: `suggestion:${module}`,
        prefill: prompt,
        path: window.location.pathname,
      },
    })
  )
}

export function SignalSuggestsPanel({
  module,
  className,
  compact = false,
}: SignalSuggestsPanelProps) {
  const { canUseSuggestions } = useSignalTier()

  // Collapse state from localStorage
  const storageKey = `${STORAGE_KEY_PREFIX}${module}`
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === 'true'
    } catch {
      return false
    }
  })

  const { data: suggestions = [], status: queryStatus, refetch } = useQuery({
    queryKey: ['signal-suggestions', module],
    queryFn: () => echoApi.getSuggestions(module),
    staleTime: 1000 * 60 * 60 * 24,  // 24 hours
    gcTime: 1000 * 60 * 60 * 24,
    refetchInterval: 1000 * 60 * 60,  // 1 hour
    enabled: canUseSuggestions,
  })

  const status = queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'ready'

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, String(next))
      } catch {
        // Storage full or disabled — ignore
      }
      return next
    })
  }, [storageKey])

  // Plan-gated: show teaser + upgrade for Standard plan
  if (!canUseSuggestions) {
    return (
      <div
        className={cn('rounded-xl p-4', className)}
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Signal Suggests
          </span>
        </div>

        {/* Teaser suggestion (blurred/muted) */}
        <div className="mb-3 opacity-50 pointer-events-none select-none">
          <div className="flex items-start gap-2.5 py-2">
            <div
              className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: severityColors.info }}
            />
            <div className="min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                AI-powered suggestions available
              </p>
              <p
                className="text-xs mt-0.5 line-clamp-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Signal monitors your {module} data and surfaces actionable improvements.
              </p>
            </div>
          </div>
        </div>

        <SignalUpgradePrompt
          feature="Signal Suggestions"
          description={`Get AI-powered ${module} recommendations tailored to your project.`}
          variant="inline"
          requiredTier="limited_ai"
        />
      </div>
    )
  }

  // Loading skeleton
  if (status === 'loading' && suggestions.length === 0) {
    return (
      <div
        className={cn('rounded-xl p-4', className)}
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Signal Suggests
          </span>
        </div>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: 'var(--glass-border)' }}
              />
              <div className="flex-1 space-y-1.5">
                <div
                  className="h-3.5 rounded"
                  style={{
                    background: 'var(--glass-border)',
                    width: `${60 + i * 10}%`,
                  }}
                />
                <div
                  className="h-3 rounded"
                  style={{
                    background: 'var(--glass-border)',
                    width: `${40 + i * 15}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div
        className={cn('rounded-xl p-4', className)}
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Signal Suggests
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Couldn't load suggestions
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--brand-primary)' }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <div
        className={cn('rounded-xl p-4', className)}
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Signal Suggests
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          No suggestions right now. Signal is monitoring.
        </p>
      </div>
    )
  }

  // Populated state
  return (
    <div
      className={cn('rounded-xl overflow-hidden', className)}
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
      }}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex items-center justify-between w-full px-4 py-3 cursor-pointer transition-colors hover:brightness-105"
        style={{ background: 'transparent' }}
      >
        <span className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Signal Suggests
          </span>
          <span
            className="text-xs tabular-nums px-1.5 py-0.5 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
              color: 'var(--brand-primary)',
            }}
          >
            {suggestions.length}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'transition-transform duration-200',
            collapsed && '-rotate-90'
          )}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {/* Suggestion list */}
      {!collapsed && (
        <div className={cn('px-4 pb-3 space-y-1', compact && 'space-y-0.5')}>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start gap-2.5 py-2 group"
            >
              {/* Severity dot */}
              <div
                className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: getSeverityColor(suggestion.severity) }}
              />

              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {suggestion.title}
                </p>

                {!compact && suggestion.description && (
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {suggestion.description}
                  </p>
                )}

                {/* Action button */}
                {suggestion.action && (
                  <button
                    type="button"
                    onClick={() =>
                      dispatchEchoPrompt(suggestion.action!.prompt, module)
                    }
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    <Sparkles size={11} />
                    {suggestion.action.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
