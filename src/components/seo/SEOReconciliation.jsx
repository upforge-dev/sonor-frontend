// src/components/seo/SEOReconciliation.jsx
// Signal SEO Intelligence — Action report showing what Signal DID autonomously,
// plus items that need human review. Plan-gated to full_signal.

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/glass-card'
import { StatTileGrid } from '@/components/ui/stat-tile'
import { SonorSpinner } from '@/components/SonorLoading'
import { SignalUpgradePrompt } from '@/components/ai/SignalUpgradePrompt'
import { useSignalTier } from '@/hooks/useSignalTier'
import { seoApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ShieldCheck,
  Globe,
  ArrowRight,
  ArrowRightLeft,
  Link2,
  Unlink,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Zap,
  ExternalLink,
  Eye,
  MousePointerClick,
  Clock,
  Play,
  Send,
  FileSearch,
  Activity,
  CircleAlert,
  Search,
} from 'lucide-react'

// ─── Health Score Ring ────────────────────────────────────────────────
function HealthScoreRing({ score, size = 140, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  const label =
    score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Attention' : 'Critical'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {score}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            / 100
          </span>
        </div>
      </div>
      <Badge
        className="text-xs"
        style={{
          backgroundColor: `${color}15`,
          color,
          borderColor: `${color}30`,
        }}
      >
        {label}
      </Badge>
    </div>
  )
}

// ─── Action Status Badge ─────────────────────────────────────────────
function ActionStatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    )
  }
  if (status === 'review') {
    return (
      <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
        <CircleAlert className="h-3 w-3 mr-1" />
        Needs Review
      </Badge>
    )
  }
  return (
    <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  )
}

// ─── Confidence Badge ────────────────────────────────────────────────
function ConfidenceBadge({ confidence }) {
  if (confidence == null) return null
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 80
      ? 'text-green-500 border-green-500/30 bg-green-500/10'
      : pct >= 50
        ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
        : 'text-red-500 border-red-500/30 bg-red-500/10'
  return <Badge className={cn('text-xs', color)}>{pct}%</Badge>
}

