import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Plus, MessageSquareText, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import { OutreachLoading, OutreachEmptyState, OutreachStatusBadge } from '@/components/outreach/ui'
import NarrativeEditor from './NarrativeEditor'

export default function NarrativesTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [narratives, setNarratives] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)

  const fetchNarratives = useCallback(async () => {
    setLoading(true)
    try {
      const res = await outreachApi.listNarratives()
      setNarratives(res.data || [])
    } catch (err) {
      // If the user doesn't have full_signal the backend will return 403; we
      // handle the gate below so swallow the toast in that case.
      if (err?.response?.status !== 403) {
        toast.error('Failed to load narratives')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasFullSignal) fetchNarratives()
    else setLoading(false)
  }, [hasFullSignal, fetchNarratives])

  const selected = useMemo(
    () => narratives.find((n) => n.id === selectedId) || null,
    [narratives, selectedId],
  )

  // ─── Plan gate ────────────────────────────────────────────────────────
  if (!hasFullSignal) {
    return (
      <div className="p-6">
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center text-center py-16 px-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Narratives require Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Narratives define the sender personas used to condition AI email generation across
              your cold outreach mailboxes. Upgrade to Full Signal AI to unlock them.
            </p>
            {upgradeLabel && upgradePath && (
              <Button asChild>
                <a href={upgradePath}>{upgradeLabel}</a>
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  if (loading) return <OutreachLoading label="Loading narratives" />

  // ─── Editor view (edit existing or create new) ────────────────────────
  if (creating || selected) {
    return (
      <div className="p-6">
        <NarrativeEditor
          narrative={creating ? null : selected}
          onSaved={(saved) => {
            setCreating(false)
            setSelectedId(saved?.id || null)
            fetchNarratives()
          }}
          onCancelled={() => {
            setCreating(false)
            setSelectedId(null)
          }}
          onDeleted={() => {
            setCreating(false)
            setSelectedId(null)
            fetchNarratives()
          }}
        />
      </div>
    )
  }

  // ─── List view ────────────────────────────────────────────────────────
  if (narratives.length === 0) {
    return (
      <div className="p-6">
        <OutreachEmptyState
          icon={MessageSquareText}
          title="No narratives yet"
          description="A narrative is a sender persona — positioning, ICP, tone, and hook library — that steers how the AI writes cold outreach emails for a specific sending domain."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create narrative
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Narrative library
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {narratives.length} narrative{narratives.length === 1 ? '' : 's'} defined for this project
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New narrative
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {narratives.map((n) => (
          <GlassCard
            key={n.id}
            className="cursor-pointer hover:border-[var(--glass-border-strong)] transition-all"
            onClick={() => setSelectedId(n.id)}
          >
            <GlassCardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <GlassCardTitle className="truncate">{n.name}</GlassCardTitle>
                  {n.domain_hint && (
                    <GlassCardDescription className="truncate">
                      {n.domain_hint}
                    </GlassCardDescription>
                  )}
                </div>
                <OutreachStatusBadge status={n.enabled ? 'active' : 'paused'} />
              </div>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 italic">
                "{n.positioning_statement}"
              </p>

              <div className="flex flex-wrap gap-1">
                {(n.hook_types || []).slice(0, 4).map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  >
                    {h}
                  </span>
                ))}
                {(n.hook_types || []).length > 4 && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    +{(n.hook_types || []).length - 4} more
                  </span>
                )}
              </div>

              {n.forbidden_phrases?.length > 0 && (
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  <span className="font-medium">Avoids: </span>
                  {n.forbidden_phrases.slice(0, 2).join(', ')}
                  {n.forbidden_phrases.length > 2 && '…'}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
