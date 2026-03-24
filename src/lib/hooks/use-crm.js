/**
 * CRM Query Hooks
 * 
 * TanStack Query hooks for CRM module.
 * Replaces crm-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { crmApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const crmKeys = {
  all: ['crm'],
  prospects: () => [...crmKeys.all, 'prospects'],
  prospectsList: (params) => [...crmKeys.prospects(), 'list', params],
  prospectDetail: (id) => [...crmKeys.prospects(), 'detail', id],
  calls: () => [...crmKeys.all, 'calls'],
  callsList: (params) => [...crmKeys.calls(), 'list', params],
  callDetail: (id) => [...crmKeys.calls(), 'detail', id],
  tasks: () => [...crmKeys.all, 'tasks'],
  tasksList: (params) => [...crmKeys.tasks(), 'list', params],
  followUps: () => [...crmKeys.all, 'followUps'],
  followUpsList: (params) => [...crmKeys.followUps(), 'list', params],
  timeline: (contactId) => [...crmKeys.all, 'timeline', contactId],
  attribution: (contactId) => [...crmKeys.all, 'attribution', contactId],
  attributionStats: (days) => [...crmKeys.all, 'attributionStats', days],
  teamUsers: () => [...crmKeys.all, 'teamUsers'],
  targetCompanies: () => [...crmKeys.all, 'targetCompanies'],
  targetCompaniesList: (params) => [...crmKeys.targetCompanies(), 'list', params],
  targetCompanyDetail: (id) => [...crmKeys.targetCompanies(), 'detail', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// PROSPECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch prospects list with filtering/pagination
 */
export function useProspects(params = {}, options = {}) {
  return useQuery({
    queryKey: crmKeys.prospectsList(params),
    queryFn: async () => {
      const response = await crmApi.listContacts(params)
      const data = response.data || response
      return {
        prospects: data.prospects || data.contacts || data,
        summary: data.summary,
        total: data.total || (Array.isArray(data) ? data.length : 0),
      }
    },
    ...options,
  })
}

/**
 * Fetch single prospect by ID
 */
export function useProspect(id, options = {}) {
  return useQuery({
    queryKey: crmKeys.prospectDetail(id),
    queryFn: async () => {
      const response = await crmApi.getContact(id)
      const data = response.data || response
      return data.prospect || data.contact || data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Update a prospect
 */
export function useUpdateProspect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await crmApi.updateContact(id, updates)
      return response.data || response
    },
    onSuccess: (data, { id }) => {
      // Update the detail cache
      queryClient.setQueryData(crmKeys.prospectDetail(id), data)
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: crmKeys.prospects() })
    },
  })
}

/**
 * Bulk update prospects
 */
export function useBulkUpdateProspects() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ ids, updates }) => {
      const response = await crmApi.bulkUpdateContacts(ids, updates)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.prospects() })
    },
  })
}

/**
 * Convert prospect to customer/opportunity
 */
