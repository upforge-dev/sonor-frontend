// src/pages/commerce/OfferingDetail.jsx
// View/Edit offering details
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useCommerceOffering, useDeleteCommerceOffering, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import portalApi from '@/lib/portal-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { AreaChart } from '@tremor/react'
import ScheduleManagement from '@/components/commerce/ScheduleManagement'
import VariantsManagement from '@/components/commerce/VariantsManagement'
import {
  Package,
  Wrench,
  GraduationCap,
  Calendar,
  ArrowLeft,
  Pencil,
  Trash2,
  DollarSign,
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  CalendarPlus,
  Layers,
  Copy,
  Mail,
  MapPin,
  Video,
  Share2,
  Ticket,
  CalendarDays,
  ChevronRight,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { format, formatDistanceToNow, isPast, isFuture, isToday } from 'date-fns'

// Type configuration
const typeConfig = {
  product: { icon: Package, label: 'Product', color: 'bg-blue-100 text-blue-700' },
  service: { icon: Wrench, label: 'Service', color: 'bg-green-100 text-green-700' },
  class: { icon: GraduationCap, label: 'Class', color: 'bg-purple-100 text-purple-700' },
  event: { icon: Calendar, label: 'Event', color: 'bg-orange-100 text-orange-700' },
}

export default function OfferingDetail({ offeringId, onBack, onEdit }) {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = offeringId || routeId || searchParams.get('offeringId')
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: currentOffering, isLoading: offeringLoading, error: offeringError } = useCommerceOffering(id)
  const deleteOfferingMutation = useDeleteCommerceOffering()

  const [error, setError] = useState(null)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showVariantsDialog, setShowVariantsDialog] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (offeringError) {
      setError(offeringError.message)
    }
  }, [offeringError])

  const handleDelete = async () => {
    try {
      await deleteOfferingMutation.mutateAsync({ offeringId: id })
      setShowDeleteDialog(false)
      toast.success('Offering deleted')
      if (onBack) {
        onBack()
      } else {
        navigate('/commerce/offerings')
      }
    } catch (err) {
      console.error('Failed to delete offering:', err)
      toast.error('Failed to delete offering')
    }
  }

  const handleDuplicate = async () => {
    if (!currentOffering || !currentProject?.id) return
    
    setDuplicating(true)
    try {
      // Create a copy of the offering with a new name
      const duplicateData = {
        type: currentOffering.type,
        name: `${currentOffering.name} (Copy)`,
        slug: `${currentOffering.slug}-copy-${Date.now()}`,
        description: currentOffering.description,
        short_description: currentOffering.short_description,
        price: currentOffering.price,
        price_type: currentOffering.price_type,
        compare_at_price: currentOffering.compare_at_price,
        currency: currentOffering.currency,
        duration_minutes: currentOffering.duration_minutes,
        capacity: currentOffering.capacity,
        category_id: currentOffering.category_id,
        tags: currentOffering.tags,
        features: currentOffering.features,
        deposit_settings: currentOffering.deposit_settings,
        track_inventory: currentOffering.track_inventory,
        status: 'draft', // Always start as draft
      }
      
      const response = await portalApi.post(`/commerce/offerings/${currentProject.id}`, duplicateData)
      toast.success('Offering duplicated')
      navigate(`/commerce/offerings/${response.data.id}`)
    } catch (err) {
      console.error('Failed to duplicate:', err)
      toast.error('Failed to duplicate offering')
    } finally {
      setDuplicating(false)
    }
  }

  if (offeringLoading) {
    return <DetailSkeleton />
  }

  if (error || !currentOffering) {
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
              onClick={() => (onBack ? onBack() : navigate('/commerce/offerings'))}
            >
              Back to Offerings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = typeConfig[currentOffering.type] || typeConfig.product
  const Icon = config.icon

  // Use Eventbrite-style layout for events
  if (currentOffering.type === 'event') {
    return (
      <EventDetailView
        offering={currentOffering}
        onBack={() => (onBack ? onBack() : navigate(-1))}
        onEdit={() => (onEdit ? onEdit(id) : navigate(`/commerce/offerings/${id}/edit`))}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        duplicating={duplicating}
        projectId={currentProject?.id}
        id={id}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => (onBack ? onBack() : navigate(-1))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-start gap-4">
            {currentOffering.featured_image ? (
              <img
                src={currentOffering.featured_image}
                alt={currentOffering.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            ) : (
              <div className={`p-4 rounded-lg ${config.color}`}>
                <Icon className="h-10 w-10" />
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{currentOffering.name}</h1>
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                <Badge
                  variant={
                    currentOffering.status === 'active'
                      ? 'default'
                      : currentOffering.status === 'draft'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {currentOffering.status}
                </Badge>
              </div>
              {currentOffering.short_description && (
                <p className="text-muted-foreground mt-1">
                  {currentOffering.short_description}
                </p>
              )}
              {/* Next date for events/classes */}
              {(currentOffering.type === 'event' || currentOffering.type === 'class') && (() => {
                const sched = currentOffering.next_schedule || currentOffering.schedules?.[0]
                const at = sched?.starts_at || sched?.start_time
                if (!at) return null
                const d = new Date(at)
                if (isPast(d)) return null
                return (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Next: {format(d, 'MMM d, yyyy')} at {format(d, 'h:mm a')}
                  </p>
                )
              })()}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Manage Variants button for products */}
          {currentOffering.type === 'product' && (
            <Button variant="outline" onClick={() => setShowVariantsDialog(true)}>
              <Layers className="h-4 w-4 mr-2" />
              Variants ({currentOffering.variants?.length || 0})
            </Button>
          )}
          {/* Manage Schedules button for events and classes */}
          {(currentOffering.type === 'event' || currentOffering.type === 'class') && (
            <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Manage Schedules
            </Button>
          )}
          {/* Create Email Campaign */}
          <Button
            variant="outline"
            onClick={() => {
              // Navigate to campaign composer with offering pre-selected
              navigate('/email/campaigns/new', {
                state: {
                  offering: {
                    id: currentOffering.id,
                    type: currentOffering.type,
                    name: currentOffering.name,
                    slug: currentOffering.slug,
                    price: currentOffering.price,
                    short_description: currentOffering.short_description,
                    featured_image: currentOffering.featured_image
                  }
                }
              })
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
          {/* Duplicate button */}
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            {duplicating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Duplicate
          </Button>
          <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          {onEdit ? (
            <Button onClick={() => onEdit(id)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <Button asChild>
              <Link to={`/commerce/offerings/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Price</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {currentOffering.price
                ? `$${currentOffering.price.toLocaleString()}`
                : '—'}
            </p>
            {currentOffering.compare_at_price && (
              <p className="text-sm text-muted-foreground line-through">
                ${currentOffering.compare_at_price.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {currentOffering.duration_minutes && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Duration</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {currentOffering.duration_minutes} min
              </p>
            </CardContent>
          </Card>
        )}

        {currentOffering.capacity && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Capacity</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {currentOffering.capacity}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Sales</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {currentOffering.sales_count || 0}
            </p>
          </CardContent>
        </Card>

        {/* Next date card for events/classes */}
        {(currentOffering.type === 'event' || currentOffering.type === 'class') && (() => {
          const sched = currentOffering.next_schedule || currentOffering.schedules?.[0]
          const at = sched?.starts_at || sched?.start_time
          if (!at) return null
          const d = new Date(at)
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Next date</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {format(d, 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(d, 'h:mm a')}
                  {currentOffering.schedules?.length > 1 && ` • ${currentOffering.schedules.length} sessions`}
                </p>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {currentOffering.variants?.length > 0 && (
            <TabsTrigger value="variants">Variants</TabsTrigger>
          )}
          {(currentOffering.type === 'event' || currentOffering.type === 'class') && (
            <TabsTrigger value="schedules">Schedules ({currentOffering.schedules?.length ?? 0})</TabsTrigger>
          )}
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          {/* Image Gallery */}
          {currentOffering.images?.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {currentOffering.images.map((image, index) => (
                    <div
                      key={image.id || index}
                      className="relative aspect-square rounded-lg overflow-hidden border group"
                    >
                      <img
                        src={image.url}
                        alt={image.filename || `Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {image.id === currentOffering.featured_image_id && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                          Featured
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {currentOffering.description ? (
                <div className="prose max-w-none">
                  {currentOffering.description}
                </div>
              ) : (
                <p className="text-muted-foreground">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Deposit Settings */}
          {currentOffering.deposit_settings?.enabled && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Deposit Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Deposit Required</p>
                    <p className="font-medium">
                      {currentOffering.deposit_settings.type === 'percentage'
                        ? `${currentOffering.deposit_settings.percentage}%`
                        : `$${currentOffering.deposit_settings.amount}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-charge Remaining</p>
                    <p className="font-medium">
                      {currentOffering.deposit_settings.auto_charge_remaining ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product-specific: Inventory */}
          {currentOffering.type === 'product' && currentOffering.track_inventory && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {currentOffering.sku && (
                    <div>
                      <p className="text-sm text-muted-foreground">SKU</p>
                      <p className="font-medium">{currentOffering.sku}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Stock</p>
                    <p className="font-medium">{currentOffering.inventory_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="variants" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>Different options for this offering</CardDescription>
            </CardHeader>
            <CardContent>
              {currentOffering.variants?.length > 0 ? (
                <div className="space-y-4">
                  {currentOffering.variants.map(variant => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        {variant.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {variant.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${variant.price?.toLocaleString()}</p>
                        {variant.inventory_count !== null && (
                          <p className="text-sm text-muted-foreground">
                            Stock: {variant.inventory_count}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No variants configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Schedules</CardTitle>
                  <CardDescription>Date and time for each session</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowScheduleDialog(true)}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Manage schedules
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentOffering.schedules?.length > 0 ? (
                <div className="space-y-4">
                  {currentOffering.schedules.map((schedule) => {
                    const at = schedule.starts_at || schedule.start_time
                    const capacity = schedule.capacity ?? schedule.max_capacity
                    const enrolled = schedule.current_enrollment ?? (capacity != null && schedule.spots_remaining != null ? capacity - schedule.spots_remaining : 0)
                    return (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {at
                              ? `${format(new Date(at), 'EEE, MMM d, yyyy')} at ${format(new Date(at), 'h:mm a')}`
                              : 'No date set'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {enrolled} / {capacity ?? '∞'} enrolled
                          </p>
                        </div>
                        <Badge variant={schedule.status === 'active' || schedule.status === 'scheduled' ? 'default' : 'secondary'}>
                          {schedule.status || 'scheduled'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No schedules yet</p>
                  <p className="text-sm mt-1">Add dates so customers can register.</p>
                  <Button className="mt-4" variant="outline" onClick={() => setShowScheduleDialog(true)}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Add schedule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <OfferingSalesHistory offeringId={id} projectId={currentProject?.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <OfferingAnalytics offeringId={id} />
        </TabsContent>
      </Tabs>

      {/* Schedule Management Dialog */}
      <ScheduleManagement
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        offeringId={id}
        offeringName={currentOffering.name}
        offeringType={currentOffering.type}
        defaultCapacity={currentOffering.capacity}
        onScheduleChange={() => {
          // Refetch offering to update schedule counts
          queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(id) })
        }}
      />

      {/* Variants Management Dialog */}
      <VariantsManagement
        open={showVariantsDialog}
        onOpenChange={setShowVariantsDialog}
        offeringId={id}
        offeringName={currentOffering.name}
        basePrice={currentOffering.price}
        trackInventory={currentOffering.track_inventory}
        onVariantChange={() => {
          // Refetch offering to update variant counts
          queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(id) })
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offering</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this offering? This action cannot be undone.
              All associated data including schedules, variants, and analytics will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-20 w-20 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// Analytics component for offering performance
function OfferingAnalytics({ offeringId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (offeringId) {
      loadAnalytics()
    }
  }, [offeringId, period])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await portalApi.get(`/commerce/offering/${offeringId}/analytics?period=${period}`)
      setAnalytics(response.data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadAnalytics}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Combine trends for chart
  const chartData = []
  const salesMap = new Map((analytics?.sales?.trend || []).map(d => [d.date, d]))
  const viewsMap = new Map((analytics?.views?.trend || []).map(d => [d.date, d]))
  
  const allDates = new Set([
    ...(analytics?.sales?.trend || []).map(d => d.date),
    ...(analytics?.views?.trend || []).map(d => d.date),
  ])
  
  Array.from(allDates).sort().forEach(date => {
    chartData.push({
      date,
      Revenue: salesMap.get(date)?.revenue || 0,
      'Page Views': viewsMap.get(date)?.views || 0,
    })
  })

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Analytics</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(analytics?.sales?.total_revenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.sales?.total_sales || 0} sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Page Views</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {(analytics?.views?.page_views || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.views?.unique_visitors || 0} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {analytics?.views?.conversion_rate || 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              views → sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg. Order</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ${(analytics?.sales?.average_order_value || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.sales?.units_sold || 0} units sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Views Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Traffic Trend</CardTitle>
            <CardDescription>Performance over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-64"
              data={chartData}
              index="date"
              categories={['Revenue', 'Page Views']}
              colors={['emerald', 'blue']}
              valueFormatter={(v) => typeof v === 'number' && v > 50 ? `$${v.toLocaleString()}` : v.toString()}
              showLegend={true}
              showGridLines={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Referrers */}
      {analytics?.top_referrers?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
            <CardDescription>Where your traffic is coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_referrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{referrer.domain}</span>
                  </div>
                  <Badge variant="secondary">{referrer.count} visits</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {chartData.length === 0 && !analytics?.sales?.total_sales && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No analytics data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Data will appear once you start getting views and sales
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper: sale is successfully paid/completed (exclude refunded/cancelled)
function isPaidSale(sale) {
  if (sale.status === 'refunded' || sale.status === 'cancelled') return false
  return sale.payment_status === 'paid' || sale.status === 'completed'
}

// Attendees list component - shows paid registrations only
function OfferingAttendees({ offeringId, projectId }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (offeringId && projectId) {
      loadSales()
    }
  }, [offeringId, projectId])

  const loadSales = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await portalApi.get(`/commerce/sales/${projectId}?offering_id=${offeringId}&limit=100`)
      setSales(response.data || [])
    } catch (err) {
      console.error('Failed to load attendees:', err)
      setError('Failed to load attendees')
    } finally {
      setLoading(false)
    }
  }

  const paidAttendees = sales.filter(isPaidSale)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadSales}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (paidAttendees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registered Attendees</CardTitle>
          <CardDescription>Successfully registered and paid</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No registrations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Attendees will appear here once they register and pay
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Registered Attendees</CardTitle>
            <CardDescription>Successfully registered and paid ({paidAttendees.length} total)</CardDescription>
          </div>
          <Badge variant="outline">{paidAttendees.length} registered</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Email</th>
                <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Phone</th>
                <th className="text-right p-3 text-sm font-medium">Qty</th>
                <th className="text-left p-3 text-sm font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {paidAttendees.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="p-3">
                    <p className="font-medium">{sale.customer_name || 'Guest'}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-sm text-muted-foreground">{sale.customer_email}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <p className="text-sm text-muted-foreground">{sale.customer_phone || sale.metadata?.phone || '—'}</p>
                  </td>
                  <td className="p-3 text-right text-sm">
                    {sale.quantity}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {format(new Date(sale.created_at), 'MMM d, yyyy')}
                    <span className="ml-1 text-xs">{format(new Date(sale.created_at), 'h:mm a')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// Sales history component for offering
function OfferingSalesHistory({ offeringId, projectId, defaultFilterPaid = true }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterPaid, setFilterPaid] = useState(defaultFilterPaid)

  useEffect(() => {
    if (offeringId && projectId) {
      loadSales()
    }
  }, [offeringId, projectId])

  const loadSales = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await portalApi.get(`/commerce/sales/${projectId}?offering_id=${offeringId}&limit=50`)
      setSales(response.data || [])
    } catch (err) {
      console.error('Failed to load sales:', err)
      setError('Failed to load sales history')
    } finally {
      setLoading(false)
    }
  }

  const displayedSales = filterPaid ? sales.filter(isPaidSale) : sales

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'secondary', label: 'Pending' },
      deposit_paid: { variant: 'outline', label: 'Deposit Paid' },
      completed: { variant: 'default', label: 'Completed' },
      refunded: { variant: 'destructive', label: 'Refunded' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadSales}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (sales.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No sales yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sales will appear here when customers purchase this offering
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Sales History</CardTitle>
            <CardDescription>
              {filterPaid
                ? `Paid / completed sales (${displayedSales.length} of ${sales.length} total)`
                : `All sales (${sales.length} total)`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterPaid ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPaid(true)}
            >
              Paid / Completed
            </Button>
            <Button
              variant={!filterPaid ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterPaid(false)}
            >
              All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {displayedSales.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No paid sales in this filter</p>
            <p className="text-sm text-muted-foreground mt-1">
              Switch to &quot;All&quot; to see pending or other statuses
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Date</th>
                <th className="text-left p-3 text-sm font-medium">Customer</th>
                <th className="text-right p-3 text-sm font-medium">Qty</th>
                <th className="text-right p-3 text-sm font-medium">Total</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedSales.map((sale) => (
                <tr key={sale.id} className="border-t">
                  <td className="p-3">
                    <span className="text-sm">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{sale.customer_name || 'Guest'}</p>
                      <p className="text-sm text-muted-foreground">{sale.customer_email}</p>
                    </div>
                  </td>
                  <td className="p-3 text-right text-sm">
                    {sale.quantity}
                  </td>
                  <td className="p-3 text-right font-medium">
                    ${(sale.total || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {getStatusBadge(sale.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
// Eventbrite-style Event Detail View
function EventDetailView({
  offering,
  onBack,
  onEdit,
  onDelete,
  onDuplicate,
  duplicating,
  projectId,
  id,
}) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const navigate = useNavigate()
  
  const handleDelete = async () => {
    try {
      await onDelete()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Delete error:', error)
      setShowDeleteDialog(false)
    }
  }
  
  // Get the next upcoming schedule
  const scheduleStartsAt = (s) => s.starts_at || s.start_time
  const upcomingSchedules = (offering.schedules || [])
    .filter((s) => {
      const at = scheduleStartsAt(s)
      if (!at) return false
      const status = (s.status || '').toLowerCase()
      return (status === 'active' || status === 'scheduled') && isFuture(new Date(at))
    })
    .sort((a, b) => new Date(scheduleStartsAt(a)) - new Date(scheduleStartsAt(b)))

  const nextSchedule = upcomingSchedules[0]
  const totalCapacity = upcomingSchedules.reduce((sum, s) => sum + (s.capacity ?? s.max_capacity ?? 0), 0)
  const totalEnrolled = upcomingSchedules.reduce((sum, s) => {
    const cap = s.capacity ?? s.max_capacity
    const enrolled = s.current_enrollment ?? (cap != null && s.spots_remaining != null ? cap - s.spots_remaining : 0)
    return sum + enrolled
  }, 0)
  const spotsRemaining = totalCapacity - totalEnrolled

  // Determine event status
  const getEventStatus = () => {
    if (!nextSchedule) {
      const pastSchedules = (offering.schedules || []).filter((s) => {
        const at = s.starts_at || s.start_time
        return at && isPast(new Date(at))
      })
      if (pastSchedules.length > 0) return { label: 'Past Event', color: 'text-muted-foreground', bg: 'bg-muted' }
      return { label: 'No Dates Scheduled', color: 'text-amber-600', bg: 'bg-amber-100' }
    }
    if (spotsRemaining <= 0) return { label: 'Sold Out', color: 'text-red-600', bg: 'bg-red-100' }
    if (spotsRemaining <= 5) return { label: `Only ${spotsRemaining} spots left!`, color: 'text-amber-600', bg: 'bg-amber-100' }
    const nextAt = nextSchedule.starts_at || nextSchedule.start_time
    if (nextAt && isToday(new Date(nextAt))) return { label: 'Today!', color: 'text-emerald-600', bg: 'bg-emerald-100' }
    return { label: 'On Sale', color: 'text-emerald-600', bg: 'bg-emerald-100' }
  }
  
  const eventStatus = getEventStatus()

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div className="relative">
        {/* Hero Image */}
        <div className="h-64 md:h-80 lg:h-96 w-full relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {offering.featured_image ? (
            <>
              <img
                src={offering.featured_image}
                alt={offering.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarDays className="h-24 w-24 text-primary/30" />
            </div>
          )}
          
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Admin Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm border-0"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied to clipboard')
              }}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm border-0"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          
          {/* Event Status Badge */}
          <div className="absolute bottom-4 left-4 z-20">
            <Badge className={`${eventStatus.bg} ${eventStatus.color} border-0 text-sm px-3 py-1 shadow-lg`}>
              {eventStatus.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Card */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                        Event
                      </Badge>
                      <Badge
                        variant={offering.status === 'active' ? 'default' : 'secondary'}
                      >
                        {offering.status}
                      </Badge>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold">{offering.name}</h1>
                    {offering.short_description && (
                      <p className="text-muted-foreground mt-2">{offering.short_description}</p>
                    )}
                  </div>
                </div>

                {/* Date & Time - Prominent Display */}
                {nextSchedule && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 text-center">
                        <div className="bg-primary text-primary-foreground rounded-t-lg px-2 py-1 text-xs font-medium uppercase">
                          {format(new Date(nextSchedule.starts_at || nextSchedule.start_time), 'MMM')}
                        </div>
                        <div className="bg-background border border-t-0 rounded-b-lg px-2 py-2">
                          <span className="text-2xl font-bold">
                            {format(new Date(nextSchedule.starts_at || nextSchedule.start_time), 'd')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">
                          {format(new Date(nextSchedule.starts_at || nextSchedule.start_time), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(nextSchedule.starts_at || nextSchedule.start_time), 'h:mm a')}
                          {(nextSchedule.ends_at || nextSchedule.end_time) && (
                            <> – {format(new Date(nextSchedule.ends_at || nextSchedule.end_time), 'h:mm a')}</>
                          )}
                        </p>
                        {upcomingSchedules.length > 1 && (
                          <p className="text-sm text-primary mt-2 cursor-pointer hover:underline"
                            onClick={() => setShowScheduleDialog(true)}>
                            + {upcomingSchedules.length - 1} more date{upcomingSchedules.length > 2 ? 's' : ''} available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="mt-4 flex items-start gap-3">
                  {offering.venue_type === 'virtual' ? (
                    <>
                      <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Online Event</p>
                        <p className="text-sm text-muted-foreground">Link will be provided after registration</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{offering.venue_name || 'In-Person Event'}</p>
                        {offering.venue_address && (
                          <p className="text-sm text-muted-foreground">{offering.venue_address}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent>
                {offering.description ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap">{offering.description}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Image Gallery */}
            {offering.images?.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {offering.images.filter(img => !img.is_featured).map((image, index) => (
                      <div
                        key={image.id || index}
                        className="aspect-video rounded-lg overflow-hidden border"
                      >
                        <img
                          src={image.url}
                          alt={image.filename || `Photo ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Analytics & Sales */}
            <Tabs defaultValue="analytics">
              <TabsList>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="attendees">Attendees</TabsTrigger>
                <TabsTrigger value="sales">Sales History</TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="mt-4">
                <OfferingAnalytics offeringId={id} />
              </TabsContent>

              <TabsContent value="attendees" className="mt-4">
                <OfferingAttendees offeringId={id} projectId={projectId} />
              </TabsContent>

              <TabsContent value="sales" className="mt-4">
                <OfferingSalesHistory offeringId={id} projectId={projectId} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-4">
            {/* Ticket/Registration Card */}
            <Card className="shadow-lg sticky top-4">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold">
                    {offering.price ? `$${offering.price.toLocaleString()}` : 'Free'}
                  </p>
                  {offering.compare_at_price && (
                    <p className="text-muted-foreground line-through">
                      ${offering.compare_at_price.toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">per person</p>
                </div>

                {/* Capacity Indicator */}
                {totalCapacity > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Availability</span>
                      <span className="font-medium">{totalEnrolled}/{totalCapacity}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          spotsRemaining <= 5 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min((totalEnrolled / totalCapacity) * 100, 100)}%` }}
                      />
                    </div>
                    {spotsRemaining > 0 && spotsRemaining <= 10 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Only {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left!
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button className="w-full" size="lg" onClick={() => setShowScheduleDialog(true)}>
                    <Ticket className="h-4 w-4 mr-2" />
                    Manage Tickets
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate('/email/campaigns/new', {
                        state: {
                          offering: {
                            id: offering.id,
                            type: offering.type,
                            name: offering.name,
                            slug: offering.slug,
                            price: offering.price,
                            short_description: offering.short_description,
                            featured_image: offering.featured_image
                          }
                        }
                      })
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Campaign
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{offering.sales_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      ${((offering.sales_count || 0) * (offering.price || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={onDuplicate} disabled={duplicating}>
                  {duplicating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Duplicate Event
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Event
                </Button>
              </CardContent>
            </Card>

            {/* All Dates */}
            {upcomingSchedules.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">All Dates</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowScheduleDialog(true)}>
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {upcomingSchedules.slice(0, 5).map(schedule => (
                    <div key={schedule.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50">
                      <div>
                        <p className="font-medium">{format(new Date(schedule.starts_at || schedule.start_time), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(schedule.starts_at || schedule.start_time), 'h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {schedule.current_enrollment || 0}/{schedule.max_capacity || '∞'}
                      </Badge>
                    </div>
                  ))}
                  {upcomingSchedules.length > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => setShowScheduleDialog(true)}
                    >
                      View all {upcomingSchedules.length} dates
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Management Dialog */}
      <ScheduleManagement
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        offeringId={id}
        offeringName={offering.name}
        offeringType={offering.type}
        defaultCapacity={offering.capacity}
        onScheduleChange={() => {
          // Refetch offering to update schedule counts
          // Note: This will be handled by React Query automatically via query invalidation
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offering</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this offering? This action cannot be undone.
              All associated data including schedules, variants, and analytics will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}