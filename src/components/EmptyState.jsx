/**
 * EmptyState - Branded empty state component with optional CTA
 *
 * Variants: EmptyState (default), EmptyState.List, EmptyState.Card, EmptyState.Table
 * Use List/Card/Table for consistent icon + CTA in list/card/table layouts.
 *
 * Usage:
 *   <EmptyState icon={FolderOpen} title="No projects yet" description="..." actionLabel="View Proposals" onAction={...} />
 *   <EmptyState.List icon={Receipt} title="No invoices yet" actionLabel="Create Invoice" onAction={...} />
 */

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const variantStyles = {
  default: { wrapper: '', iconSize: 'p-6', iconClass: 'h-12 w-12' },
  list: { wrapper: 'py-12', iconSize: 'p-4', iconClass: 'h-10 w-10' },
  card: { wrapper: 'py-10', iconSize: 'p-5', iconClass: 'h-11 w-11' },
  table: { wrapper: 'py-8', iconSize: 'p-3', iconClass: 'h-9 w-9' },
}

function dispatchEchoPrompt(prompt) {
  window.dispatchEvent(
    new CustomEvent('open-echo', {
      detail: {
        context: `empty-state:${encodeURIComponent(prompt.slice(0, 80))}`,
        prefill: prompt,
        path: window.location.pathname,
      },
    })
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  compact = false,
  variant = 'default', // 'default' | 'list' | 'card' | 'table'
  echoPrompt,
  echoActions,
}) {
  const buttonLabel = action?.label || actionLabel
  const buttonOnClick = action?.onClick || onAction
  const styleKey = compact ? 'table' : variant
  const styles = variantStyles[styleKey] || variantStyles.default

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 text-center ${compact ? 'py-8' : styles.wrapper}`}
      role="status"
      aria-label={title}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[var(--brand-primary)]/20 rounded-full blur-xl" />
        <div className={`relative rounded-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] ${styles.iconSize}`}>
          {Icon && <Icon className={`${styles.iconClass} text-[var(--text-secondary)]`} />}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      {description && (
        <p className={`text-sm text-[var(--text-secondary)] max-w-md leading-relaxed ${compact ? 'mb-4' : 'mb-8'}`}>
          {description}
        </p>
      )}

      {buttonLabel && buttonOnClick && (
        <Button onClick={buttonOnClick} variant="glass-primary" aria-label={buttonLabel}>
          {buttonLabel}
        </Button>
      )}

      {/* Echo action buttons */}
      {echoActions && echoActions.length > 0 ? (
        <div className={`flex flex-wrap items-center justify-center gap-2 ${buttonLabel && buttonOnClick ? 'mt-3' : ''}`}>
          {echoActions.map((echoAction, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="gap-1.5"
              style={{
                color: 'var(--brand-primary)',
                borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
              }}
              onClick={() => dispatchEchoPrompt(echoAction.prompt)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {echoAction.label}
            </Button>
          ))}
        </div>
      ) : echoPrompt ? (
        <div className={buttonLabel && buttonOnClick ? 'mt-3' : ''}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            style={{
              color: 'var(--brand-primary)',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
            }}
            onClick={() => dispatchEchoPrompt(echoPrompt)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask Echo
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Compact empty state for list views (e.g. sidebar lists, simple lists) */
function EmptyStateList(props) {
  return <EmptyState {...props} variant="list" />
}

/** Empty state for card content (e.g. dashboard cards, card body) */
function EmptyStateCard(props) {
  return <EmptyState {...props} variant="card" />
}

/** Compact empty state for table body (no full-width hero) */
function EmptyStateTable(props) {
  return <EmptyState {...props} variant="table" compact />
}

EmptyState.List = EmptyStateList
EmptyState.Card = EmptyStateCard
EmptyState.Table = EmptyStateTable

export default EmptyState
