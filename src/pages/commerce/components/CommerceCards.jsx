// src/pages/commerce/components/CommerceCards.jsx
// Card components for products, services, and events in the Commerce module

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Package,
  AlertTriangle,
  ChevronRight,
  Store,
  Zap,
  Calendar,
  Clock,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { STATUS_CONFIG, PRICE_TYPE_CONFIG } from './CommerceConstants'

// Product Card Component - Liquid Glass style
export function ProductCard({ product, brandColors, onOpen }) {
  const hasImage = product.images?.length > 0 || product.image_url || product.featured_image
  const imageUrl = product.images?.[0]?.url || product.image_url || product.featured_image
  // Aggregate variant inventory for clothing, otherwise use top-level
  const totalStock = (product.is_clothing || product.variants?.length > 0)
    ? (product.variants?.reduce((sum, v) => sum + (v.inventory_count ?? 0), 0) ?? 0)
    : (product.inventory_quantity ?? product.inventory_count ?? 0)
  const hasTracking = product.track_inventory || (product.is_clothing && product.variants?.length > 0)
  const lowStock = hasTracking && totalStock <= 5 && totalStock > 0
  const outOfStock = hasTracking && totalStock === 0
  const isFromShopify = product._source === 'shopify_fallback' || product.shopify_product_id

  return (
    <div
      className="group h-full rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm"
      onClick={() => onOpen?.(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen?.(product.id)
      }}
    >
        {/* Image */}
        <div className="aspect-[4/3] relative bg-[var(--glass-bg-inset)] overflow-hidden">
          {hasImage ? (
            <img
              src={imageUrl}
              alt={product.title || product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--glass-bg)] to-[var(--glass-bg-inset)]">
              <Package className="h-12 w-12 text-[var(--text-tertiary)]" />
            </div>
          )}
          {/* Status badge overlay */}
          {product.status !== 'active' && (
            <div className="absolute top-2 left-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs backdrop-blur-md", STATUS_CONFIG[product.status]?.className)}
              >
                {STATUS_CONFIG[product.status]?.label}
              </Badge>
            </div>
          )}
          {/* Shopify sync badge */}
          {isFromShopify && product.status === 'active' && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-[#96bf48]/90 text-white border-none text-xs backdrop-blur-md">
                <Store className="h-3 w-3 mr-1" />
                Shopify
              </Badge>
            </div>
          )}
          {/* Low stock warning overlay */}
          {lowStock && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-amber-500/90 text-white border-none text-xs backdrop-blur-md">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low Stock
              </Badge>
            </div>
          )}
          {outOfStock && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-red-500/90 text-white border-none text-xs backdrop-blur-md">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
            {product.title || product.name}
          </h3>
          <p className="text-lg font-semibold mt-1 text-[var(--brand-primary)]">
            ${Number(product.price || 0).toFixed(2)}
          </p>
          {hasTracking && (
            <p className={cn(
              "text-sm mt-1",
              outOfStock ? "text-[var(--accent-red)]" : lowStock ? "text-[var(--accent-orange)]" : "text-[var(--text-secondary)]"
            )}>
              {outOfStock ? 'Out of stock' : `${totalStock} in stock`}
            </p>
          )}
        </div>
      </div>
  )
}

