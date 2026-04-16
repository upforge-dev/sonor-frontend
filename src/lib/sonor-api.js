/**
 * Sonor API client (NestJS — api.sonor.io)
 *
 * Dashboard REST client for messages, engage, CRM, billing, etc. (not Netlify Functions).
 *
 * Local dev: Vite :5173 / Netlify :8888 → Sonor API :3002, Signal API :3001
 */
import axios from 'axios'
import { supabase } from './supabase-auth'
import useAuthStore from './auth-store'

const SONOR_API_URL =
  import.meta.env.VITE_SONOR_API_URL ||
  import.meta.env.VITE_PORTAL_API_URL ||
  'https://api.sonor.io'

export function getSonorApiUrl() {
  return SONOR_API_URL
}

/** @deprecated Use getSonorApiUrl */
export const getPortalApiUrl = getSonorApiUrl

// Create axios instance for Sonor API
const sonorApi = axios.create({
  baseURL: SONOR_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to attach Supabase session token
sonorApi.interceptors.request.use(
  async (config) => {
    console.log('[Sonor API Request]', config.method?.toUpperCase(), config.url)
    
    // Get Supabase session and add to Authorization header
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    // Get auth state for organization/project context headers
    const state = useAuthStore.getState()
    
    // Check if this is an agency org
    const isAgencyOrg = state.currentOrg?.org_type === 'agency'
    
    // Add organization context headers
    if (state.currentOrg?.id && !isAgencyOrg) {
      config.headers['X-Organization-Id'] = state.currentOrg.id
    }
    
    if (state.currentProject?.id) {
      config.headers['X-Project-Id'] = state.currentProject.id
      if (state.currentProject.org_id) {
        config.headers['X-Tenant-Org-Id'] = state.currentProject.org_id
      }
    }
    
    return config
  },
  (error) => {
    console.error('[Sonor API Request Error]', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
sonorApi.interceptors.response.use(
  (response) => {
    console.log('[Sonor API Response]', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status)
    return response
  },
  async (error) => {
    console.error('[Sonor API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
    
    // Handle 401 - session expired
    if (error.response?.status === 401) {
      const path = window.location.pathname
      const isOnAuthPage = path.includes('/login') ||
                           path.includes('/reset-password') ||
                           path.includes('/setup') ||
                           path.includes('/auth/callback')
      const isPublicPage = path.startsWith('/p/') || path.startsWith('/audit/') || path.startsWith('/pay/')
      
      if (!isOnAuthPage && !isPublicPage) {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (!session || refreshError) {
          console.log('[Sonor API] Session expired, redirecting to login')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

// 429 retry with backoff — retry once after delay
sonorApi.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config
    if (error.response?.status === 429 && !config.__retried) {
      config.__retried = true
      const retryAfter = error.response.headers['retry-after']
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000
      console.warn(`[Sonor API] 429 throttled, retrying in ${delay}ms:`, config.url)
      await new Promise(r => setTimeout(r, delay))
      return sonorApi(config)
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// Auth API
// ============================================================================

// Base axios instance (alias `portalApi` kept for gradual migration)
export { sonorApi, sonorApi as portalApi }

export const authApi = {
  // Get current user context
  getMe: (organizationIdHeader) => 
    sonorApi.get('/auth/me', { 
      headers: organizationIdHeader ? { 'X-Organization-Id': organizationIdHeader } : {} 
    }),
  
  // Switch organization or project context
  switchOrg: (data) => 
    sonorApi.post('/auth/switch-org', data),
  
  // Link Supabase auth user to contact
  linkContact: (data) => 
    sonorApi.post('/auth/link-contact', data),
  
  // Validate setup token (for account setup links)
  validateSetupToken: (token) => 
    sonorApi.post('/auth/validate-setup-token', { token }),
  
  // Complete account setup
  completeSetup: (data) => 
    sonorApi.post('/auth/complete-setup', data),
  
  // Validate magic link token
  validateMagicLink: (token) => 
    sonorApi.post('/auth/magic-validate', { token }),
  
  // Mark setup complete for authenticated user
  markSetupComplete: () => 
    sonorApi.post('/auth/mark-setup-complete'),

  // Sync Google profile picture to Supabase Storage (server-side fetch, no CORS)
  syncGoogleAvatar: (data) =>
    sonorApi.post('/auth/me/sync-avatar', data),
  
  // Logout - invalidates Redis auth cache
  logout: () => 
    sonorApi.post('/auth/logout'),
  
  // Submit support request
  submitSupport: (data) =>
    sonorApi.post('/auth/support', data),

  // Public self-serve signup
  publicSignup: (data) =>
    sonorApi.post('/auth/signup', data).then(r => r.data),
}

// ============================================================================
// OAuth API (platform connections: Google, etc.)
// ============================================================================

export const oauthApi = {
  /** Get OAuth connection status for all platforms for a project */
  getConnectionStatus: (projectId) =>
    sonorApi.get(`/oauth/status/${projectId}`).then(r => r.data),

  /** Get OAuth initiate URL for a platform. Returns { url, state }. Use popupMode: true for popup flow (callback will postMessage to opener). */
  initiate: (platform, projectId, modules, returnUrl, options = {}) =>
    sonorApi.get(`/oauth/initiate/${platform}`, {
      params: {
        projectId,
        modules: Array.isArray(modules) ? modules.join(',') : modules,
        returnUrl,
        popupMode: options.popupMode === true ? 'true' : undefined,
      },
    }).then(r => r.data),

  /** Get available GSC properties for a connection (after OAuth for SEO module) */
  getGscProperties: (connectionId) =>
    sonorApi.get(`/oauth/connections/${connectionId}/gsc-properties`).then(r => r.data),

  /** Select a GSC property for a connection */
  selectGscProperty: (connectionId, propertyUrl) =>
    sonorApi.post(`/oauth/connections/${connectionId}/select-property`, { propertyUrl }).then(r => r.data),
}

// ============================================================================
// Messages API
// ============================================================================

export const messagesApi = {
  // Conversations
  getConversations: (params = {}) => 
    sonorApi.get('/messages/conversations', { params }),
  
  // Messages
  getMessages: (params = {}) => 
    sonorApi.get('/messages', { params }),
  
  getMessage: (id) => 
    sonorApi.get(`/messages/${id}`),
  
  getThread: (id) => 
    sonorApi.get(`/messages/${id}/thread`),
  
  sendMessage: (data) => 
    sonorApi.post('/messages', data),
  
  editMessage: (id, data) => 
    sonorApi.put(`/messages/${id}`, data),
  
  deleteMessage: (id, forEveryone = false) => 
    sonorApi.delete(`/messages/${id}`, { params: { forEveryone } }),
  
  markAsRead: (id) => 
    sonorApi.put(`/messages/${id}/read`),
  
  // Mark all messages in a conversation as read
  markConversationAsRead: (partnerId) =>
    sonorApi.put(`/messages/conversations/${partnerId}/read`),
  
  // Contacts
  getContacts: () => 
    sonorApi.get('/messages/contacts'),
  
  // Search
  searchMessages: (query, params = {}) => 
    sonorApi.get('/messages/search', { params: { q: query, ...params } }),
  
  // Reactions
  addReaction: (messageId, emoji) => 
    sonorApi.post(`/messages/${messageId}/reactions`, { emoji }),
  
  removeReaction: (messageId, emoji) => 
    sonorApi.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
  
  // Drafts
  getDrafts: () => 
    sonorApi.get('/messages/drafts'),
  
  saveDraft: (conversationId, content) => 
    sonorApi.put(`/messages/drafts/${conversationId}`, { content }),
  
  deleteDraft: (conversationId) => 
    sonorApi.delete(`/messages/drafts/${conversationId}`),
  
  // Conversation actions
  muteConversation: (id, until) => 
    sonorApi.put(`/messages/conversations/${id}/mute`, { until }),
  
  archiveConversation: (id, archived = true) => 
    sonorApi.put(`/messages/conversations/${id}/archive`, { archived }),
  
  pinConversation: (id, pinned = true) => 
    sonorApi.put(`/messages/conversations/${id}/pin`, { pinned }),
  
  deleteConversation: (id) => 
    sonorApi.delete(`/messages/conversations/${id}`),
  
  // Echo message persistence (save after streaming without triggering new response)
  saveEchoMessages: (data) => 
    sonorApi.post('/messages/echo/save', data),
  
  // Attachments
  uploadAttachment: async (messageId, file) => {
    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    return sonorApi.post(`/messages/${messageId}/attachments`, {
      file: {
        buffer: base64,
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
      }
    })
  },
  
  getAttachmentUrl: (attachmentId, expiresIn = 3600) => 
    sonorApi.get(`/messages/attachments/${attachmentId}/url`, { params: { expires: expiresIn } }),
  
  deleteAttachment: (attachmentId) => 
    sonorApi.delete(`/messages/attachments/${attachmentId}`),
  
  // Legacy file uploads (for backwards compatibility)
  uploadAttachments: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return sonorApi.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Groups
  getGroups: () => 
    sonorApi.get('/messages/groups'),
  
  createGroup: (data) => 
    sonorApi.post('/messages/groups', data),
  
  getGroupMessages: (groupId, params = {}) => 
    sonorApi.get(`/messages/groups/${groupId}/messages`, { params }),
  
  sendGroupMessage: (groupId, data) => 
    sonorApi.post(`/messages/groups/${groupId}/messages`, data),
}

// ============================================================================
// ChatKit API (User-to-User & Visitor Messaging via ChatKit protocol)
// ============================================================================

export const chatkitApi = {
  // Threads. Params: thread_type, limit, after (cursor), updated_since (sync). See docs/CHATKIT-PAGINATION in sonor-api-nestjs.
  getThreads: (params = {}) =>
    sonorApi.get('/chatkit/threads', { params }),

  getThread: (threadId) =>
    sonorApi.get(`/chatkit/threads/${threadId}`),
  
  createThread: (data) => 
    sonorApi.post('/chatkit/threads', data),
  
  deleteThread: (threadId) => 
    sonorApi.delete(`/chatkit/threads/${threadId}`),
  
  pinThread: (threadId, pinned) =>
    sonorApi.patch(`/chatkit/threads/${threadId}/pin`, { pinned }),
  
  // Items (messages). Params: limit, after (cursor), order (asc|desc). See docs/CHATKIT-PAGINATION in sonor-api-nestjs.
  getItems: (threadId, params = {}) =>
    sonorApi.get(`/chatkit/threads/${threadId}/items`, { params }),
  
  // Messages
  sendMessage: (data) => 
    sonorApi.post('/chatkit/messages', data),

  // Reactions (Phase 2.4)
  addReaction: (threadId, itemId, emoji) =>
    sonorApi.post(`/chatkit/threads/${threadId}/items/${itemId}/reactions`, { emoji }),

  removeReaction: (threadId, itemId, emoji) =>
    sonorApi.delete(`/chatkit/threads/${threadId}/items/${itemId}/reactions/${encodeURIComponent(emoji)}`),
  
  // Contacts
  getContacts: () => 
    sonorApi.get('/chatkit/contacts'),

  // Presence (Phase 2.10). user_ids: string[] or comma-separated string.
  getPresence: (userIds) => {
    const ids = Array.isArray(userIds) ? userIds.join(',') : (userIds ?? '')
    return sonorApi.get('/chatkit/presence', { params: { user_ids: ids } })
  },

  // Channels (Phase 2.8 / 2.9). thread_type 'channel'.
  createChannel: (data) =>
    sonorApi.post('/chatkit/channels', data),
  listChannels: (params = {}) =>
    sonorApi.get('/chatkit/channels', { params }),
  joinChannel: (threadId) =>
    sonorApi.post(`/chatkit/channels/${threadId}/join`),
  leaveChannel: (threadId) =>
    sonorApi.post(`/chatkit/channels/${threadId}/leave`),

  // Link preview (Phase 3.2.2)
  getLinkPreview: (url) =>
    sonorApi.get('/chatkit/link-preview', { params: { url } }),

  // Mute (Phase 3.4.1)
  muteThread: (threadId) =>
    sonorApi.post(`/chatkit/threads/${threadId}/mute`),
  unmuteThread: (threadId) =>
    sonorApi.post(`/chatkit/threads/${threadId}/unmute`),

  // Search (Phase 3.3.1)
  search: (query, type = 'all', limit) =>
    sonorApi.get('/chatkit/search', { params: { q: query, type, limit } }),

  // Analytics (Phase 3.7.1)
  getResponseTimeStats: (threadType, startDate, endDate) =>
    sonorApi.get('/chatkit/analytics/response-time', {
      params: { thread_type: threadType, start_date: startDate, end_date: endDate }
    }),

  // Audit & Export (Phase 3.5.1)
  exportThread: (threadId, format = 'json') =>
    sonorApi.get(`/chatkit/export/thread/${threadId}`, {
      params: { format },
      responseType: 'blob'
    }),

  exportOrg: (startDate, endDate) =>
    sonorApi.get('/chatkit/export/org', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob'
    }),

  // Report & Block (Phase 3.5.3)
  reportMessage: (messageId, reason, details) =>
    sonorApi.post('/chatkit/reports/message', { message_id: messageId, reason, details }),

  reportUser: (userId, reason, details) =>
    sonorApi.post('/chatkit/reports/user', { user_id: userId, reason, details }),

  listReports: (status, limit) =>
    sonorApi.get('/chatkit/reports', { params: { status, limit } }),

  updateReport: (reportId, status, notes) =>
    sonorApi.patch(`/chatkit/reports/${reportId}`, { status, notes }),

  blockUser: (userId, reason) =>
    sonorApi.post(`/chatkit/blocks/${userId}`, { reason }),

  unblockUser: (userId) =>
    sonorApi.delete(`/chatkit/blocks/${userId}`),

  getBlocks: () =>
    sonorApi.get('/chatkit/blocks'),
}

// ============================================================================
// Engage API
// ============================================================================

export const engageApi = {
  // Elements
  getElements: (params = {}) => 
    sonorApi.get('/engage/elements', { params }),
  
  getElement: (id) => 
    sonorApi.get(`/engage/elements/${id}`),
  
  createElement: (data) => 
    sonorApi.post('/engage/elements', data),
  
  updateElement: (id, data) => 
    sonorApi.put(`/engage/elements/${id}`, data),
  
  deleteElement: (id) => 
    sonorApi.delete(`/engage/elements/${id}`),
  
  duplicateElement: (id) => 
    sonorApi.post(`/engage/elements/${id}/duplicate`),
  
  // Chat config
  getChatConfig: (projectId) => 
    sonorApi.get('/engage/chat/config', { params: { projectId } }),
  
  updateChatConfig: (projectId, data) => 
    sonorApi.put('/engage/chat/config', { projectId, ...data }),
  
  // Chat sessions
  getChatSessions: (params = {}) => 
    sonorApi.get('/engage/chat/sessions', { params }),
  
  getChatSession: (id) => 
    sonorApi.get(`/engage/chat/sessions/${id}`),
  
  sendChatMessage: (sessionId, content, attachments) => 
    sonorApi.post(`/engage/chat/sessions/${sessionId}/messages`, { content, attachments }),
  
  assignChatSession: (id, agentId) => 
    sonorApi.put(`/engage/chat/sessions/${id}/assign`, { agentId }),
  
  transferChatSession: (id, toAgentId, note) => 
    sonorApi.put(`/engage/chat/sessions/${id}/transfer`, { toAgentId, note }),
  
  closeChatSession: (id) => 
    sonorApi.put(`/engage/chat/sessions/${id}/close`),
  
  // Chat queue
  getChatQueue: () => 
    sonorApi.get('/engage/chat/queue'),
  
  setAgentAvailability: (available) => 
    sonorApi.put('/engage/agents/availability', { available }),
  
  getOnlineAgents: () => 
    sonorApi.get('/engage/agents/online'),
  
  // Canned responses (under engage/chat controller)
  getCannedResponses: (search) => 
    sonorApi.get('/engage/chat/canned-responses', { params: search ? { search } : {} }),
  
  createCannedResponse: (data) => 
    sonorApi.post('/engage/chat/canned-responses', data),
  
  // Analytics
  getAnalytics: (params = {}) => 
    sonorApi.get('/engage/analytics', { params }),
  
  getAnalyticsOverview: (params = {}) => 
    sonorApi.get('/engage/analytics/overview', { params }),
  
  getChatAnalytics: (params = {}) => 
    sonorApi.get('/engage/analytics/chat', { params }),
  
  getAgentAnalytics: (params = {}) => 
    sonorApi.get('/engage/analytics/agents', { params }),
  
  // Echo config (page-specific nudges)
  getEchoConfigs: (projectId) =>
    sonorApi.get('/engage/echo-config', { params: { projectId } }),
  
  createEchoConfig: (data) =>
    sonorApi.post('/engage/echo-config', data),
  
  updateEchoConfig: (id, data) =>
    sonorApi.put(`/engage/echo-config/${id}`, data),
  
  deleteEchoConfig: (id) =>
    sonorApi.delete(`/engage/echo-config/${id}`),

  // Nudge helper endpoints
  getNudgePages: (projectId) =>
    sonorApi.get('/engage/echo-config/pages', { params: { projectId } }),
  
  getNudgeSignalStatus: (projectId) =>
    sonorApi.get('/engage/echo-config/signal-status', { params: { projectId } }),
  
  // Media library
  getMedia: (projectId) =>
    sonorApi.get('/engage/media', { params: { projectId } }),
  
  uploadMedia: (data) =>
    sonorApi.post('/engage/media', data),
  
  // Chat sessions (Portal-side inbox)
  getChatSessions: (params = {}) =>
    sonorApi.get('/engage/chat/sessions', { params }),
  
  getChatSession: (sessionId) =>
    sonorApi.get(`/engage/chat/sessions/${sessionId}`),
  
  sendChatMessage: (data) =>
    sonorApi.post('/engage/chat/messages', data),
  
  // Targeting - Triggers
  listTriggers: (elementId) =>
    sonorApi.get('/engage/targeting/triggers', { params: { elementId } }),
  
  createTrigger: (data) =>
    sonorApi.post('/engage/targeting/triggers', data),
  
  updateTrigger: (id, data) =>
    sonorApi.put(`/engage/targeting/triggers/${id}`, data),
  
  deleteTrigger: (id) =>
    sonorApi.delete(`/engage/targeting/triggers/${id}`),
  
  // Targeting - Page Rules
  listPageRules: (elementId) =>
    sonorApi.get('/engage/targeting/page-rules', { params: { elementId } }),
  
  createPageRule: (data) =>
    sonorApi.post('/engage/targeting/page-rules', data),
  
  updatePageRule: (id, data) =>
    sonorApi.put(`/engage/targeting/page-rules/${id}`, data),
  
  deletePageRule: (id) =>
    sonorApi.delete(`/engage/targeting/page-rules/${id}`),
  
  // Targeting - Available Pages & Forms
  listTargetingPages: (projectId) =>
    sonorApi.get('/engage/targeting/pages', { params: { projectId } }),
  
  listTargetingForms: (projectId) =>
    sonorApi.get('/engage/targeting/forms', { params: { projectId } }),
}

// ============================================================================
// Proposals API
// ============================================================================

export const proposalsApi = {
  list: (params = {}) => 
    sonorApi.get('/proposals', { params }),
  
  get: (id) => 
    sonorApi.get(`/proposals/${id}`),

  getBySlug: (slug) =>
    sonorApi.get(`/proposals/view/${slug}`),
  
  create: (data) => 
    sonorApi.post('/proposals', data),
  
  update: (id, data) => 
    sonorApi.put(`/proposals/${id}`, data),
  
  delete: (id, confirm = false) => 
    sonorApi.delete(`/proposals/${id}`, { params: { confirm } }),
  
  duplicate: (id) => 
    sonorApi.post(`/proposals/${id}/duplicate`),
  
  send: (id, data = {}) => 
    sonorApi.post(`/proposals/${id}/send`, data),
  
  accept: (id, data = {}) => 
    sonorApi.post(`/proposals/${id}/accept`, data),

  sign: (id, data) =>
    sonorApi.post(`/proposals/${id}/sign`, data),

  /**
   * Re-send the signed PDF copy to the client. If `email` is provided, sends to
   * that address instead of the contact/recipient email on the proposal.
   * Backend reuses the stored PDF when possible, regenerates via Puppeteer when not.
   */
  resendSignedPdf: (id, email) =>
    sonorApi.post(`/proposals/${id}/resend-signed-pdf`, email ? { email } : {}),

  /**
   * Mark a proposal's deposit as paid outside of Sonor (check, wire, cash, etc.).
   * Flips the proposal_payments row to completed, updates any linked invoice,
   * and fires the same admin/team notifications as a real payment.
   *
   * @param {string} id - Proposal ID
   * @param {object} data - { paymentMethod, reference?, paidByName?, paidByEmail?, paidAt? }
   */
  markPaidOffline: (id, data) =>
    sonorApi.post(`/proposals/${id}/mark-paid-offline`, data),

  decline: (id, data = {}) =>
    sonorApi.post(`/proposals/${id}/decline`, data),
  
  trackView: (id) => 
    sonorApi.post(`/proposals/${id}/track-view`),
  
  updateViewTime: (viewId, timeOnPage) =>
    sonorApi.patch(`/proposals/views/${viewId}`, { timeOnPage }),
  
  getAnalytics: (id) =>
    sonorApi.get(`/proposals/${id}/analytics`),
  
  payDeposit: (id, data) =>
    sonorApi.post(`/proposals/${id}/pay-deposit`, data),
  
  // AI Generation
  createAI: (data) => 
    sonorApi.post('/proposals/ai/generate', data),
  
  getAIStatus: (id) => 
    sonorApi.get(`/proposals/${id}/ai/status`),
  
  updateAI: (id, instruction) => 
    sonorApi.post(`/proposals/${id}/ai/edit`, { instruction }),
  
  clarifyAI: (data) => 
    sonorApi.post('/proposals/ai/clarify', data),
  
  // Templates
  listTemplates: () => 
    sonorApi.get('/proposals/templates'),
  
  getTemplate: (id) => 
    sonorApi.get(`/proposals/templates/${id}`),
  
  createTemplate: (data) => 
    sonorApi.post('/proposals/templates', data),
}

// ============================================================================
// Audits API
// ============================================================================

export const auditsApi = {
  list: (params = {}) => 
    sonorApi.get('/audits', { params }),
  
  get: (id) => 
    sonorApi.get(`/audits/${id}`),

  getFull: (id) =>
    sonorApi.get(`/audits/${id}/full`),
  
  create: (data) => 
    sonorApi.post('/audits', data),
  
  // Internal audit (admin-only, no email)
  createInternal: (data) => 
    sonorApi.post('/audits/internal', data),
  
  getInternalStatus: (id) =>
    sonorApi.get(`/audits/internal/${id}/status`),
  
  // Public audit access
  getPublic: (id, token) => 
    sonorApi.get(`/audits/public/${id}`, token ? { params: { token } } : undefined),
  
  // Track audit view/interaction events
  track: (auditId, event = 'view', metadata = {}) => 
    sonorApi.post('/audits/track', { auditId, event, metadata }),
  
  // Shorthand for tracking view events
  trackView: (auditId, metadata = {}) => 
    sonorApi.post('/audits/track', { auditId, event: 'view', metadata }),
  
  validateToken: (token) => 
    sonorApi.post('/audits/validate-token', { token }),
  
  // Email audit report
  sendEmail: (data) => 
    sonorApi.post('/audits/send-email', data),
  
  // Generate magic link for audit access
  generateMagicLink: (data) => 
    sonorApi.post('/audits/magic-link', data),
  
  // Get audit analytics/metrics
  getAnalytics: (auditId) => 
    sonorApi.get(`/audits/${auditId}/analytics`),
}

// ============================================================================
// Forms API
// ============================================================================

export const formsApi = {
  list: (params = {}) => 
    sonorApi.get('/forms', { params }),
  
  get: (id) => 
    sonorApi.get(`/forms/${id}`),
  
  create: (data) => 
    sonorApi.post('/forms', data),
  
  update: (id, data) => 
    sonorApi.put(`/forms/${id}`, data),
  
  delete: (id) => 
    sonorApi.delete(`/forms/${id}`),
  
  // Submissions - new API structure
  listSubmissions: (params = {}) => 
    sonorApi.get('/forms/submissions/list', { params }),
  
  getSubmission: (submissionId) => 
    sonorApi.get(`/forms/submissions/${submissionId}`),
  
  updateSubmission: (submissionId, data) => 
    sonorApi.put(`/forms/submissions/${submissionId}`, data),
  
  deleteSubmission: (submissionId) => 
    sonorApi.delete(`/forms/submissions/${submissionId}`),
  
  // Analytics
  getAnalytics: (formId, params = {}) => 
    sonorApi.get(`/forms/${formId}/analytics`, { params }),
}

// ============================================================================
// Billing API
// ============================================================================

export const billingApi = {
  // Invoices
  listInvoices: (params = {}) => 
    sonorApi.get('/billing/invoices', { params }),
  
  getInvoice: (id) => 
    sonorApi.get(`/billing/invoices/${id}`),
  
  createInvoice: (data) => 
    sonorApi.post('/billing/invoices', data),
  
  updateInvoice: (id, data) => 
    sonorApi.put(`/billing/invoices/${id}`, data),
  
  deleteInvoice: (id, params = {}) =>
    sonorApi.delete(`/billing/invoices/${id}`, { params }),
  
  sendInvoice: (id, data = {}) => 
    sonorApi.post(`/billing/invoices/${id}/send`, data),
  
  markPaid: (id, data = {}) => 
    sonorApi.post(`/billing/invoices/${id}/mark-paid`, data),
  
  downloadPdf: (id) => 
    sonorApi.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' }),
  
  // Quick invoice (for new clients)
  createQuickInvoice: (data) => 
    sonorApi.post('/billing/invoices/quick', data),
  
  // Summary & Overdue
  getSummary: (params = {}) => 
    sonorApi.get('/billing/summary', { params }),
  
  getOverdue: () => 
    sonorApi.get('/billing/overdue'),

  // Aggregate analytics (conversion rate, avg time to pay, etc.)
  getAnalytics: (params = {}) =>
    sonorApi.get('/billing/analytics', { params }),
  
  // Reminders
  sendReminder: (id) => 
    sonorApi.post(`/billing/invoices/${id}/reminder`),
  
  // Recurring
  toggleRecurringPause: (id, paused) => 
    sonorApi.patch(`/billing/invoices/${id}/recurring`, { is_paused: paused }),
  
  // Payments
  getPaymentLink: (invoiceId) => 
    sonorApi.get(`/billing/invoices/${invoiceId}/payment-link`),
  
  processPayment: (invoiceId, paymentData) => 
    sonorApi.post(`/billing/invoices/${invoiceId}/pay`, paymentData),
  
  // Public endpoints (no auth required)
  getPublicInvoice: (token) => 
    sonorApi.get('/billing/invoices/public', { params: { token } }),
  
  payPublicInvoice: (data) => 
    sonorApi.post('/billing/pay-public', data),

  // Invoice analytics (view tracking + analytics)
  trackInvoiceView: (invoiceId, token) =>
    sonorApi.post(`/billing/invoices/${invoiceId}/track-view`, { token }),

  updateInvoiceViewTime: (viewId, token, timeOnPage) =>
    sonorApi.patch(`/billing/invoice-views/${viewId}/time`, { token, timeOnPage }),

  getInvoiceAnalytics: (invoiceId) =>
    sonorApi.get(`/billing/invoices/${invoiceId}/analytics`),

  // ── Subscription Management (Sonor → Org billing) ──

  getSubscription: () =>
    sonorApi.get('/billing/subscription'),

  getSeatInfo: () =>
    sonorApi.get('/billing/seats').then(r => r.data),

  activateProject: (projectId, data) =>
    sonorApi.post(`/billing/projects/${projectId}/activate`, data),

  changeProjectPlan: (projectId, data) =>
    sonorApi.patch(`/billing/projects/${projectId}/plan`, data),

  deactivateProject: (projectId) =>
    sonorApi.delete(`/billing/projects/${projectId}/deactivate`),

  createCheckout: (data) =>
    sonorApi.post('/billing/create-checkout', data),

  managePaymentMethod: (data = {}) =>
    sonorApi.post('/billing/payment-method', data),

  getPaymentMethod: () =>
    sonorApi.get('/billing/payment-method'),

  cancelSubscription: () =>
    sonorApi.post('/billing/subscription/cancel'),

  reactivateSubscription: () =>
    sonorApi.post('/billing/subscription/reactivate'),
}

// ============================================================================
// Agencies API (agency → client org management)
// ============================================================================

export const agenciesApi = {
  listManagedOrgs: (params = {}) =>
    sonorApi.get('/agencies/managed-orgs', { params }),

  getManagedOrgDetail: (clientOrgId) =>
    sonorApi.get(`/agencies/managed-orgs/${clientOrgId}`),

  getStats: () =>
    sonorApi.get('/agencies/managed-orgs/stats'),

  createClientOrg: (data) =>
    sonorApi.post('/agencies/managed-orgs', data),
}

// ============================================================================
// Files API
// ============================================================================

export const filesApi = {
  // Supabase-backed file endpoints
  listFiles: (params = {}) => 
    sonorApi.get('/files', { params }),

  listFolders: (projectId) => 
    sonorApi.get(`/files/folders/${projectId}`),

  uploadFile: (data) => 
    sonorApi.post('/files', data),

  uploadFileForm: (formData) =>
    sonorApi.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Register a file that was uploaded directly to Supabase Storage
  registerFile: (data) =>
    sonorApi.post('/files/register', data),

  getFile: (id) => 
    sonorApi.get(`/files/${id}`),

  downloadFile: (id) => 
    sonorApi.get(`/files/${id}/download`, { responseType: 'blob' }),

  deleteFile: (id) => 
    sonorApi.delete(`/files/${id}`),

  getCategories: () => 
    sonorApi.get('/files/categories'),

  replaceFile: (id, data) => 
    sonorApi.post(`/files/${id}/replace`, data),

  /** Create Google Doc (user OAuth). Returns { documentId, editUrl }. */
  createGoogleDoc: (projectId, title) =>
    sonorApi.post('/files/google/create-doc', { projectId, title }).then(r => r.data),

  /** Create Google Slides (user OAuth). Returns { documentId, editUrl }. */
  createGoogleSlide: (projectId, title) =>
    sonorApi.post('/files/google/create-slide', { projectId, title }).then(r => r.data),

  /** Create Google Sheet (user OAuth). Returns { documentId, editUrl }. */
  createGoogleSheet: (projectId, title) =>
    sonorApi.post('/files/google/create-sheet', { projectId, title }).then(r => r.data),

  /** Register an AI-generated image (e.g. from Broadcast) into Files. Returns { success, file, url }. */
  registerFromAiImage: (projectId, imageUrl, filename) =>
    sonorApi.post('/files/from-ai-image', { projectId, imageUrl, filename }).then(r => r.data),

  // Legacy Google Drive endpoints (still used in admin)
  list: (params = {}) => 
    sonorApi.get('/files/drive', { params }),
  
  upload: (formData, onProgress) => 
    sonorApi.post('/files/drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  
  // Base64 upload for Drive
  uploadBase64: (data) => 
    sonorApi.post('/files/drive/upload', data),
  
  delete: (id) => 
    sonorApi.delete(`/files/drive/${id}`),
  
  getDownloadUrl: (id) => 
    sonorApi.get(`/files/drive/${id}/download`),
  
  createFolder: (data) => 
    sonorApi.post('/files/drive/folders', data),
  
  move: (id, data) => 
    sonorApi.put(`/files/drive/${id}/move`, data),
}

// ============================================================================
// Screenshots API
// ============================================================================

export const screenshotsApi = {
  // Get responsive screenshots for a project (desktop, tablet, mobile)
  getResponsive: (projectId, force = false) => 
    sonorApi.get(`/screenshots/project/${projectId}/responsive`, { params: { force } }),
  
  // Capture new screenshots for a project
  capture: (projectId) => 
    sonorApi.post(`/screenshots/project/${projectId}/capture`),
}

// ============================================================================
// SEO API
// Note: The seo_sites table is deprecated. Projects ARE SEO sites now.
// projectId === projectId (use projectId consistently)
// ============================================================================

export const seoApi = {
  // ==================== OVERVIEW / DASHBOARD ====================
  // Note: getSite is now getOverview - projects are the SEO sites
  getOverview: (projectId) => 
    sonorApi.get(`/seo/projects/${projectId}/overview`),
  
  // Alias for backwards compatibility (getSite → getOverview)
  getProject: (projectId) => 
    sonorApi.get(`/seo/projects/${projectId}/overview`),
  
  // Alias for getSiteForOrg - just use getOverview with projectId
  getProjectForOrg: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/overview`),
  
  getTrends: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/trends`, { params }),
  
  getSettings: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/settings`),
  
  updateSettings: (projectId, data) =>
    sonorApi.put(`/seo/projects/${projectId}/settings`, data),
  
  // Site CRUD not needed - project lifecycle handles this
  // createSite, updateSite, deleteSite are deprecated
  // Projects ARE SEO sites - use projectId as projectId
  createProject: async (data) => {
    console.warn('seoApi.createSite is deprecated. Projects are created via projectsApi.')
    // Deprecated: returns a placeholder object; use projectsApi for real project CRUD
    const projectId = data.project_id || data.projectId || data.org_id
    return { 
      data: { 
        id: projectId, 
        domain: data.domain,
        site_name: data.siteName || data.domain,
      }
    }
  },
  
  updateProject: (projectId, data) => 
    sonorApi.put(`/seo/projects/${projectId}/settings`, data),
  
  deleteProject: async (projectId) => {
    console.warn('seoApi.deleteSite is deprecated. Projects are deleted via projectsApi.')
    return { data: { success: true } }
  },
  
  // Deprecated alias for listSites
  listSites: async (params = {}) => {
    console.warn('seoApi.listSites is deprecated. Use projectsApi to list projects.')
    return { data: { sites: [] } }
  },
  
  // ==================== PAGES ====================
  listPages: (projectId, params = {}) => 
    sonorApi.get(`/seo/projects/${projectId}/pages`, { params }),
  /** Alias for listPages – SEO hooks and other callers use getPages; same endpoint. */
  getPages: (projectId, params = {}) => 
    sonorApi.get(`/seo/projects/${projectId}/pages`, { params }),
  
  getPage: (pageId) =>
    sonorApi.get(`/seo/pages/${pageId}`),
  
  createPage: (projectId, data) => 
    sonorApi.post(`/seo/projects/${projectId}/pages`, data),
  
  updatePage: (pageId, data) => 
    sonorApi.put(`/seo/pages/${pageId}`, data),
  
  deletePage: (pageId) =>
    sonorApi.delete(`/seo/pages/${pageId}`),
  
  bulkUpdatePages: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/pages/bulk-update`, data),
  
  updatePageMetadata: (pageId, data) =>
    sonorApi.put(`/seo/pages/${pageId}`, data),
  
  // ==================== PAGE IMAGES ====================
  getPageImages: (projectId, pageId) =>
    sonorApi.get(`/seo/projects/${projectId}/pages/${pageId}/images`),
  
  updatePageImage: (projectId, pageId, imageId, data) =>
    sonorApi.patch(`/seo/projects/${projectId}/pages/${pageId}/images/${imageId}`, data),
  
  // Note: Crawling removed - pages are auto-discovered via site-kit page views
  
  // ==================== OPPORTUNITIES ====================
  getOpportunities: (projectId, params = {}) => 
    sonorApi.get(`/seo/projects/${projectId}/opportunities`, { params }),
  
  getOpportunity: (opportunityId) =>
    sonorApi.get(`/seo/opportunities/${opportunityId}`),
  
  createOpportunity: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/opportunities`, data),
  
  detectOpportunities: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/opportunities/detect`),
  
  updateOpportunity: (opportunityId, data) =>
    sonorApi.put(`/seo/opportunities/${opportunityId}`, data),
  
  deleteOpportunity: (opportunityId) =>
    sonorApi.delete(`/seo/opportunities/${opportunityId}`),
  
  bulkUpdateOpportunities: (data) => {
    // Normalize: hook may pass { opportunityIds, updates }; API expects { opportunityIds, status?, priority? }
    const body = data.updates ? { opportunityIds: data.opportunityIds, ...data.updates } : data
    return sonorApi.post('/seo/opportunities/bulk-update', body)
  },

  getOpportunitySummary: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/opportunities/summary`),
  
  getPageOpportunities: (pageId) =>
    sonorApi.get(`/seo/pages/${pageId}/opportunities`),
  
  dismissOpportunity: (opportunityId) =>
    sonorApi.put(`/seo/opportunities/${opportunityId}`, { status: 'dismissed' }),
  
  completeOpportunity: (opportunityId) =>
    sonorApi.put(`/seo/opportunities/${opportunityId}`, { status: 'completed' }),
  
  // ==================== QUERIES / KEYWORDS ====================
  listQueries: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/queries`, { params }),
  
  // Alias for listQueries (used by hooks)
  getQueries: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/queries`, { params }),
  
  getQuery: (queryId) =>
    sonorApi.get(`/seo/queries/${queryId}`),
  
  updateQuery: (queryId, data) =>
    sonorApi.put(`/seo/queries/${queryId}`, data),
  
  getTrackedQueries: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/queries/tracked`),
  
  getQuickWinQueries: (projectId, limit) =>
    sonorApi.get(`/seo/projects/${projectId}/queries/quick-wins`, { params: { limit } }),
  
  trackQueries: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/queries/track`, data),
  
  untrackQueries: (data) =>
    sonorApi.post('/seo/queries/untrack', data),
  
  // Legacy keyword aliases (keywords = queries)
  listKeywords: (projectId, params = {}) => 
    sonorApi.get(`/seo/projects/${projectId}/queries`, { params }),
  
  getTrackedKeywords: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/queries/tracked`),
  
  getKeywordsSummary: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/queries/summary`),
  
  getRankingHistory: (projectId, keywordId, options = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/queries/history`, { params: { keywordId, ...options } }),
  
  trackKeywords: (projectId, keywords) =>
    sonorApi.post(`/seo/projects/${projectId}/queries/track`, { queries: keywords }),
  
  addKeywords: (projectId, keywords) => 
    sonorApi.post(`/seo/projects/${projectId}/queries/track`, { queries: keywords }),
  
  autoDiscoverKeywords: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/queries/discover`),
  
  refreshKeywordRankings: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/queries/refresh`),
  
  // ==================== COMPETITORS ====================
  getCompetitors: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/competitors`),
  
  getCompetitor: (competitorId) =>
    sonorApi.get(`/seo/competitors/${competitorId}`),
  
  createCompetitor: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/competitors`, data),
  
  updateCompetitor: (competitorId, data) =>
    sonorApi.put(`/seo/competitors/${competitorId}`, data),
  
  deleteCompetitor: (competitorId) =>
    sonorApi.delete(`/seo/competitors/${competitorId}`),
  
  getCompetitorComparison: (projectId, competitorId) =>
    sonorApi.get(`/seo/projects/${projectId}/competitors/${competitorId}/comparison`),
  
  analyzeCompetitor: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/competitors/analyze`, data),
  
  // ==================== GSC (Google Search Console) ====================
  disconnectGsc: (projectId) =>
    sonorApi.delete(`/seo/projects/${projectId}/gsc`),
  
  getGscOverview: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/gsc/overview`, { params }),
  
  getGscQueries: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/gsc/queries`, { params }),

  getPageContentSummary: (pageId) =>
    sonorApi.get(`/seo/pages/${pageId}/content-summary`),
  
  getGscPages: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/gsc/pages`, { params }),
  
  clearGscData: (projectId) =>
    sonorApi.delete(`/seo/projects/${projectId}/gsc/cache`),
  
  getGscComparison: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/gsc/comparison`, { params }),
  
  getGscHealth: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/gsc/health`),
  
  reconcileGsc: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/gsc/reconcile`),
  
  // ==================== AI BRAIN ====================
  trainSite: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/ai/train`),
  
  getProjectKnowledge: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/ai/knowledge`),
  
  runAiBrain: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/ai/analyze`, data),
  
  // ==================== SIGNAL AI ====================
  getSignalLearning: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/signal/learning`),
  
  applySignalAutoFixes: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/signal/auto-fixes`),
  
  getSignalSuggestions: (projectId, pageId) =>
    sonorApi.get(`/seo/projects/${projectId}/signal/suggestions`, { params: { pageId } }),
  
  // ==================== AI RECOMMENDATIONS ====================
  getAiRecommendations: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/recommendations`, { params }),
  
  getRecommendationsSummary: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/recommendations/summary`),
  
  generateRecommendations: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/recommendations/generate`),
  
  applyRecommendation: (projectId, recommendationId) =>
    sonorApi.post(`/seo/projects/${projectId}/recommendations/${recommendationId}/apply`),
  
  applyRecommendations: (projectId, recommendationIds, autoOnly = false) =>
    sonorApi.post(`/seo/projects/${projectId}/recommendations/bulk-apply`, { recommendationIds, autoOnly }),
  
  updateRecommendationStatus: (recommendationId, status) =>
    sonorApi.patch(`/seo/recommendations/${recommendationId}/status`, { status }),
  
  dismissRecommendation: (projectId, recommendationId, reason = null) =>
    sonorApi.post(`/seo/recommendations/${recommendationId}/dismiss`, { reason }),
  
  analyzePageWithAi: (projectId, pageId) =>
    sonorApi.post(`/seo/projects/${projectId}/pages/${pageId}/ai-analyze`),
  
  // ==================== CONTENT BRIEFS ====================
  getContentBriefs: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/content-briefs`),
  
  getContentBrief: (projectId, pageId) => 
    sonorApi.get(`/seo/projects/${projectId}/pages/${pageId}/content-brief`),
  
  generateContentBrief: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/content-briefs`, data),
  
  // ==================== ALERTS ====================
  getAlerts: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/alerts`, { params }),
  
  checkAlerts: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/alerts/check`, data),
  
  acknowledgeAlert: (alertId) =>
    sonorApi.put(`/seo/alerts/${alertId}/acknowledge`),
  
  resolveAlert: (alertId, data = {}) =>
    sonorApi.put(`/seo/alerts/${alertId}/resolve`, data),
  
  // ==================== SERP FEATURES ====================
  getSerpFeatures: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/serp-features`, { params }),
  
  analyzeSerpFeatures: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/serp-features/analyze`),
  
  // ==================== LOCAL SEO ====================
  getLocalSeoAnalysis: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/local`),
  
  analyzeLocalSeo: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/local/analyze`),
  
  // Local Grids (Heat Map Configuration)
  getLocalGrids: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/local/grids`, { params }),
  
  getLocalGrid: (gridId) =>
    sonorApi.get(`/seo/local/grids/${gridId}`),
  
  createLocalGrid: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/local/grids`, data),
  
  updateLocalGrid: (gridId, data) =>
    sonorApi.put(`/seo/local/grids/${gridId}`, data),
  
  deleteLocalGrid: (gridId) =>
    sonorApi.delete(`/seo/local/grids/${gridId}`),
  
  // Heat Map Data (Local Rankings)
  getHeatMapData: (gridId, params = {}) =>
    sonorApi.get(`/seo/local/grids/${gridId}/heat-map`, { params }),
  
  getLocalRankings: (gridId, params = {}) =>
    sonorApi.get(`/seo/local/grids/${gridId}/rankings`, { params }),
  
  saveLocalRankings: (gridId, rankings) =>
    sonorApi.post(`/seo/local/grids/${gridId}/rankings`, { rankings }),
  
  crawlLocalGrid: (gridId, businessName, options = {}) =>
    sonorApi.post(`/seo/local/grids/${gridId}/crawl`, { 
      businessName, 
      keywords: options.keywords,
      delay: options.delay 
    }),
  
  // Entity Scores (GBP Health)
  getEntityScore: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/local/entity-score`),
  
  getEntityScoreHistory: (projectId, limit) =>
    sonorApi.get(`/seo/projects/${projectId}/local/entity-score/history`, { params: { limit } }),
  
  saveEntityScore: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/local/entity-score`, data),
  
  // Real GBP API Data (requires OAuth connection)
  getGbpProfile: (projectId) =>
    sonorApi.get(`/seo/${projectId}/gbp/profile`),
  
  getGbpReviews: (projectId, limit) =>
    sonorApi.get(`/seo/${projectId}/gbp/reviews`, { params: { limit } }),
  
  analyzeGbpEntityHealth: (projectId) =>
    sonorApi.post(`/seo/${projectId}/gbp/entity-health/analyze`),
  
  // Geo Pages (Local Coverage)
  getLocalPages: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/local/pages`, { params }),
  
  getLocalPage: (pageId) =>
    sonorApi.get(`/seo/local/pages/${pageId}`),
  
  createLocalPage: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/local/pages`, data),
  
  updateLocalPage: (pageId, data) =>
    sonorApi.put(`/seo/local/pages/${pageId}`, data),
  
  deleteLocalPage: (pageId) =>
    sonorApi.delete(`/seo/local/pages/${pageId}`),
  
  // Citations (NAP Consistency)
  getCitations: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/local/citations`, { params }),
  
  getCitation: (citationId) =>
    sonorApi.get(`/seo/local/citations/${citationId}`),
  
  createCitation: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/local/citations`, data),
  
  updateCitation: (citationId, data) =>
    sonorApi.put(`/seo/local/citations/${citationId}`, data),
  
  deleteCitation: (citationId) =>
    sonorApi.delete(`/seo/local/citations/${citationId}`),
  
  checkCitation: (citationId, canonicalNap) =>
    sonorApi.post(`/seo/local/citations/${citationId}/check`, canonicalNap),
  
  // GBP Connections
  getGbpConnection: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/local/gbp`),
  
  createGbpConnection: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/local/gbp`, data),
  
  updateGbpConnection: (projectId, data) =>
    sonorApi.put(`/seo/projects/${projectId}/local/gbp`, data),
  
  deleteGbpConnection: (projectId) =>
    sonorApi.delete(`/seo/projects/${projectId}/local/gbp`),

  // ==================== INTERNAL LINKS ====================
  getInternalLinks: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/internal-links`),

  recalculateInternalLinks: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/internal-links/recalculate`),
  
  // ==================== SCHEMA MARKUP ====================
  getSchemaStatus: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/schemas/summary`),
  getSchemas: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/schemas/summary`),
  
  listSchemas: (projectId, query = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/schemas`, { params: query }),
  
  getPageSchemas: (pageId, projectId) =>
    sonorApi.get(`/seo/pages/${pageId}/schemas`, { params: { projectId } }),
  
  createSchema: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/schemas`, data),
  
  updateSchema: (schemaId, data) =>
    sonorApi.patch(`/seo/schemas/${schemaId}`, data),
  
  deleteSchema: (schemaId) =>
    sonorApi.delete(`/seo/schemas/${schemaId}`),
  
  markSchemaImplemented: (schemaId) =>
    sonorApi.post(`/seo/schemas/${schemaId}/implement`),
  
  verifySchema: (schemaId) =>
    sonorApi.post(`/seo/schemas/${schemaId}/verify`),
  
  // ==================== TECHNICAL AUDIT ====================
  getTechnicalAudit: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/technical-audit`),
  
  runTechnicalAudit: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/technical-audit`),
  
  // ==================== CONTENT DECAY ====================
  getContentDecay: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/content-decay`),
  
  detectContentDecay: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/content-decay/detect`),
  
  // ==================== BACKLINKS ====================
  getBacklinkOpportunities: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/backlinks`),
  
  discoverBacklinks: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/backlinks/discover`),
  
  updateBacklinkOpportunity: (projectId, backlinkId, data) =>
    sonorApi.put(`/seo/projects/${projectId}/backlinks/${backlinkId}`, data),
  
  // ==================== AUTOMATION ====================
  runAutoOptimize: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/auto-optimize`, data),
  
  scheduleAnalysis: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/schedule`, data),
  
  // ==================== INDEXING ====================
  getIndexingStatus: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/indexing`, { params }),
  getIndexingIssues: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/indexing`, { params }),
  
  getIndexingSummary: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/indexing/summary`),
  
  requestIndexing: (indexingId) =>
    sonorApi.post(`/seo/indexing/${indexingId}/request`),
  getSitemapsStatus: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/sitemaps`),
  
  inspectUrl: (projectId, url) =>
    sonorApi.post(`/seo/projects/${projectId}/indexing/inspect`, { url }),
  
  bulkInspectUrls: (projectId, urls) =>
    sonorApi.post(`/seo/projects/${projectId}/indexing/bulk-inspect`, { urls }),
  
  analyzeIndexingIssues: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/indexing/analyze`),

  /** Google Indexing API: submit a single URL for indexing (200/day quota) */
  submitUrlForIndexing: (projectId, url, type = 'URL_UPDATED') =>
    sonorApi.post(`/seo/projects/${projectId}/indexing/submit`, { url, type }).then(r => r.data),

  /** Google Indexing API: submit multiple URLs (respects daily quota) */
  submitBulkForIndexing: (projectId, urls, type = 'URL_UPDATED') =>
    sonorApi.post(`/seo/projects/${projectId}/indexing/submit/bulk`, { urls, type }).then(r => r.data),

  /** Remaining Indexing API submissions for today (max 200/day) */
  getIndexingSubmitQuota: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/indexing/submit/quota`).then(r => r.data),

  /** Last submission status for a URL */
  getIndexingSubmitStatus: (projectId, url) =>
    sonorApi.get(`/seo/projects/${projectId}/indexing/submit/status`, { params: { url } }).then(r => r.data),

  // ==================== BLOG AI ====================
  getBlogTopicRecommendations: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/blog/topics`),
  
  analyzeBlogBrain: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/blog/brain`, data),
  
  analyzeBlogPost: (postId) =>
    sonorApi.post(`/seo/blog/${postId}/analyze`),
  
  generateBlogContent: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/blog/generate`, data),
  
  analyzeAllBlogPosts: () =>
    sonorApi.post('/seo/blog/analyze-all'),
  
  fixBlogPostEmDashes: (postId) =>
    sonorApi.post(`/seo/blog/${postId}/fix-em-dashes`),
  
  fixAllBlogPostEmDashes: () =>
    sonorApi.post('/seo/blog/fix-all-em-dashes'),
  
  optimizeBlogPost: (postId, options = {}) =>
    sonorApi.post(`/seo/blog/${postId}/optimize`, options),
  
  addBlogPostCitations: (postId, applyChanges = false) =>
    sonorApi.post(`/seo/blog/${postId}/citations`, { applyChanges }),
  
  // ==================== BACKGROUND JOBS ====================
  startBackgroundJob: (data) =>
    sonorApi.post('/seo/jobs', data),
  
  getJobStatus: (jobId) =>
    sonorApi.get(`/seo/jobs/${jobId}`),
  
  listBackgroundJobs: () =>
    sonorApi.get('/seo/jobs'),
  
  extractSiteMetadata: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/extract-metadata`),

  /** Crawl sitemap / extract pages metadata (triggers discovery for technical audit & CWV) */
  crawlSitemap: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/extract-metadata`),

  /** Single-page crawl: deprecated – pages are auto-discovered via site-kit. No-op that resolves for UI compatibility. */
  crawlPage: (_pageId) => Promise.resolve({ data: { success: true } }),
  
  // ==================== SITE REVALIDATION ====================
  revalidateSite: (data) =>
    sonorApi.post('/seo/revalidate', data),
  
  // ==================== GSC FIXES ====================
  getGscIssues: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/gsc/issues`),
  
  applyGscFix: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/gsc/fix`, data),
  
  generateGscFixSuggestions: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/gsc/suggestions`),
  
  // ==================== REDIRECTS ====================
  getRedirects: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/redirects`),
  
  createRedirect: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/redirects`, data),
  
  updateRedirect: (id, data) =>
    sonorApi.put(`/seo/redirects/${id}`, data),
  
  deleteRedirect: (id) =>
    sonorApi.delete(`/seo/redirects/${id}`),

  fixRedirectChain: (projectId, chainId) =>
    sonorApi.post(`/seo/projects/${projectId}/redirects/fix-chain`, { chainId }),

  // ==================== RECONCILIATION ====================
  getReconciliationReport: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/reconciliation`),

  triggerReconciliation: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/reconciliation/run`),

  submitUrlRemoval: (projectId, url) =>
    sonorApi.post(`/seo/projects/${projectId}/gsc/indexing/remove`, { url }),

  // ==================== REPORTS ====================
  getReports: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/reports`),
  
  generateReport: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/reports`, data),
  
  // ==================== RANKING HISTORY ====================
  getRankingHistory: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/ranking-history`, { params }),
  
  archiveRankings: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/ranking-history/snapshot`),
  
  backfillRankingHistory: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/ranking-history/backfill`),
  
  // ==================== CORE WEB VITALS ====================
  getCwvHistory: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/cwv`, { params }),
  
  checkPageCwv: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/cwv/check`, data),
  
  checkAllPagesCwv: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/cwv/check-all`, data),
  
  getCwvSummary: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/cwv/summary`),
  
  // ==================== TOPIC CLUSTERS ====================
  getTopicClusters: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/topic-clusters`),

  // Writing Guidelines
  getWritingGuidelines: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/writing-guidelines`).then(res => res.data),

  updateWritingGuidelines: (projectId, data) =>
    sonorApi.put(`/seo/projects/${projectId}/writing-guidelines`, data).then(res => res.data),
  
  generateTopicClusters: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/topic-clusters`, data),
  
  // ==================== CANNIBALIZATION ====================
  getCannibalization: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/cannibalization`),
  
  detectCannibalization: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/cannibalization/detect`, data),
  
  // ==================== CONTENT GAP ====================
  getContentGaps: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/content-gaps`),
  
  analyzeContentGaps: (projectId, data = {}) =>
    sonorApi.post(`/seo/projects/${projectId}/content-gaps/analyze`, data),
  
  // ==================== GSC SYNC ====================
  // Backend uses projectId only; no body (GSC property comes from OAuth connection).
  syncGsc: (projectId) =>
    sonorApi.post(`/seo/projects/${projectId}/sync/gsc`),
  
  // ==================== SERP ANALYSIS ====================
  analyzeSerpForKeyword: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/serp/analyze`, data),
  
  // Analytics (legacy)
  getSiteAnalytics: (projectId, params = {}) => 
    sonorApi.get(`/seo/projects/${projectId}/analytics`, { params }),
  
  // ==================== CHANGE HISTORY ====================
  getChangeHistory: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/change-history`, { params }),
  
  getChangeHistorySummary: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/change-history/summary`),
  
  createChangeHistory: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/change-history`, data),
  
  updateChangeHistory: (projectId, changeId, data) =>
    sonorApi.patch(`/seo/projects/${projectId}/change-history/${changeId}`, data),
  
  revertChange: (projectId, changeId) =>
    sonorApi.post(`/seo/projects/${projectId}/change-history/${changeId}/revert`),
  
  recordChangeBaseline: (projectId, changeId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/change-history/${changeId}/baseline`, data),
  
  recordChangeImpact: (projectId, changeId, period, data) =>
    sonorApi.post(`/seo/projects/${projectId}/change-history/${changeId}/impact/${period}`, data),
  
  // ==================== SPRINTS ====================
  getSprints: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/sprints`, { params }),
  
  getCurrentSprint: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/sprints/current`),
  
  getSuggestedGoals: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/sprints/suggest-goals`),
  
  getSprintTemplates: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/sprints/templates`),
  
  createSprint: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/sprints`, data),
  
  updateSprint: (projectId, sprintId, data) =>
    sonorApi.put(`/seo/projects/${projectId}/sprints/${sprintId}`, data),
  
  completeSprintGoal: (projectId, sprintId, goalId) =>
    sonorApi.post(`/seo/projects/${projectId}/sprints/${sprintId}/goals/${goalId}/complete`),
  
  updateGoalProgress: (projectId, sprintId, goalId, currentValue) =>
    sonorApi.put(`/seo/projects/${projectId}/sprints/${sprintId}/goals/${goalId}/progress`, { current_value: currentValue }),
  
  deleteSprint: (projectId, sprintId) =>
    sonorApi.delete(`/seo/projects/${projectId}/sprints/${sprintId}`),
  
  // ==================== AUTOPILOT ====================
  getAutopilotSettings: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/autopilot/settings`),
  
  updateAutopilotSettings: (projectId, data) =>
    sonorApi.put(`/seo/projects/${projectId}/autopilot/settings`, data),
  
  getAutopilotQueue: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/autopilot/queue`, { params }),
  
  approveAutopilotItem: (projectId, itemId) =>
    sonorApi.post(`/seo/projects/${projectId}/autopilot/queue/${itemId}/approve`),
  
  rejectAutopilotItem: (projectId, itemId) =>
    sonorApi.post(`/seo/projects/${projectId}/autopilot/queue/${itemId}/reject`),
  
  applyAutopilotItem: (projectId, itemId) =>
    sonorApi.post(`/seo/projects/${projectId}/autopilot/queue/${itemId}/apply`),
  
  // ==================== COLLABORATION - TASKS ====================
  getTasks: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/tasks`, { params }),
  
  getMyTasks: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/tasks/my`),
  
  getTask: (taskId) =>
    sonorApi.get(`/seo/tasks/${taskId}`),
  
  createTask: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/tasks`, data),
  
  updateTask: (taskId, data) =>
    sonorApi.patch(`/seo/tasks/${taskId}`, data),
  
  deleteTask: (taskId) =>
    sonorApi.delete(`/seo/tasks/${taskId}`),
  
  // ==================== COLLABORATION - COMMENTS ====================
  getComments: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/comments`, { params }),
  
  createComment: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/comments`, data),
  
  updateComment: (commentId, data) =>
    sonorApi.patch(`/seo/comments/${commentId}`, data),
  
  deleteComment: (commentId) =>
    sonorApi.delete(`/seo/comments/${commentId}`),
  
  // ==================== COLLABORATION - APPROVALS ====================
  getApprovals: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/approvals`, { params }),
  
  getApproval: (approvalId) =>
    sonorApi.get(`/seo/approvals/${approvalId}`),
  
  createApproval: (projectId, data) =>
    sonorApi.post(`/seo/projects/${projectId}/approvals`, data),
  
  decideApproval: (approvalId, data) =>
    sonorApi.post(`/seo/approvals/${approvalId}/decide`, data),
  
  // ==================== COLLABORATION - ACTIVITY ====================
  getActivity: (projectId, params = {}) =>
    sonorApi.get(`/seo/projects/${projectId}/activity`, { params }),
  
  // ==================== COLLABORATION - TEAM ====================
  getTeamMembers: (projectId) =>
    sonorApi.get(`/seo/projects/${projectId}/team`),
}

