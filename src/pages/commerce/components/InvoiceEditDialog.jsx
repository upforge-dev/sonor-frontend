// src/pages/commerce/components/InvoiceEditDialog.jsx
// Edit invoice with line items and recurring fields

import { useState, useEffect } from 'react'
import { useInvoice, useUpdateInvoice } from '@/lib/hooks/use-billing'
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
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const RECURRING_INTERVALS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
]

export function InvoiceEditDialog({ open, onOpenChange, invoiceId, onSuccess }) {
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(invoiceId, { enabled: !!invoiceId && open })
  const updateMutation = useUpdateInvoice()

  const [formData, setFormData] = useState({
    amount: '',
    taxRate: '',
    dueDate: '',
    status: '',
    description: '',
    notes: '',
    isRecurring: false,
    recurringInterval: 'monthly',
    recurringDayOfMonth: 15,
    recurringEndDate: '',
    recurringCount: '',
    recurringPaused: false,
    items: [],
  })

  useEffect(() => {
    if (invoice && open) {
      const items = invoice.items || invoice.invoice_items || []
      const hasItems = items.length > 0
      setFormData({
        amount: String(invoice.amount ?? ''),
        taxRate: String(((invoice.tax_amount ?? 0) / (invoice.amount || 1)) * 100 || ''),
        dueDate: invoice.due_at ? invoice.due_at.slice(0, 10) : '',
        status: invoice.status || 'pending',
        description: invoice.description || '',
        notes: invoice.notes || '',
        isRecurring: invoice.is_recurring ?? false,
        recurringInterval: invoice.recurring_interval || 'monthly',
        recurringDayOfMonth: invoice.recurring_day_of_month ?? 15,
        recurringEndDate: invoice.recurring_end_date ? invoice.recurring_end_date.slice(0, 10) : '',
        recurringCount: invoice.recurring_count ? String(invoice.recurring_count) : '',
        recurringPaused: invoice.recurring_paused ?? false,
        items: hasItems
          ? items.map((i) => ({
              id: i.id,
              description: i.description || '',
              quantity: Number(i.quantity ?? 1),
              unit_price: Number(i.unit_price ?? 0),
              total_price: i.total_price ?? i.quantity * i.unit_price ?? 0,
            }))
          : invoice.description
            ? [{ id: null, description: invoice.description, quantity: 1, unit_price: invoice.amount ?? 0, total_price: invoice.amount ?? 0 }]
            : [{ id: null, description: '', quantity: 1, unit_price: 0, total_price: 0 }],
      })
    }
  }, [invoice, open])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? Number(value) : items[index].quantity
        const u = field === 'unit_price' ? Number(value) : items[index].unit_price
        items[index].total_price = q * u
      }
      return { ...prev, items }
    })
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: null, description: '', quantity: 1, unit_price: 0, total_price: 0 }],
    }))
  }

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const totalFromItems = formData.items.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0)
  const useItemsTotal = formData.items.some((i) => i.description || i.unit_price)
  const displayAmount = useItemsTotal ? totalFromItems : Number(formData.amount) || 0
  const taxRate = Number(formData.taxRate) || 0
  const taxAmount = displayAmount * (taxRate / 100)
  const totalAmount = displayAmount + taxAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!invoiceId) return
    const amount = useItemsTotal ? totalFromItems : Number(formData.amount) || 0
    try {
      const payload = {
        amount,
        taxRate,
        dueDate: formData.dueDate || undefined,
        status: formData.status || undefined,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : undefined,
        recurringDayOfMonth: formData.isRecurring ? formData.recurringDayOfMonth : undefined,
        recurringEndDate: formData.isRecurring && formData.recurringEndDate ? formData.recurringEndDate : undefined,
        recurringCount: formData.isRecurring && formData.recurringCount ? parseInt(formData.recurringCount, 10) : undefined,
        recurringPaused: formData.isRecurring ? formData.recurringPaused : undefined,
      }
      if (formData.items.length > 0 && formData.items.some((i) => i.description || i.unit_price)) {
        payload.items = formData.items.map(({ id, description, quantity, unit_price, total_price }) => ({
          id: id || undefined,
          description,
          quantity,
          unit_price,
          total_price: total_price ?? quantity * unit_price,
        }))
      }
      await updateMutation.mutateAsync({ invoiceId, invoiceData: payload })
      toast.success('Invoice updated')
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err?.message || 'Failed to update invoice')
    }
  }

  const isSubmitting = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>Update invoice details, line items, and recurring settings.</DialogDescription>
        </DialogHeader>
        {isLoadingInvoice ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border border-border/50 p-3 max-h-48 overflow-y-auto">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-16"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit $"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      className="w-24"
                    />
                    <span className="py-2 text-sm font-medium w-20 text-right">
                      ${Number(item.total_price || 0).toLocaleString()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length <= 1}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount (when no line items) */}
            {!useItemsTotal && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.taxRate}
                    onChange={(e) => handleChange('taxRate', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {useItemsTotal && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtotal</Label>
                  <p className="font-medium">${displayAmount.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.taxRate}
                    onChange={(e) => handleChange('taxRate', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border/50 p-3 bg-muted/20">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Invoice description"
                rows={2}
              />
            </div>

            {/* Recurring */}
            <div className="space-y-4 rounded-lg border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => handleChange('isRecurring', !!checked)}
                />
                <Label htmlFor="isRecurring">Recurring invoice</Label>
              </div>
              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Interval</Label>
                    <Select
                      value={formData.recurringInterval}
                      onValueChange={(v) => handleChange('recurringInterval', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRING_INTERVALS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Day of month (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.recurringDayOfMonth}
                      onChange={(e) => handleChange('recurringDayOfMonth', parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => handleChange('recurringEndDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of occurrences</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.recurringCount}
                      onChange={(e) => handleChange('recurringCount', e.target.value)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Checkbox
                      id="recurringPaused"
                      checked={formData.recurringPaused}
                      onCheckedChange={(checked) => handleChange('recurringPaused', !!checked)}
                    />
                    <Label htmlFor="recurringPaused">Paused</Label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Invoice'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
