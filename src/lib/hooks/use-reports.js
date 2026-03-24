/**
 * Reports Query Hooks
 * 
 * TanStack Query hooks for Reports module.
 * Replaces reports-store.js with automatic caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const reportsKeys = {
  all: ['reports'],
  overview: (period) => [...reportsKeys.all, 'overview', period],
  project: (projectId, period) => [...reportsKeys.all, 'project', projectId, period],
  financial: (period) => [...reportsKeys.all, 'financial', period],
  activity: (period) => [...reportsKeys.all, 'activity', period],
  lighthouse: (projectId) => [...reportsKeys.all, 'lighthouse', projectId],
  audits: (projectId) => [...reportsKeys.all, 'audits', projectId],
  allAudits: () => [...reportsKeys.all, 'allAudits'],
  auditDetail: (id) => [...reportsKeys.all, 'auditDetail', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert numeric period (days) to API period string
 * @param {number|string} period - Days (7, 30, 365) or string ('week', 'month', 'year')
 * @returns {'week'|'month'|'year'} API-compatible period
 */
function toPeriodString(period) {
  if (typeof period === 'string' && ['week', 'month', 'year'].includes(period)) {
    return period
  }
  const days = typeof period === 'number' ? period : parseInt(period, 10)
  if (days <= 7) return 'week'
  if (days <= 30) return 'month'
  return 'year'
}

/**
 * Fetch overview report (dashboard metrics)
 */
export function useOverviewReport(period = 30, options = {}) {
  const apiPeriod = toPeriodString(period)
  return useQuery({
    queryKey: reportsKeys.overview(period),
    queryFn: async () => {
      const response = await reportsApi.dashboard({ period: apiPeriod })
      const data = response.data || response
      const metrics = data.metrics || {}
      
      // Transform projectStatusBreakdown to chart format
      const projectStatusDistribution = (metrics.projectStatusBreakdown || []).map(s => ({
        name: s.status?.charAt(0).toUpperCase() + s.status?.slice(1) || 'Unknown',
        status: s.status,
        count: s.count,
        percentage: 0,
      }))
      const totalProjects = projectStatusDistribution.reduce((sum, s) => sum + s.count, 0)
      projectStatusDistribution.forEach(s => {
        s.percentage = totalProjects > 0 ? Math.round((s.count / totalProjects) * 100) : 0
      })
      
      // Transform monthlyRevenue to chart format
      const revenueTrend = (metrics.monthlyRevenue || []).map(m => ({
        month: m.month,
        month_name: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        revenue: m.total || 0,
      }))
      
      return {
        summary: {
          total_projects: totalProjects || metrics.activeProjects || 0,
          active_projects: metrics.activeProjects || 0,
          total_revenue: metrics.revenue || 0,
          pending_revenue: metrics.pendingInvoices || 0,
          total_messages: metrics.recentMessages || 0,
          recent_messages: metrics.recentMessages || 0,
          unread_messages: metrics.unreadMessages || 0,
          pending_proposals: metrics.pendingProposals || 0,
        },
        charts: {
          project_status_distribution: projectStatusDistribution,
          revenue_trend: revenueTrend,
        },
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch financial report
 */
export function useFinancialReport(period = 30, options = {}) {
  return useQuery({
    queryKey: reportsKeys.financial(period),
    queryFn: async () => {
      const response = await reportsApi.financial({ period })
      return response.data || response
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY REPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch activity report
 */
export function useActivityReport(period = 30, options = {}) {
  return useQuery({
    queryKey: reportsKeys.activity(period),
    queryFn: async () => {
      const response = await reportsApi.activity({ period })
      return response.data || response
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDITS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all audits for a project
 */
export function useAudits(projectId, options = {}) {
  return useQuery({
    queryKey: reportsKeys.audits(projectId),
    queryFn: async () => {
      const response = await reportsApi.listAudits({ project_id: projectId })
      return response.data?.audits || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single audit
 */
export function useAudit(id, options = {}) {
  return useQuery({
    queryKey: reportsKeys.auditDetail(id),
    queryFn: async () => {
      const response = await reportsApi.getAudit(id)
      return response.data?.audit || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Run new lighthouse audit
 */
export function useRunAudit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, url }) => {
      const response = await reportsApi.runAudit(projectId, { url })
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.audits(projectId) })
      queryClient.invalidateQueries({ queryKey: reportsKeys.lighthouse(projectId) })
    },
  })
}

/**
 * Delete audit
 */
export function useDeleteAudit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await reportsApi.deleteAudit(id)
      return { id, projectId }
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.removeQueries({ queryKey: reportsKeys.auditDetail(id) })
      queryClient.invalidateQueries({ queryKey: reportsKeys.allAudits() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: reportsKeys.audits(projectId) })
      }
    },
  })
}

/**
 * Fetch all audits for current user (no projectId filter)
 */
export function useAllAudits(options = {}) {
  return useQuery({
    queryKey: reportsKeys.allAudits(),
    queryFn: async () => {
      const response = await reportsApi.listAudits({ limit: 50 })
      const data = response.data || response
      return data.audits || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}

/**
 * Request a new audit
 */
export function useRequestAudit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ url, projectId, recipientEmail, recipientName }) => {
      const response = await reportsApi.requestAudit({
        url,
        projectId: projectId || null,
        recipientEmail: recipientEmail || null,
        recipientName: recipientName || null,
      })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.allAudits() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: reportsKeys.audits(projectId) })
      }
    },
  })
}

/**
 * Get audit status badge (utility function - not a hook)
 */
export const getAuditStatusBadge = (status) => {
  const badges = {
    'pending': { text: 'Queued', color: 'gray' },
    'running': { text: 'Processing', color: 'blue' },
    'completed': { text: 'Complete', color: 'green' },
    'complete': { text: 'Complete', color: 'green' },
    'failed': { text: 'Failed', color: 'red' },
    'error': { text: 'Failed', color: 'red' },
  }
  return badges[status] || { text: 'Unknown', color: 'gray' }
}
