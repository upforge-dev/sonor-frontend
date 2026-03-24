/**
 * JourneysView - World-class user journey analytics visualization
 * Full-screen immersive experience with animated flow visualization
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Route,
  TrendingUp,
  Users,
  Clock,
  Target,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  CheckCircle2,
  Loader2,
  Eye,
  LogIn,
  LogOut,
  Timer,
  Sparkles,
  Zap,
  MousePointerClick,
  Play,
  Percent,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useBrandColors } from '@/hooks/useBrandColors'
import useAuthStore from '@/lib/auth-store'
import { portalApi } from '@/lib/sonor-api'

// ============================================
// Types
// ============================================

interface JourneySummary {
  totalJourneys: number
  avgPathLength: number
  avgJourneyDuration: number
  conversionRate: number
  topEntryPage: string
  topExitPage: string
  bounceRate: number
}

interface PageFlow {
  source: string
  target: string
  value: number
  conversionRate: number
}

interface FlowData {
  nodes: { name: string }[]
  links: { source: number; target: number; value: number }[]
  flows: PageFlow[]
}

interface JourneySession {
  sessionId: string
  visitorId: string
  startedAt: string
  duration: number
  pageCount: number
  converted: boolean
  conversionType: string | null
  deviceType: string
  browser: string
  country: string | null
  journey: { page: string; timestamp: string; duration: number }[]
}

// ============================================
// Utility Functions  
// ============================================

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function formatNumber(num: number): string {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatPercent(value: number): string {
  if (!value && value !== 0) return '0%'
  return `${value.toFixed(1)}%`
}

function getDeviceIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'mobile': return Smartphone
    case 'tablet': return Tablet
    default: return Monitor
  }
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return `${Math.floor(diffMins / 1440)}d ago`
}

function shortenPath(path: string): string {
  if (!path) return 'Unknown'
  if (path === '/') return 'Home'
  // Remove leading slash and get last segment
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return 'Home'
  // Capitalize and clean up
  const last = segments[segments.length - 1]
  return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================
// Animated Flow Node Component
// ============================================

function FlowNode({ 
  page, 
  sessions, 
  isEntry, 
  isExit, 
  primaryColor,
  delay = 0,
  onClick,
  isSelected
}: { 
  page: string
  sessions: number
  isEntry?: boolean
  isExit?: boolean
  primaryColor: string
  delay?: number
  onClick?: () => void
  isSelected?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer",
        "px-4 py-3 rounded-xl",
        "border transition-all duration-300",
        isSelected 
          ? "border-2 shadow-lg" 
          : "border-border/50 hover:border-border shadow-sm hover:shadow-md",
        "bg-[var(--glass-bg)]"
      )}
      style={{
        borderColor: isSelected ? primaryColor : undefined,
        boxShadow: isSelected ? `0 0 20px ${primaryColor}30` : undefined
      }}
    >
      {/* Entry/Exit indicator */}
      {(isEntry || isExit) && (
        <div 
          className="absolute -top-2 -right-2 p-1 rounded-full"
          style={{ backgroundColor: primaryColor }}
        >
          {isEntry ? (
            <LogIn className="h-3 w-3 text-white" />
          ) : (
            <LogOut className="h-3 w-3 text-white" />
          )}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: `${primaryColor}15`,
          }}
        >
          <Route className="h-4 w-4" style={{ color: primaryColor }} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate max-w-[120px]">
            {shortenPath(page)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(sessions)} sessions
          </p>
        </div>
      </div>
      
      {/* Hover effect */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}05, ${primaryColor}10)` 
        }}
      />
    </motion.div>
  )
}

// ============================================
// Animated Flow Arrow
// ============================================

function FlowArrow({ 
  value, 
  primaryColor, 
  delay = 0,
  vertical = false
}: { 
  value: number
  primaryColor: string
  delay?: number
  vertical?: boolean
}) {
  const thickness = Math.max(2, Math.min(8, Math.log2(value + 1) * 2))
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 0.2, duration: 0.3 }}
      className={cn(
        "flex items-center justify-center",
        vertical ? "flex-col py-2" : "px-2"
      )}
    >
      <motion.div
        initial={{ width: vertical ? thickness : 0, height: vertical ? 0 : thickness }}
        animate={{ width: vertical ? thickness : 40, height: vertical ? 24 : thickness }}
        transition={{ delay: delay + 0.3, duration: 0.4, ease: "easeOut" }}
        className="rounded-full"
        style={{ backgroundColor: `${primaryColor}40` }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
      >
        {vertical ? (
          <ChevronDown className="h-4 w-4" style={{ color: primaryColor }} />
        ) : (
          <ChevronRight className="h-4 w-4" style={{ color: primaryColor }} />
        )}
      </motion.div>
    </motion.div>
  )
}

// ============================================
// Journey Path Visualization
// ============================================

function JourneyPathViz({ 
  flows, 
  primaryColor,
  secondaryColor 
}: { 
  flows: PageFlow[]
  primaryColor: string
  secondaryColor: string
}) {
  // Group flows by source to create layers
  const layers = useMemo(() => {
    if (!flows || flows.length === 0) return []
    
    // Find entry points (sources that don't appear as targets)
    const allTargets = new Set(flows.map(f => f.target))
    const allSources = new Set(flows.map(f => f.source))
    const entryPoints = [...allSources].filter(s => !allTargets.has(s))
    
    // Build adjacency map
    const adjacency = new Map<string, { targets: Map<string, number>, totalOut: number }>()
    flows.forEach(f => {
      if (!adjacency.has(f.source)) {
        adjacency.set(f.source, { targets: new Map(), totalOut: 0 })
      }
      const node = adjacency.get(f.source)!
      node.targets.set(f.target, (node.targets.get(f.target) || 0) + f.value)
      node.totalOut += f.value
    })
    
    // Calculate incoming for each node
    const incoming = new Map<string, number>()
    flows.forEach(f => {
      incoming.set(f.target, (incoming.get(f.target) || 0) + f.value)
    })
    
    // BFS to create layers
    const visited = new Set<string>()
    const nodeLayer = new Map<string, number>()
    const queue: { node: string; layer: number }[] = entryPoints.map(e => ({ node: e, layer: 0 }))
    
    while (queue.length > 0) {
      const { node, layer } = queue.shift()!
      if (visited.has(node)) continue
      visited.add(node)
      nodeLayer.set(node, layer)
      
      const adj = adjacency.get(node)
      if (adj) {
        adj.targets.forEach((_, target) => {
          if (!visited.has(target)) {
            queue.push({ node: target, layer: layer + 1 })
          }
        })
      }
    }
    
    // Group nodes by layer
    const layerGroups: { page: string; sessions: number; isEntry: boolean; isExit: boolean }[][] = []
    nodeLayer.forEach((layer, node) => {
      if (!layerGroups[layer]) layerGroups[layer] = []
      const isEntry = entryPoints.includes(node)
      const isExit = !adjacency.has(node) || adjacency.get(node)!.totalOut === 0
      const sessions = Math.max(incoming.get(node) || 0, adjacency.get(node)?.totalOut || 0)
      layerGroups[layer].push({ page: node, sessions, isEntry, isExit })
    })
    
    // Sort each layer by sessions
    layerGroups.forEach(layer => {
      layer.sort((a, b) => b.sessions - a.sessions)
    })
    
    return layerGroups.slice(0, 5) // Limit to 5 layers
  }, [flows])

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <Route className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No navigation flow detected</p>
        <p className="text-sm text-center max-w-md mt-2">
          Journey paths appear when visitors navigate between multiple pages. 
          {flows && flows.length === 0 && " For single-page sites, all sessions start and end on the same page."}
        </p>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="flex items-start justify-center gap-4 overflow-x-auto px-4">
        {layers.map((layer, layerIdx) => (
          <div key={layerIdx} className="flex items-center gap-4">
            {/* Layer column */}
            <div className="flex flex-col gap-3 min-w-[180px]">
              {/* Layer label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: layerIdx * 0.1 }}
                className="text-center mb-2"
              >
                <Badge variant="secondary" className="text-xs">
                  {layerIdx === 0 ? 'Entry' : layerIdx === layers.length - 1 ? 'Exit' : `Step ${layerIdx + 1}`}
                </Badge>
              </motion.div>
              
              {layer.slice(0, 4).map((node, nodeIdx) => (
                <FlowNode
                  key={node.page}
                  page={node.page}
                  sessions={node.sessions}
                  isEntry={node.isEntry}
                  isExit={node.isExit}
                  primaryColor={primaryColor}
                  delay={layerIdx * 0.1 + nodeIdx * 0.05}
                />
              ))}
              
              {layer.length > 4 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: layerIdx * 0.1 + 0.3 }}
                  className="text-center text-xs text-muted-foreground"
                >
                  +{layer.length - 4} more pages
                </motion.div>
              )}
            </div>
            
            {/* Arrow between layers */}
            {layerIdx < layers.length - 1 && (
              <div className="flex flex-col justify-center h-full">
                <FlowArrow 
                  value={layer.reduce((sum, n) => sum + n.sessions, 0)} 
                  primaryColor={primaryColor}
                  delay={layerIdx * 0.1}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Big Stat Component
// ============================================

function BigStat({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  color,
  delay = 0,
  trend,
  trendValue
}: { 
  label: string
  value: string | number
  subValue?: string
  icon: React.ElementType
  color: string
  delay?: number
  trend?: 'up' | 'down'
  trendValue?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="relative group"
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative bg-[var(--glass-bg)]/80 backdrop-blur-sm border border-border/30 rounded-3xl p-8 hover:border-border/50 transition-all duration-300">
        {/* Icon */}
        <div 
          className="inline-flex p-4 rounded-2xl mb-5"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-7 w-7" style={{ color }} />
        </div>
        
        {/* Value */}
        <div className="space-y-1">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tracking-tight" style={{ color }}>
              {value}
            </span>
            {trend && trendValue && (
              <span className={cn(
                "text-sm font-medium pb-1 flex items-center gap-0.5",
                trend === 'up' ? 'text-emerald-500' : 'text-red-500'
              )}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendValue}
              </span>
            )}
          </div>
          <p className="text-base font-medium text-foreground">{label}</p>
          {subValue && (
            <p className="text-sm text-muted-foreground">{subValue}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// Live Session Card
// ============================================

function SessionCard({ 
  session, 
  primaryColor,
  delay = 0,
  isExpanded,
  onToggle
}: { 
  session: JourneySession
  primaryColor: string
  delay?: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const DeviceIcon = getDeviceIcon(session.deviceType)
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "border rounded-2xl overflow-hidden transition-all duration-300",
        isExpanded 
          ? "bg-[var(--glass-bg)] border-border shadow-lg" 
          : "bg-[var(--glass-bg)]/50 border-border/30 hover:border-border/50 hover:bg-[var(--glass-bg)]/80"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 text-left"
      >
        <div 
          className="p-3 rounded-xl shrink-0"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <DeviceIcon className="h-5 w-5" style={{ color: primaryColor }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-base">
              {session.pageCount} pages
            </span>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-sm text-muted-foreground">
              {formatDuration(session.duration)}
            </span>
            {session.converted && (
              <Badge 
                className="text-xs border-0"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Converted
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {getTimeAgo(session.startedAt)}
            {session.country && ` • ${session.country}`}
          </p>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>
      
      {/* Expanded journey timeline */}
      <AnimatePresence>
        {isExpanded && session.journey && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="border-t border-border/50 p-5 pl-16">
              <div className="relative">
                {/* Timeline line */}
                <div 
                  className="absolute left-[5px] top-3 bottom-3 w-0.5 rounded-full"
                  style={{ backgroundColor: `${primaryColor}20` }}
                />
                
                {/* Steps */}
                <div className="space-y-4">
                  {session.journey.map((step, idx) => (
                    <motion.div 
                      key={idx} 
                      className="flex items-center gap-4"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {/* Timeline dot */}
                      <div 
                        className="relative z-10 w-3 h-3 rounded-full ring-4 ring-background"
                        style={{ backgroundColor: primaryColor }}
                      />
                      
                      {/* Content */}
                      <div className="flex-1 flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Route className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{shortenPath(step.page)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          {formatDuration(step.duration)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// Top Paths Section
// ============================================

function TopPathsSection({ 
  flows, 
  primaryColor 
}: { 
  flows: PageFlow[]
  primaryColor: string
}) {
  // Get top 6 flows by value
  const topFlows = useMemo(() => {
    if (!flows) return []
    return [...flows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [flows])

  if (topFlows.length === 0) return null

  const maxValue = topFlows[0]?.value || 1

  return (
    <div className="space-y-4">
      {topFlows.map((flow, idx) => (
        <motion.div
          key={`${flow.source}-${flow.target}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + idx * 0.05 }}
          className="group relative overflow-hidden rounded-2xl"
        >
          {/* Background bar */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(flow.value / maxValue) * 100}%` }}
            transition={{ delay: 0.5 + idx * 0.05, duration: 0.6, ease: "easeOut" }}
            className="absolute inset-y-0 left-0"
            style={{ 
              background: `linear-gradient(90deg, ${primaryColor}15, ${primaryColor}05)`
            }}
          />
          
          {/* Content */}
          <div className="relative flex items-center justify-between p-5 border border-border/30 rounded-2xl hover:border-border/50 transition-colors">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ 
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor
                }}
              >
                {idx + 1}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{shortenPath(flow.source)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{shortenPath(flow.target)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {formatNumber(flow.value)} sessions
              </span>
              {flow.conversionRate > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs border-0"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  {formatPercent(flow.conversionRate)} CVR
                </Badge>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export default function JourneysView({ dateRange: parentDateRange }: { dateRange?: number } = {}) {
  const { currentProject } = useAuthStore()
  const { primary, secondary } = useBrandColors()

  // State — use parent dateRange if provided
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [localDays, setLocalDays] = useState(30)
  const days = parentDateRange ?? localDays
  const setDays = setLocalDays
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  
  // Data
  const [summary, setSummary] = useState<JourneySummary | null>(null)
  const [flowData, setFlowData] = useState<FlowData | null>(null)
  const [sessions, setSessions] = useState<JourneySession[]>([])

  // Fetch journey data
  const fetchJourneyData = useCallback(async (refresh = false) => {
    if (!currentProject?.id) return
    
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const projectId = currentProject.id

      const [summaryRes, flowsRes, sessionsRes] = await Promise.all([
        portalApi.get(`/analytics/journeys/summary?projectId=${projectId}&days=${days}`),
        portalApi.get(`/analytics/journeys/flows?projectId=${projectId}&days=${days}&limit=50`),
        portalApi.get(`/analytics/journeys/sessions?projectId=${projectId}&limit=20`),
      ])

      setSummary(summaryRes.data)
      setFlowData(flowsRes.data)
      setSessions(sessionsRes.data || [])
    } catch (error) {
      console.error('[Journeys] Error fetching data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [currentProject?.id, days])

  useEffect(() => {
    fetchJourneyData()
  }, [fetchJourneyData])

  const handleRefresh = () => fetchJourneyData(true)

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-transparent">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div 
            className="inline-flex p-6 rounded-3xl mb-6"
            style={{ backgroundColor: `${primary}15` }}
          >
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: primary }} />
          </div>
          <p className="text-lg font-medium">Loading journey data</p>
          <p className="text-sm text-muted-foreground mt-1">Analyzing visitor paths...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col overflow-hidden bg-transparent">
        
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative shrink-0 px-8 pt-8 pb-6"
        >
          {/* Background accent */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{ 
              background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${primary}, transparent)`
            }}
          />
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div 
                className="p-5 rounded-3xl"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Route className="h-10 w-10" style={{ color: primary }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">User Journeys</h1>
                <p className="text-muted-foreground mt-1">
                  Understand how visitors navigate your site
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                <SelectTrigger className="w-36 bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border/30 rounded-xl">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border/30 rounded-xl h-10 w-10"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-10 px-8 pb-10">
            
            {/* Big Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <BigStat
                label="Total Journeys"
                value={formatNumber(summary?.totalJourneys || 0)}
                subValue={`Last ${days} days`}
                icon={Users}
                color={primary}
                delay={0.1}
              />
              <BigStat
                label="Avg. Path Length"
                value={(summary?.avgPathLength || 0).toFixed(1)}
                subValue="Pages per session"
                icon={Route}
                color={primary}
                delay={0.15}
              />
              <BigStat
                label="Avg. Duration"
                value={formatDuration(summary?.avgJourneyDuration || 0)}
                subValue="Time on site"
                icon={Timer}
                color={primary}
                delay={0.2}
              />
              <BigStat
                label="Conversion Rate"
                value={formatPercent(summary?.conversionRate || 0)}
                subValue="Goal completions"
                icon={Target}
                color={primary}
                delay={0.25}
              />
            </div>

            {/* Flow Visualization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-border/30 rounded-3xl p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Navigation Flow</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    How visitors move between pages on your site
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full" style={{ backgroundColor: primary }}>
                      <LogIn className="h-3 w-3 text-white" />
                    </div>
                    Entry Point
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full" style={{ backgroundColor: primary }}>
                      <LogOut className="h-3 w-3 text-white" />
                    </div>
                    Exit Point
                  </div>
                </div>
              </div>
              
              <JourneyPathViz 
                flows={flowData?.flows || []} 
                primaryColor={primary}
                secondaryColor={secondary}
              />
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Top Paths - 3 columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="lg:col-span-3 bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-border/30 rounded-3xl p-8"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Top Navigation Paths</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Most common page-to-page transitions
                  </p>
                </div>
                <TopPathsSection 
                  flows={flowData?.flows || []} 
                  primaryColor={primary} 
                />
              </motion.div>

              {/* Recent Sessions - 2 columns */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-border/30 rounded-3xl p-8"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">Recent Sessions</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Live visitor journey playback
                  </p>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {sessions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No sessions recorded yet</p>
                      <p className="text-sm mt-1">Sessions will appear here in real-time</p>
                    </div>
                  ) : (
                    sessions.map((session, idx) => (
                      <SessionCard
                        key={session.sessionId}
                        session={session}
                        primaryColor={primary}
                        delay={0.45 + idx * 0.03}
                        isExpanded={expandedSession === session.sessionId}
                        onToggle={() => setExpandedSession(
                          expandedSession === session.sessionId ? null : session.sessionId
                        )}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* Entry/Exit Summary */}
            {(summary?.topEntryPage || summary?.topExitPage) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid md:grid-cols-2 gap-5"
              >
                {summary?.topEntryPage && (
                  <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-border/30 rounded-3xl p-6 flex items-center gap-5">
                    <div 
                      className="p-4 rounded-2xl"
                      style={{ backgroundColor: `${primary}15` }}
                    >
                      <LogIn className="h-6 w-6" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Top Entry Page</p>
                      <p className="text-xl font-bold mt-0.5">{shortenPath(summary.topEntryPage)}</p>
                    </div>
                  </div>
                )}
                {summary?.topExitPage && (
                  <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-border/30 rounded-3xl p-6 flex items-center gap-5">
                    <div 
                      className="p-4 rounded-2xl"
                      style={{ backgroundColor: `${secondary || primary}15` }}
                    >
                      <LogOut className="h-6 w-6" style={{ color: secondary || primary }} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Top Exit Page</p>
                      <p className="text-xl font-bold mt-0.5">{shortenPath(summary.topExitPage)}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Bounce Rate Card */}
            {summary?.bounceRate !== undefined && summary.bounceRate > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-border/30 rounded-3xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div 
                      className="p-4 rounded-2xl"
                      style={{ backgroundColor: `${primary}15` }}
                    >
                      <TrendingDown className="h-6 w-6" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Bounce Rate</p>
                      <p className="text-xl font-bold mt-0.5">{formatPercent(summary.bounceRate)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md text-right">
                    Single-page sessions without further interaction
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
