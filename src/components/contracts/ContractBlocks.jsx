import { format } from 'date-fns'

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

export function PricingTable({ items = [], subtotal, tax, total, deposit, source }) {
  const displayItems = source === 'line_items' ? items : items
  const calcSubtotal = subtotal ?? displayItems.reduce((sum, i) => sum + (Number(i.amount || i.price || 0) * (i.quantity || 1)), 0)
  const calcTotal = total ?? calcSubtotal + (Number(tax) || 0)

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
            {displayItems.map((item, i) => (
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
            {tax != null && Number(tax) > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Tax</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(tax)}</td>
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

export function PaymentTerms({ total, deposit, depositDue, balanceDue, methods, text }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Terms</h2>
      {text ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
      ) : (
        <div className="space-y-2 text-sm text-gray-700">
          {total != null && <p>Total contract amount: <span className="font-semibold">{formatCurrency(total)}</span></p>}
          {deposit != null && (
            <p>
              Deposit due{depositDue ? ` by ${formatDate(depositDue)}` : ' upon signing'}:{' '}
              <span className="font-semibold">{formatCurrency(deposit)}</span>
            </p>
          )}
          {balanceDue && <p>Balance due: <span className="font-semibold">{balanceDue}</span></p>}
          {methods && <p>Accepted payment methods: {methods}</p>}
        </div>
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

export const COMPONENT_REGISTRY = {
  ContractHeader,
  ClientInfo,
  ScopeOfWork,
  PricingTable,
  InstallationSchedule,
  PaymentTerms,
  Warranty,
  CancellationPolicy,
  LiabilityWaiver,
  GeneralTerms,
  SignatureBlock,
}
