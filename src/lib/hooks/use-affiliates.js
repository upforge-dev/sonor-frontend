/**
 * Affiliates Query Hooks
 * 
 * TanStack Query hooks for Affiliates module.
 * Replaces affiliates-store.js with automatic caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const affiliatesKeys = {
  all: ['affiliates'],
  list: (projectId, status) => [...affiliatesKeys.all, 'list', projectId, status],
  detail: (id) => [...affiliatesKeys.all, 'detail', id],
  offers: (projectId) => [...affiliatesKeys.all, 'offers', projectId],
  offerDetail: (id) => [...affiliatesKeys.all, 'offerDetail', id],
  clicks: (projectId, affiliateId) => [...affiliatesKeys.all, 'clicks', projectId, affiliateId],
  conversions: (projectId, affiliateId) => [...affiliatesKeys.all, 'conversions', projectId, affiliateId],
  stats: (projectId, affiliateId) => [...affiliatesKeys.all, 'stats', projectId, affiliateId],
}

// ═══════════════════════════════════════════════════════════════════════════
// AFFILIATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch affiliates list
 */
export function useAffiliates(projectId, status, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.list(projectId, status),
    queryFn: async () => {
      let url = `/affiliates?projectId=${projectId}`
      if (status && status !== 'all') url += `&status=${status}`
      const response = await portalApi.get(url)
      return response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single affiliate
 */
export function useAffiliate(id, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.detail(id),
    queryFn: async () => {
      const response = await portalApi.get(`/affiliates/${id}`)
      return response.data?.affiliate || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create affiliate
 */
export function useCreateAffiliate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post('/affiliates', { ...data, projectId })
      return response.data?.affiliate || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.list(projectId) })
    },
  })
}

/**
 * Update affiliate
 */
export function useUpdateAffiliate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.patch(`/affiliates/${id}`, data)
      return { ...(response.data?.affiliate || response.data), projectId }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(affiliatesKeys.detail(id), data)
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: affiliatesKeys.list(data.projectId) })
      }
    },
  })
}

/**
 * Delete affiliate
 */
export function useDeleteAffiliate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/affiliates/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.removeQueries({ queryKey: affiliatesKeys.detail(id) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: affiliatesKeys.list(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch offers list
 */
export function useAffiliateOffers(projectId, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.offers(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/affiliates/offers/all?projectId=${projectId}`)
      return response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single offer
 */
export function useAffiliateOffer(id, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.offerDetail(id),
    queryFn: async () => {
      const response = await portalApi.get(`/affiliates/offers/${id}`)
      return response.data?.offer || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create offer
 */
export function useCreateAffiliateOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post('/affiliates/offers', { ...data, projectId })
      return response.data?.offer || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.offers(projectId) })
    },
  })
}

/**
 * Update offer
 */
export function useUpdateAffiliateOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.patch(`/affiliates/offers/${id}`, data)
      return { ...(response.data?.offer || response.data), projectId }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(affiliatesKeys.offerDetail(id), data)
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: affiliatesKeys.offers(data.projectId) })
      }
    },
  })
}

/**
 * Delete offer
 */
export function useDeleteAffiliateOffer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/affiliates/offers/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.removeQueries({ queryKey: affiliatesKeys.offerDetail(id) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: affiliatesKeys.offers(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch clicks for an affiliate
 */
export function useAffiliateClicks(projectId, affiliateId, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.clicks(projectId, affiliateId),
    queryFn: async () => {
      const response = await portalApi.get(`/affiliates/${affiliateId}/clicks?projectId=${projectId}`)
      return response.data || []
    },
    enabled: !!projectId && !!affiliateId,
    ...options,
  })
}

/**
 * Fetch conversions for an affiliate
 */
export function useAffiliateConversions(projectId, affiliateId, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.conversions(projectId, affiliateId),
    queryFn: async () => {
      const response = await portalApi.get(`/affiliates/${affiliateId}/conversions?projectId=${projectId}`)
      return response.data || []
    },
    enabled: !!projectId && !!affiliateId,
    ...options,
  })
}

/**
 * Fetch affiliate stats
 */
export function useAffiliateStats(projectId, affiliateId, options = {}) {
  return useQuery({
    queryKey: affiliatesKeys.stats(projectId, affiliateId),
    queryFn: async () => {
      const response = await portalApi.get(`/affiliates/${affiliateId}/stats?projectId=${projectId}`)
      return response.data
    },
    enabled: !!projectId && !!affiliateId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Record a conversion
 */
export function useRecordAffiliateConversion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, affiliateId, data }) => {
      const response = await portalApi.post(`/affiliates/${affiliateId}/conversions`, { ...data, projectId })
      return { ...(response.data || {}), projectId, affiliateId }
    },
    onSuccess: ({ projectId, affiliateId }) => {
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.conversions(projectId, affiliateId) })
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.stats(projectId, affiliateId) })
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.detail(affiliateId) })
    },
  })
}

/** Alias for backwards compatibility */
export { useAffiliateOffers as useOffers, useAffiliateConversions as useConversions }
