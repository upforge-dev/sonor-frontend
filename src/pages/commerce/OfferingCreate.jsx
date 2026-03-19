// src/pages/commerce/OfferingCreate.jsx
// Create new offering form - supports all types
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useCreateCommerceOffering, useCreateCommerceSchedule, useUploadCommerceImage, useCreateCommerceVariant, useCommerceSettings, commerceKeys } from '@/lib/hooks'
import { useForms, formsKeys } from '@/lib/hooks'
import { useSeoPages } from '@/hooks/seo'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Sparkles,
  Lightbulb,
  CheckCircle,
  Upload,
  X,
  ImageIcon,
  Clock,
} from 'lucide-react'
import { EchoGenerateButton } from '@/components/ai/EchoGenerateButton'
import SizeChartEditor from '@/components/commerce/SizeChartEditor'

// Preset clothing sizes
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const SIZE_DISPLAY_NAMES = { XS: 'Extra Small', S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra Large', '2XL': '2X Large', '3XL': '3X Large' }

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

export default function OfferingCreate({ type: propType, embedded = false, onBack, onSuccess }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentProject } = useAuthStore()
  const createOfferingMutation = useCreateCommerceOffering()
  const createVariantMutation = useCreateCommerceVariant()
  const { data: settings } = useCommerceSettings(currentProject?.id)
  const { data: forms = [], isLoading: formsLoading } = useForms(currentProject?.id ? { projectId: currentProject.id } : {}, { enabled: !!currentProject?.id })
  const uploadImageMutation = useUploadCommerceImage()
  const createScheduleMutation = useCreateCommerceSchedule()
  // Use React Query hook for SEO pages
  const { data: seoPagesResponse, isLoading: pagesLoading } = useSeoPages(currentProject?.id, { limit: 200 })
  const seoPages = seoPagesResponse?.data?.pages || seoPagesResponse?.pages || []

  // Check if coming from Signal generation
  const isFromSignal = searchParams.get('signal') === 'true'
  
  // Safely parse JSON from search params
  let signalSuggestions = []
  let signalFeatures = []
  try {
    signalSuggestions = isFromSignal ? JSON.parse(searchParams.get('suggestions') || '[]') : []
    signalFeatures = isFromSignal ? JSON.parse(searchParams.get('features') || '[]') : []
  } catch (e) {
    console.warn('Failed to parse Signal suggestions:', e)
  }

  // All useState hooks MUST be declared before any conditional returns
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(() => {
    // If coming from Signal, pre-fill with generated values
    if (isFromSignal) {
      return {
        type: propType || 'service',
        name: searchParams.get('name') || '',
        description: searchParams.get('description') || '',
        short_description: searchParams.get('short_description') || '',
        price: '',
        compare_at_price: '',
        status: 'draft',
        sku: '',
        track_inventory: false,
        inventory_count: '',
        is_clothing: false,
        sizeVariants: {}, // { 'S': 5, 'M': 10, ... }
        duration_minutes: '',
        requires_booking: true,
        capacity: '',
        form_id: '',
        seo_page_id: searchParams.get('seo_page_id') || '',
        page_path: searchParams.get('page_path') || '',
        external_url: '',
        deposit_enabled: false,
        deposit_type: 'percentage',
        deposit_amount: '',
        deposit_auto_charge: true,
        // Event-specific date/time fields
        event_date: null,
        event_start_time: '',
        event_end_time: '',
      }
    }

    // Default empty form
    return {
      type: propType || 'product',
      name: '',
      description: '',
      short_description: '',
      price: '',
      compare_at_price: '',
      status: 'draft',
      sku: '',
      track_inventory: false,
      inventory_count: '',
      is_clothing: false,
      sizeVariants: {},
      duration_minutes: '',
      requires_booking: true,
      capacity: '',
      form_id: '',
      seo_page_id: '',
      page_path: '',
      external_url: '',
      deposit_enabled: false,
      deposit_type: 'percentage',
      deposit_amount: '',
      deposit_auto_charge: true,
      // Event-specific date/time fields
      event_date: null,
      event_start_time: '',
      event_end_time: '',
    }
  })

  // Image upload state - images are held locally until form submit
  const [images, setImages] = useState([]) // { id, file, preview }
  const [sizeChart, setSizeChart] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Forms and SEO pages are now fetched via React Query hooks automatically

  // Image upload handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      addImages(files)
    }
  }, [])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) {
      addImages(files)
    }
    e.target.value = '' // Reset input
  }

  const addImages = (files) => {
    const newImages = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
    }))
    
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (imageId) => {
    setImages(prev => {
      const image = prev.find(i => i.id === imageId)
      if (image?.preview) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter(i => i.id !== imageId)
    })
  }

  // Show loading state if no project yet
  if (!currentProject?.id) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const enabledTypes = settings?.enabled_types || ['product', 'service']
  const currentType = formData.type
  const currentConfig = typeConfig[currentType]

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Please enter a name')
      return
    }

    if (formData.is_clothing && (!formData.sizeVariants || Object.keys(formData.sizeVariants).length === 0)) {
      toast.error('Enable at least one size for clothing products')
      return
    }

    setSaving(true)
    
    try {
      // Build offering data
      const data = {
        type: formData.type,
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
      if (currentConfig?.fields.includes('inventory')) {
        if (formData.is_clothing) {
          data.is_clothing = true
          data.track_inventory = true
          data.size_chart = sizeChart || null
          // Product-level inventory not used for clothing; variants hold inventory
        } else {
          data.track_inventory = formData.track_inventory
          data.inventory_count = formData.inventory_count ? parseInt(formData.inventory_count) : null
        }
      }
      if (currentConfig?.fields.includes('duration')) {
        data.duration_minutes = formData.duration_minutes ? parseInt(formData.duration_minutes) : null
        data.requires_booking = formData.requires_booking
      }
      // Service intake form
      if (formData.type === 'service' && formData.form_id) {
        data.form_id = formData.form_id
      }
      if (currentConfig?.fields.includes('capacity')) {
        data.capacity = formData.capacity ? parseInt(formData.capacity) : null
      }
      // External URL (events/classes that link externally instead of using internal checkout)
      if (formData.external_url?.trim()) {
        data.external_url = formData.external_url.trim()
      }
      if (currentConfig?.fields.includes('deposit') && formData.deposit_enabled) {
        data.deposit_settings = {
          enabled: true,
          type: formData.deposit_type,
          amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
          percentage: formData.deposit_type === 'percentage' && formData.deposit_amount
            ? parseFloat(formData.deposit_amount)
            : null,
          auto_charge_remaining: formData.deposit_auto_charge,
        }
      }

      // Page association for analytics
      if (formData.seo_page_id) {
        data.seo_page_id = formData.seo_page_id
        data.page_path = formData.page_path
      }

      // Create the offering first (without images)
      const offering = await createOfferingMutation.mutateAsync({ projectId: currentProject.id, data })

      // For clothing products, create size variants
      if (formData.is_clothing && formData.sizeVariants && Object.keys(formData.sizeVariants).length > 0) {
        const basePrice = formData.price ? parseFloat(formData.price) : null
        let sortOrder = 0
        for (const [sizeCode, qty] of Object.entries(formData.sizeVariants)) {
          const inventoryCount = typeof qty === 'number' ? qty : parseInt(String(qty), 10) || 0
          await createVariantMutation.mutateAsync({
            offeringId: offering.id,
            data: {
              name: SIZE_DISPLAY_NAMES[sizeCode] || sizeCode,
              options: { Size: sizeCode },
              price: basePrice,
              inventory_count: inventoryCount,
              track_inventory: true,
              is_default: sortOrder === 0,
              sort_order: sortOrder++,
            },
          })
        }
      }
      
      // Now upload images to the offering using the commerce API
      // This properly associates images with the offering and handles featured_image_id
      const imagesToUpload = images.filter(i => i.file && !i.error)
      if (imagesToUpload.length > 0) {
        try {
          for (let i = 0; i < imagesToUpload.length; i++) {
            const img = imagesToUpload[i]
            const isFeatured = i === 0 // First image is featured
            await uploadImageMutation.mutateAsync({ offeringId: offering.id, file: img.file, isFeatured })
          }
        } catch (imageError) {
          console.error('Failed to upload some images:', imageError)
          // Don't fail the whole operation, offering is already created
        }
      }
      
      // For events and classes with a date set, create an initial schedule
      if ((formData.type === 'event' || formData.type === 'class') && formData.event_date) {
        try {
          // Build starts_at and ends_at timestamps
          const dateStr = formData.event_date.toISOString().split('T')[0]
          const startTime = formData.event_start_time || '12:00'
          const endTime = formData.event_end_time || '13:00'
          
          const startsAt = new Date(`${dateStr}T${startTime}:00`)
          const endsAt = new Date(`${dateStr}T${endTime}:00`)
          
          // If end time is before start time, assume it's the next day
          if (endsAt <= startsAt) {
            endsAt.setDate(endsAt.getDate() + 1)
          }
          
          await createScheduleMutation.mutateAsync({
            offeringId: offering.id,
            data: {
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              capacity: data.capacity || null,
              spots_remaining: data.capacity || null,
            }
          })
        } catch (scheduleError) {
          console.error('Failed to create schedule:', scheduleError)
          // Don't fail the whole operation, just log it
        }
      }
      
      toast.success(`${currentConfig?.label || 'Offering'} created successfully`)
      if (onSuccess) {
        onSuccess(offering)
      } else {
        navigate(`/commerce/offerings/${offering.id}`)
      }
    } catch (error) {
      console.error('Failed to create offering:', error)
      toast.error(error.response?.data?.message || 'Failed to create offering')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={embedded ? "space-y-6" : "p-6 space-y-6"}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onBack ? onBack() : navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Create {propType ? currentConfig?.label : 'Offering'}
          </h1>
          <p className="text-muted-foreground">
            Add a new {propType ? currentConfig?.label.toLowerCase() : 'product, service, class, or event'}
          </p>
        </div>
      </div>

      {/* Signal Generation Banner */}
      {isFromSignal && (
        <div className="rounded-lg border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)] mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-[var(--brand-primary)]">
                Generated by Signal
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This service was pre-filled based on content from <span className="font-medium">{formData.page_path}</span>. 
                Review and customize the details below.
              </p>
              
              {signalSuggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-[var(--brand-primary)] uppercase tracking-wide flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Suggestions
                  </p>
                  <ul className="space-y-1">
                    {signalSuggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Horizontal Layout: Form on left, Images on right */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Form Fields */}
          <div className="flex-1 space-y-6 min-w-0">
        {/* Type Selection (only if not pre-selected) */}
        {!propType && (
          <Card>
            <CardHeader>
              <CardTitle>Type</CardTitle>
              <CardDescription>What kind of offering is this?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {enabledTypes.map(type => {
                  const config = typeConfig[type]
                  const Icon = config.icon
                  const isSelected = formData.type === type
                  
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('type', type)}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>The core details about this {currentConfig?.label.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={`Enter ${currentConfig?.label.toLowerCase()} name`}
                  className="flex-1"
                />
                <EchoGenerateButton
                  entityType="commerce_offering"
                  entityId={currentProject?.id}
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
                  entityId={currentProject?.id}
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
                  entityId={currentProject?.id}
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
            {currentConfig?.fields.includes('deposit') && (
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
        {currentConfig?.fields.includes('inventory') && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                {formData.is_clothing
                  ? 'Add size variants with per-size stock levels'
                  : 'Track stock for this product'}
              </CardDescription>
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
                    Enable size variants (S, M, L, etc.) with per-size inventory
                  </p>
                </div>
                <Switch
                  checked={formData.is_clothing}
                  onCheckedChange={(checked) => handleChange('is_clothing', checked)}
                />
              </div>

              {formData.is_clothing && (
                <div className="space-y-4 pt-2 border-t">
                  <Label>Size Variants</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable sizes and set stock quantity for each
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {SIZE_PRESETS.map((size) => {
                      const isEnabled = formData.sizeVariants.hasOwnProperty(size)
                      const qty = formData.sizeVariants[size] ?? 0
                      return (
                        <div
                          key={size}
                          className={`flex flex-col gap-2 p-3 rounded-lg border ${
                            isEnabled ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{size}</span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => {
                                setFormData((prev) => {
                                  const next = { ...prev.sizeVariants }
                                  if (checked) next[size] = 0
                                  else delete next[size]
                                  return { ...prev, sizeVariants: next }
                                })
                              }}
                            />
                          </div>
                          {isEnabled && (
                            <Input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={qty}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10)
                                setFormData((prev) => ({
                                  ...prev,
                                  sizeVariants: { ...prev.sizeVariants, [size]: isNaN(v) ? 0 : v },
                                }))
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {Object.keys(formData.sizeVariants || {}).length === 0 && (
                    <p className="text-sm text-amber-600">
                      Enable at least one size to create this clothing product
                    </p>
                  )}
                </div>
              )}

              {formData.is_clothing && (
                <div className="space-y-2 pt-2 border-t">
                  <div>
                    <Label>Size Chart</Label>
                    <p className="text-sm text-muted-foreground">
                      Measurement table shown to customers to help them choose the right size.
                    </p>
                  </div>
                  <SizeChartEditor
                    value={sizeChart}
                    onChange={setSizeChart}
                    existingSizes={Object.keys(formData.sizeVariants || {})}
                  />
                </div>
              )}

              {!formData.is_clothing && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Track Inventory</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep track of stock levels
                      </p>
                    </div>
                    <Switch
                      checked={formData.track_inventory}
                      onCheckedChange={(checked) => handleChange('track_inventory', checked)}
                    />
                  </div>

                  {formData.track_inventory && (
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
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Service/Class/Event fields */}
        {(currentConfig?.fields.includes('duration') || currentConfig?.fields.includes('capacity')) && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentConfig?.fields.includes('duration') && (
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

              {currentConfig?.fields.includes('capacity') && (
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
        {(currentType === 'event' || currentType === 'class') && (
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
        {currentType === 'service' && (
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

            {seoPages.length === 0 && !pagesLoading && (
              <div className="border border-dashed rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No pages crawled yet
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/seo/pages">
                    View SEO Pages
                  </Link>
                </Button>
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
          <Button type="button" variant="outline" onClick={() => onBack ? onBack() : navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || images.some(i => i.uploading)}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create {currentConfig?.label}
              </>
            )}
          </Button>
        </div>
          </div>

          {/* Right Column - Images & Event Schedule (responsive width) */}
          <div className="lg:w-80 xl:w-96 2xl:w-[420px] flex-shrink-0 space-y-6">
            {/* Image Upload Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Images
                </CardTitle>
                <CardDescription>
                  Add photos for this {currentConfig?.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                    ${isDragging 
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' 
                      : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--glass-bg-hover)]'
                    }
                  `}
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                >
                  <input
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'}`} />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {isDragging ? 'Drop images here' : 'Drag & drop images'}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    or click to browse
                  </p>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="space-y-2">
                    {images.map((image, index) => (
                      <div 
                        key={image.id} 
                        className="relative group flex items-center gap-3 p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                      >
                        <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={image.preview} 
                            alt="" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {image.file.name}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {index === 0 ? 'Featured image' : `Image ${index + 1}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-[var(--text-tertiary)]">
                  Images are uploaded to Files → Commerce → {formData.type === 'class' ? 'Classes' : `${formData.type}s`.charAt(0).toUpperCase() + `${formData.type}s`.slice(1)}
                </p>
              </CardContent>
            </Card>

            {/* Event Date/Time Card - Only show for events and classes */}
            {(formData.type === 'event' || formData.type === 'class') && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Event Schedule
                  </CardTitle>
                  <CardDescription>
                    Select the date and time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Calendar - using native date input as fallback */}
                  <div>
                    <Label htmlFor="event_date" className="text-xs mb-1.5 block">
                      Event Date
                    </Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date ? formData.event_date.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange('event_date', e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>

                  {/* Time Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="event_start_time" className="text-xs flex items-center gap-1 mb-1.5">
                        <Clock className="h-3 w-3" />
                        Start Time
                      </Label>
                      <Input
                        id="event_start_time"
                        type="time"
                        value={formData.event_start_time}
                        onChange={(e) => handleChange('event_start_time', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event_end_time" className="text-xs flex items-center gap-1 mb-1.5">
                        <Clock className="h-3 w-3" />
                        End Time
                      </Label>
                      <Input
                        id="event_end_time"
                        type="time"
                        value={formData.event_end_time}
                        onChange={(e) => handleChange('event_end_time', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Selected date summary */}
                  {formData.event_date && (
                    <div className="p-3 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formData.event_date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      {(formData.event_start_time || formData.event_end_time) && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {formData.event_start_time || '--:--'} — {formData.event_end_time || '--:--'}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
