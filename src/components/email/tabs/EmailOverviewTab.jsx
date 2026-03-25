/**
 * EmailOverviewTab — Email Platform Dashboard Overview
 *
 * Upgraded to feel like a standalone SaaS product. Includes:
 *   1. Signal Insights card (AI-powered, plan-gated)
 *   2. StatTileGrid with trend data
 *   3. Email Health Score + Best Performing Campaign (side by side)
 *   4. Setup Checklist (hidden when all done)
 *   5. Quick Actions (with "Create with Signal")
 *   6. Two-column: Recent Campaigns + Activity Timeline
 *   7. Active Automations
 *   8. Audience Lists
 *
 * Props:
 *   onNavigate(tab)              — switch to another email tab
 *   onNewCampaign()              — open campaign creation flow
 *   onViewCampaignAnalytics(c)   — drill into a single campaign's stats
 *
 * Design tokens: --brand-primary, --text-primary, --text-secondary,
 * --text-tertiary, --glass-bg, --glass-border, --glass-border-strong
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { StatTileGrid, COLOR_CYCLE } from '@/components/ui/stat-tile'
import {
  OutreachLoading,
  OutreachEmptyState,
  OutreachStatusBadge,
  GLASS_TILE_HOVER,
} from '@/components/outreach/ui'
import {
  Mail,
  Users,
  Zap,
  Plus,
  Send,
  Eye,
  MousePointerClick,
  Activity,
  Sparkles,
  Palette,
  ChevronRight,
  Tag,
  UserPlus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Trophy,
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { useSignalAccess } from '@/lib/signal-access'
import { cn } from '@/lib/utils'
import SignalCompose from '@/components/email/SignalCompose'
import EmailHealthScore from './EmailHealthScore'
import ActivityTimeline from './ActivityTimeline'

// ─── Icon background solid gradients (matches StatTile ICON_BG_SOLID) ────
const ICON_BG_SOLID = {
  brand:  'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]',
  blue:   'bg-gradient-to-br from-blue-500 to-blue-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  green:  'bg-gradient-to-br from-emerald-500 to-emerald-600',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  pink:   'bg-gradient-to-br from-pink-500 to-pink-600',
}

// ─── Quick Actions config ────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Create with Signal', icon: Sparkles, action: 'signal_compose', colorKey: 'purple', isSignal: true },
  { label: 'New Campaign',  icon: Send,     tab: 'campaigns',   colorKey: 'brand'  },
  { label: 'New Automation', icon: Zap,     tab: 'automations', colorKey: 'green' },
  { label: 'Add Subscriber', icon: UserPlus, tab: 'subscribers', colorKey: 'orange'  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Weighted avg: totalX / totalSent (not per-campaign average) */
function weightedRate(sentCampaigns, numeratorKey) {
  const totalNumerator = sentCampaigns.reduce((s, c) => s + (c[numeratorKey] || 0), 0)
  const totalSent = sentCampaigns.reduce((s, c) => s + (c.emails_sent || 0), 0)
  if (totalSent === 0) return 0
  return (totalNumerator / totalSent) * 100
}

/** Compute a simple trend by comparing two values */
function computeTrend(current, previous) {
  if (previous === 0 || previous == null) return { change: null, trend: 'neutral' }
  const diff = ((current - previous) / previous) * 100
  return {
    change: diff,
    trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
  }
}

// ─── Insight styling ─────────────────────────────────────────────────────
const INSIGHT_COLORS = {
  positive: 'text-emerald-500',
  negative: 'text-red-500',
  neutral: 'text-[var(--text-secondary)]',
}

const INSIGHT_DOTS = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  neutral: 'bg-[var(--text-tertiary)]',
}

// ─── Component ───────────────────────────────────────────────────────────

