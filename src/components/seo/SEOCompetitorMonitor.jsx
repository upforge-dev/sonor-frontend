// src/components/seo/SEOCompetitorMonitor.jsx
// Competitor SERP Monitoring Dashboard - Track competitor changes in real-time
// Futuristic UI with brand colors and dynamic visualizations

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  Radar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  Eye,
  FileText,
  Globe,
  Clock,
  ChevronRight,
  Plus,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  Search,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import { signalSeoApi } from '@/lib/signal-api'
import { seoApi } from '@/lib/portal-api'
import { useSignalAccess } from '@/lib/signal-access'

// Animated radar effect for monitoring
function RadarPulse({ className }) {
  return (
    <div className={cn("relative", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-[var(--brand-primary)]"
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
        />
      ))}
      <div className="relative w-full h-full rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
        <Radar className="h-6 w-6 text-[var(--brand-primary)]" />
      </div>
    </div>
  )
}

// Position change indicator
function PositionChange({ current, previous }) {
  if (!previous || current === previous) {
    return <Minus className="h-4 w-4 text-[var(--text-tertiary)]" />
  }
  
  const change = previous - current // Positive = improved (lower position is better)
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-sm font-medium",
      change > 0 ? "text-[var(--brand-primary)]" : "text-[var(--accent-red)]"
    )}>
      {change > 0 ? (
        <ArrowUpRight className="h-4 w-4" />
      ) : (
        <ArrowDownRight className="h-4 w-4" />
      )}
      <span>{Math.abs(change)}</span>
    </div>
  )
}

// Competitor card with SERP position tracking
function CompetitorCard({ competitor, keyword, onViewDetails }) {
  const hasChanges = competitor.changes?.length > 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "group relative p-4 rounded-xl border cursor-pointer",
        "bg-[var(--glass-bg)] backdrop-blur-sm",
        "transition-all duration-300",
        hasChanges 
          ? "border-amber-500/30 shadow-lg shadow-amber-500/5"
          : "border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30"
      )}
      onClick={() => onViewDetails?.(competitor)}
    >
      {/* Alert indicator for changes */}
      {hasChanges && (
        <div className="absolute -top-2 -right-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white"
          >
            <AlertTriangle className="h-3 w-3" />
          </motion.div>
        </div>
      )}
      
      {/* Domain header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--glass-bg-inset)]">
            <Globe className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <h4 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
              {competitor.domain}
            </h4>
            <p className="text-xs text-[var(--text-tertiary)] truncate max-w-[200px]">
              {competitor.url}
            </p>
          </div>
        </div>
        
        {/* Position badge */}
        <div className="text-right">
          <div className={cn(
            "text-2xl font-bold",
            competitor.position <= 3 ? "text-[var(--brand-primary)]" : 
            competitor.position <= 10 ? "text-[var(--text-primary)]" : 
            "text-[var(--text-secondary)]"
          )}>
            #{competitor.position}
          </div>
          <PositionChange 
            current={competitor.position} 
            previous={competitor.previous_position} 
          />
        </div>
      </div>
      
      {/* Title preview */}
      <div className="mb-3 p-2 rounded bg-[var(--glass-bg-inset)]">
        <p className="text-sm text-[var(--text-primary)] line-clamp-1">
          {competitor.title}
        </p>
        {competitor.title_changed && (
          <Badge className="mt-1 text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">
            Title Changed
          </Badge>
        )}
      </div>
      
      {/* Metrics */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Last checked {formatDistanceToNow(new Date(competitor.last_checked))} ago</span>
        </div>
        {competitor.visibility_score && (
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{competitor.visibility_score}% visibility</span>
          </div>
        )}
      </div>
      
      {/* Recent changes summary */}
      {hasChanges && (
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <Activity className="h-3 w-3" />
            <span>{competitor.changes.length} change{competitor.changes.length > 1 ? 's' : ''} detected</span>
          </div>
        </div>
      )}
      
      {/* Hover indicator */}
      <ChevronRight className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5",
        "text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100",
        "transition-all duration-300 group-hover:translate-x-1"
      )} />
    </motion.div>
  )
}

