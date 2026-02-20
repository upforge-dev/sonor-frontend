// src/pages/forms/SubmissionDetail.jsx
// Individual submission detail view with full form data, AI analysis, and actions

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Building,
  Clock,
  Star,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Trash2,
  CheckCircle,
  Tag,
  Send,
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { useSignalAccess } from '@/lib/signal-access'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isValid } from 'date-fns'

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'amber' },
  { value: 'qualified', label: 'Qualified', color: 'emerald' },
  { value: 'converted', label: 'Converted', color: 'violet' },
  { value: 'closed', label: 'Closed', color: 'gray' },
]

const QUALITY_TIER = {
  high: { 
    label: 'High Intent', 
    icon: Star,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
  },
  medium: { 
    label: 'Medium', 
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
  },
  low: { 
    label: 'Low', 
    className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' 
  },
  spam: { 
    label: 'Spam', 
    icon: AlertTriangle,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400' 
  },
}

export default function SubmissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasSignal } = useSignalAccess()
  
  const [submission, setSubmission] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    loadSubmission()
  }, [id])
  
  async function loadSubmission() {
    if (!id) return
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          *,
          form:managed_forms(id, name, slug)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      setSubmission(data)
      setNotes(data.notes || '')
    } catch (err) {
      console.error('Failed to load submission:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function updateStatus(newStatus) {
    if (!submission) return
    
    try {
      await supabase
        .from('form_submissions')
        .update({ status: newStatus })
        .eq('id', submission.id)
      
      setSubmission({ ...submission, status: newStatus })
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }
  
  async function saveNotes() {
    if (!submission) return
    setIsSaving(true)
    
    try {
      await supabase
        .from('form_submissions')
        .update({ notes })
        .eq('id', submission.id)
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }
  
  if (!submission) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--text-secondary)]">Submission not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/forms')}>
          Back to Forms
        </Button>
      </div>
    )
  }
  
  const formData = submission.form_data || {}
  const createdAt = submission.created_at ? new Date(submission.created_at) : null
  const name = formData.name || formData.full_name || formData.first_name || 'Anonymous'
  const email = formData.email || ''
  const phone = formData.phone || ''
  const company = formData.company || formData.company_name || ''
  const qualityTier = submission.quality_tier || 'medium'
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center text-white font-medium text-lg"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">{name}</h1>
              <p className="text-sm text-[var(--text-tertiary)]">
                {submission.form?.name || 'Unknown Form'} • {createdAt && isValid(createdAt) 
                  ? formatDistanceToNow(createdAt, { addSuffix: true })
                  : 'Unknown date'
                }
              </p>
            </div>
          </div>
          
          {qualityTier && QUALITY_TIER[qualityTier] && (() => {
            const QualityIcon = QUALITY_TIER[qualityTier].icon
            return (
              <Badge className={QUALITY_TIER[qualityTier].className}>
                {QualityIcon && <QualityIcon className="h-3 w-3 mr-1" />}
                {QUALITY_TIER[qualityTier].label}
              </Badge>
            )
          })()}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={submission.status || 'new'} onValueChange={updateStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          
          <Button 
            style={{ backgroundColor: 'var(--brand-primary)' }}
            className="text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Add to CRM
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Contact Info */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg-hover)]">
                    <Mail className="h-5 w-5 text-[var(--text-tertiary)]" />
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Email</p>
                      <a href={`mailto:${email}`} className="text-sm text-[var(--text-primary)] hover:underline">
                        {email}
                      </a>
                    </div>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg-hover)]">
                    <Phone className="h-5 w-5 text-[var(--text-tertiary)]" />
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Phone</p>
                      <a href={`tel:${phone}`} className="text-sm text-[var(--text-primary)] hover:underline">
                        {phone}
                      </a>
                    </div>
                  </div>
                )}
                {company && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg-hover)]">
                    <Building className="h-5 w-5 text-[var(--text-tertiary)]" />
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Company</p>
                      <p className="text-sm text-[var(--text-primary)]">{company}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg-hover)]">
                  <Clock className="h-5 w-5 text-[var(--text-tertiary)]" />
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Submitted</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {createdAt && isValid(createdAt) ? format(createdAt, 'PPpp') : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Form Responses */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-base">Form Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(formData).map(([key, value]) => {
                  // Skip common contact fields shown above
                  if (['email', 'phone', 'name', 'full_name', 'first_name', 'last_name', 'company', 'company_name'].includes(key)) {
                    return null
                  }
                  
                  return (
                    <div key={key} className="p-4 rounded-lg bg-[var(--glass-bg-hover)]">
                      <p className="text-xs text-[var(--text-tertiary)] capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Notes */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this submission..."
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={saveNotes}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Signal AI Analysis */}
          {hasSignal && (
            <Card className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/5 border-[var(--glass-border)]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SignalIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                  <CardTitle className="text-base">Signal Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lead Score */}
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">Lead Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 bg-[var(--glass-border)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${submission.lead_score || 50}%`,
                          backgroundColor: 'var(--brand-primary)'
                        }}
                      />
                    </div>
                    <span className="text-lg font-bold text-[var(--text-primary)]">
                      {submission.lead_score || 50}
                    </span>
                  </div>
                </div>
                
                {/* AI Insights */}
                {submission.ai_analysis && (
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-2">AI Insights</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {typeof submission.ai_analysis === 'string' 
                        ? submission.ai_analysis 
                        : submission.ai_analysis.summary || 'No analysis available'
                      }
                    </p>
                  </div>
                )}
                
                {/* Spam Score */}
                {submission.spam_score !== null && (
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Spam Risk</p>
                    <Badge className={cn(
                      "text-xs",
                      submission.spam_score < 30 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : submission.spam_score < 70
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      {submission.spam_score < 30 ? 'Low' : submission.spam_score < 70 ? 'Medium' : 'High'} ({submission.spam_score}%)
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Tags */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {submission.tags && submission.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {submission.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">No tags</p>
              )}
            </CardContent>
          </Card>
          
          {/* Metadata */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Form</span>
                <span className="text-[var(--text-primary)]">{submission.form?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Submission ID</span>
                <span className="text-[var(--text-primary)] font-mono text-xs">{submission.id.slice(0, 8)}</span>
              </div>
              {submission.source_url && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Source URL</span>
                  <span className="text-[var(--text-primary)] truncate max-w-[150px]">{submission.source_url}</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Submission
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
