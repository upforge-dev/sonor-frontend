/**
 * Outreach UI Primitives — Shared components for a unified premium feel
 * across all outreach tabs.
 *
 * Uses the Sonor Liquid Glass design system:
 * - GlassCard for surfaces
 * - StatTile for metrics
 * - CSS variables (--brand-primary, --glass-*, --text-*)
 * - Semantic status colors with glass treatment
 */

import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mail, Inbox, Globe, BarChart3, ShieldCheck, SearchCode, PenLine,
  FileText, ListOrdered, Zap, Send, Bell, Target, Users, Settings,
} from 'lucide-react'

// ─── Tab Header Config ──────────────────────────────────────────────────
// Used by OutreachModule to drive ModuleLayout.Header per active tab.

export const TAB_HEADERS = {
  // Email Marketing
  overview:             { title: 'Overview',            subtitle: 'Email marketing performance at a glance' },
  campaigns:            { title: 'Campaigns',           subtitle: 'Create and manage email campaigns' },
  automations:          { title: 'Automations',         subtitle: 'Trigger-based email workflows' },
  transactional:        { title: 'Transactional',       subtitle: 'System and transactional emails' },
  // Cold Outreach
  'drip-dashboard':     { title: 'Drip Dashboard',      subtitle: "Today's send schedule across all mailboxes" },
  mailboxes:            { title: 'Mailboxes',           subtitle: 'Gmail sending identities and schedule profiles' },
  narratives:           { title: 'Narratives',          subtitle: 'Sender personas that steer AI email generation' },
  sequences:            { title: 'Sequences',           subtitle: 'Multi-step cold email campaigns' },
  inbox:                { title: 'Inbox',               subtitle: 'Replies from outreach recipients' },
  discovery:            { title: 'Lead Discovery',      subtitle: 'Find prospects via Bright Data + Signal AI' },
  'outreach-analytics': { title: 'Analytics',           subtitle: 'Outreach performance metrics' },
  verification:         { title: 'Verification',        subtitle: 'Validate email addresses before sending' },
  'landing-pages':      { title: 'Landing Pages',       subtitle: 'Personalized pages for outreach campaigns' },
  // Shared Tools
  templates:            { title: 'Templates',           subtitle: 'Reusable email templates' },
  signatures:           { title: 'Signatures',          subtitle: 'Professional email signatures' },
  'signature-analytics':{ title: 'Signature Analytics', subtitle: 'Track signature link performance' },
  testing:              { title: 'A/B Tests',           subtitle: 'Test email variants for performance' },
  audience:             { title: 'Audience',            subtitle: 'Subscriber lists and segments' },
  // Infrastructure
  'domain-setup':       { title: 'Domain Setup',        subtitle: 'Configure primary and outreach sending domains' },
  domains:              { title: 'Outreach Fleet',      subtitle: 'Cold outreach domain fleet management' },
  compliance:           { title: 'Compliance',          subtitle: 'CAN-SPAM, GDPR, and deliverability' },
  settings:             { title: 'Settings',            subtitle: 'Outreach configuration' },
}

// ─── Status Badge ───────────────────────────────────────────────────────
// Unified glass-style status badges for all outreach modules.

const STATUS_STYLES = {
  // General
  active:       'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  verified:     'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  sent:         'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  delivered:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  clean:        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',

  paused:       'bg-amber-500/10 text-amber-600 border-amber-500/20',
  verifying:    'bg-amber-500/10 text-amber-600 border-amber-500/20',
  scheduled:    'bg-amber-500/10 text-amber-600 border-amber-500/20',
  warming:      'bg-amber-500/10 text-amber-600 border-amber-500/20',

  draft:        'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',
  pending:      'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',
  queued:       'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',
  new:          'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',

  failed:       'bg-red-500/10 text-red-600 border-red-500/20',
  bounced:      'bg-red-500/10 text-red-600 border-red-500/20',
  killed:       'bg-red-500/10 text-red-600 border-red-500/20',
  invalid:      'bg-red-500/10 text-red-600 border-red-500/20',
  complained:   'bg-red-500/10 text-red-600 border-red-500/20',
  listed:       'bg-red-500/10 text-red-600 border-red-500/20',

  // Sentiment
  positive:     'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  negative:     'bg-red-500/10 text-red-600 border-red-500/20',
  neutral:      'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',
  'out-of-office': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  unsubscribe:  'bg-amber-500/10 text-amber-600 border-amber-500/20',

  // Verification risk
  valid:        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  risky:        'bg-amber-500/10 text-amber-600 border-amber-500/20',
  unknown:      'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',

  // Inbox
  read:         'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]',
  unread:       'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
  qualified:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  closed:       'bg-[var(--glass-bg)] text-[var(--text-tertiary)] border-[var(--glass-border)]',

  // Sending
  sending:      'bg-blue-500/10 text-blue-600 border-blue-500/20',
  opened:       'bg-blue-500/10 text-blue-600 border-blue-500/20',
  clicked:      'bg-purple-500/10 text-purple-600 border-purple-500/20',
  replied:      'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20',
}

export function OutreachStatusBadge({ status, label, className, ...props }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft
  const displayLabel = label || status?.replace(/_/g, ' ').replace(/-/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
        style,
        className,
      )}
      {...props}
    >
      {displayLabel}
    </span>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────

export function OutreachEmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <GlassCard className={cn('text-center py-16 px-6', className)}>
      {Icon && (
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
          <Icon className="h-7 w-7 text-white" />
        </div>
      )}
      {title && <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>}
      {description && <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">{description}</p>}
      {action}
    </GlassCard>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────

export function OutreachSectionHeader({ icon: Icon, title, children, className }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-[var(--text-secondary)]" />}
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Loading State (Sonor frequency bars) ───────────────────────────────

import { SonorSpinner } from '@/components/SonorLoading'
export { SonorSpinner }

export function OutreachLoading({ label } = {}) {
  return (
    <div className="flex items-center justify-center py-24">
      <SonorSpinner size="md" label={label} />
    </div>
  )
}

// ─── Glass tile base (for custom cards that aren't GlassCard) ───────────

export const GLASS_TILE = [
  'rounded-[var(--radius-xl)]',
  'bg-[var(--glass-bg)]',
  'backdrop-blur-[var(--blur-lg)]',
  'border border-[var(--glass-border)]',
  'shadow-[var(--shadow-glass)]',
].join(' ')

export const GLASS_TILE_HOVER = `${GLASS_TILE} hover:border-[var(--glass-border-strong)] hover:shadow-[var(--shadow-glass-elevated)] transition-all duration-200`
