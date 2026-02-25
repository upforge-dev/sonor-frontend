import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProposalTemplate from './ProposalTemplate'
import ProposalViewWithAnalytics from './ProposalViewWithAnalytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { EmptyState } from '../EmptyState'
import { ConfirmDialog } from '../ConfirmDialog'
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
  User,
  UserPlus,
  FileSignature,
  Building2,
  Plus
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { adminApi, proposalsApi, crmApi } from '@/lib/portal-api'
import ProposalAIDialog from './ProposalAIDialog'
import EditProposalDialog from './EditProposalDialog'
import NewContractModal from './NewContractModal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'

// Proposal Row component for consistent display (Admin view) with expandable analytics
function ProposalRow({ proposal, onView, onEdit, onDelete, onDuplicate, showSignedDate = false }) {
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
      const response = await proposalsApi.getAnalytics(proposal.id)
      setAnalytics(response.data.analytics || response.data)
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
  const showAnalytics = proposal.status !== 'draft'

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div className="border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--surface-secondary)] transition-colors overflow-hidden">
        {/* Main Row */}
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)] truncate">{proposal.title}</h4>
              {getStatusBadge(proposal.status)}
              {showAnalytics && analytics?.summary?.engagementScore > 0 && (
                <Badge variant="outline" className="border-amber-200 text-amber-600 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {analytics.summary.engagementScore}%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] truncate">
                {proposal.contact ? (
                  <User className="w-3.5 h-3.5 text-blue-500" />
                ) : proposal.prospect ? (
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <User className="w-3.5 h-3.5 text-gray-400" />
                )}
                
                <span>{proposal.contact?.name || proposal.prospect?.name || proposal.client_name || 'Unknown client'}</span>
                
                {(proposal.contact?.email || proposal.prospect?.email || proposal.client_email) && (
                  <span className="text-[var(--text-tertiary)] hidden sm:inline"> ({proposal.contact?.email || proposal.prospect?.email || proposal.client_email})</span>
                )}
                
                {proposal.prospect && !proposal.contact && (
                  <Badge variant="outline" className="ml-1 text-[10px] py-0 h-4 border-emerald-200 text-emerald-600">Prospect</Badge>
                )}
              </div>
              {proposal.totalAmount && (
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  ${proposal.totalAmount.toLocaleString()}
                </span>
              )}
            </div>
            {showSignedDate && proposal.signedAt && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Signed on {formatDate(proposal.signedAt)}
                {proposal.fullyExecutedAt && (
                  <span className="text-[var(--text-tertiary)]"> • Fully executed {formatDate(proposal.fullyExecutedAt)}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {showAnalytics && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[var(--text-secondary)]">
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
            {!['signed', 'accepted'].includes(proposal.status) && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {['signed', 'accepted'].includes(proposal.status) && onDuplicate && (
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
          <div className="border-t border-[var(--glass-border)] bg-[var(--surface-secondary)]/50 px-4 py-3">
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
                <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading analytics...</span>
              </div>
            ) : analytics ? (
              <div className="space-y-4">
                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <MousePointer className="w-3.5 h-3.5" />
                      Total Views
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary?.totalViews || 0}
                    </p>
                  </div>
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <Activity className="w-3.5 h-3.5" />
                      Unique Views
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary?.uniqueViews || 0}
                    </p>
                  </div>
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <Timer className="w-3.5 h-3.5" />
                      Avg. Time
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {formatTime(analytics.summary?.avgTimeOnPage || 0)}
                    </p>
                  </div>
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Engagement
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-semibold text-[var(--text-primary)]">
                        {analytics.summary?.engagementScore || 0}%
                      </p>
                      <Progress value={analytics.summary?.engagementScore || 0} className="flex-1 h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {analytics.recentViews && analytics.recentViews.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                      Recent Activity
                    </h5>
                    <div className="space-y-1.5">
                      {analytics.recentViews.slice(0, 3).map((view, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-[var(--glass-bg)] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                          <span className="text-[var(--text-secondary)]">
                            {formatDateTime(view.viewedAt)}
                          </span>
                          <span className="text-[var(--text-tertiary)]">
                            {formatTime(view.timeOnPage)} spent
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                No analytics data available yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Client Proposal Row - simpler view for clients
function ClientProposalRow({ 
  proposal, 
  onView, 
  onEdit,
  showSignedDate = false,
  fromUptrade = false,
  isMyContract = false
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>
      case 'sent':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">
          {isMyContract ? 'Sent' : 'Ready to Review'}
        </Badge>
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

  return (
    <div className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--surface-secondary)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-[var(--text-primary)] truncate">{proposal.title}</h4>
          {getStatusBadge(proposal.status)}
          {/* Source indicator */}
          {fromUptrade && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-200 text-blue-600">
              <Building2 className="w-2.5 h-2.5 mr-1" />
              From Upforge
            </Badge>
          )}
          {isMyContract && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 border-purple-200 text-purple-600">
              <FileSignature className="w-2.5 h-2.5 mr-1" />
              Your Contract
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {/* Show recipient for contracts */}
          {isMyContract && proposal.contact && (
            <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
              <User className="w-3 h-3" />
              To: {proposal.contact.name}
            </span>
          )}
          {proposal.totalAmount && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              ${proposal.totalAmount.toLocaleString()}
            </span>
          )}
          {proposal.createdAt && (
            <span className="text-sm text-[var(--text-secondary)]">
              {isMyContract ? 'Created' : 'Sent'} {formatDate(proposal.createdAt)}
            </span>
          )}
        </div>
        {showSignedDate && proposal.signedAt && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {isMyContract ? 'Signed by recipient' : 'You signed'} on {formatDate(proposal.signedAt)}
            {proposal.fullyExecutedAt && (
              <span className="text-[var(--text-tertiary)]"> • Contract executed {formatDate(proposal.fullyExecutedAt)}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        {/* Edit button for draft contracts */}
        {onEdit && proposal.status === 'draft' && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
        )}
        <Button 
          variant={['sent', 'viewed'].includes(proposal.status) && !isMyContract ? 'default' : 'outline'} 
          size="sm" 
          onClick={onView}
          className={['sent', 'viewed'].includes(proposal.status) && !isMyContract ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]' : ''}
        >
          <Eye className="w-3 h-3 mr-1" />
          {['sent', 'viewed'].includes(proposal.status) && !isMyContract ? 'Review & Sign' : 'View'}
        </Button>
      </div>
    </div>
  )
}

const Proposals = ({ onNavigate }) => {
  const { user, currentOrg, currentProject, isSuperAdmin } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  // Upforge org should show admin view, client orgs show tenant view
  const isUptradeMediaOrg = currentOrg?.slug === 'uptrade-media' || currentOrg?.slug === 'upforge' || currentOrg?.domain === 'uptrademedia.com' || currentOrg?.domain === 'upforge.io' || currentOrg?.org_type === 'agency'
  const isInTenantContext = (!!currentProject && !isUptradeMediaOrg) || (!!currentOrg && !isUptradeMediaOrg)
  const canManageProposals = (isAdmin || isSuperAdmin) && !isInTenantContext
  // Client orgs can create contracts
  const canCreateContracts = isInTenantContext && !isUptradeMediaOrg
  
  const hasFetchedRef = useRef(false)
  const [proposals, setProposals] = useState([])
  const [clients, setClients] = useState([])
  const [contacts, setContacts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewingProposal, setViewingProposal] = useState(null)
  const [loadingProposalView, setLoadingProposalView] = useState(false)
  const [editingProposal, setEditingProposal] = useState(null)
  const [deleteProposalDialog, setDeleteProposalDialog] = useState({ open: false, id: null, title: '', isSigned: false })
  const [showAIProposalDialog, setShowAIProposalDialog] = useState(false)
  const [showNewContractModal, setShowNewContractModal] = useState(false)

  // Fetch data only once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Proposals] Fetching initial data')
    hasFetchedRef.current = true
    
    fetchProposals()
    if (isAdmin) {
      fetchClients()
    }
    // Client orgs need contacts for contract creation
    if (canCreateContracts) {
      fetchContacts()
    }
  }, [])

  const fetchProposals = async () => {
    setIsLoading(true)
    try {
      // Increase limit to ensure we see all proposals (default is 50)
      const response = await proposalsApi.list({ limit: 100 })
      setProposals(response.data.proposals || response.data || [])
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await adminApi.listClients()
      setClients(response.data.clients || response.data || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  // Fetch contacts for contract creation (client orgs only)
  const fetchContacts = async () => {
    try {
      const response = await crmApi.listContacts({ limit: 500 })
      setContacts(response.data.contacts || response.data || [])
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    }
  }

  // View proposal - shows read-only view with analytics overlay for admins
  const handleViewProposal = async (proposal) => {
    setLoadingProposalView(true)
    try {
      const response = await proposalsApi.get(proposal.id)
      setViewingProposal(response.data.proposal || response.data)
    } catch (err) {
      console.error('Failed to fetch proposal details:', err)
      toast.error('Failed to load proposal')
    } finally {
      setLoadingProposalView(false)
    }
  }

  // Edit proposal - navigates to full editor with AI editing capabilities
  const handleEditProposal = (proposal) => {
    if (onNavigate) {
      onNavigate('proposal-editor', { proposalId: proposal.id })
    }
  }

  const handleDeleteProposal = async () => {
    if (!deleteProposalDialog.id) return
    
    try {
      // Add confirm=true for signed proposals
      await proposalsApi.delete(deleteProposalDialog.id, deleteProposalDialog.isSigned)
      setProposals(proposals.filter(p => p.id !== deleteProposalDialog.id))
      toast.success('Proposal deleted')
    } catch (err) {
      toast.error('Failed to delete proposal')
    } finally {
      setDeleteProposalDialog({ open: false, id: null, title: '', isSigned: false })
    }
  }

  // Duplicate a proposal (creates new draft without signatures)
  const handleDuplicateProposal = async (proposal) => {
    try {
      const response = await proposalsApi.duplicate(proposal.id)
      
      const newProposal = response.data.proposal || response.data
      setProposals([newProposal, ...proposals])
      toast.success(`Created draft copy: "${newProposal.title}"`)
    } catch (err) {
      console.error('Failed to duplicate proposal:', err)
      toast.error('Failed to duplicate proposal')
    }
  }

  // Loading state when fetching full proposal
  if (loadingProposalView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading proposal...</p>
        </div>
      </div>
    )
  }

  // If viewing a proposal, show appropriate view based on role
  if (viewingProposal) {
    // Project tenants see proposals as clients (view/sign only, no editing)
    // Admins (not in tenant context) see with analytics panel
    if (canManageProposals) {
      return (
        <ProposalViewWithAnalytics
          proposal={viewingProposal}
          onBack={() => setViewingProposal(null)}
          onEdit={() => {
            setViewingProposal(null)
            handleEditProposal(viewingProposal)
          }}
        />
      )
    }
    
    // Client or project tenant sees proposal template (can sign)
    return (
      <ProposalTemplate
        proposal={viewingProposal}
        onBack={() => setViewingProposal(null)}
        onSigned={() => {
          fetchProposals()
          setViewingProposal(null)
        }}
      />
    )
  }

  // Client view OR org/project context view (they view proposals sent TO them + contracts they create)
  if (!isAdmin || isInTenantContext) {
    // Separate proposals from Upforge vs contracts created by this org
    const receivedProposals = proposals.filter(p => p.doc_type === 'proposal' || !p.doc_type)
    const myContracts = proposals.filter(p => p.doc_type === 'contract')
    
    const pendingReceived = receivedProposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status))
    const signedReceived = receivedProposals.filter(p => ['signed', 'accepted'].includes(p.status))
    const pendingContracts = myContracts.filter(p => !['signed', 'accepted', 'declined'].includes(p.status))
    const signedContracts = myContracts.filter(p => ['signed', 'accepted'].includes(p.status))

    return (
      <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {canCreateContracts ? 'Proposals & Contracts' : 'Proposals'}
            </h1>
            <p className="text-[var(--text-secondary)]">
              {canCreateContracts 
                ? 'Review proposals from Upforge and manage your contracts'
                : 'Review and sign proposals from Upforge'
              }
            </p>
          </div>
          {canCreateContracts && (
            <Button
              onClick={() => setShowNewContractModal(true)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Contract
            </Button>
          )}
        </div>

        <Tabs defaultValue="received" className="w-full">
          <TabsList>
            <TabsTrigger value="received" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              From Upforge
              {pendingReceived.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {pendingReceived.length}
                </Badge>
              )}
            </TabsTrigger>
            {canCreateContracts && (
              <TabsTrigger value="contracts" className="flex items-center gap-1.5">
                <FileSignature className="w-3.5 h-3.5" />
                My Contracts
                {myContracts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {myContracts.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="signed" className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Signed
              {(signedReceived.length + signedContracts.length) > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                  {signedReceived.length + signedContracts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Received proposals from Upforge */}
          <TabsContent value="received" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : pendingReceived.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No pending proposals"
                description="You don't have any proposals waiting for review from Upforge."
              />
            ) : (
              <div className="space-y-3">
                {pendingReceived.map((proposal) => (
                  <ClientProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    fromUptrade
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My contracts (client orgs only) */}
          {canCreateContracts && (
            <TabsContent value="contracts" className="space-y-4 mt-4">
              {pendingContracts.length === 0 ? (
                <EmptyState
                  icon={FileSignature}
                  title="No contracts yet"
                  description="Create contracts to send to your customers for signature."
                  action={
                    <Button
                      onClick={() => setShowNewContractModal(true)}
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Contract
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {pendingContracts.map((contract) => (
                    <ClientProposalRow
                      key={contract.id}
                      proposal={contract}
                      onView={() => handleViewProposal(contract)}
                      onEdit={canCreateContracts && contract.status === 'draft' ? () => handleEditProposal(contract) : undefined}
                      isMyContract
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* All signed documents */}
          <TabsContent value="signed" className="space-y-4 mt-4">
            {(signedReceived.length + signedContracts.length) === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No signed documents"
                description="Signed proposals and contracts will appear here."
              />
            ) : (
              <div className="space-y-3">
                {signedReceived.map((proposal) => (
                  <ClientProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    showSignedDate
                    fromUptrade
                  />
                ))}
                {signedContracts.map((contract) => (
                  <ClientProposalRow
                    key={contract.id}
                    proposal={contract}
                    onView={() => handleViewProposal(contract)}
                    showSignedDate
                    isMyContract
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* New Contract Modal */}
        <NewContractModal
          open={showNewContractModal}
          onOpenChange={setShowNewContractModal}
          projectId={currentProject?.id}
          contacts={contacts}
          onSuccess={(contract) => {
            setProposals([contract, ...proposals])
          }}
        />
      </div>
    )
  }

  // Admin view
  const activeProposals = proposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status))
  const signedProposals = proposals.filter(p => ['signed', 'accepted'].includes(p.status))
  const declinedProposals = proposals.filter(p => p.status === 'declined')

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proposals</h1>
          <p className="text-[var(--text-secondary)]">Create and manage client proposals</p>
        </div>
        <ProposalAIDialog 
          clients={clients}
          onNavigate={onNavigate}
          open={showAIProposalDialog}
          onOpenChange={setShowAIProposalDialog}
          onSuccess={(proposal) => {
            setProposals([proposal, ...proposals])
            toast.success(`Proposal "${proposal.title}" generated!`)
          }}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Active
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeProposals.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="signed" className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Signed
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                  {signedProposals.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="declined" className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Declined
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {declinedProposals.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Active Proposals */}
            <TabsContent value="active" className="space-y-2 mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : activeProposals.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title="No active proposals"
                  description="Create your first proposal to send to clients."
                  actionLabel="Create Proposal"
                  onAction={() => setShowAIProposalDialog(true)}
                />
              ) : (
                activeProposals.map((proposal) => (
                  <ProposalRow 
                    key={proposal.id} 
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    onEdit={() => handleEditProposal(proposal)}
                    onDelete={() => setDeleteProposalDialog({
                      open: true,
                      id: proposal.id,
                      title: proposal.title
                    })}
                  />
                ))
              )}
            </TabsContent>

            {/* Signed Proposals */}
            <TabsContent value="signed" className="space-y-2 mt-0">
              {signedProposals.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="No signed proposals"
                  description="Signed proposals will appear here."
                />
              ) : (
                signedProposals.map((proposal) => (
                  <ProposalRow 
                    key={proposal.id} 
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    onEdit={() => handleEditProposal(proposal)}
                    onDuplicate={() => handleDuplicateProposal(proposal)}
                    onDelete={() => setDeleteProposalDialog({
                      open: true,
                      id: proposal.id,
                      title: proposal.title,
                      isSigned: true
                    })}
                    showSignedDate
                  />
                ))
              )}
            </TabsContent>

            {/* Declined Proposals */}
            <TabsContent value="declined" className="space-y-2 mt-0">
              {declinedProposals.length === 0 ? (
                <EmptyState
                  icon={AlertCircle}
                  title="No declined proposals"
                  description="Declined proposals will appear here."
                />
              ) : (
                declinedProposals.map((proposal) => (
                  <ProposalRow 
                    key={proposal.id} 
                    proposal={proposal}
                    onView={() => handleViewProposal(proposal)}
                    onEdit={() => handleEditProposal(proposal)}
                    onDelete={() => setDeleteProposalDialog({
                      open: true,
                      id: proposal.id,
                      title: proposal.title
                    })}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Proposal Dialog */}
      <EditProposalDialog
        proposal={editingProposal}
        clients={clients}
        open={!!editingProposal}
        onOpenChange={(open) => !open && setEditingProposal(null)}
        onSuccess={(updatedProposal) => {
          setProposals(proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p))
          setEditingProposal(null)
          toast.success('Proposal updated')
        }}
        onNavigate={onNavigate}
      />

      {/* Delete Proposal Confirmation */}
      <ConfirmDialog
        open={deleteProposalDialog.open}
        onOpenChange={(open) => !open && setDeleteProposalDialog({ open: false, id: null, title: '', isSigned: false })}
        title={deleteProposalDialog.isSigned ? "⚠️ Delete SIGNED Proposal" : "Delete Proposal"}
        description={
          deleteProposalDialog.isSigned 
            ? `WARNING: This is a legally signed contract! Deleting "${deleteProposalDialog.title}" will permanently remove all signature data, contract records, and cannot be recovered. Only proceed if this was a test proposal.`
            : `Are you sure you want to delete "${deleteProposalDialog.title}"? This action cannot be undone.`
        }
        confirmLabel={deleteProposalDialog.isSigned ? "Yes, Delete Signed Contract" : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteProposal}
      />
    </div>
  )
}

export default Proposals
