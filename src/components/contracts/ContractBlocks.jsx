import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'

// ──────────────────────────────────────────────────────────────────────────
// Shared addon-selection context — lets AddonSelector publish live choices
// that PricingTable / PaymentTerms / SignatureBlock can read so totals stay
// in sync as the client toggles options on the signing page.
// ──────────────────────────────────────────────────────────────────────────
export const AddonSelectionContext = createContext(null)

export function AddonSelectionProvider({ groups = [], basePrice = 0, taxRate = 0, children, onChange }) {
  const [selections, setSelections] = useState(() => {
    const init = {}
    groups.forEach(g => {
      init[g.id] = g.selectedOptionId || g.options?.[0]?.id
    })
    return init
  })

  const addonsTotal = useMemo(() => {
    return groups.reduce((sum, g) => {
      const opt = g.options?.find(o => o.id === selections[g.id])
      return sum + (opt ? Number(opt.priceDelta) || 0 : 0)
    }, 0)
  }, [groups, selections])

  const subtotal = (Number(basePrice) || 0) + addonsTotal
  const tax = taxRate > 0 ? Math.round(subtotal * taxRate * 100) / 100 : 0
  const total = Math.round((subtotal + tax) * 100) / 100

  const selectedList = useMemo(() => groups.map(g => {
    const opt = g.options?.find(o => o.id === selections[g.id])
    return opt ? { group: g.label, option: opt.label, priceDelta: Number(opt.priceDelta) || 0 } : null
  }).filter(Boolean), [groups, selections])

  useEffect(() => {
    onChange?.({ selections, selectedList, basePrice: Number(basePrice) || 0, addonsTotal, subtotal, tax, total })
  }, [selections, addonsTotal, total])

  const value = {
    groups,
    selections,
    setSelections,
    selectedList,
    basePrice: Number(basePrice) || 0,
    addonsTotal,
    subtotal,
    tax,
    total,
  }

  return (
    <AddonSelectionContext.Provider value={value}>
      {children}
    </AddonSelectionContext.Provider>
  )
}

export function useAddonSelection() {
  return useContext(AddonSelectionContext)
}

function formatCurrency(amount) {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'MMMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function ContractHeader({ title, businessName, clientName, effectiveDate, logoUrl }) {
  return (
    <div className="mb-8 pb-6 border-b-2 border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          {logoUrl && <img src={logoUrl} alt={businessName} className="h-12 mb-3" />}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {businessName && <p className="text-sm text-gray-500 mt-1">{businessName}</p>}
        </div>
        {effectiveDate && (
          <div className="text-right text-sm text-gray-500">
            <span className="font-medium">Effective Date</span>
            <br />
            {formatDate(effectiveDate)}
          </div>
        )}
      </div>
      {clientName && (
        <p className="text-gray-700">
          Prepared for: <span className="font-semibold">{clientName}</span>
        </p>
      )}
    </div>
  )
}

