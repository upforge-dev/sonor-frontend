/**
 * Reputation Query Hooks
 * 
 * TanStack Query hooks for Reputation module.
 * Replaces reputation-store.js with automatic caching, deduplication, and background refresh.
 * Handles reviews, campaigns, health score, and settings.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import portalApi from '../sonor-api'
import { signalApi } from '../signal-api'

// Types
export const ReviewStatus = {
  NEW: 'new',
  RESPONDED: 'responded',
  ARCHIVED: 'archived',
}

export const Sentiment = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const reputationKeys = {
  all: ['reputation'],
  overview: (projectId) => [...reputationKeys.all, 'overview', projectId],
  reviews: () => [...reputationKeys.all, 'reviews'],
  reviewsList: (projectId, filters) => [...reputationKeys.reviews(), 'list', projectId, filters],
  reviewDetail: (id) => [...reputationKeys.reviews(), 'detail', id],
  platforms: (projectId) => [...reputationKeys.all, 'platforms', projectId],
  healthScore: (projectId) => [...reputationKeys.all, 'healthScore', projectId],
  healthHistory: (projectId) => [...reputationKeys.all, 'healthHistory', projectId],
  campaigns: (projectId) => [...reputationKeys.all, 'campaigns', projectId],
  requests: (projectId) => [...reputationKeys.all, 'requests', projectId],
  settings: (projectId) => [...reputationKeys.all, 'settings', projectId],
  templates: (projectId) => [...reputationKeys.all, 'templates', projectId],
  triggers: (projectId) => [...reputationKeys.all, 'triggers', projectId],
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch reputation overview
 */
export function useReputationOverview(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.overview(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/overview`)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch reviews list
 */
export function useReviews(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: reputationKeys.reviewsList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.rating) params.append('rating', filters.rating)
      if (filters.sentiment) params.append('sentiment', filters.sentiment)
      if (filters.pendingApproval) params.append('pendingApproval', 'true')
      if (filters.responded) params.append('responded', 'true')
      if (filters.needsAttention) params.append('needsAttention', 'true')
      if (filters.unanswered) params.append('unanswered', 'true')
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      
      const queryString = params.toString()
      const response = await portalApi.get(`/reputation/projects/${projectId}/reviews${queryString ? `?${queryString}` : ''}`)
      const data = response.data
      return {
        reviews: data.reviews || data || [],
        total: data.total || 0,
        pagination: data.pagination,
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single review
 */
export function useReview(id, options = {}) {
  return useQuery({
    queryKey: reputationKeys.reviewDetail(id),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/reviews/${id}`)
      return response.data?.review || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Respond to review
 */
export function useRespondToReview() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, response: reviewResponse }) => {
      const result = await portalApi.post(`/reputation/reviews/${id}/respond`, { response: reviewResponse })
      return { ...(result.data || {}), projectId }
    },
    onSuccess: (data, { id, projectId }) => {
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviewDetail(id) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: reputationKeys.reviews() })
        queryClient.invalidateQueries({ queryKey: reputationKeys.overview(projectId) })
      }
    },
  })
}

/**
 * Archive review
 */
export function useArchiveReview() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const result = await portalApi.put(`/reputation/reviews/${id}/archive`)
      return { ...(result.data || {}), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reputationKeys.reviews() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: reputationKeys.overview(projectId) })
      }
    },
  })
}

/**
 * Generate AI response for review
 */
export function useGenerateAiResponse() {
  return useMutation({
    mutationFn: async ({ projectId, reviewId, reviewText, rating, platform }) => {
      const response = await signalApi.post('/skills/reputation/generate-response', {
        reviewId,
        reviewText,
        rating,
        platform,
      })
      return response.data
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch connected platforms
 */
export function useReputationPlatforms(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.platforms(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/platforms`)
      // Return wrapped in { platforms } for consistency with component expectations
      const platforms = response.data?.platforms || response.data || []
      return { platforms }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Connect platform
 */
export function useConnectReputationPlatform() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, platform, credentials }) => {
      const response = await portalApi.post(`/reputation/projects/${projectId}/platforms/${platform}`, credentials)
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
    },
  })
}

/**
 * Disconnect platform
 */
export function useDisconnectReputationPlatform() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, platformId }) => {
      await portalApi.delete(`/reputation/projects/${projectId}/platforms/${platformId}`)
      return { projectId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: reputationKeys.platforms(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH SCORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch health score
 */
export function useHealthScore(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.healthScore(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/health-score`)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  })
}

/**
 * Fetch health score history
 */
export function useHealthScoreHistory(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.healthHistory(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/health-score/history`)
      return response.data?.history || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch review request campaigns
 */
export function useReputationCampaigns(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.campaigns(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/campaigns`)
      return response.data?.campaigns || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create campaign
 */
export function useCreateReputationCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/reputation/projects/${projectId}/campaigns`, data)
      return response.data?.campaign || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reputationKeys.campaigns(projectId) })
    },
  })
}

/**
 * Update campaign
 */
export function useUpdateReputationCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/reputation/campaigns/${id}`, data)
      return { ...(response.data?.campaign || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: reputationKeys.campaigns(data.projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch reputation settings
 */
export function useReputationSettings(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.settings(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/settings`)
      return response.data?.settings || response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Update reputation settings
 */
export function useUpdateReputationSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, settings }) => {
      const response = await portalApi.put(`/reputation/projects/${projectId}/settings`, settings)
      return response.data?.settings || response.data
    },
    onSuccess: (data, { projectId }) => {
      queryClient.setQueryData(reputationKeys.settings(projectId), data)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch response templates
 */
export function useReputationTemplates(projectId, options = {}) {
  return useQuery({
    queryKey: reputationKeys.templates(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/reputation/projects/${projectId}/templates`)
      return response.data?.templates || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Create template
 */
export function useCreateReputationTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/reputation/projects/${projectId}/templates`, data)
      return response.data?.template || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reputationKeys.templates(projectId) })
    },
  })
}

/**
 * Update template
 */
export function useUpdateReputationTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/reputation/templates/${id}`, data)
      return { ...(response.data?.template || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: reputationKeys.templates(data.projectId) })
      }
    },
  })
}

/**
 * Delete template
 */
export function useDeleteReputationTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/reputation/templates/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: reputationKeys.templates(projectId) })
      }
    },
  })
}
