// src/components/ProposalEditor.jsx
/**
 * Proposal Editor Wrapper
 * - Top toolbar (back, send, export, status)
 * - Renders ProposalView (same as client sees)
 * - Users can use Echo (Messages widget) for AI edits
 */
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Send, 
  Download, 
  Edit3, 
  Loader2,
  X,
  Check,
  Clock,
  FileText,
  MoreHorizontal,
  Copy,
  ExternalLink,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { proposalsApi, adminApi } from '@/lib/sonor-api'
import SendProposalDialog from './SendProposalDialog'
import ProposalView from './ProposalView'
import EditProposalDialog from './EditProposalDialog'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import usePageContextStore from '@/lib/page-context-store'

// Status badge component
function StatusBadge({ status }) {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary', icon: Edit3 },
    generating: { label: 'Generating', variant: 'secondary', icon: Loader2 },
    sent: { label: 'Sent', variant: 'default', icon: Send },
    viewed: { label: 'Viewed', variant: 'outline', icon: FileText },
    accepted: { label: 'Accepted', variant: 'success', icon: Check },
    signed: { label: 'Signed', variant: 'success', icon: Check },
    declined: { label: 'Declined', variant: 'destructive', icon: X },
  }

  const config = statusConfig[status] || statusConfig.draft
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={cn("w-3 h-3", status === 'generating' && "animate-spin")} />
      {config.label}
    </Badge>
  )
}

