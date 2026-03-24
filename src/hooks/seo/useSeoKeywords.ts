/**
 * SEO Keywords React Query Hooks
 * 
 * Manages keyword tracking, ranking history, and discovery.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    queryFn: () => seoApi.getTrackedKeywords(projectId),
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
    queryFn: () => seoApi.getKeywordsSummary(projectId),
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
    queryFn: () => seoApi.getRankingHistory(projectId, keywordId, options),
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
      queryClient.invalidateQueries({ 
        queryKey: seoKeywordKeys.tracked(variables.projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoKeywordKeys.summary(variables.projectId) 
      })
    },
  })
}

/**
 * Auto-discover keywords from GSC
 */
export function useAutoDiscoverKeywords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.autoDiscoverKeywords(projectId),
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoKeywordKeys.tracked(projectId) 
      })
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
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoKeywordKeys.tracked(projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoKeywordKeys.history(projectId) 
      })
    },
  })
}
