/**
 * PageAnalyticsView - Analytics for a single page
 * Detailed metrics and charts for a specific page path
 */
import { lazy, Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ExternalLink } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import useAuthStore from '@/lib/auth-store'
import { MetricsGrid } from '@/components/analytics/MetricsGrid'

// Lazy load heavier components
const TrafficChart = lazy(() => import('@/components/analytics/TrafficChart'))
const DeviceBreakdown = lazy(() => import('@/components/analytics/DeviceBreakdown'))
const ReferrersTable = lazy(() => import('@/components/analytics/ReferrersTable'))
const HourlyChart = lazy(() => import('@/components/analytics/HourlyChart'))
const EngagementMetrics = lazy(() => import('@/components/analytics/EngagementMetrics'))
const WebVitalsCard = lazy(() => import('@/components/analytics/WebVitalsCard'))
const ScrollDepthCard = lazy(() => import('@/components/analytics/ScrollDepthCard'))

function ChartLoader() {
  return (
    <div className="h-80 flex items-center justify-center bg-[var(--glass-bg)] rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
    </div>
  )
}

export default function PageAnalyticsView({ path, dateRange: parentDateRange }) {
  const { currentProject } = useAuthStore()
  const pageName = path === '/' ? 'Home' : path.split('/').filter(Boolean).pop() || path
  const pageUrl = currentProject?.domain ? `https://${currentProject.domain}${path}` : null

  const {
    isLoading,
    error,
    dateRange,
    overview,
    webVitals,
    scrollDepth,
    topReferrers,
    trafficData,
    deviceData,
    hourlyData,
    engagementData,
    metrics,
    clearError,
    fetchAllAnalytics,
    formatNumber,
    formatDuration,
    formatPercent
  } = useAnalytics({ path, dateRange: parentDateRange })

  if (error && !overview) {
    const errorMessage = typeof error === 'string' ? error : (error?.message ?? error?.response?.data?.message ?? 'Failed to load analytics. Make sure the Portal API is running.')
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{errorMessage}</span>
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Page Analytics • Last {dateRange} days</p>
          <h2 className="text-2xl font-semibold text-foreground capitalize">{pageName}</h2>
        </div>
        {pageUrl && (
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Key Metrics - all 6 page-relevant metrics */}
      <MetricsGrid
        metrics={metrics}
        isLoading={isLoading}
        columns={6}
      />

      {/* Traffic Trend */}
      <Suspense fallback={<ChartLoader />}>
        <TrafficChart
          data={trafficData}
          isLoading={isLoading}
          dateRange={dateRange}
          title="Traffic Over Time"
          subtitle="Page views for this page"
        />
      </Suspense>

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

      {/* Entry & Exit / Engagement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources for this page */}
        <Suspense fallback={<ChartLoader />}>
          <ReferrersTable
            referrers={topReferrers}
            isLoading={isLoading}
            formatNumber={formatNumber}
            title="Traffic Sources"
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

      {/* Performance - Web Vitals for this page */}
      <Suspense fallback={<ChartLoader />}>
        <WebVitalsCard
          data={webVitals}
          isLoading={isLoading && !webVitals}
        />
      </Suspense>

      {/* Scroll Depth - how far users scroll on this page */}
      <Suspense fallback={<ChartLoader />}>
        <ScrollDepthCard scrollDepth={scrollDepth} singlePage />
      </Suspense>
    </div>
  )
}
