/**
 * Projects Query Hooks
 * 
 * TanStack Query hooks for Projects module.
 * Replaces projects-store.js with automatic caching, deduplication, and background refresh.
 * Manages projects, creative requests, tasks, time entries, and approvals.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import portalApi from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATIONS (Re-exported for convenience)
// ═══════════════════════════════════════════════════════════════════════════

export const PROJECT_STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'bg-slate-100 text-slate-700', progress: 10 },
  discovery: { label: 'Discovery', color: 'bg-purple-100 text-purple-700', progress: 20 },
  design: { label: 'Design', color: 'bg-blue-100 text-blue-700', progress: 40 },
  development: { label: 'Development', color: 'bg-amber-100 text-amber-700', progress: 60 },
  review: { label: 'Review', color: 'bg-orange-100 text-orange-700', progress: 80 },
  launch: { label: 'Launch', color: 'bg-cyan-100 text-cyan-700', progress: 90 },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', progress: 100 },
  on_hold: { label: 'On Hold', color: 'bg-gray-100 text-gray-500', progress: 0 },
}

export const CREATIVE_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  review: { label: 'In Review', color: 'bg-purple-100 text-purple-700' },
  revision: { label: 'Needs Revision', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
}

export const TASK_STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
}

export const CREATIVE_REQUEST_TYPES = [
  { value: 'logo', label: 'Logo Design' },
  { value: 'branding', label: 'Branding Package' },
  { value: 'website_design', label: 'Website Design' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'social_graphics', label: 'Social Graphics' },
  { value: 'print_design', label: 'Print Design' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'video', label: 'Video/Animation' },
  { value: 'other', label: 'Other' },
]

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const projectsKeys = {
  all: ['projects'],
  list: (filters) => [...projectsKeys.all, 'list', filters],
  detail: (id) => [...projectsKeys.all, 'detail', id],
  creativeRequests: () => [...projectsKeys.all, 'creativeRequests'],
  creativeRequestsList: (projectId, filters) => [...projectsKeys.creativeRequests(), 'list', projectId, filters],
  creativeRequestDetail: (id) => [...projectsKeys.creativeRequests(), 'detail', id],
  tasks: () => [...projectsKeys.all, 'tasks'],
  tasksList: (projectId, filters) => [...projectsKeys.tasks(), 'list', projectId, filters],
  taskDetail: (id) => [...projectsKeys.tasks(), 'detail', id],
  timeEntries: (projectId) => [...projectsKeys.all, 'timeEntries', projectId],
  timeSummary: (projectId, startDate, endDate) => [...projectsKeys.all, 'timeSummary', projectId, startDate, endDate],
  approvals: () => [...projectsKeys.all, 'approvals'],
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch projects list
 */
export function useProjects(filters = {}, options = {}) {
  return useQuery({
    queryKey: projectsKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.contactId) params.append('contactId', filters.contactId)
      if (filters.isTenant !== undefined) params.append('isTenant', String(filters.isTenant))
      if (filters.search) params.append('search', filters.search)
      
      const queryString = params.toString()
      const url = queryString ? `/projects?${queryString}` : '/projects'
      
      const response = await portalApi.get(url)
      const projectsArray = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.projects || [])
      return {
        projects: projectsArray,
        total: response.data?.total || projectsArray.length,
      }
    },
    ...options,
  })
}

/**
 * Fetch single project
 */
export function useProject(id, options = {}) {
  return useQuery({
    queryKey: projectsKeys.detail(id),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${id}`)
      return response.data?.project || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (projectData) => {
      const response = await portalApi.post('/projects', projectData)
      return response.data?.project || response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all })
    },
  })
}

/**
 * Update project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await portalApi.put(`/projects/${id}`, updates)
      return response.data?.project || response.data
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(projectsKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: projectsKeys.list({}) })
    },
  })
}

/**
 * Delete project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      await portalApi.delete(`/projects/${id}`)
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: projectsKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: projectsKeys.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATIVE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch creative requests
 */
export function useCreativeRequests(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: projectsKeys.creativeRequestsList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.type) params.append('type', filters.type)
      
      const queryString = params.toString()
      const url = `/projects/${projectId}/creative-requests${queryString ? `?${queryString}` : ''}`
      
      const response = await portalApi.get(url)
      return response.data?.creativeRequests || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create creative request
 */
export function useCreateCreativeRequest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/creative-requests`, data)
      return response.data?.creativeRequest || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.creativeRequestsList(projectId, {}) })
    },
  })
}

