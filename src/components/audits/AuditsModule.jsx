// src/components/audits/AuditsModule.jsx
// Uses ModuleLayout for consistent shell (left filters, center list, right detail panel).
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  ExternalLink,
  Loader2,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  User,
  Users,
  Globe,
  Building2,
  Mail,
  Smartphone,
  Monitor,
  TrendingUp,
  Trash2,
  Zap,
  Search,
  Shield,
  Maximize2,
  ArrowLeft,
  RefreshCw,
  FileText
} from 'lucide-react'
import { useProjects, projectsKeys, useAllAudits, useAudit, useRequestAudit, useDeleteAudit, getAuditStatusBadge, reportsKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { auditsApi } from '@/lib/portal-api'
import { toast } from '@/lib/toast'
import AuditPublicView from '@/components/AuditPublicView'
import ProposalAIDialog from '@/components/proposals/ProposalAIDialog'
import { EmptyState } from '@/components/EmptyState'

// Helper: Check if audit is completed (handles both 'complete' and 'completed' statuses)
const isAuditCompleted = (status) => status === 'completed' || status === 'complete'

// Helper: Normalize URL input to ensure it has a protocol
const normalizeUrl = (input) => {
  if (!input) return ''
  let url = input.trim()
  // If no protocol, add https://
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url
  }
  return url
}

// Helper: Get numeric score from audit (handles both naming conventions)
const getScore = (audit, key) => {
  const map = {
    performance: audit.performanceScore ?? audit.scorePerformance,
    seo: audit.seoScore ?? audit.scoreSeo,
    accessibility: audit.accessibilityScore ?? audit.scoreAccessibility,
    bestPractices: audit.bestPracticesScore ?? audit.scoreBestPractices
  }
  const v = map[key]
  return v != null ? Number(v) : null
}

// Helper: All four scores >= 90
const isPassed = (audit) => {
  if (!isAuditCompleted(audit.status)) return false
  const scores = ['performance', 'seo', 'accessibility', 'bestPractices'].map(k => getScore(audit, k))
  return scores.every(s => s != null && s >= 90)
}

// Helper: Completed but any score < 90
const needsAttention = (audit) => {
  if (!isAuditCompleted(audit.status)) return false
  const scores = ['performance', 'seo', 'accessibility', 'bestPractices'].map(k => getScore(audit, k))
  return scores.some(s => s != null && s < 90)
}

const VIEW_FILTERS = [
  { id: 'all', label: 'All', icon: BarChart3 },
  { id: 'passed', label: 'Passed', icon: CheckCircle2 },
  { id: 'failed', label: 'Failed', icon: XCircle },
  { id: 'in_progress', label: 'In progress', icon: Clock },
  { id: 'needs_attention', label: 'Needs attention', icon: AlertCircle },
  { id: 'with_prospect', label: 'With prospect', icon: Users },
  { id: 'without_prospect', label: 'Without prospect', icon: Globe }
]

// Full-page audit report view (route: /audits/:id)
function AuditDetailRoute() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: currentAudit, isLoading, error, refetch } = useAudit(id)

  if (isLoading && !currentAudit) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading audit report...</p>
        </div>
      </div>
    )
  }

  if (error || (!currentAudit && !isLoading)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error?.message || 'Audit not found'}</AlertDescription>
        </Alert>
        <Button variant="glass" onClick={() => navigate('/audits')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>
      </div>
    )
  }

  if (currentAudit?.status === 'pending' || currentAudit?.status === 'running') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="glass" onClick={() => navigate('/audits')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>
        <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 mx-auto text-[var(--brand-primary)] mb-4" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Audit Processing</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              Your audit for <span className="font-medium">{currentAudit.targetUrl}</span> is being analyzed.
            </p>
            <Button onClick={() => refetch()} variant="glass">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentAudit?.status === 'failed') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="glass" onClick={() => navigate('/audits')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>
        <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
          <CardContent className="py-12 text-center">
            <XCircle className="w-16 h-16 mx-auto text-[var(--accent-error)] mb-4" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Audit Failed</h2>
            <p className="text-[var(--text-secondary)]">We encountered an issue analyzing this URL.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-[var(--glass-border)] flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/audits')} className="m-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Audits
        </Button>
      </div>
      <AuditPublicView audit={currentAudit} contact={currentAudit?.contact || currentAudit?.prospect} />
    </div>
  )
}

