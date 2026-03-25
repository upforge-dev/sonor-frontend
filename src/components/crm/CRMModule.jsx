/**
 * CRMDashboard - World-class, omni-industry unified CRM
 * Uses ModuleLayout for consistent shell (left sidebar, center, right detail panel).
 *
 * - Left Sidebar: Navigation, filters, quick actions
 * - Center: Main content (Pipeline Kanban or List view)
 * - Right Sidebar: Detail panel for selected prospect
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  LayoutGrid,
  List,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  FileText,
  Sparkles,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  TrendingUp,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Tag,
  Settings,
  Target,
  Zap,
  Star,
  Archive,
  Plus,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  UserCheck,
  DollarSign,
  Handshake,
  X,
  GripVertical,
  Sliders,
  BarChart3,
  ListTodo,
  Bell,
  Kanban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import useAuthStore from '@/lib/auth-store'
import useDebounce from '@/hooks/useDebounce'
import { useBrandColors } from '@/hooks/useBrandColors'
import { crmApi, workspaceIntegrationsApi } from '@/lib/sonor-api'
import { useSignalAccess } from '@/lib/signal-access'
import SignalIcon from '@/components/ui/SignalIcon'
import { ModuleLayout } from '@/components/ModuleLayout'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { MODULE_ICONS } from '@/lib/module-icons'

// Local components (some from prospects folder)
import ProspectDetailDrawer from '../prospects/ProspectDetailDrawer'
import AddProspectDialog from './AddProspectDialog'
import SignalProspectInsights from '../prospects/SignalProspectInsights'
import PipelineKanban from './PipelineKanban'
import PipelineSettingsDialog from './PipelineSettingsDialog'
import CRMAnalyticsDashboard from './CRMAnalyticsDashboard'
import CRMTasksManager from './CRMTasksManager'
import CRMRemindersManager from './CRMRemindersManager'
import CRMEmailHub from './CRMEmailHub'
import ProspectingDashboard from '@/components/sales/ProspectingDashboard'
import SalesModule from '@/components/sales/SalesModule'
import UnassignedLeadsQueue from './UnassignedLeadsQueue'
import ClientsView from './ClientsView'
import EmailComposeDialog from './EmailComposeDialog'
import SendGatedLinkDialog from './SendGatedLinkDialog'
import UserGoogleIntegrationPanel from '../integrations/UserGoogleIntegrationPanel'
import {
  DEFAULT_PIPELINE_STAGES,
  ACTIVE_STAGES,
  mapApiStagesToConfig,
} from './pipelineStages'
import { SignalSuggestsPanel } from '@/components/ai/SignalSuggestsPanel'
import { NaturalLanguageFilter } from '@/components/ai/NaturalLanguageFilter'

// Re-export for consumers that import from CRMModule
export const PIPELINE_STAGES = DEFAULT_PIPELINE_STAGES

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// ============================================================================
// PROSPECT CARD COMPONENT (for Kanban and List)
// ============================================================================
function ProspectCard({ 
  prospect, 
  isSelected, 
  onClick, 
  compact = false,
  brandColors,
  isDragging = false,
  pipelineStages: pipelineStagesProp
}) {
  const pipelineStages = pipelineStagesProp || DEFAULT_PIPELINE_STAGES
  const stageConfig = pipelineStages[prospect.pipeline_stage || 'new_lead'] || pipelineStages.new_lead
  
  if (compact) {
    // List view - compact horizontal card
    return (
      <div
        onClick={() => onClick(prospect)}
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all border',
          'hover:shadow-sm hover:border-[var(--glass-border-hover)]',
          isSelected 
            ? 'border-2 shadow-md' 
            : 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
          isDragging && 'opacity-50'
        )}
        style={isSelected ? { 
          borderColor: brandColors.primary,
          backgroundColor: brandColors.rgba.primary10 
        } : {}}
      >
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: brandColors.primary }}
        >
          {prospect.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[var(--text-primary)] truncate">{prospect.name}</p>
            {prospect.lead_score >= 80 && (
              <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-[var(--text-tertiary)] truncate">
            {prospect.company || prospect.email}
          </p>
        </div>
        
        {/* Stage Badge */}
        <Badge 
          className="flex-shrink-0"
          style={{ 
            backgroundColor: stageConfig.bgLight,
            color: stageConfig.textColor,
            border: 'none'
          }}
        >
          {stageConfig.label}
        </Badge>
        
        {/* Source */}
        {prospect.source === 'form' && (
          <FileText className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
        )}
        
        {/* Time */}
        <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
          {formatRelativeTime(prospect.created_at)}
        </span>
      </div>
    )
  }
  
  // Kanban view - vertical card
  return (
    <div
      onClick={() => onClick(prospect)}
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all border',
        'hover:shadow-md',
        isSelected 
          ? 'border-2 shadow-lg' 
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
        isDragging && 'shadow-xl rotate-2'
      )}
      style={isSelected ? { 
        borderColor: brandColors.primary,
        backgroundColor: brandColors.rgba.primary10 
      } : {}}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white text-sm flex-shrink-0"
            style={{ backgroundColor: brandColors.primary }}
          >
            {prospect.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] truncate">
              {prospect.name}
            </p>
            {prospect.company && (
              <p className="text-xs text-[var(--text-tertiary)] truncate">
                {prospect.company}
              </p>
            )}
          </div>
        </div>
        {prospect.lead_score >= 80 && (
          <Tooltip>
            <TooltipTrigger>
              <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent>High potential lead</TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Tags */}
      {prospect.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {prospect.tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {prospect.tags.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{prospect.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          {prospect.source === 'form' && (
            <Tooltip>
              <TooltipTrigger>
                <FileText className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>From form submission</TooltipContent>
            </Tooltip>
          )}
          <span>{formatRelativeTime(prospect.created_at)}</span>
        </div>
        {prospect.lead_score && (
          <span className="font-medium" style={{ color: brandColors.primary }}>
            {prospect.lead_score}%
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PIPELINE COLUMN COMPONENT
// ============================================================================
function PipelineColumn({ 
  stage, 
  prospects, 
  selectedProspectId, 
  onProspectClick,
  onStageChange,
  brandColors,
  isActive,
  pipelineStages: pipelineStagesProp
}) {
  const pipelineStages = pipelineStagesProp || DEFAULT_PIPELINE_STAGES
  const stageConfig = pipelineStages[stage]
  const StageIcon = stageConfig.icon
  
  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-[var(--glass-bg-hover)]')
  }
  
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-[var(--glass-bg-hover)]')
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-[var(--glass-bg-hover)]')
    const prospectId = e.dataTransfer.getData('prospectId')
    if (prospectId) {
      onStageChange(prospectId, stage)
    }
  }
  
  return (
    <div 
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-xl border transition-colors',
        isActive 
          ? 'border-2' 
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
      )}
      style={isActive ? { borderColor: brandColors.primary } : {}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: stageConfig.color + '30' }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: stageConfig.bgLight }}
          >
            <StageIcon className="h-4 w-4" style={{ color: stageConfig.textColor }} />
          </div>
          <div>
            <p className="font-medium text-sm">{stageConfig.label}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {prospects.length} {prospects.length === 1 ? 'lead' : 'leads'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {prospects.map((prospect) => (
            <div
              key={prospect.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('prospectId', prospect.id)
              }}
            >
              <ProspectCard
                prospect={prospect}
                isSelected={selectedProspectId === prospect.id}
                onClick={onProspectClick}
                brandColors={brandColors}
                pipelineStages={pipelineStages}
              />
            </div>
          ))}
          {prospects.length === 0 && (
            <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
              No leads in this stage
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CRMDashboard() {
  const { user, currentOrg, currentProject } = useAuthStore()
  const brandColors = useBrandColors()
  const { hasCurrentProjectSignal } = useSignalAccess()
  
  // Agency detection - agencies get extra features like calls, proposals, OpenPhone
  const isAgency = currentOrg?.org_type === 'agency'
  
  // Sidebar states
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(false)
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(false) // Expanded mode for more space
  
  // View state
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' | 'list' | 'analytics' | 'tasks' | 'reminders'
  const [showClosedDeals, setShowClosedDeals] = useState(false)
  
  // Data state
  const [prospects, setProspects] = useState([])
  const [tasks, setTasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isLoadingReminders, setIsLoadingReminders] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [stageFilters, setStageFilters] = useState([]) // Multi-select stages
  const [nlFilters, setNlFilters] = useState({}) // Natural-language resolved filters
  
  // Selected prospect(s)
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [selectedProspects, setSelectedProspects] = useState([]) // For bulk actions
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  
  // Dialogs
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false)
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false)
  const [isEmailComposeOpen, setIsEmailComposeOpen] = useState(false)
  const [emailComposeContact, setEmailComposeContact] = useState(null)
  const [isGatedLinkOpen, setIsGatedLinkOpen] = useState(false)
  const [gatedLinkContact, setGatedLinkContact] = useState(null)
  const [pipelineStages, setPipelineStages] = useState(DEFAULT_PIPELINE_STAGES)
  
  // Gmail connection status for sidebar indicator
  const [gmailConnected, setGmailConnected] = useState(false)
  useEffect(() => {
    workspaceIntegrationsApi.getGoogleStatus()
      .then(status => setGmailConnected(status?.connected && status?.gmail?.connected))
      .catch(() => setGmailConnected(false))
  }, [])

  // Signal AI enabled for this project
  const signalEnabled = hasCurrentProjectSignal

  // Extract primitive values for useEffect dependency to avoid array size warning
  const projectId = currentProject?.id
  const projectName = currentProject?.title || currentProject?.name
  const orgId = currentOrg?.id
  const orgName = currentOrg?.name
  const brandPrimary = brandColors.primary
  const brandColorSource = brandColors.colorSource

  // Debug: Log project context
  useEffect(() => {
    console.log('[CRM] Project Context:', { projectId, projectName, orgId, orgName })
    console.log('[CRM] Brand Colors:', { primary: brandPrimary, colorSource: brandColorSource })
  }, [projectId, projectName, orgId, orgName, brandPrimary, brandColorSource])
  
  // Computed stats
  const stats = useMemo(() => {
    const total = prospects.length
    const byStage = {}
    Object.keys(pipelineStages).forEach(stage => {
      byStage[stage] = prospects.filter(p => p.pipeline_stage === stage).length
    })
    const fromForms = prospects.filter(p => p.source === 'form').length
    const activeCount = prospects.filter(p => ACTIVE_STAGES.includes(p.pipeline_stage)).length
    const conversionRate = total > 0 
      ? Math.round((byStage.closed_won / total) * 100) 
      : 0
    
    return { total, byStage, fromForms, activeCount, conversionRate }
  }, [prospects, pipelineStages])

  // Fetch prospects - explicitly pass projectId like Forms does
  const fetchProspects = useCallback(async () => {
    if (!currentProject?.id) {
      console.log('[CRM] No project selected, skipping fetch')
      setProspects([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      const params = {
        // CRITICAL: Explicitly pass projectId as query param (like Forms does)
        projectId: currentProject.id
      }
      
      if (debouncedSearch) params.search = debouncedSearch
      if (sourceFilter !== 'all') params.source = sourceFilter
      if (stageFilters.length > 0) params.stages = stageFilters.join(',')
      // Merge any NL-resolved filters (may override structured filters)
      if (nlFilters && Object.keys(nlFilters).length > 0) Object.assign(params, nlFilters)

      console.log('[CRM] Fetching prospects with params:', params)
      
      const response = await crmApi.listProspects(params)
      const fetchedProspects = response.data?.prospects || response.data?.data || []
      
      console.log('[CRM] Fetched', fetchedProspects.length, 'prospects')
      setProspects(fetchedProspects)
    } catch (err) {
      console.error('[CRM] Failed to fetch prospects:', err)
      toast.error('Failed to load prospects')
      setProspects([])
    } finally {
      setIsLoading(false)
    }
  }, [currentProject?.id, debouncedSearch, sourceFilter, stageFilters, nlFilters])

  // Auto-fetch on filter changes or project change
  useEffect(() => {
    fetchProspects()
  }, [fetchProspects])

  // Fetch unassigned lead count
  const fetchUnassignedCount = useCallback(async () => {
    try {
      const response = await crmApi.getUnassignedLeadCount()
      setUnassignedCount(response.data?.count || 0)
    } catch (err) {
      console.error('[CRM] Failed to fetch unassigned count:', err)
    }
  }, [])

  // Fetch unassigned count on mount and project change
  useEffect(() => {
    fetchUnassignedCount()
  }, [fetchUnassignedCount, projectId])

  // Fetch pipeline stages (sidebar + kanban use same config; "Configure pipeline" customizes colors)
  const fetchPipelineStages = useCallback(async () => {
    if (!projectId) {
      setPipelineStages(DEFAULT_PIPELINE_STAGES)
      return
    }
    try {
      const response = await crmApi.getPipelineStages(projectId)
      const stages = response.data?.stages || response.data || []
      const mapped = mapApiStagesToConfig(stages)
      setPipelineStages(mapped || DEFAULT_PIPELINE_STAGES)
    } catch (err) {
      console.error('[CRM] Failed to fetch pipeline stages:', err)
      setPipelineStages(DEFAULT_PIPELINE_STAGES)
    }
  }, [projectId])

  useEffect(() => {
    fetchPipelineStages()
  }, [fetchPipelineStages])

  // Handle lead assigned from unassigned queue
  const handleLeadAssigned = () => {
    fetchUnassignedCount()
    fetchProspects() // Refresh main list too
  }

  // Refresh data (including pipeline config after "Configure pipeline" save)
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchProspects(), fetchUnassignedCount(), fetchPipelineStages()])
    setIsRefreshing(false)
    toast.success('Data refreshed')
  }

  // Handle stage change from drag & drop
  const handleUpdateStage = async (prospectId, newStage) => {
    try {
      await crmApi.updateProspect(prospectId, { pipelineStage: newStage })
      
      setProspects(prev => prev.map(p => 
        p.id === prospectId ? { ...p, pipeline_stage: newStage } : p
      ))
      
      if (selectedProspect?.id === prospectId) {
        setSelectedProspect(prev => ({ ...prev, pipeline_stage: newStage }))
      }
      
      toast.success('Stage updated')
    } catch (err) {
      console.error('Failed to update stage:', err)
      const errorMsg = err.response?.data?.message || 'Failed to update stage'
      toast.error(errorMsg)
    }
  }

  // Handle "Send Contract" — fetch quote data and open Echo with contract context
  const handleSendContract = async (prospect) => {
    let quoteContext = `Name: ${prospect.name || 'Unknown'}\nEmail: ${prospect.email || 'N/A'}\nCompany: ${prospect.company || 'N/A'}`

    // Try to fetch quote_details from form submission
    if (prospect.form_submission_id) {
      try {
        const response = await crmApi.getProspectFormSubmission(prospect.id)
        const submission = response.data
        const quoteDetails = submission?.data?.quote_details
        if (quoteDetails) {
          const parsed = typeof quoteDetails === 'string' ? JSON.parse(quoteDetails) : quoteDetails
          quoteContext = JSON.stringify(parsed, null, 2)
        }
      } catch (err) {
        console.warn('Could not fetch form submission for contract:', err)
      }
    }

    window.dispatchEvent(
      new CustomEvent('open-echo', {
        detail: { context: `contract:${quoteContext}` },
      })
    )
  }

  // Handle prospect click
  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect)
    setShowRightSidebar(true)
  }

  // Handle prospect added
  const handleProspectAdded = (newProspect) => {
    setProspects(prev => [newProspect, ...prev])
    toast.success('Prospect added')
  }

  // Filter prospects for display
  const filteredProspects = useMemo(() => {
    let result = prospects

    // Filter by selected stages (client-side, in addition to API filter)
    if (stageFilters.length > 0) {
      result = result.filter(p => stageFilters.includes(p.pipeline_stage))
    }

    // Filter out closed if not showing
    if (!showClosedDeals) {
      result = result.filter(p => ACTIVE_STAGES.includes(p.pipeline_stage))
    }

    return result
  }, [prospects, stageFilters, showClosedDeals])

  // Group prospects by stage for pipeline view
  const prospectsByStage = useMemo(() => {
    const grouped = {}
    Object.keys(pipelineStages).forEach(stage => {
      grouped[stage] = filteredProspects.filter(p => p.pipeline_stage === stage)
    })
    return grouped
  }, [filteredProspects, pipelineStages])

  // Stages to show based on showClosedDeals
  const visibleStages = showClosedDeals 
    ? Object.keys(pipelineStages)
    : ACTIVE_STAGES

  const subtitle = `${stats.activeCount} active · ${stats.fromForms} from forms${stats.conversionRate > 0 ? ` · ${stats.conversionRate}% won` : ''}`
  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="relative hidden md:block">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search prospects..."
          className="pl-8 h-8 w-[200px] text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <NaturalLanguageFilter
        module="crm"
        onFiltersResolved={(filters) => setNlFilters(filters)}
        placeholder="e.g. leads from last week not yet contacted"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <div className="flex border rounded-md overflow-hidden">
        {[
          { id: 'pipeline', label: 'Pipeline', icon: LayoutGrid },
          { id: 'list', label: 'List', icon: List },
        ].map((mode) => (
          <Tooltip key={mode.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "h-8 px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                  viewMode === mode.id ? "text-white" : "hover:bg-muted text-muted-foreground"
                )}
                style={viewMode === mode.id ? { backgroundColor: brandColors.primary } : {}}
              >
                <mode.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{mode.label} view</TooltipContent>
          </Tooltip>
        ))}
      </div>
      {viewMode === 'pipeline' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsPipelineSettingsOpen(true)}>
              <Sliders className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configure pipeline</TooltipContent>
        </Tooltip>
      )}
      <Button
        size="sm"
        className="gap-1.5"
        onClick={() => setIsAddProspectOpen(true)}
        style={{ backgroundColor: brandColors.primary, color: 'white' }}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Lead</span>
      </Button>
    </div>
  )

  return (
  <>
    <TooltipProvider>
      <ModuleLayout
        data-sonor-help="crm/dashboard"
        ariaLabel={isAgency ? 'CRM' : 'Prospects'}
        leftSidebarOpen={showLeftSidebar}
        rightSidebarOpen={showRightSidebar}
        onLeftSidebarOpenChange={setShowLeftSidebar}
        onRightSidebarOpenChange={setShowRightSidebar}
        leftSidebarTitle="Filters & views"
        rightSidebarTitle="Details"
        leftSidebarWidth={240}
        rightSidebarWidth={360}
        leftSidebar={(
          <div className="p-4 space-y-6">
                    
                    {/* Quick Stats */}
                    <div className="space-y-2">
                      <p className="uppercase tracking-wider text-muted-foreground">Overview</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-background border">
                          <p style={{ color: brandColors.primary }}>{stats.total}</p>
                          <p className="text-muted-foreground">Total Leads</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border">
                          <p className="text-green-600">{stats.byStage.closed_won || 0}</p>
                          <p className="text-muted-foreground">Won</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stage Filters */}
                    <div className="space-y-2">
                      <p className="uppercase tracking-wider text-muted-foreground">Stages</p>
                      <div className="space-y-1">
                        {/* All Stages option */}
                        <button
                          onClick={() => setStageFilters([])}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors',
                            stageFilters.length === 0
                              ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium'
                              : 'hover:bg-muted'
                          )}
                        >
                          <span>All Stages</span>
                          <Badge variant="secondary" className="h-5 min-w-5 justify-center">
                            {stats.total || prospects.length}
                          </Badge>
                        </button>
                        {Object.entries(pipelineStages).map(([key, config]) => {
                          const count = stats.byStage[key] || 0
                          const isHidden = !showClosedDeals && (key === 'closed_won' || key === 'closed_lost')
                          const isActive = stageFilters.includes(key)

                          if (isHidden) return null

                          return (
                            <button
                              key={key}
                              onClick={() => {
                                if (isActive) {
                                  // Deselect → back to all
                                  setStageFilters([])
                                } else {
                                  setStageFilters([key])
                                }
                              }}
                              className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors',
                                isActive
                                  ? 'bg-[var(--brand-primary)]/10 font-medium'
                                  : 'hover:bg-muted'
                              )}
                              style={isActive ? { color: config.color } : undefined}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: config.color }}
                                />
                                <span>{config.label}</span>
                              </div>
                              <Badge variant="secondary" className="h-5 min-w-5 justify-center">
                                {count}
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Source Filter */}
                    <div className="space-y-2">
                      <p className="uppercase tracking-wider text-muted-foreground">Source</p>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="form">Form Submission</SelectItem>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                          <SelectItem value="import">Import</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Show Closed Toggle */}
                    <div className="space-y-2">
                      <p className="uppercase tracking-wider text-muted-foreground">Display</p>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted cursor-pointer">
                        <Checkbox 
                          checked={showClosedDeals}
                          onCheckedChange={setShowClosedDeals}
                        />
                        <span>Show closed deals</span>
                      </label>
                    </div>
                    
                    {/* Signal Features */}
                    {signalEnabled && (
                      <div className="space-y-2">
                        <p className="uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <SignalIcon size={12} color={brandColors.primary} />
                          Signal
                        </p>
                        <div 
                          className="p-3 rounded-lg border space-y-1"
                          style={{ 
                            borderColor: brandColors.rgba.primary30,
                            backgroundColor: brandColors.rgba.primary10 
                          }}
                        >
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.primary }}>
                              <Target className="h-4 w-4" />
                              <span>Score Leads</span>
                            </div>
                          </button>
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.primary }}>
                              <Zap className="h-4 w-4" />
                              <span>Auto-Assign</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Agency-Only Features (OpenPhone, Calls, Proposals) */}
                    {/* View Switcher */}
                    <div className="space-y-2">
                      <p className="uppercase tracking-wider text-muted-foreground">
                        View
                      </p>
                      <div className="space-y-1">
                        <button
                          onClick={() => setViewMode('pipeline')}
                          data-tour="crm-pipeline"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'pipeline'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <Kanban className="h-4 w-4" />
                          <span>Pipeline</span>
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'list'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <List className="h-4 w-4" />
                          <span>List View</span>
                        </button>
                        <button
                          onClick={() => setViewMode('analytics')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'analytics'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Analytics</span>
                        </button>
                        <button
                          onClick={() => setViewMode('tasks')}
                          data-tour="crm-activity"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'tasks'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <ListTodo className="h-4 w-4" />
                          <span>Tasks</span>
                        </button>
                        <button
                          onClick={() => setViewMode('reminders')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'reminders'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <Bell className="h-4 w-4" />
                          <span>Reminders</span>
                        </button>
                        <button
                          onClick={() => setViewMode('email')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'email'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </button>
                        <button
                          onClick={() => setViewMode('clients')}
                          data-tour="crm-contacts"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'clients'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <Building2 className="h-4 w-4" />
                          <span>Clients</span>
                        </button>
                        <button
                          onClick={() => setViewMode('unassigned')}
                          data-tour="crm-leads"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 relative",
                            viewMode === 'unassigned'
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Unassigned</span>
                          {unassignedCount > 0 && (
                            <Badge 
                              className="absolute right-2 text-[10px] h-5 px-1.5"
                              style={{ 
                                backgroundColor: brandColors.rgba.primary15,
                                color: brandColors.primary
                              }}
                            >
                              {unassignedCount}
                            </Badge>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Integrations section — Commerce-style */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Integrations
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-muted"
                          onClick={() => setViewMode('integrations')}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="px-3 py-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            gmailConnected ? "bg-emerald-500" : "bg-muted-foreground"
                          )} />
                          <span className={gmailConnected ? "text-foreground" : "text-muted-foreground"}>
                            {gmailConnected ? 'Gmail connected' : 'Gmail not connected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAgency && (
                      <div className="space-y-2">
                        <p className="uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          Agency Tools
                        </p>
                        <div 
                          className="p-3 rounded-lg border space-y-1"
                          style={{ 
                            borderColor: brandColors.rgba.secondary30,
                            backgroundColor: brandColors.rgba.secondary10 
                          }}
                        >
                          <button 
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md transition-colors",
                              viewMode === 'radar'
                                ? "bg-background shadow-sm"
                                : "hover:bg-white/50 dark:hover:bg-black/20"
                            )}
                            onClick={() => setViewMode('radar')}
                          >
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <Target className="h-4 w-4" />
                              <span>Radar</span>
                            </div>
                          </button>
                          <button 
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md transition-colors",
                              viewMode === 'prospecting'
                                ? "bg-background shadow-sm"
                                : "hover:bg-white/50 dark:hover:bg-black/20"
                            )}
                            onClick={() => setViewMode('prospecting')}
                          >
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <Search className="h-4 w-4" />
                              <span>Prospecting</span>
                            </div>
                          </button>
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <Phone className="h-4 w-4" />
                              <span>Call Log</span>
                            </div>
                          </button>
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <FileText className="h-4 w-4" />
                              <span>Proposals</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
        )}
        rightSidebar={selectedProspect ? (
          <ProspectDetailDrawer
            prospect={selectedProspect}
            onClose={() => {
              setShowRightSidebar(false)
              setSelectedProspect(null)
            }}
            onUpdate={(updated) => {
              if (updated) {
                setProspects(prev => prev.map(p => (p.id === updated.id ? updated : p)))
                setSelectedProspect(updated)
              } else {
                handleRefresh()
              }
            }}
            onStageChange={(newStage) => handleUpdateStage(selectedProspect.id, newStage)}
            isAgency={isAgency}
            embedded
            expanded={rightSidebarExpanded}
            onExpand={(expanded) => setRightSidebarExpanded(expanded)}
            pipelineStages={pipelineStages}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: brandColors.rgba.primary10 }}
              >
                <Users className="h-8 w-8" style={{ color: brandColors.primary }} />
              </div>
              <h3 className="mb-1">No prospect selected</h3>
              <p className="text-muted-foreground">Click on a prospect to view details</p>
            </div>
          </div>
        )}
      >
        <ModuleLayout.Header
          data-tour="crm-overview"
          title={isAgency ? 'CRM' : 'Prospects'}
          icon={MODULE_ICONS.crm}
          subtitle={subtitle}
          actions={headerActions}
        />
        <ModuleLayout.Content className="flex flex-col">
          <div className="flex flex-col flex-1 min-h-0">
            <SignalSuggestsPanel module="crm" className="mb-4 mx-4 mt-4 shrink-0" />
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <UptradeSpinner size="md" label="Loading prospects..." />
                </div>
              </div>
            ) : !currentProject ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center max-w-md">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: brandColors.rgba.primary10 }}
                  >
                    <AlertCircle className="h-8 w-8" style={{ color: brandColors.primary }} />
                  </div>
                  <h3 className="mb-2">No Project Selected</h3>
                  <p className="text-muted-foreground">
                    Please select a project from the sidebar to view prospects.
                  </p>
                </div>
              </div>
            ) : filteredProspects.length === 0 ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center max-w-md">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: brandColors.rgba.primary10 }}
                  >
                    <Users className="h-8 w-8" style={{ color: brandColors.primary }} />
                  </div>
                  <h3 className="mb-2">No prospects yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || sourceFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Add your first prospect to get started'}
                  </p>
                  {!searchQuery && sourceFilter === 'all' && (
                    <Button 
                      onClick={() => setIsAddProspectOpen(true)}
                      style={{ backgroundColor: brandColors.primary, color: 'white' }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Lead
                    </Button>
                  )}
                </div>
              </div>
            ) : viewMode === 'analytics' ? (
              // Analytics View
              <div>
                <CRMAnalyticsDashboard
                  projectId={currentProject?.id}
                  brandColors={brandColors}
                />
              </div>
            ) : viewMode === 'tasks' ? (
              // Tasks View - Full featured tasks manager with Sync integration
              <CRMTasksManager 
                projectId={currentProject?.id}
                brandColors={brandColors}
              />
            ) : viewMode === 'reminders' ? (
              // Reminders View - Full featured reminders manager with Sync integration
              <CRMRemindersManager 
                projectId={currentProject?.id}
                brandColors={brandColors}
              />
            ) : viewMode === 'email' ? (
              // Email View - Gmail inbox integration
              <CRMEmailHub 
                brandColors={brandColors}
              />
            ) : viewMode === 'clients' ? (
              // Clients View - Manage converted leads with health metrics
              <ClientsView
                onClientClick={handleProspectClick}
                brandColors={brandColors}
              />
            ) : viewMode === 'unassigned' ? (
              // Unassigned Leads Queue - Leads waiting to be claimed/assigned
              <div className="p-4">
                <UnassignedLeadsQueue 
                  onLeadClick={handleProspectClick}
                  onLeadAssigned={handleLeadAssigned}
                />
              </div>
            ) : viewMode === 'integrations' ? (
              // Integrations - Google workspace (Gmail + Calendar) per-user OAuth
              <UserGoogleIntegrationPanel inline context="crm" onClose={() => setViewMode('pipeline')} />
            ) : viewMode === 'radar' ? (
              // Radar View - Signal AI Prospecting via Places API
              <ProspectingDashboard />
            ) : viewMode === 'prospecting' ? (
              // Prospecting View - Chrome extension target companies
              <SalesModule title="Prospecting" fetchParams={{ source: 'extension' }} />
            ) : viewMode === 'pipeline' ? (
              // Pipeline/Kanban View - Fill vertical space
              <div className="p-4 flex-1 min-h-0 flex flex-col">
                <PipelineKanban
                  pipelineStages={pipelineStages}
                  prospects={filteredProspects}
                  selectedProspects={selectedProspects}
                  isLoading={isLoading}
                  showClosedDeals={showClosedDeals}
                  focusedStages={stageFilters}
                  onToggleClosedDeals={() => setShowClosedDeals(!showClosedDeals)}
                  onSelectProspect={(id) => {
                    if (selectedProspects.includes(id)) {
                      setSelectedProspects(selectedProspects.filter(p => p !== id))
                    } else {
                      setSelectedProspects([...selectedProspects, id])
                    }
                  }}
                  onProspectClick={handleProspectClick}
                  onMoveToStage={handleUpdateStage}
                  onEmail={(prospect) => {
                    if (prospect.email) {
                      setEmailComposeContact(prospect)
                      setIsEmailComposeOpen(true)
                    }
                  }}
                  onCall={(prospect) => {
                    if (prospect.phone) window.location.href = `tel:${prospect.phone}`
                  }}
                  onViewWebsite={(prospect) => {
                    if (prospect.website) window.open(prospect.website, '_blank', 'noopener')
                  }}
                  onSendGatedLink={(prospect) => {
                    setGatedLinkContact(prospect)
                    setIsGatedLinkOpen(true)
                  }}
                  onSendContract={handleSendContract}
                  onArchive={(prospect) => {
                    handleUpdateStage(prospect.id, 'closed_lost')
                  }}
                />
              </div>
            ) : (
              // List View
              <div className="p-4 space-y-2">
                {filteredProspects.map((prospect) => (
                  <ProspectCard
                    key={prospect.id}
                    prospect={prospect}
                    isSelected={selectedProspect?.id === prospect.id}
                    onClick={handleProspectClick}
                    compact
                    brandColors={brandColors}
                    pipelineStages={pipelineStages}
                  />
                ))}
              </div>
            )}
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>
        {/* Add Prospect Dialog */}
        <AddProspectDialog
          open={isAddProspectOpen}
          onOpenChange={setIsAddProspectOpen}
          onProspectAdded={handleProspectAdded}
        />

        {/* Pipeline Settings Dialog */}
        <PipelineSettingsDialog
          open={isPipelineSettingsOpen}
          onClose={() => setIsPipelineSettingsOpen(false)}
          projectId={currentProject?.id}
          onUpdate={handleRefresh}
        />

        {/* Email Compose Dialog (Gmail integration) */}
        <EmailComposeDialog
          open={isEmailComposeOpen}
          onOpenChange={setIsEmailComposeOpen}
          contact={emailComposeContact}
          projectId={currentProject?.id}
          onSent={() => {
            toast.success('Email sent successfully')
          }}
        />

        {/* Send Gated Link Dialog */}
        <SendGatedLinkDialog
          open={isGatedLinkOpen}
          onOpenChange={setIsGatedLinkOpen}
          contact={gatedLinkContact}
          projectId={currentProject?.id}
          gatedPageConfigs={currentProject?.settings?.gated_pages || []}
          onSuccess={() => {
            setIsGatedLinkOpen(false)
            toast.success('Gated link sent')
          }}
        />
    </TooltipProvider>

  </>
  )
}
