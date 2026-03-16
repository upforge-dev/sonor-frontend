/**
 * Projects V2 Query Hooks
 *
 * TanStack Query hooks for Projects Module V2:
 * - Sonor Tasks (internal team tasks)
 * - User Tasks (personal tasks)
 * - Deliverables (creative deliverables with approval workflow)
 *
 * Replaces projects-v2-store.js with automatic caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import portalApi from '../portal-api'

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATIONS (Re-exported from store for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export const UPTRADE_TASK_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700', icon: '○' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: '◐' },
  in_review: { label: 'In Review', color: 'bg-purple-100 text-purple-700', icon: '◉' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: '●' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: '✓' },
}

export const UPTRADE_TASK_PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

export const UPTRADE_TASK_MODULE_CONFIG = {
  seo: { label: 'SEO', color: 'bg-green-100 text-green-700', iconName: 'Search' },
  broadcast: { label: 'Broadcast', color: 'bg-purple-100 text-purple-700', iconName: 'Radio' },
  reputation: { label: 'Reputation', color: 'bg-yellow-100 text-yellow-700', iconName: 'Star' },
  engage: { label: 'Engage', color: 'bg-indigo-100 text-indigo-700', iconName: 'Zap' },
  commerce: { label: 'Commerce', color: 'bg-orange-100 text-orange-700', iconName: 'ShoppingCart' },
  blog: { label: 'Blog', color: 'bg-teal-100 text-teal-700', iconName: 'BookOpen' },
  prospects: { label: 'Prospects', color: 'bg-blue-100 text-blue-700', iconName: 'Users' },
  outreach: { label: 'Outreach', color: 'bg-pink-100 text-pink-700', iconName: 'Mail' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-600', iconName: 'ListTodo' },
}

export const USER_TASK_PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
}

export const DELIVERABLE_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  pending_review: { label: 'Pending Review', color: 'bg-purple-100 text-purple-700' },
  needs_changes: { label: 'Needs Changes', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Delivered', color: 'bg-cyan-100 text-cyan-700' },
}

export const DELIVERABLE_TYPE_CONFIG = {
  document: { label: 'Document', icon: '📄' },
  image: { label: 'Image', icon: '🖼️' },
  video: { label: 'Video', icon: '🎬' },
  audio: { label: 'Audio', icon: '🎵' },
  design: { label: 'Design', icon: '🎨' },
  code: { label: 'Code', icon: '💻' },
  presentation: { label: 'Presentation', icon: '📊' },
  spreadsheet: { label: 'Spreadsheet', icon: '📋' },
  other: { label: 'Other', icon: '📦' },
}

// Aliases
export const priorityConfig = UPTRADE_TASK_PRIORITY_CONFIG
export const deliverableStatusConfig = DELIVERABLE_STATUS_CONFIG
export const deliverableTypeConfig = DELIVERABLE_TYPE_CONFIG

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const projectsV2Keys = {
  all: ['projectsV2'],
  uptradeTasks: (projectId) => [...projectsV2Keys.all, 'uptradeTasks', projectId],
  uptradeTasksList: (projectId, filters) => [...projectsV2Keys.uptradeTasks(projectId), 'list', filters],
  uptradeTaskDetail: (projectId, taskId) => [...projectsV2Keys.uptradeTasks(projectId), 'detail', taskId],
  uptradeTasksStats: (projectId) => [...projectsV2Keys.uptradeTasks(projectId), 'stats'],
  uptradeTasksUpcoming: (projectId, limit) => [...projectsV2Keys.uptradeTasks(projectId), 'upcoming', limit],
  userTasks: (filters) => [...projectsV2Keys.all, 'userTasks', filters],
  userTasksStats: () => [...projectsV2Keys.all, 'userTasks', 'stats'],
  userTasksCategories: () => [...projectsV2Keys.all, 'userTasks', 'categories'],
  deliverables: (projectId) => [...projectsV2Keys.all, 'deliverables', projectId],
  deliverablesList: (projectId, filters) => [...projectsV2Keys.deliverables(projectId), 'list', filters],
  deliverableDetail: (projectId, id) => [...projectsV2Keys.deliverables(projectId), 'detail', id],
  deliverablesStats: (projectId) => [...projectsV2Keys.deliverables(projectId), 'stats'],
  deliverablesPendingApprovals: (projectId) => [...projectsV2Keys.deliverables(projectId), 'pending'],
}

// ═══════════════════════════════════════════════════════════════════════════
// UPTRADE TASKS
// ═══════════════════════════════════════════════════════════════════════════

export function useUptradeTasks(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.uptradeTasksList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.module) params.append('module', filters.module)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.assignedTo) params.append('assigned_to', filters.assignedTo)
      if (filters.search) params.append('search', filters.search)
      const queryString = params.toString()
      const url = queryString
        ? `/projects/${projectId}/uptrade-tasks?${queryString}`
        : `/projects/${projectId}/uptrade-tasks`
      const response = await portalApi.get(url)
      return response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
    ...options,
  })
}

export function useUptradeTask(projectId, taskId, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.uptradeTaskDetail(projectId, taskId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/${taskId}`)
      return response.data
    },
    enabled: !!projectId && !!taskId,
    ...options,
  })
}

function toCamelCaseStats(stats) {
  if (!stats) return stats
  return {
    ...stats,
    dueToday: stats.dueToday ?? stats.due_today ?? 0,
    dueThisWeek: stats.dueThisWeek ?? stats.due_this_week ?? 0,
  }
}

export function useUptradeTasksStats(projectId, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.uptradeTasksStats(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/stats`)
      return toCamelCaseStats(response.data)
    },
    enabled: !!projectId,
    ...options,
  })
}

export function useUptradeTasksUpcoming(projectId, limit = 10, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.uptradeTasksUpcoming(projectId, limit),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/upcoming?limit=${limit}`)
      return response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

export function useCreateUptradeTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
    },
  })
}

export function useUpdateUptradeTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, data }) => {
      const response = await portalApi.put(`/projects/${projectId}/uptrade-tasks/${taskId}`, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
      if (data?.id) {
        queryClient.setQueryData(projectsV2Keys.uptradeTaskDetail(projectId, data.id), data)
      }
    },
  })
}

export function useCompleteUptradeTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId) => {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks/${taskId}/complete`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
    },
  })
}

export function useDeleteUptradeTask(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId) => {
      await portalApi.delete(`/projects/${projectId}/uptrade-tasks/${taskId}`)
      return taskId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
    },
  })
}

export function useAddUptradeTaskChecklistItem(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, title }) => {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks/${taskId}/checklist`, { title })
      return response.data
    },
    onSuccess: (data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTaskDetail(projectId, taskId) })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
    },
  })
}

export function useToggleUptradeTaskChecklistItem(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, itemId }) => {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks/${taskId}/checklist/${itemId}/toggle`)
      return response.data
    },
    onSuccess: (data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTaskDetail(projectId, taskId) })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
    },
  })
}

export function useRemoveUptradeTaskChecklistItem(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, itemId }) => {
      await portalApi.delete(`/projects/${projectId}/uptrade-tasks/${taskId}/checklist/${itemId}`)
      return { taskId, itemId }
    },
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTaskDetail(projectId, taskId) })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.uptradeTasks(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// USER TASKS
// ═══════════════════════════════════════════════════════════════════════════

export function useUserTasks(filters = {}, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.userTasks(filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.categoryId) params.append('category_id', filters.categoryId)
      if (filters.completed !== undefined) params.append('completed', String(filters.completed))
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.overdue) params.append('overdue', 'true')
      if (filters.search) params.append('search', filters.search)
      if (filters.limit) params.append('limit', String(filters.limit))
      const queryString = params.toString()
      const url = queryString ? `/user-tasks?${queryString}` : '/user-tasks'
      const response = await portalApi.get(url)
      return response.data || []
    },
    staleTime: 1000 * 60 * 2,
    ...options,
  })
}

export function useUserTasksStats(options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.userTasksStats(),
    queryFn: async () => {
      const response = await portalApi.get('/user-tasks/stats')
      return toCamelCaseStats(response.data)
    },
    ...options,
  })
}

export function useUserTasksCategories(options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.userTasksCategories(),
    queryFn: async () => {
      const response = await portalApi.get('/user-tasks/categories')
      return response.data || []
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

export function useCreateUserTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const response = await portalApi.post('/user-tasks', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasks() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksStats() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksCategories() })
    },
  })
}

export function useUpdateUserTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, data }) => {
      const response = await portalApi.put(`/user-tasks/${taskId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasks() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksStats() })
    },
  })
}

export function useCompleteUserTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId) => {
      const response = await portalApi.post(`/user-tasks/${taskId}/complete`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasks() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksStats() })
    },
  })
}

export function useUncompleteUserTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId) => {
      const response = await portalApi.post(`/user-tasks/${taskId}/uncomplete`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasks() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksStats() })
    },
  })
}

export function useDeleteUserTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId) => {
      await portalApi.delete(`/user-tasks/${taskId}`)
      return taskId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasks() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksStats() })
    },
  })
}

export function useMoveUserTaskToCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, categoryId }) => {
      const response = await portalApi.patch(`/user-tasks/${taskId}/move`, { category_id: categoryId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasks() })
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.userTasksCategories() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERABLES
// ═══════════════════════════════════════════════════════════════════════════

export function useDeliverables(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.deliverablesList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)
      if (filters.taskId) params.append('task_id', filters.taskId)
      if (filters.search) params.append('search', filters.search)
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.offset) params.append('offset', String(filters.offset))
      const queryString = params.toString()
      const url = queryString
        ? `/projects/${projectId}/deliverables?${queryString}`
        : `/projects/${projectId}/deliverables`
      const response = await portalApi.get(url)
      return response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2,
    ...options,
  })
}

export function useDeliverable(projectId, deliverableId, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.deliverableDetail(projectId, deliverableId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/${deliverableId}`)
      return response.data
    },
    enabled: !!projectId && !!deliverableId,
    ...options,
  })
}

export function useDeliverablesStats(projectId, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.deliverablesStats(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/stats`)
      return response.data
    },
    enabled: !!projectId,
    ...options,
  })
}

export function useDeliverablesPendingApprovals(projectId, options = {}) {
  return useQuery({
    queryKey: projectsV2Keys.deliverablesPendingApprovals(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/pending-approval`)
      return response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

export function useCreateDeliverable(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const response = await portalApi.post(`/projects/${projectId}/deliverables`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
    },
  })
}

export function useUpdateDeliverable(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliverableId, data }) => {
      const response = await portalApi.put(`/projects/${projectId}/deliverables/${deliverableId}`, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
      if (data?.id) {
        queryClient.setQueryData(projectsV2Keys.deliverableDetail(projectId, data.id), data)
      }
    },
  })
}

export function useDeleteDeliverable(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deliverableId) => {
      await portalApi.delete(`/projects/${projectId}/deliverables/${deliverableId}`)
      return deliverableId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
    },
  })
}

export function useSubmitDeliverableForReview(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliverableId, message }) => {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/submit`, { message })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
    },
  })
}

export function useApproveDeliverable(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliverableId, message }) => {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/approve`, { message })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
    },
  })
}

export function useRequestDeliverableChanges(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliverableId, feedback }) => {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/request-changes`, { feedback })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
    },
  })
}

export function useDeliverDeliverable(projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliverableId, deliveryNotes, finalFiles }) => {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/deliver`, {
        delivery_notes: deliveryNotes,
        final_files: finalFiles,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsV2Keys.deliverables(projectId) })
    },
  })
}
