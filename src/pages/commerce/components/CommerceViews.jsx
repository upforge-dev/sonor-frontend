// src/pages/commerce/components/CommerceViews.jsx
// Main view components for the Commerce module: Highlights, Products, Services, Events

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AreaChart, DonutChart } from '@tremor/react'
import {
  Package,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Zap,
  ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format, subDays } from 'date-fns'

import { StatsCard, ActivityItem } from './CommerceStats'
import { ProductCard, ProductSkeleton, ServiceCard, ServiceSkeleton, EventCard, EventSkeleton } from './CommerceCards'
import { EmptyState } from './CommerceEmptyState'

// Highlights View Component - Overview with charts and activity
export function HighlightsView({ stats, products, services = [], events = [], transactions = [], brandColors, isShopifyMode, hasPaymentProcessor }) {
  // Calculate real revenue data from transactions if available
  const revenueData = useMemo(() => {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      // Filter transactions for this date
      const dayTransactions = transactions.filter(t => {
        if (!t.created_at) return false
        return format(new Date(t.created_at), 'yyyy-MM-dd') === dateStr
      })
      const dayRevenue = dayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0)
      const dayOrders = dayTransactions.length
      
      data.push({
        date: format(date, 'MMM d'),
        Revenue: dayRevenue,
        Orders: dayOrders,
      })
    }
    return data
  }, [transactions])
  
  // Calculate sales by type from offerings data
  const salesByTypeData = useMemo(() => {
    const productRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0)
    const serviceRevenue = services.reduce((sum, s) => sum + (s.revenue || 0), 0)
    const eventRevenue = events.reduce((sum, e) => sum + (e.revenue || 0), 0)
    const totalRevenue = productRevenue + serviceRevenue + eventRevenue
    
    if (totalRevenue === 0) {
      // Show proportional placeholder based on counts
      const total = products.length + services.length + events.length
      if (total === 0) return []
      return [
        { name: 'Products', value: Math.round((products.length / total) * 100) || 0 },
        { name: 'Services', value: Math.round((services.length / total) * 100) || 0 },
        { name: 'Events', value: Math.round((events.length / total) * 100) || 0 },
      ].filter(d => d.value > 0)
    }
    
    return [
      { name: 'Products', value: Math.round((productRevenue / totalRevenue) * 100) },
      { name: 'Services', value: Math.round((serviceRevenue / totalRevenue) * 100) },
      { name: 'Events', value: Math.round((eventRevenue / totalRevenue) * 100) },
    ].filter(d => d.value > 0)
  }, [products, services, events])
  
  // Combine all offerings and sort by revenue/sales for "Top Offerings"
  const topOfferings = useMemo(() => {
    const allOfferings = [
      ...products.map(p => ({ ...p, offeringType: 'product' })),
      ...services.map(s => ({ ...s, offeringType: 'service' })),
      ...events.map(e => ({ ...e, offeringType: 'event' })),
    ]
    return allOfferings
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0) || (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, 5)
  }, [products, services, events])
  
  // Transform transactions to activity items
  const recentActivity = useMemo(() => {
    if (transactions.length > 0) {
      return transactions.slice(0, 5).map(t => ({
        type: t.type === 'booking' ? 'booking' : 'sale',
        title: t.offering_name || t.description || 'Sale',
        description: t.customer_email || t.customer_name || '',
        amount: t.amount || t.total,
        time: t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true }) : 'Recently'
      }))
    }
    // Return empty array for graceful empty state
    return []
  }, [transactions])
  
  // Calculate total counts and revenue
  const totalOfferings = products.length + services.length + events.length
  const totalRevenue = stats?.sales?.totalRevenue || 
    products.reduce((sum, p) => sum + (p.revenue || 0), 0) +
    services.reduce((sum, s) => sum + (s.revenue || 0), 0) +
    events.reduce((sum, e) => sum + (e.revenue || 0), 0)
  const totalSales = stats?.sales?.totalSales || 
    products.reduce((sum, p) => sum + (p.sales_count || 0), 0) +
    services.reduce((sum, s) => sum + (s.sales_count || 0), 0) +
    events.reduce((sum, e) => sum + (e.sales_count || 0), 0)
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0
  
  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Revenue"
          value={`$${Number(totalRevenue).toLocaleString()}`}
          icon={DollarSign}
          subtitle={totalSales > 0 ? `From ${totalSales} sales` : 'No sales yet'}
          brandColors={brandColors}
        />
        <StatsCard
          title="Total Offerings"
          value={totalOfferings}
          icon={Package}
          subtitle={`${products.length} products, ${services.length} services, ${events.length} events`}
          brandColors={brandColors}
        />
        <StatsCard
          title="Avg. Order Value"
          value={avgOrderValue > 0 ? `$${avgOrderValue.toFixed(2)}` : '--'}
          icon={TrendingUp}
          subtitle={totalSales > 0 ? 'Per transaction' : 'No data yet'}
          brandColors={brandColors}
        />
        <StatsCard
          title="Active Items"
          value={[...products, ...services, ...events].filter(o => o.status === 'active').length}
          icon={Zap}
          subtitle="Ready for sale"
          brandColors={brandColors}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Revenue Trend</h3>
              <p className="text-xs text-[var(--text-tertiary)]">Last 30 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]" />
                <span className="text-[var(--text-secondary)]">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]" />
                <span className="text-[var(--text-secondary)]">Orders</span>
              </div>
            </div>
          </div>
          <AreaChart
            className="h-52"
            data={revenueData}
            index="date"
            categories={['Revenue', 'Orders']}
            colors={['emerald', 'cyan']}
            showLegend={false}
            showGridLines={true}
            curveType="monotone"
            showAnimation={true}
            valueFormatter={(v) => typeof v === 'number' && v > 50 ? `$${v.toLocaleString()}` : v.toString()}
          />
        </div>

        {/* Sales by Type Donut */}
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Offerings by Type</h3>
            <p className="text-xs text-[var(--text-tertiary)]">Distribution breakdown</p>
          </div>
          {salesByTypeData.length > 0 ? (
            <>
              <DonutChart
                className="h-44"
                data={salesByTypeData}
                category="value"
                index="name"
                colors={['emerald', 'cyan', 'violet']}
                showAnimation={true}
                showLabel={true}
                valueFormatter={(v) => `${v}%`}
              />
              <div className="flex justify-center gap-4 mt-4 text-xs">
                {salesByTypeData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      i === 0 ? "bg-emerald-500" : i === 1 ? "bg-cyan-500" : "bg-violet-500"
                    )} />
                    <span className="text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center">
              <Package className="h-8 w-8 text-[var(--text-tertiary)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">No offerings yet</p>
              <p className="text-xs text-[var(--text-tertiary)]">Add items to see breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity + Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Recent Activity</h3>
              <p className="text-xs text-[var(--text-tertiary)]">Latest sales and bookings</p>
            </div>
            <Link to="/commerce?view=sales">
              <Button variant="ghost" size="sm" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-[var(--glass-border)]">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <ActivityItem key={i} activity={activity} />
              ))
            ) : (
              <div className="py-8 text-center">
                <ShoppingBag className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">No recent activity</p>
                <p className="text-xs text-[var(--text-tertiary)]">Sales and bookings will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Offerings */}
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Top Offerings</h3>
              <p className="text-xs text-[var(--text-tertiary)]">Best performing items</p>
            </div>
            <Link to="/commerce?view=products">
              <Button variant="ghost" size="sm" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                View All
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {topOfferings.length > 0 ? (
              topOfferings.map((offering, i) => (
                <div key={offering.id} className="flex items-center gap-3 py-2 border-b border-[var(--glass-border)] last:border-0">
                  <div className="h-8 w-8 rounded-lg bg-[var(--glass-bg-inset)] flex items-center justify-center text-sm font-medium text-[var(--text-tertiary)]">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {offering.title || offering.name}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      <span className="capitalize">{offering.offeringType}</span> • ${Number(offering.price || 0).toFixed(2)} • {offering.sales_count || 0} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--brand-primary)]">
                      ${Number(offering.revenue || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <Package className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-secondary)]">No offerings yet</p>
                <p className="text-xs text-[var(--text-tertiary)]">Add products, services, or events to see top performers</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Products View Component - Product grid with filters
export function ProductsView({ products, isLoading, error, currentFilter, statusCounts, brandColors, isShopifyMode, hasPaymentProcessor, viewMode, loadProducts, onStartCreating, onOpenOffering, onSyncShopify }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--accent-red)]">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadProducts} 
          className="mt-4 border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
        >
          Try Again
        </Button>
      </div>
    )
  }
  
  if (products.length === 0) {
    return (
      <EmptyState 
        filter={currentFilter} 
        brandColors={brandColors}
        isShopifyMode={isShopifyMode}
        hasPaymentProcessor={hasPaymentProcessor}
        onStartCreating={onStartCreating}
        onSyncShopify={onSyncShopify}
      />
    )
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          brandColors={brandColors}
          onOpen={onOpenOffering}
        />
      ))}
    </div>
  )
}