// ============================================================================
// CRM API
// ============================================================================

export const crmApi = {
  // Prospects
  listProspects: (params = {}) => 
    sonorApi.get('/crm/prospects', { params }),
  
  getProspect: (id) => 
    sonorApi.get(`/crm/prospects/${id}`),
  
  createProspect: (data) => 
    sonorApi.post('/crm/prospects', data),
  
  updateProspect: (id, data) => 
    sonorApi.put(`/crm/prospects/${id}`, data),
  
  deleteProspect: (id) => 
    sonorApi.delete(`/crm/prospects/${id}`),
  
  bulkUpdateProspects: (ids, data) => 
    sonorApi.post('/crm/prospects/bulk-update', { ids, ...data }),
  
  getProspectActivity: (contactId) => 
    sonorApi.get(`/crm/prospects/${contactId}/activity`),
  
  // Contacts
  listContacts: (params = {}) => 
    sonorApi.get('/crm/contacts', { params }),
  
  getContact: (id) => 
    sonorApi.get(`/crm/contacts/${id}`),
  
  createContact: (data) => 
    sonorApi.post('/crm/contacts', data),
  
  updateContact: (id, data) => 
    sonorApi.put(`/crm/contacts/${id}`, data),
  
  deleteContact: (id) => 
    sonorApi.delete(`/crm/contacts/${id}`),
  
  assignContact: (contactId, assignedTo) =>
    sonorApi.post('/crm/contacts/assign', { contactId, assignedTo }),
  
  // Calls
  listCalls: (params = {}) => 
    sonorApi.get('/crm/calls', { params }),
  
  getCall: (id) => 
    sonorApi.get(`/crm/calls/${id}`),
  
  // Tasks
  listTasks: (params = {}) => 
    sonorApi.get('/crm/tasks', { params }),
  
  getTask: (id) => 
    sonorApi.get(`/crm/tasks/${id}`),
  
  createTask: (data) => 
    sonorApi.post('/crm/tasks', data),
  
  updateTask: (id, data) => 
    sonorApi.put(`/crm/tasks/${id}`, data),
  
  deleteTask: (id) => 
    sonorApi.delete(`/crm/tasks/${id}`),
  
  // Follow-ups
  listFollowUps: (params = {}) => 
    sonorApi.get('/crm/follow-ups', { params }),
  
  getFollowUp: (id) => 
    sonorApi.get(`/crm/follow-ups/${id}`),
  
  createFollowUp: (data) => 
    sonorApi.post('/crm/follow-ups', data),
  
  updateFollowUp: (id, data) => 
    sonorApi.put(`/crm/follow-ups/${id}`, data),
  
  deleteFollowUp: (id) => 
    sonorApi.delete(`/crm/follow-ups/${id}`),
  
  // Notes
  createNote: (data) => 
    sonorApi.post('/crm/notes', data),
  
  // Emails
  listEmails: (params = {}) => 
    sonorApi.get('/crm/emails', { params }),
  
  // Deals
  listDeals: (params = {}) => 
    sonorApi.get('/crm/deals', { params }),
  
  getDeal: (id) => 
    sonorApi.get(`/crm/deals/${id}`),
  
  createDeal: (data) => 
    sonorApi.post('/crm/deals', data),
  
  updateDeal: (id, data) => 
    sonorApi.put(`/crm/deals/${id}`, data),
  
  // Activities
  listActivities: (params = {}) => 
    sonorApi.get('/crm/activities', { params }),
  
  createActivity: (data) => 
    sonorApi.post('/crm/activities', data),
  
  // Pipeline
  getPipeline: () => 
    sonorApi.get('/crm/pipeline'),
  
  updateStages: (stages) => 
    sonorApi.put('/crm/pipeline/stages', { stages }),
  
  // Conversions
  convertProspect: (contactId, data) =>
    sonorApi.post('/crm/convert-prospect', { contactId, ...data }),
  
  convertProspectToContact: (prospectId) =>
    sonorApi.post(`/crm/prospects/${prospectId}/convert-to-contact`),
  
  convertProspectToCustomer: (prospectId) =>
    sonorApi.post(`/crm/prospects/${prospectId}/convert-to-customer`),
  
  // Timeline & Proposals
  getProspectTimeline: (prospectId) =>
    sonorApi.get(`/crm/prospects/${prospectId}/timeline`),
  
  getProspectProposals: (prospectId) =>
    sonorApi.get(`/crm/prospects/${prospectId}/proposals`),
  
  getProspectEmails: (prospectId) =>
    sonorApi.get(`/crm/prospects/${prospectId}/emails`),
  
  // Pipeline Configuration
  getPipelineStages: (projectId) =>
    sonorApi.get(`/crm/pipeline-stages`, { params: { projectId } }),
  
  updatePipelineStages: (projectId, stages) =>
    sonorApi.post(`/crm/pipeline-stages/bulk-update`, { projectId, stages }),
  
  // Notifications
  getNotifications: (params = {}) =>
    sonorApi.get('/crm/notifications', { params }),
  
  markNotificationRead: (notificationId) =>
    sonorApi.post('/crm/notifications/mark-read', { notificationId }),
  
  markAllNotificationsRead: () =>
    sonorApi.post('/crm/notifications/mark-all-read'),
  
  // Calls
  logCallIntent: (data) =>
    sonorApi.post('/crm/calls/log-intent', data),
  
  // ==================== TARGET COMPANIES (Prospecting) ====================
  
  // List all target companies for org
  listTargetCompanies: (params = {}) =>
    sonorApi.get('/crm/target-companies', { params }),
  
  // Get single target company
  getTargetCompany: (id) =>
    sonorApi.get(`/crm/target-companies/${id}`),
  
  // Get target company by domain
  getTargetCompanyByDomain: (domain) =>
    sonorApi.get('/crm/target-companies/domain', { params: { domain } }),
  
  // Analyze a website (calls Signal API)
  analyzeWebsite: (domain, options = {}) =>
    sonorApi.post('/crm/target-companies/analyze', { domain, ...options }),
  
  // Create target company (usually from extension)
  createTargetCompany: (data) =>
    sonorApi.post('/crm/target-companies', data),
  
  // Update target company
  updateTargetCompany: (id, data) =>
    sonorApi.put(`/crm/target-companies/${id}`, data),
  
  // Claim a company (assign to current user)
  claimTargetCompany: (id) =>
    sonorApi.post(`/crm/target-companies/${id}/claim`),
  
  // Unclaim a company
  unclaimTargetCompany: (id) =>
    sonorApi.post(`/crm/target-companies/${id}/unclaim`),
  
  // Get/generate call prep for company
  getCallPrep: (id, regenerate = false) =>
    sonorApi.post(`/crm/target-companies/${id}/call-prep`, { regenerate }),
  
  // Trigger PageSpeed audit for company
  triggerAudit: (id, options = {}) =>
    sonorApi.post(`/crm/target-companies/${id}/trigger-audit`, options),
  
  // Get audit status and scores
  getAuditStatus: (id) =>
    sonorApi.get(`/crm/target-companies/${id}/audit-status`),
  
  // Generate personalized outreach email
  generateOutreach: (id, options = {}) =>
    sonorApi.post(`/crm/target-companies/${id}/generate-outreach`, options),
  
  // Save scraped contacts from page
  saveContacts: (id, contacts) =>
    sonorApi.post(`/crm/target-companies/${id}/save-contacts`, { contacts }),
  
  // Delete target company
  deleteTargetCompany: (id) =>
    sonorApi.delete(`/crm/target-companies/${id}`),

  // ==================== CLIENT PROSPECTS (Non-Sonor Orgs) ====================
  
  // Get form submission linked to prospect
  getProspectFormSubmission: (id) =>
    sonorApi.get(`/crm/client-prospects/${id}/form-submission`),
  
  // Convert prospect to commerce customer
  convertToCustomer: (id, data = {}) =>
    sonorApi.post(`/crm/client-prospects/${id}/convert-to-customer`, data),
  
  // Get Gmail threads for prospect
  getProspectEmails: (id, params = {}) =>
    sonorApi.get(`/crm/client-prospects/${id}/emails`, { params }),
  
  // Get Sync meetings for prospect
  getProspectMeetings: (id) =>
    sonorApi.get(`/crm/client-prospects/${id}/meetings`),
  
  // ==================== REMINDERS ====================
  
  listReminders: (params = {}) =>
    sonorApi.get('/crm/reminders', { params }),
  
  createReminder: (prospectId, data) =>
    sonorApi.post(`/crm/reminders/prospects/${prospectId}`, data),
  
  updateReminder: (id, data) =>
    sonorApi.put(`/crm/reminders/${id}`, data),
  
  completeReminder: (id) =>
    sonorApi.patch(`/crm/reminders/${id}/complete`),
  
  deleteReminder: (id) =>
    sonorApi.delete(`/crm/reminders/${id}`),
  
  // ==================== CUSTOM FIELDS ====================
  
  listCustomFields: () =>
    sonorApi.get('/crm/custom-fields'),
  
  createCustomField: (data) =>
    sonorApi.post('/crm/custom-fields', data),
  
  updateCustomField: (id, data) =>
    sonorApi.put(`/crm/custom-fields/${id}`, data),
  
  deleteCustomField: (id) =>
    sonorApi.delete(`/crm/custom-fields/${id}`),
  
  reorderCustomFields: (fieldIds) =>
    sonorApi.post('/crm/custom-fields/reorder', { fieldIds }),
  
  // ==================== PIPELINE STAGES ====================
  
  listPipelineStages: () =>
    sonorApi.get('/crm/pipeline-stages'),
  
  createPipelineStage: (data) =>
    sonorApi.post('/crm/pipeline-stages', data),
  
  updatePipelineStage: (id, data) =>
    sonorApi.put(`/crm/pipeline-stages/${id}`, data),
  
  deletePipelineStage: (id) =>
    sonorApi.delete(`/crm/pipeline-stages/${id}`),
  
  reorderPipelineStages: (stageIds) =>
    sonorApi.post('/crm/pipeline-stages/reorder', { stageIds }),
  
  // ==================== DEAL TRACKING ====================
  
  updateProspectDeal: (prospectId, data) =>
    sonorApi.patch(`/crm/prospects/${prospectId}/deal`, data),
  
  // ==================== ANALYTICS ====================
  
  getPipelineSummary: (params = {}) =>
    sonorApi.get('/crm/analytics/pipeline-summary', { params }),
  
  getPipelineVelocity: (params = {}) =>
    sonorApi.get('/crm/analytics/pipeline-velocity', { params }),
  
  getRevenueForecast: (params = {}) =>
    sonorApi.get('/crm/analytics/revenue-forecast', { params }),
  
  getSourcePerformance: (params = {}) =>
    sonorApi.get('/crm/analytics/source-performance', { params }),
  
  getTeamPerformance: (params = {}) =>
    sonorApi.get('/crm/analytics/team-performance', { params }),
  
  // ==================== GMAIL INTEGRATION ====================
  
  getGmailStatus: () =>
    sonorApi.get('/crm/gmail/status'),
  
  connectGmail: (redirectUri) =>
    sonorApi.post('/crm/gmail/connect', { redirectUri }),
  
  disconnectGmail: () =>
    sonorApi.post('/crm/gmail/disconnect'),
  
  sendGmailEmail: (prospectId, data) =>
    sonorApi.post(`/crm/gmail/prospects/${prospectId}/send`, data),
  
  replyToGmailThread: (prospectId, threadId, data) =>
    sonorApi.post(`/crm/gmail/prospects/${prospectId}/threads/${threadId}/reply`, data),

  // ==================== GMAIL INBOX (Full Inbox View) ====================
  
  /**
   * Sync full inbox with classification
   * @param {Object} options - { maxEmails, forceRefresh }
   */
  syncFullInbox: (options = {}) =>
    sonorApi.post('/crm/gmail/inbox/sync', {}, { 
      params: { 
        maxEmails: options.maxEmails || 100,
        forceRefresh: options.forceRefresh ? 'true' : undefined
      } 
    }),
  
  /**
   * Get classified inbox with filters
   * @param {Object} options - { classification, needsResponse, includeSpam, limit, offset }
   */
  getClassifiedInbox: (options = {}) =>
    sonorApi.get('/crm/gmail/inbox', { 
      params: { 
        classification: Array.isArray(options.classification) ? options.classification.join(',') : options.classification,
        needsResponse: options.needsResponse !== undefined ? options.needsResponse.toString() : undefined,
        includeSpam: options.includeSpam ? 'true' : undefined,
        limit: options.limit || 50,
        offset: options.offset || 0
      } 
    }),
  
  /**
   * Get emails needing response (for unified tasks)
   * @param {Object} options - { priority, limit }
   */
  getEmailsNeedingResponse: (options = {}) =>
    sonorApi.get('/crm/gmail/inbox/needs-response', { 
      params: { 
        priority: options.priority,
        limit: options.limit || 20
      } 
    }),
  
  /**
   * Get inbox statistics
   */
  getInboxStats: () =>
    sonorApi.get('/crm/gmail/inbox/stats'),

  // ==================== LEAD ASSIGNMENT ====================

  /**
   * Get unassigned leads queue
   * @param {Object} params - { source, min_score, sort_by, sort_order, limit, offset }
   */
  listUnassignedLeads: (params = {}) =>
    sonorApi.get('/crm/assignments/unassigned', { params }),

  /**
   * Get count of unassigned leads
   */
  getUnassignedLeadCount: () =>
    sonorApi.get('/crm/assignments/unassigned/count'),

  /**
   * Assign a lead to a team member
   * @param {Object} data - { contact_id, assigned_to, assignment_type, reason, notify }
   */
  assignLead: (data) =>
    sonorApi.post('/crm/assignments/assign', data),

  /**
   * Bulk assign multiple leads
   * @param {Object} data - { contact_ids, assigned_to, assignment_type, notify }
   */
  bulkAssignLeads: (data) =>
    sonorApi.post('/crm/assignments/bulk-assign', data),

  /**
   * Claim an unassigned lead for yourself
   * @param {string} contactId - Contact ID to claim
   */
  claimLead: (contactId) =>
    sonorApi.post('/crm/assignments/claim', { contact_id: contactId }),

  /**
   * Get assignment history for a lead
   * @param {string} contactId - Contact ID
   */
  getLeadAssignmentHistory: (contactId) =>
    sonorApi.get(`/crm/assignments/history/${contactId}`),

  /**
   * Get team assignment statistics
   */
  getTeamAssignmentStats: () =>
    sonorApi.get('/crm/assignments/stats'),

  // ==================== CLIENTS ====================

  /**
   * List clients with health metrics
   * @param {Object} params - { health, search, sortBy, sortOrder, limit, offset }
   */
  listClients: (params = {}) =>
    sonorApi.get('/crm/clients', { params }),

  /**
   * Import clients from CSV data
   * @param {Object} data - { clients: [...], skipDuplicates }
   */
  importClients: (data) =>
    sonorApi.post('/crm/clients/import', data),

  /**
   * Get org-wide email threads for a contact (cross-user visibility)
   * @param {string} contactId - Contact ID
   * @param {Object} params - { limit, offset, threadId }
   */
  getContactEmails: (contactId, params = {}) =>
    sonorApi.get(`/crm/clients/${contactId}/emails`, { params }),
}

