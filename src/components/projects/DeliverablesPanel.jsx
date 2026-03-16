/**
 * DeliverablesPanel - Creative deliverables management panel
 * 
 * For Sonor Admins:
 * - Create and manage deliverables
 * - Submit for review
 * - View approval status
 * - Deliver to client
 * 
 * For Clients:
 * - View pending approvals
 * - Approve/request changes
 * - View delivered items
 * - Download files
 */
import { useState, useMemo } from 'react'
import {
  Plus, Search, Filter, FileText, Image, Video, FileCode,
  Clock, CheckCircle2, AlertTriangle, Send, Download, Eye,
  MoreVertical, Edit, Trash2, ThumbsUp, ThumbsDown, Package,
  ChevronRight, Calendar, User, Paperclip
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

import { DELIVERABLE_STATUS_CONFIG, DELIVERABLE_TYPE_CONFIG } from '@/lib/hooks'

// Type icons
const TYPE_ICONS = {
  document: FileText,
  image: Image,
  video: Video,
  audio: FileText,
  design: Image,
  code: FileCode,
  presentation: FileText,
  spreadsheet: FileText,
  other: Package,
}

export function DeliverablesPanel({
  deliverables = [],
  pendingApprovals = [],
  stats = {},
  projectId,
  isAdmin = false,
  onDeliverableCreate,
  onDeliverableUpdate,
  onDeliverableDelete,
  onDeliverableSelect,
  onSubmitForReview,
  onApprove,
  onRequestChanges,
  onDeliver,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, deliverable: null, type: null })
  const [feedback, setFeedback] = useState('')

  // Group deliverables by status
  const groupedDeliverables = useMemo(() => {
    let filtered = deliverables

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.title?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query)
      )
    }

    // Group by status
    const groups = {
      pending_review: filtered.filter(d => d.status === 'pending_review'),
      needs_changes: filtered.filter(d => d.status === 'needs_changes'),
      approved: filtered.filter(d => d.status === 'approved'),
      delivered: filtered.filter(d => d.status === 'delivered'),
      in_progress: filtered.filter(d => ['not_started', 'in_progress'].includes(d.status)),
    }

    return groups
  }, [deliverables, searchQuery])

  // Filter based on active tab
  const displayedDeliverables = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return groupedDeliverables.pending_review
      case 'needs_changes':
        return groupedDeliverables.needs_changes
      case 'approved':
        return [...groupedDeliverables.approved, ...groupedDeliverables.delivered]
      case 'in_progress':
        return groupedDeliverables.in_progress
      default:
        return deliverables.filter(d => 
          !searchQuery || 
          d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }
  }, [activeTab, groupedDeliverables, deliverables, searchQuery])

  const handleSubmitFeedback = async () => {
    if (!feedbackDialog.deliverable) return

    try {
      if (feedbackDialog.type === 'approve') {
        await onApprove?.(feedbackDialog.deliverable.id, feedback)
        toast.success('Deliverable approved')
      } else {
        if (!feedback.trim()) {
          toast.error('Please provide feedback')
          return
        }
        await onRequestChanges?.(feedbackDialog.deliverable.id, feedback)
        toast.success('Changes requested')
      }
      setFeedbackDialog({ open: false, deliverable: null, type: null })
      setFeedback('')
    } catch (error) {
      toast.error('Failed to submit feedback')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Creative & Deliverables</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => onDeliverableSelect?.(null)}>
              <Plus className="h-4 w-4 mr-1" />
              New Deliverable
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="h-10">
            <TabsTrigger value="all" className="relative">
              All
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                {deliverables.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending Review
              {groupedDeliverables.pending_review.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-purple-100 text-purple-700">
                  {groupedDeliverables.pending_review.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="needs_changes">
              Needs Changes
              {groupedDeliverables.needs_changes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 bg-orange-100 text-orange-700">
                  {groupedDeliverables.needs_changes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved/Delivered
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="in_progress">
                In Progress
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Pending Approval Alert (for clients) */}
          {!isAdmin && pendingApprovals.length > 0 && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
                <AlertTriangle className="h-4 w-4 text-purple-500" />
                Pending Your Approval ({pendingApprovals.length})
              </h3>
              <div className="space-y-3">
                {pendingApprovals.map((deliverable) => (
                  <ApprovalCard
                    key={deliverable.id}
                    deliverable={deliverable}
                    onView={() => onDeliverableSelect?.(deliverable)}
                    onApprove={() => setFeedbackDialog({ open: true, deliverable, type: 'approve' })}
                    onRequestChanges={() => setFeedbackDialog({ open: true, deliverable, type: 'changes' })}
                  />
                ))}
              </div>
              <Separator className="mt-6" />
            </div>
          )}

          {/* Deliverables Grid */}
          {displayedDeliverables.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedDeliverables.map((deliverable) => (
                <DeliverableCard
                  key={deliverable.id}
                  deliverable={deliverable}
                  isAdmin={isAdmin}
                  onClick={() => onDeliverableSelect?.(deliverable)}
                  onSubmit={() => onSubmitForReview?.(deliverable.id)}
                  onDeliver={() => onDeliver?.(deliverable.id)}
                  onApprove={() => setFeedbackDialog({ open: true, deliverable, type: 'approve' })}
                  onRequestChanges={() => setFeedbackDialog({ open: true, deliverable, type: 'changes' })}
                  onDelete={() => onDeliverableDelete?.(deliverable.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No deliverables found"
              description={
                activeTab === 'all'
                  ? 'No deliverables have been created yet'
                  : 'No deliverables in this category'
              }
              actionLabel={isAdmin ? 'Create Deliverable' : undefined}
              onAction={isAdmin ? () => onDeliverableSelect?.(null) : undefined}
              compact
            />
          )}
        </div>
      </ScrollArea>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onOpenChange={(open) => !open && setFeedbackDialog({ open: false, deliverable: null, type: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackDialog.type === 'approve' ? 'Approve Deliverable' : 'Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {feedbackDialog.type === 'approve' 
                ? 'Add an optional message with your approval.'
                : 'Please describe what changes are needed.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>{feedbackDialog.type === 'approve' ? 'Message (optional)' : 'Feedback'}</Label>
            <Textarea
              placeholder={feedbackDialog.type === 'approve' 
                ? 'Great work! Approved as-is.'
                : 'Please update the following...'
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFeedbackDialog({ open: false, deliverable: null, type: null })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitFeedback}
              variant={feedbackDialog.type === 'approve' ? 'default' : 'destructive'}
            >
              {feedbackDialog.type === 'approve' ? (
                <>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Request Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Approval Card for pending items
function ApprovalCard({ deliverable, onView, onApprove, onRequestChanges }) {
  const TypeIcon = TYPE_ICONS[deliverable.type] || Package
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Preview thumbnail */}
          <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0">
            {deliverable.files?.[0]?.thumbnail_url ? (
              <img 
                src={deliverable.files[0].thumbnail_url} 
                alt="" 
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <TypeIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{deliverable.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
              {deliverable.description || 'No description'}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Submitted by Sonor</span>
              {deliverable.submitted_at && (
                <>
                  <span>·</span>
                  <span>{format(parseISO(deliverable.submitted_at), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onRequestChanges}>
              Request Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Deliverable Card
function DeliverableCard({
  deliverable,
  isAdmin,
  onClick,
  onSubmit,
  onDeliver,
  onApprove,
  onRequestChanges,
  onDelete,
}) {
  const statusConfig = DELIVERABLE_STATUS_CONFIG[deliverable.status]
  const typeConfig = DELIVERABLE_TYPE_CONFIG[deliverable.type]
  const TypeIcon = TYPE_ICONS[deliverable.type] || Package

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="h-40 bg-muted flex items-center justify-center relative">
        {deliverable.files?.[0]?.thumbnail_url ? (
          <img 
            src={deliverable.files[0].thumbnail_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <TypeIcon className="h-12 w-12 text-muted-foreground/50" />
        )}

        {/* Status badge */}
        <Badge className={cn("absolute top-2 left-2", statusConfig?.color)}>
          {statusConfig?.label || deliverable.status}
        </Badge>

        {/* File count */}
        {deliverable.files?.length > 0 && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            <Paperclip className="h-3 w-3 mr-1" />
            {deliverable.files.length}
          </Badge>
        )}

        {/* Action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            {isAdmin && deliverable.status === 'in_progress' && (
              <DropdownMenuItem onClick={onSubmit}>
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </DropdownMenuItem>
            )}
            
            {isAdmin && deliverable.status === 'approved' && (
              <DropdownMenuItem onClick={onDeliver}>
                <Package className="h-4 w-4 mr-2" />
                Deliver to Client
              </DropdownMenuItem>
            )}
            
            {!isAdmin && deliverable.status === 'pending_review' && (
              <>
                <DropdownMenuItem onClick={onApprove}>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRequestChanges}>
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Request Changes
                </DropdownMenuItem>
              </>
            )}
            
            {deliverable.status === 'delivered' && deliverable.files?.length > 0 && (
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download All
              </DropdownMenuItem>
            )}
            
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.()
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="p-3">
        {/* Title */}
        <h4 className="font-medium truncate">{deliverable.title}</h4>
        
        {/* Type & Date */}
        <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {typeConfig?.icon} {typeConfig?.label || deliverable.type}
          </span>
          {deliverable.delivered_at ? (
            <span>Delivered {format(parseISO(deliverable.delivered_at), 'MMM d')}</span>
          ) : deliverable.due_date ? (
            <span>Due {format(parseISO(deliverable.due_date), 'MMM d')}</span>
          ) : (
            <span>{format(parseISO(deliverable.created_at), 'MMM d')}</span>
          )}
        </div>

        {/* Version indicator */}
        {deliverable.version > 1 && (
          <Badge variant="outline" className="mt-2 text-[10px]">
            v{deliverable.version}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export default DeliverablesPanel
