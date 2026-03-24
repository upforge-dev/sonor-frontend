/**
 * Site Analytics Query Hooks
 * 
 * TanStack Query hooks for Site Analytics module.
 * Replaces site-analytics-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const siteAnalyticsKeys = {
  all: ['siteAnalytics'],
  // Overview
  overview: (projectId, days) => [...siteAnalyticsKeys.all, 'overview', projectId, days],
  // Page views
  pageViews: (projectId) => [...siteAnalyticsKeys.all, 'pageViews', projectId],
  topPages: (projectId, days, limit) => [...siteAnalyticsKeys.pageViews(projectId), 'top', days, limit],
  pageViewsByDay: (projectId, days) => [...siteAnalyticsKeys.pageViews(projectId), 'byDay', days],
  pageViewsByHour: (projectId, days) => [...siteAnalyticsKeys.pageViews(projectId), 'byHour', days],
  // Sessions
  sessions: (projectId, days) => [...siteAnalyticsKeys.all, 'sessions', projectId, days],
  // Web vitals
  webVitals: (projectId, days) => [...siteAnalyticsKeys.all, 'webVitals', projectId, days],
  // Scroll depth
  scrollDepth: (projectId, days) => [...siteAnalyticsKeys.all, 'scrollDepth', projectId, days],
  // Heatmap
  heatmap: (projectId, page) => [...siteAnalyticsKeys.all, 'heatmap', projectId, page],
  // Realtime
  realtime: (projectId) => [...siteAnalyticsKeys.all, 'realtime', projectId],
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch analytics overview (site-wide or per path when path is provided)
 */
export function useSiteAnalyticsOverview(projectId, days = 30, options = {}) {
  const path = options?.path ?? null
  return useQuery({
    queryKey: [...siteAnalyticsKeys.overview(projectId, days), path],
    queryFn: async () => {
      const params = { days, projectId }
      if (path) params.path = path
      const response = await analyticsApi.getOverview(params)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE VIEWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch top pages
 */
export function useSiteTopPages(projectId, days = 30, limit = 20, options = {}) {
  return useQuery({
    queryKey: siteAnalyticsKeys.topPages(projectId, days, limit),
    queryFn: async () => {
      const response = await analyticsApi.getPageViews({ 
        days, 
        groupBy: 'path', 
        limit, 
        projectId 
      })
      const data = response.data || response
      return data.data || data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Fetch page views by day (for trend charts), optionally filtered by path
 */
export function usePageViewsByDay(projectId, days = 30, options = {}) {
  const path = options?.path ?? null
  return useQuery({
    queryKey: [...siteAnalyticsKeys.pageViewsByDay(projectId, days), path],
    queryFn: async () => {
      const params = { days, groupBy: 'day', projectId }
      if (path) params.path = path
      const response = await analyticsApi.getPageViews(params)
      const data = response.data || response
      return data.data || data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Fetch page views by hour (for time distribution), optionally filtered by path
 */
export function usePageViewsByHour(projectId, days = 30, options = {}) {
  const path = options?.path ?? null
  return useQuery({
    queryKey: [...siteAnalyticsKeys.pageViewsByHour(projectId, days), path],
    queryFn: async () => {
      const params = { days, groupBy: 'hour', projectId }
      if (path) params.path = path
      const response = await analyticsApi.getPageViews(params)
      const data = response.data || response
      return data.data || data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch sessions analytics
 */
export function useSiteSessions(projectId, days = 30, options = {}) {
  return useQuery({
    queryKey: siteAnalyticsKeys.sessions(projectId, days),
    queryFn: async () => {
      const response = await analyticsApi.getSessions({ days, projectId })
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB VITALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch web vitals, optionally filtered by path
 */
export function useWebVitals(projectId, days = 30, options = {}) {
  const path = options?.path ?? null
  return useQuery({
    queryKey: [...siteAnalyticsKeys.webVitals(projectId, days), path],
    queryFn: async () => {
      const params = { days, projectId }
      if (path) params.path = path
      const response = await analyticsApi.getWebVitals(params)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes - web vitals change slowly
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL DEPTH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch scroll depth analytics, optionally filtered by path
 */
export function useScrollDepth(projectId, days = 30, options = {}) {
  const path = options?.path ?? null
  return useQuery({
    queryKey: [...siteAnalyticsKeys.scrollDepth(projectId, days), path],
    queryFn: async () => {
      const params = { days, projectId }
      if (path) params.path = path
      const response = await analyticsApi.getScrollDepth(params)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// HEATMAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch heatmap data for a page
 */
export function useHeatmap(projectId, page, options = {}) {
  const days = options?.days ?? 30
  return useQuery({
    queryKey: siteAnalyticsKeys.heatmap(projectId, page),
    queryFn: async () => {
      const params = { projectId, days }
      if (page) params.path = page
      const response = await analyticsApi.getHeatmap(params)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// REALTIME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch realtime analytics (poll frequently)
 */
export function useSiteRealtimeAnalytics(projectId, options = {}) {
  return useQuery({
    queryKey: siteAnalyticsKeys.realtime(projectId),
    queryFn: async () => {
      const response = await analyticsApi.getRealtime({ projectId })
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 120, // 120s – reduce auth/API load
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate AI insights for analytics
 */
export function useGenerateAnalyticsInsights() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, days = 30 }) => {
      const response = await analyticsApi.generateInsights({ projectId, days })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      // Optionally cache insights
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prefetch all analytics data
 */
export function usePrefetchAnalytics() {
  const queryClient = useQueryClient()
  
  return async (projectId, days = 30) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: siteAnalyticsKeys.overview(projectId, days),
        queryFn: () => analyticsApi.getOverview({ days, projectId }),
      }),
      queryClient.prefetchQuery({
        queryKey: siteAnalyticsKeys.topPages(projectId, days, 20),
        queryFn: () => analyticsApi.getPageViews({ days, groupBy: 'path', limit: 20, projectId }),
      }),
      queryClient.prefetchQuery({
        queryKey: siteAnalyticsKeys.pageViewsByDay(projectId, days),
        queryFn: () => analyticsApi.getPageViews({ days, groupBy: 'day', projectId }),
      }),
    ])
  }
}