export function useConvertProspect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      const response = await crmApi.convertProspect(id, options)
      return response.data || response
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: crmKeys.prospectDetail(id) })
      queryClient.invalidateQueries({ queryKey: crmKeys.prospects() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CALLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch calls list
 */
export function useCalls(params = {}, options = {}) {
  return useQuery({
    queryKey: crmKeys.callsList(params),
    queryFn: async () => {
      const response = await crmApi.listCalls(params)
      const data = response.data || response
      return {
        calls: data.calls || data,
        summary: data.summary,
        total: data.total || (Array.isArray(data) ? data.length : 0),
      }
    },
    ...options,
  })
}

/**
 * Fetch single call
 */
export function useCall(id, options = {}) {
  return useQuery({
    queryKey: crmKeys.callDetail(id),
    queryFn: async () => {
      const response = await crmApi.getCall(id)
      return response.data || response
    },
    enabled: !!id,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch tasks list
 */
export function useTasks(params = {}, options = {}) {
  return useQuery({
    queryKey: crmKeys.tasksList(params),
    queryFn: async () => {
      const response = await crmApi.listTasks(params)
      const data = response.data || response
      return {
        tasks: data.tasks || data,
      }
    },
    ...options,
  })
}

/**
 * Update a task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await crmApi.updateTask(id, updates)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.tasks() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch follow-ups list
 */
export function useFollowUps(params = {}, options = {}) {
  return useQuery({
    queryKey: crmKeys.followUpsList(params),
    queryFn: async () => {
      const response = await crmApi.listFollowUps(params)
      const data = response.data || response
      return {
        followUps: data.followUps || data,
      }
    },
    ...options,
  })
}

/**
 * Update a follow-up
 */
export function useUpdateFollowUp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await crmApi.updateFollowUp(id, updates)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.followUps() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a note for a prospect
 */
export function useCreateNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ prospectId, content, noteType = 'general', isPinned = false }) => {
      const response = await crmApi.createNote({
        prospectId,
        content,
        noteType,
        isPinned,
      })
      return response.data || response
    },
    onSuccess: (_, { prospectId }) => {
      // Invalidate timeline for this prospect
      queryClient.invalidateQueries({ queryKey: crmKeys.timeline(prospectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch timeline with infinite scroll support
 */
export function useTimeline(contactId, options = {}) {
  return useInfiniteQuery({
    queryKey: crmKeys.timeline(contactId),
    queryFn: async ({ pageParam }) => {
      const response = await crmApi.getTimeline(contactId, { cursor: pageParam })
      const data = response.data || response
      return {
        events: data.events || data.timeline || data,
        hasMore: data.hasMore || false,
        nextCursor: data.events?.[data.events.length - 1]?.event_time,
      }
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!contactId,
    ...options,
  })
}

/**
 * Log an activity (creates timeline event)
 */
export function useLogActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contactId, activity }) => {
      const response = await crmApi.logActivity(contactId, activity)
      return response.data || response
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: crmKeys.timeline(contactId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch attribution for a contact
 */
export function useAttribution(contactId, options = {}) {
  return useQuery({
    queryKey: crmKeys.attribution(contactId),
    queryFn: async () => {
      try {
        const response = await crmApi.getAttribution(contactId)
        return response.data || response
      } catch (error) {
        console.warn('Failed to fetch attribution:', error)
        return null
      }
    },
    enabled: !!contactId,
    ...options,
  })
}

/**
 * Fetch org-wide attribution stats
 */
export function useAttributionStats(days = 90, options = {}) {
  return useQuery({
    queryKey: crmKeys.attributionStats(days),
    queryFn: async () => {
      const response = await crmApi.getAttributionStats({ days })
      const data = response.data || response
      return data.stats || data
    },
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM USERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch team users for assignment dropdowns
 */
export function useTeamUsers(options = {}) {
  return useQuery({
    queryKey: crmKeys.teamUsers(),
    queryFn: async () => {
      const response = await crmApi.listTeamUsers()
      const data = response.data || response
      return data.users || data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - team doesn't change often
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TARGET COMPANIES (PROSPECTING)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch target companies list
 */
export function useTargetCompanies(params = {}, options = {}) {
  return useQuery({
    queryKey: crmKeys.targetCompaniesList(params),
    queryFn: async () => {
      const response = await crmApi.listTargetCompanies(params)
      const data = response.data || response
      return {
        companies: data.companies || data,
        total: data.total || (Array.isArray(data) ? data.length : 0),
      }
    },
    ...options,
  })
}

/**
 * Fetch single target company
 */
export function useTargetCompany(id, options = {}) {
  return useQuery({
    queryKey: crmKeys.targetCompanyDetail(id),
    queryFn: async () => {
      const response = await crmApi.getTargetCompany(id)
      return response.data || response
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create target company
 */
export function useCreateTargetCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (companyData) => {
      const response = await crmApi.createTargetCompany(companyData)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.targetCompanies() })
    },
  })
}

/**
 * Update target company
 */
export function useUpdateTargetCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await crmApi.updateTargetCompany(id, updates)
      return response.data || response
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(crmKeys.targetCompanyDetail(id), data)
      queryClient.invalidateQueries({ queryKey: crmKeys.targetCompanies() })
    },
  })
}

/**
 * Claim target company
 */
export function useClaimTargetCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await crmApi.claimTargetCompany(id)
      return response.data || response
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(crmKeys.targetCompanyDetail(id), data)
      queryClient.invalidateQueries({ queryKey: crmKeys.targetCompanies() })
    },
  })
}

/**
 * Unclaim target company
 */
export function useUnclaimTargetCompany() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await crmApi.unclaimTargetCompany(id)
      return response.data || response
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(crmKeys.targetCompanyDetail(id), data)
      queryClient.invalidateQueries({ queryKey: crmKeys.targetCompanies() })
    },
  })
}

/**
 * Generate call prep for a target company
 */
export function useCallPrep() {
  return useMutation({
    mutationFn: async (companyId) => {
      const response = await crmApi.generateCallPrep(companyId)
      return response.data || response
    },
  })
}
