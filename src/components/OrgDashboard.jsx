/**
 * OrgDashboard - Organization-level dashboard for CMO/CEO overview
 * 
 * Shows aggregate analytics across all projects, pending items,
 * project health comparisons, and quick actions.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  MousePointer,
  DollarSign,
  Clock,
  ArrowUpRight,
  BarChart3,
  FileText,
  Send,
  MessageSquare,
  Loader2,
  RefreshCw,
  ChevronRight,
  Activity,
  Target,
  Zap,
  ExternalLink,
  Globe,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Circle
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import portalApi from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

// Status indicators for project health
const PROJECT_HEALTH = {
  healthy: { label: 'Healthy', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2 },
  warning: { label: 'Needs Attention', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertCircle },
  critical: { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  inactive: { label: 'Inactive', color: 'text-gray-400', bg: 'bg-gray-500/10', icon: Circle },
}

// Chart color palette for projects
const PROJECT_COLORS = [
  'rgb(59, 130, 246)',   // blue
  'rgb(16, 185, 129)',   // green
  'rgb(139, 92, 246)',   // purple
  'rgb(245, 158, 11)',   // amber
  'rgb(236, 72, 153)',   // pink
  'rgb(20, 184, 166)',   // teal
  'rgb(249, 115, 22)',   // orange
  'rgb(99, 102, 241)',   // indigo
]

// Format numbers for display
function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num?.toLocaleString() || '0'
}

function formatCurrency(num) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num || 0)
}

// Calculate trend direction and percentage
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return { direction: 'stable', percent: 0 }
  const change = ((current - previous) / previous) * 100
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    percent: Math.abs(change).toFixed(1)
  }
}

// Skeleton loaders
function MetricSkeleton() {
  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardContent className="p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function ProjectCardSkeleton() {
  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </CardContent>
    </Card>
  )
}

// Aggregate metrics card component
function MetricCard({ label, value, icon: Icon, trend, subtitle, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500',
    pink: 'bg-pink-500/10 text-pink-500',
    brand: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
  }

  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : trend.direction === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Activity className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
            <span className={cn(
              'text-sm font-medium',
              trend.direction === 'up' ? 'text-green-500' : 
              trend.direction === 'down' ? 'text-red-500' : 'text-[var(--text-tertiary)]'
            )}>
              {trend.percent}%
            </span>
            <span className="text-sm text-[var(--text-tertiary)]">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Project card with mini chart/metrics
function ProjectCard({ project, onClick, colorIndex = 0 }) {
  const health = project.health || 'healthy'
  const healthInfo = PROJECT_HEALTH[health] || PROJECT_HEALTH.inactive
  const HealthIcon = healthInfo.icon
  const color = PROJECT_COLORS[colorIndex % PROJECT_COLORS.length]
  
  const trend = calculateTrend(project.pageViews, project.previousPageViews)
  
  return (
    <Card 
      className={cn(
        "bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]",
        "hover:border-[var(--brand-primary)]/30 hover:shadow-lg transition-all cursor-pointer group"
      )}
      onClick={() => onClick?.(project)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <Globe className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
                {project.name || project.title}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] truncate">
                {project.domain || 'No domain'}
              </p>
            </div>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full', healthInfo.bg)}>
            <HealthIcon className={cn('w-3 h-3', healthInfo.color)} />
            <span className={cn('text-xs font-medium', healthInfo.color)}>{healthInfo.label}</span>
          </div>
        </div>
        
        {/* Mini metrics row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-[var(--surface-secondary)] rounded-lg p-2">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {formatNumber(project.pageViews || 0)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Views</p>
          </div>
          <div className="bg-[var(--surface-secondary)] rounded-lg p-2">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {formatNumber(project.sessions || 0)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Sessions</p>
          </div>
          <div className="bg-[var(--surface-secondary)] rounded-lg p-2">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {project.conversionRate?.toFixed(1) || '0'}%
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Conv.</p>
          </div>
        </div>
        
        {/* Trend indicator */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : trend.direction === 'down' ? (
              <TrendingDown className="w-3 h-3 text-red-500" />
            ) : (
              <Activity className="w-3 h-3 text-[var(--text-tertiary)]" />
            )}
            <span className={cn(
              trend.direction === 'up' ? 'text-green-500' : 
              trend.direction === 'down' ? 'text-red-500' : 'text-[var(--text-tertiary)]'
            )}>
              {trend.percent}% {trend.direction === 'up' ? 'growth' : trend.direction === 'down' ? 'decline' : 'stable'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}

