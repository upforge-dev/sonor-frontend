// src/pages/engage/EngageDashboard.jsx
// Engage Dashboard - uses ModuleLayout for consistent shell (left sidebar, main, right panel)

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { engageApi } from '@/lib/sonor-api'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Zap,
  Plus,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Megaphone,
  Bell,
  Eye,
  MousePointerClick,
  Loader2,
  Layers,
  TrendingUp,
  PanelBottom,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Import sub-components
import EngageSidebar from '@/components/engage/dashboard/EngageSidebar'
import EngageOverview from '@/components/engage/dashboard/EngageOverview'
import EngageElementsGrid from '@/components/engage/dashboard/EngageElementsGrid'
import EngageChatInbox from '@/components/engage/EngageChatInbox'
import EngageChatSettings from '@/components/engage/EngageChatSettings'
import EchoNudgeSettings from '@/components/engage/EchoNudgeSettings'
import EngageAnalytics from '@/components/engage/EngageAnalytics'
import EngageTemplates from '@/components/engage/editor/EngageTemplates'
import EngageTargeting from '@/components/engage/EngageTargeting'
import SignalIcon from '@/components/ui/SignalIcon'
import { useSignalAccess } from '@/lib/signal-access'
import { Badge } from '@/components/ui/badge'
// Element type configurations
const ELEMENT_TYPES = {
  popup: { label: 'Popup', icon: MessageSquare, color: 'blue' },
  banner: { label: 'Banner', icon: Megaphone, color: 'orange' },
  nudge: { label: 'Nudge', icon: Sparkles, color: 'purple' },
  toast: { label: 'Toast', icon: Bell, color: 'green' },
  'slide-in': { label: 'Slide-in', icon: PanelBottom, color: 'teal' }
}

