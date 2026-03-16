// src/pages/analytics/components/AIInsightsPanel.jsx
// AI-powered analytics insights panel
// Shows Signal AI-generated insights for the current analytics view

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import SignalIcon from '@/components/ui/SignalIcon'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  RefreshCw,
  X,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAiInsights, useGenerateAiInsights } from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'

// Icon mapping for insight types
const getInsightIcon = (insight) => {
  if (insight.includes('📈') || insight.includes('up')) return TrendingUp
  if (insight.includes('📉') || insight.includes('down')) return TrendingDown
  if (insight.includes('⚠️') || insight.includes('warning')) return AlertTriangle
  if (insight.includes('✅') || insight.includes('Excellent')) return CheckCircle
  if (insight.includes('🎯') || insight.includes('conversion')) return Target
  if (insight.includes('⚡') || insight.includes('Performance')) return Zap
  if (insight.includes('🏆') || insight.includes('top')) return BarChart3
  return Lightbulb
}

// Clean emoji from insight text for cleaner display
const cleanInsightText = (text) => {
  return text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
}

// Insight card component
function InsightCard({ insight, index }) {
  const Icon = getInsightIcon(insight)
  const cleanText = cleanInsightText(insight)
  
  // Determine sentiment
  const isPositive = insight.includes('📈') || insight.includes('✅') || insight.includes('⚡') || insight.includes('🏆')
  const isNegative = insight.includes('📉') || insight.includes('⚠️')
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-all",
        "bg-[var(--glass-bg)] border-[var(--glass-border)]",
        "hover:border-[var(--glass-border-strong)] hover:shadow-sm"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          isPositive && "bg-emerald-500/10 text-emerald-500",
          isNegative && "bg-amber-500/10 text-amber-500",
          !isPositive && !isNegative && "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
          {cleanText}
        </p>
      </div>
    </div>
  )
}

// Summary metrics
function SummaryMetrics({ summary }) {
  if (!summary) return null
  
  const metrics = [
    { label: 'Page Views', value: summary.pageViews?.toLocaleString() || '0' },
    { label: 'Sessions', value: summary.sessions?.toLocaleString() || '0' },
    { label: 'Bounce Rate', value: `${summary.bounceRate || 0}%` },
    { label: 'Conversions', value: summary.conversions?.toLocaleString() || '0' },
  ]
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((metric, idx) => (
        <div 
          key={idx}
          className="p-2 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]"
        >
          <p className="text-xs text-[var(--text-tertiary)]">{metric.label}</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}

// Top pages quick list
function TopPagesList({ pages }) {
  if (!pages || pages.length === 0) return null
  
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
        Top Pages
      </p>
      {pages.slice(0, 3).map((page, idx) => (
        <div 
          key={idx}
          className="flex items-center justify-between p-2 rounded-lg bg-[var(--glass-bg-inset)]"
        >
          <span className="text-sm text-[var(--text-primary)] truncate max-w-[180px]">
            {page.path}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {page.pageViews?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AIInsightsPanel({ path, onClose, fullPage = false }) {
  const { currentProject } = useAuthStore()
  
  // Use React Query for AI insights
  const { 
    data: aiInsights, 
    isLoading: aiInsightsLoading, 
    error: aiInsightsError,
    refetch 
  } = useAiInsights(currentProject?.id)
  
  const generateMutation = useGenerateAiInsights()
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    if (!currentProject?.id) return
    setIsRefreshing(true)
    try {
      await generateMutation.mutateAsync(currentProject.id)
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }
  
  const insights = aiInsights?.insights || []
  const summary = aiInsights?.summary
  const topPages = aiInsights?.topPages
  
  return (
    <div className={cn(
      "h-full flex flex-col",
      fullPage ? "bg-background" : "bg-[var(--glass-bg)]"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-[var(--glass-border)]",
        fullPage ? "px-6 py-4" : "px-4 py-3"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "rounded-lg flex items-center justify-center",
            fullPage ? "w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600" : ""
          )}>
            <SignalIcon className={cn(
              fullPage ? "h-5 w-5 text-white" : "h-4 w-4 text-emerald-500"
            )} />
          </div>
          <div>
            <h3 className={cn(
              "font-semibold",
              fullPage ? "text-lg" : "text-sm text-[var(--text-primary)]"
            )}>
              Signal Insights
            </h3>
            {fullPage && (
              <p className="text-sm text-muted-foreground">
                AI-powered analytics recommendations
              </p>
            )}
          </div>
          {!fullPage && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={aiInsightsLoading || isRefreshing}
            className={cn(fullPage ? "h-8 w-8" : "h-7 w-7", "p-0")}
          >
            <RefreshCw className={cn(
              fullPage ? "h-4 w-4" : "h-3.5 w-3.5",
              (aiInsightsLoading || isRefreshing) && "animate-spin"
            )} />
          </Button>
          {!fullPage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className={cn(
          "space-y-4",
          fullPage ? "p-6" : "p-4"
        )}>
          {/* Loading State */}
          {aiInsightsLoading ? (
            <div className={cn(
              "space-y-3",
              fullPage && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            )}>
              {[1, 2, 3, 4, 5, 6].slice(0, fullPage ? 6 : 3).map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : aiInsightsError ? (
            /* Error State */
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                Failed to load insights
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : insights.length > 0 ? (
            /* Insights */
            <>
              {/* Current page context */}
              {path && (
                <div className="px-3 py-2 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20">
                  <p className="text-xs text-[var(--brand-primary)]">
                    Insights for: <span className="font-medium">{path}</span>
                  </p>
                </div>
              )}
              
              {/* Insights list */}
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} index={idx} />
                ))}
              </div>
              
              {/* Summary metrics */}
              {summary && (
                <>
                  <div className="pt-2 border-t border-[var(--glass-border)]">
                    <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                      Quick Stats
                    </p>
                    <SummaryMetrics summary={summary} />
                  </div>
                </>
              )}
              
              {/* Top pages */}
              {topPages && topPages.length > 0 && !path && (
                <div className="pt-2 border-t border-[var(--glass-border)]">
                  <TopPagesList pages={topPages} />
                </div>
              )}
              
              {/* Last updated */}
              {aiInsights?.generatedAt && (
                <p className="text-xs text-[var(--text-tertiary)] text-center pt-2">
                  Updated {new Date(aiInsights.generatedAt).toLocaleTimeString()}
                </p>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">
                No insights available yet
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Analytics data will generate insights
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer - Ask Echo */}
      <div className="p-3 border-t border-[var(--glass-border)]">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between group"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-echo', { 
              detail: { 
                context: 'analytics',
                path: path || null 
              } 
            }))
          }}
        >
          <span className="flex items-center gap-2">
            <SignalIcon className="h-4 w-4" />
            Ask Echo about this data
          </span>
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  )
}
