/**
 * Billing Query Hooks
 * 
 * TanStack Query hooks for Billing module.
 * Replaces billing-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const billingKeys = {
  all: ['billing'],
  invoices: () => [...billingKeys.all, 'invoices'],
  invoicesList: (filters) => [...billingKeys.invoices(), 'list', filters],
  invoiceDetail: (id) => [...billingKeys.invoices(), 'detail', id],
  summary: (orgId) => [...billingKeys.all, 'summary', orgId],
  overdue: (orgId) => [...billingKeys.all, 'overdue', orgId],
  paymentMethods: (orgId) => [...billingKeys.all, 'paymentMethods', orgId],
  subscription: (orgId) => [...billingKeys.all, 'subscription', orgId],
  seats: (orgId) => [...billingKeys.all, 'seats', orgId],
}

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch invoices list with filtering
 */
export function useInvoices(filters = {}, options = {}) {
  return useQuery({
    queryKey: billingKeys.invoicesList(filters),
    queryFn: async () => {
      // For Billing module, only show invoices sent FROM Sonor TO client
      const params = {
        ...filters,
        recipientView: filters.recipientView !== false ? true : filters.recipientView,
        showInBilling: filters.showInBilling !== false ? true : filters.showInBilling,
      }
      const response = await billingApi.listInvoices(params)
      const data = response.data || response
      return {
        invoices: data.invoices || data,
        pagination: data.pagination,
      }
    },
    ...options,
  })
}

/**
 * Fetch single invoice
 */
export function useInvoice(invoiceId, options = {}) {
  return useQuery({
    queryKey: billingKeys.invoiceDetail(invoiceId),
    queryFn: async () => {
      const response = await billingApi.getInvoice(invoiceId)
      const data = response.data || response
      return data.invoice || data
    },
    enabled: !!invoiceId,
    ...options,
  })
}

/**
 * Create invoice (admin only)
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (invoiceData) => {
      const response = await billingApi.createInvoice(invoiceData)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

/**
 * Update invoice (admin only)
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ invoiceId, invoiceData }) => {
      const response = await billingApi.updateInvoice(invoiceId, invoiceData)
      const data = response.data || response
      return data.invoice || data
    },
    onSuccess: (data, { invoiceId }) => {
      queryClient.setQueryData(billingKeys.invoiceDetail(invoiceId), data)
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

/**
 * Mark invoice as paid (admin only)
 */
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (invoiceId) => {
      const response = await billingApi.markInvoicePaid(invoiceId)
      const data = response.data || response
      return data.invoice || data
    },
    onSuccess: (data, invoiceId) => {
      queryClient.setQueryData(billingKeys.invoiceDetail(invoiceId), data)
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

/**
 * Mark invoice as void (admin only)
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (invoiceId) => {
      const response = await billingApi.voidInvoice(invoiceId)
      const data = response.data || response
      return data.invoice || data
    },
    onSuccess: (data, invoiceId) => {
      queryClient.setQueryData(billingKeys.invoiceDetail(invoiceId), data)
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

/**
 * Delete invoice (admin only)
 * @param {string} invoiceId
 * @param {{ notify?: boolean }} options - pass notify: true to send cancellation email to recipient
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId, notify } = {}) => {
      const params = notify ? { notify: 'true' } : {}
      await billingApi.deleteInvoice(invoiceId, params)
      return invoiceId
    },
    onSuccess: (invoiceId) => {
      queryClient.removeQueries({ queryKey: billingKeys.invoiceDetail(invoiceId) })
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

/**
 * Send invoice via email
 */
export function useSendInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ invoiceId, emailData }) => {
      const response = await billingApi.sendInvoice(invoiceId, emailData)
      return response.data || response
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoiceDetail(invoiceId) })
    },
  })
}

/**
 * Send invoice reminder
 */
export function useSendInvoiceReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId, reminderData }) => {
      const response = await billingApi.sendReminder(invoiceId, reminderData)
      return response.data || response
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoiceDetail(invoiceId) })
    },
  })
}

/**
 * Toggle recurring invoice pause/resume
 */
