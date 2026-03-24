/**
 * Team Query Hooks
 * 
 * TanStack Query hooks for Team management.
 * Replaces team-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const teamKeys = {
  all: ['team'],
  members: () => [...teamKeys.all, 'members'],
  detail: (id) => [...teamKeys.all, 'detail', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM MEMBERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all team members
 */
export function useTeamMembers(options = {}) {
  return useQuery({
    queryKey: teamKeys.members(),
    queryFn: async () => {
      const response = await adminApi.listTeamMembers()
      const data = response.data || response
      return {
        members: data.teamMembers || data.members || data || [],
        summary: data.summary || null,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Create team member
 */
export function useCreateTeamMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (memberData) => {
      const response = await adminApi.createTeamMember(memberData)
      const data = response.data || response
      return data.teamMember || data.member || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() })
    },
  })
}

/**
 * Update team member
 */
export function useUpdateTeamMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await adminApi.updateTeamMember(id, updates)
      const data = response.data || response
      return data.teamMember || data.member || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() })
    },
  })
}

/**
 * Resend invite to a pending team member
 */
export function useResendInvite() {
  return useMutation({
    mutationFn: async (id) => {
      const response = await adminApi.resendInvite(id)
      return response.data || response
    },
  })
}

/**
 * Set team member status (activate/deactivate)
 */
export function useSetTeamMemberStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await adminApi.setTeamMemberStatus(id, status)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() })
    },
  })
}

/**
 * Delete team member
 */
export function useDeleteTeamMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      await adminApi.deleteTeamMember(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members() })
    },
  })
}
