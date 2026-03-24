/**
 * Broadcast Query Hooks
 * 
 * TanStack Query hooks for Broadcast (Social Media) module.
 * Replaces broadcastStore.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import portalApi from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const broadcastKeys = {
  all: ['broadcast'],
  posts: () => [...broadcastKeys.all, 'posts'],
  postsList: (projectId, filters) => [...broadcastKeys.posts(), 'list', projectId, filters],
  postDetail: (id) => [...broadcastKeys.posts(), 'detail', id],
  calendar: (projectId, view, date) => [...broadcastKeys.all, 'calendar', projectId, view, date],
  connections: (projectId) => [...broadcastKeys.all, 'connections', projectId],
  templates: (projectId) => [...broadcastKeys.all, 'templates', projectId],
  hashtagSets: (projectId) => [...broadcastKeys.all, 'hashtagSets', projectId],
  inbox: () => [...broadcastKeys.all, 'inbox'],
  inboxList: (projectId, filters) => [...broadcastKeys.inbox(), 'list', projectId, filters],
  inboxMessage: (id) => [...broadcastKeys.inbox(), 'message', id],
  analytics: (projectId, period) => [...broadcastKeys.all, 'analytics', projectId, period],
  drafts: (projectId) => [...broadcastKeys.all, 'drafts', projectId],
}

// ═══════════════════════════════════════════════════════════════════════════
// POSTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch posts list
 */
export function useBroadcastPosts(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.postsList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      
      const queryString = params.toString()
      const response = await portalApi.get(`/broadcast/${projectId}/posts${queryString ? `?${queryString}` : ''}`)
      const data = response.data
      return {
        posts: data.posts || data || [],
        total: data.total || 0,
        pagination: data.pagination,
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single post
 */
export function useBroadcastPost(id, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.postDetail(id),
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/posts/${id}`)
      return response.data?.post || response.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Create post
 */
export function useCreateBroadcastPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/broadcast/${projectId}/posts`, data)
      return response.data?.post || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
      queryClient.invalidateQueries({ queryKey: broadcastKeys.calendar(projectId, null, null) })
      queryClient.invalidateQueries({ queryKey: broadcastKeys.drafts(projectId) })
    },
  })
}

/**
 * Update post
 */
export function useUpdateBroadcastPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/broadcast/posts/${id}`, data)
      return { ...(response.data?.post || response.data), projectId }
    },
    onSuccess: (data, { id, projectId }) => {
      queryClient.setQueryData(broadcastKeys.postDetail(id), data)
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.calendar(projectId, null, null) })
      }
    },
  })
}

/**
 * Delete post
 */
export function useDeleteBroadcastPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/broadcast/posts/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.removeQueries({ queryKey: broadcastKeys.postDetail(id) })
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.calendar(projectId, null, null) })
        queryClient.invalidateQueries({ queryKey: broadcastKeys.drafts(projectId) })
      }
    },
  })
}

/**
 * Publish post now
 */
export function usePublishBroadcastPost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const response = await portalApi.post(`/broadcast/posts/${id}/publish`)
      return { ...(response.data?.post || response.data), projectId }
    },
    onSuccess: (data, { id, projectId }) => {
      queryClient.setQueryData(broadcastKeys.postDetail(id), data)
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.calendar(projectId, null, null) })
        queryClient.invalidateQueries({ queryKey: broadcastKeys.drafts(projectId) })
      }
    },
  })
}

/**
 * Approve post (approval workflow)
 */
export function useApproveBroadcastPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, notes }) => {
      const response = await portalApi.post(`/broadcast/posts/${postId}/approve`, { notes })
      return response.data?.post ?? response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
    },
  })
}

/**
 * Reject post (approval workflow)
 */
export function useRejectBroadcastPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, reason }) => {
      const response = await portalApi.post(`/broadcast/posts/${postId}/reject`, { reason })
      return response.data?.post ?? response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
    },
  })
}

/**
 * Retry failed platforms for a post
 */
export function useRetryBroadcastPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId }) => {
      const response = await portalApi.post(`/broadcast/posts/${postId}/retry`)
      return response.data?.post ?? response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.posts() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch calendar data
 */
export function useBroadcastCalendar(projectId, view = 'month', date, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.calendar(projectId, view, date),
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('view', view)
      if (date) params.append('date', date)
      
      const response = await portalApi.get(`/broadcast/${projectId}/calendar?${params}`)
      return response.data
    },
    enabled: !!projectId,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch platform connections
 */
export function useBroadcastConnections(projectId, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.connections(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/${projectId}/connections`)
      return response.data?.connections || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Connect platform
 */
export function useConnectPlatform() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, platform, data }) => {
      const response = await portalApi.post(`/broadcast/${projectId}/connections/${platform}`, data)
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.connections(projectId) })
    },
  })
}

/**
 * Disconnect platform
 */