// Change alert card
function ChangeAlert({ change, onDismiss, onCounterAction }) {
  const alertTypes = {
    title_change: { icon: FileText, color: 'amber', label: 'Title Changed' },
    position_gain: { icon: TrendingUp, color: 'brand-primary', label: 'Position Gained' },
    new_competitor: { icon: Users, color: 'brand-primary', label: 'New Competitor' },
    content_update: { icon: RefreshCw, color: 'blue', label: 'Content Updated' },
  }
  
  const config = alertTypes[change.type] || alertTypes.title_change
  const Icon = config.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-4 rounded-xl border",
        "bg-[var(--glass-bg)] backdrop-blur-sm",
        `border-${config.color}-500/30`
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
          `bg-${config.color}-500/10`
        )}>
          <Icon className={cn("h-5 w-5", `text-${config.color}-500`)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs", `text-${config.color}-500 border-${config.color}-500/30`)}>
              {config.label}
            </Badge>
            <span className="text-xs text-[var(--text-tertiary)]">
              {formatDistanceToNow(new Date(change.detected_at))} ago
            </span>
          </div>
          
          <p className="text-sm text-[var(--text-primary)] mb-2">
            <span className="font-medium">{change.competitor_domain}</span>
            {' '}{change.description}
          </p>
          
          {/* Before/After for title changes */}
          {change.type === 'title_change' && (
            <div className="space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-red-400 shrink-0">Before:</span>
                <span className="text-[var(--text-secondary)] line-through line-clamp-1">
                  {change.old_value}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--brand-primary)] shrink-0">After:</span>
                <span className="text-[var(--text-primary)] line-clamp-1">
                  {change.new_value}
                </span>
              </div>
            </div>
          )}
          
          {/* Position change details */}
          {change.type === 'position_gain' && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-secondary)]">Moved from</span>
              <span className="font-medium text-[var(--text-primary)]">#{change.old_position}</span>
              <span className="text-[var(--text-secondary)]">to</span>
              <span className="font-medium text-[var(--brand-primary)]">#{change.new_position}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCounterAction?.(change)}
                  className="h-8 text-xs text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/10"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Counter
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate counter-strategy with Signal</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss?.(change.id)}
            className="h-8 text-xs text-[var(--text-tertiary)]"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// Keyword tracking card
function KeywordTrackingCard({ keyword, competitors, youPosition, onManage }) {
  const topCompetitor = competitors?.[0]
  
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
      {/* Gradient orb */}
      <div className={cn(
        "absolute w-32 h-32 -top-16 -right-16 rounded-full blur-3xl opacity-10 transition-all duration-500",
        "bg-[var(--brand-primary)] group-hover:scale-150 group-hover:opacity-20"
      )} />
      
      <CardContent className="pt-4 relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-[var(--text-primary)]">{keyword.keyword}</h4>
            <p className="text-xs text-[var(--text-tertiary)]">
              {keyword.search_volume?.toLocaleString() || '—'} monthly searches
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--text-tertiary)]">Your Position</div>
            <div className={cn(
              "text-2xl font-bold",
              youPosition <= 3 ? "text-[var(--brand-primary)]" :
              youPosition <= 10 ? "text-[var(--text-primary)]" :
              "text-[var(--text-secondary)]"
            )}>
              {youPosition ? `#${youPosition}` : '—'}
            </div>
          </div>
        </div>
        
        {/* Top competitor */}
        {topCompetitor && (
          <div className="p-2 rounded-lg bg-[var(--glass-bg-inset)] mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[var(--text-tertiary)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  {topCompetitor.domain}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                #{topCompetitor.position}
              </Badge>
            </div>
          </div>
        )}
        
        {/* Competitors count and changes */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-tertiary)]">
            {competitors?.length || 0} competitors tracked
          </span>
          {keyword.recent_changes > 0 && (
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
              {keyword.recent_changes} changes
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onManage?.(keyword)}
          className="w-full mt-3 text-xs text-[var(--brand-primary)]"
        >
          View SERP Analysis
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}

