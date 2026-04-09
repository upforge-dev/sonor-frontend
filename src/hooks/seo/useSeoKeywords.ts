/**
 * SEO Keywords React Query Hooks
 * 
 * Manages keyword tracking, ranking history, and discovery.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { seoApi } from '../../lib/sonor-api'

export const seoKeywordKeys = {
  all: ['seo', 'keywords'] as const,
  tracked: (projectId: string) => [...seoKeywordKeys.all, 'tracked', projectId] as const,
  summary: (projectId: string) => [...seoKeywordKeys.all, 'summary', projectId] as const,
  rankings: (projectId: string, options?: any) => 
    [...seoKeywordKeys.all, 'rankings', projectId, options] as const,
  history: (projectId: string, keywordId?: string) => 
    [...seoKeywordKeys.all, 'history', projectId, keywordId] as const,
}

/**
 * Fetch tracked keywords for a project
 */
export function useSeoTrackedKeywords(projectId: string) {
  return useQuery({
    queryKey: seoKeywordKeys.tracked(projectId),
    queryFn: async () => {
      const res = await seoApi.getTrackedKeywords(projectId)
      return res?.data ?? res
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch keywords summary stats
 */
export function useSeoKeywordsSummary(projectId: string) {
  return useQuery({
    queryKey: seoKeywordKeys.summary(projectId),
    queryFn: async () => {
      const res = await seoApi.getKeywordsSummary(projectId)
      return res?.data ?? res
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch ranking history
 */
export function useSeoRankingHistory(projectId: string, keywordId?: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: seoKeywordKeys.history(projectId, keywordId),
    queryFn: async () => {
      const res = await seoApi.getRankingHistory(projectId, {
        keywordId,
        ...(options ?? {}),
      })
      return res?.data ?? res
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Track new keywords
 */
export function useTrackKeywords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, keywords }: { projectId: string; keywords: string[] }) =>
      seoApi.trackKeywords(projectId, keywords),
    onSuccess: (data, variables) => {
      toast.success(`Tracking ${variables.keywords.length} keyword${variables.keywords.length !== 1 ? 's' : ''}`)
      queryClient.invalidateQueries({
        queryKey: seoKeywordKeys.tracked(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: seoKeywordKeys.summary(variables.projectId)
      })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to track keyword')
    },
  })
}

/**
 * Auto-discover keywords from GSC
 */
export function useAutoDiscoverKeywords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await seoApi.autoDiscoverKeywords(projectId)
      return res?.data ?? res
    },
    onSuccess: (data: any, projectId) => {
      const count = data?.discovered || data?.tracked || 0
      toast.success(count > 0 ? `Discovered ${count} keywords from GSC` : 'No new keywords to discover')
      queryClient.invalidateQueries({
        queryKey: seoKeywordKeys.tracked(projectId)
      })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Auto-discover failed')
    },
  })
}

/**
 * Refresh keyword rankings
 */
export function useRefreshKeywordRankings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.refreshKeywordRankings(projectId),
    onSuccess: (_data, projectId) => {
      toast.success('Rankings refreshed')
      queryClient.invalidateQueries({
        queryKey: seoKeywordKeys.tracked(projectId)
      })
      queryClient.invalidateQueries({
        queryKey: seoKeywordKeys.history(projectId)
      })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Rankings refresh failed')
    },
  })
}
