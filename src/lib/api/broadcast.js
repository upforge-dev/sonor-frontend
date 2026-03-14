/**
 * Broadcast API Client
 * Handles all social media broadcast operations
 */
import portalApi from '../portal-api'

const BASE_PATH = '/broadcast'

export const broadcastApi = {
  // ===== POSTS =====
  
  /**
   * Get all posts for a project
   */
  getPosts: (projectId, options = {}) => {
    const params = new URLSearchParams()
    if (options.status) params.append('status', options.status)
    if (options.platform) params.append('platform', options.platform)
    if (options.startDate) params.append('startDate', options.startDate)
    if (options.endDate) params.append('endDate', options.endDate)
    if (options.limit) params.append('limit', options.limit)
    if (options.page) params.append('page', options.page)
    
    const query = params.toString()
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/posts${query ? `?${query}` : ''}`)
  },
  
  /**
   * Get single post by ID
   */
  getPost: (postId) => {
    return portalApi.get(`${BASE_PATH}/posts/${postId}`)
  },
  
  /**
   * Create a new post
   */
  createPost: (projectId, data) => {
    return portalApi.post(`${BASE_PATH}/projects/${projectId}/posts`, data)
  },
  
  /**
   * Update a post
   */
  updatePost: (postId, data) => {
    return portalApi.put(`${BASE_PATH}/posts/${postId}`, data)
  },
  
  /**
   * Delete a post
   */
  deletePost: (postId) => {
    return portalApi.delete(`${BASE_PATH}/posts/${postId}`)
  },
  
  /**
   * Duplicate a post
   */
  duplicatePost: (postId) => {
    return portalApi.post(`${BASE_PATH}/posts/${postId}/duplicate`)
  },
  
  /**
   * Publish a post immediately
   */
  publishNow: (postId) => {
    return portalApi.post(`${BASE_PATH}/posts/${postId}/publish`)
  },
  
  /**
   * Reschedule a post
   */
  reschedulePost: (postId, scheduledFor, timezone) => {
    return portalApi.patch(`${BASE_PATH}/posts/${postId}/schedule`, { scheduledFor, timezone })
  },
  
  // ===== APPROVAL WORKFLOW =====
  
  /**
   * Approve a post
   */
  approvePost: (postId, notes = '') => {
    return portalApi.post(`${BASE_PATH}/posts/${postId}/approve`, { notes })
  },
  
  /**
   * Reject a post
   */
  rejectPost: (postId, reason) => {
    return portalApi.post(`${BASE_PATH}/posts/${postId}/reject`, { reason })
  },
  
  /**
   * Request approval for a post
   */
  requestApproval: (postId) => {
    return portalApi.post(`${BASE_PATH}/posts/${postId}/request-approval`)
  },

  /**
   * Retry failed platforms for a post
   */
  retryPost: (postId) => {
    return portalApi.post(`${BASE_PATH}/posts/${postId}/retry`)
  },

  // ===== PLATFORM CONNECTIONS =====
  
  /**
   * Get all platform connections for a project
   */
  getConnections: (projectId) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/connections`)
  },
  
  /**
   * Get OAuth URL for connecting a platform
   */
  getConnectUrl: (projectId, platform, returnUrl) => {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/oauth/${platform}/url${params}`)
  },
  
  /**
   * Disconnect a platform
   */
  disconnect: (connectionId) => {
    return portalApi.delete(`${BASE_PATH}/connections/${connectionId}`)
  },
  
  /**
   * Refresh platform token
   */
  refreshConnection: (connectionId) => {
    return portalApi.post(`${BASE_PATH}/connections/${connectionId}/refresh`)
  },
  
  // ===== CALENDAR =====
  
  /**
   * Get calendar view of posts
   */
  getCalendar: (projectId, options = {}) => {
    const params = new URLSearchParams()
    if (options.view) params.append('view', options.view)
    if (options.startDate) params.append('startDate', options.startDate)
    if (options.endDate) params.append('endDate', options.endDate)
    if (options.platforms?.length) params.append('platforms', options.platforms.join(','))
    if (options.statuses?.length) params.append('statuses', options.statuses.join(','))
    
    const query = params.toString()
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/calendar${query ? `?${query}` : ''}`)
  },
  
  /**
   * Get posts for a specific day
   */
  getPostsForDay: (projectId, date) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/calendar/day/${date}`)
  },
  
  /**
   * Get upcoming scheduled posts
   */
  getUpcomingPosts: (projectId, limit = 10) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/upcoming?limit=${limit}`)
  },
  
  /**
   * Get optimal posting time slots
   */
  getOptimalTimes: (projectId, platforms, date) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/optimal-times?date=${date}&platforms=${platforms.join(',')}`)
  },
  
  /**
   * Get suggested best times for next N days
   */
  suggestBestTimes: (projectId, platforms, days = 7) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/suggest-times?platforms=${platforms.join(',')}&days=${days}`)
  },
  
  // ===== TEMPLATES =====
  
  /**
   * Get all templates for a project
   */
  getTemplates: (projectId, options = {}) => {
    const params = new URLSearchParams()
    if (options.category) params.append('category', options.category)
    if (options.platform) params.append('platform', options.platform)
    if (options.search) params.append('search', options.search)
    
    const query = params.toString()
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/templates${query ? `?${query}` : ''}`)
  },
  
  /**
   * Get template categories
   */
  getTemplateCategories: (projectId) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/templates/categories`)
  },
  
  /**
   * Create a template
   */
  createTemplate: (projectId, data) => {
    return portalApi.post(`${BASE_PATH}/projects/${projectId}/templates`, data)
  },
  
  /**
   * Get single template
   */
  getTemplate: (templateId) => {
    return portalApi.get(`${BASE_PATH}/templates/${templateId}`)
  },
  
  /**
   * Update a template
   */
  updateTemplate: (templateId, data) => {
    return portalApi.put(`${BASE_PATH}/templates/${templateId}`, data)
  },
  
  /**
   * Delete a template
   */
  deleteTemplate: (templateId) => {
    return portalApi.delete(`${BASE_PATH}/templates/${templateId}`)
  },
  
  /**
   * Duplicate a template
   */
  duplicateTemplate: (templateId, targetProjectId) => {
    return portalApi.post(`${BASE_PATH}/templates/${templateId}/duplicate`, { targetProjectId })
  },
  
  // ===== HASHTAG SETS =====
  
  /**
   * Get hashtag sets for a project
   */
  getHashtagSets: (projectId, category) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : ''
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/hashtags${params}`)
  },
  
  /**
   * Get hashtag categories
   */
  getHashtagCategories: (projectId) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/hashtags/categories`)
  },
  
  /**
   * Create a hashtag set
   */
  createHashtagSet: (projectId, data) => {
    return portalApi.post(`${BASE_PATH}/projects/${projectId}/hashtags`, data)
  },
  
  /**
   * Suggest hashtags for content
   */
  suggestHashtags: (projectId, content, platform, limit) => {
    return portalApi.post(`${BASE_PATH}/projects/${projectId}/hashtags/suggest`, { content, platform, limit })
  },
  
  /**
   * Update a hashtag set
   */
  updateHashtagSet: (setId, data) => {
    return portalApi.put(`${BASE_PATH}/hashtags/${setId}`, data)
  },
  
  /**
   * Delete a hashtag set
   */
  deleteHashtagSet: (setId) => {
    return portalApi.delete(`${BASE_PATH}/hashtags/${setId}`)
  },
  
  // ===== INBOX =====
  
  /**
   * Get inbox messages
   */
  getInbox: (projectId, filters = {}) => {
    const params = new URLSearchParams()
    if (filters.platform) params.append('platform', filters.platform)
    if (filters.type) params.append('type', filters.type)
    if (filters.status) params.append('status', filters.status)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)
    
    const query = params.toString()
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/inbox${query ? `?${query}` : ''}`)
  },
  
  /**
   * Get inbox statistics
   */
  getInboxStats: (projectId) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/inbox/stats`)
  },
  
  /**
   * Get single inbox message
   */
  getInboxMessage: (messageId) => {
    return portalApi.get(`${BASE_PATH}/inbox/${messageId}`)
  },
  
  /**
   * Mark message as read
   */
  markInboxRead: (messageId) => {
    return portalApi.patch(`${BASE_PATH}/inbox/${messageId}/read`)
  },
  
  /**
   * Archive inbox message
   */
  archiveInbox: (messageId) => {
    return portalApi.patch(`${BASE_PATH}/inbox/${messageId}/archive`)
  },
  
  /**
   * Reply to inbox message
   */
  replyToInbox: (messageId, content) => {
    return portalApi.post(`${BASE_PATH}/inbox/${messageId}/reply`, { content })
  },
  
  /**
   * Get AI suggested reply
   */
  suggestReply: (messageId) => {
    return portalApi.post(`${BASE_PATH}/inbox/${messageId}/suggest-reply`)
  },
  
  /**
   * Get replies for a message
   */
  getMessageReplies: (messageId) => {
    return portalApi.get(`${BASE_PATH}/inbox/${messageId}/replies`)
  },
  
  /**
   * Bulk mark messages as read
   */
  bulkMarkAsRead: (messageIds) => {
    return portalApi.post(`${BASE_PATH}/inbox/bulk/read`, { messageIds })
  },
  
  /**
   * Bulk archive messages
   */
  bulkArchive: (messageIds) => {
    return portalApi.post(`${BASE_PATH}/inbox/bulk/archive`, { messageIds })
  },
  
  // ===== ANALYTICS =====
  
  /**
   * Get analytics overview
   */
  getAnalytics: (projectId, period = '7d') => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/analytics?period=${period}`)
  },
  
  /**
   * Get analytics by platform
   */
  getAnalyticsByPlatform: (projectId, platform, period = '7d') => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/analytics/${platform}?period=${period}`)
  },
  
  /**
   * Get top performing posts
   */
  getTopPosts: (projectId, period = '7d', limit = 10, sortBy = 'engagements') => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/analytics/top-posts?period=${period}&limit=${limit}&sortBy=${sortBy}`)
  },
  
  /**
   * Compare analytics between periods
   */
  compareAnalytics: (projectId, currentPeriod, previousPeriod) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/analytics/compare?currentPeriod=${currentPeriod}&previousPeriod=${previousPeriod}`)
  },
  
  // ===== AI IMAGES =====
  
  /**
   * Get generated images for a project
   */
  getAiImages: (projectId, limit = 50) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/images?limit=${limit}`)
  },
  
  /**
   * Generate images using AI (Gemini)
   */
  generateImage: (projectId, prompt, options = {}) => {
    return portalApi.post(`${BASE_PATH}/projects/${projectId}/images/generate`, {
      prompt,
      aspectRatio: options.aspectRatio || '1:1',
      style: options.style || 'realistic',
      count: options.count || 4,
    })
  },
  
  /**
   * Get single AI image
   */
  getAiImage: (imageId) => {
    return portalApi.get(`${BASE_PATH}/images/${imageId}`)
  },
  
  /**
   * Get AI image generation status
   */
  getImageStatus: (imageId) => {
    return portalApi.get(`${BASE_PATH}/images/${imageId}/status`)
  },
  
  /**
   * Delete an AI image
   */
  deleteImage: (imageId) => {
    return portalApi.delete(`${BASE_PATH}/images/${imageId}`)
  },
  
  // ===== MEDIA UPLOAD =====
  
  /**
   * Get presigned upload URL
   */
  getUploadUrl: (projectId, filename, contentType) => {
    return portalApi.post(`${BASE_PATH}/media/upload-url`, {
      projectId,
      filename,
      contentType
    })
  },
  
  /**
   * Upload media directly
   */
  uploadMedia: async (projectId, file, onProgress = null) => {
    // Get presigned URL first
    const response = await broadcastApi.getUploadUrl(
      projectId,
      file.name,
      file.type
    )
    const { uploadUrl, publicUrl } = response.data || response
    
    // Upload to presigned URL
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    })
    
    return { url: publicUrl, filename: file.name, contentType: file.type }
  },

  // ===== COMPOSER INSIGHTS (Peak times, formats, trends, hooks) =====
  
  /**
   * Get platform-specific insights for post composers
   * Includes peak posting times, top formats, trending topics, and hooks
   * @param {string} projectId - Project ID
   * @param {string} platform - Platform name (instagram, facebook, linkedin, tiktok, gbp)
   * @returns {Promise<{peak_times, top_formats, trending_topics, trending_hooks, source}>}
   */
  getComposerInsights: (projectId, platform) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/composer-insights?platform=${platform}`)
  },
  
  /**
   * Get trending hooks for content creation
   * @param {string} projectId - Project ID
   * @param {string} platform - Optional platform filter
   * @param {number} limit - Number of hooks to return
   */
  getTrendingHooks: (projectId, platform = 'all', limit = 5) => {
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/trending-hooks?platform=${platform}&limit=${limit}`)
  },
  
  /**
   * Get our best performing hashtags (based on actual post metrics)
   * @param {string} projectId - Project ID
   * @param {string} platform - Optional platform filter
   * @param {number} limit - Number of hashtags to return
   */
  getTopHashtags: (projectId, platform, limit = 20) => {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (platform) params.append('platform', platform)
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/top-hashtags?${params}`)
  },
  
  /**
   * Get content patterns for a project
   * @param {string} projectId - Project ID
   * @param {string} platform - Optional platform filter
   */
  getContentPatterns: (projectId, platform) => {
    const params = platform ? `?platform=${platform}` : ''
    return portalApi.get(`${BASE_PATH}/projects/${projectId}/content-patterns${params}`)
  },
}

export default broadcastApi
