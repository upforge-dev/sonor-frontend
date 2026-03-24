// src/pages/commerce/OfferingEdit.jsx
// Edit existing offering form - supports all types with image upload
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCommerceOffering, useUpdateCommerceOffering, useCommerceVariants, commerceKeys } from '@/lib/hooks'
import { useForms, formsKeys } from '@/lib/hooks'
import { useSeoPages } from '@/hooks/seo'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/toast'
import {
  Package,
  Wrench,
  GraduationCap,
  Calendar,
  ArrowLeft,
  Save,
  Loader2,
  ClipboardList,
  ExternalLink,
  Globe,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Ticket,
  DollarSign,
  Image as ImageIcon,
  Plus,
  X,
  Info,
} from 'lucide-react'
import CommerceImageUploader, { extractImageModelInfoMap } from '@/components/commerce/CommerceImageUploader'
import ClothingSizesModal from '@/components/commerce/ClothingSizesModal'
import VariantsManagement from '@/components/commerce/VariantsManagement'
import SizeChartEditor from '@/components/commerce/SizeChartEditor'
import ScheduleManagement from '@/components/commerce/ScheduleManagement'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EchoGenerateButton } from '@/components/ai/EchoGenerateButton'
import { format } from 'date-fns'

// Type configuration
const typeConfig = {
  product: {
    icon: Package,
    label: 'Product',
    fields: ['sku', 'inventory', 'weight', 'dimensions'],
  },
  service: {
    icon: Wrench,
    label: 'Service',
    fields: ['duration', 'booking', 'deposit'],
  },
  class: {
    icon: GraduationCap,
    label: 'Class',
    fields: ['duration', 'capacity', 'schedule', 'deposit'],
  },
  event: {
    icon: Calendar,
    label: 'Event',
    fields: ['capacity', 'schedule', 'deposit'],
  },
}

/** Parse metadata / image_model_info when API returns stringified JSON (jsonb edge cases). */
function cloneMetadataForForm(raw) {
  let md = raw
  if (md == null) return {}
  if (typeof md === 'string') {
    try {
      md = JSON.parse(md)
    } catch {
      return {}
    }
  }
  if (typeof md !== 'object' || Array.isArray(md)) return {}
  const next = { ...md }
  let imi = next.image_model_info ?? next.imageModelInfo
  if (typeof imi === 'string') {
    try {
      imi = JSON.parse(imi)
    } catch {
      imi = {}
    }
  }
  if (imi && typeof imi === 'object' && !Array.isArray(imi)) {
    next.image_model_info = { ...imi }
  }
  return next
}