// ============================================================================
// Reputation API
// ============================================================================

export const reputationApi = {
  // Platforms
  listPlatforms: (projectId) =>
    sonorApi.get(`/reputation/projects/${projectId}/platforms`),
  
  getPlatform: (id) =>
    sonorApi.get(`/reputation/platforms/${id}`),
  
  connectPlatform: (projectId, data) =>
    sonorApi.post(`/reputation/projects/${projectId}/platforms`, data),

  /** Link unified Google OAuth connection to reputation (after user selects GBP location). */
  linkGoogleConnection: (projectId, connectionId) =>
    sonorApi.post(`/reputation/projects/${projectId}/platforms/link-google-connection`, { connectionId }),
  
  updatePlatform: (id, data) =>
    sonorApi.put(`/reputation/platforms/${id}`, data),
  
  disconnectPlatform: (id) =>
    sonorApi.delete(`/reputation/platforms/${id}`),
  
  syncPlatform: (id) =>
    sonorApi.post(`/reputation/platforms/${id}/sync`),
  
  // Reviews
  listReviews: (projectId, params = {}) =>
    sonorApi.get(`/reputation/projects/${projectId}/reviews`, { params }),
  
  getReview: (id) =>
    sonorApi.get(`/reputation/reviews/${id}`),
  
  respondToReview: (id, data) =>
    sonorApi.post(`/reputation/reviews/${id}/respond`, data),
  
  generateResponse: (reviewId) =>
    sonorApi.post(`/reputation/reviews/${reviewId}/generate-response`),
  
  approveResponse: (reviewId) =>
    sonorApi.post(`/reputation/reviews/${reviewId}/approve-response`),
  
  rejectResponse: (reviewId) =>
    sonorApi.post(`/reputation/reviews/${reviewId}/reject-response`),
  
  updateReview: (id, data) =>
    sonorApi.put(`/reputation/reviews/${id}`, data),
  
  // Auto-response settings
  getSettings: (projectId) =>
    sonorApi.get(`/reputation/projects/${projectId}/settings`),
  
  updateSettings: (projectId, data) =>
    sonorApi.put(`/reputation/projects/${projectId}/settings`, data),
  
  // Analytics
  getOverview: (projectId, params = {}) =>
    sonorApi.get(`/reputation/projects/${projectId}/overview`, { params }),
  
  getSentimentTrends: (projectId, params = {}) =>
    sonorApi.get(`/reputation/projects/${projectId}/sentiment-trends`, { params }),
  
  getTopKeywords: (projectId, params = {}) =>
    sonorApi.get(`/reputation/projects/${projectId}/keywords`, { params }),
  
  // Page matching (SEO integration)
  matchReviewsToPages: (projectId) =>
    sonorApi.post(`/reputation/projects/${projectId}/match-pages`),

  // Review Removal
  analyzeRemoval: (reviewId) =>
    sonorApi.get(`/reputation/reviews/${reviewId}/analyze-removal`),
  
  flagForRemoval: (reviewId, data) =>
    sonorApi.post(`/reputation/reviews/${reviewId}/flag-removal`, data),
  
  submitRemoval: (reviewId) =>
    sonorApi.post(`/reputation/reviews/${reviewId}/submit-removal`),
  
  escalateRemovalEmail: (reviewId, data = {}) =>
    sonorApi.post(`/reputation/reviews/${reviewId}/escalate-email`, data),
  
  updateRemovalStatus: (reviewId, data) =>
    sonorApi.put(`/reputation/reviews/${reviewId}/removal-status`, data),
  
  getFlaggedReviews: (projectId) =>
    sonorApi.get(`/reputation/projects/${projectId}/flagged-reviews`),
}

