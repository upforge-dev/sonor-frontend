/**
 * SEO Alerts React Query Hooks
 * 
 * Manages SEO alerts, notifications, and monitoring.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

export const seoAlertKeys = {
  all: ['seo', 'alerts'] as const,
  list: (projectId: string, filters?: any) => 
    [...seoAlertKeys.all, 'list', projectId, filters] as const,
  stats: (projectId: string) => [...seoAlertKeys.all, 'stats', projectId] as const,
  detail: (alertId: string) => [...seoAlertKeys.all, 'detail', alertId] as const,
}

/**
 * Fetch alerts for a project
 */
export function useSeoAlerts(projectId: string, filters?: { status?: string }) {
  return useQuery({
    queryKey: seoAlertKeys.list(projectId, filters),
    queryFn: () => seoApi.getAlerts(projectId, filters),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch alert stats
 */
export function useSeoAlertStats(projectId: string) {
  return useQuery({
    queryKey: seoAlertKeys.stats(projectId),
    queryFn: () => seoApi.getAlertStats(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Check for new alerts
 */
export function useCheckAlerts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, notify }: { projectId: string; notify?: boolean }) =>
      seoApi.checkAlerts(projectId, notify),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoAlertKeys.list(variables.projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoAlertKeys.stats(variables.projectId) 
      })
    },
  })
}

/**
 * Acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertId: string) => seoApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seoAlertKeys.all })
    },
  })
}

/**
 * Resolve an alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertId: string) => seoApi.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: seoAlertKeys.all })
    },
  })
}
