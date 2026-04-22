// src/pages/forms/FormsDashboard.jsx
// Unified Forms Dashboard - uses ModuleLayout for consistent shell (left sidebar + main content)

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useSignalAccess } from '@/lib/signal-access'
import portalApi, { formsApi } from '@/lib/sonor-api'
import { toast } from 'sonner'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  FileText,
  Plus,
  Search,
  TrendingUp,
  Inbox,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List,
  RefreshCw,
  ExternalLink,
  Settings,
  Zap,
  Sparkles,
  Users,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Eye,
  Filter,
  SlidersHorizontal,
  Code,
  GitBranch,
  Workflow,
  Bell,
  Target,
  Star,
  Trash2,
  MoreVertical,
  Copy,
  Archive,
  MessageSquare,
  Globe,
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import SignalIcon from '@/components/ui/SignalIcon'
import FormBuilder from '@/components/forms/FormBuilder'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isValid, subDays } from 'date-fns'

// Import view components
import FormsListView from './components/FormsListView'
import SubmissionsView, { SubmissionDetailPanel } from './components/SubmissionsView'
import AnalyticsView from './components/AnalyticsView'
import DeliveryRulesView from './components/DeliveryRulesView'
import HighlightsView from './components/HighlightsView'
import FormDefaultsView from './components/FormDefaultsView'
import FormsSettingsView from './components/FormsSettingsView'
import OrgTemplatesView from './components/OrgTemplatesView'
import { NaturalLanguageFilter } from '@/components/ai/NaturalLanguageFilter'

// =============================================================================
// CONSTANTS
// =============================================================================

const SIDEBAR_SECTIONS = {
  forms: {
    label: 'Forms',
    icon: FileText,
    items: [
      { id: 'all', label: 'All Forms' },
      { id: 'active', label: 'Active', filter: { status: 'active' } },
      { id: 'draft', label: 'Drafts', filter: { status: 'draft' } },
      { id: 'archived', label: 'Archived', filter: { status: 'archived' } },
    ]
  },
  submissions: {
    label: 'Submissions',
    icon: Inbox,
    items: [
      { id: 'all', label: 'All Submissions' },
      { id: 'new', label: 'New', filter: { status: 'new' } },
      { id: 'high-value', label: 'High-Value', filter: { high_value: true }, icon: Target },
      { id: 'high-intent', label: 'High Intent', filter: { quality_tier: 'high' }, icon: Star },
      { id: 'contacted', label: 'Contacted', filter: { status: 'contacted' } },
      { id: 'qualified', label: 'Qualified', filter: { status: 'qualified' } },
      { id: 'spam', label: 'Spam', filter: { quality_tier: 'spam' }, icon: AlertTriangle },
    ]
  },
  delivery: {
    label: 'Delivery',
    icon: Workflow,
    items: [
      { id: 'rules', label: 'Routing Rules', icon: GitBranch },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
      { id: 'log', label: 'Delivery Log', icon: Clock },
    ]
  }
}

const FORM_TYPE_CONFIG = {
  contact: { label: 'Contact', color: 'blue' },
  lead: { label: 'Lead Capture', color: 'emerald' },
  quote: { label: 'Quote Request', color: 'amber' },
  booking: { label: 'Booking', color: 'violet' },
  survey: { label: 'Survey', color: 'rose' },
  support: { label: 'Support', color: 'orange' },
  custom: { label: 'Custom', color: 'gray' },
}

