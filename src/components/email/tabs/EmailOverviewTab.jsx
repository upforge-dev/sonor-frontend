/**
 * EmailOverviewTab — Email Platform Dashboard Overview
 *
 * Extracted from EmailPlatform.jsx and rebuilt with the Liquid Glass
 * design system. All metrics use weighted averages, no fake trend data,
 * and campaigns are clickable for analytics drill-down.
 *
 * Props:
 *   onNavigate(tab)              — switch to another email tab
 *   onNewCampaign()              — open campaign creation flow
 *   onViewCampaignAnalytics(c)   — drill into a single campaign's stats
 *
 * Design tokens: --brand-primary, --text-primary, --text-secondary,
 * --text-tertiary, --glass-bg, --glass-border, --glass-border-strong
 */

import { useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { cn } from '@/lib/utils'

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
  { label: 'New Campaign',  icon: Send,     tab: 'campaigns',   colorKey: 'brand'  },
  { label: 'New Automation', icon: Zap,     tab: 'automations', colorKey: 'purple' },
  { label: 'Add Subscriber', icon: UserPlus, tab: 'subscribers', colorKey: 'green'  },
  { label: 'Edit Template',  icon: Palette, tab: 'templates',   colorKey: 'orange' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Weighted avg: totalX / totalSent (not per-campaign average) */
function weightedRate(sentCampaigns, numeratorKey) {
  const totalNumerator = sentCampaigns.reduce((s, c) => s + (c[numeratorKey] || 0), 0)
  const totalSent = sentCampaigns.reduce((s, c) => s + (c.emails_sent || 0), 0)
  if (totalSent === 0) return 0
  return (totalNumerator / totalSent) * 100
}

// ─── Component ───────────────────────────────────────────────────────────

export default function EmailOverviewTab({
  onNavigate,
  onNewCampaign,
  onViewCampaignAnalytics,
}) {
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

  useEffect(() => {
    fetchCampaigns()
    fetchSubscribers()
    fetchAutomations()
    fetchLists()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  } = useMemo(() => {
    const sent = campaigns.filter(c => c.status === 'sent')
    const active = automations.filter(a => a.status === 'active')

    return {
      totalSubscribers: subscribers.length,
      sentCampaigns: sent,
      recentCampaigns: campaigns.slice(0, 5),
      avgOpenRate: weightedRate(sent, 'unique_opens'),
      avgClickRate: weightedRate(sent, 'unique_clicks'),
      totalEmailsSent: sent.reduce((s, c) => s + (c.emails_sent || 0), 0),
      activeAutomationsList: active,
    }
  }, [campaigns, subscribers, automations])

  // ── Setup checklist ───────────────────────────────────────────────────

  const checklist = useMemo(() => {
    const items = [
      {
        key: 'api_key',
        label: 'Connect sending provider',
        done: !!settings?.resend_api_key,
        tab: 'settings',
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
      // No fake trend — only show if we can calculate real growth
    },
    {
      key: 'open_rate',
      label: 'Avg Open Rate',
      value: `${avgOpenRate.toFixed(1)}%`,
      subtitle: 'Industry avg: 21%',
      icon: Eye,
      color: 'green',
    },
    {
      key: 'click_rate',
      label: 'Avg Click Rate',
      value: `${avgClickRate.toFixed(1)}%`,
      subtitle: 'Industry avg: 2.6%',
      icon: MousePointerClick,
      color: 'purple',
    },
    {
      key: 'emails_sent',
      label: 'Emails Sent',
      value: totalEmailsSent.toLocaleString(),
      subtitle: `${sentCampaigns.length} campaign${sentCampaigns.length !== 1 ? 's' : ''} sent`,
      icon: Send,
      color: 'orange',
    },
  ]

  return (
    <div className="space-y-8">
      {/* ── Key Metrics ──────────────────────────────────────────────── */}
      <StatTileGrid metrics={metrics} columns={4} variant="centered" />

      {/* ── Setup Checklist (hidden once fully configured) ──────────── */}
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

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            Quick Actions
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() =>
                  action.tab === 'campaigns' && onNewCampaign
                    ? onNewCampaign()
                    : onNavigate(action.tab)
                }
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

      {/* ── Two-Column: Recent Campaigns + Active Automations ────────── */}
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

        {/* Active Automations */}
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
              <div className="space-y-2">
                {activeAutomationsList.slice(0, 5).map((auto) => {
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
      </div>

      {/* ── Audience Lists (all, scrollable) ─────────────────────────── */}
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
    </div>
  )
}
