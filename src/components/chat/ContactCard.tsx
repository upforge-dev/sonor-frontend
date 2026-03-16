/**
 * ContactCard — Rich lead/contact cards rendered inside Echo message bubbles.
 *
 * Displays contact info with avatar, key stats, and quick-action buttons.
 * Parsed from ```contact {...}``` code blocks in AI messages.
 */

import { User, Mail, Phone, Building2, Star, Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export interface ContactCardData {
  id?: string
  name: string
  email?: string
  phone?: string
  company?: string
  score?: number
  stage?: string
  source?: string
  lastContact?: string
}

interface ContactCardProps {
  contact: ContactCardData
  onAction?: (action: string, contactId?: string) => void
  className?: string
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-500 bg-emerald-500/10' :
                score >= 50 ? 'text-amber-500 bg-amber-500/10' :
                'text-[var(--text-tertiary)] bg-[var(--surface-tertiary)]'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', color)}>
      <Star className="h-3 w-3" />
      {score}
    </span>
  )
}

export function ContactCard({ contact, onAction, className }: ContactCardProps) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className={cn(
      'my-2 rounded-xl border border-[var(--glass-border)]/40 bg-[var(--surface-secondary)]/60 overflow-hidden',
      className,
    )}>
      <div className="p-3 flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center">
          <span className="text-sm font-bold text-[var(--brand-primary)]">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{contact.name}</span>
            {contact.score != null && <ScoreBadge score={contact.score} />}
          </div>

          {contact.company && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3 w-3 text-[var(--text-tertiary)]" />
              <span className="text-xs text-[var(--text-secondary)]">{contact.company}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--text-tertiary)]">
            {contact.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {contact.stage && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-tertiary)] text-[var(--text-secondary)]">
                {contact.stage}
              </span>
            )}
            {contact.source && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                via {contact.source}
              </span>
            )}
            {contact.lastContact && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(contact.lastContact), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {onAction && (
        <div className="border-t border-[var(--glass-border)]/30 px-3 py-2 flex gap-2">
          <button
            type="button"
            onClick={() => onAction('draft_email', contact.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors"
          >
            <Mail className="h-3 w-3" />
            Draft email
          </button>
          {contact.id && (
            <button
              type="button"
              onClick={() => onAction('view_profile', contact.id)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Extract contact card definitions from message text.
 * Looks for ```contact { ... } ``` code blocks.
 */
export function extractContacts(text: string): { cleanText: string; contacts: ContactCardData[] } {
  const contacts: ContactCardData[] = []
  const cleanText = text.replace(/```contact\s*\n?([\s\S]*?)```/g, (_match, json: string) => {
    try {
      const parsed = JSON.parse(json.trim())
      if (parsed.name) {
        contacts.push(parsed as ContactCardData)
      }
    } catch {
      return _match
    }
    return ''
  }).trim()

  return { cleanText, contacts }
}
