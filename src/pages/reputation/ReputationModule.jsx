// src/pages/reputation/ReputationModule.jsx
// Reputation module - uses ModuleLayout for consistent shell (left sidebar + main content)
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect, useMemo } from 'react'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useReputationOverview, useReviews, useHealthScore, useReputationPlatforms, useReputationSettings, reputationKeys } from '@/lib/hooks'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useSignalAccess } from '@/lib/signal-access'
import { ModuleLayout } from '@/components/ModuleLayout'
import { EmptyState } from '@/components/EmptyState'
import { MODULE_ICONS } from '@/lib/module-icons'
import SignalIcon from '@/components/ui/SignalIcon'
import portalApi, { reputationApi } from '@/lib/sonor-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Star,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  BarChart3,
  FileText,
  Globe,
  Link2,
  Zap,
  Eye,
  Archive,
  Mail,
  Flag,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Target,
  ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  GoogleOAuthDialog,
  FacebookOAuthDialog,
  TrustpilotOAuthDialog,
  YelpApiKeyDialog,
} from '@/components/reputation/ReputationOAuthDialogs'
import GbpLocationSelector from '@/components/projects/GbpLocationSelector'
import { SignalSuggestsPanel } from '@/components/ai/SignalSuggestsPanel'

// ============================================================================
// SIDEBAR SECTIONS
// ============================================================================

const SIDEBAR_SECTIONS = {
  reviews: {
    label: 'Reviews',
    icon: MessageSquare,
    views: [
      { id: 'all', label: 'All Reviews', icon: MessageSquare },
      { id: 'pending', label: 'Pending Approval', icon: Clock },
      { id: 'responded', label: 'Responded', icon: CheckCircle },
      { id: 'flagged', label: 'Flagged', icon: Flag },
      { id: 'archived', label: 'Archived', icon: Archive },
    ],
  },
  insights: {
    label: 'Insights',
    icon: BarChart3,
    views: [
      { id: 'overview', label: 'Overview', icon: TrendingUp },
      { id: 'page-match', label: 'Page Matching', icon: Link2 },
    ],
  },
  automation: {
    label: 'Automation',
    icon: Zap,
    views: [
      { id: 'response-queue', label: 'Response Queue', icon: Clock },
      { id: 'campaigns', label: 'Campaigns', icon: Send },
      { id: 'templates', label: 'Templates', icon: FileText },
    ],
  },
}

// ============================================================================
// STAR RATING COMPONENT
// ============================================================================

function StarRating({ rating, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= rating
              ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'text-[var(--text-tertiary)]'
          )}
        />
      ))}
    </div>
  )
}

// ============================================================================
// REVIEW CARD COMPONENT
// ============================================================================