// Main component
export default function SEOCompetitorMonitor({ projectId }) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  
  const [keywords, setKeywords] = useState([])
  const [competitors, setCompetitors] = useState([])
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedKeyword, setSelectedKeyword] = useState(null)
  
  // Fetch monitoring data
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return
      setIsLoading(true)
      
      try {
        // Fetch real data from APIs
        const [keywordsRes, competitorsRes, alertsRes] = await Promise.all([
          seoApi.getTrackedKeywords(projectId).catch(() => ({ data: { rankings: [] } })),
          seoApi.getCompetitors(projectId).catch(() => ({ data: [] })),
          seoApi.getAlerts(projectId, { type: 'competitor' }).catch(() => ({ data: [] })),
        ])
        
        // Transform keywords data
        const keywordsData = keywordsRes?.data?.rankings || keywordsRes?.data || []
        setKeywords(keywordsData.slice(0, 10).map(k => ({
          keyword: k.query || k.keyword,
          search_volume: k.search_volume || k.impressions || 0,
          your_position: k.position || k.rank || 0,
          recent_changes: k.position_change || 0,
        })))
        
        // Transform competitors data
        const competitorsData = competitorsRes?.data?.competitors || competitorsRes?.data || []
        setCompetitors(competitorsData.map(c => ({
          id: c.id,
          domain: c.domain || c.competitor_domain,
          url: c.url || `https://${c.domain}`,
          position: c.position || c.current_position || 0,
          previous_position: c.previous_position,
          title: c.title || c.page_title,
          title_changed: c.title_changed || false,
          last_checked: c.last_checked ? new Date(c.last_checked) : new Date(),
          visibility_score: c.visibility_score || 0,
          changes: c.recent_changes || [],
        })))
        
        // Transform alerts data
        const alertsData = alertsRes?.data?.alerts || alertsRes?.data || []
        setAlerts(alertsData.map(a => ({
          id: a.id,
          type: a.alert_type || a.type,
          competitor_domain: a.competitor_domain || a.domain,
          keyword: a.keyword,
          description: a.description || a.message,
          old_value: a.old_value,
          new_value: a.new_value,
          old_position: a.old_position,
          new_position: a.new_position,
          detected_at: a.created_at ? new Date(a.created_at) : new Date(),
        })))
      } catch (error) {
        console.error('Failed to load competitor data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [projectId])
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Check for alerts/changes and reload data
      await seoApi.checkAlerts(projectId, { type: 'competitor' })
      
      // Reload all data
      const [keywordsRes, competitorsRes, alertsRes] = await Promise.all([
        seoApi.getTrackedKeywords(projectId).catch(() => ({ data: { rankings: [] } })),
        seoApi.getCompetitors(projectId).catch(() => ({ data: [] })),
        seoApi.getAlerts(projectId, { type: 'competitor' }).catch(() => ({ data: [] })),
      ])
      
      // Update state with fresh data
      const keywordsData = keywordsRes?.data?.rankings || keywordsRes?.data || []
      setKeywords(keywordsData.slice(0, 10).map(k => ({
        keyword: k.query || k.keyword,
        search_volume: k.search_volume || k.impressions || 0,
        your_position: k.position || k.rank || 0,
        recent_changes: k.position_change || 0,
      })))
      
      const competitorsData = competitorsRes?.data?.competitors || competitorsRes?.data || []
      setCompetitors(competitorsData.map(c => ({
        id: c.id,
        domain: c.domain || c.competitor_domain,
        url: c.url || `https://${c.domain}`,
        position: c.position || c.current_position || 0,
        previous_position: c.previous_position,
        title: c.title || c.page_title,
        title_changed: c.title_changed || false,
        last_checked: c.last_checked ? new Date(c.last_checked) : new Date(),
        visibility_score: c.visibility_score || 0,
        changes: c.recent_changes || [],
      })))
      
      const alertsData = alertsRes?.data?.alerts || alertsRes?.data || []
      setAlerts(alertsData.map(a => ({
        id: a.id,
        type: a.alert_type || a.type,
        competitor_domain: a.competitor_domain || a.domain,
        keyword: a.keyword,
        description: a.description || a.message,
        old_value: a.old_value,
        new_value: a.new_value,
        old_position: a.old_position,
        new_position: a.new_position,
        detected_at: a.created_at ? new Date(a.created_at) : new Date(),
      })))
    } catch (error) {
      console.error('Failed to refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  const handleCounterAction = async (change) => {
    // Generate counter-strategy with Signal
    console.log('Generating counter-strategy for:', change)
  }
  
  const handleDismissAlert = async (alertId) => {
    try {
      await seoApi.acknowledgeAlert(alertId)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
      // Still remove from UI even if API fails
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    }
  }
  
  // Signal access gate
  if (!hasSignalAccess) {
    return (
      <Card className="border-[var(--brand-primary)]/30">
        <CardContent className="py-12 text-center">
          <div className="relative w-20 h-20 mx-auto">
            <RadarPulse className="w-full h-full" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6">
            Competitor Monitoring Requires Signal
          </h3>
          <p className="text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
            Track competitor SERP changes, title updates, and position movements in real-time.
          </p>
          <Button className="mt-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
            <Sparkles className="h-4 w-4 mr-2" />
            Enable Signal
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RadarPulse className="w-16 h-16 mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading competitor data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12">
            <RadarPulse className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Competitor Monitor
            </h2>
            <p className="text-[var(--text-secondary)]">
              Real-time SERP tracking and change detection
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh SERP
          </Button>
          <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
            <Plus className="h-4 w-4 mr-2" />
            Add Keyword
          </Button>
        </div>
      </div>
      
      {/* Alerts section */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Recent Changes Detected
                <Badge className="bg-amber-500 text-white">{alerts.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {alerts.slice(0, 3).map(alert => (
                  <ChangeAlert
                    key={alert.id}
                    change={alert}
                    onDismiss={handleDismissAlert}
                    onCounterAction={handleCounterAction}
                  />
                ))}
              </AnimatePresence>
            </div>
            {alerts.length > 3 && (
              <Button variant="ghost" className="w-full mt-3 text-sm">
                View all {alerts.length} alerts
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Stats overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Keywords Tracked', value: keywords.length, icon: Target, color: 'brand-primary' },
          { label: 'Competitors Monitored', value: competitors.length, icon: Users, color: 'brand-primary' },
          { label: 'Changes (24h)', value: alerts.length, icon: Activity, color: 'amber' },
          { label: 'Avg. Your Position', value: '#6.2', icon: BarChart3, color: 'brand-primary' },
        ].map((stat, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className={cn(
              "absolute w-24 h-24 -top-12 -right-12 rounded-full blur-3xl opacity-15",
              `bg-[var(--${stat.color === 'amber' ? 'accent-orange' : stat.color})]`
            )} />
            <CardContent className="pt-4 relative">
              <stat.icon className="h-5 w-5 text-[var(--text-tertiary)] mb-2" />
              <div className={cn(
                "text-3xl font-bold",
                `text-[var(--${stat.color === 'amber' ? 'accent-orange' : stat.color})]`
              )}>
                {stat.value}
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="competitors">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Change History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keywords.map((keyword, i) => (
              <KeywordTrackingCard
                key={i}
                keyword={keyword}
                competitors={competitors}
                youPosition={keyword.your_position}
                onManage={setSelectedKeyword}
              />
            ))}
            
            {/* Add keyword card */}
            <Card className="border-dashed cursor-pointer hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/5 transition-all">
              <CardContent className="pt-6 text-center">
                <Plus className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">Add Keyword to Track</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="competitors" className="mt-6">
          <div className="space-y-3">
            {competitors.map(competitor => (
              <CompetitorCard
                key={competitor.id}
                competitor={competitor}
                onViewDetails={() => {}}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-[var(--text-tertiary)] opacity-50 mb-4" />
              <p className="text-[var(--text-secondary)]">
                Change history will appear here as competitors update their content
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
