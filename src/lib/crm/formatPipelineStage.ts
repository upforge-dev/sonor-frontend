import { DEFAULT_PIPELINE_STAGES } from '@/components/crm/pipelineStages'

/** Legacy / alternate API slugs → same labels as CRM UI */
const STAGE_ALIASES: Record<string, string> = {
  negotiation: 'Negotiating',
  won: 'Closed Won',
  lost: 'Closed Lost',
}

/** Short aliases: only rewrite `**won**` / `won` in backticks — not bare words (would mangle "Closed Won"). */
const ALIASES_SKIP_PLAIN_TEXT = new Set(['won', 'lost'])

const SLUG_TO_LABEL: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(DEFAULT_PIPELINE_STAGES).map(([k, v]) => [k, v.label]),
  ),
  ...STAGE_ALIASES,
}

/**
 * Human-readable pipeline stage for UI (matches CRM kanban labels).
 */
export function formatPipelineStageSlug(slug: string | undefined | null): string {
  if (!slug || typeof slug !== 'string') return ''
  const trimmed = slug.trim()
  if (!trimmed) return ''
  const mapped = SLUG_TO_LABEL[trimmed]
  if (mapped) return mapped
  return trimmed
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Rewrite common pipeline slugs in Echo markdown so **new_lead** → **New Lead**, etc.
 * Longer slugs run first so `proposal_sent` is not split incorrectly.
 */
export function humanizePipelineStageSlugsInText(text: string): string {
  if (!text) return ''
  const slugs = Object.keys(SLUG_TO_LABEL).sort((a, b) => b.length - a.length)
  let out = text
  for (const slug of slugs) {
    const label = SLUG_TO_LABEL[slug]
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`\\*\\*${escaped}\\*\\*`, 'g'), `**${label}**`)
    out = out.replace(new RegExp(`\`${escaped}\``, 'g'), label)
    if (!ALIASES_SKIP_PLAIN_TEXT.has(slug)) {
      out = out.replace(new RegExp(`(?<![a-z0-9_])${escaped}(?![a-z0-9_])`, 'gi'), label)
    }
  }
  return out
}
