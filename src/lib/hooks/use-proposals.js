/**
 * Proposals Query Hooks
 * 
 * TanStack Query hooks for Proposals module.
 * Replaces proposals-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proposalsApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const proposalsKeys = {
  all: ['proposals'],
  list: (filters) => [...proposalsKeys.all, 'list', filters],
  detail: (id) => [...proposalsKeys.all, 'detail', id],
  templates: () => [...proposalsKeys.all, 'templates'],
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPOSALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch proposals list
 */
export function useProposals(filters = {}, options = {}) {
  return useQuery({
    queryKey: proposalsKeys.list(filters),
    queryFn: async () => {
      const response = await proposalsApi.list({ limit: 100, ...filters })
      const data = response.data || response
      return {
        proposals: data.proposals || data,
        total: data.total,
      }
    },
    ...options,
  })
}

/**
 * Fetch single proposal
 */
export function useProposal(id, options = {}) {
  return useQuery({
    queryKey: proposalsKeys.detail(id),
    queryFn: async () => {
      const response = await proposalsApi.get(id)
      const data = response.data || response
      return data.proposal || data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Fetch proposal templates
 */
export function useProposalTemplates(options = {}) {
  return useQuery({
    queryKey: proposalsKeys.templates(),
    queryFn: async () => {
      const response = await proposalsApi.listTemplates()
      const data = response.data || response
      return data.templates || data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Create proposal
 */
export function useCreateProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (proposalData) => {
      const response = await proposalsApi.create(proposalData)
      const data = response.data || response
      return data.proposal || data
    },
    onSuccess: (newProposal) => {
      queryClient.setQueryData(proposalsKeys.detail(newProposal.id), newProposal)
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Update proposal
 */
export function useUpdateProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await proposalsApi.update(id, data)
      const result = response.data || response
      return result.proposal || result
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(proposalsKeys.detail(id), updated)
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Delete proposal
 */
export function useDeleteProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      await proposalsApi.delete(id)
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: proposalsKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Send proposal to recipients
 */
export function useSendProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, sendData }) => {
      // Normalize recipients to always be an array
      const normalizedData = {
        ...sendData,
        recipients: Array.isArray(sendData.recipients) 
          ? sendData.recipients 
          : sendData.email 
            ? [sendData.email] 
            : sendData.recipients
      }
      const response = await proposalsApi.send(id, normalizedData)
      return response.data || response
    },
    onSuccess: (result, { id }) => {
      if (result.proposal) {
        queryClient.setQueryData(proposalsKeys.detail(id), result.proposal)
      }
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Clone proposal
 */
export function useCloneProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await proposalsApi.clone(id)
      const data = response.data || response
      return data.proposal || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Archive proposal
 */
export function useArchiveProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await proposalsApi.archive(id)
      const data = response.data || response
      return data.proposal || data
    },
    onSuccess: (updated, id) => {
      queryClient.setQueryData(proposalsKeys.detail(id), updated)
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Restore archived proposal
 */
export function useRestoreProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await proposalsApi.restore(id)
      const data = response.data || response
      return data.proposal || data
    },
    onSuccess: (updated, id) => {
      queryClient.setQueryData(proposalsKeys.detail(id), updated)
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Accept proposal (client action)
 */
export function useAcceptProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, acceptanceData }) => {
      const response = await proposalsApi.accept(id, acceptanceData)
      const data = response.data || response
      return data.proposal || data
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(proposalsKeys.detail(id), updated)
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}

/**
 * Decline proposal (client action)
 */
export function useDeclineProposal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, declineData }) => {
      const response = await proposalsApi.decline(id, declineData)
      const data = response.data || response
      return data.proposal || data
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(proposalsKeys.detail(id), updated)
      queryClient.invalidateQueries({ queryKey: proposalsKeys.all })
    },
  })
}