// Services View Component - Supports grid and list layouts
export function ServicesView({ services, isLoading, error, currentFilter, serviceCounts, brandColors, hasPaymentProcessor, loadServices, viewMode = 'list', onOpenSignalDialog, onStartCreating, onOpenOffering }) {
  if (isLoading) {
    return viewMode === 'grid' ? (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <ServiceSkeleton key={i} viewMode="grid" />
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <ServiceSkeleton key={i} viewMode="list" />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--accent-red)]">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadServices} 
          className="mt-4 border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
        >
          Try Again
        </Button>
      </div>
    )
  }
  
  if (services.length === 0) {
    return (
      <EmptyState 
        filter={currentFilter}
        type="service"
        brandColors={brandColors}
        hasPaymentProcessor={hasPaymentProcessor}
        onOpenSignalDialog={onOpenSignalDialog}
        onStartCreating={onStartCreating}
      />
    )
  }
  
  return viewMode === 'grid' ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {services.map((service) => (
        <ServiceCard 
          key={service.id} 
          service={service} 
          brandColors={brandColors}
          viewMode="grid"
          onOpen={onOpenOffering}
        />
      ))}
    </div>
  ) : (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceCard 
          key={service.id} 
          service={service} 
          brandColors={brandColors}
          viewMode="list"
          onOpen={onOpenOffering}
        />
      ))}
    </div>
  )
}

// Events View Component - Supports grid and list layouts
export function EventsView({ events, isLoading, error, currentFilter, eventCounts, brandColors, hasPaymentProcessor, loadEvents, viewMode = 'list', onStartCreating, onOpenOffering, onDuplicate }) {
  if (isLoading) {
    return viewMode === 'grid' ? (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <EventSkeleton key={i} viewMode="grid" />
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <EventSkeleton key={i} viewMode="list" />
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--accent-red)]">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadEvents} 
          className="mt-4 border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
        >
          Try Again
        </Button>
      </div>
    )
  }
  
  if (events.length === 0) {
    return (
      <EmptyState 
        filter={currentFilter}
        type="event"
        brandColors={brandColors}
        hasPaymentProcessor={hasPaymentProcessor}
        onStartCreating={onStartCreating}
      />
    )
  }
  
  return viewMode === 'grid' ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {events.map((event) => (
        <EventCard 
          key={event.id} 
          event={event}
          brandColors={brandColors}
          viewMode="grid"
          onOpen={onOpenOffering}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  ) : (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard 
          key={event.id} 
          event={event}
          brandColors={brandColors}
          viewMode="list"
          onOpen={onOpenOffering}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  )
}