// Loading skeleton - Glass style
export function ProductSkeleton() {
  return (
    <div className="h-full rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

// Service Card Component - Supports both grid and list modes with images
export function ServiceCard({ service, brandColors, viewMode = 'list', onOpen }) {
  const priceDisplay = () => {
    if (service.price_type === 'quote') return 'Contact for quote'
    if (service.price_type === 'free') return 'Free'
    if (service.price_type === 'hourly') return `$${Number(service.price || 0).toFixed(2)}/hr`
    return `$${Number(service.price || 0).toFixed(2)}`
  }
  
  const salesCount = service.sales_count || 0
  const revenue = service.total_revenue || (service.price * salesCount) || 0
  const hasImage = service.images?.length > 0 || service.image_url
  const imageUrl = service.images?.[0]?.url || service.image_url
  const imageCount = service.images?.length || (service.image_url ? 1 : 0)

  // Grid mode layout
  if (viewMode === 'grid') {
    return (
      <div
        className="group h-full rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm"
        onClick={() => onOpen?.(service.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpen?.(service.id)
        }}
      >
          {/* Image */}
          <div className="aspect-[4/3] relative bg-[var(--glass-bg-inset)] overflow-hidden">
            {hasImage ? (
              <img
                src={imageUrl}
                alt={service.name || service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10">
                <Zap className="h-12 w-12 text-[var(--brand-primary)]/50" />
              </div>
            )}
            {/* Image count badge */}
            {imageCount > 1 && (
              <div className="absolute bottom-2 right-2">
                <Badge className="bg-black/60 text-white border-none text-xs backdrop-blur-md">
                  +{imageCount - 1} photos
                </Badge>
              </div>
            )}
            {/* Status badge overlay */}
            {service.status !== 'active' && (
              <div className="absolute top-2 left-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs backdrop-blur-md", STATUS_CONFIG[service.status]?.className)}
                >
                  {STATUS_CONFIG[service.status]?.label}
                </Badge>
              </div>
            )}
            {/* Price type badge */}
            {service.price_type && service.price_type !== 'fixed' && service.status === 'active' && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-[var(--brand-primary)]/90 text-white border-none text-xs backdrop-blur-md">
                  {PRICE_TYPE_CONFIG[service.price_type]?.label}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {service.name || service.title}
            </h3>
            <p className="text-lg font-semibold mt-1 text-[var(--brand-primary)]">
              {priceDisplay()}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {salesCount} sold{revenue > 0 && ` • $${revenue.toLocaleString()}`}
            </p>
          </div>
        </div>
    )
  }

  // List mode layout (default)
  return (
    <div
      className="group rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer backdrop-blur-sm p-4"
      onClick={() => onOpen?.(service.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen?.(service.id)
      }}
    >
        <div className="flex items-start gap-4">
          {/* Image or Icon */}
          {hasImage ? (
            <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 relative">
              <img
                src={imageUrl}
                alt={service.name || service.title}
                className="w-full h-full object-cover"
              />
              {imageCount > 1 && (
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
                  +{imageCount - 1}
                </div>
              )}
            </div>
          ) : (
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6 text-[var(--brand-primary)]" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                  {service.name || service.title}
                </h3>
                {service.short_description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                    {service.short_description}
                  </p>
                )}
              </div>
              
              {/* Status badge */}
              {service.status !== 'active' && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs flex-shrink-0", STATUS_CONFIG[service.status]?.className)}
                >
                  {STATUS_CONFIG[service.status]?.label}
                </Badge>
              )}
            </div>
            
            {/* Metrics row */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[var(--brand-primary)]">{priceDisplay()}</span>
                {service.price_type && service.price_type !== 'fixed' && (
                  <Badge variant="outline" className="text-xs bg-[var(--glass-bg-inset)] border-[var(--glass-border)]">
                    {PRICE_TYPE_CONFIG[service.price_type]?.label}
                  </Badge>
                )}
              </div>
              <div className="h-4 w-px bg-[var(--glass-border)]" />
              <span className="text-[var(--text-secondary)]">{salesCount} sold</span>
              {revenue > 0 && (
                <>
                  <div className="h-4 w-px bg-[var(--glass-border)]" />
                  <span className="text-[var(--text-secondary)]">${revenue.toLocaleString()} revenue</span>
                </>
              )}
            </div>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
        </div>
      </div>
  )
}

// Service skeleton - supports grid and list modes
export function ServiceSkeleton({ viewMode = 'list' }) {
  if (viewMode === 'grid') {
    return (
      <div className="h-full rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  )
}

// Event Card Component - Supports both grid and list modes with images
export function EventCard({ event, brandColors, viewMode = 'list', onOpen, onDuplicate }) {
  const isFree = event.price_type === 'free' || !event.price || event.price === 0
  const priceDisplay = isFree ? 'Free' : `$${Number(event.price || 0).toFixed(2)}`

  const ticketsSold = event.sales_count || 0
  const capacity = event.capacity ?? event.schedules?.[0]?.capacity ?? null
  const spotsRemaining = capacity != null ? (event.schedules?.[0]?.spots_remaining ?? capacity - ticketsSold) : null

  // Multi-date aware: compute upcoming schedules, date range, and pick the soonest upcoming.
  const now = new Date()
  const allSchedules = (event.schedules || [])
    .filter(s => s?.starts_at)
    .map(s => ({ ...s, _date: new Date(s.starts_at) }))
    .sort((a, b) => a._date - b._date)
  const upcomingSchedules = allSchedules.filter(s => s._date >= now)
  const scheduleCount = upcomingSchedules.length
  const isMultiDate = scheduleCount > 1

  // Event date: prefer next upcoming, then next_schedule, then first schedule, then top-level.
  const primarySchedule = upcomingSchedules[0] || (event.next_schedule
    ? { _date: new Date(event.next_schedule.starts_at), ...event.next_schedule }
    : allSchedules[0])
  const startsAt = primarySchedule?.starts_at ?? event.starts_at
  const eventDate = startsAt ? new Date(startsAt) : null
  const isPast = eventDate && eventDate < now && scheduleCount === 0
  const lastUpcoming = upcomingSchedules[upcomingSchedules.length - 1]
  
  const hasImage = event.featured_image || event.images?.length > 0 || event.image_url
  const imageUrl = event.featured_image || event.images?.[0]?.url || event.image_url
  const imageCount = event.images?.length || (event.image_url ? 1 : 0)

  // Grid mode layout
  if (viewMode === 'grid') {
    return (
      <div
        className="group h-full rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-sm"
        onClick={() => onOpen?.(event.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpen?.(event.id)
        }}
      >
          {/* Image */}
          <div className="aspect-[4/3] relative bg-[var(--glass-bg-inset)] overflow-hidden">
            {hasImage ? (
              <img
                src={imageUrl}
                alt={event.name || event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10">
                <Calendar className="h-12 w-12 text-[var(--brand-primary)]/50" />
              </div>
            )}
            {/* Date badge overlay */}
            {eventDate && (
              <div className="absolute top-2 left-2">
                <div className={cn(
                  "flex flex-col items-center px-2 py-1 rounded-lg backdrop-blur-md",
                  isPast ? "bg-[var(--glass-bg-inset)]/90" : "bg-[var(--brand-primary)]/90"
                )}>
                  <span className={cn(
                    "text-[10px] font-medium uppercase leading-none",
                    isPast ? "text-[var(--text-tertiary)]" : "text-white/80"
                  )}>
                    {format(eventDate, 'MMM')}
                  </span>
                  <span className={cn(
                    "text-lg font-bold leading-none",
                    isPast ? "text-[var(--text-tertiary)]" : "text-white"
                  )}>
                    {format(eventDate, 'd')}
                  </span>
                </div>
              </div>
            )}
            {/* Image count badge */}
            {imageCount > 1 && (
              <div className="absolute bottom-2 right-2">
                <Badge className="bg-black/60 text-white border-none text-xs backdrop-blur-md">
                  +{imageCount - 1} photos
                </Badge>
              </div>
            )}
            {/* Status badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {isMultiDate && (
                <Badge className="bg-[var(--brand-primary)]/90 text-white border-none text-xs backdrop-blur-md font-semibold">
                  {scheduleCount} dates
                </Badge>
              )}
              {isPast && (
                <Badge className="bg-[var(--glass-bg-inset)]/90 text-[var(--text-tertiary)] border-none text-xs backdrop-blur-md">
                  Past
                </Badge>
              )}
              {event.status === 'draft' && (
                <Badge className={cn("text-xs backdrop-blur-md", STATUS_CONFIG.draft?.className)}>
                  Draft
                </Badge>
              )}
              {capacity && spotsRemaining <= 0 && (
                <Badge className="bg-red-500/90 text-white border-none text-xs backdrop-blur-md">
                  Sold Out
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {event.name || event.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-lg font-semibold",
                isFree ? "text-[var(--accent-green)]" : "text-[var(--brand-primary)]"
              )}>
                {priceDisplay}
              </span>
              {capacity && (
                <span className="text-sm text-[var(--text-secondary)]">
                  • {spotsRemaining > 0 ? `${spotsRemaining} left` : 'Sold out'}
                </span>
              )}
            </div>
            {eventDate && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {isMultiDate && lastUpcoming ? (
                  <>
                    {format(eventDate, 'MMM d')} – {format(lastUpcoming._date, 'MMM d, yyyy')}
                  </>
                ) : (
                  <>{format(eventDate, 'MMM d, yyyy')} at {format(eventDate, 'h:mm a')}</>
                )}
                {event.location && <span> • {event.location}</span>}
              </p>
            )}
            {isPast && onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(event) }}
                className="mt-2 flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors"
                title="Duplicate as Draft"
              >
                <Copy className="h-3 w-3" />
                Duplicate as Draft
              </button>
            )}
          </div>
        </div>
    )
  }

  // List mode layout (default)
  return (
    <div
      className="group rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-strong)] hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer backdrop-blur-sm overflow-hidden"
      onClick={() => onOpen?.(event.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen?.(event.id)
      }}
    >
        <div className="flex">
          {/* Image or Date badge */}
          {hasImage ? (
            <div className="w-24 h-24 flex-shrink-0 relative overflow-hidden">
              <img
                src={imageUrl}
                alt={event.name || event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Date overlay on image */}
              {eventDate && (
                <div className="absolute bottom-1 left-1">
                  <div className={cn(
                    "flex flex-col items-center px-1.5 py-0.5 rounded backdrop-blur-md",
                    isPast ? "bg-black/60" : "bg-[var(--brand-primary)]/90"
                  )}>
                    <span className="text-[8px] font-medium uppercase leading-none text-white/80">
                      {format(eventDate, 'MMM')}
                    </span>
                    <span className="text-sm font-bold leading-none text-white">
                      {format(eventDate, 'd')}
                    </span>
                  </div>
                </div>
              )}
              {imageCount > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                  +{imageCount - 1}
                </div>
              )}
            </div>
          ) : (
            <div className={cn(
              "w-20 flex-shrink-0 flex flex-col items-center justify-center py-4 border-r border-[var(--glass-border)]",
              isPast ? "bg-[var(--glass-bg-inset)]" : "bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10"
            )}>
              {eventDate ? (
                <>
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    isPast ? "text-[var(--text-tertiary)]" : "text-[var(--brand-primary)]"
                  )}>
                    {format(eventDate, 'MMM')}
                  </span>
                  <span className={cn(
                    "text-2xl font-bold",
                    isPast ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                  )}>
                    {format(eventDate, 'd')}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {format(eventDate, 'EEE')}
                  </span>
                </>
              ) : (
                <Calendar className="h-6 w-6 text-[var(--text-tertiary)]" />
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                  {event.name || event.title}
                </h3>
                {event.short_description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                    {event.short_description}
                  </p>
                )}
                
                {/* Time and location */}
                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
                  {eventDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {isMultiDate && lastUpcoming ? (
                        <>{format(eventDate, 'MMM d')} – {format(lastUpcoming._date, 'MMM d, yyyy')}</>
                      ) : (
                        <>{format(eventDate, 'MMM d')} at {format(eventDate, 'h:mm a')}</>
                      )}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      {event.is_virtual ? '🖥️' : '📍'} {event.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-col items-end gap-1">
                {isMultiDate && (
                  <Badge className="text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 font-semibold">
                    {scheduleCount} dates
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="text-xs bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-tertiary)]">
                    Past
                  </Badge>
                )}
                {event.status === 'draft' && (
                  <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG.draft?.className)}>
                    Draft
                  </Badge>
                )}
                {capacity && spotsRemaining <= 0 && (
                  <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG.sold_out?.className)}>
                    Sold Out
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Metrics row */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className={cn(
                "font-semibold",
                isFree ? "text-[var(--accent-green)]" : "text-[var(--brand-primary)]"
              )}>
                {priceDisplay}
              </span>
              <div className="h-4 w-px bg-[var(--glass-border)]" />
              {capacity ? (
                <span className="text-[var(--text-secondary)]">
                  {ticketsSold}/{capacity} spots filled
                </span>
              ) : (
                <span className="text-[var(--text-secondary)]">
                  {ticketsSold} registered
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 px-3">
            {isPast && onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(event) }}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
                title="Duplicate as Draft"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors" />
          </div>
        </div>
      </div>
  )
}

// Event skeleton - supports grid and list modes
export function EventSkeleton({ viewMode = 'list' }) {
  if (viewMode === 'grid') {
    return (
      <div className="h-full rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
      <div className="flex">
        <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center py-4 border-r border-[var(--glass-border)] bg-[var(--glass-bg-inset)]">
          <Skeleton className="h-3 w-8 mb-1" />
          <Skeleton className="h-7 w-6 mb-1" />
          <Skeleton className="h-3 w-6" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  )
}
