// src/pages/commerce/components/ContractsView.jsx
// Contracts view within Commerce -> Sales for client-to-customer contracts
// Adapted from Proposals.jsx for per-project contract management

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProposalTemplate from '@/components/proposals/ProposalTemplate'
import ProposalViewWithAnalytics from '@/components/proposals/ProposalViewWithAnalytics'
import ProposalEditorMain from '@/components/proposals/ProposalEditorMain'
import ContractEditorWithAI from '@/components/ContractEditorWithAI'
import ContractView from '@/components/contracts/ContractView'
import ContractIntakeForm from '@/components/contracts/ContractIntakeForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Eye,
  Edit,
  Loader2,
  Send,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  MousePointer,
  Timer,
  TrendingUp,
  Activity,
  Copy,
  Plus,
  FileText,
  User,
  UserPlus,
  LayoutTemplate,
  ArrowLeft
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { portalApi, commerceApi, proposalsApi, adminApi, crmApi } from '@/lib/portal-api'
import ContractAIDialog from '@/components/ContractAIDialog'
import ProposalAIDialog from '@/components/proposals/ProposalAIDialog'
import EditProposalDialog from '@/components/proposals/EditProposalDialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'

// Contract Row component with expandable analytics
function ContractRow({ contract, onView, onEdit, onDelete, onDuplicate, showSignedDate = false }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>
      case 'sent':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">Sent</Badge>
      case 'viewed':
        return <Badge variant="outline" className="border-purple-200 text-purple-600">Viewed</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'declined':
        return <Badge variant="outline" className="border-red-200 text-red-600">Declined</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const fetchAnalytics = async () => {
    if (analytics || loadingAnalytics) return
    setLoadingAnalytics(true)
    try {
      if (contract._isProposal) {
        const response = await proposalsApi.getAnalytics(contract.id)
        setAnalytics(response.data?.analytics || response.data)
      } else {
        const response = await commerceApi.getContractAnalytics(contract.id)
        setAnalytics(response.data?.analytics ?? response?.analytics ?? null)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleToggle = () => {
    if (!isExpanded && !analytics) {
      fetchAnalytics()
    }
    setIsExpanded(!isExpanded)
  }

  // Don't show analytics toggle for drafts
  const showAnalytics = contract.status !== 'draft'

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div className="border border-border/50 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden">
        {/* Main Row */}
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground truncate">{contract.title}</h4>
              {getStatusBadge(contract.status)}
              {showAnalytics && analytics?.summary?.engagementScore > 0 && (
                <Badge variant="outline" className="border-amber-200 text-amber-600 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {analytics.summary.engagementScore}%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                {contract.contact ? (
                  <User className="w-3.5 h-3.5 text-blue-500" />
                ) : contract.prospect ? (
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <User className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span>{contract.contact?.name || contract.prospect?.name || contract.client_name || contract.recipient_name || 'Unknown recipient'}</span>
                {(contract.contact?.email || contract.prospect?.email || contract.client_email || contract.recipient_email) && (
                  <span className="text-muted-foreground/70"> ({contract.contact?.email || contract.prospect?.email || contract.client_email || contract.recipient_email})</span>
                )}
                {contract.prospect && !contract.contact && (
                  <Badge variant="outline" className="ml-1 text-[10px] py-0 h-4 border-emerald-200 text-emerald-600">Prospect</Badge>
                )}
              </div>
              {(contract.totalAmount || contract.total) && (
                <span className="text-sm font-medium text-foreground">
                  ${(contract.totalAmount || contract.total).toLocaleString()}
                </span>
              )}
            </div>
            {showSignedDate && contract.signedAt && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Signed on {formatDate(contract.signedAt)}
                {contract.fullyExecutedAt && (
                  <span className="text-muted-foreground"> • Fully executed {formatDate(contract.fullyExecutedAt)}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {showAnalytics && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <BarChart2 className="w-3.5 h-3.5 mr-1" />
                  Analytics
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            )}
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            {!['signed', 'accepted'].includes(contract.status) && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {['signed', 'accepted'].includes(contract.status) && onDuplicate && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDuplicate}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Duplicate as new draft"
              >
                <Copy className="w-3 h-3 mr-1" />
                Duplicate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Expandable Analytics Panel */}
        <CollapsibleContent>
          <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
              </div>
            ) : analytics ? (
              <div className="space-y-4">
                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <MousePointer className="w-3.5 h-3.5" />
                      Total Views
                    </div>
                    <p className="text-xl font-semibold text-foreground">
                      {analytics.summary?.totalViews || 0}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      Unique Views
                    </div>
                    <p className="text-xl font-semibold text-foreground">
                      {analytics.summary?.uniqueViews || 0}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Timer className="w-3.5 h-3.5" />
                      Avg. Time
                    </div>
                    <p className="text-xl font-semibold text-foreground">
                      {formatTime(analytics.summary?.avgTimeOnPage || 0)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Engagement
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-semibold text-foreground">
                        {analytics.summary?.engagementScore || 0}%
                      </p>
                      <Progress value={analytics.summary?.engagementScore || 0} className="flex-1 h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {analytics.recentViews && analytics.recentViews.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Recent Activity
                    </h5>
                    <div className="space-y-1.5">
                      {analytics.recentViews.slice(0, 3).map((view, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                          <span className="text-muted-foreground">
                            {formatDateTime(view.viewedAt)}
                          </span>
                          <span className="text-muted-foreground/70">
                            {formatTime(view.timeOnPage)} spent
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No analytics data available yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Main Contracts View Component - supports ref for updateContract (used when saving from sidebar)
export const ContractsView = forwardRef(function ContractsView({ 
  brandColors, 
  onNavigate,
  hasSignal = false,  // Whether this project has Signal AI enabled
  projectId,
  isCreatingContract = false,  // Whether in new contract creation mode
  onNewContract,  // Callback to start creating
  onCancelContract,  // Callback to cancel creating
  aiEditingContract,  // Lifted from CommerceDashboard when using ModuleLayout sidebar
  setAiEditingContract,
  hasUnsavedChanges = false,
  onSaveContract,
  isSavingContract = false,
  onHasUnsavedChanges,
  showAnalytics = false,
  onToggleAnalytics,
}, ref) {
  const { user, currentOrg, currentProject, isSuperAdmin } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  
  // Detect if this is an agency org
  // Agencies use Proposals (org-level) + system emails
  // Other orgs use Contracts (project-level) + Outreach emails
  // Note: When agency admin is viewing, currentOrg may be null - treat as agency
  const isAgencyOrg = !currentOrg || // No org selected = agency admin view
                      currentOrg?.org_type === 'agency'
  
  console.log('[Contracts] Org detection:', { 
    currentOrg: currentOrg?.slug, 
    isAgencyOrg,
    isAdmin,
    isSuperAdmin 
  })
  
  const hasFetchedRef = useRef(false)
  const [contracts, setContracts] = useState([])
  const [customers, setCustomers] = useState([])  // For recipient selection
  const [isLoading, setIsLoading] = useState(true)
  const [viewingContract, setViewingContract] = useState(null)
  const [loadingContractView, setLoadingContractView] = useState(false)
  const [editingContract, setEditingContract] = useState(null)  // For EditProposalDialog
  const [internalAiEditing, setInternalAiEditing] = useState(null)
  const aiContract = aiEditingContract ?? internalAiEditing
  const setAiContract = setAiEditingContract ?? setInternalAiEditing
  const [deleteContractDialog, setDeleteContractDialog] = useState({ open: false, id: null, title: '', isSigned: false })
  const [showAIContractDialog, setShowAIContractDialog] = useState(false)
  
  // Template-based contract creation flow
  const [templates, setTemplates] = useState([])
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false)

  const updateContractInList = useCallback((updatedContract) => {
    setContracts(prev => prev.map(c =>
      c.id === updatedContract.id
        ? { ...updatedContract, _isProposal: c._isProposal }
        : c
    ))
  }, [])

  useImperativeHandle(ref, () => ({ updateContractInList }), [updateContractInList])

  // Fetch data only once on mount - but re-fetch if org detection changes
  useEffect(() => {
    console.log('[Contracts] useEffect triggered - projectId:', projectId, 'isAgency:', isAgencyOrg, 'hasFetched:', hasFetchedRef.current)
    
    // Always fetch on first mount, skip if already fetched for same context
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    
    fetchContracts()
    fetchCustomers()
  }, [projectId, isAgencyOrg])

  const fetchContracts = async () => {
    console.log('[Contracts] fetchContracts called - isAgencyOrg:', isAgencyOrg)
    setIsLoading(true)
    try {
      if (isAgencyOrg) {
        // Sonor: Use proposals API (org-level proposals)
        // Use proposalsApi.list() which is used consistently in Proposals.jsx
        const response = await proposalsApi.list({ limit: 100 })
        console.log('[Contracts] Proposals API raw response:', response)
        
        // Response structure: { data: { proposals: [...] } } or { data: [...] }
        const rawData = response.data
        console.log('[Contracts] Raw data type:', typeof rawData, Array.isArray(rawData))
        
        // Handle both response formats
        let proposals = []
        if (Array.isArray(rawData)) {
          proposals = rawData
        } else if (rawData?.proposals && Array.isArray(rawData.proposals)) {
          proposals = rawData.proposals
        } else if (rawData && typeof rawData === 'object') {
          // Maybe it's a single proposal or other structure
          console.log('[Contracts] Unexpected data structure:', Object.keys(rawData))
        }
        
        console.log('[Contracts] Parsed proposals count:', proposals.length, proposals.map(p => ({ id: p.id, title: p.title, status: p.status })))
        
        setContracts(proposals.map(p => ({
          ...p,
          _isProposal: true  // Flag to identify as proposal
        })))
      } else {
        // Other orgs: Use contracts API (project-level contracts)
        const response = await commerceApi.getContracts(projectId)
        setContracts(response.data?.contracts || response.data || [])
      }
    } catch (err) {
      console.error('[Contracts] Failed to fetch:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      if (isAgencyOrg) {
        // Sonor: Fetch both clients (organizations) and prospects (CRM contacts)
        const [clientsRes, prospectsRes] = await Promise.all([
          adminApi.listClients().catch(() => ({ data: { clients: [] } })),
          crmApi.listProspects({ limit: 200 }).catch(() => ({ data: { prospects: [] } }))
        ])
        
        const clients = clientsRes.data?.clients || clientsRes.data || []
        const prospects = prospectsRes.data?.prospects || prospectsRes.data || []
        
        // Combine and normalize to a common format for the dropdown
        // Clients have org info, prospects have contact info
        const combinedRecipients = [
          ...clients.map(c => ({
            id: c.id,
            name: c.name || c.company_name,
            email: c.email || c.contact_email,
            type: 'client',
            company: c.company_name || c.name
          })),
          ...prospects.map(p => ({
            id: p.id,
            name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
            email: p.email,
            type: 'prospect',
            company: p.company || p.company_name
          }))
        ]
        
        console.log('[Contracts] Combined recipients:', combinedRecipients.length, '(clients:', clients.length, 'prospects:', prospects.length, ')')
        setCustomers(combinedRecipients)
      } else {
        // Other orgs: Use commerce customers API
        const response = await commerceApi.getCustomers(projectId)
        setCustomers(response.data?.customers || response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }

  // Fetch available contract templates
  const fetchTemplates = async () => {
    if (isAgencyOrg) return
    try {
      const response = await commerceApi.getContractTemplates(projectId)
      setTemplates(response.data?.templates || response.data || [])
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  useEffect(() => {
    if (projectId && !isAgencyOrg) fetchTemplates()
  }, [projectId, isAgencyOrg])

  const handleCreateFromTemplate = async (intakeData) => {
    setIsCreatingFromTemplate(true)
    try {
      const response = await commerceApi.createContractFromTemplate(projectId, {
        template_id: selectedTemplate.id,
        intake_data: intakeData,
      })
      const newContract = response.data?.contract || response.data
      setContracts([newContract, ...contracts])
      toast.success(`Contract "${newContract.title}" created!`)
      setSelectedTemplate(null)
      setShowTemplatePicker(false)
    } catch (err) {
      console.error('Failed to create contract from template:', err)
      toast.error('Failed to create contract')
    } finally {
      setIsCreatingFromTemplate(false)
    }
  }

  // View contract - shows read-only view with analytics overlay
  const handleViewContract = async (contract) => {
    setLoadingContractView(true)
    try {
      if (contract._isProposal || isAgencyOrg) {
        // Sonor: Use proposals API
        const response = await proposalsApi.get(contract.id)
        setViewingContract(response.data?.proposal || response.data)
      } else {
        // Other orgs: Use contracts API
        const response = await commerceApi.getContract(projectId, contract.id)
        setViewingContract(response.data?.contract || response.data)
      }
    } catch (err) {
      console.error('Failed to fetch contract details:', err)
      toast.error(isAgencyOrg ? 'Failed to load proposal' : 'Failed to load contract')
    } finally {
      setLoadingContractView(false)
    }
  }

  // Edit contract - opens AI editor for contracts/proposals with Signal, falls back to form dialog
  const handleEditContract = async (contract) => {
    // Fetch full contract details first
    setLoadingContractView(true)
    try {
      let fullContract
      if (contract._isProposal || isAgencyOrg) {
        // Sonor: Use proposals API
        const response = await proposalsApi.get(contract.id)
        fullContract = { ...response.data?.proposal || response.data, _isProposal: true }
      } else {
        // Other orgs: Use contracts API
        const response = await commerceApi.getContract(projectId, contract.id)
        fullContract = response.data?.contract || response.data
      }
      
      // Check if project has Signal AI enabled - use AI editor if available
      if (hasSignal || isAgencyOrg) {
        setAiContract(fullContract)
      } else {
        // Fall back to simple form dialog
        setEditingContract(fullContract)
      }
    } catch (err) {
      console.error('Failed to fetch contract details:', err)
      toast.error('Failed to load contract for editing')
    } finally {
      setLoadingContractView(false)
    }
  }

  const handleDeleteContract = async () => {
    if (!deleteContractDialog.id) return
    
    try {
      if (isAgencyOrg) {
        // Sonor: Delete proposal
        await portalApi.delete(`/proposals/${deleteContractDialog.id}`)
      } else {
        // Other orgs: Delete contract
        await commerceApi.deleteContract(projectId, deleteContractDialog.id)
      }
      setContracts(contracts.filter(c => c.id !== deleteContractDialog.id))
      toast.success(isAgencyOrg ? 'Proposal deleted' : 'Contract deleted')
    } catch (err) {
      toast.error(isAgencyOrg ? 'Failed to delete proposal' : 'Failed to delete contract')
    } finally {
      setDeleteContractDialog({ open: false, id: null, title: '', isSigned: false })
    }
  }

  // Duplicate a contract
  const handleDuplicateContract = async (contract) => {
    try {
      if (contract._isProposal || isAgencyOrg) {
        // Sonor: Duplicate proposal using proposals API
        const response = await proposalsApi.duplicate(contract.id)
        const newProposal = response.data?.proposal || response.data
        setContracts([{ ...newProposal, _isProposal: true }, ...contracts])
        toast.success(`Created draft copy: "${newProposal.title}"`)
      } else {
        // Other orgs: Duplicate contract
        const original = await commerceApi.getContract(projectId, contract.id)
        const contractData = original.data?.contract || original.data
        
        const newContractData = {
          ...contractData,
          id: undefined,
          title: `Copy of ${contractData.title}`,
          status: 'draft',
          sent_at: null,
          signed_at: null,
          access_token: null
        }
        
        const response = await commerceApi.createContract(projectId, newContractData)
        const newContract = response.data?.contract || response.data
        setContracts([newContract, ...contracts])
        toast.success(`Created draft copy: "${newContract.title}"`)
      }
    } catch (err) {
      console.error('Failed to duplicate:', err)
      toast.error(isAgencyOrg ? 'Failed to duplicate proposal' : 'Failed to duplicate contract')
    }
  }

  // Loading state when fetching full contract
  if (loadingContractView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading contract...</p>
        </div>
      </div>
    )
  }

  // If editing with AI editor - render ProposalEditorMain (AI panel goes in ModuleLayout rightSidebar)
  if (aiContract) {
    const hasBeenViewed = aiContract?.status !== 'draft' && (
      aiContract?.viewed_at || aiContract?.viewedAt
    )
    return (
      <ProposalEditorMain
        contract={aiContract}
        hasUnsavedChanges={hasUnsavedChanges}
        hasBeenViewed={!!hasBeenViewed}
        showAnalytics={showAnalytics}
        onToggleAnalytics={onToggleAnalytics}
        onBack={() => setAiContract(null)}
        onSave={onSaveContract}
        isSaving={isSavingContract}
      />
    )
  }

  // If viewing a contract, use JSON renderer for sections_json contracts, else analytics panel
  if (viewingContract) {
    if (viewingContract.sections_json) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setViewingContract(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setViewingContract(null)
              handleEditContract(viewingContract)
            }}>
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
          <ContractView contract={viewingContract} />
        </div>
      )
    }
    return (
      <ProposalViewWithAnalytics
        proposal={viewingContract}
        onBack={() => setViewingContract(null)}
        onEdit={() => {
          setViewingContract(null)
          handleEditContract(viewingContract)
        }}
      />
    )
  }

  // Template intake form flow
  if (selectedTemplate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{selectedTemplate.name}</CardTitle>
            {selectedTemplate.description && (
              <CardDescription>{selectedTemplate.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <ContractIntakeForm
              template={selectedTemplate}
              onSubmit={handleCreateFromTemplate}
              isSubmitting={isCreatingFromTemplate}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Contract lists by status
  const activeContracts = contracts.filter(c => !['signed', 'accepted', 'declined'].includes(c.status))
  const signedContracts = contracts.filter(c => ['signed', 'accepted'].includes(c.status))
  const declinedContracts = contracts.filter(c => c.status === 'declined')

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {isAgencyOrg ? 'Proposals' : 'Contracts'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {isAgencyOrg 
              ? 'Create and manage client proposals' 
              : 'Create and manage contracts for your customers'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAgencyOrg ? (
            // Sonor: Use ProposalAIDialog for proposals
            <>
              <Button onClick={() => setShowAIContractDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Proposal
              </Button>
              <ProposalAIDialog 
                open={showAIContractDialog}
                onOpenChange={setShowAIContractDialog}
                onSuccess={(proposal) => {
                  setContracts([{ ...proposal, _isProposal: true }, ...contracts])
                  toast.success(`Proposal "${proposal.title}" created!`)
                }}
              />
            </>
          ) : (
            // Non-Sonor orgs: template picker + AI/manual fallback
            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <Button variant="outline" onClick={() => setShowTemplatePicker(!showTemplatePicker)}>
                  <LayoutTemplate className="w-4 h-4 mr-2" />
                  From Template
                </Button>
              )}
              {hasSignal ? (
                <>
                  <Button onClick={() => setShowAIContractDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Contract
                  </Button>
                  <ContractAIDialog 
                    projectId={projectId}
                    open={showAIContractDialog}
                    onOpenChange={setShowAIContractDialog}
                    onSuccess={(contract) => {
                      setContracts([contract, ...contracts])
                      toast.success(`Contract "${contract.title}" created and sent!`)
                    }}
                  />
                </>
              ) : (
                <Button onClick={onNewContract}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Contract
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Template picker grid */}
      {showTemplatePicker && templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(template => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-[var(--brand-primary)] hover:shadow-md transition-all"
              onClick={() => {
                setSelectedTemplate(template)
                setShowTemplatePicker(false)
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.business_type && (
                  <Badge variant="outline" className="w-fit text-xs">
                    {template.business_type.replace(/_/g, ' ')}
                  </Badge>
                )}
              </CardHeader>
              {template.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Show inline contract editor when creating */}
      {isCreatingContract && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Create New Contract</CardTitle>
                <CardDescription>Fill in the details for your new contract</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancelContract}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ContractEditorWithAI
              projectId={projectId}
              isProposal={false}
              onBack={onCancelContract}
              onSave={(newContract) => {
                setContracts([newContract, ...contracts])
                toast.success(`Contract "${newContract.title}" created!`)
                onCancelContract()
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs for contract status - Sync-style pill tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit mb-4">
          <TabsTrigger 
            value="active" 
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-background/50"
          >
            <Clock className="w-3.5 h-3.5" />
            Active
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted/50">
              {activeContracts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="signed" 
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-background/50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Signed
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              {signedContracts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="declined" 
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-background/50"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Declined
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted/50">
              {declinedContracts.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Active Contracts */}
        <TabsContent value="active" className="space-y-2 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : activeContracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={isAgencyOrg ? "No active proposals" : "No active contracts"}
              description={isAgencyOrg 
                ? "Create your first proposal for a client."
                : hasSignal 
                  ? "Create your first contract with AI assistance." 
                  : "Create your first contract to send to customers."
              }
              actionLabel={isAgencyOrg 
                ? "New Proposal" 
                : hasSignal ? "Create with AI" : "New Contract"
              }
              onAction={() => isAgencyOrg || hasSignal 
                ? setShowAIContractDialog(true)
                : onNavigate?.('contract-editor', { new: true })
              }
            />
          ) : (
            activeContracts.map((contract) => (
              <ContractRow 
                key={contract.id} 
                contract={contract}
                onView={() => handleViewContract(contract)}
                onEdit={() => handleEditContract(contract)}
                onDelete={() => setDeleteContractDialog({
                  open: true,
                  id: contract.id,
                  title: contract.title
                })}
              />
            ))
          )}
        </TabsContent>

        {/* Signed Contracts */}
        <TabsContent value="signed" className="space-y-2 mt-0">
          {signedContracts.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title={isAgencyOrg ? "No signed proposals" : "No signed contracts"}
              description={isAgencyOrg 
                ? "Accepted proposals will appear here." 
                : "Signed contracts will appear here."}
            />
          ) : (
            signedContracts.map((contract) => (
              <ContractRow 
                key={contract.id} 
                contract={contract}
                onView={() => handleViewContract(contract)}
                onEdit={() => handleEditContract(contract)}
                onDuplicate={() => handleDuplicateContract(contract)}
                onDelete={() => setDeleteContractDialog({
                  open: true,
                  id: contract.id,
                  title: contract.title,
                  isSigned: true
                })}
                showSignedDate
              />
            ))
          )}
        </TabsContent>

        {/* Declined Contracts */}
        <TabsContent value="declined" className="space-y-2 mt-0">
          {declinedContracts.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title={isAgencyOrg ? "No declined proposals" : "No declined contracts"}
              description={isAgencyOrg 
                ? "Declined proposals will appear here." 
                : "Declined contracts will appear here."}
            />
          ) : (
            declinedContracts.map((contract) => (
              <ContractRow 
                key={contract.id} 
                contract={contract}
                onView={() => handleViewContract(contract)}
                onEdit={() => handleEditContract(contract)}
                onDelete={() => setDeleteContractDialog({
                  open: true,
                  id: contract.id,
                  title: contract.title
                })}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Contract Dialog - Reuse proposal dialog for now */}
      <EditProposalDialog
        proposal={editingContract}
        clients={customers}
        open={!!editingContract}
        onOpenChange={(open) => !open && setEditingContract(null)}
        onSuccess={(updatedContract) => {
          setContracts(contracts.map(c => c.id === updatedContract.id ? { ...updatedContract, _isProposal: c._isProposal } : c))
          setEditingContract(null)
          toast.success(isAgencyOrg ? 'Proposal updated' : 'Contract updated')
        }}
        onNavigate={onNavigate}
      />

      {/* Delete Contract Confirmation */}
      <ConfirmDialog
        open={deleteContractDialog.open}
        onOpenChange={(open) => !open && setDeleteContractDialog({ open: false, id: null, title: '', isSigned: false })}
        title={deleteContractDialog.isSigned 
          ? (isAgencyOrg ? "⚠️ Delete SIGNED Proposal" : "⚠️ Delete SIGNED Contract")
          : (isAgencyOrg ? "Delete Proposal" : "Delete Contract")}
        description={
          deleteContractDialog.isSigned 
            ? `WARNING: This is a legally signed ${isAgencyOrg ? 'proposal' : 'contract'}! Deleting "${deleteContractDialog.title}" will permanently remove all signature data, records, and cannot be recovered. Only proceed if this was a test.`
            : `Are you sure you want to delete "${deleteContractDialog.title}"? This action cannot be undone.`
        }
        confirmLabel={deleteContractDialog.isSigned 
          ? (isAgencyOrg ? "Yes, Delete Signed Proposal" : "Yes, Delete Signed Contract")
          : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteContract}
      />
    </div>
  )
})

export default ContractsView
