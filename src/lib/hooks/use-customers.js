/**
 * Customers Query Hooks
 * 
 * TanStack Query hooks for Commerce customers (used by Commerce module, not standalone Customers).
 * Backend: commerce/customers (sonor-api-nestjs).
 * 
 * Customers = people who have purchased (post-sale). Auto-created from commerce_sales.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import portalApi from '../sonor-api'

const CUSTOMERS_BASE = '/commerce/customers'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const customersKeys = {
  all: ['customers'],
  stats: (projectId) => [...customersKeys.all, 'stats', projectId],
  list: (projectId, filters) => [...customersKeys.all, 'list', projectId, filters],
  detail: (projectId, customerId) => [...customersKeys.all, 'detail', projectId, customerId],
  purchases: (projectId, customerId) => [...customersKeys.all, 'purchases', projectId, customerId],
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch customer stats for a project
 */
export function useCustomerStats(projectId, options = {}) {
  return useQuery({
    queryKey: customersKeys.stats(projectId),
    queryFn: async () => {
      try {
        const response = await portalApi.get(`${CUSTOMERS_BASE}/${projectId}/stats`)
        return response.data
      } catch (error) {
        // Return default stats if endpoint doesn't exist yet
        console.warn('[Customers] Stats endpoint not available:', error.message)
        return {
          totalCustomers: 0,
          totalRevenue: 0,
          repeatRate: 0,
          newCustomers30d: 0,
        }
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch customers list
 */
export function useCustomers(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: customersKeys.list(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value)
          }
        }
      })
      const response = await portalApi.get(`${CUSTOMERS_BASE}/${projectId}?${params}`)
      const result = response.data
      // Handle both array and paginated response
      const customers = Array.isArray(result) ? result : result.data || []
      const totalCount = result.total || customers.length
      return { customers, totalCount }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single customer
 */
export function useCustomer(projectId, customerId, options = {}) {
  return useQuery({
    queryKey: customersKeys.detail(projectId, customerId),
    queryFn: async () => {
      const response = await portalApi.get(`${CUSTOMERS_BASE}/${projectId}/${customerId}`)
      return response.data
    },
    enabled: !!projectId && !!customerId,
    ...options,
  })
}

/**
 * Fetch customer purchases
 */
export function useCustomerPurchases(projectId, customerId, options = {}) {
  return useQuery({
    queryKey: customersKeys.purchases(projectId, customerId),
    queryFn: async () => {
      const response = await portalApi.get(`${CUSTOMERS_BASE}/${projectId}/${customerId}/purchases`)
      return response.data
    },
    enabled: !!projectId && !!customerId,
    ...options,
  })
}

/**
 * Create customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`${CUSTOMERS_BASE}/${projectId}`, data)
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.list(projectId, {}) })
      queryClient.invalidateQueries({ queryKey: customersKeys.stats(projectId) })
    },
  })
}

/**
 * Update customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, customerId, data }) => {
      const response = await portalApi.put(`${CUSTOMERS_BASE}/${projectId}/${customerId}`, data)
      return response.data
    },
    onSuccess: (data, { projectId, customerId }) => {
      queryClient.setQueryData(customersKeys.detail(projectId, customerId), data)
      queryClient.invalidateQueries({ queryKey: customersKeys.list(projectId, {}) })
    },
  })
}

/**
 * Delete customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, customerId }) => {
      await portalApi.delete(`${CUSTOMERS_BASE}/${projectId}/${customerId}`)
      return { projectId, customerId }
    },
    onSuccess: ({ projectId, customerId }) => {
      queryClient.removeQueries({ queryKey: customersKeys.detail(projectId, customerId) })
      queryClient.invalidateQueries({ queryKey: customersKeys.list(projectId, {}) })
      queryClient.invalidateQueries({ queryKey: customersKeys.stats(projectId) })
    },
  })
}

/**
 * Add tag to customer
 */
export function useAddCustomerTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, customerId, tag }) => {
      const response = await portalApi.post(`${CUSTOMERS_BASE}/${projectId}/${customerId}/tags`, { tag })
      return response.data
    },
    onSuccess: (data, { projectId, customerId }) => {
      queryClient.setQueryData(customersKeys.detail(projectId, customerId), data)
      queryClient.invalidateQueries({ queryKey: customersKeys.list(projectId, {}) })
    },
  })
}

/**
 * Remove tag from customer
 */
export function useRemoveCustomerTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, customerId, tag }) => {
      const response = await portalApi.delete(`${CUSTOMERS_BASE}/${projectId}/${customerId}/tags/${encodeURIComponent(tag)}`)
      return response.data
    },
    onSuccess: (data, { projectId, customerId }) => {
      queryClient.setQueryData(customersKeys.detail(projectId, customerId), data)
      queryClient.invalidateQueries({ queryKey: customersKeys.list(projectId, {}) })
    },
  })
}

/**
 * Add note to customer
 */
export function useAddCustomerNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, customerId, note }) => {
      const response = await portalApi.post(`${CUSTOMERS_BASE}/${projectId}/${customerId}/notes`, { note })
      return response.data
    },
    onSuccess: (_, { projectId, customerId }) => {
      queryClient.invalidateQueries({ queryKey: customersKeys.detail(projectId, customerId) })
    },
  })
}