export default function OfferingEdit({ offeringId, onBack }) {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = offeringId || routeId
  const { currentProject } = useAuthStore()
  // React Query hooks (replaces old useCommerceStore / useFormsStore)
  const { data: currentOffering, isLoading: offeringLoading, error: offeringError } = useCommerceOffering(id)
  const updateOfferingMutation = useUpdateCommerceOffering()
  const { data: forms = [], isLoading: formsLoading } = useForms(
    currentProject?.id ? { projectId: currentProject.id } : {},
    { enabled: !!currentProject?.id }
  )
  // Use React Query hook for SEO pages
  const { data: seoPagesResponse, isLoading: pagesLoading } = useSeoPages(currentProject?.id, { limit: 200 })
  const seoPages = seoPagesResponse?.data?.pages || seoPagesResponse?.pages || []
  const brandColors = useBrandColors()

  const loading = offeringLoading
  const [saving, setSaving] = useState(false)
  const error = offeringError?.message || null
  const [formData, setFormData] = useState(null)
  const [images, setImages] = useState([])
  const [clothingSizesModalOpen, setClothingSizesModalOpen] = useState(false)
  const [variantsModalOpen, setVariantsModalOpen] = useState(false)

  const { data: variantsData } = useCommerceVariants(id, {
    enabled: !!id && currentOffering?.type === 'product',
  })
  const variants = variantsData ?? []

  // Populate form when offering loads
  useEffect(() => {
    if (currentOffering && currentOffering.id === id) {
      setFormData({
        name: currentOffering.name || '',
        description: currentOffering.description || '',
        short_description: currentOffering.short_description || '',
        price: currentOffering.price?.toString() || '',
        compare_at_price: currentOffering.compare_at_price?.toString() || '',
        status: currentOffering.status || 'draft',
        // Product fields
        sku: currentOffering.sku || '',
        is_clothing: currentOffering.is_clothing ?? false,
        size_chart: currentOffering.size_chart || null,
        track_inventory: currentOffering.track_inventory || false,
        inventory_count: currentOffering.inventory_count?.toString() || '',
        // Service/Class fields
        duration_minutes: currentOffering.duration_minutes?.toString() || '',
        requires_booking: currentOffering.requires_booking ?? true,
        capacity: currentOffering.capacity?.toString() || '',
        // Service intake form
        form_id: currentOffering.form_id || '',
        // External registration link
        external_url: currentOffering.external_url || '',
        // Page association
        seo_page_id: currentOffering.seo_page_id || '',
        page_path: currentOffering.page_path || '',
        // Deposit - use actual database columns
        deposit_enabled: currentOffering.deposit_required || false,
        deposit_type: currentOffering.deposit_type || 'percentage',
        deposit_amount: currentOffering.deposit_amount?.toString() || '',
        deposit_auto_charge: currentOffering.auto_charge_remaining ?? true,
        // Metadata (care instructions, sizing notes, notices, model info)
        metadata: cloneMetadataForForm(currentOffering.metadata),
      })

      // Build images array from featured + gallery
      const imgs = []
      const featuredUrl =
        currentOffering.featured_image || currentOffering.featured_image_data?.url || null
      if (currentOffering.featured_image_id && featuredUrl) {
        imgs.push({
          id: currentOffering.featured_image_id,
          url: featuredUrl,
          is_featured: true,
        })
      }
      if (currentOffering.images?.length) {
        currentOffering.images.forEach(img => {
          if (img.id !== currentOffering.featured_image_id) {
            imgs.push({
              id: img.id,
              url: img.url,
              is_featured: false,
            })
          }
        })
      }
      setImages(imgs)
    }
  }, [currentOffering, id])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const queryClient = useQueryClient()
  const handleImagesChange = useCallback((newImages) => {
    setImages(newImages)
    // Refetch offering to update featured_image in cache
    queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(id) })
  }, [id, queryClient])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData?.name?.trim()) {
      toast.error('Please enter a name')
      return
    }

    setSaving(true)
    const currentConfig = typeConfig[currentOffering.type]
    
    try {
      // Build offering data
      const data = {
        name: formData.name,
        description: formData.description,
        short_description: formData.short_description,
        price: formData.price ? parseFloat(formData.price) : null,
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        status: formData.status,
      }

      // Add type-specific fields
      if (currentConfig?.fields.includes('sku')) {
        data.sku = formData.sku || null
      }
      if (currentOffering.type === 'product') {
        data.is_clothing = formData.is_clothing ?? false
        data.size_chart = formData.size_chart || null
      }
      if (currentConfig?.fields.includes('inventory')) {
        data.track_inventory = formData.track_inventory
        data.inventory_count = formData.inventory_count ? parseInt(formData.inventory_count) : null
      }
      if (currentConfig?.fields.includes('duration')) {
        data.duration_minutes = formData.duration_minutes ? parseInt(formData.duration_minutes) : null
        data.requires_booking = formData.requires_booking
      }
      // Service intake form
      if (currentOffering.type === 'service') {
        data.form_id = formData.form_id || null
      }
      if (currentConfig?.fields.includes('capacity')) {
        data.capacity = formData.capacity ? parseInt(formData.capacity) : null
      }
      // External URL (events/classes that link externally)
      data.external_url = formData.external_url?.trim() || null
      if (currentConfig?.fields.includes('deposit')) {
        data.deposit_required = formData.deposit_enabled || false
        data.deposit_type = formData.deposit_type || null
        data.deposit_amount = formData.deposit_amount ? parseFloat(formData.deposit_amount) : null
        data.auto_charge_remaining = formData.deposit_auto_charge || false
      }

      // Page association for analytics
      data.seo_page_id = formData.seo_page_id || null
      data.page_path = formData.page_path || null

      // Metadata (care instructions, sizing notes, notices, model info)
      if (formData.metadata && Object.keys(formData.metadata).length > 0) {
        data.metadata = formData.metadata
      }

      // Image order and featured (from drag/reorder on edit — only persist on Save)
      const featured = images.find((i) => i.is_featured)
      if (featured) data.featured_image_id = featured.id
      const galleryIds = images.filter((i) => !i.is_featured).map((i) => i.id)
      if (galleryIds.length) data.gallery_image_ids = galleryIds

      await updateOfferingMutation.mutateAsync({ offeringId: id, data })
      
      toast.success(`${currentConfig?.label || 'Offering'} updated successfully`)
      if (onBack) {
        onBack(id)
      } else {
        navigate(`/commerce/offerings/${id}`)
      }
    } catch (error) {
      console.error('Failed to update offering:', error)
      toast.error(error.response?.data?.message || 'Failed to update offering')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <EditSkeleton />
  }

  if (error || !currentOffering || !formData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">
              {error || 'Offering not found'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => (onBack ? onBack(id) : navigate('/commerce/offerings'))}
            >
              Back to Offerings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentConfig = typeConfig[currentOffering.type] || typeConfig.product
  const Icon = currentConfig.icon

  // Use Eventbrite-style layout for events
  if (currentOffering.type === 'event') {
    return (
      <EventEditView
        id={id}
        offering={currentOffering}
        formData={formData}
        images={images}
        saving={saving}
        handleChange={handleChange}
        handleImagesChange={handleImagesChange}
        handleSubmit={handleSubmit}
        onBack={onBack}
        navigate={navigate}
        brandColors={brandColors}
        queryClient={queryClient}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Modals at top level so they portal correctly and aren't clipped by form/layout */}
      {currentOffering?.type === 'product' && (
        <>
          <ClothingSizesModal
            open={clothingSizesModalOpen}
            onOpenChange={setClothingSizesModalOpen}
            offeringId={id}
            offeringName={formData?.name || currentOffering?.name}
            trackInventory={formData?.track_inventory}
            onVariantChange={() => queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(id) })}
          />
          <VariantsManagement
            open={variantsModalOpen}
            onOpenChange={setVariantsModalOpen}
            offeringId={id}
            offeringName={formData?.name || currentOffering?.name}
            basePrice={currentOffering?.price}
            trackInventory={formData?.track_inventory}
            onVariantChange={() => queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(id) })}
          />
        </>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => (onBack ? onBack(id) : navigate(-1))}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted`}>
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Edit {currentConfig.label}
            </h1>
            <p className="text-muted-foreground">
              {currentOffering.name}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              Add photos of your {currentConfig.label.toLowerCase()}. The featured image appears in listings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommerceImageUploader
              offeringId={id}
              images={images}
              featuredImageId={currentOffering.featured_image_id}
              onImagesChange={handleImagesChange}
              isClothing={formData?.is_clothing}
              imageModelInfo={{
                ...extractImageModelInfoMap(currentOffering?.metadata),
                ...extractImageModelInfoMap(formData?.metadata),
              }}
              onModelInfoChange={(imageId, info) => {
                const key = String(imageId)
                const current = {
                  ...extractImageModelInfoMap(currentOffering?.metadata),
                  ...extractImageModelInfoMap(formData.metadata),
                }
                const updated = { ...current }
                if (info) {
                  updated[key] = info
                } else {
                  delete updated[key]
                }
                handleChange('metadata', {
                  ...formData.metadata,
                  image_model_info: Object.keys(updated).length ? updated : undefined,
                })
              }}
            />
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={`Enter ${currentConfig.label.toLowerCase()} name`}
                  className="flex-1"
                />
                <EchoGenerateButton
                  entityType="commerce_offering"
                  entityId={id}
                  field="name"
                  currentValue={formData.name}
                  onGenerate={(text) => handleChange('name', text)}
                  size="sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="short_description">Short Description</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleChange('short_description', e.target.value)}
                  placeholder="Brief summary for listings"
                  className="flex-1"
                />
                <EchoGenerateButton
                  entityType="commerce_offering"
                  entityId={id}
                  field="short_description"
                  currentValue={formData.short_description}
                  onGenerate={(text) => handleChange('short_description', text)}
                  size="sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Full Description</Label>
              <div className="flex items-start gap-2">
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Detailed description"
                  rows={5}
                  className="flex-1"
                />
                <EchoGenerateButton
                  entityType="commerce_offering"
                  entityId={id}
                  field="description"
                  currentValue={formData.description}
                  onGenerate={(text) => handleChange('description', text)}
                  size="sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="compare_at_price">Compare at Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="compare_at_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compare_at_price}
                    onChange={(e) => handleChange('compare_at_price', e.target.value)}
                    className="pl-7"
                    placeholder="Original price (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Deposit Settings (for services/classes/events) */}
            {currentConfig.fields.includes('deposit') && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Deposit</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect a deposit upfront, charge remainder on completion
                    </p>
                  </div>
                  <Switch
                    checked={formData.deposit_enabled}
                    onCheckedChange={(checked) => handleChange('deposit_enabled', checked)}
                  />
                </div>

                {formData.deposit_enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                    <div>
                      <Label htmlFor="deposit_type">Deposit Type</Label>
                      <Select
                        value={formData.deposit_type}
                        onValueChange={(v) => handleChange('deposit_type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="deposit_amount">
                        {formData.deposit_type === 'percentage' ? 'Percentage' : 'Amount'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {formData.deposit_type === 'percentage' ? '%' : '$'}
                        </span>
                        <Input
                          id="deposit_amount"
                          type="number"
                          step={formData.deposit_type === 'percentage' ? '1' : '0.01'}
                          min="0"
                          max={formData.deposit_type === 'percentage' ? '100' : undefined}
                          value={formData.deposit_amount}
                          onChange={(e) => handleChange('deposit_amount', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <Switch
                        id="deposit_auto_charge"
                        checked={formData.deposit_auto_charge}
                        onCheckedChange={(checked) => handleChange('deposit_auto_charge', checked)}
                      />
                      <Label htmlFor="deposit_auto_charge" className="font-normal">
                        Automatically charge remaining balance on completion
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product-specific fields */}
        {currentConfig.fields.includes('inventory') && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="Stock keeping unit"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Is this clothing?</Label>
                  <p className="text-sm text-muted-foreground">
                    Enables a simple size list (S, M, L, etc.) and per-size stock. Use Manage sizes below to add sizes.
                  </p>
                </div>
                <Switch
                  checked={formData.is_clothing}
                  onCheckedChange={(checked) => handleChange('is_clothing', checked)}
                />
              </div>

              {formData.is_clothing && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Sizes</p>
                      <p className="text-xs text-muted-foreground">
                        {variants.length === 0
                          ? 'No sizes yet. Add S, M, L, etc.'
                          : `${variants.length} size${variants.length === 1 ? '' : 's'} (${variants.map((v) => v.options?.Size ?? v.name).join(', ')})`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setClothingSizesModalOpen(true)
                      }}
                    >
                      Manage sizes
                    </Button>
                  </div>
                </div>
              )}

              {formData.is_clothing && (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Size Chart</p>
                    <p className="text-xs text-muted-foreground">
                      Measurement table shown to customers to help them choose the right size.
                    </p>
                  </div>
                  <div className="overflow-x-auto -mx-6 px-6">
                    <SizeChartEditor
                      value={formData.size_chart}
                      onChange={(chart) => handleChange('size_chart', chart)}
                      existingSizes={variants.map((v) => v.options?.Size ?? v.name)}
                    />
                  </div>
                </div>
              )}

              {!formData.is_clothing && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Variants</p>
                      <p className="text-xs text-muted-foreground">
                        For options like rim size (18″, 20″), color, or other variations.
                      </p>
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setVariantsModalOpen(true)}>
                      Manage variants
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Track Inventory</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_clothing ? 'Per-size stock is set in Manage sizes.' : 'Keep track of stock levels'}
                  </p>
                </div>
                <Switch
                  checked={formData.track_inventory}
                  onCheckedChange={(checked) => handleChange('track_inventory', checked)}
                />
              </div>

              {formData.track_inventory && !formData.is_clothing && (
                <div>
                  <Label htmlFor="inventory_count">Stock Quantity</Label>
                  <Input
                    id="inventory_count"
                    type="number"
                    min="0"
                    value={formData.inventory_count}
                    onChange={(e) => handleChange('inventory_count', e.target.value)}
                    placeholder="Available quantity"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Details (clothing-specific: care, sizing, notices) */}
        {currentOffering?.type === 'product' && formData.is_clothing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Product Details
              </CardTitle>
              <CardDescription>
                Care instructions, sizing notes, and product notices displayed on the storefront
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="care_instructions">Care Instructions</Label>
                <Textarea
                  id="care_instructions"
                  value={formData.metadata?.care_instructions || ''}
                  onChange={(e) => handleChange('metadata', {
                    ...formData.metadata,
                    care_instructions: e.target.value || undefined,
                  })}
                  placeholder="e.g. Do not wash on hot or dry on high heat. This will cause the shirt to shrink."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="sizing_notes">Sizing Notes</Label>
                <Input
                  id="sizing_notes"
                  value={formData.metadata?.sizing_notes || ''}
                  onChange={(e) => handleChange('metadata', {
                    ...formData.metadata,
                    sizing_notes: e.target.value || undefined,
                  })}
                  placeholder="e.g. Fits true to size, Runs small — order one size up"
                />
              </div>

              <div>
                <Label>Product Notices</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Warning messages displayed on the product page (e.g. recommended items, important notes)
                </p>
                {(formData.metadata?.notices || []).map((notice, idx) => (
                  <div key={idx} className="flex items-start gap-2 mb-2">
                    <Textarea
                      value={notice}
                      onChange={(e) => {
                        const updated = [...(formData.metadata?.notices || [])]
                        updated[idx] = e.target.value
                        handleChange('metadata', {
                          ...formData.metadata,
                          notices: updated,
                        })
                      }}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                      onClick={() => {
                        const updated = (formData.metadata?.notices || []).filter((_, i) => i !== idx)
                        handleChange('metadata', {
                          ...formData.metadata,
                          notices: updated.length ? updated : undefined,
                        })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleChange('metadata', {
                      ...formData.metadata,
                      notices: [...(formData.metadata?.notices || []), ''],
                    })
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Notice
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service/Class/Event fields */}
        {(currentConfig.fields.includes('duration') || currentConfig.fields.includes('capacity')) && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentConfig.fields.includes('duration') && (
                <>
                  <div>
                    <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="0"
                      value={formData.duration_minutes}
                      onChange={(e) => handleChange('duration_minutes', e.target.value)}
                      placeholder="e.g., 60"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requires Booking</Label>
                      <p className="text-sm text-muted-foreground">
                        Customers must book a time slot
                      </p>
                    </div>
                    <Switch
                      checked={formData.requires_booking}
                      onCheckedChange={(checked) => handleChange('requires_booking', checked)}
                    />
                  </div>
                </>
              )}

              {currentConfig.fields.includes('capacity') && (
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                    placeholder="Maximum participants"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Leave empty for unlimited capacity
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* External Registration Link - Events and Classes */}
        {(currentOffering?.type === 'event' || currentOffering?.type === 'class') && (
          <Card>
            <CardHeader>
              <CardTitle>External Registration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Link to an external ticketing or registration page instead of using built-in checkout.
              </p>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="external_url">External URL</Label>
                <Input
                  id="external_url"
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => handleChange('external_url', e.target.value)}
                  placeholder="https://eventbrite.com/e/your-event"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  When set, visitors will be directed to this link instead of the Sonor checkout flow.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Form - Services only */}
        {currentOffering?.type === 'service' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Intake Form
              </CardTitle>
              <CardDescription>
                Collect information from customers when they book this service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Linked Form</Label>
                <Select
                  value={formData.form_id || 'none'}
                  onValueChange={(v) => handleChange('form_id', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formsLoading ? 'Loading forms...' : 'Select a form'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No intake form</SelectItem>
                    {forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Customers will fill out this form when booking
                </p>
              </div>

              {formData.form_id && (
                <div className="flex items-center gap-2">
                  <Link
                    to={`/forms?id=${formData.form_id}`}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Edit form <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {forms.length === 0 && !formsLoading && (
                <div className="border border-dashed rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No forms available
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/forms?action=create">
                      Create Intake Form
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Website Page Association */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Page
            </CardTitle>
            <CardDescription>
              Link to an existing page for analytics tracking and conversion data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Associated Page</Label>
              <Select
                value={formData.seo_page_id || 'none'}
                onValueChange={(v) => {
                  const page = seoPages.find(p => p.id === v)
                  handleChange('seo_page_id', v === 'none' ? '' : v)
                  handleChange('page_path', page?.path || '')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={pagesLoading ? 'Loading pages...' : 'Select a page'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked page</SelectItem>
                  {seoPages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      <div className="flex flex-col">
                        <span className="truncate">{page.title || page.path}</span>
                        <span className="text-xs text-muted-foreground">{page.path}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Track pageviews and conversions from this page
              </p>
            </div>

            {formData.seo_page_id && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Linked: {formData.page_path}</p>
                <p className="text-xs text-muted-foreground">
                  Analytics data from this page will be available in Commerce
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.status}
              onValueChange={(v) => handleChange('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft - Not visible</SelectItem>
                <SelectItem value="active">Active - Visible to customers</SelectItem>
                <SelectItem value="archived">Archived - Hidden</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => (onBack ? onBack(id) : navigate(-1))}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Loading skeleton
function EditSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}
// Eventbrite-style Event Edit View
function EventEditView({
  id,
  offering,
  formData,
  images,
  saving,
  handleChange,
  handleImagesChange,
  handleSubmit,
  onBack,
  navigate,
  brandColors,
  queryClient,
}) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  if (!formData) return null

  const schedules = offering.schedules || []
  const scheduleStartsAt = (s) => s.starts_at || s.start_time
  const upcomingSchedules = schedules
    .filter((s) => scheduleStartsAt(s))
    .sort((a, b) => new Date(scheduleStartsAt(a)) - new Date(scheduleStartsAt(b)))

  const featuredImage = images.find(img => img.is_featured)?.url || offering.featured_image
  const primary = brandColors?.primary || '#4bbf39'
  const primaryRgba = brandColors?.toRgba?.(primary, 0.2) || 'rgba(75, 191, 57, 0.2)'

  return (
    <div className="min-h-full bg-background">
      {/* Hero Header with Image Preview */}
      <div 
        className="relative h-48 md:h-64 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryRgba} 0%, ${brandColors?.toRgba?.(primary, 0.05) || 'rgba(75, 191, 57, 0.05)'} 100%)` }}
      >
        {featuredImage ? (
          <>
            <img
              src={featuredImage}
              alt={offering.name}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CalendarDays className="h-20 w-20" style={{ color: brandColors?.toRgba?.(primary, 0.3) || 'rgba(75, 191, 57, 0.3)' }} />
          </div>
        )}
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm"
          onClick={() => (onBack ? onBack(id) : navigate(-1))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="text-white text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: primary }}
            >
              EVENT
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              formData.status === 'active' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-500 text-white'
            }`}>
              {formData.status?.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {formData.name || 'Untitled Event'}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Media
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2">
                <Ticket className="h-4 w-4" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Globe className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Details</CardTitle>
                      <CardDescription>Basic information about your event</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name">Event Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="Give your event a clear, descriptive name"
                          className="text-lg"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="short_description">Summary</Label>
                        <Input
                          id="short_description"
                          value={formData.short_description}
                          onChange={(e) => handleChange('short_description', e.target.value)}
                          placeholder="A short tagline for your event"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          This appears in event listings and search results
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleChange('description', e.target.value)}
                          placeholder="Tell attendees what they can expect..."
                          rows={8}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Include details about the schedule, what to bring, and what attendees will learn or experience
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Date & time */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">Date & time</CardTitle>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowScheduleDialog(true)}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          {upcomingSchedules.length > 0 ? 'Edit' : 'Add'}
                        </Button>
                      </div>
                      <CardDescription>
                        When your event takes place
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {upcomingSchedules.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingSchedules.slice(0, 5).map((s) => {
                            const at = scheduleStartsAt(s)
                            const endAt = s.ends_at || s.end_time
                            return (
                              <div key={s.id} className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>
                                  {format(new Date(at), 'EEE, MMM d')} at {format(new Date(at), 'h:mm a')}
                                  {endAt && ` – ${format(new Date(endAt), 'h:mm a')}`}
                                </span>
                              </div>
                            )
                          })}
                          {upcomingSchedules.length > 5 && (
                            <p className="text-xs text-muted-foreground pt-1">
                              +{upcomingSchedules.length - 5} more session{upcomingSchedules.length - 5 !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No dates set. Click Add to set when this event runs.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats Preview */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: primaryRgba }}
                        >
                          <DollarSign className="h-4 w-4" style={{ color: primary }} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="font-semibold">
                            {formData.price ? `$${parseFloat(formData.price).toFixed(2)}` : 'Free'}
                          </p>
                        </div>
                      </div>

                      {upcomingSchedules.length > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Date</p>
                            <p className="font-semibold text-sm">
                              {format(new Date(scheduleStartsAt(upcomingSchedules[0])), 'MMM d, yyyy')} at {format(new Date(scheduleStartsAt(upcomingSchedules[0])), 'h:mm a')}
                            </p>
                            {upcomingSchedules.length > 1 && (
                              <p className="text-xs text-muted-foreground">+{upcomingSchedules.length - 1} more</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {formData.capacity && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Capacity</p>
                            <p className="font-semibold">{formData.capacity} attendees</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Visibility</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => handleChange('status', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              Draft
                            </div>
                          </SelectItem>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              Published
                            </div>
                          </SelectItem>
                          <SelectItem value="archived">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-300" />
                              Archived
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Images</CardTitle>
                  <CardDescription>
                    Add a compelling cover image and additional photos. The featured image will be used in listings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CommerceImageUploader
                    offeringId={id}
                    images={images}
                    featuredImageId={offering.featured_image_id}
                    onImagesChange={handleImagesChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Pricing</CardTitle>
                    <CardDescription>Set your ticket price and any discounts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="price">Ticket Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => handleChange('price', e.target.value)}
                          className="pl-7 text-lg"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave at 0 for a free event
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="compare_at_price">Original Price (optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="compare_at_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.compare_at_price}
                          onChange={(e) => handleChange('compare_at_price', e.target.value)}
                          className="pl-7"
                          placeholder="Show a crossed-out price"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Capacity</CardTitle>
                    <CardDescription>Limit how many people can attend</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="capacity">Maximum Attendees</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        value={formData.capacity}
                        onChange={(e) => handleChange('capacity', e.target.value)}
                        placeholder="Unlimited"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for unlimited capacity
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Deposit Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Deposit Options</CardTitle>
                  <CardDescription>Collect a deposit upfront, charge the rest later</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Deposit</Label>
                      <p className="text-sm text-muted-foreground">
                        Collect a partial payment when booking
                      </p>
                    </div>
                    <Switch
                      checked={formData.deposit_enabled}
                      onCheckedChange={(checked) => handleChange('deposit_enabled', checked)}
                    />
                  </div>

                  {formData.deposit_enabled && (
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                      <div>
                        <Label htmlFor="deposit_type">Deposit Type</Label>
                        <Select
                          value={formData.deposit_type}
                          onValueChange={(v) => handleChange('deposit_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="deposit_amount">
                          {formData.deposit_type === 'percentage' ? 'Percentage' : 'Amount'}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {formData.deposit_type === 'percentage' ? '%' : '$'}
                          </span>
                          <Input
                            id="deposit_amount"
                            type="number"
                            step={formData.deposit_type === 'percentage' ? '1' : '0.01'}
                            min="0"
                            max={formData.deposit_type === 'percentage' ? '100' : undefined}
                            value={formData.deposit_amount}
                            onChange={(e) => handleChange('deposit_amount', e.target.value)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleChange('status', v)}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft - Not visible to public</SelectItem>
                      <SelectItem value="active">Published - Accepting registrations</SelectItem>
                      <SelectItem value="archived">Archived - Hidden from listings</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* External Registration Link */}
              <Card>
                <CardHeader>
                  <CardTitle>External Registration</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Link to an external ticketing or registration page instead of using built-in checkout.
                  </p>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="external_url_settings">External URL</Label>
                    <Input
                      id="external_url_settings"
                      type="url"
                      value={formData.external_url}
                      onChange={(e) => handleChange('external_url', e.target.value)}
                      placeholder="https://eventbrite.com/e/your-event"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      When set, visitors will be directed to this link instead of the Sonor checkout flow.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Schedule management dialog */}
          <ScheduleManagement
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            offeringId={id}
            offeringName={offering.name}
            offeringType="event"
            defaultCapacity={offering.capacity ? Number(offering.capacity) : undefined}
            onScheduleChange={() => {
              queryClient?.invalidateQueries({ queryKey: commerceKeys.offeringDetail(id) })
            }}
          />

          {/* Floating Save Bar */}
          <div className="sticky bottom-4 mt-8">
            <Card className="shadow-lg border-2">
              <CardContent className="py-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {saving ? 'Saving changes...' : 'Make sure to save your changes'}
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => (onBack ? onBack(id) : navigate(-1))}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    style={{ backgroundColor: primary }}
                    className="hover:opacity-90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Event
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}