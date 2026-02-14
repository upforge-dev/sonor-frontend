/**
 * ProjectDashboard - World-class dashboard for project-level views
 * 
 * Features:
 * - Real data from all enabled modules
 * - Modular widgets based on enabled features
 * - Beautiful Recharts visualizations with brand colors
 * - Responsive grid layout
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { 
  Building2,
  Globe,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Users,
  Package,
  DollarSign,
  Search,
  BarChart3,
  ShoppingCart,
  Mail,
  Calendar,
  Clock,
  ArrowUpRight,
  Activity,
  Zap,
  MessageSquare,
  FileText,
  Send,
  RefreshCw,
  ChevronRight,
  Star,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useSiteAnalyticsOverview, useSiteTopPages, usePageViewsByDay } from '@/lib/hooks'
import { useCommerceDashboard, useCommerceOfferings, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { seoApi, syncApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'
import { format, subDays, formatDistanceToNow } from 'date-fns'
import { EmptyState } from '@/components/EmptyState'

// ==================== Widget Components ====================

// Stats Card - Reusable metric display
function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary', isLoading }) {
  const brandColors = useBrandColors()
  
  if (isLoading) {
    return (
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const colorClasses = {
    primary: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
    secondary: 'bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)]',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    orange: 'bg-orange-500/10 text-orange-500',
    pink: 'bg-pink-500/10 text-pink-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  }
  
  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-1 mt-1">
                {trend && (
                  <>
                    {trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : trend === 'down' ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : null}
                    {trendValue && (
                      <span className={cn(
                        "text-xs font-medium",
                        trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-red-500" : "text-[var(--text-tertiary)]"
                      )}>
                        {trendValue}
                      </span>
                    )}
                  </>
                )}
                {subtitle && (
                  <span className="text-xs text-[var(--text-tertiary)]">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Activity Item - For recent activity lists
function ActivityItem({ activity, brandColors }) {
  const isPositive = activity.type === 'sale' || activity.type === 'conversion' || activity.type === 'lead'
  
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--glass-border)] last:border-0">
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center",
        isPositive ? "bg-emerald-500/10" : "bg-[var(--glass-bg-inset)]"
      )}>
        {activity.icon || (
          activity.type === 'sale' ? <DollarSign className="h-4 w-4 text-emerald-500" /> :
          activity.type === 'lead' ? <Users className="h-4 w-4 text-blue-500" /> :
          activity.type === 'visit' ? <Eye className="h-4 w-4 text-[var(--text-tertiary)]" /> :
          <Activity className="h-4 w-4 text-[var(--text-tertiary)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {activity.title}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {activity.description}
        </p>
      </div>
      <div className="text-right">
        {activity.amount && (
          <p className="text-sm font-medium text-emerald-500">
            +${activity.amount.toFixed(2)}
          </p>
        )}
        <p className="text-xs text-[var(--text-tertiary)]">
          {activity.time}
        </p>
      </div>
    </div>
  )
}

// Traffic Chart Widget
function TrafficChartWidget({ data, isLoading, brandColors }) {
  if (isLoading) {
    return (
      <Card className="lg:col-span-2 bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Traffic Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="lg:col-span-2 bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[var(--brand-primary)]" />
              Traffic Overview
            </CardTitle>
            <CardDescription>Page views and visitors over the last 30 days</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandColors.primary }} />
              <span className="text-[var(--text-secondary)]">Page Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandColors.secondary }} />
              <span className="text-[var(--text-secondary)]">Visitors</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brandColors.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brandColors.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brandColors.secondary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brandColors.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={{ stroke: 'var(--glass-border)' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)'
              }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="pageViews"
              name="Page Views"
              stroke={brandColors.primary}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPageViews)"
            />
            <Area
              type="monotone"
              dataKey="visitors"
              name="Visitors"
              stroke={brandColors.secondary}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVisitors)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// SEO Health Widget
function SEOHealthWidget({ seoData, isLoading, brandColors, onNavigate }) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  // Extract numeric health score from object or use directly
  const healthScoreValue = typeof seoData?.healthScore === 'object' 
    ? (seoData?.healthScore?.overallScore || 0)
    : (seoData?.healthScore || 0)
  const healthScore = typeof healthScoreValue === 'number' ? healthScoreValue : 0
  const healthColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'
  
  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-500" />
            SEO Health
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('seo')} className="text-xs">
            View Details <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Health Score Circle */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="var(--glass-border)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={healthColor}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${healthScore * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{healthScore}</span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Indexed Pages</span>
              <span className="font-medium text-[var(--text-primary)]">{seoData?.indexing?.indexed || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Opportunities</span>
              <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                {seoData?.opportunities?.total || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">GSC Connected</span>
              {seoData?.gscConnected ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        </div>
        
        {/* Top Queries */}
        {seoData?.topQueries?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Top Search Queries</p>
            <div className="space-y-1">
              {seoData.topQueries.slice(0, 3).map((query, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-primary)] truncate max-w-[60%]">{query.query}</span>
                  <span className="text-[var(--text-tertiary)]">{query.clicks} clicks</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Commerce Widget
function CommerceWidget({ commerceData, isLoading, brandColors, onNavigate }) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sales Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  const revenue = commerceData?.stats?.totalRevenue || 0
  const orders = commerceData?.stats?.totalOrders || 0
  const products = commerceData?.stats?.totalOfferings || 0
  
  // Mini revenue chart data
  const revenueData = useMemo(() => {
    if (!commerceData?.recentSales) return []
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const daySales = commerceData.recentSales.filter(s => 
        s.created_at && format(new Date(s.created_at), 'yyyy-MM-dd') === dateStr
      )
      data.push({
        date: format(date, 'EEE'),
        revenue: daySales.reduce((sum, s) => sum + (s.amount || 0), 0)
      })
    }
    return data
  }, [commerceData?.recentSales])
  
  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-500" />
            Commerce
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('commerce')} className="text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">${revenue.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{orders}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{products}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Products</p>
          </div>
        </div>
        
        {/* Mini Revenue Chart */}
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={revenueData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar 
              dataKey="revenue" 
              fill={brandColors.primary}
              radius={[4, 4, 0, 0]}
            />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Recent Activity Widget
function RecentActivityWidget({ activities, isLoading, brandColors, title = "Recent Activity" }) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--brand-primary)]" />
          {title}
        </CardTitle>
        <CardDescription>Latest updates from your modules</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="divide-y divide-[var(--glass-border)]">
            {activities.slice(0, 5).map((activity, i) => (
              <ActivityItem key={i} activity={activity} brandColors={brandColors} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Module Quick Access Card
function ModuleCard({ module, onNavigate }) {
  const Icon = module.icon
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        "bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]",
        "group"
      )}
      onClick={() => onNavigate?.(module.key)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            module.bgColor
          )}>
            <Icon className={cn("w-5 h-5", module.textColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
              {module.label}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] truncate">
              {module.description}
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

// Top Pages Widget
function TopPagesWidget({ pages, isLoading, brandColors, onNavigate }) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Top Pages
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('analytics')} className="text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pages.length > 0 ? (
          <div className="space-y-2">
            {pages.slice(0, 5).map((page, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-medium text-[var(--text-tertiary)] w-4">{i + 1}</span>
                  <span className="text-sm text-[var(--text-primary)] truncate">{page.path || page.page}</span>
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)] shrink-0">
                  {(page.views || page.pageViews || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState.Card
            icon={FileText}
            title="No page data yet"
            description="Page views will appear here once data is available."
          />
        )}
      </CardContent>
    </Card>
  )
}

// Sync/Upcoming Bookings Widget
function SyncWidget({ bookings, isLoading, brandColors, onNavigate }) {
  if (isLoading) {
    return (
      <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-500" />
            Upcoming
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('sync')} className="text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <CardDescription>Scheduled bookings & tasks</CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((booking, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--glass-border)] last:border-0">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-medium text-cyan-500 uppercase">
                    {booking.start_time ? format(new Date(booking.start_time), 'MMM') : '--'}
                  </span>
                  <span className="text-sm font-bold text-cyan-600">
                    {booking.start_time ? format(new Date(booking.start_time), 'd') : '--'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {booking.booking_type?.name || booking.type_name || 'Booking'}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">
                    {booking.attendee_name || booking.attendee_email || 'Guest'}
                    {booking.start_time && ` • ${format(new Date(booking.start_time), 'h:mm a')}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No upcoming bookings</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== Main Dashboard Component ====================

// Module configurations
const MODULE_CONFIG = {
  analytics: {
    key: 'analytics',
    feature: 'analytics',
    label: 'Analytics',
    description: 'Traffic & performance',
    icon: BarChart3,
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-500'
  },
  seo: {
    key: 'seo',
    feature: 'seo',
    label: 'SEO',
    description: 'Search rankings',
    icon: Search,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500'
  },
  commerce: {
    key: 'commerce',
    feature: 'commerce',
    label: 'Commerce',
    description: 'Products & sales',
    icon: ShoppingCart,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500'
  },
  engage: {
    key: 'engage',
    feature: 'engage',
    label: 'Engage',
    description: 'Popups & chat',
    icon: MessageSquare,
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-500'
  },
  outreach: {
    key: 'outreach',
    feature: 'email',
    label: 'Outreach',
    description: 'Email campaigns',
    icon: Mail,
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500'
  },
  sync: {
    key: 'sync',
    feature: 'sync',
    label: 'Sync',
    description: 'Calendar & booking',
    icon: Calendar,
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-500'
  },
  forms: {
    key: 'forms',
    feature: 'forms',
    label: 'Forms',
    description: 'Form submissions',
    icon: FileText,
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-500'
  },
  affiliates: {
    key: 'affiliates',
    feature: 'affiliates',
    label: 'Affiliates',
    description: 'Affiliate tracking',
    icon: Users,
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-500'
  },
  crm: {
    key: 'crm',
    feature: 'crm',
    label: 'CRM',
    description: 'Leads & pipeline',
    icon: Users,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500'
  }
}

export default function ProjectDashboard({ onNavigate }) {
  const { currentOrg, currentProject } = useAuthStore()
  const brandColors = useBrandColors()
  
  // Data states (non-analytics data)
  const [isLoading, setIsLoading] = useState(true)
  const [seoData, setSeoData] = useState(null)
  const [commerceData, setCommerceData] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [upcomingBookings, setUpcomingBookings] = useState([])
  
  const projectId = currentProject?.id
  const projectName = currentProject?.name || currentOrg?.name || 'Your Project'
  const projectDomain = currentProject?.domain || currentOrg?.domain
  
  // Get enabled features - memoized
  const enabledFeatures = useMemo(() => {
    const rawFeatures = currentProject?.features || currentProject?.enabled_modules || []
    return Array.isArray(rawFeatures) 
      ? rawFeatures 
      : Object.entries(rawFeatures).filter(([_, v]) => v).map(([k]) => k)
  }, [currentProject?.features, currentProject?.enabled_modules])
  
  // Filter to enabled modules - memoized
  const enabledModules = useMemo(() => 
    Object.values(MODULE_CONFIG).filter(m => 
      enabledFeatures.includes(m.feature) || enabledFeatures.includes(m.key)
    ),
    [enabledFeatures]
  )
  
  // Helper function - not in dependencies
  const checkModule = (key) => 
    enabledFeatures.includes(key) || enabledFeatures.includes(MODULE_CONFIG[key]?.feature)
  
  // Track if we've fetched to prevent double-fetch
  const lastFetchedProjectId = useRef(null)
  
  // Use React Query hooks for analytics data (replaces useSiteAnalyticsStore)
  const hasAnalytics = enabledFeatures.includes('analytics')
  const { 
    data: analyticsOverview, 
    isLoading: analyticsLoading 
  } = useSiteAnalyticsOverview(projectId, 30, { enabled: !!projectId && hasAnalytics })
  const { data: pageViewsByDay } = usePageViewsByDay(projectId, 30, { enabled: !!projectId && hasAnalytics })
  const { data: storeTopPages } = useSiteTopPages(projectId, 30, 20, { enabled: !!projectId && hasAnalytics })
  
  // Fetch all dashboard data (non-analytics) - React Query handles analytics
  useEffect(() => {
    if (!projectId) return
    // Only fetch if we haven't fetched for this project yet
    if (lastFetchedProjectId.current === projectId) return
    lastFetchedProjectId.current = projectId
    
    const fetchData = async () => {
      setIsLoading(true)
      
      // Check modules at fetch time using current enabledFeatures
      const hasSeo = enabledFeatures.includes('seo')
      const hasCommerce = enabledFeatures.includes('commerce') || enabledFeatures.includes('ecommerce')
      // Note: Sync is UNIVERSAL - not gated by feature flag
      
      try {
        // Analytics is now handled by React Query hooks above
        
        // Fetch SEO data
        if (hasSeo) {
          try {
            const seoRes = await seoApi.getProjectForOrg(projectId)
            console.log('[ProjectDashboard] SEO response:', seoRes)
            setSeoData(seoRes.data || seoRes)
          } catch (err) {
            console.warn('[ProjectDashboard] SEO error:', err)
          }
        }
        
        // Fetch commerce data
        if (hasCommerce) {
          try {
            const commerceRes = await getCommerceDashboard(projectId)
            setCommerceData(commerceRes)
          } catch (err) {
            console.warn('[ProjectDashboard] Commerce error:', err)
          }
        }
        
        // Fetch upcoming bookings from Sync - scoped to current project
        try {
          const today = new Date().toISOString().split('T')[0]
          const bookingParams = { 
            status: 'confirmed',
            startDate: today,
            limit: 5
          }
          if (currentProject?.id) bookingParams.project_id = currentProject.id
          const bookingsRes = await syncApi.getBookings(bookingParams)
          const bookings = bookingsRes.data?.bookings || bookingsRes.data || bookingsRes || []
          setUpcomingBookings(Array.isArray(bookings) ? bookings : [])
        } catch (err) {
          console.warn('[ProjectDashboard] Sync error:', err)
          setUpcomingBookings([])
        }
        
      } catch (err) {
        console.error('[ProjectDashboard] Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [projectId, enabledFeatures])
  
  // Calculate summary stats from analytics store
  // API returns: { summary: { pageViews, uniqueVisitors, ... }, topPages, dailyPageViews, ... }
  const summary = analyticsOverview?.summary || analyticsOverview || {}
  const totalVisitors = summary?.uniqueVisitors || summary?.uniqueSessions || summary?.totalSessions || 0
  const totalPageViews = summary?.pageViews || 0
  const avgSessionDuration = summary?.avgSessionDuration || 0
  const bounceRate = summary?.bounceRate || 0
  
  // Transform traffic data from store
  const trafficData = useMemo(() => {
    if (!pageViewsByDay || !Array.isArray(pageViewsByDay)) return []
    return pageViewsByDay.map(d => ({
      date: format(new Date(d.date || d.day), 'MMM d'),
      pageViews: d.pageViews || d.views || d.count || 0,
      visitors: d.visitors || d.uniqueVisitors || Math.round((d.pageViews || d.views || d.count || 0) * 0.6)
    }))
  }, [pageViewsByDay])
  
  // Get top pages from store
  const topPages = storeTopPages || []
  
  return (
    <div className="h-full min-h-0 overflow-auto p-6">
      <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-gradient-to-br from-[var(--glass-bg)] to-[var(--surface-secondary)] backdrop-blur-xl rounded-2xl p-6 border border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.secondary})` }}
            >
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{projectName}</h1>
              <p className="text-[var(--text-secondary)]">
                Project Overview
              </p>
            </div>
          </div>
          
          {projectDomain && (
            <a 
              href={`https://${projectDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-[var(--glass-bg-inset)] hover:bg-[var(--glass-bg)] transition-colors"
              style={{ color: brandColors.primary }}
            >
              <Globe className="w-4 h-4" />
              {projectDomain}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          title="Visitors" 
          value={totalVisitors.toLocaleString()} 
          subtitle="Last 30 days"
          icon={Eye}
          color="blue"
          isLoading={isLoading && checkModule('analytics')}
        />
        <StatsCard 
          title="Page Views" 
          value={totalPageViews.toLocaleString()} 
          subtitle="Last 30 days"
          icon={MousePointer}
          color="purple"
          isLoading={isLoading && checkModule('analytics')}
        />
        {checkModule('commerce') || checkModule('ecommerce') ? (
          <StatsCard 
            title="Revenue" 
            value={`$${(commerceData?.stats?.totalRevenue || 0).toLocaleString()}`} 
            subtitle={`${commerceData?.stats?.totalOrders || 0} orders`}
            icon={DollarSign}
            color="emerald"
            isLoading={isLoading}
          />
        ) : (
          <StatsCard 
            title="Avg. Session" 
            value={avgSessionDuration > 0 ? `${Math.round(avgSessionDuration)}s` : '--'} 
            subtitle="Duration"
            icon={Clock}
            color="cyan"
            isLoading={isLoading && checkModule('analytics')}
          />
        )}
        {checkModule('seo') ? (
          <StatsCard 
            title="SEO Score" 
            value={typeof seoData?.healthScore === 'object' ? (seoData?.healthScore?.overallScore || '--') : (seoData?.healthScore || '--')} 
            subtitle={seoData?.gscConnected ? 'GSC Connected' : 'Connect GSC'}
            icon={Search}
            color="primary"
            isLoading={isLoading}
          />
        ) : (
          <StatsCard 
            title="Bounce Rate" 
            value={bounceRate > 0 ? `${bounceRate.toFixed(1)}%` : '--'} 
            subtitle="Last 30 days"
            icon={TrendingDown}
            color="orange"
            isLoading={isLoading && checkModule('analytics')}
          />
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart - Takes 2 columns */}
        {checkModule('analytics') && (
          <TrafficChartWidget 
            data={trafficData} 
            isLoading={isLoading} 
            brandColors={brandColors} 
          />
        )}
        
        {/* Sync/Upcoming Widget - Always shown (Sync is universal/per-user) */}
        <SyncWidget 
          bookings={upcomingBookings} 
          isLoading={isLoading} 
          brandColors={brandColors}
          onNavigate={onNavigate}
        />
      </div>
      
      {/* Secondary 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Pages */}
        {checkModule('analytics') && (
          <TopPagesWidget 
            pages={topPages} 
            isLoading={isLoading} 
            brandColors={brandColors}
            onNavigate={onNavigate}
          />
        )}
        
        {/* SEO Health Widget */}
        {checkModule('seo') && (
          <SEOHealthWidget 
            seoData={seoData} 
            isLoading={isLoading} 
            brandColors={brandColors}
            onNavigate={onNavigate}
          />
        )}
        
        {/* Commerce Widget */}
        {(checkModule('commerce') || checkModule('ecommerce')) && (
          <CommerceWidget 
            commerceData={commerceData} 
            isLoading={isLoading} 
            brandColors={brandColors}
            onNavigate={onNavigate}
          />
        )}
        
        {/* Recent Activity */}
        <RecentActivityWidget 
          activities={recentActivity} 
          isLoading={isLoading} 
          brandColors={brandColors}
        />
      </div>

      {/* Module Quick Access */}
      {enabledModules.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Modules</h2>
          <div className={cn(
            "grid gap-3",
            // Intelligent grid based on module count
            enabledModules.length <= 3 && "grid-cols-1 sm:grid-cols-3",
            enabledModules.length === 4 && "grid-cols-2 lg:grid-cols-4",
            enabledModules.length === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
            enabledModules.length === 6 && "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
            enabledModules.length > 6 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          )}>
            {enabledModules.map(module => (
              <ModuleCard key={module.key} module={module} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Uptrade Services */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${brandColors.primary}20` }}>
            <Zap className="w-4 h-4" style={{ color: brandColors.primary }} />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Uptrade Media</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'proposals', label: 'Proposals', icon: Send, description: 'View proposals' },
            { key: 'messages', label: 'Messages', icon: MessageSquare, description: 'Team chat' },
            { key: 'billing', label: 'Billing', icon: DollarSign, description: 'Invoices' },
            { key: 'files', label: 'Files', icon: FileText, description: 'Shared files' }
          ].map(service => {
            const Icon = service.icon
            return (
              <button
                key={service.key}
                onClick={() => onNavigate?.(service.key)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl text-left transition-all",
                  "bg-[var(--surface-secondary)] border border-[var(--glass-border)]",
                  "hover:bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/30"
                )}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${brandColors.primary}10` }}
                >
                  <Icon className="w-5 h-5" style={{ color: brandColors.primary }} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">{service.label}</p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{service.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      </div>
    </div>
  )
}
