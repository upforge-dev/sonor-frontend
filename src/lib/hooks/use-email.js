/**
 * Email Platform Query Hooks
 * 
 * TanStack Query hooks for Email Marketing module.
 * Replaces email-platform-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emailApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const emailKeys = {
  all: ['email'],
  settings: (projectId) => [...emailKeys.all, 'settings', projectId],
  campaigns: () => [...emailKeys.all, 'campaigns'],
  campaignsList: (projectId, filters) => [...emailKeys.campaigns(), 'list', projectId, filters],
  campaignDetail: (id) => [...emailKeys.campaigns(), 'detail', id],
  templates: (projectId) => [...emailKeys.all, 'templates', projectId],
  systemTemplates: () => [...emailKeys.all, 'systemTemplates'],
  subscribers: () => [...emailKeys.all, 'subscribers'],
  subscribersList: (projectId, filters) => [...emailKeys.subscribers(), 'list', projectId, filters],
  subscriberDetail: (id) => [...emailKeys.subscribers(), 'detail', id],
  lists: (projectId) => [...emailKeys.all, 'lists', projectId],
  automations: (projectId) => [...emailKeys.all, 'automations', projectId],
  automationDetail: (id) => [...emailKeys.all, 'automationDetail', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch email settings
 */
export function useEmailSettings(projectId, options = {}) {
  return useQuery({
    queryKey: emailKeys.settings(projectId),
    queryFn: async () => {
      const response = await emailApi.getSettings(projectId)
      return response.data?.settings || response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Update email settings
 */
export function useUpdateEmailSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, settings }) => {
      const response = await emailApi.updateSettings(projectId, settings)
      return response.data?.settings || response.data
    },
    onSuccess: (data, { projectId }) => {
      queryClient.setQueryData(emailKeys.settings(projectId), data)
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch campaigns list
 */
export function useEmailCampaigns(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: emailKeys.campaignsList(projectId, filters),
    queryFn: async () => {
      const response = await emailApi.listCampaigns(projectId, filters)
      const data = response.data
      return {
        campaigns: data.campaigns || data || [],
        total: data.total || 0,
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single campaign
 */
export function useEmailCampaign(id, options = {}) {
  return useQuery({
    queryKey: emailKeys.campaignDetail(id),
    queryFn: async () => {
      const response = await emailApi.getCampaign(id)
      return response.data?.campaign || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create campaign
 */
export function useCreateEmailCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await emailApi.createCampaign(projectId, data)
      return response.data?.campaign || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns() })
    },
  })
}

/**
 * Update campaign
 */
export function useUpdateEmailCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await emailApi.updateCampaign(id, data)
      return { ...(response.data?.campaign || response.data), projectId }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(emailKeys.campaignDetail(id), data)
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns() })
    },
  })
}

/**
 * Delete campaign
 */
export function useDeleteEmailCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await emailApi.deleteCampaign(id)
      return { id, projectId }
    },
    onSuccess: ({ id }) => {
      queryClient.removeQueries({ queryKey: emailKeys.campaignDetail(id) })
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns() })
    },
  })
}

/**
 * Send campaign
 */
export function useSendEmailCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const response = await emailApi.sendCampaign(id)
      return { ...(response.data || {}), projectId }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.campaignDetail(id) })
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns() })
    },
  })
}

/**
 * Schedule campaign
 */
export function useScheduleEmailCampaign() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, scheduledFor }) => {
      const response = await emailApi.scheduleCampaign(id, scheduledFor)
      return response.data?.campaign || response.data
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(emailKeys.campaignDetail(id), data)
      queryClient.invalidateQueries({ queryKey: emailKeys.campaigns() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch templates
 */
export function useEmailTemplates(projectId, options = {}) {
  return useQuery({
    queryKey: emailKeys.templates(projectId),
    queryFn: async () => {
      const response = await emailApi.listTemplates(projectId)
      return response.data?.templates || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Fetch system templates (starters)
 */
export function useSystemEmailTemplates(options = {}) {
  return useQuery({
    queryKey: emailKeys.systemTemplates(),
    queryFn: async () => {
      const response = await emailApi.listSystemTemplates()
      return response.data?.templates || response.data || []
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

/**
 * Create template
 */
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await emailApi.createTemplate(projectId, data)
      return response.data?.template || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.templates(projectId) })
    },
  })
}

/**
 * Update template
 */
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await emailApi.updateTemplate(id, data)
      return { ...(response.data?.template || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.templates(data.projectId) })
      }
    },
  })
}

