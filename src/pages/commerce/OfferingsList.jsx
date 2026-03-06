// src/pages/commerce/CommerceOfferings.jsx
// Unified offerings list - view and manage products, services, classes, events
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useCommerceSettings, useCommerceOfferings, useDeleteCommerceOffering, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { commerceApi } from '@/lib/portal-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton, TableSkeleton } from '@/components/skeletons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Package,
  Briefcase,
  GraduationCap,
  CalendarDays,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  ArrowUpDown,
  Grid3X3,
  List,
  ChevronLeft,
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isFuture, isToday, isPast } from 'date-fns'

const TYPE_CONFIG = {
  product: { label: 'Products', icon: Package, color: 'primary' },
  service: { label: 'Services', icon: Briefcase, color: 'secondary' },
  class: { label: 'Classes', icon: GraduationCap, color: 'primary' },
  event: { label: 'Events', icon: CalendarDays, color: 'secondary' },
}

const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  sold_out: { label: 'Sold Out', className: 'bg-amber-100 text-amber-700 border-amber-200' },
}

export default function CommerceOfferings({ type: typeProp }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentProject } = useAuthStore()
  const brandColors = useBrandColors()
  const projectId = currentProject?.id
  const { data: settings } = useCommerceSettings(projectId)
  // Use prop if provided, otherwise fall back to search params
  const typeFilter = typeProp || searchParams.get('type') || 'all'
  const statusFilter = searchParams.get('status') || 'all'
  const searchQuery = searchParams.get('q') || ''
  
  const [offerings, setOfferings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [offeringToDelete, setOfferingToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Get enabled types from settings
  const enabledTypes = useMemo(() => {
    return settings?.enabled_types || ['product', 'service']
  }, [settings])
  
  // Load offerings (settings loaded via useCommerceSettings)
  useEffect(() => {
    loadOfferings()
  }, [projectId, typeFilter, statusFilter, searchQuery])
  
  async function loadOfferings() {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    
    try {
      const filters = {}
      if (typeFilter !== 'all') filters.type = typeFilter
      if (statusFilter !== 'all') filters.status = statusFilter
      if (searchQuery) filters.search = searchQuery
      
      const res = await commerceApi.getOfferings(projectId, filters)
      const data = res?.data ?? res
      const list = Array.isArray(data) ? data : data?.offerings ?? data?.data ?? []
      setOfferings(list)
    } catch (err) {
      console.error('Failed to load offerings:', err)
      setError(err.response?.data?.message || err.message)
    } finally {
      setIsLoading(false)
    }
  }
  
  function updateFilter(key, value) {
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }
  
  function handleSearch(e) {
    const value = e.target.value
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    setSearchParams(params)
  }
  
  async function handleDelete() {
    if (!offeringToDelete) return
    setIsDeleting(true)
    
    try {
      await commerceApi.deleteOffering(offeringToDelete.id)
      setOfferings(prev => prev.filter(o => o.id !== offeringToDelete.id))
      setDeleteDialogOpen(false)
      setOfferingToDelete(null)
    } catch (err) {
      console.error('Failed to delete offering:', err)
    } finally {
      setIsDeleting(false)
    }
  }
  
  // Sort offerings
  const sortedOfferings = useMemo(() => {
    return [...offerings].sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      
      if (sortBy === 'price') {
        aVal = a.price || 0
        bVal = b.price || 0
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal?.toLowerCase() || ''
      }
      
      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })
  }, [offerings, sortBy, sortDir])
  
  const primary = brandColors.primary || '#4bbf39'
  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { primary10: 'rgba(75, 191, 57, 0.1)', secondary10: 'rgba(57, 191, 176, 0.1)' }
  
  const getTypeColor = (type) => {
    return ['product', 'class'].includes(type) ? primary : secondary
  }
  
  const getTypeBgColor = (type) => {
    return ['product', 'class'].includes(type) ? rgba.primary10 : rgba.secondary10
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/commerce')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Offerings</h1>
              <p className="text-muted-foreground">
                Manage your products, services, classes, and events
              </p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search offerings..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9"
              />
            </div>
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {enabledTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {TYPE_CONFIG[type]?.label || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            {/* View Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none border-l"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1" />
            
            {/* Add Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button style={{ backgroundColor: primary }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Offering
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {enabledTypes.map(type => {
                  const config = TYPE_CONFIG[type]
                  const Icon = config?.icon || Package
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => navigate(`/commerce/offerings/new?type=${type}`)}
                    >
                      <Icon className="h-4 w-4 mr-2" style={{ color: getTypeColor(type) }} />
                      Add {config?.label?.slice(0, -1) || type}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <CardSkeleton key={i} showHeader={true} contentLines={2} />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <TableSkeleton rows={6} cols={5} showHeader={true} />
            </div>
          )
        ) : error ? (
          <Card className="max-w-lg mx-auto mt-12">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <h3 className="font-semibold mb-2">Failed to load offerings</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadOfferings}>Try Again</Button>
            </CardContent>
          </Card>
        ) : sortedOfferings.length === 0 ? (
          <div className="max-w-lg mx-auto mt-12">
            <EmptyState
              icon={Package}
              title={
                searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No offerings match your filters'
                  : 'No offerings yet'
              }
              description={
                searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first product, service, class, or event'
              }
              actionLabel={
                !(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') ? 'Create Offering' : undefined
              }
              onAction={
                !(searchQuery || typeFilter !== 'all' || statusFilter !== 'all')
                  ? () => navigate('/commerce/offerings/new')
                  : undefined
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedOfferings.map(offering => (
              <OfferingCard
                key={offering.id}
                offering={offering}
                brandColors={{ primary, secondary, rgba, getTypeColor, getTypeBgColor }}
                onEdit={() => navigate(`/commerce/offerings/${offering.id}`)}
                onDelete={() => {
                  setOfferingToDelete(offering)
                  setDeleteDialogOpen(true)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedOfferings.map(offering => (
              <OfferingRow
                key={offering.id}
                offering={offering}
                brandColors={{ primary, secondary, rgba, getTypeColor, getTypeBgColor }}
                onEdit={() => navigate(`/commerce/offerings/${offering.id}`)}
                onDelete={() => {
                  setOfferingToDelete(offering)
                  setDeleteDialogOpen(true)
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Offering</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{offeringToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OfferingCard({ offering, brandColors, onEdit, onDelete }) {
  const config = TYPE_CONFIG[offering.type] || {}
  const Icon = config.icon || Package
  const statusConfig = STATUS_CONFIG[offering.status] || STATUS_CONFIG.draft
  
  // For events, use Eventbrite-style card
  if (offering.type === 'event') {
    return (
      <EventCard
        offering={offering}
        brandColors={brandColors}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )
  }
  
  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
      {/* Image/Placeholder */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden rounded-t-lg">
        {offering.featured_image ? (
          <img
            src={offering.featured_image}
            alt={offering.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: brandColors.getTypeBgColor(offering.type) }}
          >
            <Icon 
              className="h-12 w-12" 
              style={{ color: brandColors.getTypeColor(offering.type), opacity: 0.5 }}
            />
          </div>
        )}
        
        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={cn("absolute top-2 right-2", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
        
        {/* Actions */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div 
            className="p-1.5 rounded"
            style={{ backgroundColor: brandColors.getTypeBgColor(offering.type) }}
          >
            <Icon 
              className="h-4 w-4" 
              style={{ color: brandColors.getTypeColor(offering.type) }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{offering.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{offering.type}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            {offering.price ? `$${offering.price.toFixed(2)}` : 'Price varies'}
          </span>
          {offering.type === 'product' && offering.stock_quantity !== null && (
            <span className={cn(
              "text-sm",
              offering.stock_quantity <= (offering.low_stock_threshold || 10)
                ? "text-amber-600"
                : "text-muted-foreground"
            )}>
              {offering.stock_quantity} in stock
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function OfferingRow({ offering, brandColors, onEdit, onDelete }) {
  const config = TYPE_CONFIG[offering.type] || {}
  const Icon = config.icon || Package
  const statusConfig = STATUS_CONFIG[offering.status] || STATUS_CONFIG.draft
  
  return (
    <div 
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onEdit}
    >
      {/* Image/Icon */}
      <div 
        className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: brandColors.getTypeBgColor(offering.type) }}
      >
        {offering.featured_image ? (
          <img
            src={offering.featured_image}
            alt={offering.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon 
            className="h-7 w-7" 
            style={{ color: brandColors.getTypeColor(offering.type) }}
          />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{offering.name}</h3>
          <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
            {statusConfig.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {config.label?.slice(0, -1) || offering.type}
          {offering.category?.name && ` • ${offering.category.name}`}
        </p>
      </div>
      
      {/* Price */}
      <div className="text-right">
        <p className="font-semibold">
          {offering.price ? `$${offering.price.toFixed(2)}` : '—'}
        </p>
        {offering.type === 'product' && offering.stock_quantity !== null && (
          <p className={cn(
            "text-sm",
            offering.stock_quantity <= (offering.low_stock_threshold || 10)
              ? "text-amber-600"
              : "text-muted-foreground"
          )}>
            {offering.stock_quantity} in stock
          </p>
        )}
      </div>
      
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-red-600"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
// Eventbrite-style Event Card
function EventCard({ offering, brandColors, onEdit, onDelete }) {
  const statusConfig = STATUS_CONFIG[offering.status] || STATUS_CONFIG.draft
  
  // Debug log
  console.log('[EventCard]', offering.name, 'featured_image:', offering.featured_image)
  
  // Parse schedules if available (would need to come from API)
  // For now, use placeholder date display
  const nextDate = offering.next_schedule_date 
    ? new Date(offering.next_schedule_date)
    : null
  
  const getEventStatus = () => {
    if (offering.status !== 'active') return null
    if (!nextDate) return { label: 'No Dates', color: 'text-amber-600', bg: 'bg-amber-100' }
    if (isPast(nextDate)) return { label: 'Past', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (isToday(nextDate)) return { label: 'Today!', color: 'text-emerald-600', bg: 'bg-emerald-100' }
    return null
  }
  
  const eventStatus = getEventStatus()

  return (
    <Card 
      className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden border-0 shadow-md"
      onClick={onEdit}
    >
      {/* Image Section */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {offering.featured_image ? (
          <img
            src={offering.featured_image}
            alt={offering.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
            <CalendarDays className="h-16 w-16 text-orange-500/40" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className={cn("absolute top-3 right-3 border-0 shadow-sm", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
        
        {/* Event Status (Today!, Past, etc) */}
        {eventStatus && (
          <Badge className={cn("absolute top-3 left-3 border-0", eventStatus.bg, eventStatus.color)}>
            {eventStatus.label}
          </Badge>
        )}
        
        {/* Date Badge - Eventbrite style calendar */}
        {nextDate && (
          <div className="absolute bottom-3 left-3 bg-white rounded-lg overflow-hidden shadow-lg text-center w-14">
            <div className="bg-orange-500 text-white text-xs font-bold py-1 uppercase">
              {format(nextDate, 'MMM')}
            </div>
            <div className="py-1.5 text-xl font-bold text-gray-900">
              {format(nextDate, 'd')}
            </div>
          </div>
        )}
        
        {/* Price Badge */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
          <span className="font-bold text-gray-900">
            {offering.price ? `$${offering.price.toFixed(0)}` : 'Free'}
          </span>
        </div>
        
        {/* Actions */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {!eventStatus && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
          {offering.name}
        </h3>
        
        {offering.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {offering.short_description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Date/Time */}
          {nextDate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(nextDate, 'h:mm a')}</span>
            </div>
          )}
          
          {/* Capacity/Tickets */}
          {offering.capacity && (
            <div className="flex items-center gap-1">
              <Ticket className="h-3.5 w-3.5" />
              <span>{offering.capacity} spots</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}