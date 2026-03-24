/**
 * EmailCampaignsTab - Campaign management with glass design system
 * Code-split from EmailPlatform.jsx for better load performance
 *
 * UX improvements over original:
 * - Draft campaigns surface Edit + Send buttons directly on card
 * - Send confirmation modal before sending
 * - Scheduled time shown prominently on card
 * - Full status filter set (all, draft, scheduled, sending, sent, paused, cancelled)
 * - Resume action for paused campaigns
 * - Search matches both name and subject
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { OutreachStatusBadge, OutreachLoading, OutreachEmptyState } from '@/components/outreach/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Send,
  Clock,
  Eye,
  Copy,
  Trash2,
  BarChart3,
  XCircle,
  Play,
  Mail,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import EmailConfigWarning from '../EmailConfigWarning'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatScheduledDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatSentDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function calcRate(numerator, denominator) {
  if (!denominator || !numerator) return '0.0'
  return ((numerator / denominator) * 100).toFixed(1)
}

function getRecipientCount(campaign) {
  return campaign.total_recipients || campaign.list_count || 0
}

// ─── Send Confirmation Dialog ───────────────────────────────────────────────

function SendConfirmationDialog({ campaign, open, onOpenChange, onConfirm, sending }) {
  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Send Campaign
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to send this campaign? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-[var(--radius-lg)] bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Campaign</span>
              <span className="text-sm font-semibold text-[var(--text-primary)] text-right">{campaign.name}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Subject</span>
              <span className="text-sm text-[var(--text-secondary)] text-right truncate max-w-[260px]">{campaign.subject}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Recipients</span>
              <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {getRecipientCount(campaign).toLocaleString()}
              </span>
            </div>
            {campaign.from_address && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">From</span>
                <span className="text-sm text-[var(--text-secondary)]">{campaign.from_address}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={sending}
            className="gap-2"
          >
            {sending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Campaign Card ──────────────────────────────────────────────────────────

function CampaignCard({ campaign, onEdit, onSend, onViewAnalytics }) {
  const { status } = campaign
  const isDraft = status === 'draft'
  const isScheduled = status === 'scheduled'
  const isSent = status === 'sent'
  const isPaused = status === 'paused'

  return (
    <GlassCard hover className="group">
      <GlassCardContent className="p-4 pt-4">
        <div className="flex items-start gap-4">
          {/* Campaign info */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Status + Name */}
            <div className="flex items-center gap-2 mb-1">
              <OutreachStatusBadge status={status} />
              <h3 className="font-semibold text-[var(--text-primary)] truncate">{campaign.name}</h3>
            </div>

            {/* Row 2: Subject */}
            <p className="text-sm text-[var(--text-secondary)] truncate mb-2">
              Subject: {campaign.subject || '(no subject)'}
            </p>

            {/* Row 3: Contextual info */}
            {isDraft && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(campaign)
                  }}
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSend(campaign)
                  }}
                >
                  <Send className="h-3 w-3" />
                  Finish & Send
                </Button>
              </div>
            )}

            {isScheduled && campaign.scheduled_for && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                Scheduled for {formatScheduledDate(campaign.scheduled_for)}
              </div>
            )}

            {isSent && campaign.sent_at && (
              <span className="text-xs text-[var(--text-tertiary)]">
                Sent {formatSentDate(campaign.sent_at)}
              </span>
            )}

            {isPaused && (
              <span className="text-xs text-[var(--text-tertiary)]">
                Campaign paused — resume from the menu
              </span>
            )}
          </div>

          {/* Sent stats */}
          {isSent && (
            <div className="flex items-center gap-5 text-sm shrink-0">
              <div className="text-center">
                <p className="font-semibold text-[var(--text-primary)]">
                  {calcRate(campaign.unique_opens, campaign.emails_sent)}%
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Open Rate</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--text-primary)]">
                  {calcRate(campaign.unique_clicks, campaign.emails_sent)}%
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Click Rate</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--text-primary)]">
                  {(campaign.emails_sent || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">Recipients</p>
              </div>
            </div>
          )}

          {isScheduled && (
            <div className="text-center shrink-0">
              <p className="font-semibold text-[var(--text-primary)]">
                {getRecipientCount(campaign).toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Recipients</p>
            </div>
          )}

          {/* Dropdown actions */}
          <CampaignDropdown
            campaign={campaign}
            onEdit={onEdit}
            onSend={onSend}
            onViewAnalytics={onViewAnalytics}
          />
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

// ─── Campaign Dropdown ──────────────────────────────────────────────────────

function CampaignDropdown({ campaign, onEdit, onSend, onViewAnalytics }) {
  const { status } = campaign

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {/* Edit — always available for draft */}
        {status === 'draft' && (
          <DropdownMenuItem onClick={() => onEdit(campaign)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}

        {/* Send / Schedule — for drafts */}
        {status === 'draft' && (
          <DropdownMenuItem onClick={() => onSend(campaign)}>
            <Send className="h-4 w-4 mr-2" />
            Send Now
          </DropdownMenuItem>
        )}

        {/* Resume — for paused */}
        {status === 'paused' && (
          <DropdownMenuItem onClick={() => onSend(campaign)}>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </DropdownMenuItem>
        )}

        {/* Cancel — for scheduled */}
        {status === 'scheduled' && (
          <DropdownMenuItem>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </DropdownMenuItem>
        )}

        <DropdownMenuItem>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>

        {/* Analytics — for sent */}
        {status === 'sent' && (
          <DropdownMenuItem onClick={() => onViewAnalytics(campaign)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function EmailCampaignsTab({ onCreateCampaign, onEditCampaign, onViewAnalytics }) {
  const { campaigns, campaignsLoading, fetchCampaigns, sendCampaign } = useEmailPlatformStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sendModalCampaign, setSendModalCampaign] = useState(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Filter: search name + subject, filter by status
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const nameMatch = c.name?.toLowerCase().includes(q)
        const subjectMatch = c.subject?.toLowerCase().includes(q)
        if (!nameMatch && !subjectMatch) return false
      }
      return true
    })
  }, [campaigns, statusFilter, searchQuery])

  // Active filter label
  const activeFilterLabel = useMemo(() => {
    const found = STATUS_FILTERS.find((f) => f.value === statusFilter)
    return found?.label || 'All Status'
  }, [statusFilter])

  // Handle send confirmation
  const handleSendConfirm = useCallback(async () => {
    if (!sendModalCampaign) return
    setIsSending(true)
    try {
      await sendCampaign(sendModalCampaign.id)
      setSendModalCampaign(null)
    } catch {
      // Error is handled by the store; keep modal open so user can retry
    } finally {
      setIsSending(false)
    }
  }, [sendModalCampaign, sendCampaign])

  // Open send confirmation modal
  const handleSendRequest = useCallback((campaign) => {
    setSendModalCampaign(campaign)
  }, [])

  return (
    <div className="space-y-6">
      {/* Email Config Warning */}
      <EmailConfigWarning />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {activeFilterLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {STATUS_FILTERS.map((filter) => (
              <DropdownMenuItem
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={statusFilter === filter.value ? 'font-semibold' : ''}
              >
                {filter.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onCreateCampaign} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      {campaignsLoading ? (
        <OutreachLoading label="Loading campaigns..." />
      ) : filteredCampaigns.length === 0 ? (
        <OutreachEmptyState
          icon={Mail}
          title={searchQuery || statusFilter !== 'all' ? 'No matching campaigns' : 'No campaigns yet'}
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first email campaign to get started'
          }
          action={
            !searchQuery && statusFilter === 'all' ? (
              <Button onClick={onCreateCampaign} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={onEditCampaign}
              onSend={handleSendRequest}
              onViewAnalytics={onViewAnalytics}
            />
          ))}
        </div>
      )}

      {/* Send Confirmation Modal */}
      <SendConfirmationDialog
        campaign={sendModalCampaign}
        open={!!sendModalCampaign}
        onOpenChange={(open) => {
          if (!open) setSendModalCampaign(null)
        }}
        onConfirm={handleSendConfirm}
        sending={isSending}
      />
    </div>
  )
}
