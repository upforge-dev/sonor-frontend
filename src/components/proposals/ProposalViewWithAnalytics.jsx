// src/components/ProposalViewWithAnalytics.jsx
/**
 * Read-only Proposal View with Analytics Overlay
 * Shows the proposal as clients see it, plus analytics data for admins
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Eye,
  Clock,
  MousePointer,
  Timer,
  TrendingUp,
  BarChart2,
  Users,
  Loader2,
  MapPin,
  Monitor,
  Smartphone,
  Globe,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  Mail,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import ProposalView from './ProposalView'
import SendProposalDialog from './SendProposalDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { proposalsApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

// Analytics Summary Card
function AnalyticsStat({ icon: Icon, label, value, subValue, trend }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--surface-secondary)] rounded-lg">
      <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg">
        <Icon className="w-4 h-4 text-[var(--brand-primary)]" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
        {subValue && (
          <p className="text-xs text-[var(--text-tertiary)]">{subValue}</p>
        )}
      </div>
      {trend && (
        <div className={cn(
          "text-xs font-medium",
          trend > 0 ? "text-emerald-500" : "text-[var(--text-tertiary)]"
        )}>
          {trend > 0 && <TrendingUp className="w-3 h-3 inline mr-1" />}
          {trend}%
        </div>
      )}
    </div>
  )
}

// View Event Row
function ViewEvent({ view }) {
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '< 1s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return Monitor
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
      return Smartphone
    }
    return Monitor
  }

  const DeviceIcon = getDeviceIcon(view.userAgent)

  return (
    <div className="flex items-center gap-3 p-3 border-b border-[var(--border-primary)] last:border-0">
      <div className="p-2 bg-[var(--surface-tertiary)] rounded-lg">
        <DeviceIcon className="w-4 h-4 text-[var(--text-secondary)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {formatDateTime(view.viewedAt)}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          {view.city && view.region && (
            <>
              <MapPin className="w-3 h-3" />
              <span>{view.city}, {view.region}</span>
              <span>•</span>
            </>
          )}
          <Timer className="w-3 h-3" />
          <span>{formatDuration(view.timeOnPage)}</span>
          {view.scrollDepth > 0 && (
            <>
              <span>•</span>
              <span>{view.scrollDepth}% scrolled</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Section Heatmap
function SectionHeatmap({ sections }) {
  if (!sections || sections.length === 0) return null

  const maxViews = Math.max(...sections.map(s => s.views || 0))

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-[var(--text-primary)]">Section Engagement</h4>
      <div className="space-y-1">
        {sections.map((section, idx) => {
          const intensity = maxViews > 0 ? (section.views / maxViews) : 0
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-24 text-xs text-[var(--text-secondary)] truncate">
                {section.name || `Section ${idx + 1}`}
              </div>
              <div className="flex-1 h-6 bg-[var(--surface-tertiary)] rounded overflow-hidden">
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${intensity * 100}%`,
                    backgroundColor: `rgba(var(--brand-primary-rgb), ${0.3 + intensity * 0.7})`
                  }}
                />
              </div>
              <div className="w-12 text-xs text-[var(--text-tertiary)] text-right">
                {section.views} views
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProposalViewWithAnalytics({ proposal, onBack, onEdit }) {
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(true)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showResendDialog, setShowResendDialog] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false)
  const [markPaidForm, setMarkPaidForm] = useState({
    paymentMethod: 'check',
    reference: '',
    paidByName: '',
    paidByEmail: '',
  })
  const [markingPaid, setMarkingPaid] = useState(false)
  const [currentProposal, setCurrentProposal] = useState(proposal)

  const isSigned =
    Boolean(currentProposal?.client_signature_url) ||
    currentProposal?.status === 'accepted'

  // Best-effort check: show the "Mark Paid Offline" button whenever the proposal
  // is signed and doesn't already have a deposit_paid_at stamp. Backend will
  // reject with a clear message if there's actually no pending payment record.
  const depositAlreadyPaid = Boolean(currentProposal?.deposit_paid_at)
  const canMarkPaidOffline = isSigned && !depositAlreadyPaid

  const handleOpenResend = () => {
    // Pre-fill with the best-guess recipient so the user just hits "Send"
    const defaultEmail =
      currentProposal?.contact?.email ||
      currentProposal?.recipient_email ||
      currentProposal?.client_email ||
      ''
    setResendEmail(defaultEmail)
    setShowResendDialog(true)
  }

  const handleConfirmResend = async () => {
    if (!currentProposal?.id) return
    setResending(true)
    try {
      const { data } = await proposalsApi.resendSignedPdf(
        currentProposal.id,
        resendEmail?.trim() || undefined,
      )
      toast.success(
        `Signed copy sent to ${data?.to || resendEmail || 'the client'}${
          data?.regenerated ? ' (regenerated)' : ''
        }`,
      )
      setShowResendDialog(false)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to resend signed copy'
      toast.error(typeof message === 'string' ? message : 'Failed to resend signed copy')
    } finally {
      setResending(false)
    }
  }

  const handleOpenMarkPaid = () => {
    setMarkPaidForm({
      paymentMethod: 'check',
      reference: '',
      paidByName:
        currentProposal?.client_signed_name ||
        currentProposal?.contact?.name ||
        currentProposal?.recipient_name ||
        '',
      paidByEmail:
        currentProposal?.contact?.email ||
        currentProposal?.client_email ||
        currentProposal?.recipient_email ||
        '',
    })
    setShowMarkPaidDialog(true)
  }

  const handleConfirmMarkPaid = async () => {
    if (!currentProposal?.id) return
    setMarkingPaid(true)
    try {
      const payload = {
        paymentMethod: markPaidForm.paymentMethod,
        reference: markPaidForm.reference?.trim() || undefined,
        paidByName: markPaidForm.paidByName?.trim() || undefined,
        paidByEmail: markPaidForm.paidByEmail?.trim() || undefined,
      }
      await proposalsApi.markPaidOffline(currentProposal.id, payload)
      toast.success(
        `Deposit marked paid via ${markPaidForm.paymentMethod}${
          markPaidForm.reference ? ` (${markPaidForm.reference})` : ''
        }`,
      )
      setShowMarkPaidDialog(false)
      // Refresh the proposal so the button hides and the new state shows up
      proposalsApi
        .get(currentProposal.id)
        .then((res) => setCurrentProposal(res.data.proposal || res.data))
        .catch(() => {})
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to mark deposit as paid'
      toast.error(typeof message === 'string' ? message : 'Failed to mark deposit as paid')
    } finally {
      setMarkingPaid(false)
    }
  }

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      if (!proposal?.id) return
      
      setLoadingAnalytics(true)
      try {
        const response = await proposalsApi.getAnalytics(proposal.id)
        setAnalytics(response.data.analytics)
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setLoadingAnalytics(false)
      }
    }

    fetchAnalytics()
  }, [proposal?.id])

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const hasBeenViewed = proposal?.status !== 'draft' && (
    proposal?.viewedAt || 
    proposal?.viewed_at || 
    (analytics?.summary?.totalViews > 0)
  )

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-[var(--surface-primary)]/95 backdrop-blur border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[var(--border-primary)]" />
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-1">
                {proposal?.title || 'Untitled Proposal'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                {proposal?.contact?.company && (
                  <span>{proposal.contact.company}</span>
                )}
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {proposal?.status || 'draft'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasBeenViewed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                {showAnalyticsPanel ? 'Hide' : 'Show'} Analytics
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                Edit Proposal
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/p/${proposal?.slug}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Public Link
            </Button>

            {isSigned && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenResend}
                title={
                  currentProposal?.signed_pdf_sent_at
                    ? `Last sent ${new Date(currentProposal.signed_pdf_sent_at).toLocaleString()}`
                    : 'Signed copy has not been sent yet'
                }
              >
                <Mail className="w-4 h-4 mr-2" />
                Resend Signed Copy
              </Button>
            )}

            {canMarkPaidOffline && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenMarkPaid}
                title="Mark deposit as paid outside Sonor (check, wire, cash, external Stripe link, etc.)"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Mark Paid Offline
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setShowSendDialog(true)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] gap-2"
            >
              <Send className="w-4 h-4" />
              Send Proposal
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Analytics Panel */}
        {hasBeenViewed && showAnalyticsPanel && (
          <div className="w-80 border-r border-[var(--border-primary)] bg-[var(--surface-secondary)] p-4 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[var(--brand-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Analytics</h3>
              </div>

              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : analytics ? (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="views" className="flex-1 text-xs">Views</TabsTrigger>
                    <TabsTrigger value="engagement" className="flex-1 text-xs">Engagement</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3 mt-3">
                    <AnalyticsStat
                      icon={Eye}
                      label="Total Views"
                      value={analytics.summary?.totalViews || 0}
                      subValue={`${analytics.summary?.uniqueViews || 0} unique`}
                    />
                    <AnalyticsStat
                      icon={Timer}
                      label="Avg. Time on Page"
                      value={formatDuration(analytics.summary?.avgTimeOnPage || 0)}
                    />
                    <AnalyticsStat
                      icon={MousePointer}
                      label="Avg. Scroll Depth"
                      value={`${Math.round(analytics.summary?.avgScrollDepth || 0)}%`}
                    />
                    <AnalyticsStat
                      icon={Activity}
                      label="Engagement Score"
                      value={analytics.summary?.engagementScore || 'N/A'}
                    />
                  </TabsContent>

                  <TabsContent value="views" className="mt-3">
                    <div className="bg-[var(--surface-primary)] rounded-lg border border-[var(--border-primary)]">
                      {analytics.recentViews && analytics.recentViews.length > 0 ? (
                        analytics.recentViews.map((view, idx) => (
                          <ViewEvent key={idx} view={view} />
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
                          No view data available
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="engagement" className="mt-3 space-y-4">
                    <SectionHeatmap sections={analytics.sectionViews} />
                    
                    {analytics.clickEvents && analytics.clickEvents.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">Click Events</h4>
                        <div className="space-y-1">
                          {analytics.clickEvents.map((event, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs p-2 bg-[var(--surface-primary)] rounded">
                              <span className="text-[var(--text-secondary)]">{event.action}</span>
                              <Badge variant="secondary">{event.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                  <p className="text-sm text-[var(--text-tertiary)]">
                    No analytics data yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Proposal View */}
        <div className={cn(
          "flex-1 py-8 px-6",
          hasBeenViewed && showAnalyticsPanel ? "max-w-4xl" : "max-w-6xl mx-auto"
        )}>
          <ProposalView 
            proposal={currentProposal} 
            isPublicView={false}
            showSignature={false}
          />
        </div>
      </div>

      <SendProposalDialog
        proposal={currentProposal}
        client={currentProposal?.contact}
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        onSuccess={() => {
          setShowSendDialog(false)
          proposalsApi.get(currentProposal.id)
            .then(res => setCurrentProposal(res.data.proposal || res.data))
            .catch(() => {})
        }}
      />

      <Dialog
        open={showMarkPaidDialog}
        onOpenChange={(open) => {
          if (!markingPaid) setShowMarkPaidDialog(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark deposit paid offline</DialogTitle>
            <DialogDescription>
              Record that the deposit for{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {currentProposal?.title || 'this proposal'}
              </span>{' '}
              was paid outside Sonor. This fires the same "Deposit Paid" team
              notification as a real payment and kicks off project setup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="markpaid-method">Payment method</Label>
              <Select
                value={markPaidForm.paymentMethod}
                onValueChange={(value) =>
                  setMarkPaidForm((prev) => ({ ...prev, paymentMethod: value }))
                }
                disabled={markingPaid}
              >
                <SelectTrigger id="markpaid-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="wire">Wire transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="external">External card / Stripe link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="markpaid-reference">
                Reference <span className="text-[var(--text-tertiary)]">(optional)</span>
              </Label>
              <Input
                id="markpaid-reference"
                value={markPaidForm.reference}
                onChange={(e) =>
                  setMarkPaidForm((prev) => ({ ...prev, reference: e.target.value }))
                }
                placeholder={
                  markPaidForm.paymentMethod === 'check'
                    ? 'e.g. Check #1234'
                    : markPaidForm.paymentMethod === 'wire'
                      ? 'e.g. Wire confirmation ABC123'
                      : 'Short note to identify this payment'
                }
                disabled={markingPaid}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="markpaid-name">Paid by (name)</Label>
                <Input
                  id="markpaid-name"
                  value={markPaidForm.paidByName}
                  onChange={(e) =>
                    setMarkPaidForm((prev) => ({ ...prev, paidByName: e.target.value }))
                  }
                  disabled={markingPaid}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="markpaid-email">Paid by (email)</Label>
                <Input
                  id="markpaid-email"
                  type="email"
                  value={markPaidForm.paidByEmail}
                  onChange={(e) =>
                    setMarkPaidForm((prev) => ({ ...prev, paidByEmail: e.target.value }))
                  }
                  disabled={markingPaid}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarkPaidDialog(false)}
              disabled={markingPaid}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMarkPaid}
              disabled={markingPaid}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] gap-2"
            >
              {markingPaid ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Mark as Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showResendDialog}
        onOpenChange={(open) => {
          if (!resending) setShowResendDialog(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resend signed copy</DialogTitle>
            <DialogDescription>
              Email the signed PDF of{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {currentProposal?.title || 'this proposal'}
              </span>
              . Leave the address as-is to send to the original client, or change
              it to forward to a different recipient.
              {currentProposal?.signed_pdf_sent_at && (
                <span className="block mt-2 text-xs text-[var(--text-tertiary)]">
                  Last sent{' '}
                  {new Date(currentProposal.signed_pdf_sent_at).toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="resend-email">Recipient email</Label>
            <Input
              id="resend-email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="client@example.com"
              disabled={resending}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResendDialog(false)}
              disabled={resending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResend}
              disabled={resending || !resendEmail?.trim()}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] gap-2"
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