// ============================================================================
// Unified Contacts API
// New unified contacts system that consolidates prospects, contacts, and customers
// ============================================================================

export const contactsApi = {
  // List contacts with filters
  list: (params = {}) => 
    sonorApi.get('/contacts', { params }),
  
  // List contacts for a specific project
  listByProject: (projectId, params = {}) => 
    sonorApi.get(`/projects/${projectId}/contacts`, { params }),
  
  // Get contact summary statistics
  getSummary: (params = {}) => 
    sonorApi.get('/contacts/summary', { params }),
  
  // Get single contact by ID
  get: (id) => 
    sonorApi.get(`/contacts/${id}`),
  
  // Get contact by email
  getByEmail: (email) => 
    sonorApi.get(`/contacts/email/${encodeURIComponent(email)}`),
  
  // Create new contact
  create: (data) => 
    sonorApi.post('/contacts', data),
  
  // Create contact for specific project
  createForProject: (projectId, data) => 
    sonorApi.post(`/projects/${projectId}/contacts`, data),
  
  // Update contact
  update: (id, data) => 
    sonorApi.put(`/contacts/${id}`, data),
  
  // Partial update contact
  patch: (id, data) => 
    sonorApi.patch(`/contacts/${id}`, data),
  
  // Delete contact
  delete: (id) => 
    sonorApi.delete(`/contacts/${id}`),
  
  // Convert contact type (prospect to client, etc.)
  convert: (id, data) => 
    sonorApi.post(`/contacts/${id}/convert`, data),
  
  // Merge two contacts
  merge: (id, mergeWithId, dataPriority = 'primary') => 
    sonorApi.post(`/contacts/${id}/merge`, { mergeWithId, dataPriority }),
  
  // Bulk update contacts
  bulkUpdate: (ids, data) => 
    sonorApi.post('/contacts/bulk/update', { ids, ...data }),
  
  // Helper to filter by type
  listProspects: (params = {}) => 
    sonorApi.get('/contacts', { params: { ...params, types: ['prospect', 'lead'] } }),
  
  listCustomers: (params = {}) => 
    sonorApi.get('/contacts', { params: { ...params, types: ['customer'] } }),
  
  listClients: (params = {}) => 
    sonorApi.get('/contacts', { params: { ...params, types: ['client'] } }),
  
  listTeam: (params = {}) => 
    sonorApi.get('/contacts', { params: { ...params, types: ['team'] } }),
}

// ============================================================================
// Email API
// ============================================================================

