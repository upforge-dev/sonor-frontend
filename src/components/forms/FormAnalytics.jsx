/**
 * Form Analytics - Dashboard for form performance metrics
 * 
 * Shows:
 * - Submission counts & trends
 * - Completion rates
 * - Step-by-step funnel (for multi-step forms)
 * - Field-level drop-off analysis
 * - Time to complete metrics
 */

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formsApi } from '@/lib/sonor-api'

// ═══════════════════════════════════════════════════════════════════════════════
// Stats Card Component
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ title, value, change, changeLabel, icon: Icon, trend }) {
  const isPositive = trend === 'up'
  const isNegative = trend === 'down'
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-sm mt-2",
                isPositive && "text-green-500",
                isNegative && "text-red-500",
                !isPositive && !isNegative && "text-muted-foreground"
              )}>
                {isPositive && <TrendingUp className="h-4 w-4" />}
                {isNegative && <TrendingDown className="h-4 w-4" />}
                <span>{change}</span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Step Funnel Component (for multi-step forms)
// ═══════════════════════════════════════════════════════════════════════════════

function StepFunnel({ steps }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No step data available
      </div>
    )
  }

  const maxVisitors = Math.max(...steps.map(s => s.visitors))

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const percentage = maxVisitors > 0 ? (step.visitors / maxVisitors) * 100 : 0
        const dropOff = index > 0 ? steps[index - 1].visitors - step.visitors : 0
        const dropOffPercent = index > 0 && steps[index - 1].visitors > 0
          ? ((dropOff / steps[index - 1].visitors) * 100).toFixed(1)
          : 0

        return (
          <div key={step.step}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index === steps.length - 1
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step.step}
                </div>
                <span className="font-medium">{step.title || `Step ${step.step}`}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold">{step.visitors.toLocaleString()}</span>
                {dropOff > 0 && (
                  <Badge variant="outline" className="text-red-500">
                    -{dropOff} ({dropOffPercent}%)
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Field Drop-off Chart
// ═══════════════════════════════════════════════════════════════════════════════

function FieldDropOff({ fields }) {
  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No field interaction data available
      </div>
    )
  }

  const maxDropOff = Math.max(...fields.map(f => f.dropOffRate))

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const barWidth = maxDropOff > 0 ? (field.dropOffRate / maxDropOff) * 100 : 0
        
        return (
          <div key={field.slug} className="flex items-center gap-4">
            <div className="w-32 truncate text-sm">
              {field.label}
            </div>
            <div className="flex-1">
              <div className="h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    field.dropOffRate > 15 ? "bg-red-500" :
                    field.dropOffRate > 8 ? "bg-yellow-500" :
                    "bg-green-500"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-sm font-medium">
              {field.dropOffRate.toFixed(1)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Conversion by Source
// ═══════════════════════════════════════════════════════════════════════════════

function SourceBreakdown({ sources }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No source data available
      </div>
    )
  }

  const total = sources.reduce((acc, s) => acc + s.count, 0)

  return (
    <div className="space-y-3">
      {sources.map((source) => {
        const percentage = total > 0 ? (source.count / total) * 100 : 0
        
        return (
          <div key={source.name} className="flex items-center gap-4">
            <div className="w-24 truncate text-sm font-medium">
              {source.name}
            </div>
            <div className="flex-1">
              <Progress value={percentage} className="h-2" />
            </div>
            <div className="w-16 text-right text-sm">
              {source.count}
            </div>
            <div className="w-12 text-right text-sm text-muted-foreground">
              {percentage.toFixed(0)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Form Analytics Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function FormAnalytics({ formId, projectId }) {
  const [dateRange, setDateRange] = useState('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    if (formId) {
      loadAnalytics()
    }
  }, [formId, dateRange])

  const loadAnalytics = async () => {
    if (!formId) return
    
    setIsLoading(true)
    try {
      const response = await formsApi.getAnalytics(formId, { dateRange })
      const data = response.data || response
      
      // Transform API response to component format
      setAnalytics({
        overview: {
          totalSubmissions: data.totalSubmissions || 0,
          submissionsChange: null, // Would need previous period comparison
          completionRate: data.completionRate || 0,
          completionChange: null,
          avgTimeToComplete: data.averageTimeSeconds || 0,
          timeChange: null,
          abandonmentRate: data.abandonmentRate || 0,
          abandonmentChange: null,
        },
        stepFunnel: (data.stepFunnel || []).map(s => ({
          step: s.step,
          title: `Step ${s.step}`,
          visitors: s.views || 0
        })),
        fieldDropOff: (data.fieldDropOff || []).map(f => ({
          slug: f.fieldSlug,
          label: f.fieldSlug,
          dropOffRate: f.dropOffRate || 0
        })),
        sourceBreakdown: (data.sourceBreakdown || []).map(s => ({
          name: s.source || 'Direct',
          count: s.count || 0
        })),
        recentActivity: {
          last24h: 0,
          last7d: 0,
          last30d: data.totalSubmissions || 0,
        }
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No analytics data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Form Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track form performance and identify optimization opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={analytics.overview.totalSubmissions.toLocaleString()}
          change={analytics.overview.submissionsChange}
          changeLabel="vs last period"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Completion Rate"
          value={`${analytics.overview.completionRate}%`}
          change={analytics.overview.completionChange}
          changeLabel="vs last period"
          icon={CheckCircle2}
          trend="up"
        />
        <StatCard
          title="Avg. Time to Complete"
          value={formatTime(analytics.overview.avgTimeToComplete)}
          change={analytics.overview.timeChange}
          changeLabel="vs last period"
          icon={Clock}
          trend="up"
        />
        <StatCard
          title="Abandonment Rate"
          value={`${analytics.overview.abandonmentRate}%`}
          change={analytics.overview.abandonmentChange}
          changeLabel="vs last period"
          icon={XCircle}
          trend="down"
        />
      </div>

      {/* Funnel & Drop-off */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Step Funnel
            </CardTitle>
            <CardDescription>
              User progression through form steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StepFunnel steps={analytics.stepFunnel} />
          </CardContent>
        </Card>

        {/* Field Drop-off */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Field Drop-off Rates
            </CardTitle>
            <CardDescription>
              Where users abandon the form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldDropOff fields={analytics.fieldDropOff} />
          </CardContent>
        </Card>
      </div>

      {/* Source & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions by Source</CardTitle>
            <CardDescription>
              Where your form submissions come from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SourceBreakdown sources={analytics.sourceBreakdown} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Submission trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{analytics.recentActivity.last24h}</div>
                <div className="text-xs text-muted-foreground mt-1">Last 24 hours</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{analytics.recentActivity.last7d}</div>
                <div className="text-xs text-muted-foreground mt-1">Last 7 days</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{analytics.recentActivity.last30d}</div>
                <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
