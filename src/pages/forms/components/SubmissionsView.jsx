// src/pages/forms/components/SubmissionsView.jsx
// Submissions table with lead scoring, tags, AI analysis, and status management

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Mail,
  Phone,
  User,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  Star,
  AlertTriangle,
  Clock,
  Tag,
  Sparkles,
  ExternalLink,
  Trash2,
  ChevronDown,
  X,
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isValid } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import EmailComposeDialog from '@/components/crm/EmailComposeDialog'
import useAuthStore from '@/lib/auth-store'

// Quality tier config
const QUALITY_TIER = {
  high: { 
    label: 'High Intent', 
    icon: Star,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
  },
  medium: { 
    label: 'Medium', 
    icon: null,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
  },
  low: { 
    label: 'Low', 
    icon: null,
    className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' 
  },
  spam: { 
    label: 'Spam', 
    icon: AlertTriangle,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' 
  },
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'amber' },
  { value: 'qualified', label: 'Qualified', color: 'emerald' },
  { value: 'converted', label: 'Converted', color: 'violet' },
  { value: 'closed', label: 'Closed', color: 'gray' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Submission Detail Panel — used in ModuleLayout rightSidebar
// ─────────────────────────────────────────────────────────────────────────────

export function SubmissionDetailPanel({ submission, hasSignal, onClose, onUpdateStatus }) {
  const [emailComposeOpen, setEmailComposeOpen] = useState(false)
  const { currentProject } = useAuthStore()
  
  if (!submission) return null
  
  // Support both camelCase (API) and snake_case field names
  const fields = submission.fields || submission.data || {}
  const name = submission.name || fields.name || fields.full_name || fields.first_name || 'Anonymous Submission'
  const email = submission.email || fields.email
  const phone = submission.phone || fields.phone
  const rawDate = submission.createdAt || submission.created_at
  const createdAt = rawDate ? new Date(rawDate) : null
  const status = submission.status || 'new'
  const formName = submission.form?.name || 'Unknown Form'
  
  // Build a contact-like object for the email compose dialog
  const contactForEmail = email ? {
    id: submission.id,
    name: name !== 'Anonymous Submission' ? name : undefined,
    email,
    company: fields.company || fields.company_name || fields.organization,
  } : null
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] truncate">{name}</h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                {createdAt && isValid(createdAt)
                  ? `Submitted ${format(createdAt, 'MMM d, yyyy')} at ${format(createdAt, 'h:mm a')}`
                  : 'Submission'
                }
              </p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 rounded-md hover:bg-[var(--glass-bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Status + Form badge */}
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {formName}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  borderColor: status === 'new' ? '#3b82f6' : status === 'contacted' ? '#f59e0b' : status === 'qualified' ? '#10b981' : status === 'converted' ? '#8b5cf6' : '#6b7280',
                  color: status === 'new' ? '#3b82f6' : status === 'contacted' ? '#f59e0b' : status === 'qualified' ? '#10b981' : status === 'converted' ? '#8b5cf6' : '#6b7280',
                  backgroundColor: status === 'new' ? '#3b82f620' : status === 'contacted' ? '#f59e0b20' : status === 'qualified' ? '#10b98120' : status === 'converted' ? '#8b5cf620' : '#6b728020',
                }}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status === 'new' && "bg-blue-500",
                  status === 'contacted' && "bg-amber-500",
                  status === 'qualified' && "bg-emerald-500",
                  status === 'converted' && "bg-violet-500",
                  status === 'closed' && "bg-gray-500",
                )} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem 
                  key={opt.value}
                  onClick={() => onUpdateStatus?.(submission.id, opt.value)}
                >
                  <span className={cn(
                    "h-2 w-2 rounded-full mr-2",
                    opt.color === 'blue' && "bg-blue-500",
                    opt.color === 'amber' && "bg-amber-500",
                    opt.color === 'emerald' && "bg-emerald-500",
                    opt.color === 'violet' && "bg-violet-500",
                    opt.color === 'gray' && "bg-gray-500",
                  )} />
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {createdAt && isValid(createdAt) && (
            <span className="text-xs text-[var(--text-tertiary)] ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      
      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Signal Analysis */}
          {hasSignal && (submission.lead_score !== undefined || submission.quality_tier) && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-[var(--brand-primary)]/5 to-[var(--brand-secondary)]/5 border border-[var(--glass-border)]">
              <div className="flex items-center gap-2 mb-3">
                <SignalIcon className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">Signal Analysis</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {submission.lead_score !== undefined && (
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Lead Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[var(--glass-border)] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${submission.lead_score || 0}%`,
                            backgroundColor: 'var(--brand-primary)'
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {submission.lead_score || 0}
                      </span>
                    </div>
                  </div>
                )}
                
                {submission.quality_tier && QUALITY_TIER[submission.quality_tier] && (
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Quality</p>
                    <Badge className={QUALITY_TIER[submission.quality_tier].className}>
                      {QUALITY_TIER[submission.quality_tier].label}
                    </Badge>
                  </div>
                )}
              </div>
              
              {submission.ai_analysis && (
                <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">AI Insights</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {typeof submission.ai_analysis === 'string' 
                      ? submission.ai_analysis 
                      : submission.ai_analysis.summary || 'No analysis available'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Contact Information
            </h4>
            <div className="space-y-1.5">
              {email && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--glass-bg-hover)]">
                  <Mail className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
                  <a href={`mailto:${email}`} className="text-sm text-[var(--text-primary)] hover:underline truncate">
                    {email}
                  </a>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--glass-bg-hover)]">
                  <Phone className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
                  <a href={`tel:${phone}`} className="text-sm text-[var(--text-primary)] hover:underline">
                    {phone}
                  </a>
                </div>
              )}
              {!email && !phone && (
                <p className="text-sm text-[var(--text-tertiary)] italic">No contact information provided</p>
              )}
            </div>
          </div>
          
          {/* Form Responses */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Form Responses
            </h4>
            <div className="space-y-2">
              {Object.entries(fields).map(([key, value]) => {
                // Skip common contact fields already shown above
                if (['email', 'phone', 'name', 'full_name', 'first_name', 'last_name'].includes(key)) {
                  return null
                }
                
                return (
                  <div key={key} className="p-2.5 rounded-lg bg-[var(--glass-bg-hover)]">
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">
                      {key.replace(/_/g, ' ').replace(/-/g, ' ')}
                    </p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value || '—')}
                    </p>
                  </div>
                )
              })}
              {Object.keys(fields).filter(k => !['email', 'phone', 'name', 'full_name', 'first_name', 'last_name'].includes(k)).length === 0 && (
                <p className="text-sm text-[var(--text-tertiary)] italic">No additional form data</p>
              )}
            </div>
          </div>
          
          {/* Tags */}
          {submission.tags && submission.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {submission.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Metadata */}
          {(submission.sourceUrl || submission.sourcePage || submission.pageUrl || submission.referrer) && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Source
              </h4>
              <div className="space-y-1.5 text-sm">
                {(submission.pageUrl || submission.sourceUrl) && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{submission.pageUrl || submission.sourceUrl}</span>
                  </div>
                )}
                {submission.referrer && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">Referrer: {submission.referrer}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer Actions */}
      <div className="p-3 border-t border-[var(--glass-border)] flex gap-2">
        {contactForEmail ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setEmailComposeOpen(true)}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Send Email
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1" disabled>
            <Mail className="h-4 w-4 mr-1.5" />
            No Email
          </Button>
        )}
        <Button 
          size="sm"
          className="flex-1 text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          onClick={() => onUpdateStatus?.(submission.id, 'qualified')}
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Qualify
        </Button>
      </div>
      
      {/* Gmail Compose Dialog */}
      {contactForEmail && (
        <EmailComposeDialog
          open={emailComposeOpen}
          onOpenChange={setEmailComposeOpen}
          contact={contactForEmail}
          projectId={currentProject?.id}
          defaultSubject={`Re: ${formName} Submission`}
          onSent={() => {
            onUpdateStatus?.(submission.id, 'contacted')
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Submission Row
// ─────────────────────────────────────────────────────────────────────────────

function SubmissionRow({ submission, hasSignal, onView, onUpdateStatus, onDelete, isSelected, onSelect, isActive }) {
  // Support both camelCase (API) and snake_case field names
  const fields = submission.fields || submission.data || {}
  const rawDate = submission.createdAt || submission.created_at
  const createdAt = rawDate ? new Date(rawDate) : null
  
  const name = submission.name || fields.name || fields.full_name || fields.first_name || 'Anonymous'
  const email = submission.email || fields.email || ''
  const qualityTier = submission.quality_tier || submission.qualityTier || 'medium'
  const status = submission.status || 'new'
  
  return (
    <TableRow 
      className={cn(
        "group cursor-pointer transition-colors",
        isActive && "bg-[var(--brand-primary)]/5"
      )}
      onClick={() => onView?.(submission)}
    >
      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(submission.id, checked)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div 
            className="h-9 w-9 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)] truncate">{name}</span>
              {status === 'new' && (
                <span className="flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
              )}
            </div>
            <span className="text-sm text-[var(--text-tertiary)] truncate block">{email || 'No email'}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-[var(--text-secondary)] text-sm">
        {submission.form?.name || 'Unknown Form'}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
              <span className={cn(
                "h-2 w-2 rounded-full",
                status === 'new' && "bg-blue-500",
                status === 'contacted' && "bg-amber-500",
                status === 'qualified' && "bg-emerald-500",
                status === 'converted' && "bg-violet-500",
                status === 'closed' && "bg-gray-500",
              )} />
              <span className="text-xs capitalize">{status}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Update Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((opt) => (
              <DropdownMenuItem 
                key={opt.value}
                onClick={() => onUpdateStatus?.(submission.id, opt.value)}
              >
                <span className={cn(
                  "h-2 w-2 rounded-full mr-2",
                  opt.color === 'blue' && "bg-blue-500",
                  opt.color === 'amber' && "bg-amber-500",
                  opt.color === 'emerald' && "bg-emerald-500",
                  opt.color === 'violet' && "bg-violet-500",
                  opt.color === 'gray' && "bg-gray-500",
                )} />
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell>
        {qualityTier && QUALITY_TIER[qualityTier] && (() => {
          const QualityIcon = QUALITY_TIER[qualityTier].icon
          return (
            <Badge className={cn("text-xs", QUALITY_TIER[qualityTier].className)}>
              {QualityIcon && <QualityIcon className="h-3 w-3 mr-1" />}
              {QUALITY_TIER[qualityTier].label}
            </Badge>
          )
        })()}
      </TableCell>
      {hasSignal && (
        <TableCell>
          {submission.lead_score !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-[var(--glass-border)] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${submission.lead_score}%`,
                    backgroundColor: 'var(--brand-primary)'
                  }}
                />
              </div>
              <span className="text-xs text-[var(--text-secondary)]">{submission.lead_score}</span>
            </div>
          )}
        </TableCell>
      )}
      <TableCell className="text-[var(--text-tertiary)] text-sm">
        {createdAt && isValid(createdAt) 
          ? formatDistanceToNow(createdAt, { addSuffix: true })
          : '-'
        }
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onView?.(submission)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="h-4 w-4 mr-2" />
                Add to CRM
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400"
                onClick={() => onDelete?.(submission.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SubmissionsView
// ─────────────────────────────────────────────────────────────────────────────

export default function SubmissionsView({
  submissions = [],
  isLoading,
  viewMode = 'list',
  filter = 'all',
  hasSignal = false,
  onView,
  onUpdateStatus,
  onDelete,
  onBulkDelete,
  onBulkUpdateStatus,
  selectedSubmissionId,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  
  const handleSelect = (id, checked) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }
  
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(submissions.map(s => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-[var(--glass-bg)] rounded-lg">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          No submissions yet
        </h3>
        <p className="text-[var(--text-secondary)]">
          Submissions from your forms will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-[var(--brand-primary)]/10 border-b border-[var(--glass-border)] flex items-center gap-4">
          <span className="text-sm text-[var(--text-primary)]">
            {selectedIds.size} selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => {
            onBulkUpdateStatus?.(Array.from(selectedIds), 'contacted')
            setSelectedIds(new Set())
          }}>Mark Contacted</Button>
          <Button variant="ghost" size="sm" onClick={() => {
            onBulkUpdateStatus?.(Array.from(selectedIds), 'qualified')
            setSelectedIds(new Set())
          }}>Mark Qualified</Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => {
            onBulkDelete?.(Array.from(selectedIds))
            setSelectedIds(new Set())
          }}>Delete</Button>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedIds.size === submissions.length && submissions.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Contact</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Form</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Status</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Quality</TableHead>
            {hasSignal && <TableHead className="text-[var(--text-tertiary)]">Score</TableHead>}
            <TableHead className="text-[var(--text-tertiary)]">Submitted</TableHead>
            <TableHead className="text-[var(--text-tertiary)] w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              hasSignal={hasSignal}
              onView={onView}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
              isSelected={selectedIds.has(submission.id)}
              onSelect={handleSelect}
              isActive={selectedSubmissionId === submission.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
