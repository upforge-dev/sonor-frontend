/**
 * Agency Query Hooks
 *
 * TanStack Query hooks for agency dashboard — managing client orgs.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agenciesApi } from '../portal-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const agencyKeys = {
  all: ['agencies'],
  managedOrgs: () => [...agencyKeys.all, 'managed-orgs'],
  managedOrgsList: (filters) => [...agencyKeys.managedOrgs(), 'list', filters],
  managedOrgDetail: (id) => [...agencyKeys.managedOrgs(), 'detail', id],
  stats: () => [...agencyKeys.all, 'stats'],
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List client orgs managed by the current agency
 */
export function useManagedOrgs(filters = {}, options = {}) {
  return useQuery({
    queryKey: agencyKeys.managedOrgsList(filters),
    queryFn: async () => {
      const { data } = await agenciesApi.listManagedOrgs(filters)
      return data
    },
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Get detail for a specific managed client org
 */
export function useManagedOrgDetail(clientOrgId, options = {}) {
  return useQuery({
    queryKey: agencyKeys.managedOrgDetail(clientOrgId),
    queryFn: async () => {
      const { data } = await agenciesApi.getManagedOrgDetail(clientOrgId)
      return data
    },
    enabled: !!clientOrgId,
    ...options,
  })
}

/**
 * Get aggregate stats for agency's managed orgs
 */
export function useAgencyStats(options = {}) {
  return useQuery({
    queryKey: agencyKeys.stats(),
    queryFn: async () => {
      const { data } = await agenciesApi.getStats()
      return data
    },
    staleTime: 60_000,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new client org under the agency
 */
export function useCreateClientOrg() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orgData) => {
      const { data } = await agenciesApi.createClientOrg(orgData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.managedOrgs() })
      queryClient.invalidateQueries({ queryKey: agencyKeys.stats() })
    },
  })
}
