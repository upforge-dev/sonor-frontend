import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Send, ArrowRight, UserPlus, Target, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { echoApi } from '@/lib/signal-api'
import EchoLogo from '@/components/EchoLogo'

interface WelcomeContext {
  latestInsight?: { message: string; type: string } | null
  goals?: Array<{ title: string; current_value: number; target_value: number; status: string }> | null
  newLeadCount?: number | null
}

interface DashboardEchoWidgetProps {
  onNavigate?: (section: string) => void
  className?: string
}

export function DashboardEchoWidget({ onNavigate, className }: DashboardEchoWidgetProps) {
  const [context, setContext] = useState<WelcomeContext | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    echoApi.getWelcomeContext()
      .then((ctx: WelcomeContext) => { if (!cancelled) setContext(ctx) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return
    const query = input.trim()
    setInput('')
    onNavigate?.(`messages?tab=echo&prompt=${encodeURIComponent(query)}`)
  }, [input, onNavigate])

  const handleQuickPrompt = useCallback((prompt: string) => {
    onNavigate?.(`messages?tab=echo&prompt=${encodeURIComponent(prompt)}`)
  }, [onNavigate])

  const hasInsight = context?.latestInsight?.message
  const hasLeads = (context?.newLeadCount ?? 0) > 0
  const hasGoals = (context?.goals?.length ?? 0) > 0

  return (
    <div className={cn(
      'rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-sm overflow-hidden',
      className,
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--glass-border)]/50">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
          <EchoLogo size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Echo AI</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Your business assistant</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('messages?tab=echo')}
          className="text-xs flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors"
        >
          Open <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="px-5 py-3 space-y-2.5">
        {isLoading ? (
          <div className="flex items-center gap-2 py-3">
            <div className="w-4 h-4 rounded-full animate-pulse bg-[var(--brand-primary)]/30" />
            <div className="flex-1 h-3 rounded bg-[var(--surface-tertiary)] animate-pulse" />
          </div>
        ) : (
          <>
            {hasLeads && (
              <button
                type="button"
                onClick={() => handleQuickPrompt(`Tell me about the ${context!.newLeadCount} new lead${context!.newLeadCount! > 1 ? 's' : ''}`)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                  <strong>{context!.newLeadCount}</strong> new lead{context!.newLeadCount! > 1 ? 's' : ''} today
                </span>
              </button>
            )}

            {hasGoals && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {context!.goals!.slice(0, 2).map((g, i) => {
                  const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0
                  const isAtRisk = g.status === 'at_risk'
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleQuickPrompt(`Check progress on my "${g.title}" goal`)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-colors',
                        isAtRisk
                          ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
                          : 'bg-[var(--surface-secondary)] border-[var(--glass-border)]/30 hover:border-[var(--brand-primary)]/40'
                      )}
                    >
                      {isAtRisk
                        ? <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                        : <Target className="h-3 w-3 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                      }
                      <span className="text-[var(--text-primary)] truncate max-w-[100px]">{g.title}</span>
                      <span className={cn('font-semibold', isAtRisk ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]')}>{pct}%</span>
                    </button>
                  )
                })}
              </div>
            )}

            {hasInsight && (
              <button
                type="button"
                onClick={() => handleQuickPrompt(`Tell me more about this: ${context!.latestInsight!.message.slice(0, 80)}`)}
                className="flex items-start gap-2 w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--glass-border)]/30 text-left hover:border-[var(--brand-primary)]/40 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {context!.latestInsight!.message.slice(0, 120)}{context!.latestInsight!.message.length > 120 ? '...' : ''}
                </span>
              </button>
            )}

            {!hasInsight && !hasLeads && !hasGoals && (
              <p className="text-xs text-[var(--text-tertiary)] py-2 text-center">
                Ask Echo anything about your business
              </p>
            )}
          </>
        )}
      </div>

      {/* Quick Ask Input */}
      <form onSubmit={handleSubmit} className="px-5 pb-4 pt-1">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Echo..."
            className="w-full pl-3 pr-9 py-2 text-sm rounded-lg bg-[var(--surface-secondary)] border border-[var(--glass-border)]/40 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] disabled:opacity-30 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