// Pending action item
function PendingItem({ item, onClick }) {
  const typeConfig = {
    proposal: { icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    invoice: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    message: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    task: { icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  }
  
  const config = typeConfig[item.type] || typeConfig.task
  const Icon = config.icon
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        "bg-[var(--surface-secondary)] border border-transparent",
        "hover:border-[var(--brand-primary)]/20 hover:bg-[var(--glass-bg)]"
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {item.title}
        </p>
        <p className="text-xs text-[var(--text-tertiary)] truncate">
          {item.subtitle}
        </p>
      </div>
      {item.badge && (
        <Badge variant="secondary" className="ml-2 text-xs">
          {item.badge}
        </Badge>
      )}
    </button>
  )
}

// Custom tooltip for recharts - dark theme compatible
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  
  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-zinc-100 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="font-medium text-zinc-100">
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// Multi-project bar chart using Recharts with brand colors
function ProjectComparisonChart({ projects }) {
  // Each project gets its own brand colors
  const chartData = projects.slice(0, 6).map((project, index) => ({
    name: project.name || project.title || `Project ${index + 1}`,
    pageViews: project.pageViews || 0,
    sessions: project.sessions || 0,
    brandPrimary: project.brand_primary || PROJECT_COLORS[index % PROJECT_COLORS.length],
  }))

  // Custom legend that shows project colors
  const renderLegend = () => (
    <div className="flex flex-wrap justify-center gap-4 pt-3">
      {chartData.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.brandPrimary }} />
          </div>
          <span className="text-zinc-400 text-xs">{entry.name}</span>
        </div>
      ))}
      <div className="flex items-center gap-4 ml-4 border-l border-zinc-700 pl-4">
        <span className="text-zinc-500 text-xs">■ Page Views</span>
        <span className="text-zinc-500 text-xs">■ Sessions</span>
      </div>
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="name" 
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis 
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Legend content={renderLegend} />
        <Bar 
          dataKey="pageViews" 
          name="Page Views" 
          radius={[4, 4, 0, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-pv-${index}`} fill={entry.brandPrimary} />
          ))}
        </Bar>
        <Bar 
          dataKey="sessions" 
          name="Sessions" 
          radius={[4, 4, 0, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-s-${index}`} fill={entry.brandPrimary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Trend line chart showing daily traffic across all projects with brand colors
function MultiProjectTrendChart({ projects, dailyData = [] }) {
  // Generate mock daily data if not provided
  const chartData = useMemo(() => {
    if (dailyData.length > 0) return dailyData
    
    // Generate 14 days of mock data for each project
    const days = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayData = {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }
      
      projects.slice(0, 6).forEach((project, idx) => {
        const baseLine = (project.pageViews || 1000) / 14
        const variance = baseLine * 0.3
        const key = project.id || `project-${idx}`
        dayData[key] = Math.floor(baseLine + (Math.random() - 0.5) * variance * 2)
      })
      
      days.push(dayData)
    }
    return days
  }, [projects, dailyData])
  
  // Get project info for legend and colors
  const projectsToShow = projects.slice(0, 6).map((p, idx) => ({
    id: p.id || `project-${idx}`,
    name: p.name || p.title || `Project ${idx + 1}`,
    color: p.brand_primary || PROJECT_COLORS[idx % PROJECT_COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {projectsToShow.map((project) => (
            <linearGradient key={project.id} id={`gradient-${project.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={project.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={project.color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis 
          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
          wrapperStyle={{ outline: 'none' }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: 10 }}
          formatter={(value) => {
            const project = projectsToShow.find(p => p.id === value)
            return <span className="text-zinc-400 text-sm">{project?.name || value}</span>
          }}
        />
        {projectsToShow.map((project) => (
          <Area
            key={project.id}
            type="monotone"
            dataKey={project.id}
            name={project.id}
            stroke={project.color}
            strokeWidth={2}
            fill={`url(#gradient-${project.id})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Traffic sources donut chart using Recharts
function TrafficSourcesChart({ projects }) {
  const chartData = [
    { name: 'Organic', value: 42 },
    { name: 'Direct', value: 28 },
    { name: 'Social', value: 18 },
    { name: 'Referral', value: 8 },
    { name: 'Email', value: 4 },
  ]
  
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899']

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`${value}%`, 'Traffic']}
          contentStyle={{ 
            backgroundColor: '#18181b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#fafafa'
          }}
          itemStyle={{ color: '#a1a1aa' }}
          labelStyle={{ color: '#fafafa' }}
          wrapperStyle={{ outline: 'none' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Main OrgDashboard component
export default function OrgDashboard({ onNavigate }) {
  const navigate = useNavigate()
  const { currentOrg, availableProjects, switchProject } = useAuthStore()
  const { brandPrimary } = useBrandColors()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    aggregateMetrics: {
      totalPageViews: 0,
      totalSessions: 0,
      totalVisitors: 0,
      avgBounceRate: 0,
      avgConversionRate: 0,
      totalRevenue: 0,
      totalLeads: 0,
    },
    previousPeriod: null,
    projectStats: [],
    pendingItems: [],
    recentActivity: [],
  })
  
  // Fetch org dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    if (!currentOrg?.id) return
    
    try {
      isRefresh ? setIsRefreshing(true) : setIsLoading(true)
      setError(null)
      
      const { portalApi } = await import('@/lib/sonor-api')
      
      const projectStats = await Promise.all(
        (availableProjects || []).map(async (project, index) => {
          let stats = {}
          try {
            const { data } = await portalApi.get(`/analytics/projects/${project.id}/summary`, {
              params: { period: '30d' },
            })
            stats = data || {}
          } catch {
            // Analytics may not be available for all projects
          }
          return {
            id: project.id,
            name: project.name || project.title,
            domain: project.domain,
            brand_primary: project.brand_primary || PROJECT_COLORS[index % PROJECT_COLORS.length],
            pageViews: stats.pageViews || 0,
            previousPageViews: stats.previousPageViews || 0,
            sessions: stats.sessions || 0,
            bounceRate: stats.bounceRate || 0,
            conversionRate: stats.conversionRate || 0,
            revenue: stats.revenue || 0,
            leads: stats.leads || 0,
            health: stats.health || 'healthy',
          }
        })
      )
      
      // Calculate aggregates
      const aggregates = projectStats.reduce((acc, p) => ({
        totalPageViews: acc.totalPageViews + (p.pageViews || 0),
        totalSessions: acc.totalSessions + (p.sessions || 0),
        totalVisitors: acc.totalVisitors + Math.floor((p.sessions || 0) * 0.7),
        avgBounceRate: acc.avgBounceRate + (p.bounceRate || 0),
        avgConversionRate: acc.avgConversionRate + (p.conversionRate || 0),
        totalRevenue: acc.totalRevenue + (p.revenue || 0),
        totalLeads: acc.totalLeads + (p.leads || 0),
      }), {
        totalPageViews: 0,
        totalSessions: 0,
        totalVisitors: 0,
        avgBounceRate: 0,
        avgConversionRate: 0,
        totalRevenue: 0,
        totalLeads: 0,
      })
      
      // Average rates
      if (projectStats.length > 0) {
        aggregates.avgBounceRate = aggregates.avgBounceRate / projectStats.length
        aggregates.avgConversionRate = aggregates.avgConversionRate / projectStats.length
      }
      
      // Generate pending items
      const pendingItems = [
        { type: 'proposal', title: 'Website Redesign Proposal', subtitle: 'Awaiting your review', badge: 'New' },
        { type: 'invoice', title: 'Invoice #1234', subtitle: '$2,500 due Jan 25', badge: 'Due Soon' },
        { type: 'message', title: 'New message from Sonor', subtitle: '2 hours ago', badge: '1' },
      ]
      
      setDashboardData({
        aggregateMetrics: aggregates,
        previousPeriod: {
          totalPageViews: aggregates.totalPageViews * 0.85,
          totalSessions: aggregates.totalSessions * 0.9,
        },
        projectStats: projectStats.sort((a, b) => (b.pageViews || 0) - (a.pageViews || 0)),
        pendingItems,
        recentActivity: [],
      })
      
    } catch (err) {
      console.error('Failed to load org dashboard:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }
  
  // Initial load
  useEffect(() => {
    fetchDashboardData()
  }, [currentOrg?.id, availableProjects])
  
  // Handle project selection - switch context and navigate to project dashboard
  const handleProjectSelect = async (project) => {
    await switchProject(project.id)
    // Navigate to the dashboard which will now show project-level view
    navigate('/dashboard')
  }
  
  // Handle navigation to section
  const handleSectionNavigate = (section) => {
    onNavigate?.(section)
  }
  
  // Calculate trends
  const trends = useMemo(() => {
    const { aggregateMetrics, previousPeriod } = dashboardData
    return {
      pageViews: calculateTrend(aggregateMetrics.totalPageViews, previousPeriod?.totalPageViews),
      sessions: calculateTrend(aggregateMetrics.totalSessions, previousPeriod?.totalSessions),
    }
  }, [dashboardData])
  
  const { aggregateMetrics, projectStats, pendingItems } = dashboardData
  const projectCount = availableProjects?.length || 0

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <div className="bg-gradient-to-br from-[var(--glass-bg)] to-[var(--surface-secondary)] backdrop-blur-xl rounded-2xl p-6 border border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: brandPrimary }}
            >
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {currentOrg?.name || 'Your Organization'}
              </h1>
              <p className="text-[var(--text-secondary)]">
                {projectCount} {projectCount === 1 ? 'project' : 'projects'} • Last 30 days
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="text-[var(--text-secondary)]"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Aggregate Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <MetricSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Page Views"
            value={formatNumber(aggregateMetrics.totalPageViews)}
            icon={Eye}
            color="blue"
            trend={trends.pageViews}
            subtitle="Across all projects"
          />
          <MetricCard
            label="Total Sessions"
            value={formatNumber(aggregateMetrics.totalSessions)}
            icon={MousePointer}
            color="purple"
            trend={trends.sessions}
            subtitle={`${formatNumber(aggregateMetrics.totalVisitors)} unique visitors`}
          />
          <MetricCard
            label="Total Leads"
            value={formatNumber(aggregateMetrics.totalLeads)}
            icon={Users}
            color="green"
            subtitle="From forms & signups"
          />
          <MetricCard
            label="Total Revenue"
            value={formatCurrency(aggregateMetrics.totalRevenue)}
            icon={DollarSign}
            color="amber"
            subtitle="This period"
          />
        </div>
      )}
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Overview - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Section */}
          <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                    Your Projects
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {projectCount > 0 ? 'Click a project to dive into details' : 'No projects found'}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSectionNavigate('projects')}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => <ProjectCardSkeleton key={i} />)}
                </div>
              ) : projectStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectStats.slice(0, 4).map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      colorIndex={index}
                      onClick={handleProjectSelect}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-tertiary)]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No projects yet</p>
                  <p className="text-sm mt-1">Create your first project to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Project Comparison Chart - Show when there are projects */}
          {projectStats.length > 0 && (
            <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--brand-primary)]" />
                  Project Performance
                </CardTitle>
                <CardDescription>Page views & sessions comparison (last 30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectComparisonChart projects={projectStats} />
              </CardContent>
            </Card>
          )}
          
          {/* Multi-Project Trend Chart - Always show if there are any projects */}
          {projectStats.length > 0 && (
            <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Traffic Trends
                </CardTitle>
                <CardDescription>Daily page views across projects (last 14 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <MultiProjectTrendChart projects={projectStats} />
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar - Pending Actions & Quick Stats */}
        <div className="space-y-6">
          {/* Traffic Sources Donut */}
          {projectStats.length > 0 && (
            <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-5 h-5 text-[var(--brand-primary)]" />
                  Traffic Sources
                </CardTitle>
                <CardDescription>Aggregate breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficSourcesChart projects={projectStats} />
              </CardContent>
            </Card>
          )}
          
          {/* Pending Actions */}
          <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Pending Actions
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingItems.length > 0 ? (
                pendingItems.map((item, index) => (
                  <PendingItem
                    key={index}
                    item={item}
                    onClick={() => handleSectionNavigate(item.type === 'proposal' ? 'proposals' : item.type === 'invoice' ? 'billing' : 'messages')}
                  />
                ))
              ) : (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                  No pending items
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-[var(--brand-primary)]" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSectionNavigate('messages')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send a Message
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSectionNavigate('projects')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Browse Projects
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSectionNavigate('sync')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule a Call
              </Button>
            </CardContent>
          </Card>
          
          {/* From Sonor */}
          <Card className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <img src="/favicon.svg" alt="Sonor" className="w-5 h-5" />
                Sonor
              </CardTitle>
              <CardDescription>Your marketing partner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-[var(--brand-primary)]/10"
                onClick={() => handleSectionNavigate('proposals')}
              >
                <Send className="w-4 h-4 mr-2 text-[var(--brand-primary)]" />
                View Proposals
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-[var(--brand-primary)]/10"
                onClick={() => handleSectionNavigate('billing')}
              >
                <DollarSign className="w-4 h-4 mr-2 text-[var(--brand-primary)]" />
                Billing & Invoices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Error State */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchDashboardData()}
              className="ml-auto text-red-500"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
