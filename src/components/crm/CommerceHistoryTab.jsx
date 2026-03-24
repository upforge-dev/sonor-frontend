/**
 * CommerceHistoryTab - Full transaction history for a contact/customer
 * Shows purchases, events, services, invoices, and contracts linked to this contact.
 * Only rendered when the contact qualifies as a customer (contact_type, purchase_count, or tags).
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ShoppingBag,
  Receipt,
  FileSignature,
  Calendar,
  Truck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign
} from 'lucide-react'
import { GlassCard, GlassEmptyState, GlassMetric } from './ui'
import { commerceApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount / 100) // amounts stored as cents
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// ─── Status Badge helpers ───────────────────────────────────────────────────

const STATUS_CLASSES = {
  // green
  paid: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  completed: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  signed: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  fulfilled: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  shipped: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  delivered: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  active: 'bg-[#4bbf39]/10 text-[#4bbf39] border-[#4bbf39]/20',
  // yellow / amber
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  sent: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  processing: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  draft: 'bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] border-[var(--glass-border)]',
  // red
  overdue: 'bg-red-500/10 text-red-500 border-red-500/20',
  declined: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  refunded: 'bg-red-500/10 text-red-500 border-red-500/20',
}

function StatusPill({ status }) {
  const cls = STATUS_CLASSES[status?.toLowerCase()] || 'bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] border-[var(--glass-border)]'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', cls)}>
      {status}
    </span>
  )
}

// Type badge for purchase type (product / event / service / class)
const TYPE_CLASSES = {
  product:  'bg-blue-500/10 text-blue-500 border-blue-500/20',
  event:    'bg-purple-500/10 text-purple-500 border-purple-500/20',
  service:  'bg-[#39bfb0]/10 text-[#39bfb0] border-[#39bfb0]/20',
  class:    'bg-orange-500/10 text-orange-500 border-orange-500/20',
  digital:  'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
}

function TypeBadge({ type }) {
  const cls = TYPE_CLASSES[type?.toLowerCase()] || 'bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] border-[var(--glass-border)]'
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize', cls)}>
      {type}
    </span>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--glass-bg-inset)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-[var(--glass-bg-inset)]" />
          <div className="h-3 w-1/3 rounded bg-[var(--glass-bg-inset)]" />
        </div>
        <div className="h-3.5 w-16 rounded bg-[var(--glass-bg-inset)]" />
      </div>
    </div>
  )
}

// ─── Stats Row ──────────────────────────────────────────────────────────────

function StatsRow({ purchases, invoices, contracts }) {
  const totalSpent = [
    ...purchases.map(p => p.total_amount_cents || p.amount_cents || 0),
    ...invoices.filter(i => i.status === 'paid').map(i => i.amount_cents || 0)
  ].reduce((a, b) => a + b, 0)

  const eventCount = purchases.filter(p => p.offering_type === 'event' || p.type === 'event').length
  const purchaseCount = purchases.filter(p => p.offering_type !== 'event' && p.type !== 'event').length

  return (
    <div className="grid grid-cols-4 gap-3">
      <GlassMetric
        label="Total Spent"
        value={formatCurrency(totalSpent)}
        icon={DollarSign}
        color="green"
        size="sm"
      />
      <GlassMetric
        label="Purchases"
        value={purchaseCount}
        icon={ShoppingBag}
        color="blue"
        size="sm"
      />
      <GlassMetric
        label="Events"
        value={eventCount}
        icon={Calendar}
        color="purple"
        size="sm"
      />
      <GlassMetric
        label="Contracts"
        value={contracts.length}
        icon={FileSignature}
        color="default"
        size="sm"
      />
    </div>
  )
}

// ─── Purchase Card ──────────────────────────────────────────────────────────

function PurchaseCard({ purchase }) {
  const type = purchase.offering_type || purchase.type || 'product'
  const name = purchase.offering_name || purchase.name || purchase.product_name || 'Unknown Item'
  const variant = purchase.variant_name || purchase.variant_title
  const amount = purchase.total_amount_cents || purchase.amount_cents || purchase.price_cents
  const purchaseDate = purchase.purchased_at || purchase.created_at
  const eventDate = purchase.event_date || purchase.offering_event_date
  const shippingStatus = purchase.shipping_status || purchase.fulfillment_status
  const trackingNumber = purchase.tracking_number
  const trackingUrl = purchase.tracking_url
  const imageUrl = purchase.image_url || purchase.offering_image_url

  return (
    <GlassCard padding="md" className="flex items-start gap-3">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--glass-bg-inset)] overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag className="h-4 w-4 text-[var(--text-tertiary)]" />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-[var(--text-primary)] truncate">{name}</p>
          <TypeBadge type={type} />
        </div>
        {variant && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{variant}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[var(--text-tertiary)]">
          <span>{formatDate(purchaseDate)}</span>
          {eventDate && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Event: {formatDate(eventDate)}
              </span>
            </>
          )}
          {shippingStatus && (
            <>
              <span>•</span>
              <StatusPill status={shippingStatus} />
            </>
          )}
        </div>
        {trackingNumber && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <Truck className="h-3 w-3 text-[var(--text-tertiary)]" />
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-primary)] hover:underline flex items-center gap-1"
              >
                {trackingNumber}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-[var(--text-secondary)]">{trackingNumber}</span>
            )}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <p className="font-semibold text-sm text-[var(--text-primary)]">{formatCurrency(amount)}</p>
      </div>
    </GlassCard>
  )
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function CollapsibleSection({ title, icon: Icon, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  if (count === 0) return null

  return (
    <div className="space-y-2">
      <button
        className="w-full flex items-center justify-between py-1 group"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          <span className="text-xs text-[var(--text-tertiary)] bg-[var(--glass-bg-inset)] px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
          : <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
        }
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  )
}

// ─── Invoices Section ──────────────────────────────────────────────────────

function InvoiceRow({ invoice }) {
  const invoiceNumber = invoice.invoice_number || invoice.number || `#${invoice.id?.slice(0, 8)}`
  const amount = invoice.amount_cents || invoice.total_cents
  const status = invoice.status
  const issuedDate = invoice.issued_at || invoice.created_at
  const paidDate = invoice.paid_at

  return (
    <GlassCard padding="md" className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
        <Receipt className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-[var(--text-primary)]">{invoiceNumber}</p>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-0.5">
          <span>Issued {formatDate(issuedDate)}</span>
          {paidDate && (
            <>
              <span>•</span>
              <span className="text-[#4bbf39]">Paid {formatDate(paidDate)}</span>
            </>
          )}
        </div>
      </div>
      <p className="font-semibold text-sm text-[var(--text-primary)] flex-shrink-0">
        {formatCurrency(amount)}
      </p>
    </GlassCard>
  )
}

// ─── Contracts Section ─────────────────────────────────────────────────────

function ContractRow({ contract }) {
  const title = contract.title || contract.name || 'Untitled Contract'
  const value = contract.value_cents || contract.amount_cents
  const status = contract.status
  const sentDate = contract.sent_at || contract.created_at
  const signedDate = contract.signed_at

  return (
    <GlassCard padding="md" className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
        <FileSignature className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-[var(--text-primary)] truncate">{title}</p>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-0.5">
          <span>{formatDate(sentDate)}</span>
          {signedDate && (
            <>
              <span>•</span>
              <span className="text-[#4bbf39]">Signed {formatDate(signedDate)}</span>
            </>
          )}
        </div>
      </div>
      {value != null && (
        <p className="font-semibold text-sm text-[var(--text-primary)] flex-shrink-0">
          {formatCurrency(value)}
        </p>
      )}
    </GlassCard>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CommerceHistoryTab({ prospect }) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id
  const contactId = prospect?.converted_contact_id || prospect?.id

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(null)

  useEffect(() => {
    if (!projectId || !contactId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchHistory() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await commerceApi.getCustomerHistory(projectId, contactId)
        if (!cancelled) {
          setHistory(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[CommerceHistoryTab] fetch error', err)
          setError(err?.response?.data?.message || 'Failed to load commerce history.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [projectId, contactId])

  // ── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4 animate-pulse">
              <div className="h-4 w-1/2 rounded bg-[var(--glass-bg-inset)] mb-2" />
              <div className="h-6 w-2/3 rounded bg-[var(--glass-bg-inset)]" />
            </div>
          ))}
        </div>
        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <GlassEmptyState
        icon={ShoppingBag}
        title="Could not load commerce history"
        description={error}
        size="md"
      />
    )
  }

  // ── No project / no contact id ────────────────────────────────────────
  if (!projectId || !contactId) {
    return (
      <GlassEmptyState
        icon={ShoppingBag}
        title="No project context"
        description="Select a project to view commerce history."
        size="md"
      />
    )
  }

  const purchases  = history?.purchases  || []
  const invoices   = history?.invoices   || []
  const contracts  = history?.contracts  || []

  const hasAnyData = purchases.length > 0 || invoices.length > 0 || contracts.length > 0

  // ── Empty state ────────────────────────────────────────────────────────
  if (!hasAnyData) {
    return (
      <GlassEmptyState
        icon={ShoppingBag}
        title="No purchase history yet"
        description="Purchases, invoices, and signed contracts for this contact will appear here."
        size="md"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <StatsRow purchases={purchases} invoices={invoices} contracts={contracts} />

      {/* Purchases Section */}
      <CollapsibleSection
        title="Purchases"
        icon={ShoppingBag}
        count={purchases.length}
        defaultOpen={true}
      >
        {purchases.map((purchase, i) => (
          <PurchaseCard key={purchase.id || i} purchase={purchase} />
        ))}
      </CollapsibleSection>

      {/* Invoices Section */}
      <CollapsibleSection
        title="Invoices"
        icon={Receipt}
        count={invoices.length}
        defaultOpen={invoices.length <= 5}
      >
        {invoices.map((invoice, i) => (
          <InvoiceRow key={invoice.id || i} invoice={invoice} />
        ))}
      </CollapsibleSection>

      {/* Contracts Section */}
      <CollapsibleSection
        title="Contracts"
        icon={FileSignature}
        count={contracts.length}
        defaultOpen={contracts.length <= 5}
      >
        {contracts.map((contract, i) => (
          <ContractRow key={contract.id || i} contract={contract} />
        ))}
      </CollapsibleSection>
    </div>
  )
}