// ─── Collapsible Section ─────────────────────────────────────────────
function CollapsibleSection({ icon: Icon, iconColor, title, count, open, onToggle, children }) {
  return (
    <GlassCard>
      <GlassCardHeader>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 w-full text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          )}
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Icon className={cn('h-4 w-4', iconColor)} />
            {title}
            {count > 0 && (
              <Badge
                variant="outline"
                className={cn('text-xs', iconColor, 'border-current/30')}
              >
                {count}
              </Badge>
            )}
          </GlassCardTitle>
        </button>
      </GlassCardHeader>
      {open && <GlassCardContent>{children}</GlassCardContent>}
    </GlassCard>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatNumber(num) {
  if (num == null) return '-'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays}d ago`
  } catch {
    return ''
  }
}

// ─── Main Component ──────────────────────────────────────────────────
export default function SEOReconciliation({ projectId }) {
  const queryClient = useQueryClient()
  const { hasFullSignal } = useSignalTier()

  // Section toggle states
  const [redirectsOpen, setRedirectsOpen] = useState(true)
  const [chainsOpen, setChainsOpen] = useState(true)
  const [removalsOpen, setRemovalsOpen] = useState(false)
  const [indexingOpen, setIndexingOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(true)

  // Manual action loading states (for needs_review items)
  const [actionLoading, setActionLoading] = useState({})

  // ─── Fetch reconciliation report ──────────────────────────────────
  const {
    data: report,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['seo', 'reconciliation', projectId],
    queryFn: async () => {
      const res = await seoApi.getReconciliationReport(projectId)
      return res?.data ?? res
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })

  // ─── Trigger on-demand reconciliation ─────────────────────────────
  const triggerMutation = useMutation({
    mutationFn: () => seoApi.triggerReconciliation(projectId),
    onSuccess: (response) => {
      const data = response?.data ?? response
      const actionsCount = data?.actions_taken?.length || 0
      const reviewCount = data?.needs_review?.length || 0

      if (actionsCount > 0) {
        toast.success(`Reconciliation complete: ${actionsCount} action${actionsCount !== 1 ? 's' : ''} executed, ${reviewCount} flagged for review`)
      } else if (reviewCount > 0) {
        toast.success(`Reconciliation complete: ${reviewCount} item${reviewCount !== 1 ? 's' : ''} flagged for review`)
      } else {
        toast.success('Reconciliation complete — no issues found. Site health looks good.')
      }

      // Refetch report to show updated data
      queryClient.invalidateQueries({
        queryKey: ['seo', 'reconciliation', projectId],
      })
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to trigger reconciliation'
      toast.error(msg)
    },
  })

  // ─── Derived data ─────────────────────────────────────────────────
  const healthScore = report?.healthScore ?? 0
  const actionsTaken = report?.actions_taken ?? {}
  const needsReview = report?.needs_review ?? []

  const redirectsCreated = actionsTaken.redirects_created ?? []
  const chainsFixed = actionsTaken.chains_fixed ?? []
  const removalRequests = actionsTaken.removal_requests ?? []
  const indexingRequests = actionsTaken.indexing_requests ?? []

  const totalActions =
    redirectsCreated.length +
    chainsFixed.length +
    removalRequests.length +
    indexingRequests.length

  // Legacy fallback: if API still returns old shape, map it
  // M3: API returns report.orphans, not report.orphanPages
  const rawOrphans = report?.orphans ?? []
  const chains = report?.redirectChains ?? []
  const errors404 = report?.notFoundPages ?? []

  // M4: API returns redirectSuggestions as a separate array — match to orphans by path
  const redirectSuggestions = report?.redirectSuggestions ?? []
  const suggestionsByPath = useMemo(() => {
    const map = {}
    for (const s of redirectSuggestions) {
      if (s.orphanPath || s.fromPath) {
        map[s.orphanPath || s.fromPath] = s
      }
    }
    return map
  }, [redirectSuggestions])

  // Enrich orphans with their matched redirect suggestion
  const orphans = useMemo(() =>
    rawOrphans.map((o) => {
      const path = o.path || (o.url ? new URL(o.url).pathname : '')
      const suggestion = suggestionsByPath[path] || suggestionsByPath[o.url] || null
      return {
        ...o,
        suggestedRedirect: suggestion?.suggestedTarget || suggestion?.toPath || o.suggestedRedirect || null,
        confidence: suggestion?.confidence || o.confidence || null,
      }
    }),
    [rawOrphans, suggestionsByPath]
  )

  const hasLegacyData = orphans.length > 0 || chains.length > 0 || errors404.length > 0
  const hasNewData = totalActions > 0 || needsReview.length > 0

  // ─── Summary metrics ─────────────────────────────────────────────
  const metrics = useMemo(
    () => [
      {
        key: 'redirects-created',
        label: 'Redirects Created',
        value: redirectsCreated.length,
        icon: ArrowRightLeft,
        color: 'green',
        subtitle: 'Auto-created 301s',
      },
      {
        key: 'chains-fixed',
        label: 'Chains Simplified',
        value: chainsFixed.length,
        icon: Link2,
        color: 'purple',
        subtitle: 'Multi-hop chains resolved',
      },
      {
        key: 'removal-requests',
        label: 'Removal Requests',
        value: removalRequests.length,
        icon: Trash2,
        color: 'orange',
        subtitle: 'De-indexing submitted',
      },
      {
        key: 'needs-review',
        label: 'Needs Review',
        value: needsReview.length,
        icon: AlertTriangle,
        color: needsReview.length > 0 ? 'red' : 'green',
        subtitle: needsReview.length > 0 ? 'Items requiring human input' : 'All clear',
      },
    ],
    [redirectsCreated, chainsFixed, removalRequests, needsReview]
  )

  // Legacy metrics fallback (when API still returns old shape)
  const legacyMetrics = useMemo(
    () => [
      {
        key: 'orphans',
        label: 'GSC Orphans',
        value: orphans.length,
        icon: Globe,
        color: 'orange',
        subtitle: 'Pages in GSC not on site',
      },
      {
        key: 'redirects',
        label: 'Redirect Suggestions',
        value: orphans.filter((o) => o.suggestedRedirect).length,
        icon: ArrowRightLeft,
        color: 'blue',
        subtitle: 'Recommended redirects',
      },
      {
        key: 'chains',
        label: 'Redirect Chains',
        value: chains.length,
        icon: Link2,
        color: 'purple',
        subtitle: 'Multi-hop chains to simplify',
      },
      {
        key: '404s',
        label: '404 Errors',
        value: errors404.length,
        icon: AlertTriangle,
        color: 'red',
        subtitle: 'Broken pages detected',
      },
    ],
    [orphans, chains, errors404]
  )

  // ─── Manual action handlers (for needs_review items) ──────────────
  const setLoading = (key, value) =>
    setActionLoading((prev) => ({ ...prev, [key]: value }))

  const handleCreateRedirect = useCallback(
    async (fromUrl, toUrl) => {
      const key = `redirect-${fromUrl}`
      setLoading(key, true)
      try {
        await seoApi.createRedirect(projectId, {
          from_path: fromUrl,
          to_path: toUrl,
          status_code: 301,
        })
        toast.success(`Redirect created: ${fromUrl}`)
        queryClient.invalidateQueries({
          queryKey: ['seo', 'reconciliation', projectId],
        })
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || 'Failed to create redirect'
        toast.error(msg)
      } finally {
        setLoading(key, false)
      }
    },
    [projectId, queryClient]
  )

  const handleRemoveUrl = useCallback(
    async (url) => {
      const key = `remove-${url}`
      setLoading(key, true)
      try {
        await seoApi.submitUrlRemoval(projectId, url)
        toast.success(`Removal request submitted for ${url}`)
        queryClient.invalidateQueries({
          queryKey: ['seo', 'reconciliation', projectId],
        })
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || 'Failed to submit removal'
        toast.error(msg)
      } finally {
        setLoading(key, false)
      }
    },
    [projectId, queryClient]
  )

  // ─── Loading state ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <SonorSpinner size="md" label="Loading Signal intelligence report..." />
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="p-6">
        <GlassCard>
          <GlassCardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Select a Project
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Select a project to view the SEO intelligence report
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Action Report Header ─────────────────────────────────── */}
      <GlassCard>
        <GlassCardContent className="py-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-8">
              <HealthScoreRing score={healthScore} />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Signal SEO Intelligence
                  </h2>
                  {hasFullSignal && totalActions > 0 && (
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <Activity className="h-3 w-3 mr-1" />
                      {totalActions} action{totalActions !== 1 ? 's' : ''} taken
                    </Badge>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {hasFullSignal
                    ? needsReview.length === 0 && totalActions > 0
                      ? 'All issues resolved autonomously. Your site is in great shape.'
                      : needsReview.length > 0
                        ? `Signal resolved ${totalActions} issue${totalActions !== 1 ? 's' : ''} and flagged ${needsReview.length} for your review.`
                        : 'Signal is monitoring your site health and will take action when issues arise.'
                    : 'View your site health report. Upgrade to Full Signal for autonomous SEO management.'}
                </p>

                {/* Timing info */}
                <div className="flex items-center gap-4 mt-2">
                  {report?.last_run_at && (
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Clock className="h-3 w-3" />
                      Last run: {formatRelativeTime(report.last_run_at)}
                      <span className="opacity-60">({formatTimestamp(report.last_run_at)})</span>
                    </span>
                  )}
                  {report?.next_run_at && (
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Next run: {formatTimestamp(report.next_run_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Run controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')}
                />
                {isRefetching ? 'Refreshing...' : 'Refresh'}
              </Button>
              {hasFullSignal && (
                <Button
                  size="sm"
                  disabled={triggerMutation.isPending}
                  onClick={() => triggerMutation.mutate()}
                  className="text-white"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  {triggerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ── Plan Gate: Upgrade prompt for non-full_signal ─────────── */}
      {!hasFullSignal && (
        <SignalUpgradePrompt
          feature="Signal SEO Intelligence"
          description="Enable autonomous SEO management — Signal automatically creates redirects, simplifies chains, submits de-indexing requests, and keeps your site healthy around the clock."
          variant="card"
          requiredTier="full_signal"
        />
      )}

      {/* ── Summary Tiles ────────────────────────────────────────── */}
      <StatTileGrid
        metrics={hasNewData ? metrics : legacyMetrics}
        columns={4}
        variant="centered"
      />

      {/* ════════════════════════════════════════════════════════════
          ACTIONS TAKEN — What Signal did autonomously
          (only shown for full_signal plans with new API shape)
         ════════════════════════════════════════════════════════════ */}
      {hasFullSignal && hasNewData && (
        <>
          {/* ── Redirects Created ───────────────────────────────── */}
          <CollapsibleSection
            icon={ArrowRightLeft}
            iconColor="text-emerald-500"
            title="Redirects Created"
            count={redirectsCreated.length}
            open={redirectsOpen}
            onToggle={() => setRedirectsOpen(!redirectsOpen)}
          >
            {redirectsCreated.length === 0 ? (
              <EmptyState message="No redirects created this cycle" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--glass-border)]">
                    <tr
                      className="text-left text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <th className="pb-3 font-medium">From</th>
                      <th className="pb-3 font-medium"></th>
                      <th className="pb-3 font-medium">To</th>
                      <th className="pb-3 font-medium text-center">Confidence</th>
                      <th className="pb-3 font-medium text-right">Created</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {redirectsCreated.map((action, idx) => (
                      <tr
                        key={action.id || idx}
                        className="hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <td className="py-3 pr-2">
                          <span
                            className="text-sm font-mono truncate max-w-[250px] block"
                            title={action.from_url}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {action.from_url}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                        </td>
                        <td className="py-3 pl-2">
                          <span
                            className="text-sm font-mono truncate max-w-[250px] block"
                            title={action.to_url}
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {action.to_url}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <ConfidenceBadge confidence={action.confidence} />
                        </td>
                        <td
                          className="py-3 text-right text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {formatTimestamp(action.created_at)}
                        </td>
                        <td className="py-3 text-center">
                          <ActionStatusBadge status={action.status || 'completed'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Chains Fixed ────────────────────────────────────── */}
          <CollapsibleSection
            icon={Link2}
            iconColor="text-purple-500"
            title="Chains Simplified"
            count={chainsFixed.length}
            open={chainsOpen}
            onToggle={() => setChainsOpen(!chainsOpen)}
          >
            {chainsFixed.length === 0 ? (
              <EmptyState message="No redirect chains to simplify" />
            ) : (
              <div className="space-y-3">
                {chainsFixed.map((chain, idx) => {
                  const hops = chain.original_hops || []
                  return (
                    <div
                      key={chain.id || idx}
                      className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Before: original chain */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            Was:
                          </span>
                          {hops.map((hop, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span
                                className="text-sm font-mono truncate max-w-[180px]"
                                title={hop}
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {hop}
                              </span>
                              {i < hops.length - 1 && (
                                <ArrowRight className="h-3 w-3 flex-shrink-0 text-red-400 opacity-50" />
                              )}
                            </div>
                          ))}
                          <Badge variant="outline" className="text-xs ml-2">
                            {hops.length} hops
                          </Badge>
                        </div>

                        {/* After: simplified */}
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            Now:
                          </span>
                          <span
                            className="text-sm font-mono"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {chain.from_url || hops[0]}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-purple-500" />
                          <span
                            className="text-sm font-mono"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {chain.to_url || hops[hops.length - 1]}
                          </span>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-1" />
                        </div>
                      </div>
                      <ActionStatusBadge status={chain.status || 'completed'} />
                    </div>
                  )
                })}
              </div>
            )}
          </CollapsibleSection>

          {/* ── Removal Requests ────────────────────────────────── */}
          <CollapsibleSection
            icon={Trash2}
            iconColor="text-orange-500"
            title="Removal Requests"
            count={removalRequests.length}
            open={removalsOpen}
            onToggle={() => setRemovalsOpen(!removalsOpen)}
          >
            {removalRequests.length === 0 ? (
              <EmptyState message="No URLs submitted for de-indexing" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--glass-border)]">
                    <tr
                      className="text-left text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <th className="pb-3 font-medium">URL</th>
                      <th className="pb-3 font-medium">Reason</th>
                      <th className="pb-3 font-medium text-right">Submitted</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {removalRequests.map((req, idx) => (
                      <tr
                        key={req.id || idx}
                        className="hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="text-sm font-mono truncate max-w-[350px]"
                              title={req.url}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {req.url}
                            </span>
                            <a
                              href={req.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color: 'var(--text-tertiary)' }}
                              />
                            </a>
                          </div>
                        </td>
                        <td
                          className="py-3 text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {req.reason || 'Orphan page, no redirect target'}
                        </td>
                        <td
                          className="py-3 text-right text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {formatTimestamp(req.created_at)}
                        </td>
                        <td className="py-3 text-center">
                          <ActionStatusBadge status={req.status || 'completed'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Indexing Requests ───────────────────────────────── */}
          {indexingRequests.length > 0 && (
            <CollapsibleSection
              icon={Search}
              iconColor="text-blue-500"
              title="Indexing Requests"
              count={indexingRequests.length}
              open={indexingOpen}
              onToggle={() => setIndexingOpen(!indexingOpen)}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--glass-border)]">
                    <tr
                      className="text-left text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <th className="pb-3 font-medium">Canonical URL</th>
                      <th className="pb-3 font-medium text-right">Submitted</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {indexingRequests.map((req, idx) => (
                      <tr
                        key={req.id || idx}
                        className="hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="text-sm font-mono truncate max-w-[400px]"
                              title={req.url}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {req.url}
                            </span>
                            <a
                              href={req.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color: 'var(--text-tertiary)' }}
                              />
                            </a>
                          </div>
                        </td>
                        <td
                          className="py-3 text-right text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {formatTimestamp(req.created_at)}
                        </td>
                        <td className="py-3 text-center">
                          <ActionStatusBadge status={req.status || 'completed'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* ════════════════════════════════════════════════════════
              NEEDS REVIEW — Items Signal could not auto-fix
             ════════════════════════════════════════════════════════ */}
          {needsReview.length > 0 && (
            <CollapsibleSection
              icon={AlertTriangle}
              iconColor="text-amber-500"
              title="Needs Your Review"
              count={needsReview.length}
              open={reviewOpen}
              onToggle={() => setReviewOpen(!reviewOpen)}
            >
              <p
                className="text-sm mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                Signal could not resolve these with high enough confidence (below 70%).
                Please review and take manual action.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--glass-border)]">
                    <tr
                      className="text-left text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <th className="pb-3 font-medium">URL</th>
                      <th className="pb-3 font-medium">Issue</th>
                      <th className="pb-3 font-medium">Suggested Target</th>
                      <th className="pb-3 font-medium text-center">Confidence</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {needsReview.map((item, idx) => {
                      const redirectKey = `redirect-${item.url}`
                      const removeKey = `remove-${item.url}`
                      return (
                        <tr
                          key={item.url || idx}
                          className="hover:bg-[var(--glass-bg)] transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="text-sm font-mono truncate max-w-[250px]"
                                title={item.url}
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {item.url}
                              </span>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink
                                  className="h-3 w-3 flex-shrink-0"
                                  style={{ color: 'var(--text-tertiary)' }}
                                />
                              </a>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                item.type === 'orphan'
                                  ? 'text-orange-500 border-orange-500/30 bg-orange-500/10'
                                  : item.type === '404'
                                    ? 'text-red-500 border-red-500/30 bg-red-500/10'
                                    : 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                              )}
                            >
                              {item.type === 'orphan'
                                ? 'Orphan Page'
                                : item.type === '404'
                                  ? '404 Error'
                                  : item.type || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {item.suggested_target ? (
                              <span
                                className="text-sm font-mono truncate max-w-[200px] block"
                                title={item.suggested_target}
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {item.suggested_target}
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                No match found
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <ConfidenceBadge confidence={item.confidence} />
                          </td>
                          <td className="py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.suggested_target && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={!!actionLoading[redirectKey]}
                                  onClick={() =>
                                    handleCreateRedirect(
                                      item.url,
                                      item.suggested_target
                                    )
                                  }
                                >
                                  {actionLoading[redirectKey] ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  )}
                                  Redirect
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                                disabled={!!actionLoading[removeKey]}
                                onClick={() => handleRemoveUrl(item.url)}
                              >
                                {actionLoading[removeKey] ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Trash2 className="h-3 w-3 mr-1" />
                                )}
                                Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          LEGACY / READ-ONLY VIEW — For plans without full_signal,
          or when API still returns old shape
         ════════════════════════════════════════════════════════════ */}
      {(!hasFullSignal || (!hasNewData && hasLegacyData)) && hasLegacyData && (
        <>
          {/* Orphan Pages (read-only for non-full_signal) */}
          {orphans.length > 0 && (
            <CollapsibleSection
              icon={Globe}
              iconColor="text-orange-500"
              title="GSC Orphan Pages"
              count={orphans.length}
              open={redirectsOpen}
              onToggle={() => setRedirectsOpen(!redirectsOpen)}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--glass-border)]">
                    <tr
                      className="text-left text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <th className="pb-3 font-medium">GSC URL</th>
                      <th className="pb-3 font-medium text-right">Clicks</th>
                      <th className="pb-3 font-medium text-right">Impressions</th>
                      <th className="pb-3 font-medium">Suggested Redirect</th>
                      <th className="pb-3 font-medium text-center">Confidence</th>
                      {hasFullSignal && (
                        <th className="pb-3 font-medium text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {orphans.map((orphan, idx) => {
                      const redirectKey = `redirect-${orphan.url}`
                      const removeKey = `remove-${orphan.url}`
                      return (
                        <tr
                          key={orphan.url || idx}
                          className="hover:bg-[var(--glass-bg)] transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="text-sm font-mono truncate max-w-[280px]"
                                title={orphan.url}
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {orphan.url}
                              </span>
                              <a
                                href={orphan.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink
                                  className="h-3 w-3 flex-shrink-0"
                                  style={{ color: 'var(--text-tertiary)' }}
                                />
                              </a>
                            </div>
                          </td>
                          <td
                            className="py-3 text-right text-sm"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <MousePointerClick
                                className="h-3 w-3"
                                style={{ color: 'var(--text-tertiary)' }}
                              />
                              {formatNumber(orphan.clicks)}
                            </div>
                          </td>
                          <td
                            className="py-3 text-right text-sm"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Eye
                                className="h-3 w-3"
                                style={{ color: 'var(--text-tertiary)' }}
                              />
                              {formatNumber(orphan.impressions)}
                            </div>
                          </td>
                          <td className="py-3">
                            {orphan.suggestedRedirect ? (
                              <span
                                className="text-sm font-mono truncate max-w-[220px] block"
                                title={orphan.suggestedRedirect}
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {orphan.suggestedRedirect}
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                No match found
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <ConfidenceBadge confidence={orphan.confidence} />
                          </td>
                          {hasFullSignal && (
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {orphan.suggestedRedirect && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={!!actionLoading[redirectKey]}
                                    onClick={() =>
                                      handleCreateRedirect(
                                        orphan.url,
                                        orphan.suggestedRedirect
                                      )
                                    }
                                  >
                                    {actionLoading[redirectKey] ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                                    )}
                                    Redirect
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                                  disabled={!!actionLoading[removeKey]}
                                  onClick={() => handleRemoveUrl(orphan.url)}
                                >
                                  {actionLoading[removeKey] ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                  )}
                                  Remove
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Redirect Chains (read-only) */}
          {chains.length > 0 && (
            <CollapsibleSection
              icon={Link2}
              iconColor="text-purple-500"
              title="Redirect Chains"
              count={chains.length}
              open={chainsOpen}
              onToggle={() => setChainsOpen(!chainsOpen)}
            >
              <div className="space-y-3">
                {chains.map((chain, idx) => {
                  const hops = chain.hops || []
                  return (
                    <div
                      key={chain.id || idx}
                      className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                          {hops.map((hop, i) => (
                            <div key={i} className="flex items-center gap-1 min-w-0">
                              <span
                                className="text-sm truncate max-w-[200px] font-mono"
                                title={hop}
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {hop}
                              </span>
                              {i < hops.length - 1 && (
                                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
                              )}
                            </div>
                          ))}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {hops.length} hops
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* 404 Pages (read-only) */}
          {errors404.length > 0 && (
            <CollapsibleSection
              icon={AlertTriangle}
              iconColor="text-red-500"
              title="404 Errors"
              count={errors404.length}
              open={reviewOpen}
              onToggle={() => setReviewOpen(!reviewOpen)}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--glass-border)]">
                    <tr
                      className="text-left text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <th className="pb-3 font-medium">URL</th>
                      <th className="pb-3 font-medium">Last Seen</th>
                      <th className="pb-3 font-medium text-center">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {errors404.map((page, idx) => (
                      <tr
                        key={page.url || idx}
                        className="hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="text-sm font-mono truncate max-w-[350px]"
                              title={page.url}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {page.url}
                            </span>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color: 'var(--text-tertiary)' }}
                              />
                            </a>
                          </div>
                        </td>
                        <td
                          className="py-3 text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {formatTimestamp(page.lastSeen)}
                        </td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              page.source === 'gsc'
                                ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                                : 'text-teal-500 border-teal-500/30 bg-teal-500/10'
                            )}
                          >
                            {page.source === 'gsc' ? 'GSC' : 'Analytics'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </>
      )}
    </div>
  )
}
