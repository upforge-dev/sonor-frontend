/**
 * RepDashboard - Personal dashboard for sales reps
 * Shows their own metrics, pipeline, and activity feed
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  BarChart3,
  Target,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  DollarSign,
  Percent,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatTile } from '@/components/ui/stat-tile'
import { GlassCard, GlassEmptyState } from '@/components/crm/ui'
import { reportsApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Metric Card Component — thin wrapper around StatTile for backwards compatibility
function MetricCard({ label, value, icon, trend, trendLabel, color = 'brand', size = 'md' }) {
  return (
    <StatTile
      label={label}
      value={value}
      icon={icon}
      change={trend !== undefined ? `${trend >= 0 ? '+' : ''}${trend}%` : undefined}
      trend={trend !== undefined ? (trend >= 0 ? 'up' : 'down') : undefined}
      subtitle={trendLabel}
      color={color}
      variant="horizontal"
    />
  )
}

// Pipeline Stage Bar
function PipelineStage({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-sm text-[var(--text-secondary)] flex-1">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)] w-8 text-right">{count}</span>
      <div className="w-24">
        <Progress value={percentage} className="h-1.5" />
      </div>
    </div>
  )
}

// Activity Item
function ActivityItem({ activity }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'call': return Phone
      case 'email_sent': return Mail
      case 'proposal_created': return FileText
      case 'audit_created': return BarChart3
      case 'pipeline_stage_changed': return ArrowUpRight
      case 'note_added': return MessageSquare
      default: return Activity
    }
  }

  const Icon = getActivityIcon(activity.type)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--glass-border)] last:border-0">
      <div className="p-2 rounded-lg bg-[var(--glass-bg-inset)]">
        <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate">
          {activity.description || activity.type.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
    </div>
  )
}

// Pipeline stages config
const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead', color: 'bg-gray-400' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-400' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-400' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-400' },
  { key: 'negotiating', label: 'Negotiating', color: 'bg-amber-400' },
  { key: 'won', label: 'Won', color: 'bg-green-400' },
  { key: 'lost', label: 'Lost', color: 'bg-red-400' }
]

// Main Component
export default function RepDashboard({ onNavigate }) {
  const { user } = useAuthStore()
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchDashboard = async () => {
    try {
      const response = await reportsApi.getRepDashboard()
      setDashboard(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
      setError(err.response?.data?.error || 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchDashboard()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <GlassEmptyState
        icon={Activity}
        title="Unable to load dashboard"
        description={error}
        action={
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    )
  }

  const { metrics, trends, pipeline, recentActivity } = dashboard || {}
  const totalPipeline = Object.values(pipeline || {}).reduce((sum, n) => sum + n, 0)

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-[var(--text-tertiary)]">
            Here's how you're doing this month
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Assigned Prospects"
          value={metrics?.assignedClients || 0}
          icon={Users}
          color="blue"
        />
        <MetricCard
          label="Audits Created"
          value={metrics?.totalAudits || 0}
          icon={BarChart3}
          trend={trends?.auditsChange}
          trendLabel="vs last month"
          color="purple"
        />
        <MetricCard
          label="Proposals Sent"
          value={metrics?.totalProposals || 0}
          icon={FileText}
          trend={trends?.proposalsChange}
          trendLabel="vs last month"
          color="orange"
        />
        <MetricCard
          label="Conversion Rate"
          value={`${metrics?.conversionRate || 0}%`}
          icon={Target}
          color="green"
        />
      </div>

      {/* Revenue & Pipeline Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Revenue Cards */}
        <div className="space-y-4">
          <MetricCard
            label="Won Revenue"
            value={formatCurrency(metrics?.totalRevenue)}
            icon={DollarSign}
            color="green"
            size="lg"
          />
          <MetricCard
            label="Pending Revenue"
            value={formatCurrency(metrics?.pendingRevenue)}
            icon={Clock}
            color="orange"
          />
        </div>

        {/* Pipeline Distribution */}
        <GlassCard padding="md" className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Pipeline Distribution</h3>
            <span className="text-sm text-[var(--text-tertiary)]">
              {totalPipeline} total leads
            </span>
          </div>
          <div className="space-y-3">
            {PIPELINE_STAGES.map(stage => (
              <PipelineStage
                key={stage.key}
                label={stage.label}
                count={pipeline?.[stage.key] || 0}
                total={totalPipeline}
                color={stage.color}
              />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row: Activity & Quick Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <GlassCard padding="md">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Recent Activity</h3>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {recentActivity.slice(0, 10).map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 mx-auto text-[var(--text-tertiary)] opacity-50 mb-2" />
              <p className="text-sm text-[var(--text-tertiary)]">No recent activity</p>
            </div>
          )}
        </GlassCard>

        {/* Monthly Progress */}
        <GlassCard padding="md">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">This Month</h3>
          <div className="space-y-6">
            {/* Audits Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">Audits</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {trends?.thisMonthAudits || 0} created
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={Math.min(((trends?.thisMonthAudits || 0) / Math.max(trends?.lastMonthAudits || 1, 1)) * 100, 100)} 
                  className="flex-1 h-2" 
                />
                <span className={cn(
                  "text-xs font-medium",
                  (trends?.auditsChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {(trends?.auditsChange || 0) >= 0 ? '+' : ''}{trends?.auditsChange || 0}%
                </span>
              </div>
            </div>

            {/* Proposals Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">Proposals</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {trends?.thisMonthProposals || 0} sent
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress 
                  value={Math.min(((trends?.thisMonthProposals || 0) / Math.max(trends?.lastMonthProposals || 1, 1)) * 100, 100)} 
                  className="flex-1 h-2" 
                />
                <span className={cn(
                  "text-xs font-medium",
                  (trends?.proposalsChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {(trends?.proposalsChange || 0) >= 0 ? '+' : ''}{trends?.proposalsChange || 0}%
                </span>
              </div>
            </div>

            {/* Deals Closed */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">Deals Won</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {metrics?.acceptedProposals || 0} closed
                </span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-green-400/10 border border-green-400/20">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">
                    {formatCurrency(metrics?.totalRevenue)} closed
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {formatCurrency(metrics?.pendingRevenue)} pending
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
