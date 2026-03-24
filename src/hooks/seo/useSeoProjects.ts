/**
 * SEO Projects React Query Hooks
 * 
 * Replaces Zustand store with React Query for data fetching and caching.
 * Provides better server state management, automatic refetching, and cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

// Query keys for cache management
export const seoProjectKeys = {
  all: ['seo', 'projects'] as const,
  lists: () => [...seoProjectKeys.all, 'list'] as const,
  list: (orgId: string) => [...seoProjectKeys.lists(), { orgId }] as const,
  details: () => [...seoProjectKeys.all, 'detail'] as const,
  detail: (id: string) => [...seoProjectKeys.details(), id] as const,
}

/**
 * Fetch all SEO projects for an organization
 */
export function useSeoProjects(orgId: string) {
  return useQuery({
    queryKey: seoProjectKeys.list(orgId),
    queryFn: () => seoApi.getProjects(orgId),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single SEO project by ID
 */
export function useSeoProject(orgId: string, projectId: string) {
  return useQuery({
    queryKey: seoProjectKeys.detail(projectId),
    queryFn: async () => {
      const projects = await seoApi.getProjects(orgId)
      const project = projects.find((p: any) => p.id === projectId)
      if (!project) {
        throw new Error(`Project ${projectId} not found`)
      }
      return project
    },
    enabled: !!orgId && !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Update an SEO project
 */
export function useUpdateSeoProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, updates }: { projectId: string; updates: any }) =>
      seoApi.updateProject(projectId, updates),
    onMutate: async ({ projectId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: seoProjectKeys.detail(projectId) })

      // Snapshot previous value
      const previous = queryClient.getQueryData(seoProjectKeys.detail(projectId))

      // Optimistically update
      queryClient.setQueryData(seoProjectKeys.detail(projectId), (old: any) => ({
        ...old,
        ...updates,
      }))

      return { previous, projectId }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          seoProjectKeys.detail(context.projectId),
          context.previous
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: seoProjectKeys.detail(variables.projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoProjectKeys.lists() 
      })
    },
  })
}