export const emailApi = {
  // Settings
  getSettings: () => 
    sonorApi.get('/email/settings'),
  
  updateSettings: (data) => 
    sonorApi.put('/email/settings', data),
  
  validateApiKey: (apiKey) => 
    sonorApi.post('/email/settings/validate', { api_key: apiKey }),
  
  // Campaigns
  listCampaigns: (params = {}) => 
    sonorApi.get('/email/campaigns', { params }),
  
  getCampaign: (id) => 
    sonorApi.get(`/email/campaigns/${id}`),
  
  createCampaign: (data) => 
    sonorApi.post('/email/campaigns', data),
  
  updateCampaign: (id, data) => 
    sonorApi.put(`/email/campaigns/${id}`, data),
  
  sendCampaign: (id, data = {}) =>
    sonorApi.post(`/email/campaigns/${id}/send`, data),

  scheduleCampaign: (id, data) =>
    sonorApi.post(`/email/campaigns/${id}/schedule`, data),

  getCampaignAnalytics: (id) =>
    sonorApi.get(`/email/campaigns/${id}/analytics`),

  // Templates
  listTemplates: (params = {}) => 
    sonorApi.get('/email/templates', { params }),
  
  listSystemTemplates: () => 
    sonorApi.get('/email/templates', { params: { is_system: true } }),
  
  getTemplate: (id) => 
    sonorApi.get(`/email/templates/${id}`),
  
  createTemplate: (data) => 
    sonorApi.post('/email/templates', data),
  
  updateTemplate: (id, data) => 
    sonorApi.put(`/email/templates/${id}`, data),
  
  // Subscribers
  listSubscribers: (params = {}) => 
    sonorApi.get('/email/subscribers', { params }),
  
  createSubscriber: (data) => 
    sonorApi.post('/email/subscribers', data),
  
  importSubscribers: (data) => 
    sonorApi.post('/email/subscribers/import', data),
  
  // Lists
  listLists: (params = {}) => 
    sonorApi.get('/email/lists', { params }),
  
  createList: (data) => 
    sonorApi.post('/email/lists', data),
  
  // Automations
  listAutomations: (params = {}) => 
    sonorApi.get('/email/automations', { params }),
  
  getAutomation: (id) => 
    sonorApi.get(`/email/automations/${id}`),
  
  createAutomation: (data) => 
    sonorApi.post('/email/automations', data),
  
  updateAutomation: (id, data) => 
    sonorApi.put(`/email/automations/${id}`, data),
  
  // One-off emails
  searchContacts: (query) =>
    sonorApi.get('/email/contacts/search', { params: { q: query } }),
  
  sendTest: (data) =>
    sonorApi.post('/email/test', data),
  
  composeWithSignal: (data) =>
    sonorApi.post('/email/compose-with-signal', data),

  composeOneOff: (data) =>
    sonorApi.post('/email/compose/one-off', data),
  
  // Newsletter
  validateAudience: (data) =>
    sonorApi.post('/email/audience/validate', data),
  
  composeNewsletter: (data) =>
    sonorApi.post('/email/compose/newsletter', data),
  
  // System emails
  listSystemEmails: () =>
    sonorApi.get('/email/system'),
  
  updateSystemEmail: (emailId, data) =>
    sonorApi.put(`/email/system/${emailId}`, data),
  
  deleteSystemEmail: (emailId) =>
    sonorApi.delete(`/email/system/${emailId}`),
  
  testSystemEmail: (emailId) =>
    sonorApi.post(`/email/system/${emailId}/test`),
  
  // AI email composition (CRM)
  generateAIEmail: (data) =>
    sonorApi.post('/crm/ai/email-suggest', data),
  
  // Gmail integration
  sendGmail: (data) =>
    sonorApi.post('/email/gmail/send', data),

  // Quick send (template → Resend, uses project email settings)
  quickSend: (data) =>
    sonorApi.post('/email/quick-send', data),

  // Email capability check (for showing warnings)
  checkEmailCapability: (projectId) =>
    sonorApi.get(`/email/capability`, { params: { project_id: projectId } }),
  
  // Gmail OAuth
  getGmailAuthUrl: (projectId, returnUrl) =>
    sonorApi.get('/email/gmail/auth-url', { params: { project_id: projectId, return_url: returnUrl } }),
  
  getGmailStatus: (projectId) =>
    sonorApi.get('/email/gmail/status', { params: { project_id: projectId } }),

  disconnectGmail: (projectId) =>
    sonorApi.delete('/email/gmail/disconnect', { params: { project_id: projectId } }),

  // Gmail Signature
  setGmailSignature: (html, projectId) =>
    sonorApi.put(`/email/gmail/signature${projectId ? `?project_id=${projectId}` : ''}`, { html }),

  // Insights & Activity (Overview dashboard)
  getInsights: (projectId) =>
    sonorApi.get('/email/insights', { params: { project_id: projectId } }),

  getActivity: (projectId, limit = 10) =>
    sonorApi.get('/email/activity', { params: { project_id: projectId, limit } }),

  // Domain Management — Primary Sending Domain
  setupPrimaryDomain: (domain, projectId) =>
    sonorApi.post('/email/domains/primary', { domain, projectId }),

  getPrimaryDomain: (projectId) =>
    sonorApi.get('/email/domains/primary', { params: { project_id: projectId } }),

  verifyPrimaryDomain: (projectId) =>
    sonorApi.post('/email/domains/primary/verify', {}, { params: { project_id: projectId } }),

  removePrimaryDomain: (projectId) =>
    sonorApi.delete('/email/domains/primary', { params: { project_id: projectId } }),

  // Domain Management — Cold Outreach Domains
  addOutreachDomain: (domain, projectId) =>
    sonorApi.post('/email/domains/outreach', { domain, projectId }),

  getOutreachDomains: (projectId) =>
    sonorApi.get('/email/domains/outreach', { params: { project_id: projectId } }),

  verifyOutreachDomain: (resendId, projectId) =>
    sonorApi.post(`/email/domains/outreach/${resendId}/verify`, {}, { params: { project_id: projectId } }),

  removeOutreachDomain: (resendId, projectId) =>
    sonorApi.delete(`/email/domains/outreach/${resendId}`, { params: { project_id: projectId } }),
}

// ============================================================================
// User Workspace Integrations API (per-user Google integration for CRM + Sync + Drive)
// ============================================================================

export const workspaceIntegrationsApi = {
  /**
   * Get the user's Google workspace connection status.
   * Returns gmail + calendar connection status for the current user.
   */
  getGoogleStatus: () =>
    sonorApi.get('/integrations/workspace/google/status').then(r => r.data),

  /**
   * Initiate Google workspace OAuth (Gmail + Calendar + Drive together).
   * Uses popup flow - returns { authUrl }.
   */
  connectGoogle: (returnUrl) =>
    sonorApi.post('/integrations/workspace/google/connect', { returnUrl, popupMode: true }).then(r => r.data),

  /**
   * Disconnect Google workspace integration.
   * Removes Gmail, Calendar, and Drive access.
   */
  disconnectGoogle: () =>
    sonorApi.post('/integrations/workspace/google/disconnect').then(r => r.data),

  /**
   * Get all workspace integrations for the current user.
   * Returns connections grouped by provider.
   */
  getAll: () =>
    sonorApi.get('/integrations/workspace').then(r => r.data),

  /**
   * Sync Google Calendar events now.
   */
  /**
   * Fetch Google Calendar events for a date range.
   */
  getCalendarEvents: (startDate, endDate) =>
    sonorApi.get('/integrations/workspace/google/calendar/events', {
      params: { startDate, endDate }
    }).then(r => r.data),

  /**
   * Push a new event to the user's Google Calendar.
   * Returns { googleEventId } on success.
   */
  pushCalendarEvent: (eventData) =>
    sonorApi.post('/integrations/workspace/google/calendar/events', eventData).then(r => r.data),

  /**
   * Update an existing Google Calendar event.
   */
  updateCalendarEvent: (eventId, eventData) =>
    sonorApi.put(`/integrations/workspace/google/calendar/events/${eventId}`, eventData).then(r => r.data),

  /**
   * Delete a Google Calendar event.
   */
  deleteCalendarEvent: (eventId) =>
    sonorApi.delete(`/integrations/workspace/google/calendar/events/${eventId}`).then(r => r.data),

  syncCalendar: () =>
    sonorApi.post('/integrations/workspace/google/calendar/sync').then(r => r.data),

  /**
   * Get Google Calendar sync settings for the user.
   */
  getCalendarSettings: () =>
    sonorApi.get('/integrations/workspace/google/calendar/settings').then(r => r.data),

  /**
   * Update Google Calendar sync settings.
   * @param {Object} settings - { syncDirection, syncFrequencyMinutes, selectedCalendars }
   */
  updateCalendarSettings: (settings) =>
    sonorApi.put('/integrations/workspace/google/calendar/settings', settings).then(r => r.data),
}

// ============================================================================
// Reports/Analytics API
// ============================================================================

export const reportsApi = {
  getDashboard: (params = {}) => 
    sonorApi.get('/dashboard', { params }),
  
  getDeadlines: (params = {}) => 
    sonorApi.get('/dashboard/deadlines', { params }),
  
  // Lighthouse/Audits
  listAudits: (params = {}) => 
    sonorApi.get('/audits', { params }),
  
  getAudit: (id) => 
    sonorApi.get(`/audits/${id}`),
  
  requestAudit: (data) => 
    sonorApi.post('/audits', data),
  
  deleteAudit: (id) => 
    sonorApi.delete(`/audits/${id}`),
  
  getLighthouseReport: (params = {}) => 
    sonorApi.get('/audits/lighthouse', { params }),
  
  runLighthouseAudit: (data) => 
    sonorApi.post('/audits/lighthouse', data),
  
  // Aliases for use-reports.js hooks
  lighthouse: (projectId) =>
    sonorApi.get('/audits/lighthouse', { params: { project_id: projectId } }),
  runAudit: (projectId, params = {}) =>
    sonorApi.post('/audits/lighthouse', { projectId, ...params }),
  
  // Rep dashboard
  getRepDashboard: () =>
    sonorApi.get('/dashboard/rep'),
  
  // Activity timeline
  getActivity: (params = {}) =>
    sonorApi.get('/dashboard/activity', { params }),

  // Aliases for hooks (use-reports.js)
  dashboard: (params = {}) => sonorApi.get('/dashboard', { params }),
  activity: (params = {}) => sonorApi.get('/dashboard/activity', { params }),
  financial: (params = {}) => sonorApi.get('/dashboard', { params }),
  project: (id, params = {}) => sonorApi.get(`/analytics/projects/${id}`, { params }),
}

// ============================================================================
// Projects API
// ============================================================================

export const projectsApi = {
  list: (params = {}) => 
    sonorApi.get('/projects', { params }),
  
  get: (id) => 
    sonorApi.get(`/projects/${id}`),
  
  create: (data) => 
    sonorApi.post('/projects', data),
  
  update: (id, data) => 
    sonorApi.put(`/projects/${id}`, data),
  
  delete: (id) => 
    sonorApi.delete(`/projects/${id}`),
  
  // Members
  listMembers: (projectId) => 
    sonorApi.get(`/projects/${projectId}/members`),
  
  addMember: (projectId, data) => 
    sonorApi.post(`/projects/${projectId}/members`, data),
  
  removeMember: (projectId, memberId) => 
    sonorApi.delete(`/projects/${projectId}/members/${memberId}`),
}

// ============================================================================
// Blog API
// ============================================================================

export const blogApi = {
  listPosts: (params = {}) => 
    sonorApi.get('/blog/posts', { params }),
  
  getPost: (id) => 
    sonorApi.get(`/blog/posts/${id}`),
  
  createPost: (data) => 
    sonorApi.post('/blog/posts', data),
  
  updatePost: (id, data) => 
    sonorApi.put(`/blog/posts/${id}`, data),
  
  deletePost: (id) => 
    sonorApi.delete(`/blog/posts/${id}`),
  
  publishPost: (id) => 
    sonorApi.post(`/blog/posts/${id}/publish`),
  
  unpublishPost: (id) => 
    sonorApi.post(`/blog/posts/${id}/unpublish`),
  
  // Categories
  getCategories: (projectId) =>
    sonorApi.get(`/blog/categories/${projectId}`),

  createCategory: (projectId, data) =>
    sonorApi.post(`/blog/categories/${projectId}`, data),

  updateCategory: (projectId, categoryId, data) =>
    sonorApi.put(`/blog/categories/${projectId}/${categoryId}`, data),

  deleteCategory: (projectId, categoryId) =>
    sonorApi.delete(`/blog/categories/${projectId}/${categoryId}`),

  // AI Generation
  createAI: (data) =>
    sonorApi.post('/blog/ai/generate', data),
  
  getAIJobStatus: (jobId) =>
    sonorApi.get(`/blog/ai/job/${jobId}/status`),
  
  // Blog Authors (E-E-A-T)
  listAuthors: (projectId, activeOnly = true) =>
    sonorApi.get(`/blog/projects/${projectId}/authors`, { params: { activeOnly } }).then(res => res.data),
  
  getAuthor: (authorId) =>
    sonorApi.get(`/blog/authors/${authorId}`).then(res => res.data),
  
  getDefaultAuthor: (projectId) =>
    sonorApi.get(`/blog/projects/${projectId}/authors/default`).then(res => res.data),
  
  createAuthor: (projectId, data) =>
    sonorApi.post(`/blog/projects/${projectId}/authors`, data).then(res => res.data),
  
  updateAuthor: (authorId, data) =>
    sonorApi.put(`/blog/authors/${authorId}`, data).then(res => res.data),
  
  deleteAuthor: (authorId) =>
    sonorApi.delete(`/blog/authors/${authorId}`),

  // Post Analytics
  getPostAnalytics: (postId) =>
    sonorApi.get(`/blog/posts/${postId}/analytics`).then(res => res.data),

  // ── Topic Clusters ──────────────────────────────────────────────────────
  listClusters: (params = {}) =>
    sonorApi.get('/blog/clusters', { params }).then(res => res.data),

  getCluster: (id) =>
    sonorApi.get(`/blog/clusters/${id}`).then(res => res.data),

  createCluster: (data) =>
    sonorApi.post('/blog/clusters', data).then(res => res.data),

  updateCluster: (id, data) =>
    sonorApi.put(`/blog/clusters/${id}`, data).then(res => res.data),

  deleteCluster: (id) =>
    sonorApi.delete(`/blog/clusters/${id}`).then(res => res.data),

  assignPostToCluster: (clusterId, data) =>
    sonorApi.post(`/blog/clusters/${clusterId}/assign-post`, data).then(res => res.data),

  removePostFromCluster: (clusterId, postId) =>
    sonorApi.delete(`/blog/clusters/${clusterId}/posts/${postId}`).then(res => res.data),

  // Cluster Generation (Plan → Approve → Generate)
  planCluster: (data) =>
    sonorApi.post('/blog/clusters/generate/plan', data).then(res => res.data),

  generateClusterFromPlan: (data) =>
    sonorApi.post('/blog/clusters/generate/execute', data).then(res => res.data),

  getClusterGenerationJob: (jobId) =>
    sonorApi.get(`/blog/clusters/generate/jobs/${jobId}`).then(res => res.data),

  // Cluster Scheduling
  scheduleCluster: (clusterId, data) =>
    sonorApi.post(`/blog/clusters/${clusterId}/schedule`, data).then(res => res.data),
}

// ============================================================================
// Portfolio API
// ============================================================================

export const portfolioApi = {
  // ── List & CRUD ──
  listItems: (params = {}) =>
    sonorApi.get('/portfolio', { params }),

  getItem: (id) =>
    sonorApi.get(`/portfolio/${id}`),

  createItem: (data) =>
    sonorApi.post('/portfolio', data),

  updateItem: (id, data) =>
    sonorApi.put(`/portfolio/${id}`, data),

  deleteItem: (id) =>
    sonorApi.delete(`/portfolio/${id}`),

  reorder: (items) =>
    sonorApi.put('/portfolio/reorder', { items }),

  publishItem: (id) =>
    sonorApi.post(`/portfolio/${id}/publish`),

  unpublishItem: (id) =>
    sonorApi.post(`/portfolio/${id}/unpublish`),

  // ── AI Generation (new Phase 3 endpoints) ──
  generateFromProject: (data) =>
    sonorApi.post('/portfolio/generate-from-project', data),

  getEligibleProjects: () =>
    sonorApi.get('/portfolio/eligible-projects'),

  regenerateSection: (portfolioId, data) =>
    sonorApi.post(`/portfolio/${portfolioId}/regenerate-section`, data),

  refreshMetrics: (portfolioId) =>
    sonorApi.post(`/portfolio/${portfolioId}/refresh-metrics`),

  resetGeneration: (portfolioId) =>
    sonorApi.post(`/portfolio/${portfolioId}/reset-generation`),

  getMetricsDelta: (portfolioId) =>
    sonorApi.get(`/portfolio/${portfolioId}/metrics-delta`),

  // ── Section Management ──
  getSections: (portfolioId) =>
    sonorApi.get(`/portfolio/${portfolioId}/sections`),

  addSection: (sanityPageId, data) =>
    sonorApi.post(`/cms/pages/${sanityPageId}/sections`, data),

  updateSection: (sanityPageId, sectionId, data) =>
    sonorApi.put(`/cms/pages/${sanityPageId}/sections/${sectionId}`, data),

  deleteSection: (sanityPageId, sectionId) =>
    sonorApi.delete(`/cms/pages/${sanityPageId}/sections/${sectionId}`),

  reorderSections: (sanityPageId, sectionIds) =>
    sonorApi.put(`/cms/pages/${sanityPageId}/sections/reorder`, { sectionIds }),

  // ── Legacy AI generation ──
  generateAI: (data) =>
    sonorApi.post('/portfolio/ai/generate', data),
}

// ============================================================================
// Admin API
// ============================================================================

export const adminApi = {
  // Organizations/Tenants (Super Admin)
  listOrganizations: () => 
    sonorApi.get('/admin/organizations'),
  
  getOrganization: (id) => 
    sonorApi.get(`/admin/organizations/${id}`),
  
  createOrganization: (data) => 
    sonorApi.post('/admin/organizations', data),
  
  updateOrganization: (id, data) => 
    sonorApi.put(`/admin/organizations/${id}`, data),
  
  // Alias for listOrganizations (backward compatibility)
  listTenants: () => 
    sonorApi.get('/admin/organizations'),
  
  getTenant: (id) => 
    sonorApi.get(`/admin/organizations/${id}`),
  
  createTenant: (data) => 
    sonorApi.post('/admin/organizations', data),
  
  updateTenant: (id, data) => 
    sonorApi.put(`/admin/organizations/${id}`, data),
  
  checkTenantSlug: (slug) => 
    sonorApi.get('/admin/organizations/check-slug', { params: { slug } }),
  
  // Clients
  listClients: (params = {}) => 
    sonorApi.get('/admin/clients', { params }),
  
  getClient: (id) => 
    sonorApi.get(`/admin/clients/${id}`),
  
  createClient: (data) => 
    sonorApi.post('/admin/clients', data),
  
  updateClient: (id, data) => 
    sonorApi.put(`/admin/clients/${id}`, data),
  
  // Activity
  getActivityLog: (params = {}) => 
    sonorApi.get('/admin/activity', { params }),
  
  // Stats
  getStats: () => 
    sonorApi.get('/admin/stats'),
  
  // Team Members
  listTeamMembers: () => 
    sonorApi.get('/admin/teams'),
  
  createTeamMember: (data) => 
    sonorApi.post('/admin/teams', data),
  
  updateTeamMember: (id, updates) => 
    sonorApi.put(`/admin/teams/${id}`, updates),
  
  resendInvite: (id) => 
    sonorApi.post(`/admin/teams/${id}/resend-invite`),
  
  // Organization Members
  listOrgMembers: (organizationId) => 
    sonorApi.get(`/admin/organizations/${organizationId}/members`),
  
  addOrgMember: (organizationId, data) => 
    sonorApi.post(`/admin/organizations/${organizationId}/members`, data),
  
  updateOrgMember: (organizationId, contactId, updates) => 
    sonorApi.put(`/admin/organizations/${organizationId}/members/${contactId}`, updates),
  
  resendOrgMemberInvite: (organizationId, contactId) =>
    sonorApi.post(`/admin/organizations/${organizationId}/members/${contactId}/resend-invite`),
  
  removeOrgMember: (organizationId, contactId) => 
    sonorApi.delete(`/admin/organizations/${organizationId}/members/${contactId}`),
  
  // Organization Roles
  listOrgRoles: (organizationId, scope) => 
    sonorApi.get(`/admin/organizations/${organizationId}/roles`, { params: { scope } }),
  
  createOrgRole: (organizationId, body) => 
    sonorApi.post(`/admin/organizations/${organizationId}/roles`, body),
  
  updateOrgRole: (organizationId, roleId, body) => 
    sonorApi.patch(`/admin/organizations/${organizationId}/roles/${roleId}`, body),
  
  deleteOrgRole: (organizationId, roleId) => 
    sonorApi.delete(`/admin/organizations/${organizationId}/roles/${roleId}`),
  
  // Organization Settings (branding, theme, preferences)
  updateOrgSettings: (organizationId, settings) => 
    sonorApi.put(`/admin/organizations/${organizationId}/settings`, settings),
  
  // Project Members
  listProjectMembers: (projectId) => 
    sonorApi.get(`/admin/projects/${projectId}/members`),
  
  addProjectMember: (projectId, contactId, role) => 
    sonorApi.post(`/admin/projects/${projectId}/members`, { contactId, role }),
  
  updateProjectMember: (projectId, contactId, role) => 
    sonorApi.put(`/admin/projects/${projectId}/members/${contactId}`, { role }),
  
  removeProjectMember: (projectId, contactId) => 
    sonorApi.delete(`/admin/projects/${projectId}/members/${contactId}`),
  
  // Contact assignment (CRM)
  assignContacts: (data) => 
    sonorApi.post('/admin/contacts/assign', data),
  
  // User Management (Super Admin)
  listUsers: (params = {}) => 
    sonorApi.get('/admin/users', { params }),
  
  getUser: (id) => 
    sonorApi.get(`/admin/users/${id}`),
  
  updateUser: (id, data) => 
    sonorApi.put(`/admin/users/${id}`, data),
  
  deleteUser: (id) => 
    sonorApi.delete(`/admin/users/${id}`),
  
  resendSetupEmail: (userId) => 
    sonorApi.post(`/admin/users/${userId}/resend-setup`),
}

// ============================================================================
// Drive API - Google Drive file management (per-user workspace OAuth)
// ============================================================================

