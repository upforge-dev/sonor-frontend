/**
 * Notifications Query Hooks
 * 
 * TanStack Query hooks for notifications.
 * Replaces notification-store.js with automatic caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query'
import { crmApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const notificationsKeys = {
  all: ['notifications'],
  newLeads: () => [...notificationsKeys.all, 'newLeads'],
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW LEADS COUNT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch count of new leads (prospects in 'new_lead' stage created in last 7 days)
 */
export function useNewLeadsCount(options = {}) {
  return useQuery({
    queryKey: notificationsKeys.newLeads(),
    queryFn: async () => {
      try {
        // Fetch prospects in 'new_lead' stage
        const response = await crmApi.listProspects({ stage: 'new_lead' })
        const data = response.data || response
        const prospects = data.prospects || []
        
        // Count prospects that are genuinely new (created in last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const newCount = prospects.filter(p => {
          const createdAt = new Date(p.created_at)
          return createdAt >= sevenDaysAgo
        }).length
        
        return { count: newCount }
      } catch (error) {
        console.warn('[Notifications] Failed to fetch new leads count:', error)
        return { count: 0 }
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes for badge updates
    ...options,
  })
}
