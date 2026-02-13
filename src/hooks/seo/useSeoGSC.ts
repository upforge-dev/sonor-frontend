/**
 * SEO Google Search Console React Query Hooks
 * 
 * Manages GSC data, queries, and metrics with React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/portal-api'
import { signalSeoApi } from '../../lib/signal-api'

// Query keys
export const seoGSCKeys = {
  all: ['seo', 'gsc'] as const,
  overview: (projectId: string, dateRange?: any) => 
    [...seoGSCKeys.all, 'overview', projectId, dateRange] as const,
  queries: (projectId: string, options?: any) => 
    [...seoGSCKeys.all, 'queries', projectId, options] as const,
  pages: (projectId: string, options?: any) => 
    [...seoGSCKeys.all, 'pages', projectId, options] as const,
  comparison: (projectId: string, ranges: any) => 
    [...seoGSCKeys.all, 'comparison', projectId, ranges] as const,
  tracked: (projectId: string) => 
    [...seoGSCKeys.all, 'tracked', projectId] as const,
  strikingDistance: (projectId: string) => 
    [...seoGSCKeys.all, 'strikingDistance', projectId] as const,
  health: (projectId: string) =>
    [...seoGSCKeys.all, 'health', projectId] as const,
}

interface DateRangeOptions {
  startDate?: string
  endDate?: string
}

/**
 * Fetch GSC overview/summary data
 */
export function useSeoGSCOverview(projectId: string, options: DateRangeOptions = {}) {
  return useQuery({
    queryKey: seoGSCKeys.overview(projectId, options),
    queryFn: async () => {
      const response = await seoApi.getGscOverview(projectId, options)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes - GSC data updates slowly
  })
}

/**
 * Fetch GSC queries
 */
export function useSeoGSCQueries(
  projectId: string,
  options: DateRangeOptions & { limit?: number } = {}
) {
  const { startDate, endDate, limit = 100 } = options

  return useQuery({
    queryKey: seoGSCKeys.queries(projectId, { startDate, endDate, limit }),
    queryFn: async () => {
      const response = await seoApi.getGscQueries(projectId, { startDate, endDate, limit })
      return response.data
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Fetch GSC pages
 */
export function useSeoGSCPages(
  projectId: string,
  options: DateRangeOptions & { limit?: number } = {}
) {
  const { startDate, endDate, limit = 100 } = options

  return useQuery({
    queryKey: seoGSCKeys.pages(projectId, { startDate, endDate, limit }),
    queryFn: async () => {
      const response = await seoApi.getGscPages(projectId, { startDate, endDate, limit })
      return response.data
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Fetch tracked queries
 */
export function useSeoTrackedQueries(projectId: string) {
  return useQuery({
    queryKey: seoGSCKeys.tracked(projectId),
    queryFn: async () => {
      const response = await seoApi.getQueries(projectId, { tracked: true, limit: 100 })
      return response.data
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch striking distance queries (positions 8-20)
 */
export function useSeoStrikingDistanceQueries(projectId: string) {
  return useQuery({
    queryKey: seoGSCKeys.strikingDistance(projectId),
    queryFn: async () => {
      const response = await seoApi.getQueries(projectId, { 
        minPosition: 8, 
        maxPosition: 20,
        limit: 100 
      })
      return response.data
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Track queries (add to tracking list)
 */
export function useTrackSeoQueries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, queryTexts }: { projectId: string; queryTexts: string[] }) =>
      seoApi.trackQueries(projectId, queryTexts),
    onSuccess: (data, variables) => {
      // Invalidate tracked queries to refetch
      queryClient.invalidateQueries({ 
        queryKey: seoGSCKeys.tracked(variables.projectId) 
      })
    },
  })
}

/**
 * Untrack queries (remove from tracking list)
 */
export function useUntrackSeoQueries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (queryIds: string[]) => seoApi.untrackQueries(queryIds),
    onMutate: async (queryIds) => {
      // Optimistically remove from tracked queries
      queryClient.setQueriesData(
        { queryKey: [...seoGSCKeys.all, 'tracked'] },
        (old: any) => {
          if (!old) return old
          return old.filter((q: any) => !queryIds.includes(q.id))
        }
      )

      return { queryIds }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: [...seoGSCKeys.all, 'tracked'] 
      })
    },
  })
}

/**
 * Fetch GSC comparison data (period vs period)
 */
export function useSeoGSCComparison(
  projectId: string,
  ranges: {
    startDate: string
    endDate: string
    compareStartDate: string
    compareEndDate: string
  }
) {
  return useQuery({
    queryKey: seoGSCKeys.comparison(projectId, ranges),
    queryFn: async () => {
      const response = await seoApi.getGscComparison(projectId, ranges)
      return response.data
    },
    enabled: !!projectId && !!ranges.startDate,
    staleTime: 10 * 60 * 1000,
  })
}

// ============================================================
// GSC HEALTH & RECONCILIATION
// ============================================================

/**
 * Fetch comprehensive GSC health data
 * Joins canonical pages with indexing status for a unified coverage view
 */
export function useSeoGscHealth(projectId: string) {
  return useQuery({
    queryKey: seoGSCKeys.health(projectId),
    queryFn: async () => {
      const response = await seoApi.getGscHealth(projectId)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes — health data changes with inspections
    refetchOnWindowFocus: true,
  })
}

/**
 * Portal API reconciliation — bulk inspect + submit non-indexed pages
 */
export function useSeoGscReconcile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await seoApi.reconcileGsc(projectId)
      return response.data
    },
    onSuccess: (_data, projectId) => {
      // Invalidate health data to refetch
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.health(projectId) })
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.all })
    },
  })
}

/**
 * Signal API auto-fix reconciliation — inspects, fixes, and submits
 * Signal *solves* the problems instead of just recommending
 */
export function useSeoGscAutoFix() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      return signalSeoApi.reconcileGsc(projectId)
    },
    onSuccess: () => {
      // Invalidate all GSC data after auto-fix
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.all })
    },
  })
}

/**
 * Single URL inspection
 */
export function useSeoInspectUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, url }: { projectId: string; url: string }) => {
      const response = await seoApi.inspectUrl(projectId, url)
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.health(variables.projectId) })
    },
  })
}

/**
 * Submit URL for indexing
 */
export function useSeoSubmitForIndexing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, url }: { projectId: string; url: string }) => {
      const response = await seoApi.submitUrlForIndexing(projectId, url)
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.health(variables.projectId) })
    },
  })
}
