// src/pages/analytics/AnalyticsDashboard.jsx
// Analytics Dashboard - uses ModuleLayout for consistent shell (left sidebar + main content)

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useAuthStore from '@/lib/auth-store'
import useAnalyticsStore from '@/lib/analytics-store'
import { useSiteAnalyticsOverview, siteAnalyticsKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { useSignalAccess } from '@/lib/signal-access'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  FileText,
  RefreshCw,
  Calendar,
  Route,
  AlertTriangle,
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import SignalIcon from '@/components/ui/SignalIcon'
import { cn } from '@/lib/utils'
import Analytics from '@/components/Analytics'
import { NaturalLanguageFilter } from '@/components/ai/NaturalLanguageFilter'

// Lazy load view components for code splitting
const PageAnalyticsView = lazy(() => import('./views/PageAnalyticsView'))
const JourneysView = lazy(() => import('./views/JourneysView.tsx'))
const AIInsightsPanel = lazy(() => import('./components/AIInsightsPanel'))
const SignalAlertsPanel = lazy(() => import('@/components/analytics/SignalAlertsPanel'))

// Loading fallback
function ViewLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <UptradeSpinner size="lg" />
    </div>
  )
}

// Sidebar navigation item (content only; ModuleLayout provides the panel)
function SidebarItem({ icon: Icon, label, active, onClick, count, indent = 0, 'data-tour': dataTour, ...rest }) {
  return (
    <button
      onClick={onClick}
      data-tour={dataTour}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors",
        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
      )}
      style={{ marginLeft: indent * 16 }}
    >
      {Icon && <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />}
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-auto">
          {formatNumber(count)}
        </Badge>
      )}
    </button>
  )
}

