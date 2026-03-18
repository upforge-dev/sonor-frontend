/**
 * ProspectDetailPanel - Glass-styled slide-over panel for prospect details
 * Features: Tabbed content, glass surfaces, smooth animations, quick actions
 */
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  X,
  Phone,
  Mail,
  Globe,
  Building2,
  Tag,
  Send,
  FileText,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  Sparkles,
  RefreshCw,
  FileSearch,
  ExternalLink,
  BarChart3,
  Server,
  Activity,
  GitBranch,
  UserCheck,
  CheckSquare,
  Eye,
  MousePointerClick,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pencil,
  UserPlus
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { 
  GlassCard, 
  GlassAvatar, 
  GlassMetric, 
  ScoreRing,
  GlassEmptyState,
  LeadQualityBadge,
  SentimentBadge,
  StatusBadge
} from './ui'
import { PIPELINE_STAGES } from './pipelineStages'
import ProspectCallsTab from './ProspectCallsTab'
import ProspectTimeline from './ProspectTimeline'
import ProspectEmailsWithSignal from './ProspectEmailsWithSignal'
import EditProspectDialog from './EditProspectDialog'
import AssignContactDialog from './AssignContactDialog'
import { useProspectTimeline } from '@/hooks/useProspectTimeline'
import { EchoGenerateButton } from '@/components/ai/EchoGenerateButton'
import { EchoTextActions } from '@/components/ai/EchoTextActions'

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Overview Tab Content
function OverviewTab({ prospect, onUpdateStage }) {
  const stageConfig = PIPELINE_STAGES[prospect.pipeline_stage || 'new_lead']

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <GlassMetric
          label="Calls"
          value={prospect.call_count || 0}
          icon={Phone}
          color="blue"
          size="sm"
        />
        <GlassMetric
          label="Talk Time"
          value={formatDuration(prospect.total_call_duration || 0)}
          icon={Clock}
          color="purple"
          size="sm"
        />
        <div className="glass rounded-2xl p-3 flex flex-col items-center justify-center">
          <LeadQualityBadge score={prospect.avg_lead_quality} size="md" />
          <p className="text-xs text-[var(--text-tertiary)] mt-1.5">Lead Score</p>
        </div>
        <GlassMetric
          label="Last Contact"
          value={prospect.last_contact_at ? formatRelativeTime(prospect.last_contact_at) : 'Never'}
          icon={Activity}
          color="default"
          size="sm"
        />
      </div>
      
      {/* Contact Information */}
      <GlassCard padding="md">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Contact Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
              <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Email</p>
              <p className="text-sm text-[var(--text-primary)]">{prospect.email || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
              <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Phone</p>
              <p className="text-sm text-[var(--text-primary)]">{prospect.phone || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
              <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Company</p>
              <p className="text-sm text-[var(--text-primary)]">{prospect.company || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
              <Tag className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Source</p>
              <p className="text-sm text-[var(--text-primary)] capitalize">{prospect.source || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </GlassCard>
      
      {/* Last Call Summary */}
      {prospect.last_call && (
        <GlassCard padding="md">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Last Call</h4>
          <div className="flex items-center gap-3 mb-3">
            {prospect.last_call.direction === 'inbound' ? (
              <div className="p-2 rounded-xl bg-[#4bbf39]/10">
                <PhoneIncoming className="h-4 w-4 text-[#4bbf39]" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-[#39bfb0]/10">
                <PhoneOutgoing className="h-4 w-4 text-[#39bfb0]" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{formatDuration(prospect.last_call.duration)}</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-sm text-[var(--text-tertiary)]">
                  {formatRelativeTime(prospect.last_call.created_at)}
                </span>
                <SentimentBadge sentiment={prospect.last_call.sentiment} />
              </div>
            </div>
          </div>
          {prospect.last_call.ai_summary && (
            <div className="p-3 rounded-xl bg-[var(--glass-bg-inset)] text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5 text-[#39bfb0] mb-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">AI Summary</span>
              </div>
              {prospect.last_call.ai_summary}
            </div>
          )}
        </GlassCard>
      )}
      
      {/* Pipeline Stage Selector */}
      <GlassCard padding="md">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pipeline Stage</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PIPELINE_STAGES).map(([stage, config]) => {
            const StageIcon = config.icon
            const isActive = (prospect.pipeline_stage || 'new_lead') === stage
            
            return (
              <Button
                key={stage}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'rounded-xl transition-all duration-200',
                  isActive && config.color + ' text-white border-0 shadow-md'
                )}
                onClick={() => onUpdateStage?.(prospect.id, stage)}
              >
                <StageIcon className="h-3.5 w-3.5 mr-1.5" />
                {config.label}
              </Button>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}

// Website Intel Tab
function WebsiteTab({ 
  prospect, 
  onAnalyze, 
  onGenerateAudit,
  isAnalyzing = false 
}) {
  const hasWebsiteData = prospect.health_metrics || prospect.tech_stack || prospect.ai_summary

  return (
    <div className="space-y-6">
      {/* Rebuild Score & Actions */}
      <div className="flex items-center gap-4">
        {prospect.rebuild_score != null && (
          <div className="flex-1">
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">Rebuild Potential</span>
                <ScoreRing value={prospect.rebuild_score} size="md" />
              </div>
              <Progress value={prospect.rebuild_score} className="h-2" />
            </GlassCard>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            disabled={!prospect.website || isAnalyzing}
            className="rounded-xl"
          >
            {isAnalyzing ? (
              <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Analyze Site
          </Button>
          <Button
            size="sm"
            onClick={onGenerateAudit}
            disabled={!prospect.website}
            className="rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
          >
            <FileSearch className="h-4 w-4 mr-2" />
            Generate Audit
          </Button>
        </div>
      </div>

      {/* AI Summary */}
      {prospect.ai_summary && (
        <GlassCard padding="md" glow="purple">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#39bfb0]" />
            AI Summary
          </h4>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{prospect.ai_summary}</p>
        </GlassCard>
      )}

      {/* Performance Metrics */}
      {prospect.health_metrics && (
        <GlassCard padding="md">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#4bbf39]" />
            Performance Scores
          </h4>
          <div className="grid grid-cols-2 gap-6">
            {/* Mobile */}
            <div className="space-y-3">
              <h5 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Mobile</h5>
              {prospect.health_metrics.mobile && (
                <div className="flex items-center justify-center gap-4">
                  <ScoreRing 
                    value={prospect.health_metrics.mobile.performance} 
                    label="Perf" 
                    size="md" 
                  />
                  <ScoreRing 
                    value={prospect.health_metrics.mobile.seo} 
                    label="SEO" 
                    size="md" 
                  />
                  <ScoreRing 
                    value={prospect.health_metrics.mobile.accessibility} 
                    label="A11y" 
                    size="md"
                    color="blue" 
                  />
                </div>
              )}
            </div>
            {/* Desktop */}
            <div className="space-y-3">
              <h5 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Desktop</h5>
              {prospect.health_metrics.desktop && (
                <div className="flex items-center justify-center gap-4">
                  <ScoreRing 
                    value={prospect.health_metrics.desktop.performance} 
                    label="Perf" 
                    size="md" 
                  />
                  <ScoreRing 
                    value={prospect.health_metrics.desktop.seo} 
                    label="SEO" 
                    size="md" 
                  />
                  <ScoreRing 
                    value={prospect.health_metrics.desktop.accessibility} 
                    label="A11y" 
                    size="md"
                    color="blue" 
                  />
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tech Stack */}
      {prospect.tech_stack && (
        <GlassCard padding="md">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-[#39bfb0]" />
            Technology Stack
          </h4>
          <div className="space-y-3">
            {prospect.tech_stack.platform && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-[var(--text-secondary)]">Platform:</span>
                <StatusBadge status={prospect.tech_stack.platform} variant="info" />
                {prospect.tech_stack.theme && (
                  <StatusBadge status={prospect.tech_stack.theme} variant="default" />
                )}
              </div>
            )}
            {prospect.tech_stack.plugins?.length > 0 && (
              <div>
                <span className="text-sm text-[var(--text-secondary)]">Plugins:</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {prospect.tech_stack.plugins.map(plugin => (
                    <StatusBadge key={plugin} status={plugin} variant="default" size="sm" />
                  ))}
                </div>
              </div>
            )}
            {prospect.tech_stack.frameworks?.length > 0 && (
              <div>
                <span className="text-sm text-[var(--text-secondary)]">Frameworks:</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {prospect.tech_stack.frameworks.map(fw => (
                    <StatusBadge key={fw} status={fw} variant="purple" size="sm" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!hasWebsiteData && (
        <GlassEmptyState
          icon={Globe}
          title="No website intel yet"
          description={prospect.website 
            ? 'Click "Analyze Site" to gather performance and tech stack data'
            : 'Add a website URL to this contact first'
          }
          size="md"
        />
      )}
    </div>
  )
}

// Audits Tab
function AuditsTab({ 
  audits = [], 
  isLoading = false,
  onGenerateAudit,
  onSendAudit,
  onViewAudit
}) {
  const statusVariants = {
    pending: 'warning',
    running: 'info',
    complete: 'success',
    completed: 'success',
    failed: 'error'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onGenerateAudit}
          className="rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
        >
          <FileSearch className="h-4 w-4 mr-2" />
          Generate New Audit
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <UptradeSpinner size="md" className="[&_p]:hidden" />
        </div>
      ) : audits.length === 0 ? (
        <GlassEmptyState
          icon={FileSearch}
          title="No audits yet"
          description="Generate an audit to analyze this prospect's website"
          size="md"
        />
      ) : (
        <div className="space-y-3">
          {audits.map(audit => {
            const score = audit.scores?.performance 
              || audit.performance_score 
              || (audit.fullAuditJson?.lighthouseResult?.categories?.performance?.score * 100)
              || null

            return (
              <GlassCard key={audit.id} padding="md" hover className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ScoreRing 
                      value={score || 0} 
                      size="md"
                      showValue={!!score}
                    />
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{audit.targetUrl || audit.target_url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge 
                          status={audit.status} 
                          variant={statusVariants[audit.status] || 'default'}
                          dot
                          size="sm"
                        />
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {new Date(audit.createdAt || audit.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(audit.status === 'complete' || audit.status === 'completed') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => onViewAudit?.(audit)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => onSendAudit?.(audit)}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      </>
                    )}
                    {(audit.status === 'pending' || audit.status === 'running') && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4 [&_svg]:text-amber-600" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {audit.sent_at && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <Mail className="h-3 w-3" />
                    <span>Sent {new Date(audit.sent_at).toLocaleDateString()}</span>
                    {audit.sent_to && <span>to {audit.sent_to}</span>}
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Emails Tab
function EmailsTab({ emails = [], scheduledFollowups = [], isLoading = false, onCancelFollowup }) {
  const statusConfigs = {
    sent: { variant: 'default', icon: Mail },
    delivered: { variant: 'info', icon: CheckCircle2 },
    opened: { variant: 'success', icon: Eye },
    clicked: { variant: 'purple', icon: MousePointerClick },
    bounced: { variant: 'error', icon: XCircle },
    complained: { variant: 'error', icon: AlertCircle }
  }

  const followupStatusConfigs = {
    pending: { variant: 'warning', label: 'Scheduled', icon: Clock },
    sent: { variant: 'success', label: 'Sent', icon: CheckCircle2 },
    cancelled: { variant: 'default', label: 'Cancelled', icon: XCircle },
    failed: { variant: 'error', label: 'Failed', icon: AlertCircle }
  }

  const pendingFollowups = scheduledFollowups.filter(f => f.status === 'pending')

  return (
    <div className="space-y-4">
      {/* Scheduled Follow-ups Section */}
      {pendingFollowups.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Scheduled Follow-ups ({pendingFollowups.length})
          </h4>
          {pendingFollowups.map(followup => {
            const scheduledDate = new Date(followup.scheduled_for)
            const daysUntil = Math.ceil((scheduledDate - new Date()) / (1000 * 60 * 60 * 24))
            
            return (
              <GlassCard key={followup.id} padding="md" className="border-l-2 border-l-amber-500">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{followup.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-1">
                      <span>
                        {daysUntil > 0 
                          ? `Sends in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`
                          : daysUntil === 0 
                            ? 'Sends today'
                            : 'Overdue'}
                      </span>
                      <span>•</span>
                      <span>{scheduledDate.toLocaleDateString()}</span>
                      {followup.stop_on_reply && (
                        <>
                          <span>•</span>
                          <span className="text-[#4bbf39]">Stops if replied</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                      {followup.body}
                    </p>
                  </div>
                  {onCancelFollowup && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelFollowup(followup.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Sent Emails Section */}
      <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <UptradeSpinner size="md" className="[&_p]:hidden" />
        </div>
      ) : emails.length === 0 ? (
        <GlassEmptyState
          icon={Mail}
          title="No emails sent yet"
          description="Send an audit to start tracking email engagement"
          size="md"
        />
      ) : (
        emails.map(email => {
          const config = statusConfigs[email.status] || statusConfigs.sent
          const StatusIcon = config.icon

          return (
            <GlassCard key={email.id} padding="md">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-xl',
                  config.variant === 'success' && 'bg-[#4bbf39]/10',
                  config.variant === 'purple' && 'bg-[#39bfb0]/10',
                  config.variant === 'info' && 'bg-[#4bbf39]/10',
                  config.variant === 'error' && 'bg-red-500/10',
                  config.variant === 'default' && 'bg-gray-500/10'
                )}>
                  <StatusIcon className={cn(
                    'h-4 w-4',
                    config.variant === 'success' && 'text-[#4bbf39]',
                    config.variant === 'purple' && 'text-[#39bfb0]',
                    config.variant === 'info' && 'text-[#4bbf39]',
                    config.variant === 'error' && 'text-red-500',
                    config.variant === 'default' && 'text-gray-500'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{email.subject}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-1 flex-wrap">
                    <span>Sent {new Date(email.sent_at).toLocaleDateString()}</span>
                    {email.delivered_at && <span>• Delivered</span>}
                    {email.opened_at && (
                      <span className="text-[#4bbf39]">• Opened {email.open_count || 1}x</span>
                    )}
                    {email.clicked_at && (
                      <span className="text-[#39bfb0]">• Clicked {email.click_count || 1}x</span>
                    )}
                  </div>
                  {email.clicked_links?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {email.clicked_links.slice(0, 3).map((link, i) => (
                        <StatusBadge key={i} status={new URL(link.url).pathname || 'link'} variant="default" size="sm" />
                      ))}
                    </div>
                  )}
                </div>
                <StatusBadge status={email.status} variant={config.variant} />
              </div>
            </GlassCard>
          )
        })
      )}
      </div>
    </div>
  )
}

// Notes Tab
function NotesTab({
  notes = [],
  isLoading = false,
  newNote = '',
  onNewNoteChange,
  onAddNote,
  isAddingNote = false,
  prospectId
}) {
  const noteContainerRef = useRef(null)

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <GlassCard padding="md">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Add Note</h4>
        <div className="flex gap-2">
          <div ref={noteContainerRef} className="relative flex-1">
            <Textarea
              placeholder="Add a note about this prospect..."
              value={newNote}
              onChange={(e) => onNewNoteChange?.(e.target.value)}
              rows={2}
              className="rounded-xl w-full"
            />
            <EchoTextActions
              containerRef={noteContainerRef}
              onReplace={(newText, { start, end }) =>
                onNewNoteChange?.(newNote.slice(0, start) + newText + newNote.slice(end))
              }
              entityType="crm_contact"
              entityId={prospectId}
            />
          </div>
          <div className="flex flex-col gap-2 self-end">
            <EchoGenerateButton
              entityType="crm_contact"
              entityId={prospectId}
              field="note"
              currentValue={newNote}
              onGenerate={(text) => onNewNoteChange?.(text)}
              size="sm"
            />
            <Button
              onClick={onAddNote}
              disabled={!newNote?.trim() || isAddingNote}
              className="rounded-xl"
            >
              {isAddingNote ? (
                <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </GlassCard>
      
      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <UptradeSpinner size="md" className="[&_p]:hidden" />
        </div>
      ) : notes.length === 0 ? (
        <GlassEmptyState
          icon={MessageSquare}
          title="No notes yet"
          description="Add a note to keep track of important details"
          size="sm"
        />
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <GlassCard key={note.id} padding="sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#39bfb0]/10">
                  <MessageSquare className="h-4 w-4 text-[#39bfb0]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">{note.description || note.content}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {note.metadata?.created_by_email || 'Unknown'} • {formatRelativeTime(note.timestamp || note.created_at)}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// Activity Tab
function ActivityTab({ activity = [], isLoading = false }) {
  const iconMap = {
    call: Phone,
    note: MessageSquare,
    stage_change: GitBranch,
    proposal: FileText,
    follow_up: Clock,
    task: CheckSquare,
    email_sent: Mail,
    converted: UserCheck
  }

  const colorMap = {
    call: 'bg-[#4bbf39]/10 text-[#4bbf39]',
    note: 'bg-[#39bfb0]/10 text-[#39bfb0]',
    stage_change: 'bg-[#39bfb0]/10 text-[#39bfb0]',
    proposal: 'bg-[#4bbf39]/10 text-[#4bbf39]',
    follow_up: 'bg-amber-500/10 text-amber-500',
    task: 'bg-[#4bbf39]/10 text-[#4bbf39]',
    email_sent: 'bg-[#39bfb0]/10 text-[#39bfb0]',
    converted: 'bg-[#4bbf39]/10 text-[#4bbf39]'
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <UptradeSpinner size="md" className="[&_p]:hidden" />
        </div>
      ) : activity.length === 0 ? (
        <GlassEmptyState
          icon={Activity}
          title="No activity yet"
          description="Activity will appear here as you interact with this prospect"
          size="md"
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--glass-border)]" />
          
          <div className="space-y-4">
            {activity.map((item, index) => {
              const Icon = iconMap[item.type] || Activity
              const colors = colorMap[item.type] || 'bg-gray-500/10 text-gray-500'

              return (
                <div key={item.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className={cn(
                    'relative z-10 p-2 rounded-xl',
                    colors.split(' ')[0]
                  )}>
                    <Icon className={cn('h-4 w-4', colors.split(' ')[1])} />
                  </div>
                  
                  {/* Content */}
                  <GlassCard padding="sm" className="flex-1">
                    <p className="font-medium text-sm text-[var(--text-primary)]">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">{item.description}</p>
                    )}
                    <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </GlassCard>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Main Panel Component
export default function ProspectDetailPanel({
  prospect,
  isOpen = false,
  onClose,
  // Data
  audits = [],
  emails = [],
  scheduledFollowups = [],
  activity = [],
  notes = [],
  calls = [],
  // Loading states
  isLoadingAudits = false,
  isLoadingEmails = false,
  isLoadingActivity = false,
  isLoadingCalls = false,
  // Actions
  onUpdateStage,
  onUpdateProspect,
  onAnalyzeWebsite,
  onGenerateAudit,
  onSendAudit,
  onViewAudit,
  onAddNote,
  onConvertToUser,
  onCreateProposal,
  onComposeEmail,
  onCall,
  onCancelFollowup,
  // Note form
  newNote = '',
  onNewNoteChange,
  isAddingNote = false,
  isAnalyzing = false
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  // Timeline hook
  const {
    events: timelineEvents,
    attribution: timelineAttribution,
    isLoading: isLoadingTimeline,
    error: timelineError,
    hasMore: hasMoreTimeline,
    loadMore: loadMoreTimeline,
    refresh: refreshTimeline
  } = useProspectTimeline(prospect?.id, prospect?.converted_contact_id)

  // Filter notes from activity
  const noteItems = activity.filter(a => a.type === 'note')

  // Handle assignment
  const handleAssign = async (teamMemberId, notify) => {
    setIsAssigning(true)
    try {
      if (onUpdateProspect) {
        await onUpdateProspect({ ...prospect, assigned_to: teamMemberId })
      }
      setIsAssignDialogOpen(false)
    } catch (error) {
      console.error('Assignment failed:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  // Handle save from edit dialog
  const handleSaveProspect = (updatedProspect) => {
    if (onUpdateProspect) {
      onUpdateProspect(updatedProspect)
    }
  }

  if (!isOpen || !prospect) return null

  return (
    <>
      {/* Edit Dialog */}
      <EditProspectDialog
        prospect={prospect}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleSaveProspect}
      />

      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div data-sonor-help="crm/contact-detail" className={cn(
        'fixed right-0 top-0 bottom-0 w-full max-w-3xl z-50',
        'glass-elevated border-l border-[var(--glass-border)]',
        'flex flex-col',
        'animate-in slide-in-from-right duration-300'
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <GlassAvatar 
                name={prospect.name} 
                src={prospect.avatar}
                size="lg"
                gradient="brand"
              />
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{prospect.name}</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {[prospect.company, prospect.email].filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditDialogOpen(true)} 
                className="rounded-xl"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-4">
            {prospect.phone && (
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <a href={`tel:${prospect.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              </Button>
            )}
            {prospect.email && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl"
                onClick={() => onComposeEmail?.(prospect)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            {prospect.website && (
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <a href={prospect.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-2" />
                  Website
                </a>
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={onConvertToUser}
              disabled={!prospect.email}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Magic Link
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
              onClick={onCreateProposal}
              disabled={!prospect.email}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Proposal
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0 grid grid-cols-8 mx-6 mt-4 bg-[var(--glass-bg-inset)] p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-xs">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="website" className="rounded-lg text-xs">Website</TabsTrigger>
            <TabsTrigger value="audits" className="rounded-lg text-xs">Audits</TabsTrigger>
            <TabsTrigger value="calls" className="rounded-lg text-xs">Calls</TabsTrigger>
            <TabsTrigger value="emails" className="rounded-lg text-xs">Emails</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-lg text-xs">Notes</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg text-xs">Activity</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 p-6">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab prospect={prospect} onUpdateStage={onUpdateStage} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <ProspectTimeline
                prospectId={prospect?.id}
                contactId={prospect?.converted_contact_id}
                events={timelineEvents}
                isLoading={isLoadingTimeline}
                error={timelineError}
                onLoadMore={loadMoreTimeline}
                hasMore={hasMoreTimeline}
                attribution={timelineAttribution}
              />
            </TabsContent>
            
            <TabsContent value="website" className="mt-0">
              <WebsiteTab 
                prospect={prospect} 
                onAnalyze={onAnalyzeWebsite}
                onGenerateAudit={onGenerateAudit}
                isAnalyzing={isAnalyzing}
              />
            </TabsContent>
            
            <TabsContent value="audits" className="mt-0">
              <AuditsTab 
                audits={audits}
                isLoading={isLoadingAudits}
                onGenerateAudit={onGenerateAudit}
                onSendAudit={onSendAudit}
                onViewAudit={onViewAudit}
              />
            </TabsContent>
            
            <TabsContent value="calls" className="mt-0">
              <ProspectCallsTab 
                calls={calls}
                isLoading={isLoadingCalls}
                onCall={() => onCall?.(prospect)}
              />
            </TabsContent>
            
            <TabsContent value="emails" className="mt-0">
              {/* Gmail threads with Signal insights */}
              <ProspectEmailsWithSignal
                prospect={prospect}
                onComposeEmail={onComposeEmail}
                brandColors={{
                  primary: 'var(--brand-primary)',
                  secondary: 'var(--brand-primary)'
                }}
              />
              
              {/* Separator for outbound prospecting emails */}
              {(emails.length > 0 || scheduledFollowups.length > 0) && (
                <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                    Prospecting Emails
                  </h4>
                  <EmailsTab 
                    emails={emails} 
                    scheduledFollowups={scheduledFollowups}
                    isLoading={isLoadingEmails} 
                    onCancelFollowup={onCancelFollowup}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="notes" className="mt-0">
              <NotesTab
                notes={noteItems}
                isLoading={isLoadingActivity}
                newNote={newNote}
                onNewNoteChange={onNewNoteChange}
                onAddNote={onAddNote}
                isAddingNote={isAddingNote}
                prospectId={prospect?.id}
              />
            </TabsContent>
            
            <TabsContent value="activity" className="mt-0">
              <ActivityTab activity={activity} isLoading={isLoadingActivity} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <EditProspectDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        prospect={prospect}
        onSave={handleSaveProspect}
      />

      {/* Assign Dialog */}
      <AssignContactDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        contacts={[prospect]}
        currentAssignee={prospect?.assigned_to}
        onAssign={handleAssign}
        isLoading={isAssigning}
      />
    </>
  )
}
