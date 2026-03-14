/**
 * useAnalytics Hook
 * Manages analytics data fetching, subscriptions, and state
 * Used by both Analytics.jsx (site-wide) and AnalyticsPageView.jsx (per-page)
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import useAuthStore from '@/lib/auth-store'
import {
  useSiteAnalyticsOverview,
  useSiteTopPages,
  usePageViewsByDay,
  usePageViewsByHour,
  useWebVitals,
  useSiteSessions,
  useScrollDepth,
  useHeatmap,
  useSiteRealtimeAnalytics
} from '@/lib/hooks'
import {
  transformTrafficData,
  transformDeviceData,
  transformPagesData,
  transformHourlyData,
  buildFunnelData,
  buildEngagementData,
  getDailyTrend
} from '@/lib/analytics/transformers'
import { buildMetrics, buildPageMetrics } from '@/lib/analytics/metrics'

/**
 * @param {Object} options
 * @param {string} [options.path] - Optional path filter for per-page analytics
 * @returns {Object} Analytics data, loading states, and handlers
 */
export function useAnalytics({ path = null } = {}) {
  const { currentOrg, currentProject } = useAuthStore()
  const projectName = currentProject?.name || 'Your Site'
  const projectDomain = currentProject?.domain
  const projectId = currentProject?.id

  // Local state for date range
  const [dateRange, setDateRange] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // When path is set, all overview/charts are scoped to that page
  const pathOpt = path ? { path } : {}

  // React Query hooks for data fetching
  const {
    data: overview,
    isLoading: overviewLoading,
    error,
    refetch: refetchOverview
  } = useSiteAnalyticsOverview(projectId, dateRange, pathOpt)

  const { data: topPages, refetch: refetchTopPages } = useSiteTopPages(projectId, dateRange, 50)
  const { data: pageViewsByDay, refetch: refetchByDay } = usePageViewsByDay(projectId, dateRange, pathOpt)
  const { data: pageViewsByHour, refetch: refetchByHour } = usePageViewsByHour(projectId, dateRange, pathOpt)
  const { data: webVitals, refetch: refetchWebVitals } = useWebVitals(projectId, dateRange, pathOpt)
  const { data: sessions, refetch: refetchSessions } = useSiteSessions(projectId, dateRange)
  const { data: scrollDepth, refetch: refetchScrollDepth } = useScrollDepth(projectId, dateRange, pathOpt)
  const { data: heatmap } = useHeatmap(projectId, path)
  const { data: realtimeData } = useSiteRealtimeAnalytics(projectId)

  const isLoading = overviewLoading

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      refetchOverview(),
      refetchTopPages(),
      refetchByDay(),
      refetchByHour(),
      refetchWebVitals(),
      refetchSessions(),
      refetchScrollDepth()
    ])
    setIsRefreshing(false)
  }

  // Handle date range change
  const handleDateRangeChange = (range) => {
    if (range.preset) {
      setDateRange(range.days)
    } else if (typeof range === 'number') {
      setDateRange(range)
    }
  }

  // Formatters
  const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const formatPercent = (value, total) => {
    if (!total || total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  // Extract and memoize transformed data
  const summary = overview?.summary || {}
  const dailyTrend = getDailyTrend(overview, pageViewsByDay)
  // API returns { source, count }; ReferrersTable expects { referrer, count } for parseReferrer()
  const topReferrers = (overview?.topReferrers || []).map((r) => ({
    referrer: r.referrer ?? r.source ?? 'Direct',
    count: r.count ?? 0
  }))
  const topEvents = overview?.topEvents || []

  // Memoized transformed data
  const trafficData = useMemo(() => transformTrafficData(dailyTrend), [dailyTrend])
  const deviceData = useMemo(() => transformDeviceData(overview?.deviceBreakdown), [overview?.deviceBreakdown])
  const pagesData = useMemo(() => transformPagesData(topPages || []), [topPages])
  const hourlyData = useMemo(() => transformHourlyData(pageViewsByHour), [pageViewsByHour])
  const funnelData = useMemo(() => buildFunnelData(summary), [summary])
  const engagementData = useMemo(() => buildEngagementData(summary), [summary])

  // Build metrics based on whether we're viewing a specific page
  const metrics = useMemo(() => {
    if (path) {
      // Find the specific page data if available
      const pageData = pagesData.find(p => p.path === path) || {}
      return buildPageMetrics(summary, pageData, formatNumber, formatDuration)
    }
    return buildMetrics(summary, formatNumber, formatDuration)
  }, [summary, path, pagesData])

  // Realtime data
  const realtimeActiveVisitors = realtimeData?.activeVisitors ?? summary.activeNow ?? 0
  const realtimeEvents = realtimeData?.recentEvents || []

  // Clear error is a no-op with React Query (errors auto-clear on refetch)
  const clearError = () => {}

  return {
    // Project info
    projectName,
    projectDomain,
    currentProject,
    
    // State
    isLoading: isLoading && !overview,
    isRefreshing,
    error,
    dateRange,
    projectReady: !!projectId,
    
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
    realtimeConnected: !!realtimeData,
    lastUpdated: realtimeData?.timestamp || null,
    
    // Handlers
    handleRefresh,
    handleDateRangeChange,
    setDateRange,
    clearError,
    fetchAllAnalytics: handleRefresh,
    
    // Formatters
    formatNumber,
    formatDuration,
    formatPercent
  }
}

export default useAnalytics
