// src/components/commerce/DiscountCodesManagement.jsx
// Manage discount codes for Commerce
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect } from 'react'
import useAuthStore from '@/lib/auth-store'
import { useCommerceOfferings, useCommerceCategories, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { commerceApi } from '@/lib/portal-api'

const {
  getDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  getDiscountUsage,
} = commerceApi
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Search,
  Percent,
  DollarSign,
  Truck,
  Copy,
  Check,
  Clock,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format, parseISO, isAfter, isBefore } from 'date-fns'
import { EmptyState } from '@/components/EmptyState'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { TableSkeleton } from '@/components/skeletons'

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage Off', icon: Percent },
  { value: 'fixed_amount', label: 'Fixed Amount Off', icon: DollarSign },
  { value: 'free_shipping', label: 'Free Shipping', icon: Truck },
]

const APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All Offerings' },
  { value: 'specific_offerings', label: 'Specific Offerings' },
  { value: 'specific_categories', label: 'Specific Categories' },
]

export default function DiscountCodesManagement({ open, onOpenChange }) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id

  const [discountCodes, setDiscountCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [usageDialogOpen, setUsageDialogOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '',
    max_discount_amount: '',
    usage_limit: '',
    usage_limit_per_customer: '1',
    applies_to: 'all',
    applicable_offering_ids: [],
    applicable_category_ids: [],
    starts_at: '',
    expires_at: '',
    is_active: true,
  })

  // Reference data for offerings/categories selection
  const [offerings, setOfferings] = useState([])
  const [categories, setCategories] = useState([])
  const [usage, setUsage] = useState([])
  const [usageLoading, setUsageLoading] = useState(false)

  useEffect(() => {
    if (open && projectId) {
      loadDiscountCodes()
      loadReferenceData()
    }
  }, [open, projectId])

  const loadDiscountCodes = async () => {
    setLoading(true)
    try {
      const result = await getDiscountCodes(projectId, {
        is_active: showActiveOnly ? true : undefined,
        search: search || undefined,
      })
      setDiscountCodes(result.data || [])
    } catch (err) {
      console.error('Failed to load discount codes:', err)
      toast.error('Failed to load discount codes')
    } finally {
      setLoading(false)
    }
  }

  const loadReferenceData = async () => {
    try {
      const [offeringsRes, categoriesRes] = await Promise.all([
        commerceApi.getOfferings(projectId, { status: 'active', limit: 100 }),
        commerceApi.getCategories(projectId),
      ])
      const offeringsData = offeringsRes?.data || offeringsRes
      const categoriesData = categoriesRes?.data || categoriesRes
      setOfferings(offeringsData || [])
      setCategories(categoriesData || [])
    } catch (err) {
      console.error('Failed to load reference data:', err)
    }
  }

  const handleCreate = () => {
    setSelectedCode(null)
    setForm({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_discount_amount: '',
      usage_limit: '',
      usage_limit_per_customer: '1',
      applies_to: 'all',
      applicable_offering_ids: [],
      applicable_category_ids: [],
      starts_at: '',
      expires_at: '',
      is_active: true,
    })
    setEditDialogOpen(true)
  }

  const handleEdit = (code) => {
    setSelectedCode(code)
    setForm({
      code: code.code,
      name: code.name || '',
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value?.toString() || '',
      min_order_amount: code.min_order_amount?.toString() || '',
      max_discount_amount: code.max_discount_amount?.toString() || '',
      usage_limit: code.usage_limit?.toString() || '',
      usage_limit_per_customer: code.usage_limit_per_customer?.toString() || '1',
      applies_to: code.applies_to || 'all',
      applicable_offering_ids: code.applicable_offering_ids || [],
      applicable_category_ids: code.applicable_category_ids || [],
      starts_at: code.starts_at ? format(parseISO(code.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
      expires_at: code.expires_at ? format(parseISO(code.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      is_active: code.is_active,
    })
    setEditDialogOpen(true)
  }

  const handleViewUsage = async (code) => {
    setSelectedCode(code)
    setUsageDialogOpen(true)
    setUsageLoading(true)
    try {
      const result = await getDiscountUsage(projectId, code.id, { limit: 50 })
      setUsage(result.data || [])
    } catch (err) {
      console.error('Failed to load usage:', err)
      toast.error('Failed to load usage history')
    } finally {
      setUsageLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Code is required')
      return
    }
    if (!form.discount_value && form.discount_type !== 'free_shipping') {
      toast.error('Discount value is required')
      return
    }

    setSaving(true)
    try {
      const data = {
        code: form.code.toUpperCase().trim(),
        name: form.name || null,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
        usage_limit_per_customer: parseInt(form.usage_limit_per_customer, 10) || 1,
        applies_to: form.applies_to,
        applicable_offering_ids: form.applicable_offering_ids,
        applicable_category_ids: form.applicable_category_ids,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: form.is_active,
      }

      if (selectedCode) {
        await updateDiscountCode(projectId, selectedCode.id, data)
        toast.success('Discount code updated')
      } else {
        await createDiscountCode(projectId, data)
        toast.success('Discount code created')
      }

      setEditDialogOpen(false)
      loadDiscountCodes()
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error(err.response?.data?.message || 'Failed to save discount code')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCode) return
    try {
      await deleteDiscountCode(projectId, selectedCode.id)
      toast.success('Discount code deleted')
      setDeleteDialogOpen(false)
      loadDiscountCodes()
    } catch (err) {
      console.error('Failed to delete:', err)
      toast.error('Failed to delete discount code')
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm(prev => ({ ...prev, code }))
  }

  const getDiscountStatus = (code) => {
    const now = new Date()
    if (!code.is_active) {
      return { label: 'Inactive', variant: 'secondary' }
    }
    if (code.expires_at && isBefore(parseISO(code.expires_at), now)) {
      return { label: 'Expired', variant: 'destructive' }
    }
    if (code.starts_at && isAfter(parseISO(code.starts_at), now)) {
      return { label: 'Scheduled', variant: 'outline' }
    }
    if (code.usage_limit && code.current_usage_count >= code.usage_limit) {
      return { label: 'Limit Reached', variant: 'secondary' }
    }
    return { label: 'Active', variant: 'default' }
  }

  const formatDiscountValue = (code) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}% off`
    }
    if (code.discount_type === 'fixed_amount') {
      return `$${code.discount_value.toFixed(2)} off`
    }
    return 'Free Shipping'
  }

  // Filter codes by search
  const filteredCodes = discountCodes.filter(code =>
    code.code.toLowerCase().includes(search.toLowerCase()) ||
    (code.name && code.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Discount Codes
            </DialogTitle>
            <DialogDescription>
              Create and manage discount codes for your offerings
            </DialogDescription>
          </DialogHeader>

          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active-only"
                checked={showActiveOnly}
                onCheckedChange={(v) => {
                  setShowActiveOnly(v)
                  loadDiscountCodes()
                }}
              />
              <Label htmlFor="active-only" className="text-sm">Active only</Label>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Code
            </Button>
          </div>

          {/* Codes List */}
          {loading ? (
            <div className="border rounded-lg overflow-hidden">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : filteredCodes.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={Tag}
                  title={discountCodes.length === 0 ? 'No discount codes yet' : 'No codes match your search'}
                  description={
                    discountCodes.length === 0
                      ? 'Create a discount code to offer promotions to customers.'
                      : 'Try adjusting your search.'
                  }
                  actionLabel={discountCodes.length === 0 ? 'Create Your First Code' : undefined}
                  onAction={discountCodes.length === 0 ? handleCreate : undefined}
                  echoPrompt="How do I use discount codes to drive more sales?"
                  echoActions={[
                    { label: 'Discount strategy', prompt: 'What discount strategies work best for growing sales?' },
                    { label: 'Create a promo', prompt: 'Help me create a discount promotion for my store' },
                    { label: 'Seasonal offers', prompt: 'What seasonal discount ideas should I run for my business?' },
                  ]}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map(code => {
                    const status = getDiscountStatus(code)
                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyCode(code.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          {code.name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {code.name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {code.discount_type === 'percentage' && <Percent className="h-3.5 w-3.5" />}
                            {code.discount_type === 'fixed_amount' && <DollarSign className="h-3.5 w-3.5" />}
                            {code.discount_type === 'free_shipping' && <Truck className="h-3.5 w-3.5" />}
                            <span className="text-sm">{formatDiscountValue(code)}</span>
                          </div>
                          {code.min_order_amount && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Min. ${code.min_order_amount.toFixed(2)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {code.expires_at && status.label === 'Active' && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {format(parseISO(code.expires_at), 'MMM d')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {code.current_usage_count || 0}
                            {code.usage_limit && ` / ${code.usage_limit}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUsage(code)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(code)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCode(code)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCode ? 'Edit Discount Code' : 'Create Discount Code'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER20"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={generateRandomCode}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Letters, numbers, hyphens, and underscores only
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Summer Sale 20% Off"
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={form.discount_type}
                onValueChange={(v) => setForm(prev => ({ ...prev, discount_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount Value */}
            {form.discount_type !== 'free_shipping' && (
              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  {form.discount_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  max={form.discount_type === 'percentage' ? '100' : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm(prev => ({ ...prev, discount_value: e.target.value }))}
                  placeholder={form.discount_type === 'percentage' ? '20' : '10.00'}
                />
              </div>
            )}

            {/* Minimum Order */}
            <div className="space-y-2">
              <Label htmlFor="min_order_amount">Minimum Order Amount</Label>
              <Input
                id="min_order_amount"
                type="number"
                min="0"
                step="0.01"
                value={form.min_order_amount}
                onChange={(e) => setForm(prev => ({ ...prev, min_order_amount: e.target.value }))}
                placeholder="50.00"
              />
            </div>

            {/* Max Discount (for percentage) */}
            {form.discount_type === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="max_discount_amount">Maximum Discount Amount</Label>
                <Input
                  id="max_discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_discount_amount}
                  onChange={(e) => setForm(prev => ({ ...prev, max_discount_amount: e.target.value }))}
                  placeholder="100.00"
                />
                <p className="text-xs text-muted-foreground">
                  Cap the discount at this amount (optional)
                </p>
              </div>
            )}

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usage_limit">Total Usage Limit</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  min="0"
                  value={form.usage_limit}
                  onChange={(e) => setForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usage_limit_per_customer">Per Customer Limit</Label>
                <Input
                  id="usage_limit_per_customer"
                  type="number"
                  min="1"
                  value={form.usage_limit_per_customer}
                  onChange={(e) => setForm(prev => ({ ...prev, usage_limit_per_customer: e.target.value }))}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Start Date</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm(prev => ({ ...prev, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiration Date</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable this discount code</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />}
              {selectedCode ? 'Save Changes' : 'Create Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the code "{selectedCode?.code}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Usage History Dialog */}
      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Usage History: {selectedCode?.code}</DialogTitle>
            <DialogDescription>
              {selectedCode?.current_usage_count || 0} uses
              {selectedCode?.usage_limit && ` of ${selectedCode.usage_limit} limit`}
            </DialogDescription>
          </DialogHeader>

          {usageLoading ? (
            <div className="py-8 text-center">
              <UptradeSpinner size="md" className="[&_p]:hidden mx-auto" />
            </div>
          ) : usage.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No usage recorded yet
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        {u.customer?.email || u.customer_email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-green-600">
                        -${u.discount_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(u.used_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
