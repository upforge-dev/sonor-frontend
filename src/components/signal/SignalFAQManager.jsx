// src/components/signal/SignalFAQManager.jsx
// FAQ management with approval workflow - pending/approved/rejected tabs
// Now includes confidence badges, source attribution, and bulk approval
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Plus,
  Search,
  Check,
  X,
  Archive,
  Edit2,
  Trash2,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Loader2,
  MoreVertical,
  Sparkles,
  ExternalLink,
  Zap,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSignalStore } from '@/lib/signal-store' // Keep for streaming UI state
import { useSignalFaqs, useCreateSignalFaq, useUpdateSignalFaq, useDeleteSignalFaq, signalKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// Status configuration
const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    color: 'text-yellow-400', 
    bg: 'bg-yellow-500/20',
    description: 'Awaiting review'
  },
  approved: { 
    label: 'Approved', 
    icon: CheckCircle2, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/20',
    description: 'Active in Signal AI'
  },
  rejected: { 
    label: 'Rejected', 
    icon: XCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/20',
    description: 'Not used by Signal AI'
  },
  archived: { 
    label: 'Archived', 
    icon: Archive, 
    color: 'text-gray-400', 
    bg: 'bg-gray-500/20',
    description: 'Hidden from list'
  }
}

export default function SignalFAQManager({ projectId, className }) {
  const {
    faqs,
    faqsLoading,
    faqsPagination,
    faqsStats,
    fetchFaqs,
    createFaq,
    updateFaq,
    approveFaq,
    rejectFaq,
    deleteFaq
  } = useSignalStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  // Action loading state
  const [actionLoading, setActionLoading] = useState({})
  
  // Bulk approval state
  const [bulkApproving, setBulkApproving] = useState(false)

  // Fetch FAQs on mount and when filters change
  useEffect(() => {
    if (projectId) {
      fetchFaqs(projectId, {
        status: activeTab !== 'all' ? activeTab : undefined,
        search: searchQuery || undefined
      })
    }
  }, [projectId, activeTab, searchQuery])
  
  // Calculate high-confidence pending FAQs (for bulk approve)
  const highConfidencePending = faqs.filter(f => 
    f.status === 'pending' && f.confidence >= 8
  )
  
  // Handle bulk approve all high-confidence FAQs
  const handleBulkApproveHighConfidence = async () => {
    if (highConfidencePending.length === 0) return
    
    setBulkApproving(true)
    try {
      // Approve each one in sequence to avoid rate limits
      for (const faq of highConfidencePending) {
        await approveFaq(projectId, faq.id)
      }
      // Refresh the list
      await fetchFaqs(projectId, { status: 'pending' })
    } finally {
      setBulkApproving(false)
    }
  }

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleOpenAdd = () => {
    setFormData({ question: '', answer: '', category: '' })
    setEditingFaq(null)
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (faq) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || ''
    })
    setEditingFaq(faq)
    setIsAddDialogOpen(true)
  }

  const handleSubmit = async () => {
    setFormLoading(true)
    try {
      if (editingFaq) {
        await updateFaq(projectId, editingFaq.id, formData)
      } else {
        await createFaq(projectId, formData)
      }
      setIsAddDialogOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleApprove = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approve' }))
    try {
      await approveFaq(projectId, id)
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  const handleReject = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'reject' }))
    try {
      await rejectFaq(projectId, id)
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  const handleDelete = async (id) => {
    await deleteFaq(id)
    setDeleteConfirmId(null)
  }

  const stats = faqsStats || { pending: 0, approved: 0, rejected: 0 }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
              <HelpCircle className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <CardTitle>FAQ Manager</CardTitle>
              <CardDescription>
                Manage frequently asked questions for Signal AI
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bulk approve high-confidence FAQs */}
            {activeTab === 'pending' && highConfidencePending.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={handleBulkApproveHighConfidence}
                      disabled={bulkApproving}
                      className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    >
                      {bulkApproving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Approve High-Confidence ({highConfidencePending.length})
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-approve all FAQs with confidence score ≥ 8</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search FAQs..."
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Status tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5 text-yellow-400" />
              Pending
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-yellow-500/20 text-yellow-400">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Approved
              {stats.approved > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-emerald-500/20 text-emerald-400">
                  {stats.approved}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-400" />
              Rejected
              {stats.rejected > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.rejected}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              All
            </TabsTrigger>
          </TabsList>

          {/* FAQ list */}
          <div className="min-h-[400px]">
            {faqsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : faqs.length === 0 ? (
              <EmptyState 
                status={activeTab} 
                onAdd={handleOpenAdd}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                <AnimatePresence>
                  {faqs.map((faq) => (
                    <FAQCard
                      key={faq.id}
                      faq={faq}
                      onEdit={() => handleOpenEdit(faq)}
                      onDelete={() => setDeleteConfirmId(faq.id)}
                      onApprove={() => handleApprove(faq.id)}
                      onReject={() => handleReject(faq.id)}
                      actionLoading={actionLoading[faq.id]}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </Tabs>

        {/* Pagination */}
        {faqsPagination?.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={faqsPagination.page <= 1}
              onClick={() => fetchFaqs(projectId, { 
                page: faqsPagination.page - 1,
                status: activeTab !== 'all' ? activeTab : undefined
              })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {faqsPagination.page} of {faqsPagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={faqsPagination.page >= faqsPagination.pages}
              onClick={() => fetchFaqs(projectId, { 
                page: faqsPagination.page + 1,
                status: activeTab !== 'all' ? activeTab : undefined
              })}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? 'Edit FAQ' : 'Add FAQ'}
            </DialogTitle>
            <DialogDescription>
              {editingFaq 
                ? 'Update this frequently asked question.'
                : 'Add a new FAQ for Signal AI to reference.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="What question do customers frequently ask?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Provide a clear, helpful answer..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Pricing, Services, Support..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.question || !formData.answer || formLoading}
            >
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingFaq ? 'Update FAQ' : 'Add FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this FAQ. Signal AI will no longer use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

// Helper to get confidence badge styling
function getConfidenceBadge(confidence) {
  if (!confidence) return null
  if (confidence >= 8) return { color: 'bg-emerald-500/20 text-emerald-400', label: 'High', icon: Shield }
  if (confidence >= 5) return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Medium', icon: AlertCircle }
  return { color: 'bg-red-500/20 text-red-400', label: 'Low', icon: AlertCircle }
}

// FAQ card component
function FAQCard({ faq, onEdit, onDelete, onApprove, onReject, actionLoading }) {
  const statusConfig = STATUS_CONFIG[faq.status] || STATUS_CONFIG.pending
  const isPending = faq.status === 'pending'
  const confidenceBadge = getConfidenceBadge(faq.confidence)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        'bg-[var(--glass-bg)] hover:bg-accent/5',
        isPending && 'border-yellow-500/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          statusConfig.bg
        )}>
          <statusConfig.icon className={cn('h-4 w-4', statusConfig.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary" className={cn('text-xs', statusConfig.bg, statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            {faq.category && (
              <Badge variant="outline" className="text-xs">
                {faq.category}
              </Badge>
            )}
            {faq.ai_generated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs gap-1 bg-purple-500/20 text-purple-400">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Auto-generated from conversation patterns
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Confidence score badge */}
            {confidenceBadge && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className={cn('text-xs gap-1', confidenceBadge.color)}>
                      <confidenceBadge.icon className="h-3 w-3" />
                      {faq.confidence}/10
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    AI Confidence: {confidenceBadge.label} ({faq.confidence}/10)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Auto-approved badge */}
            {faq.auto_approved && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs gap-1 bg-blue-500/20 text-blue-400">
                      <Zap className="h-3 w-3" />
                      Auto
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Auto-approved due to high confidence score
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <p className="font-medium text-foreground mb-1">
            {faq.question}
          </p>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {faq.answer}
          </p>

          {/* Source quote attribution */}
          {faq.source_quote && (
            <div className="mt-2 p-2 bg-muted/50 rounded border-l-2 border-muted-foreground/30">
              <p className="text-xs text-muted-foreground italic line-clamp-2">
                "{faq.source_quote}"
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(faq.created_at).toLocaleDateString()}
            </span>
            {faq.usage_count > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Used {faq.usage_count}×
              </span>
            )}
            {/* Source URL link */}
            {faq.source_url && (
              <a 
                href={faq.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Approval actions for pending FAQs */}
          {isPending && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onApprove}
                      disabled={!!actionLoading}
                      className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                    >
                      {actionLoading === 'approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Approve</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onReject}
                      disabled={!!actionLoading}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      {actionLoading === 'reject' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reject</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {faq.status !== 'approved' && (
                <DropdownMenuItem onClick={onApprove}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
              )}
              {faq.status !== 'rejected' && (
                <DropdownMenuItem onClick={onReject}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  )
}

// Empty state component
function EmptyState({ status, onAdd, searchQuery }) {
  const statusLabels = {
    pending: 'pending review',
    approved: 'approved',
    rejected: 'rejected',
    all: 'added'
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <HelpCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      {searchQuery ? (
        <>
          <h3 className="font-medium mb-1">No FAQs found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search term
          </p>
        </>
      ) : (
        <>
          <h3 className="font-medium mb-1">No {statusLabels[status]} FAQs</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {status === 'pending' 
              ? 'AI-generated FAQs will appear here for review'
              : 'Add FAQs to help Signal AI answer common questions'}
          </p>
          {status !== 'pending' && (
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          )}
        </>
      )}
    </div>
  )
}