export default function ProposalEditor({ proposalId, onBack }) {
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [clients, setClients] = useState([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isSavingClient, setIsSavingClient] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const titleInputRef = useRef(null)

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleStartEditTitle = () => {
    if (proposal?.status !== 'draft') return
    setEditedTitle(proposal?.title || '')
    setIsEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || !proposal) return
    
    setIsSavingTitle(true)
    try {
      const response = await proposalsApi.update(proposal.id, {
        title: editedTitle.trim()
      })
      
      if (response.data.proposal) {
        setProposal(prev => ({ ...prev, title: editedTitle.trim() }))
      }
      setIsEditingTitle(false)
    } catch (err) {
      console.error('Failed to save title:', err)
      alert('Failed to save title: ' + (err.response?.data?.error || err.message))
    } finally {
      setIsSavingTitle(false)
    }
  }

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false)
    setEditedTitle('')
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelEditTitle()
    }
  }

  // Fetch clients when assign dialog opens
  useEffect(() => {
    const fetchClients = async () => {
      if (!showAssignDialog) return
      
      setIsLoadingClients(true)
      try {
        const response = await adminApi.listClients()
        setClients(response.data.clients || [])
        // Set current client as selected
        if (proposal?.contact_id || proposal?.contactId) {
          setSelectedClientId(proposal.contact_id || proposal.contactId)
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      } finally {
        setIsLoadingClients(false)
      }
    }
    
    fetchClients()
  }, [showAssignDialog, proposal])

  const handleAssignClient = async () => {
    if (!selectedClientId || !proposal) return
    
    setIsSavingClient(true)
    try {
      const response = await proposalsApi.update(proposal.id, {
        contactId: selectedClientId
      })
      
      const updatedProposal = response.data.proposal || response.data
      
      if (updatedProposal) {
        // Fetch fresh data to get client details
        const refreshResponse = await proposalsApi.get(proposal.id)
        const freshProposal = refreshResponse.data.proposal || refreshResponse.data
        if (freshProposal) {
          setProposal(freshProposal)
        }
      }
      setShowAssignDialog(false)
    } catch (err) {
      console.error('Failed to assign client:', err)
      alert('Failed to assign client: ' + (err.response?.data?.error || err.message))
    } finally {
      setIsSavingClient(false)
    }
  }

  // Fetch proposal data
  useEffect(() => {
    async function fetchProposal() {
      if (!proposalId) return
      
      setIsLoading(true)
      try {
        const response = await proposalsApi.get(proposalId)
        const p = response.data.proposal || response.data
        
        if (p && p.id) {
          setProposal(p)
          
          // Set page context for Echo awareness - include MDX content for AI edits
          usePageContextStore.getState().setModule('proposals', 'editor')
          usePageContextStore.getState().setEntity({
            id: p.id,
            type: 'proposal',
            name: p.title,
            data: {
              status: p.status,
              clientName: p.contact?.name || p.contactName,
              company: p.contact?.company || p.company,
              services: p.sections?.map(s => s.title).join(', '),
              totalValue: p.totalValue || p.total_value || p.total_amount,
              description: `Proposal for ${p.contact?.name || p.contactName || 'client'}`,
              // Include MDX content so Echo can make edits
              mdxContent: p.mdxContent || p.mdx_content,
              // Editing instructions
              editingContext: 'You are viewing the proposal editor. The user can ask you to edit sections of this proposal. Use the proposal edit API to make changes to the MDX content.'
            }
          })
        } else {
          setError('Proposal not found')
        }
      } catch (err) {
        console.error('Error fetching proposal:', err)
        setError(err.message || 'Failed to load proposal')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposal()
    
    // Clear entity context when leaving
    return () => {
      usePageContextStore.getState().clearEntity()
    }
  }, [proposalId])

  // Poll for updates if proposal is generating
  useEffect(() => {
    if (!proposal) return
    
    const mdxContent = proposal.mdxContent || proposal.mdx_content
    const hasContent = mdxContent && 
      !mdxContent.startsWith('# Generating') && 
      mdxContent.length > 100

    if (hasContent || (proposal.status !== 'draft' && proposal.status !== 'generating')) return

    // Poll every 10 seconds (AI generation can take 30-60s)
    const interval = setInterval(async () => {
      try {
        const response = await proposalsApi.get(proposalId)
        if (response.data.proposal) {
          setProposal(response.data.proposal)
          
          const newContent = response.data.proposal.mdxContent
          if (newContent && !newContent.startsWith('# Generating') && newContent.length > 100) {
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [proposal, proposalId])

  const handleExportPDF = async () => {
    if (!proposal) return
    setIsExporting(true)
    try {
      // Find the proposal content element
      const proposalElement = document.querySelector('.proposal-content-wrapper')
      if (!proposalElement) {
        throw new Error('Proposal content not found')
      }

      // Capture the HTML content with styles
      const canvas = await html2canvas(proposalElement, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Fixed width for consistent rendering
      })

      // Calculate PDF dimensions
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      
      // Add image to PDF (full page)
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      
      pdf.save(`${proposal.slug || 'proposal'}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyLink = () => {
    if (!proposal?.slug) return
    const link = `${window.location.origin}/p/${proposal.slug}`
    navigator.clipboard.writeText(link)
  }

  const handleProposalUpdate = (updatedProposal) => {
    setProposal(prev => ({ ...prev, ...updatedProposal }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Button>
      </div>
    )
  }

  const mdxContent = proposal?.mdxContent || proposal?.mdx_content
  const hasContent = mdxContent && 
    !mdxContent.startsWith('# Generating') && 
    mdxContent.length > 100

  return (
    <div className="min-h-screen">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-40 bg-[var(--surface-primary)]/95 backdrop-blur border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[var(--border-primary)]" />
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={titleInputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleSaveTitle}
                    className="text-lg font-semibold h-8 w-64"
                    disabled={isSavingTitle}
                  />
                  {isSavingTitle && (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
                  )}
                </div>
              ) : (
                <h1 
                  className={cn(
                    "text-lg font-semibold text-[var(--text-primary)] line-clamp-1",
                    proposal?.status === 'draft' && "cursor-pointer hover:text-[var(--brand-primary)] transition-colors"
                  )}
                  onClick={handleStartEditTitle}
                  title={proposal?.status === 'draft' ? "Click to edit title" : undefined}
                >
                  {proposal?.title || 'Untitled Proposal'}
                  {proposal?.status === 'draft' && (
                    <Edit3 className="w-3.5 h-3.5 inline-block ml-2 opacity-0 group-hover:opacity-100" />
                  )}
                </h1>
              )}
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                {proposal?.contact?.company && (
                  <span>{proposal.contact.company}</span>
                )}
                {(proposal?.validUntil || proposal?.valid_until) && (
                  <>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>Valid until {new Date(proposal.validUntil || proposal.valid_until).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <StatusBadge status={proposal?.status} />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={!proposal?.slug}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || !hasContent}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>

            <Button
              size="sm"
              onClick={() => setShowSendDialog(true)}
              disabled={!hasContent}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Proposal
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/p/${proposal?.slug}`, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview as Client
                </DropdownMenuItem>
                {proposal?.status === 'draft' && (
                  <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                    <User className="w-4 h-4 mr-2" />
                    Assign to Client
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Delete Proposal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content - Renders the same ProposalView as clients see */}
      <div className="py-8 px-6 proposal-content-wrapper">
        <ProposalView 
          proposal={proposal} 
          isPublicView={true}
          showSignature={true}
        />
      </div>

      {/* Send Dialog */}
      <SendProposalDialog
        proposal={proposal}
        client={proposal?.contact}
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        onSuccess={() => {
          setShowSendDialog(false)
          proposalsApi.get(proposalId)
            .then(res => setProposal(res.data.proposal || res.data))
        }}
      />

      {/* Assign Client Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--brand-primary)]" />
              Assign to Client
            </DialogTitle>
            <DialogDescription>
              Reassign this proposal to a different client or prospect.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={isLoadingClients}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingClients ? "Loading..." : "Select a client or prospect"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name || client.email}</span>
                      {client.name && client.email && (
                        <span className="text-xs text-[var(--text-tertiary)]">{client.email}</span>
                      )}
                      {client.company && (
                        <span className="text-xs text-[var(--text-tertiary)]">{client.company}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignClient}
              disabled={!selectedClientId || isSavingClient}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              {isSavingClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Proposal Dialog */}
      <EditProposalDialog
        proposal={proposal}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={(updatedProposal) => {
          setProposal(updatedProposal)
          setShowEditDialog(false)
        }}
      />
    </div>
  )
}
