/**
 * Commerce Query Hooks
 * 
 * TanStack Query hooks for Commerce module.
 * Replaces commerce-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import portalApi from '../portal-api'
import { supabase } from '../supabase'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const commerceKeys = {
  all: ['commerce'],
  settings: (projectId) => [...commerceKeys.all, 'settings', projectId],
  dashboard: (projectId) => [...commerceKeys.all, 'dashboard', projectId],
  categories: (projectId) => [...commerceKeys.all, 'categories', projectId],
  offerings: () => [...commerceKeys.all, 'offerings'],
  offeringsList: (projectId, filters) => [...commerceKeys.offerings(), 'list', projectId, filters],
  offeringDetail: (offeringId) => [...commerceKeys.offerings(), 'detail', offeringId],
  variants: (offeringId) => [...commerceKeys.all, 'variants', offeringId],
  schedules: (offeringId) => [...commerceKeys.all, 'schedules', offeringId],
  sales: () => [...commerceKeys.all, 'sales'],
  salesList: (projectId, filters) => [...commerceKeys.sales(), 'list', projectId, filters],
  saleDetail: (saleId) => [...commerceKeys.sales(), 'detail', saleId],
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export function useCommerceSettings(projectId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.settings(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/settings/${projectId}`)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

export function useUpdateCommerceSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, settings }) => {
      const response = await portalApi.put(`/commerce/settings/${projectId}`, settings)
      return response.data
    },
    onSuccess: (data, { projectId }) => {
      queryClient.setQueryData(commerceKeys.settings(projectId), data)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export function useCommerceDashboard(projectId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.dashboard(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/dashboard/${projectId}`)
      return response.data
    },
    enabled: !!projectId,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export function useCategories(projectId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.categories(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/categories/${projectId}`)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFERINGS
// ═══════════════════════════════════════════════════════════════════════════

export function useOfferings(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: commerceKeys.offeringsList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value)
        }
      })
      const response = await portalApi.get(`/commerce/offerings/${projectId}?${params}`)
      return response.data
    },
    enabled: !!projectId,
    ...options,
  })
}

export function useOffering(offeringId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.offeringDetail(offeringId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/offering/${offeringId}`)
      return response.data
    },
    enabled: !!offeringId,
    ...options,
  })
}

export function useCreateOffering() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/commerce/offerings/${projectId}`, data)
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.offerings() })
      queryClient.invalidateQueries({ queryKey: commerceKeys.dashboard(projectId) })
    },
  })
}

export function useUpdateOffering() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId, data }) => {
      const response = await portalApi.put(`/commerce/offering/${offeringId}`, data)
      return response.data
    },
    onSuccess: (data, { offeringId }) => {
      queryClient.setQueryData(commerceKeys.offeringDetail(offeringId), data)
      queryClient.invalidateQueries({ queryKey: commerceKeys.offerings() })
    },
  })
}

export function useDeleteOffering() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId }) => {
      const response = await portalApi.delete(`/commerce/offering/${offeringId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.offerings() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFERING IMAGES
// ═══════════════════════════════════════════════════════════════════════════

export function useUploadOfferingImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId, file, isFeatured = false }) => {
      // Generate unique file ID and path
      const fileId = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `commerce/${offeringId}/${fileId}.${ext}`
      
      // Upload directly to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(storagePath)
      
      // Register the file with the API
      const response = await portalApi.post(`/commerce/offering/${offeringId}/images/register`, {
        fileId,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storagePath,
        publicUrl: urlData.publicUrl,
        isFeatured
      })
      return response.data
    },
    onSuccess: (_, { offeringId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(offeringId) })
    },
  })
}

export function useDeleteOfferingImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId, fileId }) => {
      const response = await portalApi.delete(`/commerce/offering/${offeringId}/images/${fileId}`)
      return response.data
    },
    onSuccess: (_, { offeringId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(offeringId) })
    },
  })
}

export function useSetFeaturedImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId, fileId }) => {
      const response = await portalApi.put(`/commerce/offering/${offeringId}/images/${fileId}/featured`)
      return response.data
    },
    onSuccess: (_, { offeringId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(offeringId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

export function useVariants(offeringId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.variants(offeringId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/variants/${offeringId}`)
      return response.data
    },
    enabled: !!offeringId,
    ...options,
  })
}

export function useCreateVariant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId, data }) => {
      const response = await portalApi.post(`/commerce/variants/${offeringId}`, data)
      return response.data
    },
    onSuccess: (_, { offeringId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.variants(offeringId) })
      queryClient.invalidateQueries({ queryKey: commerceKeys.offeringDetail(offeringId) })
    },
  })
}

export function useUpdateVariant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ variantId, data, offeringId }) => {
      const response = await portalApi.put(`/commerce/variant/${variantId}`, data)
      return { ...response.data, offeringId }
    },
    onSuccess: (data) => {
      if (data.offeringId) {
        queryClient.invalidateQueries({ queryKey: commerceKeys.variants(data.offeringId) })
      }
    },
  })
}

export function useDeleteVariant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ variantId, offeringId }) => {
      const response = await portalApi.delete(`/commerce/variant/${variantId}`)
      return { ...response.data, offeringId }
    },
    onSuccess: (data) => {
      if (data.offeringId) {
        queryClient.invalidateQueries({ queryKey: commerceKeys.variants(data.offeringId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULES
// ═══════════════════════════════════════════════════════════════════════════

export function useSchedules(offeringId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.schedules(offeringId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/schedules/${offeringId}`)
      return response.data
    },
    enabled: !!offeringId,
    ...options,
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ offeringId, data }) => {
      const response = await portalApi.post(`/commerce/schedules/${offeringId}`, data)
      return response.data
    },
    onSuccess: (_, { offeringId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.schedules(offeringId) })
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ scheduleId, data, offeringId }) => {
      const response = await portalApi.put(`/commerce/schedule/${scheduleId}`, data)
      return { ...response.data, offeringId }
    },
    onSuccess: (data) => {
      if (data.offeringId) {
        queryClient.invalidateQueries({ queryKey: commerceKeys.schedules(data.offeringId) })
      }
    },
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ scheduleId, offeringId }) => {
      const response = await portalApi.delete(`/commerce/schedule/${scheduleId}`)
      return { ...response.data, offeringId }
    },
    onSuccess: (data) => {
      if (data.offeringId) {
        queryClient.invalidateQueries({ queryKey: commerceKeys.schedules(data.offeringId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════════════════════════════════════

export function useSales(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: commerceKeys.salesList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value)
        }
      })
      const response = await portalApi.get(`/commerce/sales/${projectId}?${params}`)
      return response.data
    },
    enabled: !!projectId,
    ...options,
  })
}

export function useSale(saleId, options = {}) {
  return useQuery({
    queryKey: commerceKeys.saleDetail(saleId),
    queryFn: async () => {
      const response = await portalApi.get(`/commerce/sale/${saleId}`)
      return response.data
    },
    enabled: !!saleId,
    ...options,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/commerce/sales/${projectId}`, data)
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commerceKeys.sales() })
      queryClient.invalidateQueries({ queryKey: commerceKeys.dashboard(projectId) })
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ saleId, data }) => {
      const response = await portalApi.put(`/commerce/sale/${saleId}`, data)
      return response.data
    },
    onSuccess: (data, { saleId }) => {
      queryClient.setQueryData(commerceKeys.saleDetail(saleId), data)
      queryClient.invalidateQueries({ queryKey: commerceKeys.sales() })
    },
  })
}