export default function EngageDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentProject, currentOrg } = useAuthStore()
  const brandColors = useBrandColors()
  const { hasSignal } = useSignalAccess()
  
  const projectId = currentProject?.id
  const siteUrl = currentProject?.domain 
    ? (currentProject.domain.startsWith('http') ? currentProject.domain : `https://${currentProject.domain}`)
    : null
  
  // View state
  const [currentView, setCurrentView] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  
  // Collapsible states for each element type dropdown
  const [popupsOpen, setPopupsOpen] = useState(false)
  const [bannersOpen, setBannersOpen] = useState(false)
  const [nudgesOpen, setNudgesOpen] = useState(false)
  const [toastsOpen, setToastsOpen] = useState(false)
  const [slideInsOpen, setSlideInsOpen] = useState(false)
  
  // Data state
  const [elements, setElements] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Get current project name
  const projectName = currentProject?.title || 'your site'
  
  // Load elements on mount and when project changes
  useEffect(() => {
    if (projectId) {
      loadElements()
      loadStats()
    }
  }, [projectId])
  
  const loadElements = async () => {
    if (!projectId) return
    setIsLoading(true)
    try {
      const { data } = await engageApi.getElements({ projectId })
      setElements(data?.elements || [])
    } catch (error) {
      console.error('Failed to load elements:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const loadStats = async () => {
    if (!projectId) return
    try {
      const { data } = await engageApi.getAnalyticsOverview({ projectId, days: 30 })
      setStats(data?.data || data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      setStats({
        totalImpressions: 0,
        totalClicks: 0,
        conversionRate: 0,
        activeElements: 0
      })
    }
  }
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([loadElements(), loadStats()])
    setIsRefreshing(false)
  }
  
  // Parse view to get type and status filter
  const parseView = (view) => {
    // Handle new pattern: popup-all, popup-active, popup-inactive, etc.
    const match = view?.match(/^(popup|banner|nudge|toast|slide-in)-(all|active|inactive)$/)
    if (match) {
      return { type: match[1], status: match[2] }
    }
    // Handle old single-type pattern: popup, banner, etc.
    if (['popup', 'banner', 'nudge', 'toast', 'slide-in'].includes(view)) {
      return { type: view, status: 'all' }
    }
    return { type: null, status: null }
  }

  const { type: filterType, status: filterStatus } = parseView(currentView)
  
  // Filter elements by type and status
  const filteredElements = useMemo(() => {
    let filtered = elements
    
    // Filter by type
    if (filterType) {
      filtered = filtered.filter(e => e.element_type === filterType)
    }
    
    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(e => e.is_active)
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(e => !e.is_active)
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.name?.toLowerCase().includes(query) ||
        e.headline?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [elements, filterType, filterStatus, searchQuery])
  
  // Handle create new element - navigate to studio
  const handleCreate = (type = 'popup') => {
    navigate(`/engage/studio/new?type=${type}`)
  }
  
  // Handle edit element - navigate to studio
  const handleEdit = (element) => {
    navigate(`/engage/studio/${element.id}`)
  }
  
  // Handle view change
  const handleViewChange = (view) => {
    setCurrentView(view)
  }
  
  // Render main content based on current view
  const renderMainContent = () => {
    switch (currentView) {
      case 'chat':
        return <EngageChatInbox projectId={projectId} />
      case 'chat-settings':
        return <EngageChatSettings projectId={projectId} onClose={() => setCurrentView('chat')} />
      case 'page-nudges':
        return <EchoNudgeSettings projectId={projectId} />
      case 'analytics':
        return <EngageAnalytics projectId={projectId} />
      case 'targeting':
        return <EngageTargeting projectId={projectId} />
      case 'templates':
        return (
          <EngageTemplates 
            brandColors={brandColors}
            onSelect={(config) => {
              setEditingElement({ isNew: true, ...config })
              setIsStudioOpen(true)
            }}
          />
        )
      case 'overview':
        return (
          <EngageOverview 
            elements={elements}
            stats={stats}
            isLoading={isLoading}
            onEdit={handleEdit}
            onCreate={handleCreate}
          />
        )
      default:
        // Handle element type views (popup-all, banner-active, etc.)
        if (filterType) {
          return (
            <EngageElementsGrid
              elements={filteredElements}
              isLoading={isLoading}
              viewMode={viewMode}
              onEdit={handleEdit}
              onCreate={() => handleCreate(filterType)}
              onRefresh={loadElements}
              elementType={filterType}
            />
          )
        }
        // Default to overview
        return (
          <EngageOverview 
            elements={elements}
            stats={stats}
            isLoading={isLoading}
            onEdit={handleEdit}
            onCreate={handleCreate}
          />
        )
    }
  }

  const headerSubtitle = hasSignal ? 'AI-powered engagement' : undefined
  const headerActions = (
    <>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search elements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <div className="flex items-center border rounded-lg overflow-hidden">
        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="rounded-none h-8 w-8" onClick={() => setViewMode('grid')}>
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="rounded-none h-8 w-8" onClick={() => setViewMode('list')}>
          <List className="h-4 w-4" />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Element
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {Object.entries(ELEMENT_TYPES).map(([type, config]) => (
            <DropdownMenuItem key={type} onClick={() => handleCreate(type)}>
              <config.icon className="h-4 w-4 mr-2" />
              {config.label}
            </DropdownMenuItem>
          ))}
          {hasSignal && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleCreate('popup')}>
                <SignalIcon className="h-4 w-4 mr-2" />
                Create with Signal AI
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const rightSidebarContent = currentView === 'overview' ? (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-sm">Quick Stats</h3>
      {stats ? (
        <>
          <div className="grid gap-3">
            <Card className="bg-[var(--glass-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                    <p className="text-2xl font-bold">{stats.totalImpressions?.toLocaleString() || 0}</p>
                  </div>
                  <Eye className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--glass-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-2xl font-bold">{stats.totalClicks?.toLocaleString() || 0}</p>
                  </div>
                  <MousePointerClick className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--glass-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{stats.conversionRate?.toFixed(1) || 0}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--glass-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active Elements</p>
                    <p className="text-2xl font-bold">{elements.filter(e => e.is_active).length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Analytics tracking active</p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
    </div>
  ) : (
    <div className="p-4 text-sm text-muted-foreground">Switch to Overview for quick stats</div>
  )

  return (
    <TooltipProvider>
      <ModuleLayout
        ariaLabel="Engage"
        leftSidebar={
          <EngageSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            elements={elements}
            popupsOpen={popupsOpen}
            setPopupsOpen={setPopupsOpen}
            bannersOpen={bannersOpen}
            setBannersOpen={setBannersOpen}
            nudgesOpen={nudgesOpen}
            setNudgesOpen={setNudgesOpen}
            toastsOpen={toastsOpen}
            setToastsOpen={setToastsOpen}
            slideInsOpen={slideInsOpen}
            setSlideInsOpen={setSlideInsOpen}
            onOpenSettings={() => setCurrentView('chat-settings')}
          />
        }
        rightSidebar={rightSidebarContent}
        defaultRightSidebarOpen={true}
      >
        <ModuleLayout.Header data-tour="engage-overview" title="Engage" icon={MODULE_ICONS.engage} subtitle={headerSubtitle} actions={headerActions} />
        <ModuleLayout.Content>
          <div className="p-6">
            {renderMainContent()}
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>
    </TooltipProvider>
  )
}
