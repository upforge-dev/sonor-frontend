/**
 * SEO Opportunities React Query Hooks
 * 
 * Manages SEO opportunities and recommendations with React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

// Query keys
export const seoOpportunityKeys = {
  all: ['seo', 'opportunities'] as const,
  lists: () => [...seoOpportunityKeys.all, 'list'] as const,
  list: (projectId: string, filters?: any) => 
    [...seoOpportunityKeys.lists(), { projectId, ...filters }] as const,
  details: () => [...seoOpportunityKeys.all, 'detail'] as const,
  detail: (id: string) => [...seoOpportunityKeys.details(), id] as const,
  summary: (projectId: string) => [...seoOpportunityKeys.all, 'summary', projectId] as const,
}

interface UseSeoOpportunitiesOptions {
  page?: number
  limit?: number
  type?: string
  status?: string
  priority?: string
}

/**
 * Fetch SEO opportunities for a project
 */
export function useSeoOpportunities(
  projectId: string,
  options: UseSeoOpportunitiesOptions = {}
) {
  const { page = 1, limit = 50, type, status, priority } = options

  return useQuery({
    queryKey: seoOpportunityKeys.list(projectId, { page, limit, type, status, priority }),
    queryFn: () => seoApi.getOpportunities(projectId, { page, limit, type, status, priority }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  })
}

/**
 * Fetch opportunity summary statistics
 */
export function useSeoOpportunitySummary(projectId: string) {
  return useQuery({
    queryKey: seoOpportunityKeys.summary(projectId),
    queryFn: () => seoApi.getOpportunitySummary(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Update an opportunity (e.g., mark as applied/dismissed)
 */
export function useUpdateSeoOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ opportunityId, updates }: { opportunityId: string; updates: any }) =>
      seoApi.updateOpportunity(opportunityId, updates),
    onMutate: async ({ opportunityId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: seoOpportunityKeys.detail(opportunityId) })

      // Snapshot previous value
      const previous = queryClient.getQueryData(seoOpportunityKeys.detail(opportunityId))

      // Optimistically update
      queryClient.setQueryData(seoOpportunityKeys.detail(opportunityId), (old: any) => ({
        ...old,
        ...updates,
      }))

      // Update in lists
      queryClient.setQueriesData(
        { queryKey: seoOpportunityKeys.lists() },
        (old: any) => {
          if (!old?.opportunities && !old?.data) return old
          
          const opps = old.opportunities || old.data || []
          return {
            ...old,
            opportunities: opps.map((o: any) =>
              o.id === opportunityId ? { ...o, ...updates } : o
            ),
            data: opps.map((o: any) =>
              o.id === opportunityId ? { ...o, ...updates } : o
            ),
          }
        }
      )

      return { previous, opportunityId }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          seoOpportunityKeys.detail(context.opportunityId),
          context.previous
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.detail(variables.opportunityId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.lists() 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.all 
      })
    },
  })
}

/**
 * Apply an opportunity (mark as implemented)
 */
export function useApplySeoOpportunity() {
  const { mutateAsync, ...rest } = useUpdateSeoOpportunity()

  return {
    ...rest,
    mutateAsync: (opportunityId: string) =>
      mutateAsync({
        opportunityId,
        updates: {
          status: 'applied',
          applied_at: new Date().toISOString(),
        },
      }),
  }
}

/**
 * Dismiss an opportunity
 */
export function useDismissSeoOpportunity() {
  const { mutateAsync, ...rest } = useUpdateSeoOpportunity()

  return {
    ...rest,
    mutateAsync: (opportunityId: string) =>
      mutateAsync({
        opportunityId,
        updates: {
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
        },
      }),
  }
}

/**
 * Bulk update opportunities
 */
export function useBulkUpdateSeoOpportunities() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ opportunityIds, updates }: { opportunityIds: string[]; updates: any }) =>
      seoApi.bulkUpdateOpportunities({ opportunityIds, updates }),
    onMutate: async ({ opportunityIds, updates }) => {
      // Optimistically update all opportunities in lists
      queryClient.setQueriesData(
        { queryKey: seoOpportunityKeys.lists() },
        (old: any) => {
          if (!old?.opportunities && !old?.data) return old
          
          const opps = old.opportunities || old.data || []
          return {
            ...old,
            opportunities: opps.map((o: any) =>
              opportunityIds.includes(o.id) ? { ...o, ...updates } : o
            ),
            data: opps.map((o: any) =>
              opportunityIds.includes(o.id) ? { ...o, ...updates } : o
            ),
          }
        }
      )

      return { opportunityIds }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.lists() 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.all 
      })
    },
  })
}

/**
 * Generate new opportunities using Signal AI
 */
export function useGenerateSeoOpportunities() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.generateOpportunities(projectId),
    onSuccess: (data, projectId) => {
      // Invalidate opportunities to refetch
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.list(projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoOpportunityKeys.summary(projectId) 
      })
    },
  })
}