// Hierarchical page tree node
function PageTreeNode({ node, depth = 0, selectedPath, onSelect, onToggle }) {
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedPath === node.path

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.path)
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {node.isOpen 
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> 
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <button
          onClick={() => onSelect(node.path)}
          className={cn(
            "flex items-center gap-2 text-left truncate flex-1",
            isSelected ? "text-primary" : "text-foreground"
          )}
        >
          <FileText
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span className="truncate">{node.name}</span>
          {node.views > 0 && (
            <span className="text-muted-foreground ml-auto">
              {formatNumber(node.views)}
            </span>
          )}
        </button>
      </div>
      {hasChildren && node.isOpen && (
        <div className="ml-2">
          {node.children.map((child) => (
            <PageTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Sidebar content only; ModuleLayout provides the panel (no inner wrapper)
function AnalyticsSidebar({ signalEnabled, onSignalInsightsClick, onSignalAlertsClick }) {
  const {
    currentView,
    selectedPath,
    pageHierarchy,
    flatPages,
    hierarchyLoading,
    setCurrentView,
    setSelectedPath,
    toggleNode,
    expandToPath,
  } = useAnalyticsStore()

  const isLoadingPages = hierarchyLoading
  const hasPages = flatPages.length > 0 || pageHierarchy.length > 0

  const handleHighlightsClick = () => {
    setCurrentView('highlights')
    setSelectedPath(null)
  }

  const handleJourneysClick = () => {
    setCurrentView('journeys')
    setSelectedPath(null)
  }

  const handlePageSelect = (path) => {
    setSelectedPath(path)
    setCurrentView('page')
    expandToPath(path)
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <SidebarItem
            icon={Sparkles}
            label="Highlights"
            active={currentView === 'highlights' && !selectedPath}
            onClick={handleHighlightsClick}
            data-tour="analytics-traffic"
          />
          <SidebarItem
            icon={Route}
            label="Journeys"
            active={currentView === 'journeys'}
            onClick={handleJourneysClick}
            data-tour="analytics-journeys"
          />
        </div>

        <div>
          <p className="px-3 py-1.5 uppercase tracking-wider text-muted-foreground" data-tour="analytics-pages">
            Site Pages
          </p>
          {isLoadingPages ? (
            <div className="space-y-2 px-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : hasPages ? (
            <div className="space-y-0.5">
              {pageHierarchy.map((node) => (
                <PageTreeNode
                  key={node.path}
                  node={node}
                  selectedPath={selectedPath}
                  onSelect={handlePageSelect}
                  onToggle={toggleNode}
                />
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No page data yet
            </div>
          )}
        </div>

        {signalEnabled && (
          <div className="pt-4 border-t border-[var(--glass-border)]">
            <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              Signal
            </p>
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-2 space-y-1">
              <SidebarItem
                icon={SignalIcon}
                label="Insights"
                active={currentView === 'signal-insights'}
                onClick={onSignalInsightsClick}
                data-tour="analytics-heatmap"
              />
              <SidebarItem
                icon={AlertTriangle}
                label="Traffic Alerts"
                active={currentView === 'signal-alerts'}
                onClick={onSignalAlertsClick}
                data-tour="analytics-conversions"
              />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// Main dashboard component
export default function AnalyticsDashboard() {
  const { currentProject } = useAuthStore()
  const { hasProjectSignal } = useSignalAccess()
  const queryClient = useQueryClient()
  const { 
    currentView, 
    selectedPath, 
    setCurrentView,
    fetchPageAnalytics,
    fetchAIInsights,
    aiInsights,
    aiInsightsLoading
  } = useAnalyticsStore()
  
  // Use React Query for overview data
  const [dateRange, setDateRange] = useState(30)
  const { 
    data: overview, 
    isLoading, 
    refetch: refetchOverview 
  } = useSiteAnalyticsOverview(currentProject?.id, dateRange)
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [customDateRange, setCustomDateRange] = useState(null)
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false)
  const [nlFilters, setNlFilters] = useState({})

  // Check if this project has Signal enabled
  const signalEnabled = hasProjectSignal
  
  // Handle date range change
  const handleDateRangeChange = (value) => {
    if (value === 'custom') {
      setIsCustomRangeOpen(true)
      return
    }
    const days = parseInt(value, 10)
    setCustomDateRange(null)
    setDateRange(days)
    // React Query will auto-refetch when dateRange changes
    if (selectedPath && currentProject?.id) {
      fetchPageAnalytics(currentProject.id, selectedPath, days)
    }
  }
  
  // Handle custom date range selection
  const handleCustomDateRangeSelect = (range) => {
    if (range?.from && range?.to) {
      setCustomDateRange(range)
      const days = Math.ceil((range.to - range.from) / (1000 * 60 * 60 * 24))
      setDateRange(days)
      setIsCustomRangeOpen(false)
      // React Query will auto-refetch when dateRange changes
      if (selectedPath && currentProject?.id) {
        fetchPageAnalytics(currentProject.id, selectedPath, days)
      }
    }
  }
  
  // Format custom date range for display
  const getDateRangeLabel = () => {
    if (customDateRange?.from && customDateRange?.to) {
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      return `${formatDate(customDateRange.from)} - ${formatDate(customDateRange.to)}`
    }
    return null
  }
  
  // Fetch data when page is selected
  useEffect(() => {
    if (selectedPath && currentProject?.id) {
      fetchPageAnalytics(currentProject.id, selectedPath, dateRange)
    }
  }, [selectedPath, currentProject?.id, dateRange, fetchPageAnalytics])
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetchOverview()
    if (selectedPath && currentProject?.id) {
      await fetchPageAnalytics(currentProject.id, selectedPath, dateRange)
    }
    setIsRefreshing(false)
  }
  
  // Handle Signal Insights click from sidebar
  const handleSignalInsightsClick = async () => {
    setCurrentView('signal-insights')
    if (currentProject?.id) {
      await fetchAIInsights(currentProject.id, selectedPath)
    }
    setShowAIPanel(true)
  }
  
  // Handle Signal Alerts click from sidebar
  const handleSignalAlertsClick = () => {
    setCurrentView('signal-alerts')
    setShowAIPanel(false)
  }

  // Handle NL-resolved analytics filters (date range, path focus, etc.)
  const handleNLFiltersResolved = (filters) => {
    setNlFilters(filters)
    if (filters?.dateRange) {
      const days = parseInt(filters.dateRange, 10)
      if (!isNaN(days)) {
        setCustomDateRange(null)
        setDateRange(days)
      }
    }
    if (filters?.path && currentProject?.id) {
      fetchPageAnalytics(currentProject.id, filters.path, dateRange)
    }
  }

  const headerSubtitle = signalEnabled ? 'AI-powered analytics' : undefined
  const headerActions = (
    <>
      <Popover open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
        <Select
          value={customDateRange ? 'custom' : String(dateRange)}
          onValueChange={handleDateRangeChange}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Date range">
              {getDateRangeLabel() || `Last ${dateRange} days`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom range...</SelectItem>
          </SelectContent>
        </Select>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="range"
            selected={customDateRange}
            onSelect={handleCustomDateRangeSelect}
            numberOfMonths={2}
            defaultMonth={customDateRange?.from || new Date()}
          />
        </PopoverContent>
      </Popover>
      <NaturalLanguageFilter
        module="analytics"
        onFiltersResolved={handleNLFiltersResolved}
        placeholder="e.g. traffic from last 7 days on homepage"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      </Button>
    </>
  )

  return (
    <ModuleLayout
      ariaLabel="Analytics"
      leftSidebarTitle="Analytics"
      leftSidebarWidth={240}
      defaultLeftSidebarOpen
      leftSidebar={
        <AnalyticsSidebar
          signalEnabled={signalEnabled}
          onSignalInsightsClick={handleSignalInsightsClick}
          onSignalAlertsClick={handleSignalAlertsClick}
        />
      }
    >
      <ModuleLayout.Header
        data-tour="analytics-overview"
        title="Analytics"
        icon={MODULE_ICONS.analytics}
        subtitle={headerSubtitle}
        actions={headerActions}
      />
      <ModuleLayout.Content>
        <div className={cn(
          "p-6",
          showAIPanel && "pr-0"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (selectedPath || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <Suspense fallback={<ViewLoader />}>
                {currentView === 'highlights' ? (
                  <Analytics dateRange={dateRange} />
                ) : currentView === 'journeys' ? (
                  <JourneysView dateRange={dateRange} />
                ) : currentView === 'signal-alerts' ? (
                  <div className="p-6">
                    <Suspense fallback={<ViewLoader />}>
                      <SignalAlertsPanel />
                    </Suspense>
                  </div>
                ) : currentView === 'signal-insights' ? (
                  <div>
                    <Suspense fallback={<ViewLoader />}>
                      <AIInsightsPanel 
                        path={selectedPath}
                        onClose={() => {
                          setCurrentView('highlights')
                          setShowAIPanel(false)
                        }}
                        fullPage
                      />
                    </Suspense>
                  </div>
                ) : (
                  <PageAnalyticsView path={selectedPath} dateRange={dateRange} />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </ModuleLayout.Content>
    </ModuleLayout>
  )
}

// Utility functions
function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatPathForDisplay(path) {
  if (!path || path === '/') return 'Home'
  
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  
  return lastSegment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
