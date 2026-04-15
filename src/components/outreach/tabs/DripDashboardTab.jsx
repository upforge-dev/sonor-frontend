import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { RefreshCw, Lock, Activity, Mail, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import {
  OutreachLoading,
  OutreachEmptyState,
  OutreachStatusBadge,
} from '@/components/outreach/ui'

const STATUS_ORDER = ['sent', 'queued', 'pending', 'skipped', 'failed', 'cancelled']
const STATUS_COLORS = {
  sent: 'bg-emerald-500',
  queued: 'bg-blue-500',
  pending: 'bg-[var(--brand-primary)]',
  skipped: 'bg-amber-500',
  failed: 'bg-red-500',
  cancelled: 'bg-[var(--text-tertiary)]',
}

function startOfDayUtc() {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function formatLocalTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function DripDashboardTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [mailboxes, setMailboxes] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const [mailboxesRes, slotsRes] = await Promise.all([
        outreachApi.listMailboxes(),
        outreachApi.listDripSlots(),
      ])
      setMailboxes(mailboxesRes.data || [])
      setSlots(slotsRes.data || [])
    } catch (err) {
      if (err?.response?.status !== 403) toast.error('Failed to load drip dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (hasFullSignal) fetchAll()
    else setLoading(false)
  }, [hasFullSignal, fetchAll])

  // Poll every 30s while the dashboard is open so newly-fired slots update live
  useEffect(() => {
    if (!hasFullSignal) return
    const id = setInterval(fetchAll, 30000)
    return () => clearInterval(id)
  }, [hasFullSignal, fetchAll])

  const slotsByMailbox = useMemo(() => {
    const map = new Map()
    for (const s of slots) {
      if (!map.has(s.mailbox_id)) map.set(s.mailbox_id, [])
      map.get(s.mailbox_id).push(s)
    }
    return map
  }, [slots])

  const projectTotals = useMemo(() => {
    const t = { sent: 0, queued: 0, pending: 0, skipped: 0, failed: 0, cancelled: 0 }
    const today = startOfDayUtc().getTime()
    const tomorrow = today + 24 * 60 * 60 * 1000
    for (const s of slots) {
      const ts = new Date(s.scheduled_at_utc).getTime()
      if (ts < today || ts >= tomorrow) continue
      if (t[s.status] !== undefined) t[s.status] += 1
    }
    return t
  }, [slots])

  const handleRegenerate = async (mailbox) => {
    try {
      await outreachApi.regenerateMailboxSchedule(mailbox.id)
      toast.success(`Schedule regenerated for ${mailbox.display_name}`)
      await fetchAll()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Regenerate failed')
    }
  }

  const handleCancel = async (mailbox) => {
    if (!window.confirm(`Cancel today's pending slots for ${mailbox.display_name}?`)) return
    try {
      const res = await outreachApi.cancelMailboxSchedule(mailbox.id)
      toast.success(`Cancelled ${res?.data?.cancelled || 0} slot(s)`)
      await fetchAll()
    } catch (err) {
      toast.error('Cancel failed')
    }
  }

  // ─── Plan gate ──────────────────────────────────────────────────────
  if (!hasFullSignal) {
    return (
      <div className="p-6">
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center text-center py-16 px-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Drip dashboard requires Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Upgrade to Full Signal AI to unlock the human-like drip sender and the per-mailbox
              live schedule.
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

  if (loading) return <OutreachLoading label="Loading drip dashboard" />

  if (mailboxes.length === 0) {
    return (
      <div className="p-6">
        <OutreachEmptyState
          icon={Mail}
          title="No mailboxes yet"
          description="Create and connect a mailbox first — then the drip dashboard will show its daily schedule and live send progress."
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header + totals */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Today's drip schedule
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Live schedule across {mailboxes.length} mailbox{mailboxes.length === 1 ? '' : 'es'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchAll}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Project totals */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Today at a glance
          </GlassCardTitle>
          <GlassCardDescription>
            Totals across all mailboxes in this project for today (UTC day boundary).
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {STATUS_ORDER.map((s) => (
              <div
                key={s}
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s]}`} />
                  <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
                    {s}
                  </div>
                </div>
                <div className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">
                  {projectTotals[s] || 0}
                </div>
              </div>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Per-mailbox rows */}
      <div className="space-y-4">
        {mailboxes.map((m) => {
          const mySlots = slotsByMailbox.get(m.id) || []
          const todaysSlots = mySlots.filter((s) => {
            const ts = new Date(s.scheduled_at_utc).getTime()
            const today = startOfDayUtc().getTime()
            return ts >= today && ts < today + 24 * 60 * 60 * 1000
          })
          const counts = { sent: 0, queued: 0, pending: 0, skipped: 0, failed: 0, cancelled: 0 }
          for (const s of todaysSlots) counts[s.status] = (counts[s.status] || 0) + 1

          const first = todaysSlots[0]
          const last = todaysSlots[todaysSlots.length - 1]

          return (
            <GlassCard key={m.id}>
              <GlassCardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <GlassCardTitle className="truncate">{m.display_name}</GlassCardTitle>
                    <GlassCardDescription className="truncate">
                      {m.email_address}
                    </GlassCardDescription>
                  </div>
                  <OutreachStatusBadge
                    status={m.paused ? 'paused' : m.gmail_oauth_tokens ? 'active' : 'pending'}
                  />
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-[11px] text-[var(--text-tertiary)]">
                  <span>
                    <span className="text-[var(--text-secondary)]">Target</span>{' '}
                    {m.daily_target} · Sent{' '}
                    <span className="text-[var(--text-primary)] font-medium">{m.sent_today}</span>
                  </span>
                  {first && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> First: {formatLocalTime(first.scheduled_at_utc)}
                    </span>
                  )}
                  {last && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last: {formatLocalTime(last.scheduled_at_utc)}
                    </span>
                  )}
                  <span className="capitalize">
                    {(m.strategy_tier || '').replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Timeline */}
                {todaysSlots.length > 0 ? (
                  <div className="relative h-10 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
                    {/* Window bounds → percent positions */}
                    {(() => {
                      // Use each mailbox's local window to scale the timeline.
                      // Convert window_start/end to a minute-of-day baseline,
                      // then place each slot by converting its UTC time to
                      // minutes-of-day in the mailbox tz.
                      const toMin = (hhmmss) => {
                        const [h, m] = (hhmmss || '0:0').split(':').map(Number)
                        return (h || 0) * 60 + (m || 0)
                      }
                      const startMin = toMin(m.window_start_local)
                      const endMin = toMin(m.window_end_local)
                      const span = Math.max(1, endMin - startMin)
                      const fmt = new Intl.DateTimeFormat('en-US', {
                        timeZone: m.timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                      return todaysSlots.map((s) => {
                        const parts = fmt.formatToParts(new Date(s.scheduled_at_utc))
                        let hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
                        const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
                        if (hh === 24) hh = 0
                        const minOfDay = hh * 60 + mm
                        const offset = Math.max(0, Math.min(1, (minOfDay - startMin) / span))
                        const left = `${(offset * 100).toFixed(2)}%`
                        return (
                          <div
                            key={s.id}
                            className={`absolute top-1/2 -translate-y-1/2 h-6 w-1.5 rounded-sm ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}
                            style={{ left }}
                            title={`${formatLocalTime(s.scheduled_at_utc)} — ${s.status}${s.failed_reason ? `: ${s.failed_reason}` : ''}`}
                          />
                        )
                      })
                    })()}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    No slots scheduled for today.
                  </p>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {STATUS_ORDER.map((s) => (
                    <div
                      key={s}
                      className="rounded-md border border-[var(--glass-border)] px-2 py-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-[var(--text-tertiary)] tracking-wide">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[s]}`} />
                        {s}
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                        {counts[s] || 0}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRegenerate(m)}
                    disabled={!m.gmail_oauth_tokens}
                  >
                    Regenerate schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancel(m)}
                    disabled={counts.pending === 0 && counts.queued === 0}
                  >
                    Cancel today
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