export function ClientInfo({ name, email, phone, address }) {
  return (
    <div className="mb-6 rounded-lg bg-gray-50 p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Client Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {name && (
          <div>
            <span className="text-gray-500">Name</span>
            <p className="font-medium text-gray-900">{name}</p>
          </div>
        )}
        {email && (
          <div>
            <span className="text-gray-500">Email</span>
            <p className="font-medium text-gray-900">{email}</p>
          </div>
        )}
        {phone && (
          <div>
            <span className="text-gray-500">Phone</span>
            <p className="font-medium text-gray-900">{phone}</p>
          </div>
        )}
        {address && (
          <div className="sm:col-span-2">
            <span className="text-gray-500">Address</span>
            <p className="font-medium text-gray-900 whitespace-pre-line">{address}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ScopeOfWork({ items = [], description }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Scope of Work</h2>
      {description && <p className="text-gray-700 mb-4 text-sm leading-relaxed">{description}</p>}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.title || item.name || `Item ${i + 1}`}</h3>
                  {item.room && <p className="text-sm text-gray-500 mt-0.5">Location: {item.room}</p>}
                  {item.materials && <p className="text-sm text-gray-500">Materials: {item.materials}</p>}
                  {item.dimensions && <p className="text-sm text-gray-500">Dimensions: {item.dimensions}</p>}
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{item.description}</p>
                  )}
                </div>
                {item.price != null && (
                  <span className="font-semibold text-gray-900 ml-4 whitespace-nowrap">
                    {formatCurrency(item.price)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AddonSelector({ groups, title = 'Customize Your Build', description, readOnly }) {
  const ctx = useContext(AddonSelectionContext)
  // If used outside a provider (shouldn't happen in the contract flow), render
  // a read-only display so the section still makes sense.
  const groupsToUse = ctx?.groups?.length ? ctx.groups : (groups || [])
  if (!groupsToUse.length) return null

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
      <div className="space-y-4">
        {groupsToUse.map(group => {
          const selectedId = ctx?.selections?.[group.id] ?? group.selectedOptionId
          return (
            <div key={group.id} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">{group.label}</div>
              <div className="divide-y divide-gray-100">
                {(group.options || []).map(opt => {
                  const isSelected = selectedId === opt.id
                  const delta = Number(opt.priceDelta) || 0
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      } ${readOnly ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`addon-${group.id}`}
                          checked={isSelected}
                          disabled={readOnly}
                          onChange={() => {
                            if (readOnly || !ctx) return
                            ctx.setSelections(prev => ({ ...prev, [group.id]: opt.id }))
                          }}
                          className="accent-emerald-600"
                        />
                        <span className="text-sm text-gray-900">{opt.label}</span>
                      </div>
                      <span className={`text-sm font-medium ${delta > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                        {delta > 0 ? `+${formatCurrency(delta)}` : 'Included'}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PricingTable({ items = [], subtotal, tax, total, deposit, source }) {
  const ctx = useContext(AddonSelectionContext)
  const displayItems = source === 'line_items' ? items : items
  // Live context wins over static props so the table reflects current addon selections.
  const effectiveSubtotal = ctx?.subtotal != null
    ? ctx.subtotal
    : (subtotal ?? displayItems.reduce((sum, i) => sum + (Number(i.amount || i.price || 0) * (i.quantity || 1)), 0))
  const effectiveTax = ctx?.tax != null ? ctx.tax : (Number(tax) || 0)
  const effectiveTotal = ctx?.total != null ? ctx.total : (total ?? effectiveSubtotal + effectiveTax)
  const effectiveItems = ctx ? [
    { description: 'Base project', amount: ctx.basePrice },
    ...ctx.selectedList.filter(a => a.priceDelta > 0).map(a => ({ description: `${a.group}: ${a.option}`, amount: a.priceDelta })),
  ] : displayItems
  const calcSubtotal = effectiveSubtotal
  const calcTotal = effectiveTotal

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Description</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-20">Qty</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 w-28">Unit Price</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600 w-28">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {effectiveItems.map((item, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-gray-900">
                  {item.description || item.title || item.name}
                  {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{item.quantity || 1}</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {formatCurrency(item.unit_price || item.price || item.amount)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatCurrency((Number(item.unit_price || item.price || item.amount || 0)) * (item.quantity || 1))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr className="border-t border-gray-200">
              <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Subtotal</td>
              <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(calcSubtotal)}</td>
            </tr>
            {effectiveTax > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Tax</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(effectiveTax)}</td>
              </tr>
            )}
            <tr className="border-t border-gray-200">
              <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-gray-900">Total</td>
              <td className="px-4 py-2.5 text-right font-bold text-gray-900 text-base">
                {formatCurrency(calcTotal)}
              </td>
            </tr>
            {deposit != null && Number(deposit) > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Deposit Required</td>
                <td className="px-4 py-2 text-right font-medium text-emerald-700">{formatCurrency(deposit)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export function InstallationSchedule({ date, duration, accessRequirements }) {
  return (
    <div className="mb-6 rounded-lg bg-blue-50 p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Installation Schedule</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {date && (
          <div>
            <span className="text-gray-500">Scheduled Date</span>
            <p className="font-medium text-gray-900">{formatDate(date)}</p>
          </div>
        )}
        {duration && (
          <div>
            <span className="text-gray-500">Estimated Duration</span>
            <p className="font-medium text-gray-900">{duration}</p>
          </div>
        )}
        {accessRequirements && (
          <div className="sm:col-span-2">
            <span className="text-gray-500">Access Requirements</span>
            <p className="font-medium text-gray-900">{accessRequirements}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function PaymentTerms({ total, deposit, depositDue, balanceDue, methods, text, depositPercent = 50 }) {
  const ctx = useContext(AddonSelectionContext)
  const effectiveTotal = ctx?.total != null ? ctx.total : total
  const effectiveDeposit = ctx?.total != null
    ? Math.round(ctx.total * (depositPercent / 100) * 100) / 100
    : deposit

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Terms</h2>
      <div className="space-y-2 text-sm text-gray-700">
        {effectiveTotal != null && (
          <p>Total contract amount: <span className="font-semibold">{formatCurrency(effectiveTotal)}</span></p>
        )}
        {effectiveDeposit != null && (
          <p>
            Deposit due{depositDue ? ` by ${formatDate(depositDue)}` : ' upon signing'}:{' '}
            <span className="font-semibold">{formatCurrency(effectiveDeposit)}</span>
            {depositPercent ? ` (${depositPercent}%)` : ''}
          </p>
        )}
        {effectiveTotal != null && effectiveDeposit != null && (
          <p>Balance due on completion: <span className="font-semibold">{formatCurrency(effectiveTotal - effectiveDeposit)}</span></p>
        )}
        {balanceDue && <p>Balance due: <span className="font-semibold">{balanceDue}</span></p>}
        {methods && <p>Accepted payment methods: {methods}</p>}
      </div>
      {text && (
        <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
      )}
    </div>
  )
}

export function Warranty({ materials, labor, exclusions, text }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Warranty</h2>
      {text ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
      ) : (
        <div className="space-y-2 text-sm text-gray-700">
          {materials && <p><span className="font-medium">Materials:</span> {materials}</p>}
          {labor && <p><span className="font-medium">Labor:</span> {labor}</p>}
          {exclusions && <p><span className="font-medium">Exclusions:</span> {exclusions}</p>}
        </div>
      )}
    </div>
  )
}

export function CancellationPolicy({ fullRefundBefore, partialRefundBefore, noRefundAfter, text }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Cancellation Policy</h2>
      {text ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
      ) : (
        <div className="space-y-2 text-sm text-gray-700">
          {fullRefundBefore && <p>Full refund if cancelled before: <span className="font-medium">{fullRefundBefore}</span></p>}
          {partialRefundBefore && <p>Partial refund if cancelled before: <span className="font-medium">{partialRefundBefore}</span></p>}
          {noRefundAfter && <p>No refund after: <span className="font-medium">{noRefundAfter}</span></p>}
        </div>
      )}
    </div>
  )
}

export function LiabilityWaiver({ text }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Liability</h2>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}

export function GeneralTerms({ title, text }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title || 'Terms & Conditions'}</h2>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}

export function SignatureBlock({ requiresBothParties = true, clientName, clientSignedAt, clientSignatureUrl, businessName, businessSignedAt }) {
  return (
    <div className="mt-10 pt-6 border-t-2 border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Signatures</h2>
      <div className={`grid gap-8 ${requiresBothParties ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">Client</p>
          {clientSignatureUrl ? (
            <img src={clientSignatureUrl} alt="Client signature" className="h-16 object-contain" />
          ) : (
            <div className="h-16 border-b-2 border-gray-300" />
          )}
          <div className="text-sm">
            <p className="font-medium text-gray-900">{clientName || '________________________'}</p>
            <p className="text-gray-500">{clientSignedAt ? formatDate(clientSignedAt) : 'Date: ________________'}</p>
          </div>
        </div>
        {requiresBothParties && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Authorized Representative</p>
            {businessSignedAt ? (
              <div className="h-16 flex items-end"><span className="text-sm text-emerald-600 font-medium">Signed digitally</span></div>
            ) : (
              <div className="h-16 border-b-2 border-gray-300" />
            )}
            <div className="text-sm">
              <p className="font-medium text-gray-900">{businessName || '________________________'}</p>
              <p className="text-gray-500">{businessSignedAt ? formatDate(businessSignedAt) : 'Date: ________________'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ProjectImage({ url, caption, alt }) {
  if (!url) return null
  return (
    <figure className="mb-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
        <img
          src={url}
          alt={alt || caption || 'Project reference image'}
          className="w-full h-auto object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-500 text-center">{caption}</figcaption>
      )}
    </figure>
  )
}

export const COMPONENT_REGISTRY = {
  ContractHeader,
  ClientInfo,
  ScopeOfWork,
  ProjectImage,
  AddonSelector,
  PricingTable,
  InstallationSchedule,
  PaymentTerms,
  Warranty,
  CancellationPolicy,
  LiabilityWaiver,
  GeneralTerms,
  SignatureBlock,
}