export function useToggleRecurringPause() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId, paused }) => {
      const response = await billingApi.toggleRecurringPause(invoiceId, paused)
      return response.data || response
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoiceDetail(invoiceId) })
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

/**
 * Send invoice reminder (simple: invoiceId only)
 * Alias for useSendInvoiceReminder with simpler API
 */
export function useSendReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceId) => {
      const response = await billingApi.sendReminder(invoiceId)
      return response.data || response
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoiceDetail(invoiceId) })
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY & OVERDUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch billing summary for an org
 */
export function useBillingSummary(orgId, options = {}) {
  return useQuery({
    queryKey: billingKeys.summary(orgId),
    queryFn: async () => {
      const response = await billingApi.getSummary(orgId)
      return response.data || response
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Fetch overdue invoices for an org
 */
export function useOverdueInvoices(orgId, options = {}) {
  return useQuery({
    queryKey: billingKeys.overdue(orgId),
    queryFn: async () => {
      const response = await billingApi.getOverdue(orgId)
      const data = response.data || response
      return data.invoices || data
    },
    enabled: !!orgId,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch payment methods for an org
 */
export function usePaymentMethods(orgId, options = {}) {
  return useQuery({
    queryKey: billingKeys.paymentMethods(orgId),
    queryFn: async () => {
      const response = await billingApi.getPaymentMethods(orgId)
      const data = response.data || response
      return data.paymentMethods || data
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Add payment method
 */
export function useAddPaymentMethod() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orgId, paymentMethodData }) => {
      const response = await billingApi.addPaymentMethod(orgId, paymentMethodData)
      return response.data || response
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods(orgId) })
    },
  })
}

/**
 * Remove payment method
 */
export function useRemovePaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, paymentMethodId }) => {
      await billingApi.removePaymentMethod(orgId, paymentMethodId)
      return { orgId, paymentMethodId }
    },
    onSuccess: ({ orgId }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods(orgId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION (Sonor → Org billing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch subscription details (plan, projects, seats, billing status)
 */
export function useSubscription(orgId, options = {}) {
  return useQuery({
    queryKey: billingKeys.subscription(orgId),
    queryFn: async () => {
      const { data } = await billingApi.getSubscription()
      return data
    },
    enabled: !!orgId,
    staleTime: 30_000, // 30s — subscription data doesn't change frequently
    ...options,
  })
}

/**
 * Fetch lightweight seat info (current vs included, overage price)
 */
export function useSeatInfo(orgId, options = {}) {
  return useQuery({
    queryKey: billingKeys.seats(orgId),
    queryFn: () => billingApi.getSeatInfo(),
    enabled: !!orgId,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Activate a project (generate API key, start billing)
 */
export function useActivateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, plan }) => {
      const { data } = await billingApi.activateProject(projectId, { plan })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

/**
 * Change a project's plan tier
 */
export function useChangeProjectPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, newPlan }) => {
      const { data } = await billingApi.changeProjectPlan(projectId, { newPlan })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

/**
 * Deactivate a project (revoke keys, remove billing)
 */
export function useDeactivateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId }) => {
      const { data } = await billingApi.deactivateProject(projectId)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

/**
 * Create Stripe Checkout session for new subscription
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ plan, successUrl, cancelUrl }) => {
      const { data } = await billingApi.createCheckout({ plan, successUrl, cancelUrl })
      return data
    },
  })
}

/**
 * Get Stripe Customer Portal URL for managing payment method
 */
export function useManagePaymentMethod() {
  return useMutation({
    mutationFn: async ({ returnUrl } = {}) => {
      const { data } = await billingApi.managePaymentMethod({ returnUrl })
      return data
    },
  })
}

/**
 * Cancel subscription at end of billing period
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await billingApi.cancelSubscription()
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

/**
 * Reactivate a canceled subscription
 * Returns { reactivated: true } or { reactivated: false, checkoutUrl: '...' }
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await billingApi.reactivateSubscription()
      return data
    },
    onSuccess: (data) => {
      if (data?.reactivated) {
        queryClient.invalidateQueries({ queryKey: billingKeys.all })
      }
    },
  })
}