const QUALITY_TIER_CONFIG = {
  high: { label: 'High Intent', color: 'emerald', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600 dark:text-emerald-400' },
  medium: { label: 'Medium', color: 'amber', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', color: 'gray', bgColor: 'bg-gray-500/10', textColor: 'text-gray-600 dark:text-gray-400' },
  spam: { label: 'Spam', color: 'red', bgColor: 'bg-red-500/10', textColor: 'text-red-600 dark:text-red-400' },
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FormsDashboard() {
  const { currentProject, currentOrg, isSuperAdmin, accessLevel } = useAuthStore()
  const navigate = useNavigate()
  const brandColors = useBrandColors()
  const { hasSignal, isLoading: signalLoading } = useSignalAccess()
  
  const projectId = currentProject?.id
  
  // Can the user manage org templates?
  const canManageOrgTemplates = isSuperAdmin || 
    accessLevel === 'organization' || 
    currentOrg?.org_type === 'agency'
  
  // View state
  const [currentView, setCurrentView] = useState('highlights')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [submissionsTab, setSubmissionsTab] = useState('all')
  const [formIdFilter, setFormIdFilter] = useState(null)
  const [deliveryTab, setDeliveryTab] = useState('rules')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('list')
  const [nlFilters, setNlFilters] = useState({})
  
  // Collapsible states
  const [formsOpen, setFormsOpen] = useState(true)
  const [submissionsOpen, setSubmissionsOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  
  // Data state
  const [forms, setForms] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [stats, setStats] = useState(null)
  const [deliveryRules, setDeliveryRules] = useState([])
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  
  // Submission detail sidebar state
  const [selectedSubmission, setSelectedSubmission] = useState(null)

  // Form editor state
  const [isFormEditorOpen, setIsFormEditorOpen] = useState(false)
  const [editingFormId, setEditingFormId] = useState(null)
  const [editingFormData, setEditingFormData] = useState(null)

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  useEffect(() => {
    if (projectId) {
      loadForms()
      loadStats()
    }
  }, [projectId])

  useEffect(() => {
    if (projectId && (currentView === 'submissions' || currentView === 'highlights')) {
      loadSubmissions()
    }
  }, [projectId, currentView, submissionsTab, formIdFilter])

  useEffect(() => {
    if (projectId && currentView === 'delivery') {
      loadDeliveryRules()
    }
  }, [projectId, currentView])

  async function loadForms() {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await formsApi.list({ project_id: projectId })
      setForms(response.data?.forms || response.data || [])
    } catch (err) {
      console.error('Failed to load forms:', err)
      setError('Failed to load forms')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSubmissions() {
    if (!projectId) return
    setIsSubmissionsLoading(true)
    
    try {
      const filters = { project_id: projectId }
      if (formIdFilter) {
        filters.form_id = formIdFilter
      }
      if (submissionsTab !== 'all') {
        const section = SIDEBAR_SECTIONS.submissions.items.find(i => i.id === submissionsTab)
        if (section?.filter) {
          Object.assign(filters, section.filter)
        }
      }
      
      const response = await formsApi.listSubmissions(filters)
      setSubmissions(response.data?.submissions || response.data || [])
    } catch (err) {
      console.error('Failed to load submissions:', err)
    } finally {
      setIsSubmissionsLoading(false)
    }
  }

  async function loadStats() {
    if (!projectId) return
    try {
      // Get form stats
      const { data: formsData } = await supabase
        .from('managed_forms')
        .select('id, is_active')
        .eq('project_id', projectId)
      
      // Get submission stats (this week = last 7 days, last week = 7–14 days ago)
      const now = new Date()
      const weekAgo = subDays(now, 7).toISOString()
      const twoWeeksAgo = subDays(now, 14).toISOString()
      const { data: submissionsData } = await supabase
        .from('form_submissions')
        .select('id, status, quality_tier, created_at')
        .eq('project_id', projectId)
        .gte('created_at', weekAgo)
      const { data: lastWeekData } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('project_id', projectId)
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo)
      
      const thisWeek = submissionsData?.length || 0
      const lastWeek = lastWeekData?.length || 0
      const weekOverWeekChange = lastWeek > 0
        ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
        : (thisWeek === 0 && lastWeek === 0 ? 0 : undefined)
      
      // Get today's submissions
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: todayData } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('project_id', projectId)
        .gte('created_at', todayStart.toISOString())
      
      setStats({
        totalForms: formsData?.length || 0,
        activeForms: formsData?.filter(f => f.is_active).length || 0,
        submissionsThisWeek: thisWeek,
        submissionsLastWeek: lastWeek,
        submissionsWeekOverWeekChange: weekOverWeekChange,
        submissionsToday: todayData?.length || 0,
        newSubmissions: submissionsData?.filter(s => s.status === 'new').length || 0,
        highIntentLeads: submissionsData?.filter(s => s.quality_tier === 'high').length || 0,
        spamCount: submissionsData?.filter(s => s.quality_tier === 'spam').length || 0,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  async function loadDeliveryRules() {
    if (!projectId) return
    try {
      const { data } = await supabase
        .from('form_routing_rules')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false })
      
      setDeliveryRules(data || [])
    } catch (err) {
      console.error('Failed to load delivery rules:', err)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await Promise.all([loadForms(), loadSubmissions(), loadStats()])
    setIsRefreshing(false)
  }

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const formCounts = useMemo(() => {
    const counts = { all: forms.length, active: 0, draft: 0, archived: 0 }
    forms.forEach(f => {
      if (f.isActive) counts.active++
      else counts.draft++ // Treat inactive as draft for now
    })
    return counts
  }, [forms])

  const submissionCounts = useMemo(() => {
    const counts = {
      all: submissions.length,
      new: 0,
      'high-value': 0,
      'high-intent': 0,
      contacted: 0,
      qualified: 0,
      spam: 0
    }
    submissions.forEach(s => {
      if (s.status === 'new') counts.new++
      if (s.high_value === true) counts['high-value']++
      if (s.quality_tier === 'high') counts['high-intent']++
      if (s.status === 'contacted') counts.contacted++
      if (s.status === 'qualified') counts.qualified++
      if (s.quality_tier === 'spam') counts.spam++
    })
    return counts
  }, [submissions])

  // Filter forms by search and NL filters
  const filteredForms = useMemo(() => {
    let result = forms
    const query = searchQuery.toLowerCase()
    if (query) {
      result = result.filter(f =>
        f.name?.toLowerCase().includes(query) ||
        f.slug?.toLowerCase().includes(query)
      )
    }
    // NL filter: status
    if (nlFilters?.status && nlFilters.status !== 'all') {
      const s = nlFilters.status
      if (s === 'active') result = result.filter(f => f.isActive)
      else if (s === 'draft' || s === 'inactive') result = result.filter(f => !f.isActive)
    }
    // NL filter: search override
    if (nlFilters?.search) {
      const q = nlFilters.search.toLowerCase()
      result = result.filter(f =>
        f.name?.toLowerCase().includes(q) || f.slug?.toLowerCase().includes(q)
      )
    }
    return result
  }, [forms, searchQuery, nlFilters])

  // NL-filtered submissions (applied on top of the existing submissions array)
  const filteredSubmissions = useMemo(() => {
    if (!nlFilters || Object.keys(nlFilters).length === 0) return submissions
    let result = submissions
    if (nlFilters.status) result = result.filter(s => s.status === nlFilters.status)
    if (nlFilters.quality_tier) result = result.filter(s => s.quality_tier === nlFilters.quality_tier)
    if (nlFilters.high_value === true) result = result.filter(s => s.high_value === true)
    if (nlFilters.form_id) result = result.filter(s => s.form_id === nlFilters.form_id)
    return result
  }, [submissions, nlFilters])

  // ==========================================================================
  // VIEW HANDLERS
  // ==========================================================================

  function setView(view, filter = 'all') {
    setCurrentView(view)
    setCurrentFilter(filter)
    // Close submission detail sidebar when switching views
    if (view !== 'submissions') {
      setSelectedSubmission(null)
    }
  }

  function setFormFilter(filter) {
    setCurrentView('forms')
    setCurrentFilter(filter)
    setFormsOpen(true)
  }

  function setSubmissionFilter(filter) {
    setCurrentView('submissions')
    setSubmissionsTab(filter)
    setFormIdFilter(null)
    setSubmissionsOpen(true)
  }

  function handleViewFormSubmissions(formId) {
    setCurrentView('submissions')
    setSubmissionsTab('all')
    setFormIdFilter(formId)
    setSubmissionsOpen(true)
  }

  function setDeliveryView(tab) {
    setCurrentView('delivery')
    setDeliveryTab(tab)
    setDeliveryOpen(true)
  }

  // ==========================================================================
  // FORM ACTIONS
  // ==========================================================================

  async function handleArchiveForm(formId) {
    try {
      await formsApi.update(formId, { isActive: false })
      toast.success('Form archived')
      loadForms()
    } catch (err) {
      console.error('Failed to archive form:', err)
      toast.error('Failed to archive form')
    }
  }

  async function handleDuplicateForm(formId) {
    try {
      // Get the form to duplicate
      const { data: form } = await formsApi.get(formId)
      if (!form) throw new Error('Form not found')
      
      // Create a copy with new name and slug
      const newForm = {
        projectId: form.projectId,
        name: `${form.name} (Copy)`,
        slug: `${form.slug}-copy-${Date.now()}`,
        description: form.description,
        formType: form.formType,
        successMessage: form.successMessage,
        submitButtonText: form.submitButtonText,
        layout: form.layout,
        isActive: false, // Start as inactive
        fields: form.fields?.map(f => ({
          slug: f.slug,
          label: f.label,
          fieldType: f.fieldType,
          placeholder: f.placeholder,
          helpText: f.helpText,
          isRequired: f.isRequired,
          options: f.options,
          width: f.width,
          sortOrder: f.sortOrder,
        })),
      }
      
      const { data: created } = await formsApi.create(newForm)
      toast.success('Form duplicated', {
        action: {
          label: 'Edit',
          onClick: () => navigate(`/forms/${created.id}/edit`),
        },
      })
      loadForms()
    } catch (err) {
      console.error('Failed to duplicate form:', err)
      toast.error('Failed to duplicate form')
    }
  }

  async function handleDeleteForm(formId) {
    if (!confirm('Are you sure you want to delete this form? This cannot be undone.')) return
    
    try {
      await formsApi.delete(formId)
      toast.success('Form deleted')
      loadForms()
    } catch (err) {
      console.error('Failed to delete form:', err)
      toast.error('Failed to delete form')
    }
  }

  // ==========================================================================
  // SUBMISSION ACTIONS
  // ==========================================================================

  async function handleUpdateSubmissionStatus(id, status) {
    try {
      await formsApi.updateSubmission(id, { status })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
      toast.success(`Submission marked as ${status}`)
    } catch (err) {
      console.error('Failed to update submission:', err)
      toast.error('Failed to update submission status')
    }
  }

  async function handleDeleteSubmission(id) {
    if (!confirm('Delete this submission? This cannot be undone.')) return
    try {
      await formsApi.deleteSubmission(id)
      setSubmissions(prev => prev.filter(s => s.id !== id))
      toast.success('Submission deleted')
    } catch (err) {
      console.error('Failed to delete submission:', err)
      toast.error('Failed to delete submission')
    }
  }

  async function handleBulkDeleteSubmissions(ids) {
    if (!confirm(`Delete ${ids.length} submission${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      await Promise.all(ids.map(id => formsApi.deleteSubmission(id)))
      setSubmissions(prev => prev.filter(s => !ids.includes(s.id)))
      toast.success(`${ids.length} submission${ids.length > 1 ? 's' : ''} deleted`)
    } catch (err) {
      console.error('Failed to bulk delete submissions:', err)
      toast.error('Failed to delete some submissions')
      loadSubmissions()
    }
  }

  async function handleBulkUpdateSubmissionStatus(ids, status) {
    try {
      await Promise.all(ids.map(id => formsApi.updateSubmission(id, { status })))
      setSubmissions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status } : s))
      toast.success(`${ids.length} submission${ids.length > 1 ? 's' : ''} marked as ${status}`)
    } catch (err) {
      console.error('Failed to bulk update submissions:', err)
      toast.error('Failed to update some submissions')
      loadSubmissions()
    }
  }

  // ==========================================================================
  // FORM EDITOR HANDLERS
  // ==========================================================================

  function handleOpenNewForm() {
    setEditingFormId(null)
    setEditingFormData(null)
    setIsFormEditorOpen(true)
  }

  async function handleOpenEditForm(formId) {
    try {
      const { data } = await formsApi.get(formId)
      setEditingFormId(formId)
      setEditingFormData(data)
      setIsFormEditorOpen(true)
    } catch (err) {
      console.error('Failed to load form for editing:', err)
      toast.error('Failed to load form')
    }
  }

  async function handleFormSave(formData) {
    try {
      if (editingFormId) {
        await formsApi.update(editingFormId, formData)
        toast.success('Form saved')
      } else {
        await formsApi.create({ ...formData, projectId })
        toast.success('Form created')
      }
      setIsFormEditorOpen(false)
      setEditingFormId(null)
      setEditingFormData(null)
      loadForms()
    } catch (err) {
      console.error('Failed to save form:', err)
      toast.error('Failed to save form')
    }
  }

  function handleFormCancel() {
    setIsFormEditorOpen(false)
    setEditingFormId(null)
    setEditingFormData(null)
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const headerSubtitle = hasSignal ? 'Forms & submissions with Signal' : undefined
  const headerActions = (
    <>
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-64 h-9"
        />
      </div>
      <NaturalLanguageFilter
        module="forms"
        onFiltersResolved={(filters) => setNlFilters(filters)}
        placeholder="e.g. new submissions from contact forms this week"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-9 w-9">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      {(currentView === 'forms' || currentView === 'submissions') && (
        <div className="flex items-center border rounded-md">
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-8 w-8 rounded-none rounded-l-md">
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-8 w-8 rounded-none rounded-r-md">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Button onClick={handleOpenNewForm} className="gap-1.5 text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Form</span>
      </Button>
    </>
  )

  const leftSidebarContent = (
    <>
                <div className="p-4 border-b border-[var(--glass-border)]">              
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--glass-bg-hover)] rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-[var(--text-primary)]">{stats?.submissionsToday || 0}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">Today</div>
                    </div>
                    <div className="bg-[var(--glass-bg-hover)] rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-[var(--text-primary)]">{stats?.newSubmissions || 0}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">New</div>
                    </div>
                  </div>
                </div>
            <ScrollArea className="flex-1 px-2 py-2">
              <div className="space-y-1">
                {/* Highlights */}
                <button
                  type="button"
                  onClick={() => setView('highlights')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'highlights'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Sparkles className={cn("h-4 w-4", currentView === 'highlights' && "text-[var(--brand-primary)]")} />
                  Overview
                </button>

                {/* Forms Section */}
                <Collapsible open={formsOpen} onOpenChange={setFormsOpen} data-tour="forms-list">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        currentView === 'forms'
                          ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className={cn("h-4 w-4", currentView === 'forms' && "text-[var(--brand-primary)]")} />
                        Forms
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)]">{formCounts.all}</span>
                        <ChevronDown className={cn(
                          "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                          formsOpen && "rotate-180"
                        )} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                    {SIDEBAR_SECTIONS.forms.items.map((item) => {
                      const isActive = currentView === 'forms' && currentFilter === item.id
                      const count = formCounts[item.id] || 0

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setFormFilter(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                            isActive 
                              ? "text-[var(--brand-primary)] font-medium" 
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {item.label}
                          <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
                        </button>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>

                {/* Submissions Section */}
                <Collapsible open={submissionsOpen} onOpenChange={setSubmissionsOpen} data-tour="forms-submissions">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        currentView === 'submissions'
                          ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Inbox className={cn("h-4 w-4", currentView === 'submissions' && "text-[var(--brand-primary)]")} />
                        Submissions
                      </div>
                      <div className="flex items-center gap-2">
                        {submissionCounts.new > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                            {submissionCounts.new}
                          </span>
                        )}
                        <ChevronDown className={cn(
                          "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                          submissionsOpen && "rotate-180"
                        )} />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                    {SIDEBAR_SECTIONS.submissions.items.map((item) => {
                      const isActive = currentView === 'submissions' && submissionsTab === item.id
                      const count = submissionCounts[item.id] || 0
                      const Icon = item.icon

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSubmissionFilter(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                            isActive 
                              ? "text-[var(--brand-primary)] font-medium" 
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {item.label}
                          </div>
                          <span className="text-xs text-[var(--text-tertiary)]">{count}</span>
                        </button>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>

                {/* Analytics */}
                <button
                  type="button"
                  onClick={() => setView('analytics')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'analytics'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <BarChart3 className={cn("h-4 w-4", currentView === 'analytics' && "text-[var(--brand-primary)]")} />
                  Analytics
                </button>

                {/* Templates */}
                <button
                  type="button"
                  data-tour="forms-builder"
                  onClick={() => setView('templates')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'templates'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Sparkles className={cn("h-4 w-4", currentView === 'templates' && "text-[var(--brand-primary)]")} />
                  Templates
                </button>

                {/* Org Templates - only for org/agency users */}
                {canManageOrgTemplates && (
                  <button
                    type="button"
                    onClick={() => setView('org-templates')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                      currentView === 'org-templates'
                        ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                        : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <Globe className={cn("h-4 w-4", currentView === 'org-templates' && "text-[var(--brand-primary)]")} />
                    Org Templates
                  </button>
                )}

                {/* Delivery Rules Section */}
                <Collapsible open={deliveryOpen} onOpenChange={setDeliveryOpen} data-tour="forms-routing">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        currentView === 'delivery'
                          ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Workflow className={cn("h-4 w-4", currentView === 'delivery' && "text-[var(--brand-primary)]")} />
                        Delivery
                      </div>
                      <ChevronDown className={cn(
                        "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                        deliveryOpen && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
                    {SIDEBAR_SECTIONS.delivery.items.map((item) => {
                      const isActive = currentView === 'delivery' && deliveryTab === item.id
                      const Icon = item.icon

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setDeliveryView(item.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                            isActive 
                              ? "text-[var(--brand-primary)] font-medium" 
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {Icon && <Icon className="h-3.5 w-3.5" />}
                          {item.label}
                        </button>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>

                {/* Settings */}
                <button
                  type="button"
                  onClick={() => setView('settings')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    currentView === 'settings'
                      ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Settings className={cn("h-4 w-4", currentView === 'settings' && "text-[var(--brand-primary)]")} />
                  Settings
                </button>
              </div>
            </ScrollArea>
            {hasSignal && (
              <div className="p-3 border-t border-[var(--glass-border)]">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10">
                  <SignalIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span className="text-xs font-medium text-[var(--text-primary)]">Signal AI Active</span>
                </div>
              </div>
            )}
    </>
  )

  return (
    <TooltipProvider>
      <ModuleLayout 
        ariaLabel="Forms" 
        leftSidebar={leftSidebarContent} 
        defaultLeftSidebarOpen={true}
        rightSidebar={selectedSubmission ? (
          <SubmissionDetailPanel
            submission={selectedSubmission}
            hasSignal={hasSignal}
            onClose={() => setSelectedSubmission(null)}
            onUpdateStatus={(id, status) => {
              handleUpdateSubmissionStatus(id, status)
              // Update the selected submission in place
              setSelectedSubmission(prev => prev?.id === id ? { ...prev, status } : prev)
            }}
          />
        ) : null}
        rightSidebarOpen={!!selectedSubmission}
        onRightSidebarOpenChange={(open) => { if (!open) setSelectedSubmission(null) }}
        rightSidebarTitle="Submission Detail"
        rightSidebarWidth={420}
      >
        <ModuleLayout.Header data-tour="forms-overview" title="Forms" icon={MODULE_ICONS.forms} subtitle={headerSubtitle} actions={headerActions} />
        <ModuleLayout.Content>
          <div className="p-6">
            {currentView === 'highlights' && (
              <HighlightsView
                forms={forms}
                submissions={submissions}
                stats={stats}
                isLoading={isLoading}
                hasSignal={hasSignal}
                onViewForm={(id) => navigate(`/forms/${id}`)}
                onViewSubmission={(id) => {
                  setCurrentView('submissions')
                  setSubmissionsTab('all')
                }}
                onViewAllSubmissions={() => {
                  setCurrentView('submissions')
                  setSubmissionsTab('all')
                  setSubmissionsOpen(true)
                }}
              />
            )}
            
            {currentView === 'forms' && (
              <FormsListView
                forms={filteredForms}
                isLoading={isLoading}
                viewMode={viewMode}
                filter={currentFilter}
                onEdit={handleOpenEditForm}
                onView={(id) => navigate(`/forms/${id}`)}
                onViewSubmissions={handleViewFormSubmissions}
                onDuplicate={handleDuplicateForm}
                onArchive={handleArchiveForm}
                onDelete={handleDeleteForm}
              />
            )}
            
            {currentView === 'templates' && (
              <FormDefaultsView
                projectId={projectId}
                onFormCreated={(id, action) => {
                  if (action === 'edit') handleOpenEditForm(id)
                  else navigate(`/forms/${id}`)
                }}
              />
            )}
            
            {currentView === 'org-templates' && canManageOrgTemplates && (
              <OrgTemplatesView
                orgId={currentOrg?.id}
                orgName={currentOrg?.name}
              />
            )}
            
            {currentView === 'submissions' && (
              <>
                {formIdFilter && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Showing submissions for
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      {forms.find(f => f.id === formIdFilter)?.name || 'Form'}
                      <button
                        type="button"
                        onClick={() => setFormIdFilter(null)}
                        className="ml-1 rounded hover:bg-[var(--glass-bg-hover)] p-0.5"
                        aria-label="Clear form filter"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  </div>
                )}
                <SubmissionsView
                  submissions={filteredSubmissions}
                  isLoading={isSubmissionsLoading}
                  viewMode={viewMode}
                  filter={submissionsTab}
                  hasSignal={hasSignal}
                  onView={(submission) => setSelectedSubmission(submission)}
                  onUpdateStatus={handleUpdateSubmissionStatus}
                  onDelete={handleDeleteSubmission}
                  onBulkDelete={handleBulkDeleteSubmissions}
                  onBulkUpdateStatus={handleBulkUpdateSubmissionStatus}
                  selectedSubmissionId={selectedSubmission?.id}
                />
              </>
            )}
            
            {currentView === 'analytics' && (
              <AnalyticsView
                projectId={projectId}
                forms={forms}
              />
            )}
            
            {currentView === 'delivery' && (
              <DeliveryRulesView
                projectId={projectId}
                rules={deliveryRules}
                tab={deliveryTab}
                onRefresh={loadDeliveryRules}
              />
            )}
            
            {currentView === 'settings' && (
              <FormsSettingsView projectId={projectId} />
            )}
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>
      
      {/* Form Editor Dialog */}
      <Dialog open={isFormEditorOpen} onOpenChange={setIsFormEditorOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 border-0 rounded-none [&>button]:hidden">
          <DialogTitle className="sr-only">
            {editingFormId ? 'Edit Form' : 'Create New Form'}
          </DialogTitle>
          <FormBuilder
            formId={editingFormId}
            projectId={projectId}
            initialData={editingFormData}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
