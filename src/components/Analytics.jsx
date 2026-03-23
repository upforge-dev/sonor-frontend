/**
 * Analytics - World-class analytics dashboard
 * Full-featured analytics page with modular components
 */
import { lazy, Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'

// Import modular components
import { MetricsGrid } from '@/components/analytics/MetricsGrid'

// Lazy load heavier components for better code splitting
const TrafficChart = lazy(() => import('@/components/analytics/TrafficChart'))
const DeviceBreakdown = lazy(() => import('@/components/analytics/DeviceBreakdown'))
const TopPagesTable = lazy(() => import('@/components/analytics/TopPagesTable'))
const ReferrersTable = lazy(() => import('@/components/analytics/ReferrersTable'))
const HourlyChart = lazy(() => import('@/components/analytics/HourlyChart'))
const ConversionFunnel = lazy(() => import('@/components/analytics/ConversionFunnel'))
const EngagementMetrics = lazy(() => import('@/components/analytics/EngagementMetrics'))
const RealTimeWidget = lazy(() => import('@/components/analytics/RealTimeWidget'))
const WebVitalsCard = lazy(() => import('@/components/analytics/WebVitalsCard'))
const BrowserBreakdown = lazy(() => import('@/components/analytics/BrowserBreakdown'))
const UTMCampaigns = lazy(() => import('@/components/analytics/UTMCampaigns'))
const ScrollDepthCard = lazy(() => import('@/components/analytics/ScrollDepthCard'))
const HeatmapOverview = lazy(() => import('@/components/analytics/HeatmapOverview'))

// Component loading fallback
function ChartLoader() {
  return (
    <div className="h-80 flex items-center justify-center bg-[var(--glass-bg)] rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
    </div>
  )
}

export default function Analytics({ dateRange: parentDateRange } = {}) {
  const {
    // Project info
    projectDomain,

    // State
    isLoading,
    isRefreshing,
    error,
    dateRange,

    // Raw data
    overview,
    webVitals,
    sessions,
    scrollDepth,
    heatmap,
    topReferrers,
    topEvents,

    // Transformed data
    trafficData,
    deviceData,
    pagesData,
    hourlyData,
    funnelData,
    engagementData,
    metrics,

    // Realtime
    realtimeActiveVisitors,
    realtimeEvents,

    // Handlers
    handleRefresh,
    clearError,
    fetchAllAnalytics,

    // Formatters
    formatNumber,
    formatDuration,
    formatPercent
  } = useAnalytics({ dateRange: parentDateRange })

  if (error && !overview) {
    return (
      <div className="space-y-6">
        {projectDomain && (
          <p className="text-muted-foreground text-sm">
            Traffic and engagement for <span className="text-foreground font-medium">{projectDomain}</span>
          </p>
        )}
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => { clearError(); fetchAllAnalytics(); }}
              className="text-sm underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Simple subtitle - header is handled by AnalyticsDashboard */}
      {projectDomain && (
        <p className="text-muted-foreground text-sm">
          Traffic and engagement for <span className="text-foreground font-medium">{projectDomain}</span>
        </p>
      )}

      {/* Key Metrics */}
      <MetricsGrid
        metrics={metrics}
        isLoading={isLoading}
        columns={6}
      />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Trend - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartLoader />}>
            <TrafficChart
              data={trafficData}
              isLoading={isLoading}
              dateRange={dateRange}
              showSessions={true}
            />
          </Suspense>
        </div>

        {/* Real-Time Widget */}
        <Suspense fallback={<ChartLoader />}>
          <RealTimeWidget
            activeVisitors={realtimeActiveVisitors}
            recentEvents={realtimeEvents}
            isLive={true}
            onRefresh={handleRefresh}
            isLoading={isRefreshing}
          />
        </Suspense>
      </div>

      {/* Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Suspense fallback={<ChartLoader />}>
          <DeviceBreakdown
            data={deviceData}
            isLoading={isLoading}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
          />
        </Suspense>

        {/* Hourly Distribution */}
        <Suspense fallback={<ChartLoader />}>
          <HourlyChart
            data={hourlyData}
            isLoading={isLoading}
          />
        </Suspense>
      </div>

      {/* Funnel and Engagement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Suspense fallback={<ChartLoader />}>
          <ConversionFunnel
            data={funnelData}
            isLoading={isLoading}
            formatNumber={formatNumber}
          />
        </Suspense>

        {/* Engagement Metrics */}
        <Suspense fallback={<ChartLoader />}>
          <EngagementMetrics
            data={engagementData}
            isLoading={isLoading}
            formatDuration={formatDuration}
          />
        </Suspense>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Suspense fallback={<ChartLoader />}>
          <TopPagesTable
            pages={pagesData}
            isLoading={isLoading}
            formatNumber={formatNumber}
            formatDuration={formatDuration}
          />
        </Suspense>

        {/* Traffic Sources */}
        <Suspense fallback={<ChartLoader />}>
          <ReferrersTable
            referrers={topReferrers}
            isLoading={isLoading}
            formatNumber={formatNumber}
          />
        </Suspense>
      </div>

      {/* Performance Section */}
      <Suspense fallback={<ChartLoader />}>
        <WebVitalsCard
          data={webVitals}
          isLoading={isLoading && !webVitals}
        />
      </Suspense>

      {/* Browser & OS Breakdown */}
      <Suspense fallback={<ChartLoader />}>
        <BrowserBreakdown sessions={sessions} />
      </Suspense>

      {/* Scroll Depth Analytics */}
      <Suspense fallback={<ChartLoader />}>
        <ScrollDepthCard scrollDepth={scrollDepth} />
      </Suspense>

      {/* Click Heatmap Overview */}
      <Suspense fallback={<ChartLoader />}>
        <HeatmapOverview heatmap={heatmap} />
      </Suspense>

      {/* Events Grid */}
      {topEvents.length > 0 && (
        <div className="bg-[var(--glass-bg)] rounded-xl p-6 border border-[var(--glass-border)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Top Events
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topEvents.slice(0, 12).map((event, index) => (
              <div
                key={index}
                className="p-4 bg-[var(--glass-bg-inset)] rounded-lg text-center"
              >
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {formatNumber(event.count)}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
                  {event.name.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UTM Campaign Tracking - at the very bottom */}
      <Suspense fallback={<ChartLoader />}>
        <UTMCampaigns sessions={sessions} />
      </Suspense>
    </div>
  )
}
