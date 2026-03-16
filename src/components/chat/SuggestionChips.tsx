/**
 * SuggestionChips — Tappable quick-action pills after Echo responses.
 *
 * Parses AI responses for offered actions and renders them as clickable chips.
 * Also supports explicit suggestions provided via SSE metadata.
 */

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SuggestionChip {
  label: string
  prompt: string
}

interface SuggestionChipsProps {
  chips: SuggestionChip[]
  onChipClick: (prompt: string) => void
  className?: string
}

export function SuggestionChips({ chips, onChipClick, className }: SuggestionChipsProps) {
  if (!chips.length) return null

  return (
    <div className={cn('flex flex-wrap gap-2 px-4 py-2', className)}>
      {chips.map((chip, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChipClick(chip.prompt)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
            'hover:bg-[var(--brand-primary)]/20 transition-colors duration-150',
            'border border-[var(--brand-primary)]/20',
          )}
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          {chip.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Parse an AI response to extract offered actions as suggestion chips.
 * Detects patterns like "Want me to...", "I can...", "Should I...", etc.
 */
export function parseSuggestions(text: string): SuggestionChip[] {
  const chips: SuggestionChip[] = []

  const patterns = [
    /(?:want me to|shall i|should i|i can|would you like me to)\s+(.+?)(?:\?|\.)/gi,
    /(?:would you like to)\s+(.+?)(?:\?|\.)/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1].trim()
      if (raw.length < 5 || raw.length > 80) continue

      // Clean up: remove trailing conjunctions
      const clean = raw.replace(/\s+(or|and)\s*$/, '').trim()
      const label = clean.charAt(0).toUpperCase() + clean.slice(1)
      chips.push({ label, prompt: `Yes, ${clean}` })
    }
  }

  // Detect "Send or queue" style binary choices
  const binaryMatch = text.match(/\*\*(Send|Queue|View|Draft|Create|Schedule|Cancel|Approve|Reject)\b[^*]*\*\*\s+or\s+\*\*(Send|Queue|View|Draft|Create|Schedule|Cancel|Approve|Reject)\b[^*]*\*\*/i)
  if (binaryMatch) {
    chips.push(
      { label: binaryMatch[1], prompt: binaryMatch[1] },
      { label: binaryMatch[2], prompt: binaryMatch[2] },
    )
  }

  // Fallback: detect "Send or queue for review?" without bold
  if (chips.length === 0) {
    const sendQueue = text.match(/\b(send)\b.*?\bor\b.*?\b(queue(?:\s+for\s+review)?)\b/i)
    if (sendQueue) {
      chips.push(
        { label: 'Send now', prompt: 'Send it now' },
        { label: 'Queue for review', prompt: 'Queue it for review' },
      )
    }
  }

  // Deduplicate by label
  const seen = new Set<string>()
  return chips.filter((c) => {
    const key = c.label.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 4)
}
