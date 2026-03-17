/**
 * EchoActions — Interactive action buttons inside Echo message bubbles.
 *
 * Parses JSON action definitions from ```actions code blocks.
 * Supports multiple action types:
 *   - default: Sends a message (like suggestion chips, but inline)
 *   - oauth: Opens OAuth popup for a provider
 *   - navigate: Navigates to a path within the app
 *   - copy: Copies a value to clipboard
 *   - input: Inline input field with submit
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Plug,
  Send,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ActionDefinition {
  /** Unique action id (used as callback payload) */
  id: string
  /** Display label */
  label: string
  /** Optional description below label */
  description?: string
  /** Visual style */
  style?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Action type — determines click behavior */
  type?: 'default' | 'oauth' | 'navigate' | 'copy' | 'input'
  /** For 'oauth': provider name (e.g. 'google', 'netlify') */
  provider?: string
  /** For 'navigate': app path (e.g. '/seo') */
  path?: string
  /** For 'copy': value to copy to clipboard */
  value?: string
  /** For 'input': placeholder text */
  placeholder?: string
  /** For 'default': message to send when clicked */
  prompt?: string
  /** Optional icon name */
  icon?: string
}

export interface ActionsGroupDefinition {
  /** Optional heading above the actions */
  title?: string
  /** Layout: 'row' (default) or 'stack' */
  layout?: 'row' | 'stack'
  /** The action buttons */
  actions: ActionDefinition[]
}

interface EchoActionsProps {
  definition: ActionsGroupDefinition
  /** Callback when a default action is clicked (sends message) */
  onAction?: (actionId: string, prompt?: string) => void
  /** Callback for OAuth actions (opens popup) */
  onOAuth?: (provider: string) => void
  className?: string
}

// ─────────────────────────────────────────────────────────────
// Style Maps
// ─────────────────────────────────────────────────────────────

const STYLE_MAP = {
  primary: cn(
    'bg-[var(--brand-primary)] text-white',
    'hover:bg-[var(--brand-primary)]/90',
    'shadow-sm',
  ),
  secondary: cn(
    'bg-[var(--surface-secondary)] text-[var(--text-primary)]',
    'hover:bg-[var(--surface-tertiary)]',
    'border border-[var(--glass-border)]/50',
  ),
  ghost: cn(
    'text-[var(--text-secondary)]',
    'hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]',
  ),
  danger: cn(
    'bg-red-500/10 text-red-500',
    'hover:bg-red-500/20',
    'border border-red-500/20',
  ),
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  external: ExternalLink,
  copy: Copy,
  arrow: ArrowRight,
  plug: Plug,
  send: Send,
  sparkles: Sparkles,
  chevron: ChevronRight,
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function EchoActions({ definition, onAction, onOAuth, className }: EchoActionsProps) {
  const { title, layout = 'row', actions } = definition
  const navigate = useNavigate()

  if (!actions?.length) return null

  return (
    <div className={cn('my-3', className)}>
      {title && (
        <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">{title}</div>
      )}
      <div
        className={cn(
          'flex gap-2',
          layout === 'stack' ? 'flex-col' : 'flex-wrap',
        )}
      >
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            onAction={onAction}
            onOAuth={onOAuth}
            onNavigate={(path) => navigate(path)}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Individual Action Button
// ─────────────────────────────────────────────────────────────

function ActionButton({
  action,
  onAction,
  onOAuth,
  onNavigate,
}: {
  action: ActionDefinition
  onAction?: (actionId: string, prompt?: string) => void
  onOAuth?: (provider: string) => void
  onNavigate?: (path: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const style = action.style || 'secondary'
  const IconComponent = action.icon ? ICON_MAP[action.icon] : null

  // Copy action
  if (action.type === 'copy' && action.value) {
    return (
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(action.value!)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          STYLE_MAP[style],
        )}
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied!' : action.label}
      </button>
    )
  }

  // Input action
  if (action.type === 'input') {
    return (
      <div className="flex items-center gap-2 w-full max-w-sm">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={action.placeholder || 'Enter value...'}
          disabled={submitted}
          className={cn(
            'flex-1 px-3 py-2 rounded-lg text-sm',
            'bg-[var(--surface-secondary)] text-[var(--text-primary)]',
            'border border-[var(--glass-border)]/50',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30',
            'placeholder:text-[var(--text-tertiary)]',
            submitted && 'opacity-60',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim()) {
              setSubmitted(true)
              onAction?.(action.id, inputValue.trim())
            }
          }}
        />
        <button
          type="button"
          disabled={!inputValue.trim() || submitted}
          onClick={() => {
            if (inputValue.trim()) {
              setSubmitted(true)
              onAction?.(action.id, inputValue.trim())
            }
          }}
          className={cn(
            'p-2 rounded-lg transition-all duration-150',
            STYLE_MAP.primary,
            (!inputValue.trim() || submitted) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {submitted ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    )
  }

  // OAuth action
  if (action.type === 'oauth' && action.provider) {
    return (
      <button
        type="button"
        onClick={() => onOAuth?.(action.provider!)}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          STYLE_MAP.primary,
        )}
      >
        <Plug className="h-4 w-4" />
        {action.label}
      </button>
    )
  }

  // Navigate action
  if (action.type === 'navigate' && action.path) {
    return (
      <button
        type="button"
        onClick={() => onNavigate?.(action.path!)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          STYLE_MAP[style],
        )}
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
        {action.label}
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      </button>
    )
  }

  // Default action (sends a message via onAction callback)
  return (
    <button
      type="button"
      onClick={() => onAction?.(action.id, action.prompt || action.label)}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        STYLE_MAP[style],
      )}
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      {action.label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Extractor (follows same pattern as EchoChart, EchoStatCards)
// ─────────────────────────────────────────────────────────────

export function extractActions(text: string): {
  actionsGroups: ActionsGroupDefinition[]
  cleanText: string
} {
  const actionsGroups: ActionsGroupDefinition[] = []
  const cleanText = text.replace(/```actions\s*\n([\s\S]*?)```/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim())
      // Support both { actions: [...] } and bare array [...]
      if (Array.isArray(parsed)) {
        actionsGroups.push({ actions: parsed })
        return ''
      }
      if (parsed.actions && Array.isArray(parsed.actions)) {
        actionsGroups.push(parsed)
        return ''
      }
    } catch { /* ignore malformed */ }
    return _
  })
  return { actionsGroups, cleanText }
}