/**
 * Update creative request
 */
export function useUpdateCreativeRequest() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, updates }) => {
      const response = await portalApi.put(`/projects/creative-requests/${id}`, updates)
      return { ...(response.data?.creativeRequest || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.creativeRequestsList(data.projectId, {}) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch tasks
 */
export function useProjectTasks(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: projectsKeys.tasksList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId)
      
      const queryString = params.toString()
      const url = `/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`
      
      const response = await portalApi.get(url)
      return response.data?.tasks || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create task
 */
export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/tasks`, data)
      return response.data?.task || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.tasksList(projectId, {}) })
    },
  })
}

/**
 * Update task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, updates }) => {
      const response = await portalApi.put(`/projects/tasks/${id}`, updates)
      return { ...(response.data?.task || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.tasksList(data.projectId, {}) })
      }
    },
  })
}

/**
 * Delete task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/projects/tasks/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.tasksList(projectId, {}) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME ENTRIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch time entries
 */
export function useTimeEntries(projectId, options = {}) {
  return useQuery({
    queryKey: projectsKeys.timeEntries(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/time-entries`)
      return response.data?.timeEntries || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create time entry
 */
export function useCreateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/time-entries`, data)
      return response.data?.timeEntry || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.timeEntries(projectId) })
      queryClient.invalidateQueries({ queryKey: projectsKeys.timeSummary(projectId) })
    },
  })
}

/**
 * Update time entry
 */
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, updates }) => {
      const response = await portalApi.put(`/projects/time-entries/${id}`, updates)
      return { ...(response.data?.timeEntry || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.timeEntries(data.projectId) })
        queryClient.invalidateQueries({ queryKey: projectsKeys.timeSummary(data.projectId) })
      }
    },
  })
}

/**
 * Delete time entry
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/projects/time-entries/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.timeEntries(projectId) })
        queryClient.invalidateQueries({ queryKey: projectsKeys.timeSummary(projectId) })
      }
    },
  })
}

/**
 * Fetch time summary for project
 */
export function useProjectTimeSummary(projectId, startDate, endDate, options = {}) {
  return useQuery({
    queryKey: projectsKeys.timeSummary(projectId, startDate, endDate),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      const queryString = params.toString()
      const url = `/projects/${projectId}/time-summary${queryString ? `?${queryString}` : ''}`
      const response = await portalApi.get(url)
      return response.data
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Start timer for project
 */
export function useStartProjectTimer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, description }) => {
      const response = await portalApi.post(`/projects/${projectId}/timer/start`, {
        description: description || '',
      })
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.timeEntries(projectId) })
    },
  })
}

/**
 * Stop timer (time entry)
 */
export function useStopProjectTimer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ entryId, projectId, description }) => {
      const response = await portalApi.post(`/projects/time-entries/${entryId}/stop`, {
        description: description || '',
      })
      return { ...response.data, projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: projectsKeys.timeEntries(data.projectId) })
        queryClient.invalidateQueries({ queryKey: projectsKeys.timeSummary(data.projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch pending approvals
 */
export function usePendingApprovals(options = {}) {
  return useQuery({
    queryKey: projectsKeys.approvals(),
    queryFn: async () => {
      const response = await portalApi.get('/projects/approvals/pending')
      return response.data?.approvals || response.data || []
    },
    ...options,
  })
}

/**
 * Approve item
 */
export function useApproveItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, type, notes }) => {
      const response = await portalApi.post(`/projects/approvals/${id}/approve`, { type, notes })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.approvals() })
      queryClient.invalidateQueries({ queryKey: projectsKeys.creativeRequests() })
    },
  })
}

/**
 * Reject item
 */
export function useRejectItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, type, reason }) => {
      const response = await portalApi.post(`/projects/approvals/${id}/reject`, { type, reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.approvals() })
      queryClient.invalidateQueries({ queryKey: projectsKeys.creativeRequests() })
    },
  })
}

/**
 * Request changes on approval
 */
export function useRequestApprovalChanges() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, feedback }) => {
      const response = await portalApi.put(`/approvals/${id}/request-changes`, { feedback })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.approvals() })
    },
  })
}
