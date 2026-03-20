// src/pages/commerce/components/InvoiceCreateDialog.jsx
// Dialog for creating invoices with service selection

import { useState, useEffect } from 'react'
import useAuthStore from '@/lib/auth-store'
import { portalApi, commerceApi, billingApi } from '@/lib/portal-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Send, Loader2, Zap, Receipt, DollarSign, User, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Default due date: 14 days from now
function getDefaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().split('T')[0]
}

const RECURRING_INTERVALS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
]

export function InvoiceCreateDialog({ 
  open, 
  onOpenChange, 
  brandColors,
  onSuccess 
}) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id

  // Services from Commerce offerings
  const [services, setServices] = useState([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  // Customers for client picker
  const [customers, setCustomers] = useState([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // CC email input state
  const [showCcInput, setShowCcInput] = useState(false)
  const [ccInputValue, setCcInputValue] = useState('')

  // Invoice data
  const [formData, setFormData] = useState({
    selectedCustomerId: '', // '' = one-off, id = existing client
    selectedServiceId: '',
    email: '',
    name: '',
    company: '',
    cc_emails: [],
    amount: '',
    description: '',
    due_date: getDefaultDueDate(),
    send_now: true,
    payment_type: 'full', // 'full' or 'deposit'
    deposit_percentage: 50,
    deposit_amount: '',
    isRecurring: false,
    recurringInterval: 'monthly',
    recurringDayOfMonth: 15,
    recurringEndDate: '',
    recurringCount: '',
  })

  // Load services and customers when dialog opens
  useEffect(() => {
    if (open && projectId) {
      loadServices()
      loadCustomers()
    }
  }, [open, projectId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        selectedCustomerId: '',
        selectedServiceId: '',
        email: '',
        name: '',
        company: '',
        cc_emails: [],
        amount: '',
        description: '',
        due_date: getDefaultDueDate(),
        send_now: true,
        payment_type: 'full',
        deposit_percentage: 50,
        deposit_amount: '',
        isRecurring: false,
        recurringInterval: 'monthly',
        recurringDayOfMonth: 15,
        recurringEndDate: '',
        recurringCount: '',
      })
      setError(null)
      setSuccess(false)
      setShowCcInput(false)
      setCcInputValue('')
    }
  }, [open])

  const loadServices = async () => {
    setIsLoadingServices(true)
    try {
      const res = await commerceApi.getOfferings(projectId, { type: 'service', status: 'active' })
      const data = res?.data ?? res ?? []
      setServices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading services:', err)
    } finally {
      setIsLoadingServices(false)
    }
  }

  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    try {
      const res = await commerceApi.getCustomers(projectId, { limit: 100 })
      const data = res?.data ?? res ?? []
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading customers:', err)
      setCustomers([])
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  const handleCustomerSelect = (value) => {
    if (value === '__new__' || !value) {
      setFormData(prev => ({ ...prev, selectedCustomerId: '', email: '', name: '', company: '' }))
      return
    }
    const customer = customers.find(c => c.id === value)
    if (customer) {
      setFormData(prev => ({
        ...prev,
        selectedCustomerId: value,
        email: customer.email || '',
        name: customer.name || '',
        company: customer.company || '',
      }))
    }
  }

  // When a service is selected, auto-populate fields
  const handleServiceSelect = (value) => {
    const service = services.find(s => s.id === value)
    if (service) {
      const price = service.price || 0
      setFormData(prev => ({
        ...prev,
        selectedServiceId: value,
        amount: price.toString(),
        description: service.name + (service.description ? ` - ${service.description}` : ''),
        deposit_amount: (price * 0.5).toFixed(2), // 50% default deposit
      }))
    } else {
      // value is '__custom__' (no service) or empty
      setFormData(prev => ({
        ...prev,
        selectedServiceId: value === '__custom__' ? '__custom__' : '',
      }))
    }
  }

  // CC email helpers
  const addCcEmail = (raw) => {
    const emails = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const valid = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    if (!valid.length) return
    setFormData(prev => ({
      ...prev,
      cc_emails: [...new Set([...prev.cc_emails, ...valid])],
    }))
    setCcInputValue('')
  }

  const removeCcEmail = (email) => {
    setFormData(prev => ({ ...prev, cc_emails: prev.cc_emails.filter(e => e !== email) }))
  }

  const handleCcKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCcEmail(ccInputValue)
    }
  }

  // Update deposit amount when percentage changes
  const handleDepositPercentageChange = (percentage) => {
    const amount = parseFloat(formData.amount) || 0
    setFormData(prev => ({
      ...prev,
      deposit_percentage: percentage,
      deposit_amount: ((amount * percentage) / 100).toFixed(2),
    }))
  }

  // Calculate final invoice amount based on payment type
  const getFinalAmount = () => {
    const baseAmount = parseFloat(formData.amount) || 0
    if (formData.payment_type === 'deposit') {
      return parseFloat(formData.deposit_amount) || (baseAmount * 0.5)
    }
    return baseAmount
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email?.trim()) {
      setError('Email is required')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const finalAmount = getFinalAmount()
      const email = formData.email.trim().toLowerCase()

      // Use selected existing customer, or find/create for one-off
      let contactId
      if (formData.selectedCustomerId) {
        contactId = formData.selectedCustomerId
      } else {
        try {
          const customerRes = await commerceApi.findOrCreateCustomer(projectId, {
            email,
            name: formData.name?.trim() || undefined,
            company: formData.company?.trim() || undefined,
          })
          const customer = customerRes?.data ?? customerRes
          contactId = customer?.id
        } catch (contactErr) {
          console.error('Error finding/creating contact:', contactErr)
          throw new Error(contactErr?.response?.data?.message || contactErr?.message || 'Failed to find or create contact')
        }
      }

      if (!contactId) throw new Error('Could not resolve contact')

      const description = formData.description + (formData.payment_type === 'deposit' ? ` (Deposit - ${formData.deposit_percentage}%)` : '')

      await billingApi.createInvoice({
        contactId,
        projectId,
        amount: finalAmount,
        description,
        dueDate: formData.due_date,
        sendImmediately: formData.send_now,
        cc_emails: formData.cc_emails.length ? formData.cc_emails : undefined,
        isRecurring: formData.isRecurring || undefined,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined,
        recurringDayOfMonth: formData.isRecurring ? formData.recurringDayOfMonth : undefined,
        recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : undefined,
        recurringCount: formData.isRecurring && formData.recurringCount ? parseInt(formData.recurringCount, 10) : undefined,
      })

      setSuccess(true)

      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error('Error creating invoice:', err)
      setError(err?.response?.data?.message || err?.message || 'Failed to create invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Send an invoice for a service or custom amount
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Send className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Invoice Created!</h3>
            <p className="text-[var(--text-secondary)]">
              {formData.send_now ? 'Email sent with payment link.' : 'Invoice saved as draft.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Client Selection: existing or one-off */}
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Bill to</Label>
              <Select
                value={formData.selectedCustomerId || '__new__'}
                onValueChange={handleCustomerSelect}
                disabled={isLoadingCustomers}
              >
                <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]">
                  <SelectValue placeholder={isLoadingCustomers ? "Loading clients..." : "Select existing client or add new..."} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--glass-bg)] border-[var(--glass-border)] max-h-[200px]">
                  <SelectItem value="__new__" className="text-[var(--text-secondary)]">
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      New / One-off invoice
                    </span>
                  </SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                        {[c.name, c.company].filter(Boolean).join(' · ') || c.email || 'Unknown'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)]">Select a Service (Optional)</Label>
              <Select 
                value={formData.selectedServiceId} 
                onValueChange={handleServiceSelect}
                disabled={isLoadingServices}
              >
                <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]">
                  <SelectValue placeholder={isLoadingServices ? "Loading services..." : "Choose a service to invoice for..."} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <SelectItem value="__custom__" className="text-[var(--text-secondary)]">
                    Custom Invoice (no service)
                  </SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="text-[var(--text-primary)]">{service.name}</span>
                        {service.price_type === 'fixed' && service.price && (
                          <span className="text-[var(--text-secondary)]">
                            ${Number(service.price).toLocaleString()}
                          </span>
                        )}
                        {service.price_type === 'quote' && (
                          <span className="text-[var(--text-tertiary)] text-xs">Quote</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Email */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-[var(--text-primary)]">Email Address *</Label>
                {!showCcInput && (
                  <button
                    type="button"
                    onClick={() => setShowCcInput(true)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                  >
                    + Add CC
                  </button>
                )}
              </div>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
                required
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
              />
              {/* CC section */}
              {showCcInput && (
                <div className="space-y-2 pt-1">
                  <Label className="text-[var(--text-secondary)] text-xs">CC (comma-separated, press Enter to add)</Label>
                  <Input
                    type="text"
                    value={ccInputValue}
                    onChange={(e) => setCcInputValue(e.target.value)}
                    onKeyDown={handleCcKeyDown}
                    onBlur={() => { if (ccInputValue.trim()) addCcEmail(ccInputValue) }}
                    placeholder="cc@example.com, another@example.com"
                    className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                  />
                  {formData.cc_emails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.cc_emails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] text-[var(--text-primary)]"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeCcEmail(email)}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Customer Name & Company */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[var(--text-primary)]">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-[var(--text-primary)]">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Acme Inc"
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Amount & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[var(--text-primary)]">Total Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    const amount = e.target.value
                    setFormData(prev => ({ 
                      ...prev, 
                      amount,
                      deposit_amount: ((parseFloat(amount) || 0) * prev.deposit_percentage / 100).toFixed(2)
                    }))
                  }}
                  placeholder="0.00"
                  required
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-[var(--text-primary)]">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Payment Type (Deposit / Full) */}
            {parseFloat(formData.amount) > 0 && (
              <div className="space-y-3 p-4 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
                <Label className="text-[var(--text-primary)]">Payment Type</Label>
                <RadioGroup
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_type: value }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="cursor-pointer text-[var(--text-primary)]">
                      Pay in Full (${parseFloat(formData.amount).toLocaleString()})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="deposit" id="deposit" />
                    <Label htmlFor="deposit" className="cursor-pointer text-[var(--text-primary)]">
                      Deposit
                    </Label>
                  </div>
                </RadioGroup>

                {formData.payment_type === 'deposit' && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-[var(--text-secondary)]">Deposit %</Label>
                      <Select 
                        value={formData.deposit_percentage.toString()} 
                        onValueChange={(v) => handleDepositPercentageChange(parseInt(v))}
                      >
                        <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                          <SelectItem value="25">25%</SelectItem>
                          <SelectItem value="50">50%</SelectItem>
                          <SelectItem value="75">75%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-[var(--text-secondary)]">Deposit Amount</Label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                        <DollarSign className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="text-[var(--text-primary)] font-medium">
                          {parseFloat(formData.deposit_amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[var(--text-primary)]">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Services rendered..."
                rows={3}
                className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
              />
            </div>

            {/* Recurring */}
            <div className="space-y-4 p-4 rounded-lg border border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: !!checked }))}
                />
                <Label htmlFor="isRecurring" className="cursor-pointer text-[var(--text-primary)]">
                  Recurring invoice
                </Label>
              </div>
              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-primary)]">Interval</Label>
                    <Select
                      value={formData.recurringInterval}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, recurringInterval: v }))}
                    >
                      <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                        {RECURRING_INTERVALS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-primary)]">Day of month (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.recurringDayOfMonth}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recurringDayOfMonth: parseInt(e.target.value, 10) || 1,
                      }))}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-primary)]">End date</Label>
                    <Input
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-primary)]">Number of occurrences</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.recurringCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurringCount: e.target.value }))}
                      placeholder="Leave empty for unlimited"
                      className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Send Now */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="send_now" 
                checked={formData.send_now}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_now: checked }))}
              />
              <Label htmlFor="send_now" className="cursor-pointer text-[var(--text-primary)]">
                Send email immediately with payment link
              </Label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-[var(--glass-border)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.email || !formData.amount || !formData.due_date}
                style={{ backgroundColor: brandColors?.primary || '#3b82f6' }}
                className="text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {formData.send_now ? 'Create & Send' : 'Create Invoice'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