export const driveApi = {
  // List files (per-user workspace integration)
  listFiles: (params = {}) => 
    sonorApi.get('/integrations/workspace/google/drive/files', { params }),
  
  // Search files
  searchFiles: (query) => 
    sonorApi.get('/integrations/workspace/google/drive/files', { params: { query } }),
  
  // Upload file via POST /files/drive/upload (multipart for large files may use workspace integration)
  uploadFile: (data) => 
    sonorApi.post('/files/drive/upload', data),
  
  // Download file
  downloadFile: (fileId) => 
    sonorApi.get(`/integrations/workspace/google/drive/${fileId}/download`),
  
  // Delete file
  deleteFile: (fileId, permanent = false) =>
    sonorApi.delete('/integrations/workspace/google/drive', { data: { fileId, permanent } }),

  // Create folder
  createFolder: (name, parentId = null) =>
    sonorApi.post('/integrations/workspace/google/drive/folder', { name, parentId }),
}

// ============================================================================
// Ecommerce API - Shopify integration
// ============================================================================

export const ecommerceApi = {
  // Store connection
  getStores: () => 
    sonorApi.get('/ecommerce/stores'),
  
  connectStore: (data) => 
    sonorApi.post('/ecommerce/stores', data),
  
  disconnectStore: (storeId) => 
    sonorApi.delete(`/ecommerce/stores/${storeId}`),
  
  // Products
  listProducts: (params = {}) => 
    sonorApi.get('/ecommerce/products', { params }),
  
  getProduct: (productId) => 
    sonorApi.get(`/ecommerce/products/${productId}`),
  
  updateProduct: (productId, data) => 
    sonorApi.put(`/ecommerce/products/${productId}`, data),
  
  // Product images
  uploadProductImage: (productId, imageData) =>
    sonorApi.post(`/ecommerce/products/${productId}/images`, imageData),
  
  deleteProductImage: (productId, imageId) =>
    sonorApi.delete(`/ecommerce/products/${productId}/images/${imageId}`),
  
  // Variants
  updateVariant: (variantId, data) => 
    sonorApi.put(`/ecommerce/variants/${variantId}`, data),
  
  // Inventory
  updateInventory: (inventoryItemId, data) => 
    sonorApi.post('/ecommerce/inventory', { inventoryItemId, ...data }),
  
  adjustInventory: (data) => 
    sonorApi.post('/ecommerce/inventory/adjust', data),
  
  // Orders
  listOrders: (params = {}) => 
    sonorApi.get('/ecommerce/orders', { params }),
  
  getOrder: (orderId) => 
    sonorApi.get(`/ecommerce/orders/${orderId}`),
  
  // Sync
  triggerSync: (syncType) => 
    sonorApi.post('/ecommerce/sync', { syncType }),
  
  getSyncStatus: () => 
    sonorApi.get('/ecommerce/sync'),
  
  // Tenant sales (for multi-tenant billing)
  listTenantCustomers: (tenantId) =>
    sonorApi.get(`/ecommerce/tenants/${tenantId}/customers`),
  
  listTenantInvoices: (tenantId, params = {}) =>
    sonorApi.get(`/ecommerce/tenants/${tenantId}/invoices`, { params }),
}

// ============================================================================
// Analytics API - Site analytics, page views, web vitals
// ============================================================================

export const analyticsApi = {
  // Overview
  getOverview: (params = {}) => 
    sonorApi.get('/analytics/overview', { params }),
  
  // Page Views
  getPageViews: (params = {}) => 
    sonorApi.get('/analytics/page-views', { params }),
  
  // Events
  getEvents: (params = {}) => 
    sonorApi.get('/analytics/events', { params }),
  
  // Web Vitals
  getWebVitals: (params = {}) => 
    sonorApi.get('/analytics/web-vitals', { params }),
  
  // Sessions
  getSessions: (params = {}) => 
    sonorApi.get('/analytics/sessions', { params }),
  
  // Scroll Depth
  getScrollDepth: (params = {}) => 
    sonorApi.get('/analytics/scroll-depth', { params }),
  
  // Heatmap
  getHeatmap: (params = {}) => 
    sonorApi.get('/analytics/heatmap', { params }),

  // Realtime
  getRealtime: (params = {}) =>
    sonorApi.get('/analytics/realtime', { params }),

  /**
   * Generate analytics insights for a project from overview and top-pages data.
   * Returns: { insights: Array<{ type, title, description, metric?, change? }> }
   */
  generateInsights: (params = {}) =>
    sonorApi.post('/analytics/insights/generate', params),

  // ==================== ORG-LEVEL ANALYTICS ====================
  
  /**
   * Get portfolio overview - aggregate analytics across all projects
   * Returns: { totals, projects[], trends }
   */
  getPortfolioOverview: (orgId, params = {}) =>
    sonorApi.get(`/analytics/org/${orgId}/portfolio`, { params }),
  
  /**
   * Get project comparison data for org dashboard
   * Returns: { projects[], insights[] }
   */
  getProjectComparison: (orgId, params = {}) =>
    sonorApi.get(`/analytics/org/${orgId}/comparison`, { params }),
  
  /**
   * Get org-wide traffic summary
   * Returns: { totalPageViews, totalSessions, topProject, trend }
   */
  getOrgTrafficSummary: (orgId, params = {}) =>
    sonorApi.get(`/analytics/org/${orgId}/traffic-summary`, { params }),
  
  /**
   * Get aggregated daily stats for all projects in org
   * Returns: { dailyStats[], totals }
   */
  getOrgDailyStats: (orgId, params = {}) =>
    sonorApi.get(`/analytics/org/${orgId}/daily-stats`, { params }),
}

// ============================================================================
// Config API - Tenant configuration for integrations
// ============================================================================

export const configApi = {
  /**
   * Get Square config for a project (public fields - applicationId, locationId, environment)
   * Used by payment forms to initialize Square Web SDK
   */
  getSquareConfig: (projectId) =>
    sonorApi.get(`/config/square/${projectId}`).then(res => res.data),
  
  /**
   * Get Square config by invoice token (for public payment pages)
   * Does not require authentication
   */
  getSquareConfigByInvoiceToken: (token) =>
    sonorApi.get('/config/square/by-invoice-token', { params: { token } }).then(res => res.data),

  /**
   * Get Square config by proposal ID (for deposit payment pages)
   * Does not require authentication
   */
  getSquareConfigByProposalId: (proposalId) =>
    sonorApi.get(`/config/square/by-proposal/${proposalId}`).then(res => res.data),

  // ==============================================
  // SQUARE OAUTH MULTI-MERCHANT
  // ==============================================

  /**
   * Get Square OAuth authorization URL
   * Returns { authUrl } that you should redirect the user to
   */
  getSquareOAuthUrl: (projectId) =>
    sonorApi.get(`/config/square/oauth/authorize/${projectId}`).then(res => res.data),

  /**
   * Initiate Square OAuth flow - redirects user to Square authorization
   */
  connectSquare: async (projectId) => {
    const { authUrl } = await configApi.getSquareOAuthUrl(projectId)
    window.location.href = authUrl
  },

  /**
   * Disconnect Square OAuth (revoke tokens)
   */
  disconnectSquare: (projectId) =>
    sonorApi.delete(`/config/square/oauth/${projectId}`).then(res => res.data),

  /**
   * Get Square connection status for a project
   */
  getSquareStatus: (projectId) =>
    sonorApi.get(`/config/square/status/${projectId}`).then(res => res.data),

  /**
   * Get Square locations for connected merchant
   */
  getSquareLocations: (projectId) =>
    sonorApi.get(`/config/square/locations/${projectId}`).then(res => res.data),

  /**
   * Set which Square location to use for payments
   */
  setSquareLocation: (projectId, locationId) =>
    sonorApi.put(`/config/square/location/${projectId}`, { locationId }).then(res => res.data),

  // ==============================================
  // GENERAL CONFIG
  // ==============================================

  /**
   * Get full tenant config (admin only, sensitive fields masked)
   */
  getTenantConfig: (projectId) =>
    sonorApi.get(`/config/${projectId}`).then(res => res.data),

  /**
   * Update Square config for a project
   */
  updateSquareConfig: (projectId, config) =>
    sonorApi.put(`/config/${projectId}/square`, config),

  /**
   * Update Email config for a project (fromAddress, fromName, replyTo)
   */
  updateEmailConfig: (projectId, config) =>
    sonorApi.put(`/config/${projectId}/email`, config),

  /**
   * Update OpenPhone config for a project
   */
  updateOpenPhoneConfig: (projectId, config) =>
    sonorApi.put(`/config/${projectId}/openphone`, config),

  /**
   * Update Shopify config for a project
   */
  updateShopifyConfig: (projectId, config) =>
    sonorApi.put(`/config/${projectId}/shopify`, config),

  /**
   * Bulk update tenant config
   */
  updateTenantConfig: (projectId, config) =>
    sonorApi.put(`/config/${projectId}`, config),
}

// ============================================================================
// Commerce API - Products, Services, Classes, Events, Sales
// ============================================================================

export const commerceApi = {
  // ==================== OFFERINGS ====================
  
  /** Get all offerings for a project */
  getOfferings: (projectId, params = {}) =>
    sonorApi.get(`/commerce/offerings/${projectId}`, { params }),
  
  /** Get a single offering by ID */
  getOffering: (id) =>
    sonorApi.get(`/commerce/offering/${id}`),
  
  /** Create a new offering */
  createOffering: (projectId, data) =>
    sonorApi.post(`/commerce/offerings/${projectId}`, data),
  
  /** Update an offering */
  updateOffering: (id, data) =>
    sonorApi.put(`/commerce/offering/${id}`, data),
  
  /** Delete an offering */
  deleteOffering: (id) =>
    sonorApi.delete(`/commerce/offering/${id}`),

  /** Get variants for an offering */
  getVariants: (offeringId) =>
    sonorApi.get(`/commerce/variants/${offeringId}`),

  /** Create a variant */
  createVariant: (offeringId, data) =>
    sonorApi.post(`/commerce/variants/${offeringId}`, data),

  /** Update a variant */
  updateVariant: (variantId, data) =>
    sonorApi.put(`/commerce/variant/${variantId}`, data),

  /** Delete a variant */
  deleteVariant: (variantId) =>
    sonorApi.delete(`/commerce/variant/${variantId}`),
  
  // ==================== CATEGORIES ====================
  
  /** Get all categories for a project */
  getCategories: (projectId) =>
    sonorApi.get(`/commerce/categories/${projectId}`),
  
  /** Create a category */
  createCategory: (projectId, data) =>
    sonorApi.post(`/commerce/categories/${projectId}`, data),
  
  /** Update a category (id only; backend resolves from auth) */
  updateCategory: (id, data) =>
    sonorApi.put(`/commerce/categories/${id}`, data),
  
  /** Delete a category (id only; backend resolves from auth) */
  deleteCategory: (id) =>
    sonorApi.delete(`/commerce/categories/${id}`),
  
  /** Get invoices for a project */
  getInvoices: (projectId, params = {}) =>
    sonorApi.get(`/commerce/invoices/${projectId}`, { params }),

  /** Get a single invoice by ID (project-scoped) */
  getInvoice: (projectId, invoiceId) =>
    sonorApi.get(`/commerce/invoices/${projectId}/${invoiceId}`),

  /** Update an invoice (project-scoped) */
  updateInvoice: (projectId, invoiceId, data) =>
    sonorApi.put(`/commerce/invoices/${projectId}/${invoiceId}`, data),

  /** Delete an invoice (project-scoped) */
  deleteInvoice: (projectId, invoiceId) =>
    sonorApi.delete(`/commerce/invoices/${projectId}/${invoiceId}`),
  
  // ==================== SALES / TRANSACTIONS ====================
  
  /** Get all sales for a project */
  getSales: (projectId, params = {}) =>
    sonorApi.get(`/commerce/sales/${projectId}`, { params }),
  
  /** Get a single sale by ID */
  getSale: (projectId, id) =>
    sonorApi.get(`/commerce/sales/${projectId}/${id}`),
  
  /** Create a sale (manual entry) */
  createSale: (projectId, data) =>
    sonorApi.post(`/commerce/sales/${projectId}`, data),
  
  /** Update a sale */
  updateSale: (projectId, id, data) =>
    sonorApi.put(`/commerce/sales/${projectId}/${id}`, data),
  
  /** Get sales stats */
  getSalesStats: (projectId, params = {}) =>
    sonorApi.get(`/commerce/sales/${projectId}/stats`, { params }),

  /** Get revenue chart data for last N days */
  getRevenueChart: (projectId, days = 30) =>
    sonorApi.get(`/commerce/sales/${projectId}/revenue-chart`, { params: { days } }),

  /** Trigger Shopify product sync for a project */
  syncShopify: (projectId) =>
    sonorApi.post(`/commerce/shopify/sync/${projectId}`),

  /** Generate shipping label for a sale */
  shipSale: (projectId, saleId, options = {}) =>
    sonorApi.post(`/commerce/sales/${projectId}/${saleId}/ship`, options),

  /** Batch ship multiple orders */
  batchShip: (projectId, saleIds) =>
    sonorApi.post(`/commerce/sales/${projectId}/ship/batch`, { saleIds }),

  // ==================== SHIPPING BILLING (Platform mode) ====================

  /** Get shipping billing config (publishable key) */
  getShippingBillingConfig: () =>
    sonorApi.get('/commerce/billing/shipping/config'),

  /** Get shipping billing status for a project */
  getShippingBillingStatus: (projectId) =>
    sonorApi.get(`/commerce/billing/shipping/status/${projectId}`),

  /** Create Stripe SetupIntent for shipping billing card */
  createShippingBillingSetupIntent: (projectId) =>
    sonorApi.post(`/commerce/billing/shipping/setup-intent/${projectId}`),

  /** Attach payment method to shipping billing customer */
  attachShippingBillingCard: (projectId, paymentMethodId) =>
    sonorApi.post(`/commerce/billing/shipping/attach-card/${projectId}`, { paymentMethodId }),

  /** Add funds to shipping balance */
  depositShippingBalance: (projectId, amountCents) =>
    sonorApi.post(`/commerce/billing/shipping/deposit/${projectId}`, { amountCents }),
  
  // ==================== CUSTOMERS ====================
  
  /** Get all customers for a project */
  getCustomers: (projectId, params = {}) =>
    sonorApi.get(`/commerce/customers/${projectId}`, { params }),
  
  /** Get a single customer by ID */
  getCustomer: (projectId, id) =>
    sonorApi.get(`/commerce/customers/${projectId}/${id}`),
  
  /** Find or create customer by email */
  findOrCreateCustomer: (projectId, data) =>
    sonorApi.post(`/commerce/customers/${projectId}/find-or-create`, data),

  /** Create a customer */
  createCustomer: (projectId, data) =>
    sonorApi.post(`/commerce/customers/${projectId}`, data),
  
  /** Update a customer */
  updateCustomer: (projectId, id, data) =>
    sonorApi.put(`/commerce/customers/${projectId}/${id}`, data),
  
  /** Delete a customer */
  deleteCustomer: (projectId, id) =>
    sonorApi.delete(`/commerce/customers/${projectId}/${id}`),

  /** Get full transaction history for a contact (purchases, invoices, contracts) */
  getCustomerHistory: (projectId, contactId) =>
    sonorApi.get(`/commerce/customers/${projectId}/${contactId}/history`),

  // ==================== SETTINGS ====================
  
  /** Get commerce settings for a project */
  getSettings: (projectId) =>
    sonorApi.get(`/commerce/settings/${projectId}`),
  
  /** Update commerce settings */
  updateSettings: (projectId, data) =>
    sonorApi.put(`/commerce/settings/${projectId}`, data),
  
  // ==================== CONTRACTS ====================
  
  /** Get all contracts for a project */
  getContracts: (projectId, params = {}) =>
    sonorApi.get(`/commerce/contracts/${projectId}`, { params }),
  
  /** Get a single contract by ID */
  getContract: (projectId, id) =>
    sonorApi.get(`/commerce/contracts/${projectId}/${id}`),

  getContractAnalytics: (contractId) =>
    sonorApi.get(`/commerce/contracts/analytics/${contractId}`),
  
  /** Create a new contract */
  createContract: (projectId, data) =>
    sonorApi.post(`/commerce/contracts/${projectId}`, data),
  
  /** Update a contract */
  updateContract: (projectId, id, data) =>
    sonorApi.put(`/commerce/contracts/${projectId}/${id}`, data),
  
  /** Delete a contract */
  deleteContract: (projectId, id) =>
    sonorApi.delete(`/commerce/contracts/${projectId}/${id}`),
  
  /** Send contract via magic link */
  sendContract: (projectId, id) =>
    sonorApi.post(`/commerce/contracts/${projectId}/${id}/send`),
  
  /** AI edit contract content */
  aiEditContract: (projectId, id, instruction) =>
    sonorApi.post(`/commerce/contracts/${projectId}/${id}/ai/edit`, { instruction }),

  /** AI draft contract sections from intake data (no persistence). Returns { sections_json, raw }. */
  aiDraftContract: (projectId, payload) =>
    sonorApi.post(`/commerce/contracts/${projectId}/ai/draft`, payload),

  /** Sign contract (public) */
  signContract: (token, signatureData) =>
    sonorApi.post(`/commerce/contracts/sign/${token}`, signatureData),

  // ==================== CONTRACT TEMPLATES ====================

  /** List contract templates for a project */
  getContractTemplates: (projectId) =>
    sonorApi.get(`/commerce/contracts/${projectId}/templates`),

  /** Get a single contract template */
  getContractTemplate: (projectId, templateId) =>
    sonorApi.get(`/commerce/contracts/${projectId}/templates/${templateId}`),

  /** Create a contract template */
  createContractTemplate: (projectId, data) =>
    sonorApi.post(`/commerce/contracts/${projectId}/templates`, data),

  /** Update a contract template */
  updateContractTemplate: (projectId, templateId, data) =>
    sonorApi.put(`/commerce/contracts/${projectId}/templates/${templateId}`, data),

  /** Delete a contract template */
  deleteContractTemplate: (projectId, templateId) =>
    sonorApi.delete(`/commerce/contracts/${projectId}/templates/${templateId}`),

  /** Create a contract from a template + intake data */
  createContractFromTemplate: (projectId, data) =>
    sonorApi.post(`/commerce/contracts/${projectId}/from-template`, data),
  
  // ==================== SERVICES (for contracts) ====================
  
  /** Get services only (for proposal/contract type selection) */
  getServices: (projectId, params = {}) =>
    sonorApi.get(`/commerce/offerings/${projectId}`, { 
      params: { ...params, type: 'service', status: 'active' } 
    }),

  // ==================== SETUP / DISCOVERY ====================

  /** Analyze site pages for commerce discovery (products, services, etc) */
  analyzeSiteForSetup: (projectId) =>
    sonorApi.post(`/commerce/setup/analyze-site/${projectId}`),

  /** Generate draft offerings from classified pages */
  generateOfferings: (projectId, pages) =>
    sonorApi.post(`/commerce/setup/generate-offerings/${projectId}`, { pages }),

  // ==================== DISCOVERIES ====================

  /** Get pending page discoveries for import */
  getDiscoveries: (projectId, params = {}) =>
    sonorApi.get(`/commerce/discoveries/${projectId}`, { params }),

  /** Update discovery status (dismiss, skip) */
  updateDiscoveryStatus: (discoveryId, status) =>
    sonorApi.put(`/commerce/discoveries/${discoveryId}/status`, { status }),

  /** Import a single discovery as a draft offering */
  importDiscovery: (discoveryId) =>
    sonorApi.post(`/commerce/discoveries/${discoveryId}/import`),

  /** Bulk import multiple discoveries */
  bulkImportDiscoveries: (projectId, discoveryIds) =>
    sonorApi.post(`/commerce/discoveries/${projectId}/bulk-import`, { discovery_ids: discoveryIds }),

  // ==================== DISCOUNT CODES ====================

  /** Get all discount codes for a project */
  getDiscountCodes: (projectId, params = {}) =>
    sonorApi.get(`/commerce/discounts/${projectId}`, { params }),

  /** Create a new discount code */
  createDiscountCode: (projectId, data) =>
    sonorApi.post(`/commerce/discounts/${projectId}`, data),

  /** Update a discount code */
  updateDiscountCode: (projectId, codeId, data) =>
    sonorApi.put(`/commerce/discounts/${projectId}/${codeId}`, data),

  /** Delete a discount code */
  deleteDiscountCode: (projectId, codeId) =>
    sonorApi.delete(`/commerce/discounts/${projectId}/${codeId}`),

  /** Get usage history for a discount code */
  getDiscountUsage: (projectId, codeId, options = {}) =>
    sonorApi.get(`/commerce/discounts/${projectId}/${codeId}/usage`, {
      params: { limit: options.limit, offset: options.offset },
    }),

  /** Validate a discount code against an order */
  validateDiscountCode: (projectId, code, orderData = {}) =>
    sonorApi.post(`/commerce/discounts/${projectId}/validate`, { code, ...orderData }),
}

