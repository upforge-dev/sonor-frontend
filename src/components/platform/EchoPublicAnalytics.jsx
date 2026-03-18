/**
 * EchoPublicAnalytics
 *
 * Platform admin dashboard for public Echo conversation analytics.
 * Shows overview metrics, top questions, conversion funnel, content gaps,
 * and recent leads captured via the public Echo widget.
 *
 * Only accessible to platform admins (isSuperAdmin). Accepts a projectId prop
 * or falls back to the currently selected project from auth state.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  MessageCircle,
  Users,
  UserPlus,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import useAuthStore from '@/lib/auth-store'
import { echoAnalyticsApi } from '@/lib/signal-api'
import { format, parseISO } from 'date-fns'

// ============================================================================
// Query keys
// ============================================================================

const echoAnalyticsKeys = {
  overview: (projectId, days) => ['echo-analytics', 'overview', projectId, days],
  topQuestions: (projectId, days) => ['echo-analytics', 'top-questions', projectId, days],
  conversions: (projectId, days) => ['echo-analytics', 'conversions', projectId, days],
  contentGaps: (projectId) => ['echo-analytics', 'content-gaps', projectId],
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({ label, value, icon: Icon, description, loading }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{value}</p>
            {description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--brand-primary)]/10 shrink-0">
            <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SectionSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg text-sm"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-secondary)] w-28 shrink-0">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-[var(--glass-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-[var(--text-primary)] w-8 text-right">
        {value}
      </span>
    </div>
  )
}

function QuestionRow({ item, index }) {
  const [expanded, setExpanded] = useState(false)
  const hasVariants = item.variants && item.variants.length > 1

  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums mt-0.5 w-5 shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] leading-snug break-words">
            {item.question}
          </p>
          {expanded && hasVariants && (
            <ul className="mt-2 space-y-1">
              {item.variants.slice(1).map((v, i) => (
                <li key={i} className="text-xs text-[var(--text-secondary)] pl-3 border-l border-[var(--glass-border)]">
                  {v}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs tabular-nums">
            {item.count}×
          </Badge>
          {hasVariants && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              aria-label={expanded ? 'Collapse variants' : 'Expand variants'}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StageBadge({ stage }) {
  const map = {
    new: { label: 'New', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    contacted: { label: 'Contacted', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    demo_requested: { label: 'Demo', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    won: { label: 'Won', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    customer: { label: 'Customer', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    client: { label: 'Client', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  }
  const s = map[stage] || { label: stage || 'Unknown', className: '' }
  return (
    <Badge variant="outline" className={`text-xs ${s.className}`}>
      {s.label}
    </Badge>
  )
}

// ============================================================================
// Main component
// ============================================================================

const DAY_OPTIONS = [7, 14, 30, 60, 90]

export default function EchoPublicAnalytics({ projectId: propProjectId }) {
  const { currentProject } = useAuthStore()
  const projectId = propProjectId || currentProject?.id
  const [days, setDays] = useState(30)

  const overviewQuery = useQuery({
    queryKey: echoAnalyticsKeys.overview(projectId, days),
    queryFn: () => echoAnalyticsApi.overview(projectId, days),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })

  const questionsQuery = useQuery({
    queryKey: echoAnalyticsKeys.topQuestions(projectId, days),
    queryFn: () => echoAnalyticsApi.topQuestions(projectId, days, 20),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })

  const conversionsQuery = useQuery({
    queryKey: echoAnalyticsKeys.conversions(projectId, days),
    queryFn: () => echoAnalyticsApi.conversions(projectId, days),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })

  const gapsQuery = useQuery({
    queryKey: echoAnalyticsKeys.contentGaps(projectId),
    queryFn: () => echoAnalyticsApi.contentGaps(projectId, 15),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  })

  if (!projectId) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No project selected"
        description="Select a project to view Echo analytics."
      />
    )
  }

  const overview = overviewQuery.data
  const questions = questionsQuery.data || []
  const conversions = conversionsQuery.data
  const gaps = gapsQuery.data || []

  const isOverviewLoading = overviewQuery.isLoading
  const isQuestionsLoading = questionsQuery.isLoading
  const isConversionsLoading = conversionsQuery.isLoading
  const isGapsLoading = gapsQuery.isLoading

  const funnel = conversions?.funnel || {}
  const recentLeads = conversions?.recentLeads || []
  const dailyVolume = overview?.dailyVolume || []
  const topPages = overview?.topPages || []

  return (
    <div className="space-y-6">
      {/* Header + Day picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Public Echo Analytics
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Visitor conversations, leads, and content gaps from the public Echo widget
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--glass-border)] p-0.5 bg-[var(--glass-bg)]">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Conversations"
          value={overview?.totalConversations?.toLocaleString() ?? '—'}
          icon={MessageCircle}
          description={`${overview?.avgMessagesPerConversation ?? 0} msgs/conversation avg`}
          loading={isOverviewLoading}
        />
        <StatCard
          label="Unique Visitors"
          value={overview?.uniqueVisitors?.toLocaleString() ?? '—'}
          icon={Users}
          description={`${overview?.totalMessages?.toLocaleString() ?? 0} total messages`}
          loading={isOverviewLoading}
        />
        <StatCard
          label="Leads Captured"
          value={overview?.leadsCaptured?.toLocaleString() ?? '—'}
          icon={UserPlus}
          description={`${overview?.demoRequests ?? 0} demo requests`}
          loading={isOverviewLoading}
        />
        <StatCard
          label="Conversion Rate"
          value={overview ? `${overview.conversionRate}%` : '—'}
          icon={TrendingUp}
          description="conversations → leads"
          loading={isOverviewLoading}
        />
      </div>

      {/* Section 2: Daily Volume Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {isOverviewLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : dailyVolume.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-10">
              No conversation data in this period
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyVolume} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="echoConvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="echoMsgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    try {
                      return format(parseISO(v), 'M/d')
                    } catch {
                      return v
                    }
                  }}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="conversations"
                  name="Conversations"
                  stroke="var(--brand-primary)"
                  fill="url(#echoConvGradient)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Messages"
                  stroke="#10b981"
                  fill="url(#echoMsgGradient)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Section 3 & 4: Top Questions + Content Gaps side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Questions */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[var(--brand-primary)]" />
              Top Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {isQuestionsLoading ? (
              <SectionSkeleton rows={5} />
            ) : questions.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No questions yet"
                description="Visitor questions will appear here once conversations start."
                compact
              />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {questions.map((item, i) => (
                  <QuestionRow key={i} item={item} index={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Gaps */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Content Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {isGapsLoading ? (
              <SectionSkeleton rows={5} />
            ) : gaps.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No content gaps"
                description="Questions Echo couldn't answer well will surface here."
                compact
              />
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--glass-border)]">
                      <th className="text-left py-2 text-xs font-medium text-[var(--text-secondary)]">
                        Question
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-secondary)] w-16">
                        Asked
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-secondary)] w-20">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((gap) => (
                      <tr
                        key={gap.id}
                        className="border-b border-[var(--glass-border)] last:border-0 hover:bg-[var(--glass-border)]/30 transition-colors"
                      >
                        <td className="py-2 pr-3">
                          <p className="text-xs text-[var(--text-primary)] leading-snug line-clamp-2">
                            {gap.question}
                          </p>
                          {gap.lastAsked && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                              Last:{' '}
                              {format(parseISO(gap.lastAsked), 'MMM d')}
                            </p>
                          )}
                        </td>
                        <td className="py-2 text-right tabular-nums text-xs text-[var(--text-primary)]">
                          {gap.occurrences}×
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`text-xs font-medium ${
                              gap.confidence < 40
                                ? 'text-red-500'
                                : gap.confidence < 65
                                ? 'text-amber-500'
                                : 'text-emerald-600'
                            }`}
                          >
                            {gap.confidence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 5 & 6: Conversion Funnel + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isConversionsLoading ? (
              <SectionSkeleton rows={5} />
            ) : !funnel.total_leads && !overview?.totalConversations ? (
              <EmptyState
                icon={TrendingUp}
                title="No conversions yet"
                description="Lead funnel data will appear here once visitors interact with Echo."
                compact
              />
            ) : (
              <div className="space-y-3 mt-1">
                <FunnelBar
                  label="Conversations"
                  value={overview?.totalConversations ?? 0}
                  total={overview?.totalConversations ?? 1}
                  color="var(--brand-primary)"
                />
                <FunnelBar
                  label="Total Leads"
                  value={funnel.total_leads ?? 0}
                  total={overview?.totalConversations ?? 1}
                  color="#818cf8"
                />
                <FunnelBar
                  label="New"
                  value={funnel.new ?? 0}
                  total={overview?.totalConversations ?? 1}
                  color="#60a5fa"
                />
                <FunnelBar
                  label="Demo Requested"
                  value={funnel.demo_requested ?? 0}
                  total={overview?.totalConversations ?? 1}
                  color="#a78bfa"
                />
                <FunnelBar
                  label="Contacted"
                  value={funnel.contacted ?? 0}
                  total={overview?.totalConversations ?? 1}
                  color="#f59e0b"
                />
                <FunnelBar
                  label="Converted"
                  value={funnel.converted ?? 0}
                  total={overview?.totalConversations ?? 1}
                  color="#10b981"
                />
              </div>
            )}

            {/* Daily leads chart */}
            {!isConversionsLoading && conversions?.dailyLeads?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Daily Leads</p>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={conversions.dailyLeads} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => {
                        try {
                          return format(parseISO(v), 'M/d')
                        } catch {
                          return v
                        }
                      }}
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div
                            className="rounded-lg border px-2 py-1.5 shadow text-xs"
                            style={{
                              background: 'var(--glass-bg)',
                              borderColor: 'var(--glass-border)',
                            }}
                          >
                            <p className="text-[var(--text-secondary)]">{label}</p>
                            <p className="font-semibold text-[var(--text-primary)]">
                              {payload[0].value} leads
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="count" fill="var(--brand-primary)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--brand-primary)]" />
              Recent Leads via Echo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isConversionsLoading ? (
              <SectionSkeleton rows={5} />
            ) : recentLeads.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="No leads captured"
                description="Leads collected through the Echo widget will appear here."
                compact
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--glass-border)]">
                      <th className="text-left py-2 text-xs font-medium text-[var(--text-secondary)]">
                        Name
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-[var(--text-secondary)] hidden sm:table-cell">
                        Company
                      </th>
                      <th className="text-left py-2 text-xs font-medium text-[var(--text-secondary)]">
                        Stage
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-[var(--text-secondary)]">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-[var(--glass-border)] last:border-0"
                      >
                        <td className="py-2 pr-2">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]">
                            {lead.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-[120px]">
                            {lead.email}
                          </p>
                        </td>
                        <td className="py-2 pr-2 hidden sm:table-cell">
                          <p className="text-xs text-[var(--text-secondary)] truncate max-w-[100px]">
                            {lead.company || '—'}
                          </p>
                        </td>
                        <td className="py-2">
                          <StageBadge stage={lead.stage} />
                        </td>
                        <td className="py-2 text-right">
                          <p className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                            {lead.createdAt
                              ? format(parseISO(lead.createdAt), 'MMM d')
                              : '—'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      {!isOverviewLoading && topPages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-[var(--brand-primary)]" />
              Top Pages Where Echo Was Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPages.map(({ url, count }, i) => {
                const pct = topPages[0]?.count > 0 ? (count / topPages[0].count) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="text-xs text-[var(--text-primary)] truncate max-w-[70%]"
                          title={url}
                        >
                          {url}
                        </p>
                        <span className="text-xs tabular-nums text-[var(--text-secondary)] ml-2 shrink-0">
                          {count} conversations
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--glass-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--brand-primary)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
