/**
 * WelcomeScreen Component
 * 
 * Empty state shown when no thread is selected or thread has no messages.
 * Features:
 * - Greeting message
 * - Quick action prompts
 */

import { Sparkles, MessageCircle, TrendingUp, FileText, Users, Target, UserPlus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import EchoLogo from '@/components/EchoLogo'

interface Prompt {
  label: string
  prompt: string
  icon?: string
}

export interface WelcomeContext {
  latestInsight?: { type: string; message: string; created_at: string }
  goals?: Array<{ title: string; current_value: number; target_value: number; unit: string; status: string }>
  newLeadCount?: number
}

interface WelcomeScreenProps {
  /** Greeting text */
  greeting?: string
  /** Description text */
  description?: string
  /** Quick action prompts */
  prompts?: Prompt[]
  /** Called when a prompt is clicked */
  onPromptClick?: (prompt: string) => void
  /** Type of chat for appropriate theming */
  chatType?: 'echo' | 'user' | 'visitor'
  /** Dynamic context from backend */
  dynamicContext?: WelcomeContext | null
  /** Additional className */
  className?: string
}

// Icon mapping for prompts
const ICON_MAP: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  message: MessageCircle,
  trending: TrendingUp,
  search: TrendingUp,
  chart: TrendingUp,
  file: FileText,
  write: FileText,
  users: Users,
}

export function WelcomeScreen({
  greeting = "Hi! How can I help you today?",
  description,
  prompts = [],
  onPromptClick,
  chatType = 'echo',
  dynamicContext,
  className,
}: WelcomeScreenProps) {
  const isEcho = chatType === 'echo'
  const hasDynamicContent = dynamicContext && (
    dynamicContext.latestInsight ||
    (dynamicContext.goals?.length ?? 0) > 0 ||
    (dynamicContext.newLeadCount ?? 0) > 0
  )
  
  return (
    <div className={cn('flex flex-col items-center justify-center h-full p-6 text-center', className)}>
      {/* Logo/Avatar */}
      <div className="mb-6">
        {isEcho ? (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] shadow-xl shadow-[var(--brand-primary)]/20">
            <EchoLogo size={48} animated />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[var(--surface-secondary)] border border-[var(--glass-border)]/50">
            <MessageCircle className="h-10 w-10 text-[var(--text-tertiary)]" />
          </div>
        )}
      </div>
      
      {/* Greeting */}
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {greeting}
      </h2>
      
      {/* Description */}
      {description && (
        <p className="text-[var(--text-secondary)] max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Dynamic context cards */}
      {isEcho && hasDynamicContent && (
        <div className="w-full max-w-lg space-y-2 mb-4">
          {/* New leads badge */}
          {(dynamicContext.newLeadCount ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => onPromptClick?.(`I have ${dynamicContext.newLeadCount} new lead${dynamicContext.newLeadCount! > 1 ? 's' : ''}. Tell me about them.`)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors"
            >
              <UserPlus className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                <strong>{dynamicContext.newLeadCount}</strong> new lead{dynamicContext.newLeadCount! > 1 ? 's' : ''} in the last 24 hours
              </span>
            </button>
          )}

          {/* Active goals */}
          {dynamicContext.goals && dynamicContext.goals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dynamicContext.goals.map((g, i) => {
                const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0
                const isAtRisk = g.status === 'at_risk'
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onPromptClick?.(`Check progress on my "${g.title}" goal`)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors',
                      isAtRisk
                        ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
                        : 'bg-[var(--surface-secondary)] border-[var(--glass-border)]/30 hover:border-[var(--brand-primary)]/40'
                    )}
                  >
                    {isAtRisk ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <Target className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />}
                    <span className="text-[var(--text-primary)]">{g.title}</span>
                    <span className={cn('font-semibold', isAtRisk ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]')}>{pct}%</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Latest insight */}
          {dynamicContext.latestInsight && (
            <button
              type="button"
              onClick={() => onPromptClick?.('Tell me more about this insight: ' + dynamicContext.latestInsight!.message.slice(0, 100))}
              className="flex items-start gap-2.5 w-full px-4 py-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--glass-border)]/30 text-left hover:border-[var(--brand-primary)]/40 transition-colors"
            >
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {dynamicContext.latestInsight.message.slice(0, 150)}{dynamicContext.latestInsight.message.length > 150 ? '...' : ''}
              </span>
            </button>
          )}
        </div>
      )}
      
      {/* Quick prompts */}
      {prompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full mt-4">
          {prompts.map((prompt, index) => {
            const IconComponent = prompt.icon ? ICON_MAP[prompt.icon] || Sparkles : Sparkles
            
            return (
              <button
                key={index}
                onClick={() => onPromptClick?.(prompt.prompt)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200',
                  'bg-[var(--surface-secondary)] border border-[var(--glass-border)]/30',
                  'hover:border-[var(--brand-primary)]/50 hover:bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)]',
                  'group'
                )}
              >
                <div 
                  className="p-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)'
                  }}
                >
                  <IconComponent 
                    className="h-5 w-5 transition-colors" 
                    style={{ color: 'var(--brand-primary)' }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                  {prompt.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
      
      {/* Keyboard hint */}
      <p className="text-xs text-[var(--text-tertiary)] mt-8">
        Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] font-mono">Enter</kbd> to send
        {' · '}
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}