function ReviewCard({ 
  review, 
  isSelected, 
  onClick, 
  onApprove, 
  onReject, 
  showApprovalActions 
}) {
  const getSentimentStyle = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
      case 'negative':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-[var(--text-tertiary)]/10 text-[var(--text-secondary)] border-[var(--text-tertiary)]/20'
    }
  }

  return (
    <div
      className={cn(
        'p-4 border-b border-[var(--glass-border)] cursor-pointer transition-colors',
        isSelected
          ? 'bg-[var(--brand-primary)]/5 border-l-2 border-l-[var(--brand-primary)]'
          : 'hover:bg-[var(--glass-bg-hover)]'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-[var(--text-primary)] truncate">
              {review.reviewer_name || 'Anonymous'}
            </span>
            <Badge 
              variant="outline" 
              className="text-xs shrink-0"
              style={{ 
                borderColor: 'var(--brand-primary)', 
                color: 'var(--brand-primary)' 
              }}
            >
              {review.platform_type}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} />
            {review.sentiment && (
              <Badge 
                variant="outline" 
                className={cn('text-xs', getSentimentStyle(review.sentiment))}
              >
                {review.sentiment}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
            {review.review_text}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
            <span>
              {(() => {
                try {
                  if (!review.review_date) return 'Unknown date'
                  const date = new Date(review.review_date)
                  if (isNaN(date.getTime())) return 'Invalid date'
                  return formatDistanceToNow(date, { addSuffix: true })
                } catch {
                  return 'Unknown date'
                }
              })()}
            </span>
            {review.matched_page && (
              <span className="flex items-center gap-1 text-[var(--brand-primary)]">
                <Link2 className="h-3 w-3" />
                Matched
              </span>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex flex-col items-end gap-2">
          {review.response_text ? (
            <Badge 
              className="text-xs"
              style={{ 
                backgroundColor: 'var(--brand-primary)', 
                color: 'white' 
              }}
            >
              Responded
            </Badge>
          ) : review.pending_response ? (
            <Badge 
              variant="outline" 
              className="text-xs border-amber-500/30 text-amber-500"
            >
              Pending
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              New
            </Badge>
          )}
          
          {/* Approval actions for pending responses */}
          {showApprovalActions && review.pending_response && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove?.(review)
                }}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onReject?.(review)
                }}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// REVIEW DETAIL PANEL
// ============================================================================

function ReviewDetailPanel({ review, onClose, settings, onGenerateResponse, onApprove, onReject, onPostResponse }) {
  const [responseText, setResponseText] = useState(review?.pending_response || review?.response_text || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  useEffect(() => {
    setResponseText(review?.pending_response || review?.response_text || '')
  }, [review])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await onGenerateResponse?.(review)
      if (response) {
        setResponseText(response)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePost = async () => {
    setIsPosting(true)
    try {
      await onPostResponse?.(review, responseText)
    } finally {
      setIsPosting(false)
    }
  }

  if (!review) return null

  const date = format(new Date(review.review_date), 'MMMM d, yyyy')

  return (
    <div className="h-full flex flex-col bg-[var(--glass-bg)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="md" />
          <span className="text-sm text-[var(--text-secondary)]">{date}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Reviewer Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {(review.reviewer_name || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {review.reviewer_name || 'Anonymous'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">via {review.platform_type}</p>
              </div>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Review</h4>
            <p className="text-[var(--text-primary)] leading-relaxed">
              {review.review_text || 'No review text'}
            </p>
          </div>

          {/* AI Analysis */}
          {(review.sentiment || review.topics?.length > 0 || review.keywords?.length > 0) && (
            <div className="p-3 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Signal Analysis</span>
              </div>
              
              {review.sentiment && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Sentiment:</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      'text-xs',
                      review.sentiment === 'positive' 
                        ? 'border-[var(--brand-primary)]/30 text-[var(--brand-primary)]'
                        : review.sentiment === 'negative'
                        ? 'border-red-500/30 text-red-500'
                        : 'border-[var(--text-tertiary)]/30 text-[var(--text-secondary)]'
                    )}
                  >
                    {review.sentiment}
                  </Badge>
                </div>
              )}
              
              {review.topics?.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Topics:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {review.topics.map((topic, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {review.services_mentioned?.length > 0 && (
                <div>
                  <span className="text-xs text-[var(--text-tertiary)]">Services Mentioned:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {review.services_mentioned.map((service, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Matched SEO Page */}
          {review.matched_page && (
            <div className="p-3 rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Matched Page</span>
              </div>
              <a 
                href={review.matched_page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline flex items-center gap-1"
                style={{ color: 'var(--brand-primary)' }}
              >
                {review.matched_page.path}
                <ExternalLink className="h-3 w-3" />
              </a>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Match confidence: {review.match_confidence}%
              </p>
            </div>
          )}

          {/* Response Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                {review.response_text ? 'Response' : 'Draft Response'}
              </h4>
              {!review.response_posted_to_platform && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{ color: 'var(--brand-primary)' }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {isGenerating ? 'Generating...' : 'Generate with Signal'}
                </Button>
              )}
            </div>
            
            {review.response_posted_to_platform ? (
              <div className="p-3 rounded-lg bg-[var(--glass-bg-inset)]">
                <p className="text-sm text-[var(--text-primary)]">{review.response_text}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-tertiary)]">
                  <CheckCircle className="h-3 w-3 text-[var(--brand-primary)]" />
                  Posted {review.response_date && formatDistanceToNow(new Date(review.response_date), { addSuffix: true })}
                </div>
              </div>
            ) : (
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                className="w-full h-32 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
              />
            )}
          </div>

          {/* Pending Approval Actions */}
          {review.pending_response && !review.response_posted_to_platform && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Pending Approval</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                This response was generated by Signal and is waiting for your approval before posting.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onApprove?.(review)}
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Approve & Post
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject?.(review)}
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[var(--glass-border)] flex items-center gap-2">
        {!review.response_posted_to_platform && !review.pending_response && (
          <Button
            className="flex-1"
            onClick={handlePost}
            disabled={!responseText.trim() || isPosting}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            <Send className="h-4 w-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post Response'}
          </Button>
        )}
        
        {/* Flag for Removal - show for negative reviews */}
        {review.rating <= 3 && !review.removal_status && (
          <FlagForRemovalButton review={review} />
        )}
        
        {/* Show removal status if flagged - clickable to reopen escalation dialog */}
        {review.removal_status && (
          <FlagForRemovalButton 
            review={review} 
            initialStep={3}
            buttonVariant="status"
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// FLAG FOR REMOVAL BUTTON & DIALOG
// ============================================================================

const REMOVAL_REASONS = [
  { value: 'spam', label: 'Spam / Fake Review', description: 'Clearly fake, paid, or review manipulation' },
  { value: 'fake', label: 'Non-Customer', description: 'Person never used the business' },
  { value: 'off_topic', label: 'Off Topic', description: 'Not about actual experience with the business' },
  { value: 'conflict_of_interest', label: 'Conflict of Interest', description: 'Competitor, ex-employee, personal grudge' },
  { value: 'profanity', label: 'Profanity', description: 'Contains explicit or vulgar language' },
  { value: 'harassment', label: 'Harassment / Threats', description: 'Personal attacks, threats, bullying' },
  { value: 'discrimination', label: 'Discrimination', description: 'Targets protected groups' },
  { value: 'personal_info', label: 'Personal Information', description: 'Shares private/personal data' },
  { value: 'other', label: 'Other', description: 'Other policy violation' },
]

function FlagForRemovalButton({ review, initialStep = 1, buttonVariant = 'default' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(initialStep) // 1: Generate, 2: Review & Edit, 3: Submitted, 4: Email Sent
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [removalRequest, setRemovalRequest] = useState(null)
  const [editedJustification, setEditedJustification] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState(null)
  const queryClient = useQueryClient()

  // Load existing data when opening at step 3 (already flagged review)
  useEffect(() => {
    if (isOpen && initialStep === 3) {
      // Load existing removal data from review
      setRemovalRequest({
        suggestedReason: review.removal_reason || 'other',
        justification: review.removal_justification || '',
        bestAngle: 'Previously submitted',
        confidence: 50,
      })
      setEditedJustification(review.removal_justification || '')
      setStep(3)
    }
  }, [isOpen, initialStep, review])

  // Auto-generate when dialog opens (only for fresh requests)
  useEffect(() => {
    if (isOpen && !removalRequest && initialStep === 1) {
      handleGenerate()
    }
  }, [isOpen, initialStep])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await reputationApi.analyzeRemoval(review.id)
      setRemovalRequest(response.data)
      setEditedJustification(response.data.justification || '')
      setStep(2)
    } catch (error) {
      toast.error('Failed to generate removal request')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyJustification = () => {
    navigator.clipboard.writeText(editedJustification)
    toast.success('Copied to clipboard!')
  }

  const handleSubmitToGoogle = async () => {
    setIsSubmitting(true)
    try {
      // Save the removal request to database
      await reputationApi.flagForRemoval(review.id, {
        reason: removalRequest.suggestedReason,
        justification: editedJustification,
        notes: `Submitted via Signal - ${removalRequest.bestAngle}`,
      })

      // Try to submit to Google via API
      const submitResult = await reputationApi.submitRemoval(review.id)
      
      if (submitResult.data.submitted) {
        toast.success('Removal request submitted to Google!')
      } else if (submitResult.data.googleReviewUrl) {
        // API submission not available, open manual submission
        window.open(submitResult.data.googleReviewUrl, '_blank')
        toast.success('Opening Google to submit removal request...')
      }
      
      setStep(3) // Move to post-submit step
      queryClient.invalidateQueries({ queryKey: ['reputation'] })
    } catch (error) {
      // Fallback: open the review in Google for manual flagging
      if (review.google_review_url) {
        window.open(review.google_review_url, '_blank')
        toast.info('Please submit the removal request manually in Google')
        setStep(3) // Still move to step 3 for escalation option
      } else {
        toast.error('Failed to submit removal request')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendEscalationEmail = async () => {
    setIsSendingEmail(true)
    setEmailError(null)
    try {
      const response = await reputationApi.escalateRemovalEmail(review.id, {
        additionalNotes: editedJustification ? 
          'The detailed justification for this removal request is included in the email body above.' : undefined,
      })
      
      if (response.data.success) {
        setEmailSent(true)
        setStep(4) // Move to email sent confirmation
        toast.success('Escalation email sent to Google Support!')
        queryClient.invalidateQueries({ queryKey: ['reputation'] })
      } else {
        setEmailError(response.data.error || 'Failed to send email')
        toast.error(response.data.error || 'Failed to send escalation email')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send escalation email'
      setEmailError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset state after close animation
    setTimeout(() => {
      setStep(initialStep) // Reset to initial step (1 for new, 3 for already flagged)
      setRemovalRequest(null)
      setEditedJustification('')
      setEmailSent(false)
      setEmailError(null)
    }, 200)
  }

  // Render different button based on variant
  const renderButton = () => {
    if (buttonVariant === 'status') {
      // Show as status indicator that's clickable
      const statusColors = {
        pending: 'text-amber-500',
        submitted: 'text-blue-500',
        escalated: 'text-purple-500',
        removed: 'text-green-500',
        rejected: 'text-red-500',
      }
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Flag className={cn('h-4 w-4', statusColors[review.removal_status] || 'text-red-500')} />
          <span className="text-[var(--text-secondary)]">
            Removal: {review.removal_status}
          </span>
          <Mail className="h-3 w-3 text-[var(--text-tertiary)]" title="Click to send escalation email" />
        </button>
      )
    }
    
    // Default: Flag for Removal button
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
        onClick={() => setIsOpen(true)}
      >
        <Flag className="h-3 w-3 mr-1" />
        Flag for Removal
      </Button>
    )
  }

  return (
    <>
      {renderButton()}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
              {initialStep === 3 ? (
                <>
                  <Mail className="h-5 w-5 text-blue-500" />
                  Escalate Removal Request
                </>
              ) : (
                <>
                  <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  Remove This Review
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              {initialStep === 3 
                ? 'Send a formal escalation email to Google Business support.'
                : 'Signal will write the removal request. You approve it. We submit to Google.'}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps - only show for new requests */}
          {initialStep === 1 && (
          <>
          <div className="flex items-center justify-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s 
                    ? 'bg-[var(--brand-primary)] text-white' 
                    : 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)]'
                )}>
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={cn(
                    'w-12 h-0.5 mx-1',
                    step > s ? 'bg-[var(--brand-primary)]' : 'bg-[var(--glass-border)]'
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 text-xs text-[var(--text-tertiary)] -mt-1 mb-2">
            <span>Generate</span>
            <span>Review</span>
            <span>Submit</span>
          </div>
          </>
          )}

          <div className="space-y-4 py-2">
            {/* Step 1: Generating */}
            {step === 1 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--brand-primary)]/10 mb-4">
                  <Sparkles className="h-8 w-8 animate-pulse" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Signal is writing your removal request...
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Analyzing the review and crafting the strongest possible case for removal.
                </p>
              </div>
            )}

            {/* Step 2: Review & Edit */}
            {step === 2 && removalRequest && (
              <>
                {/* Review Being Flagged */}
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[var(--text-primary)]">{review.reviewer_name}</span>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{review.review_text}</p>
                </div>

                {/* Strategy Summary */}
                <div className="p-3 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                    <span className="font-medium text-[var(--text-primary)]">Removal Strategy</span>
                    <Badge variant="outline" className="ml-auto">
                      {REMOVAL_REASONS.find(r => r.value === removalRequest.suggestedReason)?.label || removalRequest.suggestedReason}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{removalRequest.bestAngle}</p>
                </div>

                {/* Editable Justification - THE ACTUAL REQUEST */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Removal Request to Google
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyJustification}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <textarea
                    value={editedJustification}
                    onChange={(e) => setEditedJustification(e.target.value)}
                    className="w-full h-40 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 font-mono"
                  />
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Edit if needed. This is exactly what will be submitted to Google.
                  </p>
                </div>

                {/* Confidence Indicator */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg-inset)]">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold',
                    removalRequest.confidence >= 50
                      ? 'bg-green-500/20 text-green-500'
                      : removalRequest.confidence >= 30
                        ? 'bg-amber-500/20 text-amber-500'
                        : 'bg-red-500/20 text-red-500'
                  )}>
                    {removalRequest.confidence}%
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {removalRequest.confidence >= 50 ? 'Good chance of removal' : 
                       removalRequest.confidence >= 30 ? 'Worth trying' : 'Long shot, but go for it'}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {removalRequest.confidence >= 50 
                        ? 'This review has clear policy violations'
                        : 'Every negative review is worth challenging'}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Submitted - Show escalation option */}
            {step === 3 && (
              <div className="space-y-6 py-4">
                {/* Success message - contextual based on whether this is initial submit or reopen */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    {initialStep === 3 ? 'Review Flagged for Removal' : 'Removal Request Submitted!'}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {initialStep === 3 
                      ? 'Send an escalation email to Google Business support to follow up.'
                      : 'Google typically responds within 3-5 business days.'}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--glass-bg-inset)] text-sm">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-[var(--text-secondary)]">Status: Pending Google Review</span>
                  </div>
                </div>

                {/* Email Escalation Option */}
                <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Mail className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--text-primary)]">
                        Escalate via Email
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Send a formal escalation to Google Business support for faster resolution
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-sm text-[var(--text-secondary)] mb-4">
                    <p className="mb-2">This will send an email to <strong>business-redressal@google.com</strong> containing:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-tertiary)]">
                      <li>Your business name and Google Place ID</li>
                      <li>The review details (reviewer, rating, text, date)</li>
                      <li>The violation category and justification Signal wrote</li>
                      <li>Direct link to the review</li>
                    </ul>
                  </div>

                  {emailError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                      {emailError}
                    </div>
                  )}

                  <Button
                    onClick={handleSendEscalationEmail}
                    disabled={isSendingEmail}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending Email...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Escalation Email
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-[var(--text-tertiary)]">
                  Email escalation often gets faster responses than standard flagging.
                </p>
              </div>
            )}

            {/* Step 4: Email Sent Confirmation */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
                  <Mail className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Escalation Email Sent!
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Your detailed removal request has been sent to Google Business support. They typically respond within 1-3 business days via email.
                </p>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Flagged via Google</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-sm">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span className="text-blue-600">Email Escalation Sent</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-4">
                  Check your inbox for a copy of the email and any responses from Google.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {step === 2 && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitToGoogle}
                  disabled={isSubmitting || !editedJustification.trim()}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit to Google
                    </>
                  )}
                </Button>
              </>
            )}
            {step === 3 && (
              <Button variant="outline" onClick={handleClose}>
                Skip Escalation
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleClose}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// FLAGGED REVIEWS VIEW (Removal Tracking Dashboard)
// ============================================================================

function FlaggedReviewsView({ projectId }) {
  const queryClient = useQueryClient()
  const [selectedReview, setSelectedReview] = useState(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  
  const { data: flaggedData, isLoading } = useQuery({
    queryKey: ['reputation', 'flagged', projectId],
    queryFn: async () => {
      const response = await reputationApi.getFlaggedReviews(projectId)
      return response.data
    },
    staleTime: 30000,
  })

  const handleUpdateStatus = async (reviewId, newStatus, notes = '') => {
    setIsUpdatingStatus(true)
    try {
      await reputationApi.updateRemovalStatus(reviewId, {
        status: newStatus,
        notes,
      })
      toast.success(`Status updated to ${newStatus}`)
      queryClient.invalidateQueries({ queryKey: ['reputation', 'flagged'] })
      queryClient.invalidateQueries({ queryKey: ['reputation'] })
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    removed: 'bg-green-500/10 text-green-500 border-green-500/20',
  }

  const statusLabels = {
    pending: 'Pending',
    submitted: 'Submitted to Google',
    rejected: 'Google Rejected',
    removed: 'Removed',
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const reviews = flaggedData?.reviews || []
  const stats = flaggedData?.stats || { pending: 0, submitted: 0, rejected: 0, removed: 0 }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Flag className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Flagged Reviews</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm">
          When you flag reviews for removal, they will appear here so you can track
          the removal process with Google.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          <div className="text-sm text-[var(--text-secondary)]">Pending</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-500">{stats.submitted}</div>
          <div className="text-sm text-[var(--text-secondary)]">Submitted</div>
        </div>
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
          <div className="text-sm text-[var(--text-secondary)]">Rejected</div>
        </div>
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
          <div className="text-2xl font-bold text-green-500">{stats.removed}</div>
          <div className="text-sm text-[var(--text-secondary)]">Removed</div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const reasonLabel = REMOVAL_REASONS.find(r => r.value === review.removal_reason)?.label || review.removal_reason
          
          return (
            <div
              key={review.id}
              className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--text-primary)]">{review.reviewer_name}</span>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                      <StarRating rating={review.rating} size="sm" />
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(review.review_date), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <Badge className={cn('border', statusColors[review.removal_status])}>
                  {statusLabels[review.removal_status]}
                </Badge>
              </div>

              {/* Review Text */}
              <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                {review.review_text}
              </p>

              {/* Removal Info */}
              <div className="p-3 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Flagged: {reasonLabel}
                  </span>
                </div>
                {review.removal_justification && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    <strong>Justification:</strong> {review.removal_justification}
                  </p>
                )}
                {review.removal_notes && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    <strong>Notes:</strong> {review.removal_notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {review.google_review_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(review.google_review_url, '_blank')}
                      className="text-[var(--text-secondary)]"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open in Google
                    </Button>
                  )}
                  {review.removal_justification && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(review.removal_justification)
                        toast.success('Justification copied to clipboard')
                      }}
                      className="text-[var(--text-secondary)]"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Justification
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {review.removal_status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(review.id, 'submitted')}
                      disabled={isUpdatingStatus}
                      className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Submitted
                    </Button>
                  )}
                  {review.removal_status === 'submitted' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(review.id, 'removed')}
                        disabled={isUpdatingStatus}
                        className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Removed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(review.id, 'rejected')}
                        disabled={isUpdatingStatus}
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// OVERVIEW STATS COMPONENT
// ============================================================================

function OverviewStats({ overview, loading }) {
  const stats = [
    {
      label: 'Total Reviews',
      value: overview?.totalReviews || 0,
      icon: MessageSquare,
    },
    {
      label: 'Avg Rating',
      value: overview?.averageRating?.toFixed(1) || '0.0',
      icon: Star,
    },
    {
      label: 'Pending Approval',
      value: overview?.pendingApproval || 0,
      icon: Clock,
    },
    {
      label: 'Response Rate',
      value: `${overview?.responseRate || 0}%`,
      icon: CheckCircle,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
        >
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-tertiary)]">{stat.label}</span>
                <stat.icon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PAGE MATCHING VIEW
// ============================================================================

function PageMatchingView({ projectId }) {
  const [pageMatches, setPageMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [selectedPage, setSelectedPage] = useState(null)

  useEffect(() => {
    loadPageMatches()
  }, [projectId])

  const loadPageMatches = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const response = await portalApi.get(`/reputation/projects/${projectId}/page-matches`)
      setPageMatches(response.data?.matches || [])
    } catch (error) {
      console.error('Failed to load page matches:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleReanalyze = async () => {
    if (!projectId) return
    setReanalyzing(true)
    try {
      const response = await portalApi.post(`/reputation/projects/${projectId}/page-matches/reanalyze`)
      toast.success(`Matched ${response.data?.matched || 0} of ${response.data?.total || 0} reviews`)
      await loadPageMatches()
    } catch (error) {
      console.error('Failed to reanalyze:', error)
      toast.error('Failed to reanalyze page matches')
    } finally {
      setReanalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review → Page Matching</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Reviews matched to SEO pages for intelligent site-kit embedding
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleReanalyze}
          disabled={reanalyzing}
          style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", reanalyzing && "animate-spin")} />
          {reanalyzing ? 'Analyzing...' : 'Re-analyze All'}
        </Button>
      </div>

      <div className="space-y-3">
        {pageMatches.map((match) => (
          <div
            key={match.page.id}
            className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 transition-colors cursor-pointer"
            onClick={() => setSelectedPage(selectedPage?.id === match.page.id ? null : match)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                  <span className="font-medium text-[var(--text-primary)]">{match.page.path}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                  {match.page.title || match.page.url}
                </p>
              </div>
              <div className="text-right">
                <Badge 
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  {match.reviews.length} reviews
                </Badge>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Avg: {match.avgRating.toFixed(1)} ⭐
                </p>
              </div>
            </div>

            {/* Expanded reviews */}
            <AnimatePresence>
              {selectedPage?.id === match.page.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-2">
                    {match.reviews.slice(0, 5).map((review) => (
                      <div 
                        key={review.id}
                        className="p-3 rounded-lg bg-[var(--glass-bg-inset)] text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <StarRating rating={review.rating} />
                          <span className="text-[var(--text-tertiary)]">
                            {review.reviewer_name || 'Anonymous'}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)] line-clamp-2">
                          {review.review_text}
                        </p>
                      </div>
                    ))}
                    {match.reviews.length > 5 && (
                      <p className="text-xs text-center text-[var(--text-tertiary)]">
                        +{match.reviews.length - 5} more reviews
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {pageMatches.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No page matches found yet.</p>
            <p className="text-sm">Reviews will be matched to SEO pages automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// RESPONSE QUEUE VIEW
// ============================================================================

function ResponseQueueView({ projectId, settings, onApprove, onReject }) {
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingReviews()
  }, [projectId])

  const loadPendingReviews = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const response = await portalApi.get(`/reputation/projects/${projectId}/reviews`, {
        params: { pendingApproval: true }
      })
      setPendingReviews(response.data?.reviews || [])
    } catch (error) {
      console.error('Failed to load pending reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkApprove = async () => {
    try {
      await portalApi.post(`/reputation/projects/${projectId}/responses/bulk-approve`, {
        reviewIds: pendingReviews.map(r => r.id)
      })
      toast.success(`Approved ${pendingReviews.length} responses`)
      loadPendingReviews()
    } catch (error) {
      toast.error('Failed to approve responses')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Response Queue</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {pendingReviews.length} responses pending your approval
          </p>
        </div>
        {pendingReviews.length > 0 && (
          <Button 
            onClick={handleBulkApprove}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {pendingReviews.map((review) => (
          <div
            key={review.id}
            className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    {review.reviewer_name || 'Anonymous'}
                  </span>
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {review.review_text}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Signal-Generated Response
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {review.pending_response}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onApprove?.(review)}
                style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Approve & Post
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject?.(review)}
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
              >
                <FileText className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        ))}

        {pendingReviews.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No responses pending approval!</p>
            <p className="text-sm">All Signal-generated responses have been reviewed.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SETTINGS PANEL
// ============================================================================

function AutoResponseSettingsPanel({ projectId, settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(settings || {})
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await portalApi.put(`/reputation/projects/${projectId}/settings`, localSettings)
      onSettingsChange?.(localSettings)
      toast.success('Settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const ratingActions = [
    { rating: 5, label: '5-Star Reviews', key: 'rating_5_action' },
    { rating: 4, label: '4-Star Reviews', key: 'rating_4_action' },
    { rating: 3, label: '3-Star Reviews', key: 'rating_3_action' },
    { rating: 2, label: '2-Star Reviews', key: 'rating_2_action' },
    { rating: 1, label: '1-Star Reviews', key: 'rating_1_action' },
  ]

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          Signal Auto-Response
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure how Signal handles automatic review responses
        </p>
      </div>

      {/* Response Mode by Rating */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">Response Mode by Rating</h4>
        
        {ratingActions.map(({ rating, label, key }) => (
          <div 
            key={key}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
          >
            <div className="flex items-center gap-3">
              <StarRating rating={rating} />
              <span className="text-sm text-[var(--text-primary)]">{label}</span>
            </div>
            <Select
              value={localSettings[key] || 'auto'}
              onValueChange={(value) => setLocalSettings({ ...localSettings, [key]: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">
                    <Zap className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />
                    Auto-Post
                  </span>
                </SelectItem>
                <SelectItem value="queue">
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Queue for Approval
                  </span>
                </SelectItem>
                <SelectItem value="manual">
                  <span className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-[var(--text-tertiary)]" />
                    Manual Only
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Delay Setting */}
      <div className="p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <Label className="text-sm text-[var(--text-primary)]">Auto-Response Delay</Label>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          Time to wait before posting auto-approved responses
        </p>
        <Select
          value={String(localSettings.auto_response_delay_minutes || 5)}
          onValueChange={(value) => setLocalSettings({ 
            ...localSettings, 
            auto_response_delay_minutes: parseInt(value) 
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Immediately</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
        style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}

// ============================================================================
// HEALTH SCORE SECTION
// ============================================================================

function HealthScoreSection({ healthScore }) {
  if (!healthScore) return null

  const score = healthScore.overall_score || 0
  const getScoreColor = (s) => {
    if (s >= 80) return 'var(--brand-primary)'
    if (s >= 60) return '#eab308' // yellow
    if (s >= 40) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Excellent'
    if (s >= 60) return 'Good'
    if (s >= 40) return 'Fair'
    return 'Needs Attention'
  }

  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)]">Reputation Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Score Gauge */}
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                className="stroke-[var(--glass-border)]"
                strokeWidth="8"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                stroke={getScoreColor(score)}
                strokeWidth="8"
                strokeLinecap="round"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
                strokeDasharray={`${(score / 100) * 264} 264`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
              <span className="text-xs text-[var(--text-tertiary)]">/ 100</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Average Rating</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {healthScore.average_rating?.toFixed(1) || '0.0'} ⭐
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Response Rate</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {healthScore.response_rate || 0}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Total Reviews</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {healthScore.total_reviews || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Status</p>
              <Badge 
                variant="outline"
                style={{ borderColor: getScoreColor(score), color: getScoreColor(score) }}
              >
                {getScoreLabel(score)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SENTIMENT BREAKDOWN SECTION
// ============================================================================

function SentimentBreakdownSection({ sentimentBreakdown, ratingBreakdown, totalReviews }) {
  if (!sentimentBreakdown && !ratingBreakdown) return null

  const sentiment = sentimentBreakdown || { positive: 0, neutral: 0, negative: 0 }
  const total = totalReviews || (sentiment.positive + sentiment.neutral + sentiment.negative)

  const getPercentage = (count) => total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Sentiment Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-secondary)]">Sentiment</h4>
            
            {/* Positive */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">😊 Positive</span>
                <span className="text-[var(--text-primary)] font-medium">{sentiment.positive} ({getPercentage(sentiment.positive)}%)</span>
              </div>
              <div className="h-2 bg-[var(--glass-border)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(sentiment.positive)}%` }}
                />
              </div>
            </div>

            {/* Neutral */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">😐 Neutral</span>
                <span className="text-[var(--text-primary)] font-medium">{sentiment.neutral} ({getPercentage(sentiment.neutral)}%)</span>
              </div>
              <div className="h-2 bg-[var(--glass-border)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(sentiment.neutral)}%` }}
                />
              </div>
            </div>

            {/* Negative */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">😞 Negative</span>
                <span className="text-[var(--text-primary)] font-medium">{sentiment.negative} ({getPercentage(sentiment.negative)}%)</span>
              </div>
              <div className="h-2 bg-[var(--glass-border)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${getPercentage(sentiment.negative)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          {ratingBreakdown && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[var(--text-secondary)]">Rating Distribution</h4>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingBreakdown[rating] || 0
                const pct = getPercentage(count)
                return (
                  <div key={rating} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] flex items-center gap-1">
                        {rating} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </span>
                      <span className="text-[var(--text-primary)] font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-[var(--glass-border)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${pct}%`,
                          backgroundColor: rating >= 4 ? '#22c55e' : rating === 3 ? '#eab308' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ALERTS SECTION
// ============================================================================

function AlertsSection({ alerts }) {
  if (!alerts?.length) return null

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-500">
          <AlertCircle className="h-4 w-4" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {alert}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CAMPAIGNS VIEW
// ============================================================================

function CampaignsView({ projectId }) {
  // TODO: Implement with React Query hooks
  const campaigns = []
  const campaignsLoading = false
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  if (campaignsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review Campaigns</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Request reviews from your customers via SMS or email
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
        >
          <Send className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[var(--text-primary)]">{campaign.name}</span>
                    <Badge 
                      variant="outline"
                      className={cn(
                        campaign.status === 'active' 
                          ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                          : 'border-[var(--text-tertiary)] text-[var(--text-tertiary)]'
                      )}
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-sm text-[var(--text-secondary)]">{campaign.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {campaign.totalSent || 0} sent
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {campaign.totalReviews || 0} reviews
                    </p>
                  </div>
                  {campaign.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => pauseCampaign(campaign.id)}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => activateCampaign(campaign.id)}
                      style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No campaigns yet</p>
            <p className="text-sm">Create a campaign to start requesting reviews</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TEMPLATES VIEW
// ============================================================================

function TemplatesView({ projectId }) {
  // TODO: Implement with React Query hooks
  const templates = []
  const templatesLoading = false

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Response Templates</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Pre-written responses for quick replies
          </p>
        </div>
        <Button 
          style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
        >
          <FileText className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--text-primary)]">{template.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {template.forRatingMin}-{template.forRatingMax} stars
                  </Badge>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                  >
                    Used {template.useCount || 0}x
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                {template.templateText}
              </p>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No templates yet</p>
            <p className="text-sm">Create templates for faster review responses</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PLATFORMS VIEW
// ============================================================================

function PlatformsView({
  projectId,
  platforms = [],
  platformsLoading = false,
  onConnectGoogle,
  onConnectFacebook,
  onConnectTrustpilot,
  onConnectYelp,
  onSyncPlatform,
}) {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = (platformType) => {
    setConnecting(true)
    try {
      if (platformType === 'google') onConnectGoogle?.()
      else if (platformType === 'facebook') onConnectFacebook?.()
      else if (platformType === 'trustpilot') onConnectTrustpilot?.()
      else if (platformType === 'yelp') onConnectYelp?.()
      else toast.info('Platform connection coming soon')
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (platformId) => {
    try {
      await onSyncPlatform?.(platformId)
    } catch (error) {
      toast.error('Failed to sync platform')
    }
  }

  const platformConfig = {
    google: { name: 'Google Business Profile', icon: '🔵', requiresOAuth: true },
    yelp: { name: 'Yelp', icon: '🔴', requiresOAuth: false },
    facebook: { name: 'Facebook', icon: '🔷', requiresOAuth: true },
    trustpilot: { name: 'Trustpilot', icon: '🟢', requiresOAuth: true },
  }

  if (platformsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Connected Platforms</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your review platform connections
        </p>
      </div>

      {/* Connected Platforms */}
      <div className="space-y-3">
        {platforms.map((platform) => {
          const config = platformConfig[platform.platformType] || { name: platform.platformType, icon: '⭐' }
          return (
            <Card key={platform.id} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{config.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          platform.isConnected ? 'bg-[var(--brand-primary)]' : 'bg-red-500'
                        )} />
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {platform.isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {platform.totalReviews || 0} reviews
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {platform.averageRating?.toFixed(1) || '0.0'} avg
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSync(platform.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {platforms.length === 0 && (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No platforms connected yet</p>
          </div>
        )}
      </div>

      {/* Add Platform */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] border-dashed">
        <CardContent className="p-4">
          <h3 className="font-medium text-[var(--text-primary)] mb-3">Connect a Platform</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(platformConfig).map(([key, config]) => {
              const isConnected = platforms.some(p => p.platformType === key && p.isConnected)
              return (
                <Button
                  key={key}
                  variant="outline"
                  disabled={isConnected || connecting}
                  onClick={() => handleConnect(key)}
                  className="justify-start"
                >
                  <span className="mr-2">{config.icon}</span>
                  {config.name}
                  {isConnected && <CheckCircle className="h-4 w-4 ml-auto text-[var(--brand-primary)]" />}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function ReputationModule({ onNavigate }) {
  const { currentProject } = useAuthStore()
  const brandColors = useBrandColors()
  const { hasSignalAccess } = useSignalAccess()
  
  const projectId = currentProject?.id
  
  // React Query hooks (migrated from Zustand store)
  const { data: overviewData, isLoading: overviewLoading } = useReputationOverview(projectId)
  const overview = overviewData || {}
  
  const { data: settingsData, isLoading: settingsLoading } = useReputationSettings(projectId)
  const settings = settingsData || {}
  
  // Local state for UI
  const [selectedReview, setSelectedReview] = useState(null)
  const [sentimentFilter, setSentimentFilter] = useState('') // '' | 'positive' | 'negative'
  const [ratingFilter, setRatingFilter] = useState(null) // null | 1..5 for star filter
  
  // Helper to select review by ID (or null to deselect)
  const selectReview = (reviewId) => {
    if (!reviewId) {
      setSelectedReview(null)
      return
    }
    const review = reviews.find(r => r.id === reviewId)
    setSelectedReview(review || null)
  }

  // UI State
  const [currentView, setCurrentView] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Build API filters from view + sentiment + stars + search
  const reviewsFilters = useMemo(() => {
    const f = {}
    if (currentView === 'pending') f.pendingApproval = true
    else if (currentView === 'responded') f.responded = true
    else if (currentView === 'archived') f.status = 'archived'
    if (sentimentFilter) f.sentiment = sentimentFilter
    if (ratingFilter != null && ratingFilter >= 1 && ratingFilter <= 5) f.rating = ratingFilter
    if (searchQuery?.trim()) f.search = searchQuery.trim()
    return f
  }, [currentView, sentimentFilter, ratingFilter, searchQuery])

  const { data: reviewsData, isLoading: reviewsLoading } = useReviews(projectId, reviewsFilters)
  const reviews = reviewsData?.reviews || []
  const reviewsTotal = reviewsData?.total || 0
  
  // OAuth Dialog State
  const [isGoogleDialogOpen, setIsGoogleDialogOpen] = useState(false)
  const [isFacebookDialogOpen, setIsFacebookDialogOpen] = useState(false)
  const [isTrustpilotDialogOpen, setIsTrustpilotDialogOpen] = useState(false)
  const [isYelpDialogOpen, setIsYelpDialogOpen] = useState(false)

  // GBP location selection (after unified OAuth return with multiple locations)
  const [gbpLocationConnectionId, setGbpLocationConnectionId] = useState(null)
  const queryClient = useQueryClient()
  
  useEffect(() => {
    if (!projectId) return
    const params = new URLSearchParams(window.location.search)
    const selectLocation = params.get('selectLocation')
    const connId = params.get('connectionId')
    const connected = params.get('connected')
    if (connId && connected === 'google') {
      const url = new URL(window.location.href)
      url.searchParams.delete('connectionId')
      url.searchParams.delete('connected')
      url.searchParams.delete('selectLocation')
      url.searchParams.delete('locationCount')
      url.searchParams.delete('modules')
      window.history.replaceState({}, '', url.toString())
      if (selectLocation === 'true') {
        setGbpLocationConnectionId(connId)
      } else {
        reputationApi.linkGoogleConnection(projectId, connId)
          .then(() => {
            toast.success('Google Business Profile connected')
            queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
            queryClient.invalidateQueries({ queryKey: reputationKeys.overview(projectId) })
          })
          .catch((err) => {
            console.error('Link Google connection failed:', err)
            toast.error(err.response?.data?.message || 'Failed to link Google connection')
          })
      }
    }
  }, [projectId, queryClient])

  const handleGbpLocationSelected = async (selectedLocation) => {
    // selectedLocation is the location object from GbpLocationSelector
    // gbpLocationConnectionId is the connection ID we stored when opening the selector
    const connId = gbpLocationConnectionId
    if (!projectId || !connId) return
    setGbpLocationConnectionId(null)
    try {
      await reputationApi.linkGoogleConnection(projectId, connId)
      toast.success('Google Business Profile connected')
      queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
      queryClient.invalidateQueries({ queryKey: reputationKeys.overview(projectId) })
    } catch (err) {
      console.error('Link Google connection failed:', err)
      toast.error(err.response?.data?.message || 'Failed to link Google connection')
    }
  }
  
  // Sidebar sections open state
  const [reviewsOpen, setReviewsOpen] = useState(true)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [automationOpen, setAutomationOpen] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: reputationKeys.overview(projectId) })
      await queryClient.invalidateQueries({ queryKey: reputationKeys.reviews(projectId) })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleApprove = async (review) => {
    try {
      await reputationApi.approveResponse(review.id)
      toast.success('Response approved and posted!')
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviews(projectId) })
    } catch (error) {
      console.error('Failed to approve response:', error)
      toast.error('Failed to approve response')
    }
  }

  const handleReject = async (review) => {
    try {
      await reputationApi.rejectResponse(review.id)
      toast.success('Response rejected')
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviews(projectId) })
    } catch (error) {
      console.error('Failed to reject response:', error)
      toast.error('Failed to reject response')
    }
  }

  const handleGenerateResponse = async (review) => {
    try {
      const response = await reputationApi.generateResponse(review.id)
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviews(projectId) })
      toast.success('Response generated')
      return response.data.response_text
    } catch (error) {
      console.error('Failed to generate response:', error)
      toast.error('Failed to generate response')
      return null
    }
  }

  const handlePostResponse = async (review, text) => {
    try {
      await reputationApi.respondToReview(review.id, { response: text })
      toast.success('Response posted')
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviews(projectId) })
    } catch (error) {
      toast.error('Failed to post response')
    }
  }

  // Determine what content to show based on view
  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <OverviewStats overview={overview} loading={overviewLoading} />
            <HealthScoreSection healthScore={overview?.healthScore} />
            <SentimentBreakdownSection 
              sentimentBreakdown={overview?.sentimentBreakdown}
              ratingBreakdown={overview?.ratingBreakdown}
              totalReviews={overview?.totalReviews}
            />
            <AlertsSection alerts={overview?.healthScore?.alerts} />
          </div>
        )
      case 'page-match':
        return <PageMatchingView projectId={projectId} />
      case 'response-queue':
        return (
          <ResponseQueueView 
            projectId={projectId} 
            settings={settings}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )
      case 'campaigns':
        return <CampaignsView projectId={projectId} />
      case 'templates':
        return <TemplatesView projectId={projectId} />
      case 'platforms':
        return (
          <PlatformsView
            projectId={projectId}
            platforms={platforms}
            platformsLoading={overviewLoading}
            onConnectGoogle={() => setIsGoogleDialogOpen(true)}
            onConnectFacebook={() => setIsFacebookDialogOpen(true)}
            onConnectTrustpilot={() => setIsTrustpilotDialogOpen(true)}
            onConnectYelp={() => setIsYelpDialogOpen(true)}
            onSyncPlatform={handleSyncPlatform}
          />
        )
      case 'pending':
      case 'responded':
      case 'archived':
        // API already returns filtered set via reviewsFilters
        return renderReviewsList(reviews)
      case 'flagged':
        return <FlaggedReviewsView projectId={projectId} />
      default:
        return renderReviewsList(reviews)
    }
  }

  const renderReviewsList = (filteredReviews) => {
    const showApprovalActions = currentView === 'pending' || currentView === 'all'

    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Filter bar: sentiment + stars */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Filter:</span>
          <div className="flex items-center gap-1">
            <Button
              variant={sentimentFilter === '' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setSentimentFilter('')}
            >
              All
            </Button>
            <Button
              variant={sentimentFilter === 'positive' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setSentimentFilter('positive')}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" />
              Positive
            </Button>
            <Button
              variant={sentimentFilter === 'negative' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setSentimentFilter('negative')}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
              Negative
            </Button>
          </div>
          <span className="text-sm text-[var(--text-tertiary)]">|</span>
          <div className="flex items-center gap-1">
            <Button
              variant={ratingFilter == null ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setRatingFilter(null)}
            >
              All stars
            </Button>
            {[5, 4, 3, 2, 1].map((stars) => (
              <Button
                key={stars}
                variant={ratingFilter === stars ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 min-w-[2rem]"
                onClick={() => setRatingFilter(ratingFilter === stars ? null : stars)}
              >
                <Star className="h-3.5 w-3.5 fill-current mr-0.5" />
                {stars}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
        {/* Reviews List */}
        <div className="flex-1 min-w-0">
          <Card className="h-full bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {reviewsLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isSelected={selectedReview?.id === review.id}
                    onClick={() => selectReview(review.id)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    showApprovalActions={showApprovalActions}
                  />
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No reviews found"
                  description="Reviews from your connected platforms will appear here."
                  echoPrompt="How do I get more customer reviews?"
                  echoActions={[
                    { label: 'Get more reviews', prompt: 'What are effective ways to get more customer reviews?' },
                    { label: 'Review request message', prompt: 'Write a message asking a happy customer to leave a review' },
                    { label: 'Connect platforms', prompt: 'How do I connect Google or Yelp to pull in my reviews?' },
                  ]}
                />
              )}
            </div>
          </Card>
        </div>

        {/* Review Detail Panel */}
        {selectedReview && (
          <Card className="w-[400px] shrink-0 bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <ReviewDetailPanel
              review={selectedReview}
              settings={settings}
              onClose={() => selectReview(null)}
              onGenerateResponse={handleGenerateResponse}
              onApprove={handleApprove}
              onReject={handleReject}
              onPostResponse={handlePostResponse}
            />
          </Card>
        )}
        </div>
      </div>
    )
  }

  // Connected platforms for sidebar display
  const { data: platformsData } = useReputationPlatforms(projectId)
  const platforms = platformsData?.platforms || []
  const [syncingPlatform, setSyncingPlatform] = useState(null)

  const handleSyncPlatform = async (platformId) => {
    setSyncingPlatform(platformId)
    try {
      const result = await reputationApi.syncPlatform(platformId)
      toast.success(`Synced ${result.data?.newReviews || 0} new reviews`)
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviews(projectId) })
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error(error.response?.data?.message || 'Sync failed')
    } finally {
      setSyncingPlatform(null)
    }
  }

  // Platform config for display
  const platformConfig = {
    google: { name: 'Google', color: '#4285f4' },
    yelp: { name: 'Yelp', color: '#d32323' },
    facebook: { name: 'Facebook', color: '#1877f2' },
    trustpilot: { name: 'Trustpilot', color: '#00b67a' },
  }

  const headerSubtitle = hasSignalAccess ? 'Reviews & Signal' : undefined
  const headerActions = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <Input
          type="text"
          placeholder="Search reviews..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-64 h-8 bg-[var(--glass-bg)] border-[var(--glass-border)]"
        />
      </div>
      <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8">
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="h-8">
        <Settings className="h-4 w-4" />
      </Button>
    </>
  )

  const leftSidebarContent = (
                <ScrollArea className="h-full py-4">
                  <nav className="space-y-1 px-2">
                    {/* Reviews Section */}
                  <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
                    <CollapsibleTrigger data-tour="reputation-reviews" className="flex items-center justify-between w-full px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Reviews
                      </span>
                      {reviewsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {SIDEBAR_SECTIONS.reviews.views.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-6 py-2 transition-colors',
                            currentView === view.id
                              ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                          )}
                        >
                          <view.icon className="h-4 w-4" />
                          {view.label}
                          {view.id === 'pending' && overview?.pendingApproval > 0 && (
                            <Badge 
                              className="ml-auto"
                              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                            >
                              {overview.pendingApproval}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Insights Section */}
                  <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
                    <CollapsibleTrigger data-tour="reputation-insights" className="flex items-center justify-between w-full px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Insights
                      </span>
                      {insightsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {SIDEBAR_SECTIONS.insights.views.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-6 py-2 transition-colors',
                            currentView === view.id
                              ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                          )}
                        >
                          <view.icon className="h-4 w-4" />
                          {view.label}
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Automation Section */}
                  <Collapsible open={automationOpen} onOpenChange={setAutomationOpen}>
                    <CollapsibleTrigger data-tour="reputation-request" className="flex items-center justify-between w-full px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Automation
                      </span>
                      {automationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {SIDEBAR_SECTIONS.automation.views.map((view) => (
                        <button
                          key={view.id}
                          onClick={() => setCurrentView(view.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-6 py-2 transition-colors',
                            currentView === view.id
                              ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                          )}
                        >
                          <view.icon className="h-4 w-4" />
                          {view.label}
                        </button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  </nav>

                  {/* Integrations Section (like Commerce) */}
                  <div className="mt-6 px-2" data-tour="reputation-widget">
                    <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      Integrations
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-[var(--glass-bg-hover)]"
                        onClick={() => setCurrentView('platforms')}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Google Business Profile */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'google')?.isConnected ? '#4285f4' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Google</span>
                        {(() => {
                          const googlePlatform = platforms.find(p => p.platformType === 'google')
                          if (googlePlatform?.isConnected) {
                            return (
                              <div className="flex items-center gap-1 ml-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                  onClick={() => handleSyncPlatform(googlePlatform.id, 'Google')}
                                  disabled={syncingPlatform === googlePlatform.id}
                                >
                                  {syncingPlatform === googlePlatform.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                </Button>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{ backgroundColor: '#4285f415', color: '#4285f4', borderColor: '#4285f430' }}
                                >
                                  {googlePlatform.lastSyncAt ? 'Synced' : 'Connected'}
                                </Badge>
                              </div>
                            )
                          }
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                              onClick={() => setIsGoogleDialogOpen(true)}
                            >
                              Connect
                            </Button>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Facebook */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'facebook')?.isConnected ? '#1877f2' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Facebook</span>
                        {platforms.find(p => p.platformType === 'facebook')?.isConnected ? (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto"
                            style={{ backgroundColor: '#1877f215', color: '#1877f2', borderColor: '#1877f230' }}
                          >
                            Synced
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                            onClick={() => setIsFacebookDialogOpen(true)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Yelp */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'yelp')?.isConnected ? '#d32323' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Yelp</span>
                        {platforms.find(p => p.platformType === 'yelp')?.isConnected ? (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto"
                            style={{ backgroundColor: '#d3232315', color: '#d32323', borderColor: '#d3232330' }}
                          >
                            Synced
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                            onClick={() => setIsYelpDialogOpen(true)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Trustpilot */}
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: platforms.find(p => p.platformType === 'trustpilot')?.isConnected ? '#00b67a' : 'var(--text-tertiary)' }}
                        />
                        <span className="text-sm text-[var(--text-primary)]">Trustpilot</span>
                        {platforms.find(p => p.platformType === 'trustpilot')?.isConnected ? (
                          <Badge
                            variant="outline"
                            className="text-xs ml-auto"
                            style={{ backgroundColor: '#00b67a15', color: '#00b67a', borderColor: '#00b67a30' }}
                          >
                            Synced
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
                            onClick={() => setIsTrustpilotDialogOpen(true)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className="px-3 py-3 mt-2 bg-[var(--glass-bg-inset)] rounded-lg mx-1">
                      <div className="flex items-center gap-2 text-xs">
                        {platforms.filter(p => p.isConnected).length > 0 ? (
                          <>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
                            <span className="text-[var(--text-secondary)]">
                              {platforms.filter(p => p.isConnected).length} platform{platforms.filter(p => p.isConnected).length !== 1 ? 's' : ''} connected
                            </span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3 text-[var(--text-tertiary)]" />
                            <span className="text-[var(--text-tertiary)]">No platforms connected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
  )

  return (
    <TooltipProvider>
      <ModuleLayout ariaLabel="Reputation" leftSidebar={leftSidebarContent} defaultLeftSidebarOpen={true}>
        <ModuleLayout.Header title="Reputation" icon={MODULE_ICONS.reputation} subtitle={headerSubtitle} actions={headerActions} data-tour="reputation-overview" />
        <ModuleLayout.Content>
            {/* Sub-header with stats */}
            <div className="px-6 py-3 border-b border-[var(--glass-border)] bg-muted/5">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">{reviewsTotal || 0}</strong> reviews
                </span>
                <span className="text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">{overview?.averageRating?.toFixed(1) || '0.0'}</strong> avg rating
                </span>
                {overview?.pendingApproval > 0 && (
                  <Badge
                    className="text-xs"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)', color: 'var(--brand-primary)' }}
                  >
                    {overview.pendingApproval} pending approval
                  </Badge>
                )}
                <span className="text-[var(--text-tertiary)] ml-auto flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {platforms.filter(p => p.isConnected).length} platforms connected
                </span>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              <SignalSuggestsPanel module="reputation" className="mb-4" />
              {renderContent()}
            </div>
        </ModuleLayout.Content>
      </ModuleLayout>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md bg-[var(--glass-bg-elevated)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                Auto-Response Settings
              </DialogTitle>
              <DialogDescription>
                Configure Signal's automatic review response behavior
              </DialogDescription>
            </DialogHeader>
            <AutoResponseSettingsPanel
              projectId={projectId}
              settings={settings}
              onSettingsChange={(newSettings) => {
                queryClient.invalidateQueries({ queryKey: reputationKeys.settings(projectId) })
              }}
            />
          </DialogContent>
        </Dialog>

        {/* OAuth Dialogs */}
        <GoogleOAuthDialog
          open={isGoogleDialogOpen}
          onOpenChange={setIsGoogleDialogOpen}
          projectId={projectId}
          onSuccess={({ connectionId, selectLocation }) => {
            setIsGoogleDialogOpen(false)
            if (selectLocation && connectionId) {
              // Need to select a GBP location
              setGbpLocationConnectionId(connectionId)
            } else if (connectionId) {
              // Single location, link directly
              reputationApi.linkGoogleConnection(projectId, connectionId)
                .then(() => {
                  toast.success('Google Business Profile connected')
                  queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
                  queryClient.invalidateQueries({ queryKey: reputationKeys.overview(projectId) })
                })
                .catch((err) => {
                  console.error('Link Google connection failed:', err)
                  toast.error(err.response?.data?.message || 'Failed to link Google connection')
                })
            } else {
              queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
            }
          }}
        />
        <FacebookOAuthDialog
          open={isFacebookDialogOpen}
          onOpenChange={setIsFacebookDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsFacebookDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
          }}
        />
        <TrustpilotOAuthDialog
          open={isTrustpilotDialogOpen}
          onOpenChange={setIsTrustpilotDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsTrustpilotDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
          }}
        />
        <YelpApiKeyDialog
          open={isYelpDialogOpen}
          onOpenChange={setIsYelpDialogOpen}
          projectId={projectId}
          onSuccess={() => {
            setIsYelpDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
          }}
        />

        {/* GBP location selection (after OAuth when account has multiple business locations) */}
        <GbpLocationSelector
          isOpen={!!gbpLocationConnectionId}
          onClose={() => setGbpLocationConnectionId(null)}
          connectionId={gbpLocationConnectionId}
          onLocationSelected={handleGbpLocationSelected}
        />
    </TooltipProvider>
  )
}