// ============================================================================
// Sync API - Calendar, Booking & Scheduling
// ============================================================================

export const syncApi = {
  // ==================== ADMIN: BOOKING TYPES ====================
  
  /** Get booking types for org (pass project_id to scope to project) */
  getBookingTypes: (params = {}) =>
    sonorApi.get('/sync/admin/types', { params }),
  
  /** Create a booking type */
  createBookingType: (data) =>
    sonorApi.post('/sync/admin/types', data),
  
  /** Update a booking type */
  updateBookingType: (id, data) =>
    sonorApi.put(`/sync/admin/types/${id}`, data),
  
  /** Delete a booking type */
  deleteBookingType: (id) =>
    sonorApi.delete(`/sync/admin/types/${id}`),
  
  // ==================== ADMIN: HOSTS ====================

  /** Get eligible host candidates (org contacts with calendar status) */
  getHostCandidates: (params = {}) =>
    sonorApi.get('/sync/admin/host-candidates', { params }),

  /** Get hosts for org (pass project_id to scope to project) */
  getHosts: (params = {}) =>
    sonorApi.get('/sync/admin/hosts', { params }),
  
  /** Create a host */
  createHost: (data) =>
    sonorApi.post('/sync/admin/hosts', data),
  
  /** Update a host */
  updateHost: (id, data) =>
    sonorApi.put(`/sync/admin/hosts/${id}`, data),
  
  /** Delete a host (pass project_id to scope: only deletes if host belongs to that project) */
  deleteHost: (id, params = {}) =>
    sonorApi.delete(`/sync/admin/hosts/${id}`, { params }),

  /** Send (or resend) calendar connection invite email to a host */
  sendCalendarInvite: (hostId) =>
    sonorApi.post(`/sync/admin/hosts/${hostId}/send-calendar-invite`),

  /** Assign host to booking type */
  assignHostToType: (hostId, typeId, priority = 1) =>
    sonorApi.post(`/sync/admin/hosts/${hostId}/booking-types/${typeId}?priority=${priority}`),
  
  // ==================== ADMIN: BOOKING ROUTES ====================
  
  /** Get routes for a booking type */
  getBookingTypeRoutes: (typeId) =>
    sonorApi.get(`/sync/admin/types/${typeId}/routes`),
  
  /** Create a booking route */
  createBookingRoute: (data) =>
    sonorApi.post('/sync/admin/routes', data),
  
  /** Update a booking route */
  updateBookingRoute: (id, data) =>
    sonorApi.put(`/sync/admin/routes/${id}`, data),
  
  /** Delete a booking route */
  deleteBookingRoute: (id) =>
    sonorApi.delete(`/sync/admin/routes/${id}`),
  
  // ==================== ADMIN: AVAILABILITY ====================
  
  /** Get host availability rules */
  getHostAvailability: (hostId) =>
    sonorApi.get(`/sync/admin/hosts/${hostId}/availability`),
  
  /** Update host availability rules */
  updateHostAvailability: (hostId, data) =>
    sonorApi.put(`/sync/admin/hosts/${hostId}/availability`, data),
  
  /** Create availability exception (PTO, holiday, etc) */
  createException: (data) =>
    sonorApi.post('/sync/admin/exceptions', data),
  
  /** Delete an exception */
  deleteException: (id) =>
    sonorApi.delete(`/sync/admin/exceptions/${id}`),
  
  /** Get all exceptions (org-wide) */
  getExceptions: (params = {}) =>
    sonorApi.get('/sync/admin/exceptions', { params }),
  
  /** Update an exception */
  updateException: (id, data) =>
    sonorApi.put(`/sync/admin/exceptions/${id}`, data),
  /** List bookings with filters */
  getBookings: (params = {}) =>
    sonorApi.get('/sync/admin/bookings', { params }),
  
  /** Get single booking */
  getBooking: (id) =>
    sonorApi.get(`/sync/admin/bookings/${id}`),
  
  /** Update a booking (notes, tags, etc) */
  updateBooking: (id, data) =>
    sonorApi.put(`/sync/admin/bookings/${id}`, data),
  
  /** Cancel a booking (admin) */
  cancelBooking: (id, reason) =>
    sonorApi.post(`/sync/admin/bookings/${id}/cancel`, { reason }),
  
  // ==================== PUBLIC: BOOKING FLOW ====================
  
  /** Get public booking types for an org */
  getPublicBookingTypes: (orgSlug) =>
    sonorApi.get(`/sync/public/${orgSlug}/types`),
  
  /** Get availability for a booking type */
  getAvailability: (orgSlug, typeSlug, date, timezone) =>
    sonorApi.get(`/sync/public/${orgSlug}/availability/${typeSlug}`, {
      params: { date, timezone }
    }),
  
  /** Create a slot hold */
  createHold: (data) =>
    sonorApi.post('/sync/public/hold', data),
  
  /** Release a slot hold */
  releaseHold: (id) =>
    sonorApi.delete(`/sync/public/hold/${id}`),
  
  /** Create a booking */
  createBooking: (data) =>
    sonorApi.post('/sync/public/booking', data),

  // ==================== UNIFIED TASKS - Motion-style Command Center ====================
  
  /**
   * Get unified tasks from all sources
   * Returns: needs_decision, today, overdue, upcoming, completed_today, summary
   */
  /** projectId: single project; projectIds: array for sidebar aggregation (takes precedence) */
  getUnifiedTasks: (projectId, projectIds) => {
    const params = {}
    if (projectIds?.length) {
      params.project_ids = projectIds.join(',')
    } else if (projectId) {
      params.project_id = projectId
    }
    return sonorApi.get('/sync/admin/unified-tasks', { params })
  },
  
  /**
   * Get Signal autonomous activity (What Signal Did feed)
   * Returns completed actions from last 24h
   */
  getSignalActivity: (limit = 50) =>
    sonorApi.get('/sync/admin/signal-activity', { params: { limit } }),
  
  /**
   * Get calendar items for a date range
   * Includes synced tasks, bookings, and events
   */
  getCalendarItems: (startDate, endDate, projectId) =>
    sonorApi.get('/sync/admin/calendar-items', { 
      params: { 
        start_date: startDate, 
        end_date: endDate,
        ...(projectId ? { project_id: projectId } : {})
      } 
    }),

  /**
   * Create a unified task from Sync command center
   * Routes to correct module (project, uptrade, crm, seo) based on source_type
   * @param {Object} data - Task data
   * @param {string} data.source_type - 'project_task' | 'uptrade_task' | 'crm_reminder' | 'seo_task'
   * @param {string} data.title - Task title
   * @param {string} data.project_id - Project ID
   * @param {string} [data.description] - Task description
   * @param {string} [data.due_date] - Due date (ISO format)
   * @param {string} [data.priority] - 'low' | 'normal' | 'high' | 'urgent'
   * @param {string} [data.assigned_to] - User ID to assign
   * @param {number} [data.estimated_hours] - Estimated hours
   * @param {string} [data.prospect_id] - CRM: Prospect/contact ID
   * @param {string} [data.reminder_type] - CRM: call | email | meeting | follow_up
   * @param {string} [data.page_id] - SEO: Page ID
   * @param {string} [data.opportunity_id] - SEO: Opportunity ID
   * @param {string} [data.category] - Project: Task category
   * @param {string} [data.depends_on] - Project: Dependency task ID
   */
  createUnifiedTask: (data) =>
    sonorApi.post('/sync/admin/tasks', data),

  /**
   * Update a unified task's status (taskId from unified_tasks: task_id).
   */
  updateTaskStatus: (taskId, body) =>
    sonorApi.patch(`/sync/admin/tasks/${taskId}`, body),

  /**
   * Batch update status for multiple unified tasks.
   */
  batchUpdateTaskStatus: (body) =>
    sonorApi.post('/sync/admin/tasks/batch', body),

  // ==================== TEAM VIEW - Manager & Admin Features ====================
  
  /**
   * Get current user's role permissions and available view modes
   * Returns: permissions, available_views (personal, team, overview)
   */
  getUserPermissions: () =>
    sonorApi.get('/sync/admin/user-permissions'),
  
  /**
   * Get team members the user can manage (lower hierarchy level)
   * Requires can_assign_tasks permission
   */
  getTeamMembers: (projectId) =>
    sonorApi.get('/sync/admin/team-members', {
      params: projectId ? { project_id: projectId } : {}
    }),
  
  /**
   * Get tasks for team members (manager view)
   * Returns tasks grouped by team member with capacity info
   * Requires can_assign_tasks permission
   */
  getTeamTasks: (projectId, assigneeId) =>
    sonorApi.get('/sync/admin/team-tasks', {
      params: {
        ...(projectId ? { project_id: projectId } : {}),
        ...(assigneeId ? { assignee_id: assigneeId } : {})
      }
    }),
  
  /**
   * Get org-wide task overview (admin view)
   * Returns aggregated stats across all projects and assignees
   * Requires can_access_all_projects permission
   */
  getOrgOverview: () =>
    sonorApi.get('/sync/admin/org-overview'),
  
  /**
   * Get team capacity for workload balancing
   * Returns capacity percentage and workload per team member
   * Requires can_assign_tasks permission
   */
  getTeamCapacity: () =>
    sonorApi.get('/sync/admin/team-capacity'),

  // ==================== PLAYBOOKS - Growth Task Templates ====================
  
  /**
   * Get all playbooks (org + system templates)
   * Returns playbooks with step counts and usage stats
   */
  getPlaybooks: () =>
    sonorApi.get('/sync/admin/playbooks'),
  
  /**
   * Get a single playbook with all steps
   */
  getPlaybook: (id) =>
    sonorApi.get(`/sync/admin/playbooks/${id}`),
  
  /**
   * Create a custom playbook
   * @param {Object} data - Playbook data
   * @param {string} data.name - Playbook name
   * @param {string} [data.description] - Description
   * @param {string} [data.icon] - Icon name
   * @param {string} [data.category] - leads | seo | reputation | content | general
   * @param {Array} data.steps - Array of step objects
   */
  createPlaybook: (data) =>
    sonorApi.post('/sync/admin/playbooks', data),
  
  /**
   * Update a playbook
   */
  updatePlaybook: (id, data) =>
    sonorApi.put(`/sync/admin/playbooks/${id}`, data),
  
  /**
   * Delete a playbook (cannot delete system playbooks)
   */
  deletePlaybook: (id) =>
    sonorApi.delete(`/sync/admin/playbooks/${id}`),
  
  /**
   * Apply a playbook to create tasks
   * @param {string} id - Playbook ID
   * @param {Object} data - Apply options
   * @param {string} data.project_id - Project to create tasks in
   * @param {string} [data.contact_id] - Contact to link CRM tasks to
   * @param {string} [data.start_date] - Start date for due date calculation
   * @param {Object} [data.variables] - Variable substitutions for task titles
   */
  applyPlaybook: (id, data) =>
    sonorApi.post(`/sync/admin/playbooks/${id}/apply`, data),
}

// ============================================================================
// SEO Location Pages API
// ============================================================================

