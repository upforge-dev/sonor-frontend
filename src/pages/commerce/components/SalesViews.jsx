// src/pages/commerce/components/SalesViews.jsx
// Sales-related views: Overview, Invoices, Transactions

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart } from '@tremor/react'
import {
  Plus,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Archive,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Clock,
  Receipt,
  CheckCircle,
  ShoppingCart,
  ArrowLeft,
  Send,
  Download,
  Copy,
  MoreHorizontal,
  RefreshCw,
  Ban,
  Trash2,
  BarChart2,
  MousePointer,
  Timer,
  Activity,
  Loader2,
  Search,
  ArrowUpDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import { commerceApi, billingApi } from '@/lib/portal-api'
import { useInvoice, useSendInvoice, useMarkInvoicePaid, useToggleRecurringPause } from '@/lib/hooks/use-billing'
import { toast } from '@/lib/toast'

// Invoice status config (Billing API: pending, sent, viewed, paid, overdue, cancelled, refunded, draft)
const UNPAID_BADGE = { label: 'Pending', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Clock }
export const INVOICE_STATUS_CONFIG = {
  pending: UNPAID_BADGE,
  sent: UNPAID_BADGE,
  viewed: UNPAID_BADGE,
  draft: UNPAID_BADGE,
  paid: { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  overdue: { label: 'Overdue', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', className: 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)] border-[var(--glass-border)]', icon: Archive },
  refunded: { label: 'Refunded', className: 'bg-[var(--glass-bg-inset)] text-[var(--text-tertiary)] border-[var(--glass-border)]', icon: Archive },
}

function getInvoiceCustomerDisplay(invoice) {
  if (invoice?.contact) {
    const parts = [invoice.contact.name, invoice.contact.company].filter(Boolean)
    return parts.length ? parts.join(' - ') : invoice.contact.email || 'Unknown'
  }
  return invoice?.customer_name || invoice?.customer_email || 'Unknown'
}

function getInvoiceDueDate(invoice) {
  return invoice?.due_at || invoice?.due_date
}

export function InvoiceCard({ invoice, brandColors }) {
  const dueDate = getInvoiceDueDate(invoice)
  const StatusIcon = INVOICE_STATUS_CONFIG[invoice.status]?.icon || Clock
  const isOverdue = (invoice.status === 'pending' || invoice.status === 'sent' || invoice.status === 'viewed') && dueDate && new Date(dueDate) < new Date()
  const displayStatus = isOverdue ? 'overdue' : invoice.status
  
  return (
    <Link to={`/commerce/invoices/${invoice.id}`}>
      <div className="group rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 hover:border-border transition-all duration-200 cursor-pointer p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
            displayStatus === 'paid' && "bg-emerald-500/10",
            (displayStatus === 'pending' || displayStatus === 'sent' || displayStatus === 'viewed') && "bg-amber-500/10",
            displayStatus === 'overdue' && "bg-red-500/10",
            displayStatus === 'cancelled' && "bg-muted"
          )}>
            <Receipt className={cn(
              "h-5 w-5",
              displayStatus === 'paid' && "text-emerald-500",
              (displayStatus === 'pending' || displayStatus === 'sent' || displayStatus === 'viewed') && "text-amber-500",
              displayStatus === 'overdue' && "text-red-500",
              displayStatus === 'cancelled' && "text-muted-foreground"
            )} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground group-hover:text-[var(--brand-primary)] transition-colors">
                {invoice.invoice_number || invoice.invoiceNumber || `INV-${invoice.id?.slice(0, 8).toUpperCase()}`}
              </h3>
              <Badge variant="outline" className={cn("text-xs", INVOICE_STATUS_CONFIG[displayStatus]?.className)}>
                {INVOICE_STATUS_CONFIG[displayStatus]?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{getInvoiceCustomerDisplay(invoice)}</span>
              {dueDate && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Due {format(new Date(dueDate), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Amount */}
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">
              ${Number(invoice.total || invoice.totalAmount || invoice.amount || 0).toLocaleString()}
            </p>
            {(invoice.sent_at || invoice.sentAt) && (
              <p className="text-xs text-muted-foreground">
                Sent {formatDistanceToNow(new Date(invoice.sent_at || invoice.sentAt), { addSuffix: true })}
              </p>
            )}
          </div>
          
          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  )
}

export function InvoiceSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-[var(--glass-border)] p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatDateTime(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Panel content for invoice detail - used in ModuleLayout right sidebar (no Sheet wrapper) */
export function InvoiceDetailPanel({
  invoiceId,
  onClose,
  onEdit,
  onDelete,
  onVoid,
  brandColors,
}) {
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId)
  const sendMutation = useSendInvoice()
  const markPaidMutation = useMarkInvoicePaid()
  const toggleRecurringMutation = useToggleRecurringPause()

  const fetchInvoiceAnalytics = async () => {
    if (!invoiceId || analytics || loadingAnalytics) return
    setLoadingAnalytics(true)
    try {
      const res = await billingApi.getInvoiceAnalytics(invoiceId)
      setAnalytics(res?.data?.analytics ?? res?.analytics ?? null)
    } catch (err) {
      console.error('Failed to fetch invoice analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleAnalyticsToggle = () => {
    if (!analyticsExpanded && !analytics) fetchInvoiceAnalytics()
    setAnalyticsExpanded(!analyticsExpanded)
  }

  const displayStatus = useMemo(() => {
    if (!invoice) return 'pending'
    const isOverdue = invoice.status === 'pending' && invoice.due_at && new Date(invoice.due_at) < new Date()
    return isOverdue ? 'overdue' : invoice.status
  }, [invoice])

  const customerDisplay = invoice?.contact
    ? [invoice.contact.name, invoice.contact.company].filter(Boolean).join(' - ') || invoice.contact.email || 'Unknown'
    : invoice?.customer_name || invoice?.customer_email || 'Unknown'

  const handleCopyPaymentLink = async () => {
    if (!invoiceId) return
    try {
      const res = await billingApi.getPaymentLink(invoiceId)
      const url = res?.data?.url || res?.url
      if (url) {
        await navigator.clipboard.writeText(url)
        toast.success('Payment link copied to clipboard')
      } else {
        toast.error('Could not get payment link')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to copy payment link')
    }
  }

  const handleSend = () => {
    if (!invoiceId) return
    sendMutation.mutate(
      { invoiceId, emailData: {} },
      {
        onSuccess: () => {
          toast.success('Invoice sent')
          refetch()
        },
        onError: (err) => toast.error(err?.message || 'Failed to send invoice'),
      }
    )
  }

  const handleToggleRecurring = () => {
    if (!invoiceId || !invoice?.is_recurring) return
    const paused = !(invoice.recurringPaused ?? invoice.recurring_paused)
    toggleRecurringMutation.mutate(
      { invoiceId, paused },
      {
        onSuccess: () => {
          toast.success(paused ? 'Recurring paused' : 'Recurring resumed')
          refetch()
        },
        onError: (err) => toast.error(err?.message || 'Failed to update'),
      }
    )
  }

  const handleMarkPaid = () => {
    if (!invoiceId) return
    markPaidMutation.mutate(invoiceId, {
      onSuccess: () => {
        toast.success('Invoice marked as paid')
        refetch()
      },
      onError: (err) => toast.error(err?.message || 'Failed to mark as paid'),
    })
  }

  const handleDownloadPdf = async () => {
    if (!invoiceId) return
    try {
      const res = await billingApi.downloadPdf(invoiceId)
      const blob = res?.data ?? res
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice?.invoice_number || invoiceId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err?.message || 'Failed to download PDF')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Close
        </Button>
        <div className="text-center py-8">
          <p className="text-red-500">{error?.message || 'Invoice not found'}</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const total = invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0
  const items = invoice.items || invoice.invoice_items || []

  return (
    <div className="p-4 space-y-6">
      <div className="pb-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 -ml-2 mb-2">
              <ArrowLeft className="h-4 w-4" />
              Close
            </Button>
              <h2 className="text-left flex items-center gap-2 font-semibold text-lg">
                {invoice.invoice_number || `INV-${invoice.id?.slice(0, 8).toUpperCase()}`}
                <Badge variant="outline" className={cn("text-xs", INVOICE_STATUS_CONFIG[displayStatus]?.className)}>
                  {INVOICE_STATUS_CONFIG[displayStatus]?.label}
                </Badge>
              </h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={onEdit}>
                    Edit
                  </DropdownMenuItem>
                )}
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={onVoid} className="text-amber-600">
                    <Ban className="h-4 w-4 mr-2" />
                    Void
                  </DropdownMenuItem>
                )}
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={handleSend} disabled={sendMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </DropdownMenuItem>
                )}
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <DropdownMenuItem onClick={handleMarkPaid} disabled={markPaidMutation.isPending}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark paid
                  </DropdownMenuItem>
                )}
                {invoice.status === 'pending' && (
                  <DropdownMenuItem onClick={handleCopyPaymentLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy payment link
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>

        <div className="space-y-6 pt-6">
          {/* Customer */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Billed to</p>
            <p className="font-medium text-foreground">{customerDisplay}</p>
            {invoice.contact?.email && (
              <p className="text-sm text-muted-foreground">{invoice.contact.email}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {invoice.due_at && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Due date</p>
                <p className="font-medium">{format(new Date(invoice.due_at), 'MMM d, yyyy')}</p>
              </div>
            )}
            {invoice.sent_at && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Sent</p>
                <p className="font-medium">{formatDistanceToNow(new Date(invoice.sent_at), { addSuffix: true })}</p>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Paid</p>
                <p className="font-medium">{format(new Date(invoice.paid_at), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Line items</p>
              <div className="space-y-2 rounded-lg border border-border/50 p-3">
                {items.map((item, i) => (
                  <div key={item.id || i} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.description}</span>
                    <span className="font-medium">${Number(item.total_price ?? item.quantity * item.unit_price ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : invoice.description && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Description</p>
              <p className="text-foreground">{invoice.description}</p>
            </div>
          )}

          {/* Total */}
          <div className="rounded-lg border border-border/50 p-4 bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold">${Number(total).toLocaleString()}</span>
            </div>
          </div>

          {/* Recurring badge if applicable */}
          {(invoice.is_recurring ?? invoice.isRecurring) && (
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recurring</p>
                  <p className="text-sm font-medium">
                    {invoice.recurring_interval || invoice.recurringInterval || 'Monthly'}
                    {(invoice.recurringPaused ?? invoice.recurring_paused) && ' (Paused)'}
                    {(invoice.next_recurring_date || invoice.nextRecurringDate) && ` · Next: ${format(new Date(invoice.next_recurring_date || invoice.nextRecurringDate), 'MMM d')}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleRecurring}
                  disabled={toggleRecurringMutation.isPending}
                >
                  {(invoice.recurringPaused ?? invoice.recurring_paused) ? 'Resume' : 'Pause'}
                </Button>
              </div>
            </div>
          )}

          {/* Expandable Analytics */}
          {invoice.status !== 'draft' && (
            <Collapsible open={analyticsExpanded} onOpenChange={handleAnalyticsToggle}>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between rounded-none h-auto py-3 px-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <BarChart2 className="w-4 h-4" />
                      Analytics
                      {analytics?.summary?.engagementScore > 0 && (
                        <span className="text-foreground font-medium">{analytics.summary.engagementScore}%</span>
                      )}
                    </span>
                    {analyticsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                    {loadingAnalytics ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
                      </div>
                    ) : analytics ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                              <MousePointer className="w-3.5 h-3.5" />
                              Total Views
                            </div>
                            <p className="text-xl font-semibold text-foreground">
                              {analytics.summary?.totalViews || 0}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                              <Activity className="w-3.5 h-3.5" />
                              Unique Views
                            </div>
                            <p className="text-xl font-semibold text-foreground">
                              {analytics.summary?.uniqueViews || 0}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                              <Timer className="w-3.5 h-3.5" />
                              Avg. Time
                            </div>
                            <p className="text-xl font-semibold text-foreground">
                              {formatTime(analytics.summary?.avgTimeOnPage || 0)}
                            </p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Engagement
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-semibold text-foreground">
                                {analytics.summary?.engagementScore || 0}%
                              </p>
                              <Progress value={analytics.summary?.engagementScore || 0} className="flex-1 h-1.5" />
                            </div>
                          </div>
                        </div>
                        {analytics.recentViews?.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Recent Activity
                            </h5>
                            <div className="space-y-1.5">
                              {analytics.recentViews.slice(0, 5).map((view, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                                  <span className="text-muted-foreground">
                                    {formatDateTime(view.viewedAt)}
                                  </span>
                                  <span className="text-muted-foreground/70">
                                    {formatTime(view.timeOnPage)} spent
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No analytics data yet. Views are tracked when customers open the payment link.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
    </div>
  )
}

const DATE_RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function SalesOverviewView({ projectId, invoices, brandColors, hasPaymentProcessor, onOpenIntegrations }) {
  const [dateRangeDays, setDateRangeDays] = useState(30)

  const { data: revenueData = [], isLoading: revenueLoading } = useQuery({
    queryKey: ['commerce', 'revenue-chart', projectId, dateRangeDays],
    queryFn: async () => {
      const res = await commerceApi.getRevenueChart(projectId, dateRangeDays)
      return res?.data ?? res ?? []
    },
    enabled: !!projectId,
  })

  const analyticsParams = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - dateRangeDays)
    return {
      projectId: projectId || undefined,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }
  }, [projectId, dateRangeDays])

  const { data: analyticsData } = useQuery({
    queryKey: ['billing', 'analytics', analyticsParams],
    queryFn: async () => {
      const res = await billingApi.getAnalytics(analyticsParams)
      return res?.data ?? res ?? {}
    },
    enabled: true,
  })

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || i.total_amount || i.amount || 0), 0)
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.total || i.total_amount || i.amount || 0), 0)
  const dueDate = (i) => i?.due_at || i?.due_date
  const overdueAmount = invoices.filter(i => {
    const isOverdue = (i.status === 'pending' || i.status === 'sent' || i.status === 'viewed') && dueDate(i) && new Date(dueDate(i)) < new Date()
    return isOverdue
  }).reduce((sum, i) => sum + (i.total || i.total_amount || i.amount || 0), 0)
  
  const thisMonthRevenue = invoices.filter(i => {
    if (i.status !== 'paid') return false
    const paidDate = new Date(i.paid_at || i.updated_at)
    const now = new Date()
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
  }).reduce((sum, i) => sum + (i.total || i.total_amount || i.amount || 0), 0)

  const conversionRate = analyticsData?.conversionRate ?? 0
  const avgTimeToPay = analyticsData?.avgTimeToPay ?? null

  return (
    <div className="space-y-6">
      {/* Payment Processor Status */}
      {!hasPaymentProcessor && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">Connect a Payment Processor</h3>
              <p className="text-sm text-muted-foreground">Connect Stripe or Square to accept payments and track revenue automatically.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={onOpenIntegrations}
            >
              Connect
            </Button>
          </div>
        </div>
      )}
      
      {/* Stats Cards - Sync-style flat design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-emerald-500">${thisMonthRevenue.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-500">${pendingAmount.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
        
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-500">${overdueAmount.toLocaleString()}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Sent → Paid</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Avg Days to Pay */}
        {avgTimeToPay != null && (
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Days to Pay</p>
                <p className="text-2xl font-bold text-foreground">{avgTimeToPay}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Revenue Chart - Sync-style container */}
      <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Revenue (Last {dateRangeDays} Days)</h3>
            <p className="text-xs text-muted-foreground">Daily revenue from completed sales</p>
          </div>
          <div className="flex gap-1">
            {DATE_RANGE_OPTIONS.map(({ label, days }) => (
              <Button
                key={days}
                variant={dateRangeDays === days ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDateRangeDays(days)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <AreaChart
          className="h-72"
          data={revenueLoading ? [] : revenueData}
          index="date"
          categories={["Revenue"]}
          colors={["emerald"]}
          valueFormatter={(value) => `$${value.toLocaleString()}`}
          showLegend={false}
          showGridLines={false}
          curveType="monotone"
        />
      </div>
      
      {/* Recent Invoices Preview - Sync-style container */}
      <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Invoices</h3>
            <p className="text-xs text-muted-foreground">Latest billing activity</p>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground/70">Create your first invoice to start tracking revenue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.slice(0, 5).map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} brandColors={brandColors} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Date (newest)' },
  { value: 'date-asc', label: 'Date (oldest)' },
  { value: 'amount-desc', label: 'Amount (high to low)' },
  { value: 'amount-asc', label: 'Amount (low to high)' },
  { value: 'status', label: 'Status' },
  { value: 'customer', label: 'Customer' },
]

export function InvoicesView({
  invoices,
  isLoading,
  error,
  brandColors,
  loadInvoices,
  invoiceCounts,
  projectId,
  isAgencyOrg,
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  
  const filteredInvoices = useMemo(() => {
    const dueDate = (i) => i?.due_at || i?.due_date
    const isUnpaid = (i) => ['pending', 'sent', 'viewed', 'draft'].includes(i.status)
    let list = invoices
    if (activeTab === 'overdue') {
      list = invoices.filter(i => isUnpaid(i) && dueDate(i) && new Date(dueDate(i)) < new Date())
    } else if (activeTab === 'pending') {
      list = invoices.filter(i => isUnpaid(i) && (!dueDate(i) || new Date(dueDate(i)) >= new Date()))
    } else if (activeTab === 'paid') {
      list = invoices.filter(i => i.status === 'paid')
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(i => {
        const invNum = (i.invoice_number || i.invoiceNumber || '').toLowerCase()
        const customer = getInvoiceCustomerDisplay(i).toLowerCase()
        const email = (i.contact?.email || i.customer_email || '').toLowerCase()
        return invNum.includes(q) || customer.includes(q) || email.includes(q)
      })
    }

    // Sort
    const sorted = [...list]
    const getAmount = (i) => Number(i.total || i.total_amount || i.amount || 0)
    const getCustomer = (i) => getInvoiceCustomerDisplay(i)
    const getDate = (i) => new Date(i.created_at || i.issued_at || 0).getTime()

    if (sortBy === 'date-desc') sorted.sort((a, b) => getDate(b) - getDate(a))
    else if (sortBy === 'date-asc') sorted.sort((a, b) => getDate(a) - getDate(b))
    else if (sortBy === 'amount-desc') sorted.sort((a, b) => getAmount(b) - getAmount(a))
    else if (sortBy === 'amount-asc') sorted.sort((a, b) => getAmount(a) - getAmount(b))
    else if (sortBy === 'status') sorted.sort((a, b) => (a.status || '').localeCompare(b.status || ''))
    else if (sortBy === 'customer') sorted.sort((a, b) => getCustomer(a).localeCompare(getCustomer(b)))

    return sorted
  }, [invoices, activeTab, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <InvoiceSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--accent-red)]">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadInvoices} 
          className="mt-4 border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, customer, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tab Pills - Sync style */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        {[
          { id: 'all', label: 'All', count: invoiceCounts.all },
          { id: 'pending', label: 'Pending', count: invoiceCounts.pending },
          { id: 'overdue', label: 'Overdue', count: invoiceCounts.overdue },
          { id: 'paid', label: 'Paid', count: invoiceCounts.paid },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
              activeTab === tab.id 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              activeTab === tab.id ? "bg-muted" : "bg-muted/50"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {activeTab === 'all' ? 'No invoices yet' : `No ${activeTab} invoices`}
          </h3>
          <p className="text-muted-foreground mb-4">
            {activeTab === 'all' 
              ? 'Create your first invoice to start billing clients'
              : `You don't have any ${activeTab} invoices at the moment`
            }
          </p>
          {activeTab === 'all' && (
            <Link to="/commerce/invoices/new">
              <Button className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} brandColors={brandColors} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TransactionsView({ transactions, isLoading, error, brandColors, loadTransactions }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <InvoiceSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadTransactions} 
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    )
  }
  
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-border/50">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium text-foreground mb-2">No transactions yet</h3>
        <p className="text-muted-foreground">Sales from your products, services, and events will appear here</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div key={tx.id} className="rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/50 p-4 transition-colors">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{tx.offering_name || 'Sale'}</p>
              <p className="text-sm text-muted-foreground">{tx.customer_email || 'Unknown customer'}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-emerald-500">+${Number(tx.total || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, h:mm a')}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
