/**
 * Users Query Hooks
 * 
 * TanStack Query hooks for Users/Members management.
 * Replaces users-store.js with automatic caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../portal-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const usersKeys = {
  all: ['users'],
  orgMembers: (orgId) => [...usersKeys.all, 'orgMembers', orgId],
  projectMembers: (projectId) => [...usersKeys.all, 'projectMembers', projectId],
  user: (id) => [...usersKeys.all, 'user', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIZATION MEMBERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch organization members
 */
export function useOrgMembers(organizationId, options = {}) {
  return useQuery({
    queryKey: usersKeys.orgMembers(organizationId),
    queryFn: async () => {
      const response = await adminApi.listOrgMembers(organizationId)
      const data = response.data || response
      console.log('[useOrgMembers] Response:', { organizationId, response, data })
      return data.members || data || []
    },
    enabled: !!organizationId,
    ...options,
  })
}

/**
 * Invite organization member
 */
export function useInviteOrgMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ organizationId, email, name, role, accessLevel, projectIds }) => {
      const response = await adminApi.addOrgMember(organizationId, { 
        email, 
        name: name || email.split('@')[0],
        role,
        accessLevel: accessLevel || 'organization',
        projectIds: projectIds || [],
      })
      return response.data || response
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.orgMembers(organizationId) })
    },
  })
}

/**
 * Update organization member role
 */
export function useUpdateOrgMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ organizationId, userId, role }) => {
      const response = await adminApi.updateOrgMember(organizationId, userId, { role })
      return response.data || response
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.orgMembers(organizationId) })
    },
  })
}

/**
 * Remove organization member.
 * Pass contactId (member.contact?.id) — API expects contact ID, not the member row id.
 */
export function useRemoveOrgMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ organizationId, contactId }) => {
      await adminApi.removeOrgMember(organizationId, contactId)
      return { organizationId, contactId }
    },
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.orgMembers(organizationId) })
    },
  })
}

/**
 * Resend invitation email for a pending organization member.
 */
export function useResendOrgMemberInvite() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ organizationId, contactId }) => {
      await adminApi.resendOrgMemberInvite(organizationId, contactId)
      return { organizationId, contactId }
    },
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.orgMembers(organizationId) })
    },
  })
}

/**
 * Update organization member role.
 * Pass contactId (member.contact?.id) — API expects contact ID in the URL.
 */
export function useUpdateOrgMemberRole() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ organizationId, contactId, role }) => {
      await adminApi.updateOrgMember(organizationId, contactId, { role })
      return { organizationId, contactId, role }
    },
    onSuccess: ({ organizationId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.orgMembers(organizationId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT MEMBERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch project members
 */
export function useProjectMembers(projectId, options = {}) {
  return useQuery({
    queryKey: usersKeys.projectMembers(projectId),
    queryFn: async () => {
      const response = await adminApi.listProjectMembers(projectId)
      const data = response.data || response
      return data.members || data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Add project member
 */
export function useAddProjectMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, userId, role }) => {
      const response = await adminApi.addProjectMember(projectId, { userId, role })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.projectMembers(projectId) })
    },
  })
}

/**
 * Update project member role
 */
export function useUpdateProjectMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, userId, role }) => {
      const response = await adminApi.updateProjectMember(projectId, userId, { role })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.projectMembers(projectId) })
    },
  })
}

/**
 * Remove project member
 */
export function useRemoveProjectMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, userId }) => {
      await adminApi.removeProjectMember(projectId, userId)
      return { projectId, userId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.projectMembers(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch user profile
 */
export function useUser(userId, options = {}) {
  return useQuery({
    queryKey: usersKeys.user(userId),
    queryFn: async () => {
      const response = await adminApi.getUser(userId)
      return response.data?.user || response.data
    },
    enabled: !!userId,
    ...options,
  })
}

/**
 * Update user profile
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, data }) => {
      const response = await adminApi.updateUser(userId, data)
      return response.data?.user || response.data
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(usersKeys.user(userId), data)
    },
  })
}
