import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import {
  CheckCircle2,
  Circle,
  Lock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import { OutreachLoading } from '@/components/outreach/ui'
import { useSearchParams } from 'react-router-dom'

/**
 * OnboardingTab — M6
 *
 * Derivable checklist that guides a new tenant through everything they
 * need to configure before cold outreach starts producing real leads.
 * State is computed server-side from existing project data (narratives,
 * mailboxes, lead sources, leads, slots, settings) — no separate
 * onboarding table, no way to get the checklist out of sync with
 * reality.
 *
 * Each step shows:
 *   - A complete/incomplete indicator
 *   - A status line ("3 narratives configured" / "0 leads in pipeline")
 *   - A link that jumps directly to the relevant tab to configure that step
 *   - Optional help_text explaining the "why" when incomplete
 *
 * When every step is complete, the tab flips to a celebratory "ready to
 * fly" state with a summary of project activity so far.
 */
export default function OnboardingTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [, setSearchParams] = useSearchParams()

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await outreachApi.getOutreachOnboarding()
      setStatus(res.data || null)
    } catch (err) {
      if (err?.response?.status !== 403) {
        toast.error('Failed to load onboarding status')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (hasFullSignal) fetchStatus()
    else setLoading(false)
  }, [hasFullSignal, fetchStatus])

  const jumpToTab = (tab) => {
    setSearchParams({ tab }, { replace: true })
  }

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
              Cold outreach requires Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Upgrade your project to unlock the narrative-driven cold outreach pipeline.
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

  if (loading) return <OutreachLoading label="Loading onboarding checklist" />
  if (!status) return null

  const { percent_complete, overall_complete, steps, summary } = status

  return (
    <div className="p-6 space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Cold outreach setup
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {overall_complete
              ? 'Everything is configured — your pipeline is ready to send.'
              : `${percent_complete}% complete. Click any step to jump to the tab that handles it.`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Progress bar */}
      <GlassCard>
        <GlassCardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {percent_complete}%
            </div>
            <div className="flex-1 h-2 rounded-full bg-[var(--glass-bg)] overflow-hidden">
              <div
                className="h-full bg-[var(--brand-primary)] transition-all duration-300"
                style={{ width: `${percent_complete}%` }}
              />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] tabular-nums">
              {steps.filter((s) => s.complete).length} / {steps.length}
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Ready-to-fly state */}
      {overall_complete && (
        <GlassCard>
          <GlassCardContent className="py-6 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-[var(--brand-primary)] flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Ready to fly
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-lg mx-auto">
              Every onboarding step is green. The drip scheduler will start materializing send
              slots on the next hourly tick and real emails will begin flowing at the cadence you
              configured on each mailbox.
            </p>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <SummaryTile label="Narratives" value={summary.narratives} />
        <SummaryTile label="Mailboxes" value={summary.mailboxes} />
        <SummaryTile
          label="Connected"
          value={summary.connected_mailboxes}
          total={summary.mailboxes}
        />
        <SummaryTile label="Apollo sources" value={summary.apollo_sources} />
        <SummaryTile label="Leads" value={summary.leads} />
        <SummaryTile label="Slots sent" value={summary.sent_slots} />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const Icon = step.complete ? CheckCircle2 : Circle
          return (
            <GlassCard
              key={step.id}
              className={`cursor-pointer transition-all ${
                step.complete
                  ? 'opacity-80'
                  : 'hover:border-[var(--glass-border-strong)]'
              }`}
              onClick={() => jumpToTab(step.jump_to_tab)}
            >
              <GlassCardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon
                      className={`h-5 w-5 ${
                        step.complete
                          ? 'text-emerald-500'
                          : 'text-[var(--text-tertiary)]'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {idx + 1}. {step.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
                        {step.status_text}
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {step.description}
                    </p>
                    {!step.complete && step.help_text && (
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1 italic">
                        {step.help_text}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )
        })}
      </div>

      {/* First-time tips */}
      {!overall_complete && percent_complete < 30 && (
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" /> Pro tip
            </GlassCardTitle>
            <GlassCardDescription className="text-[11px]">
              Start with the Narratives tab and pick a template that matches your business — it's
              the fastest way to see how narrative-conditioned AI generation actually reads.
              Then add an Apollo source, create one mailbox, and run a test send before scaling
              up.
            </GlassCardDescription>
          </GlassCardHeader>
        </GlassCard>
      )}
    </div>
  )
}

function SummaryTile({ label, value, total }) {
  return (
    <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
        {value}
        {total !== undefined && total > 0 && (
          <span className="text-xs text-[var(--text-tertiary)] font-normal">
            {' / '}
            {total}
          </span>
        )}
      </div>
    </div>
  )
}