export default function EmailOverviewTab({
  onNavigate,
  onNewCampaign,
  onViewCampaignAnalytics,
  onOpenInEditor,
}) {
  const [showSignalCompose, setShowSignalCompose] = useState(false)

  const {
    campaigns,
    campaignsLoading,
    fetchCampaigns,
    subscribers,
    subscribersLoading,
    fetchSubscribers,
    automations,
    automationsLoading,
    fetchAutomations,
    lists,
    listsLoading,
    fetchLists,
    settings,
  } = useEmailPlatformStore()

  const currentProject = useAuthStore((s) => s.currentProject)
  const { hasAccess: hasSignal } = useSignalAccess()

  // Signal Insights state (cached — won't re-fetch on tab switches)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const insightsFetched = useRef(false)

  // Domain health state
  const [domainHealth, setDomainHealth] = useState({ verified: false, spf: false, dkim: false })

  useEffect(() => {
    fetchCampaigns()
    fetchSubscribers()
    fetchAutomations()
    fetchLists()
    // Fetch domain health for health score
    if (currentProject?.id) {
      emailApi.getPrimaryDomain(currentProject.id)
        .then(res => {
          const d = res.data || res
          const records = d.records || []
          setDomainHealth({
            verified: d.verified || d.status === 'verified',
            spf: records.some(r => r.type === 'TXT' && r.name?.includes('spf') && r.status === 'verified'),
            dkim: records.some(r => r.type === 'TXT' && r.name?.includes('domainkey') && r.status === 'verified'),
          })
        })
        .catch(() => {}) // no domain configured — leave defaults
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Signal Insights once
  useEffect(() => {
    if (!hasSignal || insightsFetched.current) return
    insightsFetched.current = true
    setInsightsLoading(true)

    emailApi
      .getInsights(currentProject?.id)
      .then((res) => {
        const data = res.data || res
        setInsights(data.insights || [])
      })
      .catch(() => {
        setInsights(null)
      })
      .finally(() => setInsightsLoading(false))
  }, [hasSignal, currentProject?.id])

  // ── Derived data ──────────────────────────────────────────────────────

  const isLoading = campaignsLoading || subscribersLoading || automationsLoading

  const {
    totalSubscribers,
    sentCampaigns,
    recentCampaigns,
    avgOpenRate,
    avgClickRate,
    totalEmailsSent,
    activeAutomationsList,
    bestCampaign,
    // Trend data
    subscribersTrend,
    openRateTrend,
    clickRateTrend,
    emailsSentTrend,
    // Health score inputs
    bounceRate,
    hasNewSubscribers,
    hasActiveAutomation,
    hasRecentCampaign,
  } = useMemo(() => {
    const sent = campaigns.filter(c => c.status === 'sent')
    const active = automations.filter(a => a.status === 'active')

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    // Current vs previous period subscribers (7 days)
    const recentSubs = subscribers.filter(
      (s) => s.created_at && new Date(s.created_at).getTime() >= sevenDaysAgo,
    )
    const prevSubs = subscribers.filter(
      (s) =>
        s.created_at &&
        new Date(s.created_at).getTime() < sevenDaysAgo &&
        new Date(s.created_at).getTime() >= sevenDaysAgo - 7 * 24 * 60 * 60 * 1000,
    )

    // Current vs previous period campaigns (30 days)
    const recentSent = sent.filter(
      (c) => c.sent_at && new Date(c.sent_at).getTime() >= thirtyDaysAgo,
    )
    const prevSent = sent.filter(
      (c) =>
        c.sent_at &&
        new Date(c.sent_at).getTime() < thirtyDaysAgo &&
        new Date(c.sent_at).getTime() >= thirtyDaysAgo - 30 * 24 * 60 * 60 * 1000,
    )

    const currentOpenRate = weightedRate(recentSent, 'unique_opens')
    const prevOpenRate = weightedRate(prevSent, 'unique_opens')
    const currentClickRate = weightedRate(recentSent, 'unique_clicks')
    const prevClickRate = weightedRate(prevSent, 'unique_clicks')
    const currentEmailsSent = recentSent.reduce((s, c) => s + (c.emails_sent || 0), 0)
    const prevEmailsSent = prevSent.reduce((s, c) => s + (c.emails_sent || 0), 0)

    // Best performing campaign (sent, min 50 recipients, by open rate)
    const qualifyingCampaigns = sent
      .filter((c) => (c.emails_sent || 0) >= 50)
      .map((c) => ({
        ...c,
        _openRate: c.emails_sent > 0 ? ((c.unique_opens || 0) / c.emails_sent) * 100 : 0,
        _clickRate: c.emails_sent > 0 ? ((c.unique_clicks || 0) / c.emails_sent) * 100 : 0,
      }))
      .sort((a, b) => b._openRate - a._openRate)

    // Bounce rate
    const totalBounces = sent.reduce((s, c) => s + (c.bounces || 0), 0)
    const totalSentAll = sent.reduce((s, c) => s + (c.emails_sent || 0), 0)
    const calculatedBounceRate = totalSentAll > 0 ? (totalBounces / totalSentAll) * 100 : 0

    // Has recent campaign (within 14 days)
    const recentCampaignExists = sent.some(
      (c) => c.sent_at && new Date(c.sent_at).getTime() >= fourteenDaysAgo,
    )

    // New subs this month
    const newSubsThisMonth = subscribers.some(
      (s) => s.created_at && new Date(s.created_at).getTime() >= thirtyDaysAgo,
    )

    return {
      totalSubscribers: subscribers.length,
      sentCampaigns: sent,
      recentCampaigns: campaigns.slice(0, 5),
      avgOpenRate: weightedRate(sent, 'unique_opens'),
      avgClickRate: weightedRate(sent, 'unique_clicks'),
      totalEmailsSent: totalSentAll,
      activeAutomationsList: active,
      bestCampaign: qualifyingCampaigns[0] || null,
      // Trends
      subscribersTrend: computeTrend(recentSubs.length, prevSubs.length),
      openRateTrend: computeTrend(currentOpenRate, prevOpenRate),
      clickRateTrend: computeTrend(currentClickRate, prevClickRate),
      emailsSentTrend: computeTrend(currentEmailsSent, prevEmailsSent),
      // Health
      bounceRate: calculatedBounceRate,
      hasNewSubscribers: newSubsThisMonth,
      hasActiveAutomation: active.length > 0,
      hasRecentCampaign: recentCampaignExists,
    }
  }, [campaigns, subscribers, automations])

  // ── Setup checklist ───────────────────────────────────────────────────

  const checklist = useMemo(() => {
    const items = [
      {
        key: 'api_key',
        label: 'Connect sending domain',
        done: !!settings?.resend_api_key,
        tab: 'domain-setup',
      },
      {
        key: 'from_email',
        label: 'Set default from address',
        done: !!settings?.default_from_email,
        tab: 'settings',
      },
      {
        key: 'list',
        label: 'Create an audience list',
        done: lists.length > 0,
        tab: 'subscribers',
      },
      {
        key: 'subscriber',
        label: 'Add your first subscriber',
        done: subscribers.length > 0,
        tab: 'subscribers',
      },
      {
        key: 'campaign',
        label: 'Send your first campaign',
        done: sentCampaigns.length > 0,
        tab: 'campaigns',
      },
    ]
    const completed = items.filter(i => i.done).length
    return { items, completed, total: items.length, allDone: completed === items.length }
  }, [settings, lists, subscribers, sentCampaigns])

  // ── Loading state ─────────────────────────────────────────────────────

  if (isLoading) {
    return <OutreachLoading label="Loading overview..." />
  }

  // ── Stat metrics for StatTileGrid ─────────────────────────────────────

  const metrics = [
    {
      key: 'subscribers',
      label: 'Subscribers',
      value: totalSubscribers.toLocaleString(),
      icon: Users,
      color: 'brand',
      change: subscribersTrend.change,
      trend: subscribersTrend.trend,
    },
    {
      key: 'open_rate',
      label: 'Avg Open Rate',
      value: `${avgOpenRate.toFixed(1)}%`,
      subtitle: 'Industry avg: 21%',
      icon: Eye,
      color: 'green',
      change: openRateTrend.change,
      trend: openRateTrend.trend,
    },
    {
      key: 'click_rate',
      label: 'Avg Click Rate',
      value: `${avgClickRate.toFixed(1)}%`,
      subtitle: 'Industry avg: 2.6%',
      icon: MousePointerClick,
      color: 'purple',
      change: clickRateTrend.change,
      trend: clickRateTrend.trend,
    },
    {
      key: 'emails_sent',
      label: 'Emails Sent',
      value: totalEmailsSent.toLocaleString(),
      subtitle: `${sentCampaigns.length} campaign${sentCampaigns.length !== 1 ? 's' : ''} sent`,
      icon: Send,
      color: 'orange',
      change: emailsSentTrend.change,
      trend: emailsSentTrend.trend,
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── 1. Signal Insights (plan-gated) ──────────────────────────── */}
      {hasSignal && (
        <GlassCard>
          <GlassCardContent className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  ICON_BG_SOLID.brand,
                )}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Signal Insights
                </h3>
                {insightsLoading ? (
                  <p className="text-sm text-[var(--text-secondary)] italic">
                    Signal is analyzing your email performance...
                  </p>
                ) : insights && insights.length > 0 ? (
                  <ul className="space-y-1.5">
                    {insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                            INSIGHT_DOTS[insight.type] || INSIGHT_DOTS.neutral,
                          )}
                        />
                        <span className={INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.neutral}>
                          {insight.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)] italic">
                    Signal is analyzing your email performance...
                  </p>
                )}
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* ── 2. Key Metrics with trends ───────────────────────────────── */}
      <StatTileGrid metrics={metrics} columns={4} variant="centered" />

      {/* ── 3. Health Score + Best Campaign (side by side) ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmailHealthScore
          bounceRate={bounceRate}
          openRate={avgOpenRate}
          hasNewSubscribers={hasNewSubscribers}
          hasActiveAutomation={hasActiveAutomation}
          hasRecentCampaign={hasRecentCampaign}
          domainVerified={domainHealth.verified}
          spfValid={domainHealth.spf}
          dkimValid={domainHealth.dkim}
        />

        {/* Best Performing Campaign */}
        <GlassCard>
          <GlassCardContent className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  ICON_BG_SOLID.orange,
                )}
              >
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Best Performing Campaign
                </h3>
                {bestCampaign ? (
                  <>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {bestCampaign.name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {bestCampaign.subject}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <Eye className="h-3 w-3" />
                        {bestCampaign._openRate.toFixed(1)}% opens
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <MousePointerClick className="h-3 w-3" />
                        {bestCampaign._clickRate.toFixed(1)}% clicks
                      </span>
                    </div>
                    <button
                      onClick={() => onViewCampaignAnalytics?.(bestCampaign)}
                      className="text-xs font-medium text-[var(--brand-primary)] hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      View Analytics
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Send your first campaign to see performance insights
                  </p>
                )}
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* ── 4. Setup Checklist (hidden once fully configured) ──────────── */}
      {!checklist.allDone && (
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <GlassCardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                Setup Checklist
              </GlassCardTitle>
              <span className="text-sm text-[var(--text-secondary)]">
                {checklist.completed}/{checklist.total} complete
              </span>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {checklist.items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => !item.done && onNavigate(item.tab)}
                  disabled={item.done}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
                    'border border-[var(--glass-border)]',
                    item.done
                      ? 'opacity-60 cursor-default bg-[var(--glass-bg)]'
                      : 'hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg)] cursor-pointer',
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      item.done
                        ? 'line-through text-[var(--text-tertiary)]'
                        : 'text-[var(--text-primary)]',
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* ── 5. Quick Actions ────────────────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            Quick Actions
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.filter((a) => !a.isSignal || hasSignal).map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.action === 'signal_compose') {
                    setShowSignalCompose(true)
                  } else if (action.tab === 'campaigns' && onNewCampaign) {
                    onNewCampaign()
                  } else {
                    onNavigate(action.tab)
                  }
                }}
                className={cn(
                  GLASS_TILE_HOVER,
                  'flex flex-col items-center gap-2.5 p-5 text-center',
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    ICON_BG_SOLID[action.colorKey] || ICON_BG_SOLID.brand,
                  )}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ── 6. Two-Column: Recent Campaigns + Activity Timeline ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <GlassCardTitle className="text-lg">Recent Campaigns</GlassCardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => onNavigate('campaigns')}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center opacity-60">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  No campaigns yet
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onNewCampaign ? onNewCampaign() : onNavigate('campaigns')
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create your first campaign
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCampaigns.map((campaign) => {
                  const openRate =
                    campaign.status === 'sent' && campaign.emails_sent > 0
                      ? ((campaign.unique_opens || 0) / campaign.emails_sent) * 100
                      : null

                  return (
                    <button
                      key={campaign.id}
                      onClick={() =>
                        onViewCampaignAnalytics
                          ? onViewCampaignAnalytics(campaign)
                          : undefined
                      }
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left',
                        'border border-[var(--glass-border)]',
                        'hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg)]',
                        'transition-all duration-200 cursor-pointer',
                      )}
                    >
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          campaign.status === 'sent'
                            ? 'bg-emerald-500/10'
                            : 'bg-[var(--glass-bg)]',
                        )}
                      >
                        <Mail
                          className={cn(
                            'h-4 w-4',
                            campaign.status === 'sent'
                              ? 'text-emerald-500'
                              : 'text-[var(--text-tertiary)]',
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {campaign.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {campaign.status === 'sent'
                            ? `Sent to ${(campaign.emails_sent || 0).toLocaleString()} subscribers`
                            : null}
                          {campaign.status !== 'sent' && (
                            <OutreachStatusBadge status={campaign.status} />
                          )}
                        </p>
                      </div>
                      {openRate !== null && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-emerald-500">
                            {openRate.toFixed(0)}%
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">opens</p>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Activity Timeline */}
        <ActivityTimeline />
      </div>

      {/* ── 7. Active Automations ──────────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-lg">Active Automations</GlassCardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => onNavigate('automations')}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {activeAutomationsList.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center opacity-60">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                No active automations
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('automations')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create an automation
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeAutomationsList.slice(0, 6).map((auto) => {
                const inProgress = (auto.total_enrolled || 0) - (auto.total_completed || 0)
                return (
                  <div
                    key={auto.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'border border-[var(--glass-border)]',
                      'hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg)]',
                      'transition-all duration-200',
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10">
                      <Zap className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                        {auto.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {inProgress > 0
                          ? `${inProgress.toLocaleString()} in progress`
                          : 'No active enrollments'}
                      </p>
                    </div>
                    <OutreachStatusBadge status="active" />
                  </div>
                )
              })}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* ── 8. Audience Lists ─────────────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-lg">Audience Lists</GlassCardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => onNavigate('subscribers')}
            >
              Manage Lists
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {lists.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center opacity-60">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                No lists created yet
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('subscribers')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create a list
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {lists.map((list, idx) => (
                <div
                  key={list.id}
                  className={cn(
                    'p-4 rounded-xl cursor-pointer',
                    'border border-[var(--glass-border)]',
                    'hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg)]',
                    'transition-all duration-200',
                  )}
                  onClick={() => onNavigate('subscribers')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {list.name}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {(list.subscriber_count || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">subscribers</p>
                </div>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Bottom padding so users can scroll past the last card */}
      <div className="h-16" />

      {/* Signal Compose Modal */}
      <SignalCompose
        open={showSignalCompose}
        onOpenChange={setShowSignalCompose}
        onCreateCampaign={(data) => {
          setShowSignalCompose(false)
          if (onNewCampaign) onNewCampaign(data)
        }}
        onOpenInEditor={(data) => {
          setShowSignalCompose(false)
          if (onOpenInEditor) onOpenInEditor(data)
        }}
      />
    </div>
  )
}
