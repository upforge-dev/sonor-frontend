/**
 * Analytics Query Hooks
 * 
 * TanStack Query hooks for Analytics module.
 * Replaces analytics-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../portal-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const analyticsKeys = {
  all: ['analytics'],
  overview: (projectId, dateRange) => [...analyticsKeys.all, 'overview', projectId, dateRange],
  topPages: (projectId, dateRange) => [...analyticsKeys.all, 'topPages', projectId, dateRange],
  pageAnalytics: (projectId, path, dateRange) => [...analyticsKeys.all, 'page', projectId, path, dateRange],
  journeys: (projectId, dateRange) => [...analyticsKeys.all, 'journeys', projectId, dateRange],
  sessions: (projectId, dateRange) => [...analyticsKeys.all, 'sessions', projectId, dateRange],
  events: (projectId, dateRange) => [...analyticsKeys.all, 'events', projectId, dateRange],
  aiInsights: (projectId) => [...analyticsKeys.all, 'aiInsights', projectId],
  realtime: (projectId) => [...analyticsKeys.all, 'realtime', projectId],
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch analytics overview (highlights)
 */
export function useAnalyticsOverview(projectId, dateRange = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.overview(projectId, dateRange),
    queryFn: async () => {
      const response = await analyticsApi.getOverview(projectId, dateRange)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP PAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch top pages for building hierarchy
 */
export function useTopPages(projectId, dateRange = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.topPages(projectId, dateRange),
    queryFn: async () => {
      const response = await analyticsApi.getTopPages(projectId, dateRange)
      const data = response.data || response
      return data.pages || data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch analytics for a specific page path
 */
export function usePageAnalytics(projectId, path, dateRange = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.pageAnalytics(projectId, path, dateRange),
    queryFn: async () => {
      const response = await analyticsApi.getPageAnalytics(projectId, path, dateRange)
      return response.data || response
    },
    enabled: !!projectId && !!path,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEYS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch user journey data
 */
export function useJourneys(projectId, dateRange = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.journeys(projectId, dateRange),
    queryFn: async () => {
      const response = await analyticsApi.getJourneys(projectId, dateRange)
      return response.data || response
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
 * Fetch session data
 */
export function useSessions(projectId, dateRange = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.sessions(projectId, dateRange),
    queryFn: async () => {
      const response = await analyticsApi.getSessions(projectId, dateRange)
      return response.data || response
    },
    enabled: !!projectId,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch custom events
 */
export function useEvents(projectId, dateRange = {}, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.events(projectId, dateRange),
    queryFn: async () => {
      const response = await analyticsApi.getEvents(projectId, dateRange)
      return response.data || response
    },
    enabled: !!projectId,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch AI-generated insights
 */
export function useAiInsights(projectId, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.aiInsights(projectId),
    queryFn: async () => {
      const response = await analyticsApi.getAiInsights(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes - AI insights don't need frequent refresh
    ...options,
  })
}

/**
 * Generate new AI insights
 */
export function useGenerateAiInsights() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (projectId) => {
      const response = await analyticsApi.generateAiInsights(projectId)
      return response.data || response
    },
    onSuccess: (data, projectId) => {
      queryClient.setQueryData(analyticsKeys.aiInsights(projectId), data)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// REALTIME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch realtime analytics (active users, etc.)
 */
export function useRealtimeAnalytics(projectId, options = {}) {
  return useQuery({
    queryKey: analyticsKeys.realtime(projectId),
    queryFn: async () => {
      const response = await analyticsApi.getRealtime(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    refetchInterval: 120_000, // 120s – reduce auth/API load
    staleTime: 0, // Always consider stale
    ...options,
  })
}
