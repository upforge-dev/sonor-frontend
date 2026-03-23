// SignalAlertsPanel.jsx
// Displays Signal AI traffic anomaly alerts with root cause analysis
// Shows recent alerts and allows on-demand traffic analysis

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Activity,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { insightsApi } from '@/lib/signal-api'
import SignalIcon from '@/components/ui/SignalIcon'
import useAuthStore from '@/lib/auth-store'
import { formatDistanceToNow } from 'date-fns'

// ============================================================================
// URGENCY CONFIG
// ============================================================================

const urgencyConfig = {
  critical: { color: 'red', label: 'Critical', icon: XCircle },
  high: { color: 'amber', label: 'High', icon: AlertTriangle },
  medium: { color: 'yellow', label: 'Medium', icon: Activity },
  low: { color: 'emerald', label: 'Low', icon: CheckCircle },
}

const severityColors = {
  high: 'text-red-600 bg-red-100 dark:bg-red-500/20',
  medium: 'text-amber-600 bg-amber-100 dark:bg-amber-500/20',
  low: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20',
}

// ============================================================================
// ALERT CARD COMPONENT
// ============================================================================

function AlertCard({ alert, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = urgencyConfig[alert.urgency] || urgencyConfig.medium
  const UrgencyIcon = config.icon
  const isDropping = alert.data?.change_percent < 0
  const TrendIcon = isDropping ? TrendingDown : TrendingUp

  const rootCauseAnalysis = alert.data?.root_cause_analysis

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-xl overflow-hidden transition-all",
        alert.urgency === 'critical' && "border-red-300 dark:border-red-500/30",
        alert.urgency === 'high' && "border-amber-300 dark:border-amber-500/30",
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4 bg-[var(--glass-bg)]">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              isDropping 
                ? "bg-red-100 dark:bg-red-500/20" 
                : "bg-emerald-100 dark:bg-emerald-500/20"
            )}>
              <TrendIcon className={cn(
                "h-5 w-5",
                isDropping ? "text-red-600" : "text-emerald-600"
              )} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{alert.title}</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] h-5",
                    alert.urgency === 'critical' && "bg-red-50 text-red-700 border-red-200",
                    alert.urgency === 'high' && "bg-amber-50 text-amber-700 border-amber-200",
                    alert.urgency === 'medium' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                    alert.urgency === 'low' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                  )}
                >
                  {config.label}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {alert.content.split('\n')[0]}
              </p>

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </span>
                {alert.data?.change_percent && (
                  <span className={cn(
                    "font-medium",
                    isDropping ? "text-red-600" : "text-emerald-600"
                  )}>
                    {isDropping ? '' : '+'}{alert.data.change_percent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Expand Button */}
            {rootCauseAnalysis && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {/* Root Cause Analysis Expanded View */}
        <CollapsibleContent>
          {rootCauseAnalysis && (
            <div className="px-4 pb-4 pt-2 bg-muted/30 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                Root Cause Analysis
              </h4>

              {rootCauseAnalysis.causes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No specific causes identified. This may be due to normal traffic variation.
                </p>
              ) : (
                <div className="space-y-2">
                  {rootCauseAnalysis.causes.map((cause, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg",
                        severityColors[cause.severity]
                      )}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-sm">{cause.category}:</span>
                        <span className="text-sm ml-1">{cause.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rootCauseAnalysis.recommendation && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm">
                    <span className="font-medium" style={{ color: 'var(--brand-primary)' }}>
                      Recommendation:
                    </span>{' '}
                    {rootCauseAnalysis.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  )
}

// ============================================================================
// TRAFFIC STATUS CARD
// ============================================================================

function TrafficStatusCard({ analysis, loading, onRefresh }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) return null

  const isDropping = analysis.change_percent < 0
  const isSpiking = analysis.change_percent >= 50
  const statusConfig = {
    drop: { color: 'red', icon: TrendingDown, label: 'Traffic Drop Detected' },
    spike: { color: 'emerald', icon: TrendingUp, label: 'Traffic Spike!' },
    normal: { color: 'blue', icon: Activity, label: 'Traffic Normal' },
  }

  const config = statusConfig[analysis.status]
  const StatusIcon = config.icon

  return (
    <Card className={cn(
      analysis.status === 'drop' && "border-red-200 dark:border-red-500/30",
      analysis.status === 'spike' && "border-emerald-200 dark:border-emerald-500/30",
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              analysis.status === 'drop' && "bg-red-100 dark:bg-red-500/20",
              analysis.status === 'spike' && "bg-emerald-100 dark:bg-emerald-500/20",
              analysis.status === 'normal' && "bg-blue-100 dark:bg-blue-500/20",
            )}>
              <StatusIcon className={cn(
                "h-6 w-6",
                analysis.status === 'drop' && "text-red-600",
                analysis.status === 'spike' && "text-emerald-600",
                analysis.status === 'normal' && "text-blue-600",
              )} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{config.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{analysis.current_traffic.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">page views (24h)</span>
              </div>
              <p className={cn(
                "text-sm font-medium",
                isDropping ? "text-red-600" : "text-emerald-600"
              )}>
                {isDropping ? '' : '+'}{analysis.change_percent}% vs yesterday
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Root cause summary if drop detected */}
        {analysis.root_cause_analysis && analysis.root_cause_analysis.causes.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
              {analysis.root_cause_analysis.causes.length} potential cause{analysis.root_cause_analysis.causes.length > 1 ? 's' : ''} identified
            </p>
            <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
              {analysis.root_cause_analysis.causes.slice(0, 3).map((cause, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {cause.category}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN PANEL
// ============================================================================

export default function SignalAlertsPanel({ projectId: propProjectId, className }) {
  const { currentProject } = useAuthStore()
  const projectId = propProjectId || currentProject?.id
  
  const [alerts, setAlerts] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadAlerts()
      runAnalysis()
    }
  }, [projectId])

  const loadAlerts = async () => {
    try {
      const res = await insightsApi.getTrafficAlerts(projectId, { limit: 10, days: 30 })
      setAlerts(res.data || [])
    } catch (err) {
      console.error('Failed to load traffic alerts:', err)
    }
  }

  const runAnalysis = async () => {
    try {
      setAnalyzing(true)
      const res = await insightsApi.analyzeTraffic(projectId)
      setAnalysis(res.data)
    } catch (err) {
      console.error('Failed to run traffic analysis:', err)
    } finally {
      setAnalyzing(false)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await Promise.all([loadAlerts(), runAnalysis()])
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Signal Traffic Alerts</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered anomaly detection with root cause analysis
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={analyzing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", analyzing && "animate-spin")} />
          Analyze Now
        </Button>
      </div>

      {/* Current Traffic Status */}
      <TrafficStatusCard 
        analysis={analysis} 
        loading={loading || analyzing}
        onRefresh={runAnalysis}
      />

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Recent Traffic Alerts
            {alerts.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-medium">All Clear!</p>
              <p className="text-sm text-muted-foreground">
                No traffic anomalies detected in the last 30 days
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                <AnimatePresence>
                  {alerts.map((alert, idx) => (
                    <AlertCard 
                      key={alert.id || idx} 
                      alert={alert}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