export const locationPagesApi = {
  // ==================== LOCATIONS ====================
  
  /**
   * Get all locations for a project
   */
  getLocations: (projectId) =>
    sonorApi.get('/seo/location-pages/locations', { params: { project_id: projectId } }).then(res => res.data),
  
  /**
   * Get a single location with full context
   */
  getLocation: (locationId) =>
    sonorApi.get(`/seo/location-pages/locations/${locationId}`).then(res => res.data),
  
  /**
   * Create a new location
   */
  createLocation: (data) =>
    sonorApi.post('/seo/location-pages/locations', data).then(res => res.data),
  
  /**
   * Update location context (landmarks, court info, etc.)
   */
  updateLocationContext: (locationId, context) =>
    sonorApi.put(`/seo/location-pages/locations/${locationId}/context`, context).then(res => res.data),
  
  // ==================== LANDMARK DISCOVERY ====================
  
  /**
   * Discover landmarks for a location using Places API
   */
  discoverLandmarks: (locationId, categories) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/discover-landmarks`, { categories }).then(res => res.data),
  
  /**
   * Discover courthouses for a location (law firms)
   */
  discoverCourthouses: (locationId) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/discover-courthouses`).then(res => res.data),
  
  // ==================== SERVICE LOCATIONS ====================
  
  /**
   * Get all service locations for a location
   */
  getServiceLocations: (locationId) =>
    sonorApi.get(`/seo/location-pages/locations/${locationId}/services`).then(res => res.data),
  
  /**
   * Create or update a service location
   */
  upsertServiceLocation: (locationId, data) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/services`, data).then(res => res.data),
  
  // ==================== CASE OUTCOMES ====================
  
  /**
   * Get case outcomes for a location
   */
  getCaseOutcomes: ({ projectId, county, serviceSlug, limit }) =>
    sonorApi.get('/seo/location-pages/case-outcomes', {
      params: { project_id: projectId, county, service_slug: serviceSlug, limit }
    }).then(res => res.data),
  
  // ==================== PAGE GENERATION ====================
  
  /**
   * Generate a single location page using Signal AI
   */
  generateLocationPage: (data) =>
    sonorApi.post('/seo/location-pages/generate', data).then(res => res.data),
  
  /**
   * Bulk generate location pages
   */
  bulkGenerateLocationPages: (data) =>
    sonorApi.post('/seo/location-pages/generate/bulk', data).then(res => res.data),
  
  /**
   * Build context rails for a location page (preview without generating)
   */
  buildContextRails: (data) =>
    sonorApi.post('/seo/location-pages/context-rails', data).then(res => res.data),
  
  // ==================== LOCATION PAGES CRUD ====================
  
  /**
   * Get all generated location pages for a project
   */
  getLocationPages: ({ projectId, status, locationId }) =>
    sonorApi.get('/seo/location-pages/pages', {
      params: { project_id: projectId, status, location_id: locationId }
    }).then(res => res.data),
  
  /**
   * Update location page status
   */
  updatePageStatus: (pageId, status) =>
    sonorApi.put(`/seo/location-pages/pages/${pageId}/status`, { status }).then(res => res.data),
  
  /**
   * Publish location page to client site
   */
  publishToSite: (pageId, projectId) =>
    sonorApi.post(`/seo/location-pages/pages/${pageId}/publish`, null, {
      params: { project_id: projectId }
    }).then(res => res.data),
  
  // ==================== CENSUS DEMOGRAPHICS ====================
  
  /**
   * Get all counties in a state
   * @param {string} state - State abbreviation (e.g., 'KY', 'OH')
   */
  getCountiesInState: (state) =>
    sonorApi.get(`/seo/location-pages/census/states/${state}/counties`).then(res => res.data),
  
  /**
   * Get county boundaries (GeoJSON) for a state
   * @param {string} state - State abbreviation
   */
  getCountyBoundaries: (state) =>
    sonorApi.get(`/seo/location-pages/census/states/${state}/boundaries`).then(res => res.data),
  
  /**
   * Get demographics for a specific county
   * @param {string} state - State abbreviation
   * @param {string} countyFips - County FIPS code (3 digits)
   */
  getCountyDemographics: (state, countyFips) =>
    sonorApi.get(`/seo/location-pages/census/states/${state}/counties/${countyFips}/demographics`).then(res => res.data),
  
  /**
   * Get bulk demographics for multiple counties
   * @param {Object} data - { counties: [{ state: 'KY', county_fips: '037' }, ...] }
   */
  getBulkDemographics: (data) =>
    sonorApi.post('/seo/location-pages/census/demographics/bulk', data).then(res => res.data),
  
  /**
   * Get counties within a radius of a point
   * @param {Object} params - { lat, lng, radius_miles }
   */
  getCountiesNearby: (params) =>
    sonorApi.get('/seo/location-pages/census/nearby', { params }).then(res => res.data),
  
  /**
   * Get adjacent counties
   * @param {string} state - State abbreviation
   * @param {string} countyFips - County FIPS code
   */
  getAdjacentCounties: (state, countyFips) =>
    sonorApi.get(`/seo/location-pages/census/states/${state}/counties/${countyFips}/adjacent`).then(res => res.data),
  
  /**
   * Find a county by name
   * @param {string} state - State abbreviation
   * @param {string} name - County name to search for
   */
  findCountyByName: (state, name) =>
    sonorApi.get(`/seo/location-pages/census/states/${state}/find-county`, { params: { name } }).then(res => res.data),
  
  /**
   * Discover demographics for a location and store in context
   * @param {string} locationId - Location UUID
   */
  discoverDemographics: (locationId) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/discover-demographics`).then(res => res.data),
  
  // ==================== HERO IMAGE GENERATION ====================
  
  /**
   * Generate an AI hero image for a location page
   * @param {string} locationId - Location UUID
   * @param {Object} data - { service_slug, service_name, style?, aspect_ratio? }
   */
  generateHeroImage: (locationId, data) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/generate-hero-image`, data).then(res => res.data),
  
  /**
   * Get all generated images for a location
   * @param {string} locationId - Location UUID
   */
  getLocationImages: (locationId) =>
    sonorApi.get(`/seo/location-pages/locations/${locationId}/images`).then(res => res.data),
  
  /**
   * Delete a generated image
   * @param {string} imageId - Image UUID
   */
  deleteImage: (imageId) =>
    sonorApi.delete(`/seo/location-pages/images/${imageId}`).then(res => res.data),
  
  // ============================================================================
  // SCHEMA MARKUP
  // ============================================================================

  /**
   * Generate JSON-LD schema for a location page
   * @param {string} locationId - Location UUID
   * @param {Object} data - Schema configuration
   * @param {string} data.service_slug - Service identifier
   * @param {string} data.service_name - Service display name
   * @param {string} [data.service_description] - Service description
   * @param {Object} data.business - Business details
   * @param {Object} data.page - Page metadata
   * @param {Array} [data.faqs] - FAQs for schema
   * @param {Object} [data.options] - Schema generation options
   */
  generateSchema: (locationId, data) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/generate-schema`, data).then(res => res.data),
  
  /**
   * Get stored schema for a location page
   * @param {string} locationId - Location UUID
   * @param {string} serviceSlug - Service identifier
   */
  getSchema: (locationId, serviceSlug) =>
    sonorApi.get(`/seo/location-pages/locations/${locationId}/schema/${serviceSlug}`).then(res => res.data),
  
  /**
   * Validate a JSON-LD schema
   * @param {Object} schema - Schema to validate
   */
  validateSchema: (schema) =>
    sonorApi.post('/seo/location-pages/schema/validate', schema).then(res => res.data),
  
  // ============================================================================
  // GOOGLE INDEXING
  // ============================================================================

  /**
   * Submit a location page URL for Google indexing
   * @param {string} locationId - Location UUID
   * @param {Object} data - Indexing request
   * @param {string} data.project_id - Project UUID
   * @param {string} data.url - URL to submit
   * @param {string} [data.type] - 'URL_UPDATED' or 'URL_DELETED'
   */
  submitForIndexing: (locationId, data) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/submit-for-indexing`, data).then(res => res.data),
  
  /**
   * Submit multiple location page URLs for Google indexing
   * @param {Object} data - Bulk indexing request
   * @param {string} data.project_id - Project UUID
   * @param {string[]} data.urls - URLs to submit
   * @param {string} [data.type] - 'URL_UPDATED' or 'URL_DELETED'
   */
  bulkSubmitForIndexing: (data) =>
    sonorApi.post('/seo/location-pages/bulk-submit-for-indexing', data).then(res => res.data),
  
  /**
   * Get remaining indexing quota for today
   * @param {string} projectId - Project UUID
   */
  getIndexingQuota: (projectId) =>
    sonorApi.get('/seo/location-pages/indexing-quota', { params: { project_id: projectId } }).then(res => res.data),
  
  // ============================================================================
  // COMPETITOR ANALYSIS
  // ============================================================================

  /**
   * Analyze competitors for a location page
   * @param {string} locationId - Location UUID
   * @param {Object} data - Analysis request
   * @param {string} data.project_id - Project UUID
   * @param {string} data.service_name - Service name to analyze
   * @param {string} [data.our_url] - Our page URL to exclude from results
   */
  analyzeCompetitors: (locationId, data) =>
    sonorApi.post(`/seo/location-pages/locations/${locationId}/analyze-competitors`, data).then(res => res.data),
  
  /**
   * Get stored competitor analysis for a location
   * @param {string} locationId - Location UUID
   * @param {string} service - Service name
   */
  getCompetitorAnalysis: (locationId, service) =>
    sonorApi.get(`/seo/location-pages/locations/${locationId}/competitor-analysis`, { params: { service } }).then(res => res.data),
  
  // ============================================================================
  // ROI ATTRIBUTION
  // ============================================================================

  /**
   * Track a conversion from a location page
   * @param {Object} data - Conversion data
   * @param {string} data.project_id - Project UUID
   * @param {string} [data.location_id] - Location UUID (optional, will be inferred from URL)
   * @param {string} data.url - The URL that converted
   * @param {string} data.conversion_type - 'lead' | 'call' | 'form' | 'chat' | 'booking' | 'purchase'
   * @param {number} [data.value] - Conversion value
   * @param {string} [data.source] - Traffic source
   * @param {string} [data.medium] - Traffic medium
   * @param {Object} [data.metadata] - Additional metadata
   */
  trackConversion: (data) =>
    sonorApi.post('/seo/location-pages/conversions/track', data).then(res => res.data),
  
  /**
   * Get ROI summary for a location
   * @param {string} locationId - Location UUID
   * @param {string} [period] - '7d' | '30d' | '90d' | '1y'
   */
  getLocationROI: (locationId, period = '30d') =>
    sonorApi.get(`/seo/location-pages/locations/${locationId}/roi`, { params: { period } }).then(res => res.data),
  
  /**
   * Get project-wide ROI dashboard
   * @param {string} projectId - Project UUID
   * @param {string} [period] - '7d' | '30d' | '90d' | '1y'
   */
  getProjectROIDashboard: (projectId, period = '30d') =>
    sonorApi.get('/seo/location-pages/roi-dashboard', { params: { project_id: projectId, period } }).then(res => res.data),
}

// ============================================================================
// Trends API - Google Trends / Sonor trending topics
// ============================================================================

export const trendsApi = {
  /**
   * Get trending topics feed
   * @param {Object} params - Query params
   * @param {string} [params.geo] - Geo code (e.g., 'US')
   * @param {string} [params.type] - 'realtime' | 'daily'
   * @param {number} [params.category_id] - Google Trends category ID
   * @param {number} [params.limit] - Max results
   * @param {number} [params.offset] - Pagination offset
   */
  getFeed: (params = {}) =>
    sonorApi.get('/trends/feed', { params }).then(res => res.data),
  
  /**
   * Get daily trends for a specific date
   * @param {Object} params - Query params
   * @param {string} params.geo - Geo code (e.g., 'US')
   * @param {string} params.date - Date in YYYY-MM-DD format
   * @param {number} [params.category_id] - Google Trends category ID
   */
  getDaily: (params) =>
    sonorApi.get('/trends/daily', { params }).then(res => res.data),
  
  /**
   * Get a single trend signal by ID
   * @param {string} id - Trend signal ID
   */
  getSignal: (id) =>
    sonorApi.get(`/trends/${id}`).then(res => res.data),
  
  /**
   * Trigger trending topics fetch (admin only)
   * @param {Object} data - { geo, category_id }
   */
  triggerTrending: (data) =>
    sonorApi.post('/trends/jobs/trending', data).then(res => res.data),
  
  /**
   * Trigger daily trends fetch (admin only)
   * @param {Object} data - { geo, date, category_id }
   */
  triggerDaily: (data) =>
    sonorApi.post('/trends/jobs/daily', data).then(res => res.data),
  
  /**
   * Trigger stale trends cleanup (admin only)
   * @param {Object} data - { max_age_hours }
   */
  triggerPurge: (data) =>
    sonorApi.post('/trends/jobs/purge-stale', data).then(res => res.data),
}

// ============================================================================
// CMS API
// ============================================================================

export const cmsApi = {
  // ---------------------------------------------------------------------------
  // Enablement & Status
  // ---------------------------------------------------------------------------

  /** Enable CMS for the current organization (provisions shared Sanity dataset) */
  enable: () =>
    sonorApi.post('/cms/enable').then(r => r.data),

  /** Link an external Sanity project */
  link: (data) =>
    sonorApi.post('/cms/link', data).then(r => r.data),

  /** Get CMS connection status */
  getStatus: (projectId) =>
    sonorApi.get('/cms/status', { params: { projectId } }).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Page CRUD
  // ---------------------------------------------------------------------------

  /** List CMS pages for a project */
  listPages: (projectId, params = {}) =>
    sonorApi.get('/cms/pages', { params: { projectId, ...params } }).then(r => r.data),

  /** Create a new CMS page */
  createPage: (data) =>
    sonorApi.post('/cms/pages', data).then(r => r.data),

  /** Get a CMS page with full Sanity content */
  getPage: (id) =>
    sonorApi.get(`/cms/pages/${id}`).then(r => r.data),

  /** Update a CMS page */
  updatePage: (id, data) =>
    sonorApi.patch(`/cms/pages/${id}`, data).then(r => r.data),

  /** Delete a CMS page and its sections */
  deletePage: (id) =>
    sonorApi.delete(`/cms/pages/${id}`).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Publish / Unpublish
  // ---------------------------------------------------------------------------

  /** Publish a CMS page */
  publishPage: (id) =>
    sonorApi.post(`/cms/pages/${id}/publish`).then(r => r.data),

  /** Unpublish a CMS page */
  unpublishPage: (id) =>
    sonorApi.post(`/cms/pages/${id}/unpublish`).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Section CRUD
  // ---------------------------------------------------------------------------

  /** Add a section to a CMS page */
  addSection: (pageId, data) =>
    sonorApi.post(`/cms/pages/${pageId}/sections`, data).then(r => r.data),

  /** Update a section */
  updateSection: (pageId, sectionId, data) =>
    sonorApi.patch(`/cms/pages/${pageId}/sections/${sectionId}`, data).then(r => r.data),

  /** Delete a section from a CMS page */
  deleteSection: (pageId, sectionId) =>
    sonorApi.delete(`/cms/pages/${pageId}/sections/${sectionId}`).then(r => r.data),

  /** Reorder sections on a CMS page */
  reorderSections: (pageId, sectionIds) =>
    sonorApi.patch(`/cms/pages/${pageId}/sections/reorder`, { sectionIds }).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Assets
  // ---------------------------------------------------------------------------

  /** Upload an asset to Sanity (multipart/form-data) */
  uploadAsset: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return sonorApi.post('/cms/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  /** List templates for a project */
  listTemplates: (projectId) =>
    sonorApi.get('/cms/templates', { params: { projectId } }).then(r => r.data),

  /** Get a template with resolved sections */
  getTemplate: (templateId) =>
    sonorApi.get(`/cms/templates/${templateId}`).then(r => r.data),

  /** Save a CMS page as a template */
  saveAsTemplate: (pageId, name) =>
    sonorApi.post('/cms/templates', { pageId, name }).then(r => r.data),

  /** Delete a template */
  deleteTemplate: (templateId) =>
    sonorApi.delete(`/cms/templates/${templateId}`).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Revision History
  // ---------------------------------------------------------------------------

  /** Get revision history for a CMS page */
  getPageRevisions: (pageId) =>
    sonorApi.get(`/cms/pages/${pageId}/revisions`).then(r => r.data),

  /** Get a page at a specific revision */
  getPageAtRevision: (pageId, rev) =>
    sonorApi.get(`/cms/pages/${pageId}/revisions/${rev}`).then(r => r.data),

  /** Restore a page to a previous revision */
  restoreRevision: (pageId, rev) =>
    sonorApi.post(`/cms/pages/${pageId}/revisions/${rev}/restore`).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Content Import
  // ---------------------------------------------------------------------------

  /** Import a page from a URL into CMS */
  importFromUrl: (projectId, url) =>
    sonorApi.post('/cms/import', { projectId, url }).then(r => r.data),

  // ---------------------------------------------------------------------------
  // Schema Registration
  // ---------------------------------------------------------------------------

  /** Register Sanity schemas for Content Lake validation */
  registerSchemas: () =>
    sonorApi.post('/cms/schemas/register').then(r => r.data),
}

// ============================================================================
// Outreach API (Cold Outreach Engine)
// ============================================================================

export const outreachApi = {
  // Domains
  listDomains: () => sonorApi.get('/outreach/domains'),
  getDomain: (id) => sonorApi.get(`/outreach/domains/${id}`),
  addDomain: (data) => sonorApi.post('/outreach/domains', data),
  updateDomain: (id, data) => sonorApi.put(`/outreach/domains/${id}`, data),
  deleteDomain: (id) => sonorApi.delete(`/outreach/domains/${id}`),
  verifyDomain: (id) => sonorApi.post(`/outreach/domains/${id}/verify`),
  activateDomain: (id) => sonorApi.post(`/outreach/domains/${id}/activate`),
  startWarmup: (id, schedule) => sonorApi.post(`/outreach/domains/${id}/warmup`, { schedule }),
  getWarmupStatus: (id) => sonorApi.get(`/outreach/domains/${id}/warmup`),
  pauseDomain: (id) => sonorApi.post(`/outreach/domains/${id}/pause`),
  getCapacityReport: () => sonorApi.get('/outreach/domains/capacity'),
  syncDomains: () => sonorApi.post('/outreach/domains/sync'),
  linkDomain: (data) => sonorApi.post('/outreach/domains/link', data),

  // Sequences
  listSequences: () => sonorApi.get('/outreach/sequences'),
  getSequence: (id) => sonorApi.get(`/outreach/sequences/${id}`),
  createSequence: (data) => sonorApi.post('/outreach/sequences', data),
  updateSequence: (id, data) => sonorApi.put(`/outreach/sequences/${id}`, data),
  deleteSequence: (id) => sonorApi.delete(`/outreach/sequences/${id}`),
  activateSequence: (id) => sonorApi.post(`/outreach/sequences/${id}/activate`),
  pauseSequence: (id) => sonorApi.post(`/outreach/sequences/${id}/pause`),
  enrollContacts: (id, contacts) => sonorApi.post(`/outreach/sequences/${id}/enroll`, { contacts }),
  getEnrollments: (id, params = {}) => sonorApi.get(`/outreach/sequences/${id}/enrollments`, { params }),
  cancelEnrollment: (enrollmentId) => sonorApi.post(`/outreach/sequences/enrollments/${enrollmentId}/cancel`),

  // Inbox
  listThreads: (params = {}) => sonorApi.get('/outreach/inbox', { params }),
  getThread: (id) => sonorApi.get(`/outreach/inbox/${id}`),
  getThreadMessages: (id) => sonorApi.get(`/outreach/inbox/${id}/messages`),
  markThreadRead: (id) => sonorApi.post(`/outreach/inbox/${id}/read`),
  updateThreadStatus: (id, status) => sonorApi.put(`/outreach/inbox/${id}/status`, { status }),
  assignThread: (id, userId) => sonorApi.put(`/outreach/inbox/${id}/assign`, { userId }),
  getUnreadCount: () => sonorApi.get('/outreach/inbox/unread-count'),

  // Compliance
  listSuppressions: (params = {}) => sonorApi.get('/outreach/compliance/suppressions', { params }),
  addSuppression: (email, reason) => sonorApi.post('/outreach/compliance/suppressions', { email, reason }),
  removeSuppression: (email) => sonorApi.delete(`/outreach/compliance/suppressions/${encodeURIComponent(email)}`),
  importSuppressions: (emails, reason) => sonorApi.post('/outreach/compliance/suppressions/import', { emails, reason }),
  checkSuppression: (email) => sonorApi.get(`/outreach/compliance/check/${encodeURIComponent(email)}`),

  // Settings
  getSettings: () => sonorApi.get('/outreach/settings'),
  updateSettings: (data) => sonorApi.put('/outreach/settings', data),

  // Landing Pages
  listLandingPages: () => sonorApi.get('/outreach/landing-pages'),
  createLandingPage: (data) => sonorApi.post('/outreach/landing-pages', data),

  // Verification
  verifyEmail: (email) => sonorApi.post('/outreach/verification/verify', { email }),
  verifyBulk: (emails) => sonorApi.post('/outreach/verification/verify-bulk', { emails }),
  checkVerification: (email) => sonorApi.get(`/outreach/verification/check/${encodeURIComponent(email)}`),
  listVerifications: (params = {}) => sonorApi.get('/outreach/verification', { params }),
  getVerificationStats: () => sonorApi.get('/outreach/verification/stats'),

  // Analytics
  getAnalyticsOverview: (days = 30) => sonorApi.get('/outreach/analytics/overview', { params: { days } }),
  getSequenceAnalytics: (id) => sonorApi.get(`/outreach/analytics/sequences/${id}`),
  getDomainAnalytics: () => sonorApi.get('/outreach/analytics/domains'),
  getDailyVolume: (days = 30) => sonorApi.get('/outreach/analytics/daily-volume', { params: { days } }),

  // Blacklist
  checkBlacklist: (domainId) => sonorApi.post(`/outreach/blacklist/check/${domainId}`),
  getBlacklistStatus: (domainId) => sonorApi.get(`/outreach/blacklist/status/${domainId}`),

  // Spintax
  previewSpintax: (data) => sonorApi.post('/outreach/sequences/spintax/preview', data),

  // Signatures
  getSignatures: (params) => sonorApi.get('/outreach/signatures', { params }),
  getSignature: (id) => sonorApi.get(`/outreach/signatures/${id}`),
  createSignature: (data) => sonorApi.post('/outreach/signatures', data),
  updateSignature: (id, data) => sonorApi.put(`/outreach/signatures/${id}`, data),
  deleteSignature: (id) => sonorApi.delete(`/outreach/signatures/${id}`),
  duplicateSignature: (id) => sonorApi.post(`/outreach/signatures/${id}/duplicate`),
  renderAnimatedSignature: (id, data) => sonorApi.post(`/outreach/signatures/${id}/render`, data),
  deleteAnimatedSignature: (id) => sonorApi.delete(`/outreach/signatures/${id}/animated`),

  // Signature Analytics
  getSignatureAnalytics: (params) => sonorApi.get('/outreach/signatures/analytics', { params }),
  getSignatureClicksByType: (params) => sonorApi.get('/outreach/signatures/analytics/by-type', { params }),
  getSignatureClicksTimeline: (params) => sonorApi.get('/outreach/signatures/analytics/timeline', { params }),

  // Discovery (Bright Data lead scraping)
  discoverLeads: (data) => sonorApi.post('/outreach/discovery/discover', data),
  getDiscoveryResults: (params) => sonorApi.get('/outreach/discovery/results', { params }),

  // Landing Pages
  listLandingPages: () => sonorApi.get('/outreach/landing-pages'),
  createLandingPage: (data) => sonorApi.post('/outreach/landing-pages', data),
  getLandingPage: (id) => sonorApi.get(`/outreach/landing-pages/${id}`),

  // Narratives (cold outreach personas — gated behind full_signal)
  listNarratives: () => sonorApi.get('/outreach/narratives'),
  getNarrative: (id) => sonorApi.get(`/outreach/narratives/${id}`),
  createNarrative: (data) => sonorApi.post('/outreach/narratives', data),
  updateNarrative: (id, data) => sonorApi.put(`/outreach/narratives/${id}`, data),
  setNarrativeEnabled: (id, enabled) => sonorApi.patch(`/outreach/narratives/${id}/enabled`, { enabled }),
  deleteNarrative: (id) => sonorApi.delete(`/outreach/narratives/${id}`),
  listNarrativeTemplates: () => sonorApi.get('/outreach/narratives/templates'),
  createNarrativeFromTemplate: (templateId, overrides) =>
    sonorApi.post('/outreach/narratives/from-template', { templateId, overrides }),

  // Outreach onboarding (M6 — derivable checklist)
  getOutreachOnboarding: () => sonorApi.get('/outreach/onboarding/status'),

  // Mailboxes (per-mailbox Gmail sending identities — gated behind full_signal)
  listMailboxes: () => sonorApi.get('/outreach/mailboxes'),
  getMailbox: (id) => sonorApi.get(`/outreach/mailboxes/${id}`),
  createMailbox: (data) => sonorApi.post('/outreach/mailboxes', data),
  updateMailbox: (id, data) => sonorApi.put(`/outreach/mailboxes/${id}`, data),
  setMailboxPaused: (id, paused, reason) =>
    sonorApi.patch(`/outreach/mailboxes/${id}/paused`, { paused, reason }),
  deleteMailbox: (id) => sonorApi.delete(`/outreach/mailboxes/${id}`),
  initiateMailboxOAuth: (id, redirectUri) =>
    sonorApi.post(`/outreach/mailboxes/${id}/oauth/initiate`, { redirectUri }),
  disconnectMailbox: (id) => sonorApi.post(`/outreach/mailboxes/${id}/disconnect`),
  sendMailboxTestEmail: (id, data) => sonorApi.post(`/outreach/mailboxes/${id}/test-send`, data),

  // Drip scheduler
  listDripSlots: (params = {}) => sonorApi.get('/outreach/drip/slots', { params }),
  getMailboxSlotCounts: (id) => sonorApi.get(`/outreach/drip/mailboxes/${id}/slot-counts`),
  regenerateMailboxSchedule: (id) =>
    sonorApi.post(`/outreach/drip/mailboxes/${id}/regenerate-schedule`),
  cancelMailboxSchedule: (id) =>
    sonorApi.delete(`/outreach/drip/mailboxes/${id}/cancel-schedule`),

  // Leads (M3 — cold prospects, narrative-routed, promoted to contacts on reply)
  listLeads: (params = {}) => sonorApi.get('/outreach/leads', { params }),
  getLeadCounts: () => sonorApi.get('/outreach/leads/counts'),
  getLead: (id) => sonorApi.get(`/outreach/leads/${id}`),
  createLead: (data) => sonorApi.post('/outreach/leads', data),
  updateLead: (id, data) => sonorApi.put(`/outreach/leads/${id}`, data),
  setLeadState: (id, state, reason) =>
    sonorApi.patch(`/outreach/leads/${id}/state`, { state, reason }),
  routeLead: (id) => sonorApi.post(`/outreach/leads/${id}/route`),
  routeAllLeads: () => sonorApi.post('/outreach/leads/route-all'),
  deleteLead: (id) => sonorApi.delete(`/outreach/leads/${id}`),

  // Lead sources (M3 — CSV upload + Apollo/Places adapters)
  listLeadSources: () => sonorApi.get('/outreach/lead-sources'),
  getLeadSource: (id) => sonorApi.get(`/outreach/lead-sources/${id}`),
  createLeadSource: (data) => sonorApi.post('/outreach/lead-sources', data),
  updateLeadSource: (id, data) => sonorApi.put(`/outreach/lead-sources/${id}`, data),
  deleteLeadSource: (id) => sonorApi.delete(`/outreach/lead-sources/${id}`),
  ingestLeadCsv: (data) => sonorApi.post('/outreach/lead-sources/ingest-csv', data),
  runPlacesSource: (data) => sonorApi.post('/outreach/lead-sources/run-places', data),

  // M5 — Apollo sourcing, sharing, per-lead enrichment, multi-angle re-route
  runApolloSource: (data) => sonorApi.post('/outreach/lead-sources/run-apollo', data),
  setLeadSourceSharing: (id, shared) =>
    sonorApi.post(`/outreach/lead-sources/${id}/sharing`, { shared }),
  enrichLead: (id) => sonorApi.post(`/outreach/leads/${id}/enrich`),
  getLeadTouches: (id) => sonorApi.get(`/outreach/leads/${id}/touches`),
  reRouteLead: (id) => sonorApi.post(`/outreach/leads/${id}/re-route`),
  reRouteExpiredLeads: () => sonorApi.post('/outreach/leads/re-route-expired'),

  // M4 analytics breakdowns
  getNarrativeBreakdown: (days = 30) =>
    sonorApi.get('/outreach/analytics/narratives', { params: { days } }),
  getMailboxBreakdown: (days = 30) =>
    sonorApi.get('/outreach/analytics/mailboxes', { params: { days } }),
}

// ============================================================================
// Gates API (Gated Page Tokens)
// ============================================================================

export const gatesApi = {
  createToken: (data) =>
    sonorApi.post('/gates/tokens', data),

  listTokens: (contactId) =>
    sonorApi.get('/gates/tokens', { params: { contactId } }),

  revokeToken: (id) =>
    sonorApi.delete(`/gates/tokens/${id}`),
}

// ============================================================================
// Default Export
// ============================================================================

export default sonorApi
