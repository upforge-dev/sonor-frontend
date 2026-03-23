// src/components/signal/SignalAnalytics.jsx
// Analytics dashboard for widget stats - conversations, leads, ratings, top questions
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  MessageCircle,
  UserPlus,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
  Clock,
  HelpCircle,
  Star,
  Calendar,
  RefreshCw,
  Loader2,
  Minus,
  Activity,
  Target,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatTile } from '@/components/ui/stat-tile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSignalStore } from '@/lib/signal-store' // Keep for streaming UI state
import { useSignalAnalytics, signalKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// Time period options
const TIME_PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' }
]

export default function SignalAnalytics({ projectId, className }) {
  const { 
    analytics: storeAnalytics, 
    analyticsLoading,
    fetchAnalytics: fetchStoreAnalytics
  } = useSignalStore()
  
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState({
    conversations: { total: 0, change: 0, byStatus: {} },
    leads: { total: 0, conversionRate: 0, change: 0 },
    satisfaction: { score: 0, totalRatings: 0 },
    performance: { avgResponseTime: 0, totalTokens: 0, avgTokensPerConversation: 0 },
    topQuestions: [],
    hourlyDistribution: Array(24).fill(0),
    peakHour: 0,
    dailyTrend: []
  })

  // Fetch analytics data
  useEffect(() => {
    if (projectId) {
      fetchAnalytics()
    }
  }, [projectId, period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const data = await fetchStoreAnalytics(projectId, { period })
      
      // Map endpoint response to component state
      setAnalytics({
        conversations: data.conversations || { total: 0, change: 0, byStatus: {} },
        leads: data.leads || { total: 0, conversionRate: 0, change: 0 },
        satisfaction: data.satisfaction || { score: 0, totalRatings: 0 },
        performance: data.performance || { avgResponseTime: 0, totalTokens: 0, avgTokensPerConversation: 0 },
        topQuestions: data.topQuestions || [],
        hourlyDistribution: data.hourlyDistribution || Array(24).fill(0),
        peakHour: data.peakHour || 0,
        dailyTrend: data.dailyTrend || []
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/20">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle>Signal Analytics</CardTitle>
              <CardDescription>
                Widget performance and conversation insights
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchAnalytics}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Conversations"
            value={analytics.conversations.total}
            change={analytics.conversations.change}
            icon={MessageCircle}
            color="text-blue-400"
            bg="bg-blue-500/20"
            loading={loading}
          />
          <MetricCard
            title="Leads Created"
            value={analytics.leads.total}
            subtitle={`${analytics.leads.conversionRate}% conversion`}
            change={analytics.leads.change}
            icon={UserPlus}
            color="text-emerald-400"
            bg="bg-emerald-500/20"
            loading={loading}
          />
          <MetricCard
            title="Satisfaction"
            value={analytics.satisfaction.score.toFixed(1)}
            subtitle={`from ${analytics.satisfaction.totalRatings} ratings`}
            icon={Star}
            color="text-yellow-400"
            bg="bg-yellow-500/20"
            loading={loading}
            isStar
          />
          <MetricCard
            title="Avg Response"
            value={formatDuration(analytics.performance.avgResponseTime)}
            icon={Clock}
            color="text-purple-400"
            bg="bg-purple-500/20"
            loading={loading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Hourly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyChart data={analytics.hourlyDistribution} loading={loading} />
            </CardContent>
          </Card>

          {/* Top Questions */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Top Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopQuestions questions={analytics.topQuestions} loading={loading} />
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConversionFunnel analytics={analytics} loading={loading} />
          </CardContent>
        </Card>

        {/* AI Performance */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              AI Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIPerformance analytics={analytics} loading={loading} />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

// Metric card component — thin wrapper around the unified StatTile
const COLOR_CLASS_MAP = {
  'text-blue-400': 'blue',
  'text-emerald-400': 'green',
  'text-yellow-400': 'yellow',
  'text-purple-400': 'purple',
  'text-red-400': 'red',
  'text-orange-400': 'orange',
  'text-pink-400': 'pink',
}

function MetricCard({
  title,
  value,
  subtitle,
  change,
  invertChange,
  icon,
  color,
  loading,
}) {
  // Derive trend direction from numeric change
  const trend =
    change !== undefined && change !== 0
      ? change > 0
        ? 'up'
        : 'down'
      : 'neutral'

  // Map legacy tailwind color class → StatTile palette key
  const paletteColor = COLOR_CLASS_MAP[color] || 'brand'

  if (loading) return null // StatTileGrid handles loading; individual tiles pass through

  return (
    <StatTile
      label={title}
      value={value}
      subtitle={subtitle}
      change={change}
      trend={trend}
      invertTrend={invertChange}
      icon={icon}
      color={paletteColor}
      variant="horizontal"
    />
  )
}

// Hourly chart component
function HourlyChart({ data, loading }) {
  if (loading) {
    return (
      <div className="h-32 flex items-end gap-1">
        {Array(24).fill(0).map((_, i) => (
          <div 
            key={i} 
            className="flex-1 bg-muted animate-pulse rounded-t"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    )
  }

  const max = Math.max(...data, 1)

  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((value, hour) => (
        <div
          key={hour}
          className="group flex-1 relative"
        >
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(value / max) * 100}%` }}
            transition={{ duration: 0.5, delay: hour * 0.02 }}
            className={cn(
              'w-full rounded-t transition-colors',
              'bg-cyan-500/40 hover:bg-cyan-500/60'
            )}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {hour}:00 - {value}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

// Top questions component
function TopQuestions({ questions, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-8 bg-muted animate-pulse rounded" />
            <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <HelpCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No questions tracked yet</p>
      </div>
    )
  }

  const maxCount = Math.max(...questions.map(q => q.count), 1)

  return (
    <div className="space-y-3">
      {questions.slice(0, 5).map((q, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate flex-1 pr-2">{q.question}</span>
            <Badge variant="secondary" className="shrink-0">{q.count}</Badge>
          </div>
          <Progress value={(q.count / maxCount) * 100} className="h-1" />
        </div>
      ))}
    </div>
  )
}

// Conversion funnel component
function ConversionFunnel({ analytics, loading }) {
  const stages = [
    { 
      label: 'Widget Opened', 
      value: analytics.conversations.total * 1.5, // Estimate
      color: 'bg-blue-500'
    },
    { 
      label: 'Conversation Started', 
      value: analytics.conversations.total,
      color: 'bg-cyan-500'
    },
    { 
      label: 'Engaged (3+ messages)', 
      value: Math.round(analytics.conversations.total * 0.6), // Estimate
      color: 'bg-purple-500'
    },
    { 
      label: 'Lead Captured', 
      value: analytics.leads.total,
      color: 'bg-emerald-500'
    }
  ]

  const maxValue = Math.max(...stages.map(s => s.value), 1)

  if (loading) {
    return (
      <div className="flex gap-2 h-24">
        {stages.map((_, i) => (
          <div key={i} className="flex-1 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 h-24 items-end">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.label}
            initial={{ height: 0 }}
            animate={{ height: `${(stage.value / maxValue) * 100}%` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={cn('flex-1 rounded-t', stage.color)}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {stages.map((stage) => (
          <div key={stage.label} className="flex-1 text-center">
            <p className="text-lg font-bold">{Math.round(stage.value)}</p>
            <p className="text-xs text-muted-foreground">{stage.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// AI Performance component
function AIPerformance({ analytics, loading }) {
  const perf = analytics.performance || {}
  const convStats = analytics.conversations || {}
  
  // Calculate escalation rate from byStatus
  const totalConversations = convStats.total || 0
  const escalatedCount = convStats.byStatus?.escalated || 0
  const escalationRate = totalConversations > 0 
    ? Math.round((escalatedCount / totalConversations) * 100) 
    : 0
  
  const metrics = [
    {
      label: 'Avg Response Time',
      value: formatDuration(perf.avgResponseTime || 0),
      description: 'Time to generate AI response',
      isRaw: true
    },
    {
      label: 'Tokens Per Chat',
      value: perf.avgTokensPerConversation || 0,
      description: `${(perf.totalTokens || 0).toLocaleString()} total tokens`,
      isRaw: true
    },
    {
      label: 'Escalation Rate',
      value: escalationRate,
      target: 10,
      color: 'bg-yellow-500',
      inverted: true,
      suffix: '%'
    },
    {
      label: 'User Satisfaction',
      value: Math.round((analytics.satisfaction?.score || 0) * 20), // Convert 5-star to percentage
      target: 90,
      color: 'bg-blue-500',
      suffix: '%'
    }
  ]

  if (loading) {
    return (
      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-2 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        // Raw metrics (no progress bar)
        if (metric.isRaw) {
          return (
            <div key={metric.label} className="space-y-1">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <div className="text-xl font-semibold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          )
        }
        
        // Progress bar metrics
        const isGood = metric.inverted 
          ? metric.value <= metric.target 
          : metric.value >= metric.target

        return (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <span className={cn(
                'text-sm font-medium',
                isGood ? 'text-emerald-400' : 'text-yellow-400'
              )}>
                {metric.value}{metric.suffix || ''}
              </span>
            </div>
            <div className="relative">
              <Progress value={Math.min(metric.value, 100)} className="h-2" />
              {metric.target && (
                <div 
                  className="absolute top-0 w-0.5 h-full bg-white/50"
                  style={{ left: `${metric.target}%` }}
                />
              )}
            </div>
            {metric.target && (
              <p className="text-xs text-muted-foreground">
                Target: {metric.inverted ? '≤' : '≥'} {metric.target}%
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Helper function to format duration (input is milliseconds)
function formatDuration(ms) {
  if (!ms || ms === 0) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}