/**
 * Delete template
 */
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await emailApi.deleteTemplate(id)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.templates(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIBERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch subscribers
 */
export function useEmailSubscribers(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: emailKeys.subscribersList(projectId, filters),
    queryFn: async () => {
      const response = await emailApi.listSubscribers({
        projectId,
        limit: 500,
        ...filters,
      })
      const data = response.data || {}
      const subscribers = data.subscribers || []
      return {
        subscribers,
        total: typeof data.total === 'number' ? data.total : subscribers.length,
        pagination: {
          total: data.total,
          limit: data.limit,
          offset: data.offset,
        },
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create subscriber
 */
export function useCreateEmailSubscriber() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await emailApi.createSubscriber({ ...data, ...(projectId ? { projectId } : {}) })
      return response.data?.subscriber || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.subscribers() })
    },
  })
}

/**
 * Update subscriber
 */
export function useUpdateEmailSubscriber() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await emailApi.updateSubscriber(id, data)
      return { ...(response.data?.subscriber || response.data), projectId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.subscribers() })
    },
  })
}

/**
 * Delete subscriber
 */
export function useDeleteEmailSubscriber() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await emailApi.deleteSubscriber(id)
      return { id, projectId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.subscribers() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch lists
 */
export function useEmailLists(projectId, options = {}) {
  return useQuery({
    queryKey: emailKeys.lists(projectId),
    queryFn: async () => {
      const response = await emailApi.listLists(projectId)
      return response.data?.lists || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Create list
 */
export function useCreateEmailList() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await emailApi.createList(projectId, data)
      return response.data?.list || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.lists(projectId) })
    },
  })
}

/**
 * Update list
 */
export function useUpdateEmailList() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await emailApi.updateList(id, data)
      return { ...(response.data?.list || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.lists(data.projectId) })
      }
    },
  })
}

/**
 * Delete list
 */
export function useDeleteEmailList() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await emailApi.deleteList(id)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.lists(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOMATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch automations
 */
export function useEmailAutomations(projectId, options = {}) {
  return useQuery({
    queryKey: emailKeys.automations(projectId),
    queryFn: async () => {
      const response = await emailApi.listAutomations(projectId)
      return response.data?.automations || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single automation
 */
export function useEmailAutomation(id, options = {}) {
  return useQuery({
    queryKey: emailKeys.automationDetail(id),
    queryFn: async () => {
      const response = await emailApi.getAutomation(id)
      return response.data?.automation || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create automation
 */
export function useCreateEmailAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await emailApi.createAutomation(projectId, data)
      return response.data?.automation || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.automations(projectId) })
    },
  })
}

/**
 * Update automation
 */
export function useUpdateEmailAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await emailApi.updateAutomation(id, data)
      return { ...(response.data?.automation || response.data), projectId }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(emailKeys.automationDetail(id), data)
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.automations(data.projectId) })
      }
    },
  })
}

/**
 * Toggle automation active status
 */
export function useToggleEmailAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, isActive }) => {
      const response = await emailApi.toggleAutomation(id, isActive)
      return { ...(response.data?.automation || response.data), projectId }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(emailKeys.automationDetail(id), data)
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.automations(data.projectId) })
      }
    },
  })
}

/**
 * Delete automation
 */
export function useDeleteEmailAutomation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await emailApi.deleteAutomation(id)
      return { id, projectId }
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.removeQueries({ queryKey: emailKeys.automationDetail(id) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: emailKeys.automations(projectId) })
      }
    },
  })
}
