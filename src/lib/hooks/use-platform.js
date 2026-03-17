/**
 * Platform Query Hooks
 *
 * TanStack Query hooks for Platform (SaaS management) module.
 * Only accessible to platform admins (isPlatformAdmin / isSuperAdmin).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import portalApi from '@/lib/portal-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const platformKeys = {
  all: ['platform'],
  tenants: (filters) => ['platform', 'tenants', filters],
  tenant: (id) => ['platform', 'tenant', id],
  revenue: () => ['platform', 'revenue'],
  onboarding: () => ['platform', 'onboarding'],
  health: () => ['platform', 'health'],
  admins: () => ['platform', 'admins'],
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all tenants (organizations) with optional filters
 */
export function useTenants(filters = {}) {
  return useQuery({
    queryKey: platformKeys.tenants(filters),
    queryFn: async () => {
      const response = await portalApi.get('/platform/tenants', { params: filters })
      const data = response.data || response
      return data
    },
  })
}

/**
 * Fetch a single tenant's detail (org, projects, members, billing)
 */
export function useTenantDetail(id) {
  return useQuery({
    queryKey: platformKeys.tenant(id),
    queryFn: async () => {
      const response = await portalApi.get(`/platform/tenants/${id}`)
      const data = response.data || response
      return data
    },
    enabled: !!id,
  })
}

/**
 * Fetch platform-wide revenue metrics
 */
export function useRevenue() {
  return useQuery({
    queryKey: platformKeys.revenue(),
    queryFn: async () => {
      const response = await portalApi.get('/platform/revenue')
      const data = response.data || response
      return data
    },
  })
}

/**
 * Fetch onboarding pipeline data
 */
export function useOnboarding() {
  return useQuery({
    queryKey: platformKeys.onboarding(),
    queryFn: async () => {
      const response = await portalApi.get('/platform/onboarding')
      const data = response.data || response
      return data
    },
  })
}

/**
 * Fetch tenant health scores
 */
export function useHealth() {
  return useQuery({
    queryKey: platformKeys.health(),
    queryFn: async () => {
      const response = await portalApi.get('/platform/health')
      const data = response.data || response
      return data
    },
  })
}

/**
 * Fetch platform admin users
 */
export function usePlatformAdmins() {
  return useQuery({
    queryKey: platformKeys.admins(),
    queryFn: async () => {
      const response = await portalApi.get('/platform/admins')
      const data = response.data || response
      return data
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Update a tenant's billing plan
 */
export function useUpdateTenantPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tenantId, plan }) => {
      const response = await portalApi.patch(`/platform/tenants/${tenantId}/plan`, { plan })
      return response.data || response
    },
    onSuccess: (data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: platformKeys.tenant(tenantId) })
      queryClient.invalidateQueries({ queryKey: platformKeys.tenants({}) })
      queryClient.invalidateQueries({ queryKey: platformKeys.revenue() })
    },
  })
}

/**
 * Update a tenant's status (active, suspended, churned, etc.)
 */
export function useUpdateTenantStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tenantId, status }) => {
      const response = await portalApi.patch(`/platform/tenants/${tenantId}/status`, { status })
      return response.data || response
    },
    onSuccess: (data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: platformKeys.tenant(tenantId) })
      queryClient.invalidateQueries({ queryKey: platformKeys.tenants({}) })
      queryClient.invalidateQueries({ queryKey: platformKeys.health() })
    },
  })
}

/**
 * Add a platform admin user
 */
export function useAddPlatformAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, role }) => {
      const response = await portalApi.post('/platform/admins', { email, role })
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.admins() })
    },
  })
}

/**
 * Remove a platform admin user
 */
export function useRemovePlatformAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adminId) => {
      const response = await portalApi.delete(`/platform/admins/${adminId}`)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.admins() })
    },
  })
}

/**
 * Invite a new agency/organization to the platform
 */
export function useInviteAgency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteData) => {
      const response = await portalApi.post('/platform/tenants/invite', inviteData)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.tenants({}) })
      queryClient.invalidateQueries({ queryKey: platformKeys.onboarding() })
    },
  })
}