// Mini score circle component for overview
function ScoreCircle({ score, label, icon: Icon }) {
  if (score === null || score === undefined) return null
  
  const getColor = (s) => {
    if (s >= 90) return { stroke: 'var(--accent-success)', text: 'text-[var(--accent-success)]' }
    if (s >= 50) return { stroke: 'var(--accent-warning)', text: 'text-[var(--accent-warning)]' }
    return { stroke: 'var(--accent-error)', text: 'text-[var(--accent-error)]' }
  }
  
  const colors = getColor(score)
  const circumference = 2 * Math.PI * 13 // radius = 13
  const offset = circumference - (score / 100) * circumference
  
  return (
    <div className="flex flex-col items-center gap-0" title={`${label}: ${score}`}>
      <div className="relative w-9 h-9">
        <svg className="w-9 h-9 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="13"
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth="2.5"
          />
          <circle
            cx="18"
            cy="18"
            r="13"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${colors.text}`}>
          {score}
        </div>
      </div>
      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
    </div>
  )
}

// Admin-only audit row component with magic link and analytics
function AdminAuditRow({ audit, navigate, getStatusIcon, getScoreColor, getAuditStatusBadge, onDelete, onSelect, onCreateProposal }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showFullAudit, setShowFullAudit] = useState(false)
  const [fullAuditData, setFullAuditData] = useState(null)
  const [loadingFullAudit, setLoadingFullAudit] = useState(false)
  
  // Email sending state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailRecipientName, setEmailRecipientName] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [magicLink, setMagicLink] = useState(audit.magicLink || (audit.magicToken ? 
    `${window.location.origin}/audit/${audit.id}?token=${audit.magicToken}` : null
  ))
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const statusBadge = getAuditStatusBadge(audit.status)

  // Handle sending audit email
  const handleSendEmail = async (e) => {
    e?.preventDefault()
    if (!emailRecipient) {
      toast.error('Please enter recipient email')
      return
    }
    
    setIsSendingEmail(true)
    try {
      const { data } = await auditsApi.sendEmail({
        auditId: audit.id,
        recipientEmail: emailRecipient,
        recipientName: emailRecipientName || null
      })
      
      if (data.success) {
        toast.success('Audit email sent successfully!')
        setShowEmailModal(false)
        setEmailRecipient('')
        setEmailRecipientName('')
        // Update magic link if returned
        if (data.magicLink) {
          setMagicLink(data.magicLink)
        }
      } else {
        toast.error(data.error || 'Failed to send email')
      }
    } catch (err) {
      console.error('Failed to send audit email:', err)
      toast.error(err.response?.data?.error || 'Failed to send email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Handle delete
  const handleDelete = async (e) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      const result = await onDelete(audit.id)
      if (result.success) {
        toast.success('Audit deleted')
      } else {
        toast.error(result.error || 'Failed to delete audit')
      }
    } catch (err) {
      toast.error('Failed to delete audit')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Generate or get magic link
  const handleGetMagicLink = async (e) => {
    e.stopPropagation()
    
    if (magicLink) {
      // Copy existing link
      copyToClipboard()
      return
    }

    setIsGenerating(true)
    try {
      const { data } = await auditsApi.generateMagicLink({
        auditId: audit.id
      })
      
      if (data.magicLink) {
        setMagicLink(data.magicLink)
        await navigator.clipboard.writeText(data.magicLink)
        setCopied(true)
        toast.success('Magic link created and copied!')
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to generate magic link:', err)
      toast.error('Failed to generate magic link')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!magicLink) return
    try {
      await navigator.clipboard.writeText(magicLink)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  // Load analytics and audit preview when expanded
  const handleToggle = async () => {
    const newState = !isOpen
    setIsOpen(newState)
    
    if (newState && isAuditCompleted(audit.status)) {
      // Load analytics
      if (!analytics) {
        setLoadingAnalytics(true)
        try {
          const { data } = await auditsApi.getAnalytics(audit.id)
          setAnalytics(data)
        } catch (err) {
          console.error('Failed to load analytics:', err)
        } finally {
          setLoadingAnalytics(false)
        }
      }
      
      // Load full audit data for preview
      if (!fullAuditData) {
        setLoadingFullAudit(true)
        try {
          const { data } = await auditsApi.get(audit.id)
          setFullAuditData(data.audit)
        } catch (err) {
          console.error('Failed to load audit data:', err)
        } finally {
          setLoadingFullAudit(false)
        }
      }
    }
  }

  // Open full audit view modal
  const handleViewFullAudit = async (e) => {
    e?.stopPropagation()
    
    if (!fullAuditData) {
      setLoadingFullAudit(true)
      try {
        const { data } = await auditsApi.get(audit.id)
        setFullAuditData(data.audit)
      } catch (err) {
        console.error('Failed to load audit data:', err)
        toast.error('Failed to load audit data')
        return
      } finally {
        setLoadingFullAudit(false)
      }
    }
    
    setShowFullAudit(true)
  }

  // Check if magic link is expired
  const isExpired = audit.magicTokenExpiresAt && new Date(audit.magicTokenExpiresAt) < new Date()

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] hover:shadow-[var(--shadow-lg)] transition-all cursor-pointer" onClick={(e) => { if (!e.target.closest('button, a')) onSelect?.(audit) }}>
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* URL and Status */}
              <div className="flex items-center gap-3">
                {getStatusIcon(audit.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] truncate max-w-md">
                      {audit.targetUrl}
                    </h3>
                    <a 
                      href={audit.targetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]" />
                    </a>
                    <Badge variant={statusBadge.color}>
                      {statusBadge.text}
                    </Badge>
                    <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                    
                    {/* Contact/Prospect info badge for admin */}
                    {(audit.contact || audit.prospect) && (
                      <span className={`text-sm flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        audit.prospect 
                          ? 'text-[var(--accent-warning)] bg-[var(--accent-warning)]/10' 
                          : 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                      }`}>
                        <User className="w-3.5 h-3.5" />
                        {(audit.contact?.name || audit.contact?.email) || (audit.prospect?.name || audit.prospect?.email)}
                        {(audit.contact?.company || audit.prospect?.company) && (
                          <span className="text-[var(--text-tertiary)] hidden md:inline">• {audit.contact?.company || audit.prospect?.company}</span>
                        )}
                        {audit.prospect && (
                          <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 border-[var(--accent-warning)] text-[var(--accent-warning)]">
                            PROSPECT
                          </Badge>
                        )}
                      </span>
                    )}
                    
                    {/* Processing/Failed message inline */}
                    {(audit.status === 'pending' || audit.status === 'running') && (
                      <span className="text-sm text-[var(--text-secondary)]">
                        Processing...
                      </span>
                    )}
                    {audit.status === 'failed' && (
                      <span className="text-sm text-[var(--accent-error)]">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Score Circles - Only show for completed audits */}
            {isAuditCompleted(audit.status) && (
              <div className="hidden sm:flex items-center gap-3">
                <ScoreCircle score={audit.performanceScore} label="Perf" />
                <ScoreCircle score={audit.seoScore} label="SEO" />
                <ScoreCircle score={audit.accessibilityScore} label="A11y" />
                <ScoreCircle score={audit.bestPracticesScore} label="BP" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* View Report Button */}
              {isAuditCompleted(audit.status) && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/audits/${audit.id}`)
                  }}
                >
                  View Report
                </Button>
              )}

              {/* Send Email Button - only for completed audits */}
              {isAuditCompleted(audit.status) && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Pre-fill email if contact or prospect exists
                    const person = audit.contact || audit.prospect
                    if (person?.email) {
                      setEmailRecipient(person.email)
                      setEmailRecipientName(person.name || '')
                    }
                    setShowEmailModal(true)
                  }}
                  title="Send audit email"
                >
                  <Mail className="w-4 h-4" />
                </Button>
              )}

              {/* Create proposal from audit */}
              {isAuditCompleted(audit.status) && onCreateProposal && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateProposal(audit)
                  }}
                  title="Create proposal from audit"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}

              {/* Delete Button */}
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                  }}
                  title="Delete audit"
                  className="text-[var(--text-tertiary)] hover:text-[var(--accent-error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              {/* Expand/Collapse */}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Expanded Analytics Section */}
          <CollapsibleContent>
            <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
              {loadingAnalytics || loadingFullAudit ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Audit Results Preview */}
                  {isAuditCompleted(audit.status) && fullAuditData && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Audit Results
                        </h4>
                        <div className="flex items-center gap-2">
                          {/* Copy Link Button */}
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={handleGetMagicLink}
                            disabled={isGenerating}
                            className={`${isExpired ? 'border-[var(--accent-warning)]' : ''}`}
                            title={isExpired ? 'Link expired - click to generate new' : (magicLink ? 'Copy magic link' : 'Generate magic link')}
                          >
                            {isGenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : copied ? (
                              <Check className="w-4 h-4 text-[var(--accent-success)]" />
                            ) : (
                              <Link2 className="w-4 h-4" />
                            )}
                            <span className="ml-1.5">
                              {isExpired ? 'Regenerate' : (magicLink ? 'Copy Link' : 'Get Link')}
                            </span>
                          </Button>
                          {/* View Full Report Button */}
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={handleViewFullAudit}
                          >
                            <Maximize2 className="w-4 h-4 mr-1.5" />
                            View Full Report
                          </Button>
                        </div>
                      </div>
                      
                      {/* Score Cards Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(fullAuditData.performanceScore ?? fullAuditData.scores?.performance) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">Performance</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.performanceScore ?? fullAuditData.scores?.performance) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.performanceScore ?? fullAuditData.scores?.performance}
                            </div>
                          </div>
                        )}
                        {(fullAuditData.seoScore ?? fullAuditData.scores?.seo) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">SEO</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.seoScore ?? fullAuditData.scores?.seo) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.seoScore ?? fullAuditData.scores?.seo}
                            </div>
                          </div>
                        )}
                        {(fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Eye className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">Accessibility</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.accessibilityScore ?? fullAuditData.scores?.accessibility}
                            </div>
                          </div>
                        )}
                        {(fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) != null && (
                          <div className={`p-3 rounded-xl border ${
                            (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 90 
                              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20' 
                              : (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 50 
                                ? 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/20'
                                : 'bg-[var(--accent-error)]/10 border-[var(--accent-error)]/20'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-4 h-4 text-[var(--text-tertiary)]" />
                              <span className="text-xs font-medium text-[var(--text-secondary)]">Best Practices</span>
                            </div>
                            <div className={`text-2xl font-bold ${
                              (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 90 
                                ? 'text-[var(--accent-success)]' 
                                : (fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices) >= 50 
                                  ? 'text-[var(--accent-warning)]'
                                  : 'text-[var(--accent-error)]'
                            }`}>
                              {fullAuditData.bestPracticesScore ?? fullAuditData.scores?.bestPractices}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Priority Actions Preview */}
                      {(() => {
                        const auditJson = typeof fullAuditData.fullAuditJson === 'string' 
                          ? JSON.parse(fullAuditData.fullAuditJson || '{}') 
                          : (fullAuditData.fullAuditJson || {})
                        const priorityActions = fullAuditData.priorityActions || auditJson.priorityActions || []
                        
                        if (priorityActions.length > 0) {
                          return (
                            <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                              <h5 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Top Priority Actions</h5>
                              <ul className="space-y-1.5">
                                {priorityActions.slice(0, 3).map((action, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <span className="text-[var(--brand-primary)] font-bold">{i + 1}.</span>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>
                  )}

                  {/* Analytics Section */}
                  {analytics ? (
                    <div className="space-y-4">
                      {/* Contact/Prospect Details */}
                      {(audit.contact || audit.prospect) && (() => {
                        const person = audit.contact || audit.prospect
                        const isProspect = !!audit.prospect
                        return (
                          <div className={`p-4 rounded-xl ${
                            isProspect 
                              ? 'bg-[var(--accent-warning)]/5 border border-[var(--accent-warning)]/20'
                              : 'bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20'
                          }`}>
                            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {isProspect ? 'Prospect Details' : 'Contact Details'}
                              {isProspect && audit.prospect.pipelineStage && (
                                <Badge variant="outline" className="ml-2 text-[10px] border-[var(--accent-warning)] text-[var(--accent-warning)]">
                                  {audit.prospect.pipelineStage.replace(/_/g, ' ').toUpperCase()}
                                </Badge>
                              )}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-[var(--text-tertiary)]">Name</span>
                                <p className="font-medium text-[var(--text-primary)]">{person.name || '—'}</p>
                              </div>
                              <div>
                                <span className="text-[var(--text-tertiary)]">Email</span>
                                <p className="font-medium text-[var(--text-primary)]">{person.email}</p>
                              </div>
                              <div>
                                <span className="text-[var(--text-tertiary)]">Company</span>
                                <p className="font-medium text-[var(--text-primary)]">{person.company || '—'}</p>
                              </div>
                              <div>
                                <span className="text-[var(--text-tertiary)]">Magic Link</span>
                                <p className="font-medium text-[var(--text-primary)]">
                                  {magicLink ? (
                                    <span className={isExpired ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-success)]'}>
                                      {isExpired ? 'Expired' : 'Active'}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--text-tertiary)]">Not generated</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Engagement Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs font-medium">Total Views</span>
                          </div>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">{analytics.totalViews || 0}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                          <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium">Time Spent</span>
                          </div>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {analytics.totalTimeSpent ? `${Math.round(analytics.totalTimeSpent / 60)}m` : '0m'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                        <Monitor className="w-4 h-4" />
                        <span className="text-xs font-medium">Scroll Depth</span>
                      </div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {analytics.maxScrollDepth || 0}%
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Engagement</span>
                      </div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {analytics.engagementScore || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Engagement Progress Bar */}
                  {analytics.engagementScore > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Engagement Score</span>
                        <span className="text-[var(--text-primary)] font-medium">{analytics.engagementScore}%</span>
                      </div>
                      <Progress 
                        value={analytics.engagementScore} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Activity Timeline */}
                  {analytics.activityTimeline && analytics.activityTimeline.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Activity</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analytics.activityTimeline.slice(0, 10).map((activity, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.eventType === 'view' ? 'bg-[var(--brand-primary)]' :
                              activity.eventType === 'scroll' ? 'bg-[var(--accent-success)]' :
                              'bg-[var(--text-tertiary)]'
                            }`} />
                            <span className="text-[var(--text-secondary)] capitalize">{activity.eventType}</span>
                            {activity.eventData?.depth && (
                              <span className="text-[var(--text-tertiary)]">({activity.eventData.depth}%)</span>
                            )}
                            <span className="text-[var(--text-tertiary)] ml-auto text-xs">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No analytics yet */}
                  {analytics.totalViews === 0 && (
                    <EmptyState.List
                      icon={Eye}
                      title="No views yet"
                      description="Share the magic link with your prospect!"
                    />
                  )}
                    </div>
                  ) : !fullAuditData && isAuditCompleted(audit.status) ? (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Loading audit data...</p>
                    </div>
                  ) : !isAuditCompleted(audit.status) ? (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Audit results will appear here when complete</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>

      {/* Full Audit Modal */}
      <Dialog open={showFullAudit} onOpenChange={setShowFullAudit}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden p-0">
          <div className="overflow-y-auto max-h-[95vh]">
            {fullAuditData && (
              <AuditPublicView 
                audit={fullAuditData} 
                contact={audit.contact || audit.prospect}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">
              Send Audit Email
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Recipient Email <span className="text-[var(--accent-error)]">*</span>
              </label>
              <Input
                type="email"
                placeholder="prospect@company.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Recipient Name <span className="text-[var(--text-tertiary)]">(optional, for personalization)</span>
              </label>
              <Input
                type="text"
                placeholder="John Smith"
                value={emailRecipientName}
                onChange={(e) => setEmailRecipientName(e.target.value)}
              />
            </div>
            <div className="bg-[var(--glass-bg)] p-3 rounded-lg border border-[var(--glass-border)]">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Audit:</strong> {audit.targetUrl}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Grade:</strong> {audit.summary?.grade || audit.summary?.metrics?.grade || 'N/A'}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                An AI-personalized email will be generated based on the audit results.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSendingEmail}
                variant="glass-primary"
                className="flex-1"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="glass"
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}

// Client audit row (simpler, no magic link management)
function ClientAuditRow({ audit, navigate, getStatusIcon, getScoreColor, getAuditStatusBadge, onSelect }) {
  const [showFullAudit, setShowFullAudit] = useState(false)
  const [fullAuditData, setFullAuditData] = useState(null)
  const [loadingFullAudit, setLoadingFullAudit] = useState(false)
  
  const statusBadge = getAuditStatusBadge(audit.status)

  // Open full audit view modal
  const handleViewFullAudit = async (e) => {
    e?.stopPropagation()
    
    if (!fullAuditData) {
      setLoadingFullAudit(true)
      try {
        const { data } = await auditsApi.get(audit.id)
        setFullAuditData(data.audit)
      } catch (err) {
        console.error('Failed to load audit data:', err)
        toast.error('Failed to load audit data')
        return
      } finally {
        setLoadingFullAudit(false)
      }
    }
    
    setShowFullAudit(true)
  }

  return (
    <>
      <Card 
        className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] hover:shadow-[var(--shadow-lg)] transition-all cursor-pointer"
        onClick={(e) => { onSelect?.(audit); handleViewFullAudit(e); }}
      >
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getStatusIcon(audit.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] truncate max-w-md">
                    {audit.targetUrl}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <Badge variant={statusBadge.color}>
                    {statusBadge.text}
                  </Badge>
                  <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </span>
                  
                  {/* Processing/Failed message inline */}
                  {(audit.status === 'pending' || audit.status === 'running') && (
                    <span className="text-sm text-[var(--text-secondary)]">
                      Processing...
                    </span>
                  )}
                  {audit.status === 'failed' && (
                    <span className="text-sm text-[var(--accent-error)]">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scores (only show if completed) */}
            {isAuditCompleted(audit.status) && (
              <div className="hidden sm:flex items-center gap-3">
                <ScoreCircle score={audit.performanceScore ?? audit.scorePerformance} label="Perf" />
                <ScoreCircle score={audit.seoScore ?? audit.scoreSeo} label="SEO" />
                <ScoreCircle score={audit.accessibilityScore ?? audit.scoreAccessibility} label="A11y" />
                <ScoreCircle score={audit.bestPracticesScore ?? audit.scoreBestPractices} label="BP" />
              </div>
            )}

          {/* View Button */}
          {isAuditCompleted(audit.status) && (
            <Button
              variant="glass"
              size="sm"
              onClick={handleViewFullAudit}
              disabled={loadingFullAudit}
            >
              {loadingFullAudit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'View'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Full Audit Modal */}
    <Dialog open={showFullAudit} onOpenChange={setShowFullAudit}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[95vh]">
          {fullAuditData && (
            <AuditPublicView 
              audit={fullAuditData} 
              contact={null}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

// Right sidebar detail panel content (used by ModuleLayout)
function AuditDetailPanel({ selectedAudit, getStatusIcon, getAuditStatusBadge, navigate, setSelectedAuditId, setProposalFromAudit, isAuditCompleted }) {
  if (!selectedAudit) return null
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1">URL</p>
          <a
            href={selectedAudit.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--brand-primary)] hover:underline break-all flex items-center gap-1"
          >
            {selectedAudit.targetUrl?.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(selectedAudit.status)}
            <Badge variant={getAuditStatusBadge(selectedAudit.status).color}>
              {getAuditStatusBadge(selectedAudit.status).text}
            </Badge>
          </div>
          {selectedAudit.deviceType && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              {selectedAudit.deviceType === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
              <span className="capitalize">{selectedAudit.deviceType}</span>
            </div>
          )}
        </div>
        {isAuditCompleted(selectedAudit.status) && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Core Web Vitals</p>
            <div className="space-y-2">
              {selectedAudit.lcpMs != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">LCP</span>
                  <span className={cn('font-medium', selectedAudit.lcpMs <= 2500 ? 'text-[var(--accent-success)]' : selectedAudit.lcpMs <= 4000 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-error)]')}>
                    {(selectedAudit.lcpMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
              {selectedAudit.fcpMs != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">FCP</span>
                  <span className={cn('font-medium', selectedAudit.fcpMs <= 1800 ? 'text-[var(--accent-success)]' : selectedAudit.fcpMs <= 3000 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-error)]')}>
                    {(selectedAudit.fcpMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
              {selectedAudit.clsScore != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">CLS</span>
                  <span className={cn('font-medium', selectedAudit.clsScore <= 0.1 ? 'text-[var(--accent-success)]' : selectedAudit.clsScore <= 0.25 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-error)]')}>
                    {selectedAudit.clsScore.toFixed(3)}
                  </span>
                </div>
              )}
              {selectedAudit.tbtMs != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">TBT</span>
                  <span className={cn('font-medium', selectedAudit.tbtMs <= 200 ? 'text-[var(--accent-success)]' : selectedAudit.tbtMs <= 600 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-error)]')}>
                    {selectedAudit.tbtMs}ms
                  </span>
                </div>
              )}
              {selectedAudit.speedIndexMs != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Speed Index</span>
                  <span className={cn('font-medium', selectedAudit.speedIndexMs <= 3400 ? 'text-[var(--accent-success)]' : selectedAudit.speedIndexMs <= 5800 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-error)]')}>
                    {(selectedAudit.speedIndexMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        {isAuditCompleted(selectedAudit.status) && selectedAudit.summary && (
          <div className="space-y-3 pt-3 border-t border-[var(--glass-border)]">
            {selectedAudit.summary.grade && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Overall Grade</p>
                <Badge className={cn('text-sm font-bold px-2.5 py-0.5', selectedAudit.summary.grade === 'A' ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]' : selectedAudit.summary.grade === 'B' ? 'bg-[var(--accent-success)]/15 text-[var(--accent-success)]' : selectedAudit.summary.grade === 'C' ? 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]' : selectedAudit.summary.grade === 'D' ? 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]' : 'bg-[var(--accent-error)]/20 text-[var(--accent-error)]')}>
                  {selectedAudit.summary.grade}
                </Badge>
              </div>
            )}
            {(selectedAudit.summary.quickWins?.length > 0 || selectedAudit.summary.aiInsights?.quickWins?.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Quick Wins
                </p>
                <ul className="space-y-1">
                  {(selectedAudit.summary.quickWins || selectedAudit.summary.aiInsights?.quickWins || []).slice(0, 2).map((win, i) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{typeof win === 'string' ? win : win.fix || win.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-tertiary)]">Requested</span>
            <span className="text-[var(--text-secondary)]">{selectedAudit.createdAt ? new Date(selectedAudit.createdAt).toLocaleDateString() : '-'}</span>
          </div>
          {selectedAudit.completedAt && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-tertiary)]">Completed</span>
              <span className="text-[var(--text-secondary)]">{new Date(selectedAudit.completedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {(selectedAudit.contact || selectedAudit.prospect) && (
          <div className="pt-2 border-t border-[var(--glass-border)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Contact</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">{(selectedAudit.contact || selectedAudit.prospect).name || 'Unknown'}</p>
            {(selectedAudit.contact || selectedAudit.prospect).email && (
              <p className="text-xs text-[var(--text-secondary)]">{(selectedAudit.contact || selectedAudit.prospect).email}</p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="glass" size="sm" className="w-full" onClick={() => navigate(`/audits/${selectedAudit.id}`)}>
            <Maximize2 className="w-4 h-4 mr-2" />
            View full report
          </Button>
          {isAuditCompleted(selectedAudit.status) && (
            <Button variant="glass-primary" size="sm" className="w-full" onClick={() => setProposalFromAudit(selectedAudit)}>
              <FileText className="w-4 h-4 mr-2" />
              Create proposal
            </Button>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}

export default function Audits() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  // React Query hooks for audits
  const { data: audits = [], isLoading, error, refetch: refetchAudits } = useAllAudits()
  const requestAuditMutation = useRequestAudit()
  const deleteAuditMutation = useDeleteAudit()

  const { data: projectsData } = useProjects()
  const projects = projectsData?.projects ?? projectsData ?? []
  const fetchProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: projectsKeys.all })
  }, [queryClient])

  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestUrl, setRequestUrl] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [viewFilter, setViewFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')
  const [selectedAuditId, setSelectedAuditId] = useState(null)
  const [proposalFromAudit, setProposalFromAudit] = useState(null) // audit to open in ProposalAIDialog (step 7)

  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const isAdmin = user?.role === 'admin'

  // Filter by search
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return audits
    const query = searchQuery.toLowerCase()
    return audits.filter(audit => {
      const targetUrl = audit.targetUrl?.toLowerCase() || ''
      const contactEmail = audit.contact?.email?.toLowerCase() || ''
      const contactName = audit.contact?.name?.toLowerCase() || ''
      const prospectEmail = audit.prospect?.email?.toLowerCase() || ''
      const prospectName = audit.prospect?.name?.toLowerCase() || ''
      const company = audit.contact?.company?.toLowerCase() || audit.prospect?.company?.toLowerCase() || ''
      return targetUrl.includes(query) ||
        contactEmail.includes(query) ||
        contactName.includes(query) ||
        prospectEmail.includes(query) ||
        prospectName.includes(query) ||
        company.includes(query)
    })
  }, [audits, searchQuery])

  // View filter counts
  const viewCounts = useMemo(() => {
    const counts = {}
    VIEW_FILTERS.forEach(v => { counts[v.id] = 0 })
    audits.forEach(audit => {
      if (isPassed(audit)) counts.passed++
      if (audit.status === 'failed') counts.failed++
      if (audit.status === 'pending' || audit.status === 'running') counts.in_progress++
      if (needsAttention(audit)) counts.needs_attention++
      if (audit.contact || audit.prospect) counts.with_prospect++
      else counts.without_prospect++
      counts.all++
    })
    return counts
  }, [audits])

  // Filter by view
  const filteredByView = useMemo(() => {
    return filteredBySearch.filter(audit => {
      switch (viewFilter) {
        case 'passed': return isPassed(audit)
        case 'failed': return audit.status === 'failed'
        case 'in_progress': return audit.status === 'pending' || audit.status === 'running'
        case 'needs_attention': return needsAttention(audit)
        case 'with_prospect': return !!(audit.contact || audit.prospect)
        case 'without_prospect': return !audit.contact && !audit.prospect
        default: return true
      }
    })
  }, [filteredBySearch, viewFilter])

  // Sort
  const statusOrder = (s) => {
    if (s === 'failed') return 0
    if (s === 'pending' || s === 'running') return 1
    return 2 // completed
  }
  const avgScore = (audit) => {
    const p = getScore(audit, 'performance')
    const s = getScore(audit, 'seo')
    const a = getScore(audit, 'accessibility')
    const b = getScore(audit, 'bestPractices')
    const vals = [p, s, a, b].filter(v => v != null)
    return vals.length ? vals.reduce((sum, v) => sum + v, 0) / vals.length : 0
  }
  const sortedAudits = useMemo(() => {
    const list = [...filteredByView]
    switch (sortBy) {
      case 'date_asc':
        list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
        break
      case 'date_desc':
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case 'url_asc':
        list.sort((a, b) => (a.targetUrl || '').localeCompare(b.targetUrl || ''))
        break
      case 'url_desc':
        list.sort((a, b) => (b.targetUrl || '').localeCompare(a.targetUrl || ''))
        break
      case 'status':
        list.sort((a, b) => statusOrder(a.status) - statusOrder(b.status))
        break
      case 'score_asc':
        list.sort((a, b) => avgScore(a) - avgScore(b))
        break
      case 'score_desc':
        list.sort((a, b) => avgScore(b) - avgScore(a))
        break
      default:
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }
    return list
  }, [filteredByView, sortBy])

  // Paginate
  const totalPages = Math.ceil(sortedAudits.length / itemsPerPage)
  const paginatedAudits = sortedAudits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset to page 1 when search, view, or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, viewFilter, sortBy])

  // Initial fetch
  useEffect(() => {
    fetchProjects()
  }, [])

  // Poll for audit completion when any audits are pending/running
  useEffect(() => {
    const hasRunningAudits = audits.some(a => a.status === 'pending' || a.status === 'running')
    
    if (!hasRunningAudits) return
    
    console.log('[Audits] Polling for audit completion...')
    const pollInterval = setInterval(() => {
      refetchAudits()
    }, 5000) // Poll every 5 seconds
    
    return () => clearInterval(pollInterval)
  }, [audits, refetchAudits])

  const handleRequestAudit = async (e) => {
    e.preventDefault()
    setRequestError('')
    
    if (!requestUrl) {
      setRequestError('Please enter a URL')
      return
    }
    
    // Clients must select project
    if (!isAdmin && !selectedProjectId) {
      setRequestError('Please select a project')
      return
    }

    // Normalize URL for admin requests
    const normalizedUrl = isAdmin ? normalizeUrl(requestUrl) : requestUrl

    setIsRequesting(true)
    try {
      await requestAuditMutation.mutateAsync({
        url: normalizedUrl,
        projectId: selectedProjectId || null,
        recipientEmail: null, // Email is sent separately after review
        recipientName: null
      })
      setShowRequestForm(false)
      setRequestUrl('')
      setSelectedProjectId('')
      toast.success('Audit requested! Results will be ready in 2-3 minutes.')
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 
                      err?.message || 
                      'Failed to request audit'
      setRequestError(errorMsg)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDeleteAudit = async (auditId) => {
    try {
      await deleteAuditMutation.mutateAsync({ id: auditId })
      return { success: true }
    } catch (err) {
      return { success: false, error: err?.message || 'Failed to delete audit' }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-[var(--accent-success)]" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-[var(--brand-primary)] animate-spin" />
      case 'pending':
        return <Clock className="w-5 h-5 text-[var(--text-tertiary)]" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-[var(--accent-error)]" />
      default:
        return <AlertCircle className="w-5 h-5 text-[var(--text-tertiary)]" />
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-[var(--accent-success)] bg-[var(--accent-success)]/10'
    if (score >= 50) return 'text-[var(--accent-warning)] bg-[var(--accent-warning)]/10'
    return 'text-[var(--accent-error)] bg-[var(--accent-error)]/10'
  }

  if (isLoading && audits.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  const matchDetail = location.pathname.match(/^\/audits\/([^/]+)$/)
  const selectedAudit = selectedAuditId ? audits.find((a) => a.id === selectedAuditId) : null
  const showRightDetail = !matchDetail && selectedAudit

  return (
    <TooltipProvider>
      <ModuleLayout
        leftSidebar={
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <p className="uppercase tracking-wider text-[var(--text-tertiary)]">Views</p>
              <div className="space-y-1">
                {VIEW_FILTERS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setViewFilter(id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors',
                      viewFilter === id
                        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'hover:bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{label}</span>
                    </div>
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center">
                      {viewCounts[id] ?? 0}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        }
        leftSidebarTitle="Audits"
        rightSidebar={showRightDetail ? (
          <AuditDetailPanel
            selectedAudit={selectedAudit}
            getStatusIcon={getStatusIcon}
            getAuditStatusBadge={getAuditStatusBadge}
            navigate={navigate}
            setSelectedAuditId={setSelectedAuditId}
            setProposalFromAudit={setProposalFromAudit}
            isAuditCompleted={isAuditCompleted}
          />
        ) : undefined}
        rightSidebarTitle="Details"
        defaultLeftSidebarOpen
        defaultRightSidebarOpen={!!showRightDetail}
        rightSidebarOpen={!!showRightDetail}
        onRightSidebarOpenChange={(open) => { if (!open) setSelectedAuditId(null) }}
        ariaLabel="Audits module"
      >
        <ModuleLayout.Header
          title="Audits"
          icon={MODULE_ICONS.audits}
          subtitle={`${audits.length} ${audits.length === 1 ? 'audit' : 'audits'}`}
          actions={
            <Button
              onClick={() => setShowRequestForm(!showRequestForm)}
              variant="glass-primary"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request New Audit
            </Button>
          }
        />
        <ModuleLayout.Content>
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route
                index
                element={
                  <div className="space-y-6">
                    {/* Search, Sort and Stats Bar */}
              <div className="flex flex-wrap items-center gap-4 px-6 pt-6">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <Input
                    type="text"
                    placeholder="Search by URL, email, name, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date_desc">Date: Newest first</SelectItem>
                    <SelectItem value="date_asc">Date: Oldest first</SelectItem>
                    <SelectItem value="url_asc">URL: A–Z</SelectItem>
                    <SelectItem value="url_desc">URL: Z–A</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="score_desc">Score: High to low</SelectItem>
                    <SelectItem value="score_asc">Score: Low to high</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-[var(--text-secondary)]">
                  {sortedAudits.length} {sortedAudits.length === 1 ? 'audit' : 'audits'}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {viewFilter !== 'all' && ` in ${VIEW_FILTERS.find(v => v.id === viewFilter)?.label ?? viewFilter}`}
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mx-6">
                  <AlertDescription>
                    {typeof error === 'string' ? error : (error?.message ?? error?.response?.data?.message ?? 'Failed to load audits')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Request Form */}
      {showRequestForm && (
        <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] mx-6">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">
              {isAdmin ? 'Run Website Audit' : 'Request New Audit'}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {isAdmin 
                ? 'Enter a website URL to analyze. You can send the results via email after reviewing.'
                : 'Enter a website URL to analyze its performance, SEO, and accessibility'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRequestAudit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Website URL <span className="text-[var(--accent-error)]">*</span>
                </label>
                <Input
                  type={isAdmin ? "text" : "url"}
                  placeholder={isAdmin ? "example.com or https://example.com" : "https://example.com"}
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  required
                />
                {isAdmin && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    You can enter just the domain (e.g., "uptrademedia.com") - https:// will be added automatically
                  </p>
                )}
              </div>

              {/* Client: Project selector (required) */}
              {!isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                    required
                  >
                    <option value="">Choose a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {requestError && (
                <Alert variant="destructive">
                  <AlertDescription>{requestError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isRequesting}
                  variant="glass-primary"
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request Audit'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => {
                    setShowRequestForm(false)
                    setRequestError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

              {/* Audits List */}
              {audits.length === 0 ? (
                <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] mx-6">
                  <CardContent className="pt-6">
                    <EmptyState
                      icon={BarChart3}
                      title="No audits yet"
                      description={
                        isAdmin
                          ? 'Create an audit for a prospect to get started'
                          : 'Request your first website audit to get started'
                      }
                      actionLabel={isAdmin ? 'Create Audit' : 'Request Audit'}
                      onAction={() => setShowRequestForm(true)}
                    />
                  </CardContent>
                </Card>
              ) : filteredByView.length === 0 ? (
                <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] mx-6">
                  <CardContent className="pt-6">
                    <EmptyState
                      icon={AlertCircle}
                      title="No audits in this view"
                      description="Try another view or update your search."
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-2 px-6">
                    {paginatedAudits.map(audit =>
                      isAdmin ? (
                        <AdminAuditRow
                          key={audit.id}
                          audit={audit}
                          navigate={navigate}
                          getStatusIcon={getStatusIcon}
                          getScoreColor={getScoreColor}
                          getAuditStatusBadge={getAuditStatusBadge}
                          onDelete={handleDeleteAudit}
                          onSelect={(a) => setSelectedAuditId(a?.id ?? null)}
                          onCreateProposal={(a) => setProposalFromAudit(a)}
                        />
                      ) : (
                        <ClientAuditRow
                          key={audit.id}
                          audit={audit}
                          navigate={navigate}
                          getStatusIcon={getStatusIcon}
                          getScoreColor={getScoreColor}
                          getAuditStatusBadge={getAuditStatusBadge}
                          onSelect={(a) => setSelectedAuditId(a?.id ?? null)}
                        />
                      )
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 px-6 pb-6 border-t border-[var(--glass-border)]">
                      <div className="text-sm text-[var(--text-secondary)]">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedAudits.length)} of {sortedAudits.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </Button>
                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'glass-primary' : 'ghost'}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
                  </div>
                }
              />
              <Route path=":id" element={<AuditDetailRoute />} />
            </Routes>
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>

      {/* Create proposal from audit */}
      <ProposalAIDialog
        open={!!proposalFromAudit}
        onOpenChange={(open) => { if (!open) setProposalFromAudit(null) }}
        initialAudit={proposalFromAudit ?? undefined}
        triggerButton={false}
        clients={[]}
      />
    </TooltipProvider>
  )
}