export function useDisconnectPlatform() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, connectionId }) => {
      await portalApi.delete(`/broadcast/${projectId}/connections/${connectionId}`)
      return { projectId, connectionId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.connections(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch templates
 */
export function useBroadcastTemplates(projectId, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.templates(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/${projectId}/templates`)
      return response.data?.templates || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Create template
 */
export function useCreateBroadcastTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/broadcast/${projectId}/templates`, data)
      return response.data?.template || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.templates(projectId) })
    },
  })
}

/**
 * Update template
 */
export function useUpdateBroadcastTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/broadcast/templates/${id}`, data)
      return { ...(response.data?.template || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.templates(data.projectId) })
      }
    },
  })
}

/**
 * Delete template
 */
export function useDeleteBroadcastTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/broadcast/templates/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.templates(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// HASHTAG SETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch hashtag sets
 */
export function useHashtagSets(projectId, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.hashtagSets(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/${projectId}/hashtag-sets`)
      return response.data?.hashtagSets || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Create hashtag set
 */
export function useCreateHashtagSet() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/broadcast/${projectId}/hashtag-sets`, data)
      return response.data?.hashtagSet || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.hashtagSets(projectId) })
    },
  })
}

/**
 * Update hashtag set
 */
export function useUpdateHashtagSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/broadcast/${projectId}/hashtag-sets/${id}`, data)
      return response.data?.hashtagSet || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.hashtagSets(projectId) })
    },
  })
}

/**
 * Delete hashtag set
 */
export function useDeleteHashtagSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/broadcast/${projectId}/hashtag-sets/${id}`)
      return { id, projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: broadcastKeys.hashtagSets(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// INBOX
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch inbox messages
 */
export function useBroadcastInbox(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.inboxList(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.isRead !== undefined) params.append('isRead', filters.isRead)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      
      const queryString = params.toString()
      const response = await portalApi.get(`/broadcast/${projectId}/inbox${queryString ? `?${queryString}` : ''}`)
      const data = response.data
      return {
        messages: data.messages || data || [],
        total: data.total || 0,
        unreadCount: data.unreadCount || 0,
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Mark message as read
 */
export function useMarkInboxRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const response = await portalApi.put(`/broadcast/inbox/${id}/read`)
      return { ...(response.data || {}), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.inbox() })
      }
    },
  })
}

/**
 * Reply to inbox message
 */
export function useReplyToInbox() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, message }) => {
      const response = await portalApi.post(`/broadcast/inbox/${id}/reply`, { message })
      return { ...(response.data || {}), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: broadcastKeys.inbox() })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch broadcast analytics
 */
export function useBroadcastAnalytics(projectId, period = '7d', options = {}) {
  return useQuery({
    queryKey: broadcastKeys.analytics(projectId, period),
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/${projectId}/analytics?period=${period}`)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAFTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch drafts
 */
export function useBroadcastDrafts(projectId, options = {}) {
  return useQuery({
    queryKey: broadcastKeys.drafts(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/${projectId}/posts?status=draft`)
      return response.data?.posts || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI IMAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch AI-generated images
 */
export function useAiImages(projectId, limit = 50, options = {}) {
  return useQuery({
    queryKey: [...broadcastKeys.all, 'aiImages', projectId, limit],
    queryFn: async () => {
      const response = await portalApi.get(`/broadcast/${projectId}/ai-images?limit=${limit}`)
      return response.data?.images || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Generate AI images
 */
export function useGenerateAiImages() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, prompt, options = {} }) => {
      const response = await portalApi.post(`/broadcast/${projectId}/ai-images/generate`, {
        prompt,
        ...options,
      })
      return response.data?.images || response.data || []
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...broadcastKeys.all, 'aiImages', projectId] })
    },
  })
}

/**
 * Update AI image (e.g., mark as used)
 */
export function useUpdateAiImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/broadcast/ai-images/${id}`, data)
      return { ...(response.data || {}), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: [...broadcastKeys.all, 'aiImages', data.projectId] })
      }
    },
  })
}

/**
 * Delete AI image
 */
export function useDeleteAiImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/broadcast/ai-images/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [...broadcastKeys.all, 'aiImages', projectId] })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA LIBRARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch media library items
 */
export function useMediaLibrary(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: [...broadcastKeys.all, 'media', projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.page) params.append('page', filters.page)
      if (filters.limit) params.append('limit', filters.limit)
      
      const queryString = params.toString()
      const response = await portalApi.get(`/broadcast/${projectId}/media${queryString ? `?${queryString}` : ''}`)
      return {
        items: response.data?.items || response.data || [],
        total: response.data?.total || 0,
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Upload media to library
 */
export function useUploadMedia() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, file, metadata = {} }) => {
      const formData = new FormData()
      formData.append('file', file)
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value)
      })
      
      const response = await portalApi.post(`/broadcast/${projectId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...broadcastKeys.all, 'media', projectId] })
    },
  })
}

/**
 * Delete media from library
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/broadcast/media/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [...broadcastKeys.all, 'media', projectId] })
      }
    },
  })
}
