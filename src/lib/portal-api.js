/**
 * Portal API Client
 * 
 * Used for Messages and Engage modules that require real-time capabilities.
 * These endpoints are served by the Portal API (NestJS) instead of Netlify Functions.
 * 
 * For local dev:
 * - Frontend runs on :8888 (netlify dev) or :5173 (vite)
 * - Portal API runs on :3002
 * - Signal API runs on :3001
 */
import axios from 'axios'
import { supabase } from './supabase-auth'
import useAuthStore from './auth-store'

// Portal API URL - uses NestJS backend for real-time features
const PORTAL_API_URL = import.meta.env.VITE_PORTAL_API_URL || 'https://api.uptrademedia.com'

// Helper to get Portal API URL (used by WebSocket connections)
export function getPortalApiUrl() {
  return PORTAL_API_URL
}

// Create axios instance for Portal API
const portalApi = axios.create({
  baseURL: PORTAL_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to attach Supabase session token
portalApi.interceptors.request.use(
  async (config) => {
    console.log('[Portal API Request]', config.method?.toUpperCase(), config.url)
    
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
    console.error('[Portal API Request Error]', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
portalApi.interceptors.response.use(
  (response) => {
    console.log('[Portal API Response]', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status)
    return response
  },
  async (error) => {
    console.error('[Portal API Error]', {
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
          console.log('[Portal API] Session expired, redirecting to login')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

// ============================================================================
// Auth API
// ============================================================================

// Export the base portalApi client for stores that need raw access
export { portalApi }

export const authApi = {
  // Get current user context
  getMe: (organizationIdHeader) => 
    portalApi.get('/auth/me', { 
      headers: organizationIdHeader ? { 'X-Organization-Id': organizationIdHeader } : {} 
    }),
  
  // Switch organization or project context
  switchOrg: (data) => 
    portalApi.post('/auth/switch-org', data),
  
  // Link Supabase auth user to contact
  linkContact: (data) => 
    portalApi.post('/auth/link-contact', data),
  
  // Validate setup token (for account setup links)
  validateSetupToken: (token) => 
    portalApi.post('/auth/validate-setup-token', { token }),
  
  // Complete account setup
  completeSetup: (data) => 
    portalApi.post('/auth/complete-setup', data),
  
  // Validate magic link token
  validateMagicLink: (token) => 
    portalApi.post('/auth/magic-validate', { token }),
  
  // Mark setup complete for authenticated user
  markSetupComplete: () => 
    portalApi.post('/auth/mark-setup-complete'),

  // Sync Google profile picture to Supabase Storage (server-side fetch, no CORS)
  syncGoogleAvatar: (data) =>
    portalApi.post('/auth/me/sync-avatar', data),
  
  // Logout - invalidates Redis auth cache
  logout: () => 
    portalApi.post('/auth/logout'),
  
  // Submit support request
  submitSupport: (data) => 
    portalApi.post('/auth/support', data),
}

// ============================================================================
// OAuth API (platform connections: Google, etc.)
// ============================================================================

export const oauthApi = {
  /** Get OAuth connection status for all platforms for a project */
  getConnectionStatus: (projectId) =>
    portalApi.get(`/oauth/status/${projectId}`).then(r => r.data),

  /** Get OAuth initiate URL for a platform. Returns { url, state }. Use popupMode: true for popup flow (callback will postMessage to opener). */
  initiate: (platform, projectId, modules, returnUrl, options = {}) =>
    portalApi.get(`/oauth/initiate/${platform}`, {
      params: {
        projectId,
        modules: Array.isArray(modules) ? modules.join(',') : modules,
        returnUrl,
        popupMode: options.popupMode === true ? 'true' : undefined,
      },
    }).then(r => r.data),

  /** Get available GSC properties for a connection (after OAuth for SEO module) */
  getGscProperties: (connectionId) =>
    portalApi.get(`/oauth/connections/${connectionId}/gsc-properties`).then(r => r.data),

  /** Select a GSC property for a connection */
  selectGscProperty: (connectionId, propertyUrl) =>
    portalApi.post(`/oauth/connections/${connectionId}/select-property`, { propertyUrl }).then(r => r.data),
}

// ============================================================================
// Messages API
// ============================================================================

export const messagesApi = {
  // Conversations
  getConversations: (params = {}) => 
    portalApi.get('/messages/conversations', { params }),
  
  // Messages
  getMessages: (params = {}) => 
    portalApi.get('/messages', { params }),
  
  getMessage: (id) => 
    portalApi.get(`/messages/${id}`),
  
  getThread: (id) => 
    portalApi.get(`/messages/${id}/thread`),
  
  sendMessage: (data) => 
    portalApi.post('/messages', data),
  
  editMessage: (id, data) => 
    portalApi.put(`/messages/${id}`, data),
  
  deleteMessage: (id, forEveryone = false) => 
    portalApi.delete(`/messages/${id}`, { params: { forEveryone } }),
  
  markAsRead: (id) => 
    portalApi.put(`/messages/${id}/read`),
  
  // Mark all messages in a conversation as read
  markConversationAsRead: (partnerId) =>
    portalApi.put(`/messages/conversations/${partnerId}/read`),
  
  // Contacts
  getContacts: () => 
    portalApi.get('/messages/contacts'),
  
  // Search
  searchMessages: (query, params = {}) => 
    portalApi.get('/messages/search', { params: { q: query, ...params } }),
  
  // Reactions
  addReaction: (messageId, emoji) => 
    portalApi.post(`/messages/${messageId}/reactions`, { emoji }),
  
  removeReaction: (messageId, emoji) => 
    portalApi.delete(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
  
  // Drafts
  getDrafts: () => 
    portalApi.get('/messages/drafts'),
  
  saveDraft: (conversationId, content) => 
    portalApi.put(`/messages/drafts/${conversationId}`, { content }),
  
  deleteDraft: (conversationId) => 
    portalApi.delete(`/messages/drafts/${conversationId}`),
  
  // Conversation actions
  muteConversation: (id, until) => 
    portalApi.put(`/messages/conversations/${id}/mute`, { until }),
  
  archiveConversation: (id, archived = true) => 
    portalApi.put(`/messages/conversations/${id}/archive`, { archived }),
  
  pinConversation: (id, pinned = true) => 
    portalApi.put(`/messages/conversations/${id}/pin`, { pinned }),
  
  deleteConversation: (id) => 
    portalApi.delete(`/messages/conversations/${id}`),
  
  // Echo message persistence (save after streaming without triggering new response)
  saveEchoMessages: (data) => 
    portalApi.post('/messages/echo/save', data),
  
  // Attachments
  uploadAttachment: async (messageId, file) => {
    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    return portalApi.post(`/messages/${messageId}/attachments`, {
      file: {
        buffer: base64,
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
      }
    })
  },
  
  getAttachmentUrl: (attachmentId, expiresIn = 3600) => 
    portalApi.get(`/messages/attachments/${attachmentId}/url`, { params: { expires: expiresIn } }),
  
  deleteAttachment: (attachmentId) => 
    portalApi.delete(`/messages/attachments/${attachmentId}`),
  
  // Legacy file uploads (for backwards compatibility)
  uploadAttachments: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return portalApi.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // Groups
  getGroups: () => 
    portalApi.get('/messages/groups'),
  
  createGroup: (data) => 
    portalApi.post('/messages/groups', data),
  
  getGroupMessages: (groupId, params = {}) => 
    portalApi.get(`/messages/groups/${groupId}/messages`, { params }),
  
  sendGroupMessage: (groupId, data) => 
    portalApi.post(`/messages/groups/${groupId}/messages`, data),
}

// ============================================================================
// ChatKit API (User-to-User & Visitor Messaging via ChatKit protocol)
// ============================================================================

export const chatkitApi = {
  // Threads. Params: thread_type, limit, after (cursor), updated_since (sync). See docs/CHATKIT-PAGINATION in portal-api.
  getThreads: (params = {}) =>
    portalApi.get('/chatkit/threads', { params }),

  getThread: (threadId) =>
    portalApi.get(`/chatkit/threads/${threadId}`),
  
  createThread: (data) => 
    portalApi.post('/chatkit/threads', data),
  
  deleteThread: (threadId) => 
    portalApi.delete(`/chatkit/threads/${threadId}`),
  
  pinThread: (threadId, pinned) =>
    portalApi.patch(`/chatkit/threads/${threadId}/pin`, { pinned }),
  
  // Items (messages). Params: limit, after (cursor), order (asc|desc). See docs/CHATKIT-PAGINATION in portal-api.
  getItems: (threadId, params = {}) =>
    portalApi.get(`/chatkit/threads/${threadId}/items`, { params }),
  
  // Messages
  sendMessage: (data) => 
    portalApi.post('/chatkit/messages', data),

  // Reactions (Phase 2.4)
  addReaction: (threadId, itemId, emoji) =>
    portalApi.post(`/chatkit/threads/${threadId}/items/${itemId}/reactions`, { emoji }),

  removeReaction: (threadId, itemId, emoji) =>
    portalApi.delete(`/chatkit/threads/${threadId}/items/${itemId}/reactions/${encodeURIComponent(emoji)}`),
  
  // Contacts
  getContacts: () => 
    portalApi.get('/chatkit/contacts'),

  // Presence (Phase 2.10). user_ids: string[] or comma-separated string.
  getPresence: (userIds) => {
    const ids = Array.isArray(userIds) ? userIds.join(',') : (userIds ?? '')
    return portalApi.get('/chatkit/presence', { params: { user_ids: ids } })
  },

  // Channels (Phase 2.8 / 2.9). thread_type 'channel'.
  createChannel: (data) =>
    portalApi.post('/chatkit/channels', data),
  listChannels: (params = {}) =>
    portalApi.get('/chatkit/channels', { params }),
  joinChannel: (threadId) =>
    portalApi.post(`/chatkit/channels/${threadId}/join`),
  leaveChannel: (threadId) =>
    portalApi.post(`/chatkit/channels/${threadId}/leave`),

  // Link preview (Phase 3.2.2)
  getLinkPreview: (url) =>
    portalApi.get('/chatkit/link-preview', { params: { url } }),

  // Mute (Phase 3.4.1)
  muteThread: (threadId) =>
    portalApi.post(`/chatkit/threads/${threadId}/mute`),
  unmuteThread: (threadId) =>
    portalApi.post(`/chatkit/threads/${threadId}/unmute`),

  // Search (Phase 3.3.1)
  search: (query, type = 'all', limit) =>
    portalApi.get('/chatkit/search', { params: { q: query, type, limit } }),

  // Analytics (Phase 3.7.1)
  getResponseTimeStats: (threadType, startDate, endDate) =>
    portalApi.get('/chatkit/analytics/response-time', {
      params: { thread_type: threadType, start_date: startDate, end_date: endDate }
    }),

  // Audit & Export (Phase 3.5.1)
  exportThread: (threadId, format = 'json') =>
    portalApi.get(`/chatkit/export/thread/${threadId}`, {
      params: { format },
      responseType: 'blob'
    }),

  exportOrg: (startDate, endDate) =>
    portalApi.get('/chatkit/export/org', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob'
    }),

  // Report & Block (Phase 3.5.3)
  reportMessage: (messageId, reason, details) =>
    portalApi.post('/chatkit/reports/message', { message_id: messageId, reason, details }),

  reportUser: (userId, reason, details) =>
    portalApi.post('/chatkit/reports/user', { user_id: userId, reason, details }),

  listReports: (status, limit) =>
    portalApi.get('/chatkit/reports', { params: { status, limit } }),

  updateReport: (reportId, status, notes) =>
    portalApi.patch(`/chatkit/reports/${reportId}`, { status, notes }),

  blockUser: (userId, reason) =>
    portalApi.post(`/chatkit/blocks/${userId}`, { reason }),

  unblockUser: (userId) =>
    portalApi.delete(`/chatkit/blocks/${userId}`),

  getBlocks: () =>
    portalApi.get('/chatkit/blocks'),
}

// ============================================================================
// Engage API
// ============================================================================

export const engageApi = {
  // Elements
  getElements: (params = {}) => 
    portalApi.get('/engage/elements', { params }),
  
  getElement: (id) => 
    portalApi.get(`/engage/elements/${id}`),
  
  createElement: (data) => 
    portalApi.post('/engage/elements', data),
  
  updateElement: (id, data) => 
    portalApi.put(`/engage/elements/${id}`, data),
  
  deleteElement: (id) => 
    portalApi.delete(`/engage/elements/${id}`),
  
  duplicateElement: (id) => 
    portalApi.post(`/engage/elements/${id}/duplicate`),
  
  // Chat config
  getChatConfig: (projectId) => 
    portalApi.get('/engage/chat/config', { params: { projectId } }),
  
  updateChatConfig: (projectId, data) => 
    portalApi.put('/engage/chat/config', { projectId, ...data }),
  
  // Chat sessions
  getChatSessions: (params = {}) => 
    portalApi.get('/engage/chat/sessions', { params }),
  
  getChatSession: (id) => 
    portalApi.get(`/engage/chat/sessions/${id}`),
  
  sendChatMessage: (sessionId, content, attachments) => 
    portalApi.post(`/engage/chat/sessions/${sessionId}/messages`, { content, attachments }),
  
  assignChatSession: (id, agentId) => 
    portalApi.put(`/engage/chat/sessions/${id}/assign`, { agentId }),
  
  transferChatSession: (id, toAgentId, note) => 
    portalApi.put(`/engage/chat/sessions/${id}/transfer`, { toAgentId, note }),
  
  closeChatSession: (id) => 
    portalApi.put(`/engage/chat/sessions/${id}/close`),
  
  // Chat queue
  getChatQueue: () => 
    portalApi.get('/engage/chat/queue'),
  
  setAgentAvailability: (available) => 
    portalApi.put('/engage/agents/availability', { available }),
  
  getOnlineAgents: () => 
    portalApi.get('/engage/agents/online'),
  
  // Canned responses (under engage/chat controller)
  getCannedResponses: (search) => 
    portalApi.get('/engage/chat/canned-responses', { params: search ? { search } : {} }),
  
  createCannedResponse: (data) => 
    portalApi.post('/engage/chat/canned-responses', data),
  
  // Analytics
  getAnalytics: (params = {}) => 
    portalApi.get('/engage/analytics', { params }),
  
  getAnalyticsOverview: (params = {}) => 
    portalApi.get('/engage/analytics/overview', { params }),
  
  getChatAnalytics: (params = {}) => 
    portalApi.get('/engage/analytics/chat', { params }),
  
  getAgentAnalytics: (params = {}) => 
    portalApi.get('/engage/analytics/agents', { params }),
  
  // Echo config (page-specific nudges)
  getEchoConfigs: (projectId) =>
    portalApi.get('/engage/echo-config', { params: { projectId } }),
  
  createEchoConfig: (data) =>
    portalApi.post('/engage/echo-config', data),
  
  updateEchoConfig: (id, data) =>
    portalApi.put(`/engage/echo-config/${id}`, data),
  
  deleteEchoConfig: (id) =>
    portalApi.delete(`/engage/echo-config/${id}`),

  // Nudge helper endpoints
  getNudgePages: (projectId) =>
    portalApi.get('/engage/echo-config/pages', { params: { projectId } }),
  
  getNudgeSignalStatus: (projectId) =>
    portalApi.get('/engage/echo-config/signal-status', { params: { projectId } }),
  
  // Media library
  getMedia: (projectId) =>
    portalApi.get('/engage/media', { params: { projectId } }),
  
  uploadMedia: (data) =>
    portalApi.post('/engage/media', data),
  
  // Chat sessions (Portal-side inbox)
  getChatSessions: (params = {}) =>
    portalApi.get('/engage/chat/sessions', { params }),
  
  getChatSession: (sessionId) =>
    portalApi.get(`/engage/chat/sessions/${sessionId}`),
  
  sendChatMessage: (data) =>
    portalApi.post('/engage/chat/messages', data),
  
  // Targeting - Triggers
  listTriggers: (elementId) =>
    portalApi.get('/engage/targeting/triggers', { params: { elementId } }),
  
  createTrigger: (data) =>
    portalApi.post('/engage/targeting/triggers', data),
  
  updateTrigger: (id, data) =>
    portalApi.put(`/engage/targeting/triggers/${id}`, data),
  
  deleteTrigger: (id) =>
    portalApi.delete(`/engage/targeting/triggers/${id}`),
  
  // Targeting - Page Rules
  listPageRules: (elementId) =>
    portalApi.get('/engage/targeting/page-rules', { params: { elementId } }),
  
  createPageRule: (data) =>
    portalApi.post('/engage/targeting/page-rules', data),
  
  updatePageRule: (id, data) =>
    portalApi.put(`/engage/targeting/page-rules/${id}`, data),
  
  deletePageRule: (id) =>
    portalApi.delete(`/engage/targeting/page-rules/${id}`),
  
  // Targeting - Available Pages & Forms
  listTargetingPages: (projectId) =>
    portalApi.get('/engage/targeting/pages', { params: { projectId } }),
  
  listTargetingForms: (projectId) =>
    portalApi.get('/engage/targeting/forms', { params: { projectId } }),
}

// ============================================================================
// Proposals API
// ============================================================================

export const proposalsApi = {
  list: (params = {}) => 
    portalApi.get('/proposals', { params }),
  
  get: (id) => 
    portalApi.get(`/proposals/${id}`),

  getBySlug: (slug) =>
    portalApi.get(`/proposals/view/${slug}`),
  
  create: (data) => 
    portalApi.post('/proposals', data),
  
  update: (id, data) => 
    portalApi.put(`/proposals/${id}`, data),
  
  delete: (id, confirm = false) => 
    portalApi.delete(`/proposals/${id}`, { params: { confirm } }),
  
  duplicate: (id) => 
    portalApi.post(`/proposals/${id}/duplicate`),
  
  send: (id, data = {}) => 
    portalApi.post(`/proposals/${id}/send`, data),
  
  accept: (id, data = {}) => 
    portalApi.post(`/proposals/${id}/accept`, data),

  sign: (id, data) =>
    portalApi.post(`/proposals/${id}/sign`, data),
  
  decline: (id, data = {}) => 
    portalApi.post(`/proposals/${id}/decline`, data),
  
  trackView: (id) => 
    portalApi.post(`/proposals/${id}/track-view`),
  
  getAnalytics: (id) =>
    portalApi.get(`/proposals/${id}/analytics`),
  
  payDeposit: (id, data) =>
    portalApi.post(`/proposals/${id}/pay-deposit`, data),
  
  // AI Generation
  createAI: (data) => 
    portalApi.post('/proposals/ai/generate', data),
  
  getAIStatus: (id) => 
    portalApi.get(`/proposals/${id}/ai/status`),
  
  updateAI: (id, instruction) => 
    portalApi.post(`/proposals/${id}/ai/edit`, { instruction }),
  
  clarifyAI: (data) => 
    portalApi.post('/proposals/ai/clarify', data),
  
  // Templates
  listTemplates: () => 
    portalApi.get('/proposals/templates'),
  
  getTemplate: (id) => 
    portalApi.get(`/proposals/templates/${id}`),
  
  createTemplate: (data) => 
    portalApi.post('/proposals/templates', data),
}

// ============================================================================
// Audits API
// ============================================================================

export const auditsApi = {
  list: (params = {}) => 
    portalApi.get('/audits', { params }),
  
  get: (id) => 
    portalApi.get(`/audits/${id}`),

  getFull: (id) =>
    portalApi.get(`/audits/${id}/full`),
  
  create: (data) => 
    portalApi.post('/audits', data),
  
  // Internal audit (admin-only, no email)
  createInternal: (data) => 
    portalApi.post('/audits/internal', data),
  
  getInternalStatus: (id) => 
    portalApi.get(`/audits/internal/${id}`),
  
  // Public audit access
  getPublic: (id, token) => 
    portalApi.get(`/audits/public/${id}`, token ? { params: { token } } : undefined),
  
  // Track audit view/interaction events
  track: (auditId, event = 'view', metadata = {}) => 
    portalApi.post('/audits/track', { auditId, event, metadata }),
  
  // Shorthand for tracking view events
  trackView: (auditId, metadata = {}) => 
    portalApi.post('/audits/track', { auditId, event: 'view', metadata }),
  
  validateToken: (token) => 
    portalApi.post('/audits/validate-token', { token }),
  
  // Email audit report
  sendEmail: (data) => 
    portalApi.post('/audits/send-email', data),
  
  // Generate magic link for audit access
  generateMagicLink: (data) => 
    portalApi.post('/audits/magic-link', data),
  
  // Get audit analytics/metrics
  getAnalytics: (auditId) => 
    portalApi.get(`/audits/${auditId}/analytics`),
}

// ============================================================================
// Forms API
// ============================================================================

export const formsApi = {
  list: (params = {}) => 
    portalApi.get('/forms', { params }),
  
  get: (id) => 
    portalApi.get(`/forms/${id}`),
  
  create: (data) => 
    portalApi.post('/forms', data),
  
  update: (id, data) => 
    portalApi.put(`/forms/${id}`, data),
  
  delete: (id) => 
    portalApi.delete(`/forms/${id}`),
  
  // Submissions - new API structure
  listSubmissions: (params = {}) => 
    portalApi.get('/forms/submissions/list', { params }),
  
  getSubmission: (submissionId) => 
    portalApi.get(`/forms/submissions/${submissionId}`),
  
  updateSubmission: (submissionId, data) => 
    portalApi.put(`/forms/submissions/${submissionId}`, data),
  
  deleteSubmission: (submissionId) => 
    portalApi.delete(`/forms/submissions/${submissionId}`),
  
  // Analytics
  getAnalytics: (formId, params = {}) => 
    portalApi.get(`/forms/${formId}/analytics`, { params }),
}

// ============================================================================
// Billing API
// ============================================================================

export const billingApi = {
  // Invoices
  listInvoices: (params = {}) => 
    portalApi.get('/billing/invoices', { params }),
  
  getInvoice: (id) => 
    portalApi.get(`/billing/invoices/${id}`),
  
  createInvoice: (data) => 
    portalApi.post('/billing/invoices', data),
  
  updateInvoice: (id, data) => 
    portalApi.put(`/billing/invoices/${id}`, data),
  
  deleteInvoice: (id) => 
    portalApi.delete(`/billing/invoices/${id}`),
  
  sendInvoice: (id) => 
    portalApi.post(`/billing/invoices/${id}/send`),
  
  markPaid: (id, data = {}) => 
    portalApi.post(`/billing/invoices/${id}/paid`, data),
  
  downloadPdf: (id) => 
    portalApi.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' }),
  
  // Quick invoice (for new clients)
  createQuickInvoice: (data) => 
    portalApi.post('/billing/invoices/quick', data),
  
  // Summary & Overdue
  getSummary: () => 
    portalApi.get('/billing/summary'),
  
  getOverdue: () => 
    portalApi.get('/billing/overdue'),
  
  // Reminders
  sendReminder: (id) => 
    portalApi.post(`/billing/invoices/${id}/reminder`),
  
  // Recurring
  toggleRecurringPause: (id, paused) => 
    portalApi.patch(`/billing/invoices/${id}/recurring`, { is_paused: paused }),
  
  // Payments
  getPaymentLink: (invoiceId) => 
    portalApi.get(`/billing/invoices/${invoiceId}/payment-link`),
  
  processPayment: (invoiceId, paymentData) => 
    portalApi.post(`/billing/invoices/${invoiceId}/pay`, paymentData),
  
  // Public endpoints (no auth required)
  getPublicInvoice: (token) => 
    portalApi.get('/billing/invoices/public', { params: { token } }),
  
  payPublicInvoice: (data) => 
    portalApi.post('/billing/invoices/public/pay', data),
}

// ============================================================================
// Files API
// ============================================================================

export const filesApi = {
  // Supabase-backed file endpoints
  listFiles: (params = {}) => 
    portalApi.get('/files', { params }),

  listFolders: (projectId) => 
    portalApi.get(`/files/folders/${projectId}`),

  uploadFile: (data) => 
    portalApi.post('/files', data),

  uploadFileForm: (formData) =>
    portalApi.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Register a file that was uploaded directly to Supabase Storage
  registerFile: (data) =>
    portalApi.post('/files/register', data),

  getFile: (id) => 
    portalApi.get(`/files/${id}`),

  downloadFile: (id) => 
    portalApi.get(`/files/${id}/download`, { responseType: 'blob' }),

  deleteFile: (id) => 
    portalApi.delete(`/files/${id}`),

  getCategories: () => 
    portalApi.get('/files/categories'),

  replaceFile: (id, data) => 
    portalApi.post(`/files/${id}/replace`, data),

  /** Create Google Doc (user OAuth). Returns { documentId, editUrl }. */
  createGoogleDoc: (projectId, title) =>
    portalApi.post('/files/google/create-doc', { projectId, title }).then(r => r.data),

  /** Create Google Slides (user OAuth). Returns { documentId, editUrl }. */
  createGoogleSlide: (projectId, title) =>
    portalApi.post('/files/google/create-slide', { projectId, title }).then(r => r.data),

  /** Create Google Sheet (user OAuth). Returns { documentId, editUrl }. */
  createGoogleSheet: (projectId, title) =>
    portalApi.post('/files/google/create-sheet', { projectId, title }).then(r => r.data),

  /** Register an AI-generated image (e.g. from Broadcast) into Files. Returns { success, file, url }. */
  registerFromAiImage: (projectId, imageUrl, filename) =>
    portalApi.post('/files/from-ai-image', { projectId, imageUrl, filename }).then(r => r.data),

  // Legacy Google Drive endpoints (still used in admin)
  list: (params = {}) => 
    portalApi.get('/files/drive', { params }),
  
  upload: (formData, onProgress) => 
    portalApi.post('/files/drive/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  
  // Base64 upload for Drive
  uploadBase64: (data) => 
    portalApi.post('/files/drive/upload', data),
  
  delete: (id) => 
    portalApi.delete(`/files/drive/${id}`),
  
  getDownloadUrl: (id) => 
    portalApi.get(`/files/drive/${id}/download`),
  
  createFolder: (data) => 
    portalApi.post('/files/drive/folders', data),
  
  move: (id, data) => 
    portalApi.put(`/files/drive/${id}/move`, data),
}

// ============================================================================
// Screenshots API
// ============================================================================

export const screenshotsApi = {
  // Get responsive screenshots for a project (desktop, tablet, mobile)
  getResponsive: (projectId, force = false) => 
    portalApi.get(`/screenshots/project/${projectId}/responsive`, { params: { force } }),
  
  // Capture new screenshots for a project
  capture: (projectId) => 
    portalApi.post(`/screenshots/project/${projectId}/capture`),
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
    portalApi.get(`/seo/projects/${projectId}/overview`),
  
  // Alias for backwards compatibility (getSite → getOverview)
  getProject: (projectId) => 
    portalApi.get(`/seo/projects/${projectId}/overview`),
  
  // Alias for getSiteForOrg - just use getOverview with projectId
  getProjectForOrg: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/overview`),
  
  getTrends: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/trends`, { params }),
  
  getSettings: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/settings`),
  
  updateSettings: (projectId, data) =>
    portalApi.put(`/seo/projects/${projectId}/settings`, data),
  
  // Site CRUD not needed - project lifecycle handles this
  // createSite, updateSite, deleteSite are deprecated
  // Projects ARE SEO sites - use projectId as projectId
  createProject: async (data) => {
    console.warn('seoApi.createSite is deprecated. Projects are created via projectsApi.')
    // Return stub that mirrors project structure
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
    portalApi.put(`/seo/projects/${projectId}/settings`, data),
  
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
    portalApi.get(`/seo/projects/${projectId}/pages`, { params }),
  /** Alias for listPages – SEO hooks and other callers use getPages; same endpoint. */
  getPages: (projectId, params = {}) => 
    portalApi.get(`/seo/projects/${projectId}/pages`, { params }),
  
  getPage: (pageId) =>
    portalApi.get(`/seo/pages/${pageId}`),
  
  createPage: (projectId, data) => 
    portalApi.post(`/seo/projects/${projectId}/pages`, data),
  
  updatePage: (pageId, data) => 
    portalApi.put(`/seo/pages/${pageId}`, data),
  
  deletePage: (pageId) =>
    portalApi.delete(`/seo/pages/${pageId}`),
  
  bulkUpdatePages: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/pages/bulk-update`, data),
  
  updatePageMetadata: (pageId, data) =>
    portalApi.put(`/seo/pages/${pageId}`, data),
  
  // ==================== PAGE IMAGES ====================
  getPageImages: (projectId, pageId) =>
    portalApi.get(`/seo/projects/${projectId}/pages/${pageId}/images`),
  
  updatePageImage: (projectId, pageId, imageId, data) =>
    portalApi.patch(`/seo/projects/${projectId}/pages/${pageId}/images/${imageId}`, data),
  
  // Note: Crawling removed - pages are auto-discovered via site-kit page views
  
  // ==================== OPPORTUNITIES ====================
  getOpportunities: (projectId, params = {}) => 
    portalApi.get(`/seo/projects/${projectId}/opportunities`, { params }),
  
  getOpportunity: (opportunityId) =>
    portalApi.get(`/seo/opportunities/${opportunityId}`),
  
  createOpportunity: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/opportunities`, data),
  
  detectOpportunities: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/opportunities/detect`),
  
  updateOpportunity: (opportunityId, data) =>
    portalApi.put(`/seo/opportunities/${opportunityId}`, data),
  
  deleteOpportunity: (opportunityId) =>
    portalApi.delete(`/seo/opportunities/${opportunityId}`),
  
  bulkUpdateOpportunities: (data) => {
    // Normalize: hook may pass { opportunityIds, updates }; API expects { opportunityIds, status?, priority? }
    const body = data.updates ? { opportunityIds: data.opportunityIds, ...data.updates } : data
    return portalApi.post('/seo/opportunities/bulk-update', body)
  },

  getOpportunitySummary: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/opportunities/summary`),
  
  getPageOpportunities: (pageId) =>
    portalApi.get(`/seo/pages/${pageId}/opportunities`),
  
  dismissOpportunity: (opportunityId) =>
    portalApi.put(`/seo/opportunities/${opportunityId}`, { status: 'dismissed' }),
  
  completeOpportunity: (opportunityId) =>
    portalApi.put(`/seo/opportunities/${opportunityId}`, { status: 'completed' }),
  
  // ==================== QUERIES / KEYWORDS ====================
  listQueries: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/queries`, { params }),
  
  // Alias for listQueries (used by hooks)
  getQueries: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/queries`, { params }),
  
  getQuery: (queryId) =>
    portalApi.get(`/seo/queries/${queryId}`),
  
  updateQuery: (queryId, data) =>
    portalApi.put(`/seo/queries/${queryId}`, data),
  
  getTrackedQueries: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/queries/tracked`),
  
  getQuickWinQueries: (projectId, limit) =>
    portalApi.get(`/seo/projects/${projectId}/queries/quick-wins`, { params: { limit } }),
  
  trackQueries: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/queries/track`, data),
  
  untrackQueries: (data) =>
    portalApi.post('/seo/queries/untrack', data),
  
  // Legacy keyword aliases (keywords = queries)
  listKeywords: (projectId, params = {}) => 
    portalApi.get(`/seo/projects/${projectId}/queries`, { params }),
  
  getTrackedKeywords: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/queries/tracked`),
  
  getKeywordsSummary: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/queries/summary`),
  
  getRankingHistory: (projectId, keywordId, options = {}) =>
    portalApi.get(`/seo/projects/${projectId}/queries/history`, { params: { keywordId, ...options } }),
  
  trackKeywords: (projectId, keywords) =>
    portalApi.post(`/seo/projects/${projectId}/queries/track`, { queries: keywords }),
  
  addKeywords: (projectId, keywords) => 
    portalApi.post(`/seo/projects/${projectId}/queries/track`, { queries: keywords }),
  
  autoDiscoverKeywords: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/queries/discover`),
  
  refreshKeywordRankings: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/queries/refresh`),
  
  // ==================== COMPETITORS ====================
  getCompetitors: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/competitors`),
  
  getCompetitor: (competitorId) =>
    portalApi.get(`/seo/competitors/${competitorId}`),
  
  createCompetitor: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/competitors`, data),
  
  updateCompetitor: (competitorId, data) =>
    portalApi.put(`/seo/competitors/${competitorId}`, data),
  
  deleteCompetitor: (competitorId) =>
    portalApi.delete(`/seo/competitors/${competitorId}`),
  
  getCompetitorComparison: (projectId, competitorId) =>
    portalApi.get(`/seo/projects/${projectId}/competitors/${competitorId}/comparison`),
  
  analyzeCompetitor: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/competitors/analyze`, data),
  
  // ==================== GSC (Google Search Console) ====================
  disconnectGsc: (projectId) =>
    portalApi.delete(`/seo/projects/${projectId}/gsc`),
  
  getGscOverview: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/gsc/overview`, { params }),
  
  getGscQueries: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/gsc/queries`, { params }),

  getPageContentSummary: (pageId) =>
    portalApi.get(`/seo/pages/${pageId}/content-summary`),
  
  getGscPages: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/gsc/pages`, { params }),
  
  clearGscData: (projectId) =>
    portalApi.delete(`/seo/projects/${projectId}/gsc/cache`),
  
  getGscComparison: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/gsc/comparison`, { params }),
  
  getGscHealth: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/gsc/health`),
  
  reconcileGsc: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/gsc/reconcile`),
  
  // ==================== AI BRAIN ====================
  trainSite: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/ai/train`),
  
  getProjectKnowledge: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/ai/knowledge`),
  
  runAiBrain: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/ai/analyze`, data),
  
  // ==================== SIGNAL AI ====================
  getSignalLearning: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/signal/learning`),
  
  applySignalAutoFixes: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/signal/auto-fixes`),
  
  getSignalSuggestions: (projectId, pageId) =>
    portalApi.get(`/seo/projects/${projectId}/signal/suggestions`, { params: { pageId } }),
  
  // ==================== AI RECOMMENDATIONS ====================
  getAiRecommendations: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/recommendations`, { params }),
  
  getRecommendationsSummary: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/recommendations/summary`),
  
  generateRecommendations: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/recommendations/generate`),
  
  applyRecommendation: (projectId, recommendationId) =>
    portalApi.post(`/seo/projects/${projectId}/recommendations/${recommendationId}/apply`),
  
  applyRecommendations: (projectId, recommendationIds, autoOnly = false) =>
    portalApi.post(`/seo/projects/${projectId}/recommendations/bulk-apply`, { recommendationIds, autoOnly }),
  
  updateRecommendationStatus: (recommendationId, status) =>
    portalApi.patch(`/seo/recommendations/${recommendationId}/status`, { status }),
  
  dismissRecommendation: (projectId, recommendationId, reason = null) =>
    portalApi.post(`/seo/recommendations/${recommendationId}/dismiss`, { reason }),
  
  analyzePageWithAi: (projectId, pageId) =>
    portalApi.post(`/seo/projects/${projectId}/pages/${pageId}/ai-analyze`),
  
  // ==================== CONTENT BRIEFS ====================
  getContentBriefs: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/content-briefs`),
  
  getContentBrief: (projectId, pageId) => 
    portalApi.get(`/seo/projects/${projectId}/pages/${pageId}/content-brief`),
  
  generateContentBrief: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/content-briefs`, data),
  
  // ==================== ALERTS ====================
  getAlerts: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/alerts`, { params }),
  
  checkAlerts: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/alerts/check`, data),
  
  acknowledgeAlert: (alertId) =>
    portalApi.put(`/seo/alerts/${alertId}/acknowledge`),
  
  resolveAlert: (alertId, data = {}) =>
    portalApi.put(`/seo/alerts/${alertId}/resolve`, data),
  
  // ==================== SERP FEATURES ====================
  getSerpFeatures: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/serp-features`, { params }),
  
  analyzeSerpFeatures: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/serp-features/analyze`),
  
  // ==================== LOCAL SEO ====================
  getLocalSeoAnalysis: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/local`),
  
  analyzeLocalSeo: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/local/analyze`),
  
  // Local Grids (Heat Map Configuration)
  getLocalGrids: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/local/grids`, { params }),
  
  getLocalGrid: (gridId) =>
    portalApi.get(`/seo/local/grids/${gridId}`),
  
  createLocalGrid: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/local/grids`, data),
  
  updateLocalGrid: (gridId, data) =>
    portalApi.put(`/seo/local/grids/${gridId}`, data),
  
  deleteLocalGrid: (gridId) =>
    portalApi.delete(`/seo/local/grids/${gridId}`),
  
  // Heat Map Data (Local Rankings)
  getHeatMapData: (gridId, params = {}) =>
    portalApi.get(`/seo/local/grids/${gridId}/heat-map`, { params }),
  
  getLocalRankings: (gridId, params = {}) =>
    portalApi.get(`/seo/local/grids/${gridId}/rankings`, { params }),
  
  saveLocalRankings: (gridId, rankings) =>
    portalApi.post(`/seo/local/grids/${gridId}/rankings`, { rankings }),
  
  crawlLocalGrid: (gridId, businessName, options = {}) =>
    portalApi.post(`/seo/local/grids/${gridId}/crawl`, { 
      businessName, 
      keywords: options.keywords,
      delay: options.delay 
    }),
  
  // Entity Scores (GBP Health)
  getEntityScore: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/local/entity-score`),
  
  getEntityScoreHistory: (projectId, limit) =>
    portalApi.get(`/seo/projects/${projectId}/local/entity-score/history`, { params: { limit } }),
  
  saveEntityScore: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/local/entity-score`, data),
  
  // Real GBP API Data (requires OAuth connection)
  getGbpProfile: (projectId) =>
    portalApi.get(`/seo/${projectId}/gbp/profile`),
  
  getGbpReviews: (projectId, limit) =>
    portalApi.get(`/seo/${projectId}/gbp/reviews`, { params: { limit } }),
  
  analyzeGbpEntityHealth: (projectId) =>
    portalApi.post(`/seo/${projectId}/gbp/entity-health/analyze`),
  
  // Geo Pages (Local Coverage)
  getLocalPages: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/local/pages`, { params }),
  
  getLocalPage: (pageId) =>
    portalApi.get(`/seo/local/pages/${pageId}`),
  
  createLocalPage: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/local/pages`, data),
  
  updateLocalPage: (pageId, data) =>
    portalApi.put(`/seo/local/pages/${pageId}`, data),
  
  deleteLocalPage: (pageId) =>
    portalApi.delete(`/seo/local/pages/${pageId}`),
  
  // Citations (NAP Consistency)
  getCitations: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/local/citations`, { params }),
  
  getCitation: (citationId) =>
    portalApi.get(`/seo/local/citations/${citationId}`),
  
  createCitation: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/local/citations`, data),
  
  updateCitation: (citationId, data) =>
    portalApi.put(`/seo/local/citations/${citationId}`, data),
  
  deleteCitation: (citationId) =>
    portalApi.delete(`/seo/local/citations/${citationId}`),
  
  checkCitation: (citationId, canonicalNap) =>
    portalApi.post(`/seo/local/citations/${citationId}/check`, canonicalNap),
  
  // GBP Connections
  getGbpConnection: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/local/gbp`),
  
  createGbpConnection: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/local/gbp`, data),
  
  updateGbpConnection: (projectId, data) =>
    portalApi.put(`/seo/projects/${projectId}/local/gbp`, data),
  
  deleteGbpConnection: (projectId) =>
    portalApi.delete(`/seo/projects/${projectId}/local/gbp`),

  // ==================== INTERNAL LINKS ====================
  getInternalLinks: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/internal-links`),

  recalculateInternalLinks: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/internal-links/recalculate`),
  
  // ==================== SCHEMA MARKUP ====================
  getSchemaStatus: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/schemas/summary`),
  getSchemas: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/schemas/summary`),
  
  listSchemas: (projectId, query = {}) =>
    portalApi.get(`/seo/projects/${projectId}/schemas`, { params: query }),
  
  getPageSchemas: (pageId, projectId) =>
    portalApi.get(`/seo/pages/${pageId}/schemas`, { params: { projectId } }),
  
  createSchema: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/schemas`, data),
  
  updateSchema: (schemaId, data) =>
    portalApi.patch(`/seo/schemas/${schemaId}`, data),
  
  deleteSchema: (schemaId) =>
    portalApi.delete(`/seo/schemas/${schemaId}`),
  
  markSchemaImplemented: (schemaId) =>
    portalApi.post(`/seo/schemas/${schemaId}/implement`),
  
  verifySchema: (schemaId) =>
    portalApi.post(`/seo/schemas/${schemaId}/verify`),
  
  // ==================== TECHNICAL AUDIT ====================
  getTechnicalAudit: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/technical-audit`),
  
  runTechnicalAudit: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/technical-audit`),
  
  // ==================== CONTENT DECAY ====================
  getContentDecay: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/content-decay`),
  
  detectContentDecay: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/content-decay/detect`),
  
  // ==================== BACKLINKS ====================
  getBacklinkOpportunities: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/backlinks`),
  
  discoverBacklinks: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/backlinks/discover`),
  
  updateBacklinkOpportunity: (projectId, backlinkId, data) =>
    portalApi.put(`/seo/projects/${projectId}/backlinks/${backlinkId}`, data),
  
  // ==================== AUTOMATION ====================
  runAutoOptimize: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/auto-optimize`, data),
  
  scheduleAnalysis: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/schedule`, data),
  
  // ==================== INDEXING ====================
  getIndexingStatus: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/indexing`, { params }),
  getIndexingIssues: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/indexing`, { params }),
  
  getIndexingSummary: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/indexing/summary`),
  
  requestIndexing: (indexingId) =>
    portalApi.post(`/seo/indexing/${indexingId}/request`),
  getSitemapsStatus: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/sitemaps`),
  
  inspectUrl: (projectId, url) =>
    portalApi.post(`/seo/projects/${projectId}/indexing/inspect`, { url }),
  
  bulkInspectUrls: (projectId, urls) =>
    portalApi.post(`/seo/projects/${projectId}/indexing/bulk-inspect`, { urls }),
  
  analyzeIndexingIssues: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/indexing/analyze`),

  /** Google Indexing API: submit a single URL for indexing (200/day quota) */
  submitUrlForIndexing: (projectId, url, type = 'URL_UPDATED') =>
    portalApi.post(`/seo/projects/${projectId}/indexing/submit`, { url, type }).then(r => r.data),

  /** Google Indexing API: submit multiple URLs (respects daily quota) */
  submitBulkForIndexing: (projectId, urls, type = 'URL_UPDATED') =>
    portalApi.post(`/seo/projects/${projectId}/indexing/submit/bulk`, { urls, type }).then(r => r.data),

  /** Remaining Indexing API submissions for today (max 200/day) */
  getIndexingSubmitQuota: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/indexing/submit/quota`).then(r => r.data),

  /** Last submission status for a URL */
  getIndexingSubmitStatus: (projectId, url) =>
    portalApi.get(`/seo/projects/${projectId}/indexing/submit/status`, { params: { url } }).then(r => r.data),

  // ==================== BLOG AI ====================
  getBlogTopicRecommendations: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/blog/topics`),
  
  analyzeBlogBrain: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/blog/brain`, data),
  
  analyzeBlogPost: (postId) =>
    portalApi.post(`/seo/blog/${postId}/analyze`),
  
  generateBlogContent: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/blog/generate`, data),
  
  analyzeAllBlogPosts: () =>
    portalApi.post('/seo/blog/analyze-all'),
  
  fixBlogPostEmDashes: (postId) =>
    portalApi.post(`/seo/blog/${postId}/fix-em-dashes`),
  
  fixAllBlogPostEmDashes: () =>
    portalApi.post('/seo/blog/fix-all-em-dashes'),
  
  optimizeBlogPost: (postId, options = {}) =>
    portalApi.post(`/seo/blog/${postId}/optimize`, options),
  
  addBlogPostCitations: (postId, applyChanges = false) =>
    portalApi.post(`/seo/blog/${postId}/citations`, { applyChanges }),
  
  // ==================== BACKGROUND JOBS ====================
  startBackgroundJob: (data) =>
    portalApi.post('/seo/jobs', data),
  
  getJobStatus: (jobId) =>
    portalApi.get(`/seo/jobs/${jobId}`),
  
  listBackgroundJobs: () =>
    portalApi.get('/seo/jobs'),
  
  extractSiteMetadata: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/extract-metadata`),

  /** Crawl sitemap / extract pages metadata (triggers discovery for technical audit & CWV) */
  crawlSitemap: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/extract-metadata`),

  /** Single-page crawl: deprecated – pages are auto-discovered via site-kit. No-op that resolves for UI compatibility. */
  crawlPage: (_pageId) => Promise.resolve({ data: { success: true } }),
  
  // ==================== SITE REVALIDATION ====================
  revalidateSite: (data) =>
    portalApi.post('/seo/revalidate', data),
  
  // ==================== GSC FIXES ====================
  getGscIssues: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/gsc/issues`),
  
  applyGscFix: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/gsc/fix`, data),
  
  generateGscFixSuggestions: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/gsc/suggestions`),
  
  // ==================== REDIRECTS ====================
  getRedirects: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/redirects`),
  
  createRedirect: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/redirects`, data),
  
  updateRedirect: (id, data) =>
    portalApi.put(`/seo/redirects/${id}`, data),
  
  deleteRedirect: (id) =>
    portalApi.delete(`/seo/redirects/${id}`),
  
  // ==================== REPORTS ====================
  getReports: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/reports`),
  
  generateReport: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/reports`, data),
  
  // ==================== RANKING HISTORY ====================
  getRankingHistory: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/ranking-history`, { params }),
  
  archiveRankings: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/ranking-history/snapshot`),
  
  backfillRankingHistory: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/ranking-history/backfill`),
  
  // ==================== CORE WEB VITALS ====================
  getCwvHistory: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/cwv`, { params }),
  
  checkPageCwv: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/cwv/check`, data),
  
  checkAllPagesCwv: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/cwv/check-all`, data),
  
  getCwvSummary: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/cwv/summary`),
  
  // ==================== TOPIC CLUSTERS ====================
  getTopicClusters: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/topic-clusters`),
  
  generateTopicClusters: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/topic-clusters`, data),
  
  // ==================== CANNIBALIZATION ====================
  getCannibalization: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/cannibalization`),
  
  detectCannibalization: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/cannibalization/detect`, data),
  
  // ==================== CONTENT GAP ====================
  getContentGaps: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/content-gaps`),
  
  analyzeContentGaps: (projectId, data = {}) =>
    portalApi.post(`/seo/projects/${projectId}/content-gaps/analyze`, data),
  
  // ==================== GSC SYNC ====================
  // Backend uses projectId only; no body (GSC property comes from OAuth connection).
  syncGsc: (projectId) =>
    portalApi.post(`/seo/projects/${projectId}/sync/gsc`),
  
  // ==================== SERP ANALYSIS ====================
  analyzeSerpForKeyword: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/serp/analyze`, data),
  
  // Analytics (legacy)
  getSiteAnalytics: (projectId, params = {}) => 
    portalApi.get(`/seo/projects/${projectId}/analytics`, { params }),
  
  // ==================== CHANGE HISTORY ====================
  getChangeHistory: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/change-history`, { params }),
  
  getChangeHistorySummary: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/change-history/summary`),
  
  createChangeHistory: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/change-history`, data),
  
  updateChangeHistory: (projectId, changeId, data) =>
    portalApi.patch(`/seo/projects/${projectId}/change-history/${changeId}`, data),
  
  revertChange: (projectId, changeId) =>
    portalApi.post(`/seo/projects/${projectId}/change-history/${changeId}/revert`),
  
  recordChangeBaseline: (projectId, changeId, data) =>
    portalApi.post(`/seo/projects/${projectId}/change-history/${changeId}/baseline`, data),
  
  recordChangeImpact: (projectId, changeId, period, data) =>
    portalApi.post(`/seo/projects/${projectId}/change-history/${changeId}/impact/${period}`, data),
  
  // ==================== SPRINTS ====================
  getSprints: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/sprints`, { params }),
  
  getCurrentSprint: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/sprints/current`),
  
  getSuggestedGoals: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/sprints/suggest-goals`),
  
  getSprintTemplates: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/sprints/templates`),
  
  createSprint: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/sprints`, data),
  
  updateSprint: (projectId, sprintId, data) =>
    portalApi.put(`/seo/projects/${projectId}/sprints/${sprintId}`, data),
  
  completeSprintGoal: (projectId, sprintId, goalId) =>
    portalApi.post(`/seo/projects/${projectId}/sprints/${sprintId}/goals/${goalId}/complete`),
  
  updateGoalProgress: (projectId, sprintId, goalId, currentValue) =>
    portalApi.put(`/seo/projects/${projectId}/sprints/${sprintId}/goals/${goalId}/progress`, { current_value: currentValue }),
  
  deleteSprint: (projectId, sprintId) =>
    portalApi.delete(`/seo/projects/${projectId}/sprints/${sprintId}`),
  
  // ==================== AUTOPILOT ====================
  getAutopilotSettings: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/autopilot/settings`),
  
  updateAutopilotSettings: (projectId, data) =>
    portalApi.put(`/seo/projects/${projectId}/autopilot/settings`, data),
  
  getAutopilotQueue: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/autopilot/queue`, { params }),
  
  approveAutopilotItem: (projectId, itemId) =>
    portalApi.post(`/seo/projects/${projectId}/autopilot/queue/${itemId}/approve`),
  
  rejectAutopilotItem: (projectId, itemId) =>
    portalApi.post(`/seo/projects/${projectId}/autopilot/queue/${itemId}/reject`),
  
  applyAutopilotItem: (projectId, itemId) =>
    portalApi.post(`/seo/projects/${projectId}/autopilot/queue/${itemId}/apply`),
  
  // ==================== COLLABORATION - TASKS ====================
  getTasks: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/tasks`, { params }),
  
  getMyTasks: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/tasks/my`),
  
  getTask: (taskId) =>
    portalApi.get(`/seo/tasks/${taskId}`),
  
  createTask: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/tasks`, data),
  
  updateTask: (taskId, data) =>
    portalApi.patch(`/seo/tasks/${taskId}`, data),
  
  deleteTask: (taskId) =>
    portalApi.delete(`/seo/tasks/${taskId}`),
  
  // ==================== COLLABORATION - COMMENTS ====================
  getComments: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/comments`, { params }),
  
  createComment: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/comments`, data),
  
  updateComment: (commentId, data) =>
    portalApi.patch(`/seo/comments/${commentId}`, data),
  
  deleteComment: (commentId) =>
    portalApi.delete(`/seo/comments/${commentId}`),
  
  // ==================== COLLABORATION - APPROVALS ====================
  getApprovals: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/approvals`, { params }),
  
  getApproval: (approvalId) =>
    portalApi.get(`/seo/approvals/${approvalId}`),
  
  createApproval: (projectId, data) =>
    portalApi.post(`/seo/projects/${projectId}/approvals`, data),
  
  decideApproval: (approvalId, data) =>
    portalApi.post(`/seo/approvals/${approvalId}/decide`, data),
  
  // ==================== COLLABORATION - ACTIVITY ====================
  getActivity: (projectId, params = {}) =>
    portalApi.get(`/seo/projects/${projectId}/activity`, { params }),
  
  // ==================== COLLABORATION - TEAM ====================
  getTeamMembers: (projectId) =>
    portalApi.get(`/seo/projects/${projectId}/team`),
}

// ============================================================================
// CRM API
// ============================================================================

export const crmApi = {
  // Prospects
  listProspects: (params = {}) => 
    portalApi.get('/crm/prospects', { params }),
  
  getProspect: (id) => 
    portalApi.get(`/crm/prospects/${id}`),
  
  createProspect: (data) => 
    portalApi.post('/crm/prospects', data),
  
  updateProspect: (id, data) => 
    portalApi.put(`/crm/prospects/${id}`, data),
  
  deleteProspect: (id) => 
    portalApi.delete(`/crm/prospects/${id}`),
  
  bulkUpdateProspects: (ids, data) => 
    portalApi.post('/crm/prospects/bulk-update', { ids, ...data }),
  
  getProspectActivity: (contactId) => 
    portalApi.get(`/crm/prospects/${contactId}/activity`),
  
  // Contacts
  listContacts: (params = {}) => 
    portalApi.get('/crm/contacts', { params }),
  
  getContact: (id) => 
    portalApi.get(`/crm/contacts/${id}`),
  
  createContact: (data) => 
    portalApi.post('/crm/contacts', data),
  
  updateContact: (id, data) => 
    portalApi.put(`/crm/contacts/${id}`, data),
  
  deleteContact: (id) => 
    portalApi.delete(`/crm/contacts/${id}`),
  
  assignContact: (contactId, assignedTo) =>
    portalApi.post('/crm/contacts/assign', { contactId, assignedTo }),
  
  // Calls
  listCalls: (params = {}) => 
    portalApi.get('/crm/calls', { params }),
  
  getCall: (id) => 
    portalApi.get(`/crm/calls/${id}`),
  
  // Tasks
  listTasks: (params = {}) => 
    portalApi.get('/crm/tasks', { params }),
  
  getTask: (id) => 
    portalApi.get(`/crm/tasks/${id}`),
  
  createTask: (data) => 
    portalApi.post('/crm/tasks', data),
  
  updateTask: (id, data) => 
    portalApi.put(`/crm/tasks/${id}`, data),
  
  deleteTask: (id) => 
    portalApi.delete(`/crm/tasks/${id}`),
  
  // Follow-ups
  listFollowUps: (params = {}) => 
    portalApi.get('/crm/follow-ups', { params }),
  
  getFollowUp: (id) => 
    portalApi.get(`/crm/follow-ups/${id}`),
  
  createFollowUp: (data) => 
    portalApi.post('/crm/follow-ups', data),
  
  updateFollowUp: (id, data) => 
    portalApi.put(`/crm/follow-ups/${id}`, data),
  
  deleteFollowUp: (id) => 
    portalApi.delete(`/crm/follow-ups/${id}`),
  
  // Notes
  createNote: (data) => 
    portalApi.post('/crm/notes', data),
  
  // Emails
  listEmails: (params = {}) => 
    portalApi.get('/crm/emails', { params }),
  
  // Deals
  listDeals: (params = {}) => 
    portalApi.get('/crm/deals', { params }),
  
  getDeal: (id) => 
    portalApi.get(`/crm/deals/${id}`),
  
  createDeal: (data) => 
    portalApi.post('/crm/deals', data),
  
  updateDeal: (id, data) => 
    portalApi.put(`/crm/deals/${id}`, data),
  
  // Activities
  listActivities: (params = {}) => 
    portalApi.get('/crm/activities', { params }),
  
  createActivity: (data) => 
    portalApi.post('/crm/activities', data),
  
  // Pipeline
  getPipeline: () => 
    portalApi.get('/crm/pipeline'),
  
  updateStages: (stages) => 
    portalApi.put('/crm/pipeline/stages', { stages }),
  
  // Conversions
  convertProspect: (contactId, data) =>
    portalApi.post('/crm/convert-prospect', { contactId, ...data }),
  
  convertProspectToContact: (prospectId) =>
    portalApi.post(`/crm/prospects/${prospectId}/convert-to-contact`),
  
  convertProspectToCustomer: (prospectId) =>
    portalApi.post(`/crm/prospects/${prospectId}/convert-to-customer`),
  
  // Timeline & Proposals
  getProspectTimeline: (prospectId) =>
    portalApi.get(`/crm/prospects/${prospectId}/timeline`),
  
  getProspectProposals: (prospectId) =>
    portalApi.get(`/crm/prospects/${prospectId}/proposals`),
  
  getProspectEmails: (prospectId) =>
    portalApi.get(`/crm/prospects/${prospectId}/emails`),
  
  // Pipeline Configuration
  getPipelineStages: (projectId) =>
    portalApi.get(`/crm/pipeline-stages`, { params: { projectId } }),
  
  updatePipelineStages: (projectId, stages) =>
    portalApi.post(`/crm/pipeline-stages/bulk-update`, { projectId, stages }),
  
  // Notifications
  getNotifications: (params = {}) =>
    portalApi.get('/crm/notifications', { params }),
  
  markNotificationRead: (notificationId) =>
    portalApi.post('/crm/notifications/mark-read', { notificationId }),
  
  markAllNotificationsRead: () =>
    portalApi.post('/crm/notifications/mark-all-read'),
  
  // Calls
  logCallIntent: (data) =>
    portalApi.post('/crm/calls/log-intent', data),
  
  // ==================== TARGET COMPANIES (Prospecting) ====================
  
  // List all target companies for org
  listTargetCompanies: (params = {}) =>
    portalApi.get('/crm/target-companies', { params }),
  
  // Get single target company
  getTargetCompany: (id) =>
    portalApi.get(`/crm/target-companies/${id}`),
  
  // Get target company by domain
  getTargetCompanyByDomain: (domain) =>
    portalApi.get('/crm/target-companies/domain', { params: { domain } }),
  
  // Analyze a website (calls Signal API)
  analyzeWebsite: (domain, options = {}) =>
    portalApi.post('/crm/target-companies/analyze', { domain, ...options }),
  
  // Create target company (usually from extension)
  createTargetCompany: (data) =>
    portalApi.post('/crm/target-companies', data),
  
  // Update target company
  updateTargetCompany: (id, data) =>
    portalApi.put(`/crm/target-companies/${id}`, data),
  
  // Claim a company (assign to current user)
  claimTargetCompany: (id) =>
    portalApi.post(`/crm/target-companies/${id}/claim`),
  
  // Unclaim a company
  unclaimTargetCompany: (id) =>
    portalApi.post(`/crm/target-companies/${id}/unclaim`),
  
  // Get/generate call prep for company
  getCallPrep: (id, regenerate = false) =>
    portalApi.post(`/crm/target-companies/${id}/call-prep`, { regenerate }),
  
  // Trigger PageSpeed audit for company
  triggerAudit: (id, options = {}) =>
    portalApi.post(`/crm/target-companies/${id}/trigger-audit`, options),
  
  // Get audit status and scores
  getAuditStatus: (id) =>
    portalApi.get(`/crm/target-companies/${id}/audit-status`),
  
  // Generate personalized outreach email
  generateOutreach: (id, options = {}) =>
    portalApi.post(`/crm/target-companies/${id}/generate-outreach`, options),
  
  // Save scraped contacts from page
  saveContacts: (id, contacts) =>
    portalApi.post(`/crm/target-companies/${id}/save-contacts`, { contacts }),
  
  // Delete target company
  deleteTargetCompany: (id) =>
    portalApi.delete(`/crm/target-companies/${id}`),

  // ==================== CLIENT PROSPECTS (Non-Uptrade Orgs) ====================
  
  // Get form submission linked to prospect
  getProspectFormSubmission: (id) =>
    portalApi.get(`/crm/client-prospects/${id}/form-submission`),
  
  // Convert prospect to commerce customer
  convertToCustomer: (id, data = {}) =>
    portalApi.post(`/crm/client-prospects/${id}/convert-to-customer`, data),
  
  // Get Gmail threads for prospect
  getProspectEmails: (id, params = {}) =>
    portalApi.get(`/crm/client-prospects/${id}/emails`, { params }),
  
  // Get Sync meetings for prospect
  getProspectMeetings: (id) =>
    portalApi.get(`/crm/client-prospects/${id}/meetings`),
  
  // ==================== REMINDERS ====================
  
  listReminders: (params = {}) =>
    portalApi.get('/crm/reminders', { params }),
  
  createReminder: (prospectId, data) =>
    portalApi.post(`/crm/reminders/prospects/${prospectId}`, data),
  
  updateReminder: (id, data) =>
    portalApi.put(`/crm/reminders/${id}`, data),
  
  completeReminder: (id) =>
    portalApi.patch(`/crm/reminders/${id}/complete`),
  
  deleteReminder: (id) =>
    portalApi.delete(`/crm/reminders/${id}`),
  
  // ==================== CUSTOM FIELDS ====================
  
  listCustomFields: () =>
    portalApi.get('/crm/custom-fields'),
  
  createCustomField: (data) =>
    portalApi.post('/crm/custom-fields', data),
  
  updateCustomField: (id, data) =>
    portalApi.put(`/crm/custom-fields/${id}`, data),
  
  deleteCustomField: (id) =>
    portalApi.delete(`/crm/custom-fields/${id}`),
  
  reorderCustomFields: (fieldIds) =>
    portalApi.post('/crm/custom-fields/reorder', { fieldIds }),
  
  // ==================== PIPELINE STAGES ====================
  
  listPipelineStages: () =>
    portalApi.get('/crm/pipeline-stages'),
  
  createPipelineStage: (data) =>
    portalApi.post('/crm/pipeline-stages', data),
  
  updatePipelineStage: (id, data) =>
    portalApi.put(`/crm/pipeline-stages/${id}`, data),
  
  deletePipelineStage: (id) =>
    portalApi.delete(`/crm/pipeline-stages/${id}`),
  
  reorderPipelineStages: (stageIds) =>
    portalApi.post('/crm/pipeline-stages/reorder', { stageIds }),
  
  // ==================== DEAL TRACKING ====================
  
  updateProspectDeal: (prospectId, data) =>
    portalApi.patch(`/crm/prospects/${prospectId}/deal`, data),
  
  // ==================== ANALYTICS ====================
  
  getPipelineSummary: (params = {}) =>
    portalApi.get('/crm/analytics/pipeline-summary', { params }),
  
  getPipelineVelocity: (params = {}) =>
    portalApi.get('/crm/analytics/pipeline-velocity', { params }),
  
  getRevenueForecast: (params = {}) =>
    portalApi.get('/crm/analytics/revenue-forecast', { params }),
  
  getSourcePerformance: (params = {}) =>
    portalApi.get('/crm/analytics/source-performance', { params }),
  
  getTeamPerformance: (params = {}) =>
    portalApi.get('/crm/analytics/team-performance', { params }),
  
  // ==================== GMAIL INTEGRATION ====================
  
  getGmailStatus: () =>
    portalApi.get('/crm/gmail/status'),
  
  connectGmail: (redirectUri) =>
    portalApi.post('/crm/gmail/connect', { redirectUri }),
  
  disconnectGmail: () =>
    portalApi.post('/crm/gmail/disconnect'),
  
  sendGmailEmail: (prospectId, data) =>
    portalApi.post(`/crm/gmail/prospects/${prospectId}/send`, data),
  
  replyToGmailThread: (prospectId, threadId, data) =>
    portalApi.post(`/crm/gmail/prospects/${prospectId}/threads/${threadId}/reply`, data),

  // ==================== GMAIL INBOX (Full Inbox View) ====================
  
  /**
   * Sync full inbox with classification
   * @param {Object} options - { maxEmails, forceRefresh }
   */
  syncFullInbox: (options = {}) =>
    portalApi.post('/crm/gmail/inbox/sync', {}, { 
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
    portalApi.get('/crm/gmail/inbox', { 
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
    portalApi.get('/crm/gmail/inbox/needs-response', { 
      params: { 
        priority: options.priority,
        limit: options.limit || 20
      } 
    }),
  
  /**
   * Get inbox statistics
   */
  getInboxStats: () =>
    portalApi.get('/crm/gmail/inbox/stats'),

  // ==================== LEAD ASSIGNMENT ====================

  /**
   * Get unassigned leads queue
   * @param {Object} params - { source, min_score, sort_by, sort_order, limit, offset }
   */
  listUnassignedLeads: (params = {}) =>
    portalApi.get('/crm/assignments/unassigned', { params }),

  /**
   * Get count of unassigned leads
   */
  getUnassignedLeadCount: () =>
    portalApi.get('/crm/assignments/unassigned/count'),

  /**
   * Assign a lead to a team member
   * @param {Object} data - { contact_id, assigned_to, assignment_type, reason, notify }
   */
  assignLead: (data) =>
    portalApi.post('/crm/assignments/assign', data),

  /**
   * Bulk assign multiple leads
   * @param {Object} data - { contact_ids, assigned_to, assignment_type, notify }
   */
  bulkAssignLeads: (data) =>
    portalApi.post('/crm/assignments/bulk-assign', data),

  /**
   * Claim an unassigned lead for yourself
   * @param {string} contactId - Contact ID to claim
   */
  claimLead: (contactId) =>
    portalApi.post('/crm/assignments/claim', { contact_id: contactId }),

  /**
   * Get assignment history for a lead
   * @param {string} contactId - Contact ID
   */
  getLeadAssignmentHistory: (contactId) =>
    portalApi.get(`/crm/assignments/history/${contactId}`),

  /**
   * Get team assignment statistics
   */
  getTeamAssignmentStats: () =>
    portalApi.get('/crm/assignments/stats'),

  // ==================== CLIENTS ====================

  /**
   * List clients with health metrics
   * @param {Object} params - { health, search, sortBy, sortOrder, limit, offset }
   */
  listClients: (params = {}) =>
    portalApi.get('/crm/clients', { params }),

  /**
   * Import clients from CSV data
   * @param {Object} data - { clients: [...], skipDuplicates }
   */
  importClients: (data) =>
    portalApi.post('/crm/clients/import', data),

  /**
   * Get org-wide email threads for a contact (cross-user visibility)
   * @param {string} contactId - Contact ID
   * @param {Object} params - { limit, offset, threadId }
   */
  getContactEmails: (contactId, params = {}) =>
    portalApi.get(`/crm/clients/${contactId}/emails`, { params }),
}

// ============================================================================
// Reputation API
// ============================================================================

export const reputationApi = {
  // Platforms
  listPlatforms: (projectId) =>
    portalApi.get(`/reputation/projects/${projectId}/platforms`),
  
  getPlatform: (id) =>
    portalApi.get(`/reputation/platforms/${id}`),
  
  connectPlatform: (projectId, data) =>
    portalApi.post(`/reputation/projects/${projectId}/platforms`, data),

  /** Link unified Google OAuth connection to reputation (after user selects GBP location). */
  linkGoogleConnection: (projectId, connectionId) =>
    portalApi.post(`/reputation/projects/${projectId}/platforms/link-google-connection`, { connectionId }),
  
  updatePlatform: (id, data) =>
    portalApi.put(`/reputation/platforms/${id}`, data),
  
  disconnectPlatform: (id) =>
    portalApi.delete(`/reputation/platforms/${id}`),
  
  syncPlatform: (id) =>
    portalApi.post(`/reputation/platforms/${id}/sync`),
  
  // Reviews
  listReviews: (projectId, params = {}) =>
    portalApi.get(`/reputation/projects/${projectId}/reviews`, { params }),
  
  getReview: (id) =>
    portalApi.get(`/reputation/reviews/${id}`),
  
  respondToReview: (id, data) =>
    portalApi.post(`/reputation/reviews/${id}/respond`, data),
  
  generateResponse: (reviewId) =>
    portalApi.post(`/reputation/reviews/${reviewId}/generate-response`),
  
  approveResponse: (reviewId) =>
    portalApi.post(`/reputation/reviews/${reviewId}/approve-response`),
  
  rejectResponse: (reviewId) =>
    portalApi.post(`/reputation/reviews/${reviewId}/reject-response`),
  
  updateReview: (id, data) =>
    portalApi.put(`/reputation/reviews/${id}`, data),
  
  // Auto-response settings
  getSettings: (projectId) =>
    portalApi.get(`/reputation/projects/${projectId}/settings`),
  
  updateSettings: (projectId, data) =>
    portalApi.put(`/reputation/projects/${projectId}/settings`, data),
  
  // Analytics
  getOverview: (projectId, params = {}) =>
    portalApi.get(`/reputation/projects/${projectId}/overview`, { params }),
  
  getSentimentTrends: (projectId, params = {}) =>
    portalApi.get(`/reputation/projects/${projectId}/sentiment-trends`, { params }),
  
  getTopKeywords: (projectId, params = {}) =>
    portalApi.get(`/reputation/projects/${projectId}/keywords`, { params }),
  
  // Page matching (SEO integration)
  matchReviewsToPages: (projectId) =>
    portalApi.post(`/reputation/projects/${projectId}/match-pages`),

  // Review Removal
  analyzeRemoval: (reviewId) =>
    portalApi.get(`/reputation/reviews/${reviewId}/analyze-removal`),
  
  flagForRemoval: (reviewId, data) =>
    portalApi.post(`/reputation/reviews/${reviewId}/flag-removal`, data),
  
  submitRemoval: (reviewId) =>
    portalApi.post(`/reputation/reviews/${reviewId}/submit-removal`),
  
  escalateRemovalEmail: (reviewId, data = {}) =>
    portalApi.post(`/reputation/reviews/${reviewId}/escalate-email`, data),
  
  updateRemovalStatus: (reviewId, data) =>
    portalApi.put(`/reputation/reviews/${reviewId}/removal-status`, data),
  
  getFlaggedReviews: (projectId) =>
    portalApi.get(`/reputation/projects/${projectId}/flagged-reviews`),
}

// ============================================================================
// Unified Contacts API
// New unified contacts system that consolidates prospects, contacts, and customers
// ============================================================================

export const contactsApi = {
  // List contacts with filters
  list: (params = {}) => 
    portalApi.get('/contacts', { params }),
  
  // List contacts for a specific project
  listByProject: (projectId, params = {}) => 
    portalApi.get(`/projects/${projectId}/contacts`, { params }),
  
  // Get contact summary statistics
  getSummary: (params = {}) => 
    portalApi.get('/contacts/summary', { params }),
  
  // Get single contact by ID
  get: (id) => 
    portalApi.get(`/contacts/${id}`),
  
  // Get contact by email
  getByEmail: (email) => 
    portalApi.get(`/contacts/email/${encodeURIComponent(email)}`),
  
  // Create new contact
  create: (data) => 
    portalApi.post('/contacts', data),
  
  // Create contact for specific project
  createForProject: (projectId, data) => 
    portalApi.post(`/projects/${projectId}/contacts`, data),
  
  // Update contact
  update: (id, data) => 
    portalApi.put(`/contacts/${id}`, data),
  
  // Partial update contact
  patch: (id, data) => 
    portalApi.patch(`/contacts/${id}`, data),
  
  // Delete contact
  delete: (id) => 
    portalApi.delete(`/contacts/${id}`),
  
  // Convert contact type (prospect to client, etc.)
  convert: (id, data) => 
    portalApi.post(`/contacts/${id}/convert`, data),
  
  // Merge two contacts
  merge: (id, mergeWithId, dataPriority = 'primary') => 
    portalApi.post(`/contacts/${id}/merge`, { mergeWithId, dataPriority }),
  
  // Bulk update contacts
  bulkUpdate: (ids, data) => 
    portalApi.post('/contacts/bulk/update', { ids, ...data }),
  
  // Helper to filter by type
  listProspects: (params = {}) => 
    portalApi.get('/contacts', { params: { ...params, types: ['prospect', 'lead'] } }),
  
  listCustomers: (params = {}) => 
    portalApi.get('/contacts', { params: { ...params, types: ['customer'] } }),
  
  listClients: (params = {}) => 
    portalApi.get('/contacts', { params: { ...params, types: ['client'] } }),
  
  listTeam: (params = {}) => 
    portalApi.get('/contacts', { params: { ...params, types: ['team'] } }),
}

// ============================================================================
// Email API
// ============================================================================

export const emailApi = {
  // Settings
  getSettings: () => 
    portalApi.get('/email/settings'),
  
  updateSettings: (data) => 
    portalApi.put('/email/settings', data),
  
  validateApiKey: (apiKey) => 
    portalApi.post('/email/settings/validate', { api_key: apiKey }),
  
  // Campaigns
  listCampaigns: (params = {}) => 
    portalApi.get('/email/campaigns', { params }),
  
  getCampaign: (id) => 
    portalApi.get(`/email/campaigns/${id}`),
  
  createCampaign: (data) => 
    portalApi.post('/email/campaigns', data),
  
  updateCampaign: (id, data) => 
    portalApi.put(`/email/campaigns/${id}`, data),
  
  sendCampaign: (id, data = {}) => 
    portalApi.post(`/email/campaigns/${id}/send`, data),
  
  scheduleCampaign: (id, data) => 
    portalApi.post(`/email/campaigns/${id}/schedule`, data),
  
  // Templates
  listTemplates: (params = {}) => 
    portalApi.get('/email/templates', { params }),
  
  listSystemTemplates: () => 
    portalApi.get('/email/templates', { params: { is_system: true } }),
  
  getTemplate: (id) => 
    portalApi.get(`/email/templates/${id}`),
  
  createTemplate: (data) => 
    portalApi.post('/email/templates', data),
  
  updateTemplate: (id, data) => 
    portalApi.put(`/email/templates/${id}`, data),
  
  // Subscribers
  listSubscribers: (params = {}) => 
    portalApi.get('/email/subscribers', { params }),
  
  createSubscriber: (data) => 
    portalApi.post('/email/subscribers', data),
  
  importSubscribers: (data) => 
    portalApi.post('/email/subscribers/import', data),
  
  // Lists
  listLists: (params = {}) => 
    portalApi.get('/email/lists', { params }),
  
  createList: (data) => 
    portalApi.post('/email/lists', data),
  
  // Automations
  listAutomations: (params = {}) => 
    portalApi.get('/email/automations', { params }),
  
  getAutomation: (id) => 
    portalApi.get(`/email/automations/${id}`),
  
  createAutomation: (data) => 
    portalApi.post('/email/automations', data),
  
  updateAutomation: (id, data) => 
    portalApi.put(`/email/automations/${id}`, data),
  
  // One-off emails
  searchContacts: (query) =>
    portalApi.get('/email/contacts/search', { params: { q: query } }),
  
  sendTest: (data) =>
    portalApi.post('/email/test', data),
  
  composeOneOff: (data) =>
    portalApi.post('/email/compose/one-off', data),
  
  // Newsletter
  validateAudience: (data) =>
    portalApi.post('/email/audience/validate', data),
  
  composeNewsletter: (data) =>
    portalApi.post('/email/compose/newsletter', data),
  
  // System emails
  listSystemEmails: () =>
    portalApi.get('/email/system'),
  
  updateSystemEmail: (emailId, data) =>
    portalApi.put(`/email/system/${emailId}`, data),
  
  deleteSystemEmail: (emailId) =>
    portalApi.delete(`/email/system/${emailId}`),
  
  testSystemEmail: (emailId) =>
    portalApi.post(`/email/system/${emailId}/test`),
  
  // AI email composition (CRM)
  generateAIEmail: (data) =>
    portalApi.post('/crm/ai/email-suggest', data),
  
  // Gmail integration
  sendGmail: (data) =>
    portalApi.post('/email/gmail/send', data),
  
  // Email capability check (for showing warnings)
  checkEmailCapability: (projectId) =>
    portalApi.get(`/email/capability`, { params: { project_id: projectId } }),
  
  // Gmail OAuth
  getGmailAuthUrl: (projectId, returnUrl) =>
    portalApi.get('/email/gmail/auth-url', { params: { project_id: projectId, return_url: returnUrl } }),
  
  getGmailStatus: (projectId) =>
    portalApi.get('/email/gmail/status', { params: { project_id: projectId } }),

  disconnectGmail: (projectId) =>
    portalApi.delete('/email/gmail/disconnect', { params: { project_id: projectId } }),
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
    portalApi.get('/integrations/workspace/google/status').then(r => r.data),

  /**
   * Initiate Google workspace OAuth (Gmail + Calendar + Drive together).
   * Uses popup flow - returns { authUrl }.
   */
  connectGoogle: (returnUrl) =>
    portalApi.post('/integrations/workspace/google/connect', { returnUrl, popupMode: true }).then(r => r.data),

  /**
   * Disconnect Google workspace integration.
   * Removes Gmail, Calendar, and Drive access.
   */
  disconnectGoogle: () =>
    portalApi.post('/integrations/workspace/google/disconnect').then(r => r.data),

  /**
   * Get all workspace integrations for the current user.
   * Returns connections grouped by provider.
   */
  getAll: () =>
    portalApi.get('/integrations/workspace').then(r => r.data),

  /**
   * Sync Google Calendar events now.
   */
  /**
   * Fetch Google Calendar events for a date range.
   */
  getCalendarEvents: (startDate, endDate) =>
    portalApi.get('/integrations/workspace/google/calendar/events', {
      params: { startDate, endDate }
    }).then(r => r.data),

  /**
   * Push a new event to the user's Google Calendar.
   * Returns { googleEventId } on success.
   */
  pushCalendarEvent: (eventData) =>
    portalApi.post('/integrations/workspace/google/calendar/events', eventData).then(r => r.data),

  /**
   * Update an existing Google Calendar event.
   */
  updateCalendarEvent: (eventId, eventData) =>
    portalApi.put(`/integrations/workspace/google/calendar/events/${eventId}`, eventData).then(r => r.data),

  /**
   * Delete a Google Calendar event.
   */
  deleteCalendarEvent: (eventId) =>
    portalApi.delete(`/integrations/workspace/google/calendar/events/${eventId}`).then(r => r.data),

  syncCalendar: () =>
    portalApi.post('/integrations/workspace/google/calendar/sync').then(r => r.data),

  /**
   * Get Google Calendar sync settings for the user.
   */
  getCalendarSettings: () =>
    portalApi.get('/integrations/workspace/google/calendar/settings').then(r => r.data),

  /**
   * Update Google Calendar sync settings.
   * @param {Object} settings - { syncDirection, syncFrequencyMinutes, selectedCalendars }
   */
  updateCalendarSettings: (settings) =>
    portalApi.put('/integrations/workspace/google/calendar/settings', settings).then(r => r.data),
}

// ============================================================================
// Reports/Analytics API
// ============================================================================

export const reportsApi = {
  getDashboard: (params = {}) => 
    portalApi.get('/dashboard', { params }),
  
  getDeadlines: (params = {}) => 
    portalApi.get('/dashboard/deadlines', { params }),
  
  // Lighthouse/Audits
  listAudits: (params = {}) => 
    portalApi.get('/audits', { params }),
  
  getAudit: (id) => 
    portalApi.get(`/audits/${id}`),
  
  requestAudit: (data) => 
    portalApi.post('/audits', data),
  
  deleteAudit: (id) => 
    portalApi.delete(`/audits/${id}`),
  
  getLighthouseReport: (params = {}) => 
    portalApi.get('/audits/lighthouse', { params }),
  
  runLighthouseAudit: (data) => 
    portalApi.post('/audits/lighthouse', data),
  
  // Aliases for use-reports.js hooks
  lighthouse: (projectId) =>
    portalApi.get('/audits/lighthouse', { params: { project_id: projectId } }),
  runAudit: (projectId, params = {}) =>
    portalApi.post('/audits/lighthouse', { projectId, ...params }),
  
  // Rep dashboard
  getRepDashboard: () =>
    portalApi.get('/dashboard/rep'),
  
  // Activity timeline
  getActivity: (params = {}) =>
    portalApi.get('/dashboard/activity', { params }),

  // Aliases for hooks (use-reports.js)
  dashboard: (params = {}) => portalApi.get('/dashboard', { params }),
  activity: (params = {}) => portalApi.get('/dashboard/activity', { params }),
  financial: (params = {}) => portalApi.get('/dashboard', { params }),
  project: (id, params = {}) => portalApi.get(`/analytics/projects/${id}`, { params }),
}

// ============================================================================
// Projects API
// ============================================================================

export const projectsApi = {
  list: (params = {}) => 
    portalApi.get('/projects', { params }),
  
  get: (id) => 
    portalApi.get(`/projects/${id}`),
  
  create: (data) => 
    portalApi.post('/projects', data),
  
  update: (id, data) => 
    portalApi.put(`/projects/${id}`, data),
  
  delete: (id) => 
    portalApi.delete(`/projects/${id}`),
  
  // Members
  listMembers: (projectId) => 
    portalApi.get(`/projects/${projectId}/members`),
  
  addMember: (projectId, data) => 
    portalApi.post(`/projects/${projectId}/members`, data),
  
  removeMember: (projectId, memberId) => 
    portalApi.delete(`/projects/${projectId}/members/${memberId}`),
}

// ============================================================================
// Blog API
// ============================================================================

export const blogApi = {
  listPosts: (params = {}) => 
    portalApi.get('/blog/posts', { params }),
  
  getPost: (id) => 
    portalApi.get(`/blog/posts/${id}`),
  
  createPost: (data) => 
    portalApi.post('/blog/posts', data),
  
  updatePost: (id, data) => 
    portalApi.put(`/blog/posts/${id}`, data),
  
  deletePost: (id) => 
    portalApi.delete(`/blog/posts/${id}`),
  
  publishPost: (id) => 
    portalApi.post(`/blog/posts/${id}/publish`),
  
  unpublishPost: (id) => 
    portalApi.post(`/blog/posts/${id}/unpublish`),
  
  // Categories
  getCategories: (projectId) =>
    portalApi.get(`/blog/categories/${projectId}`),
  
  // AI Generation
  createAI: (data) =>
    portalApi.post('/blog/ai/generate', data),
  
  getAIJobStatus: (jobId) =>
    portalApi.get(`/blog/ai/job/${jobId}/status`),
  
  // Blog Authors (E-E-A-T)
  listAuthors: (projectId, activeOnly = true) =>
    portalApi.get(`/blog/projects/${projectId}/authors`, { params: { activeOnly } }).then(res => res.data),
  
  getAuthor: (authorId) =>
    portalApi.get(`/blog/authors/${authorId}`).then(res => res.data),
  
  getDefaultAuthor: (projectId) =>
    portalApi.get(`/blog/projects/${projectId}/authors/default`).then(res => res.data),
  
  createAuthor: (projectId, data) =>
    portalApi.post(`/blog/projects/${projectId}/authors`, data).then(res => res.data),
  
  updateAuthor: (authorId, data) =>
    portalApi.put(`/blog/authors/${authorId}`, data).then(res => res.data),
  
  deleteAuthor: (authorId) =>
    portalApi.delete(`/blog/authors/${authorId}`),
}

// ============================================================================
// Portfolio API
// ============================================================================

export const portfolioApi = {
  listItems: (params = {}) => 
    portalApi.get('/portfolio', { params }),
  
  getItem: (id) => 
    portalApi.get(`/portfolio/${id}`),
  
  createItem: (data) => 
    portalApi.post('/portfolio', data),
  
  updateItem: (id, data) => 
    portalApi.put(`/portfolio/${id}`, data),
  
  deleteItem: (id) => 
    portalApi.delete(`/portfolio/${id}`),
  
  reorder: (items) => 
    portalApi.put('/portfolio/reorder', { items }),
  
  publishItem: (id) => 
    portalApi.post(`/portfolio/${id}/publish`),
  
  // AI generation
  generateAI: (data) => 
    portalApi.post('/portfolio/ai/generate', data),
}

// ============================================================================
// Admin API
// ============================================================================

export const adminApi = {
  // Organizations/Tenants (Super Admin)
  listOrganizations: () => 
    portalApi.get('/admin/organizations'),
  
  getOrganization: (id) => 
    portalApi.get(`/admin/organizations/${id}`),
  
  createOrganization: (data) => 
    portalApi.post('/admin/organizations', data),
  
  updateOrganization: (id, data) => 
    portalApi.put(`/admin/organizations/${id}`, data),
  
  // Alias for listOrganizations (backward compatibility)
  listTenants: () => 
    portalApi.get('/admin/organizations'),
  
  getTenant: (id) => 
    portalApi.get(`/admin/organizations/${id}`),
  
  createTenant: (data) => 
    portalApi.post('/admin/organizations', data),
  
  updateTenant: (id, data) => 
    portalApi.put(`/admin/organizations/${id}`, data),
  
  checkTenantSlug: (slug) => 
    portalApi.get('/admin/organizations/check-slug', { params: { slug } }),
  
  // Clients
  listClients: (params = {}) => 
    portalApi.get('/admin/clients', { params }),
  
  getClient: (id) => 
    portalApi.get(`/admin/clients/${id}`),
  
  createClient: (data) => 
    portalApi.post('/admin/clients', data),
  
  updateClient: (id, data) => 
    portalApi.put(`/admin/clients/${id}`, data),
  
  // Activity
  getActivityLog: (params = {}) => 
    portalApi.get('/admin/activity', { params }),
  
  // Stats
  getStats: () => 
    portalApi.get('/admin/stats'),
  
  // Team Members
  listTeamMembers: () => 
    portalApi.get('/admin/teams'),
  
  createTeamMember: (data) => 
    portalApi.post('/admin/teams', data),
  
  updateTeamMember: (id, updates) => 
    portalApi.put(`/admin/teams/${id}`, updates),
  
  resendInvite: (id) => 
    portalApi.post(`/admin/teams/${id}/resend-invite`),
  
  // Organization Members
  listOrgMembers: (organizationId) => 
    portalApi.get(`/admin/organizations/${organizationId}/members`),
  
  addOrgMember: (organizationId, data) => 
    portalApi.post(`/admin/organizations/${organizationId}/members`, data),
  
  updateOrgMember: (organizationId, contactId, updates) => 
    portalApi.put(`/admin/organizations/${organizationId}/members/${contactId}`, updates),
  
  resendOrgMemberInvite: (organizationId, contactId) =>
    portalApi.post(`/admin/organizations/${organizationId}/members/${contactId}/resend-invite`),
  
  removeOrgMember: (organizationId, contactId) => 
    portalApi.delete(`/admin/organizations/${organizationId}/members/${contactId}`),
  
  // Organization Roles
  listOrgRoles: (organizationId, scope) => 
    portalApi.get(`/admin/organizations/${organizationId}/roles`, { params: { scope } }),
  
  createOrgRole: (organizationId, body) => 
    portalApi.post(`/admin/organizations/${organizationId}/roles`, body),
  
  updateOrgRole: (organizationId, roleId, body) => 
    portalApi.patch(`/admin/organizations/${organizationId}/roles/${roleId}`, body),
  
  deleteOrgRole: (organizationId, roleId) => 
    portalApi.delete(`/admin/organizations/${organizationId}/roles/${roleId}`),
  
  // Organization Settings (branding, theme, preferences)
  updateOrgSettings: (organizationId, settings) => 
    portalApi.put(`/admin/organizations/${organizationId}/settings`, settings),
  
  // Project Members
  listProjectMembers: (projectId) => 
    portalApi.get(`/admin/projects/${projectId}/members`),
  
  addProjectMember: (projectId, contactId, role) => 
    portalApi.post(`/admin/projects/${projectId}/members`, { contactId, role }),
  
  updateProjectMember: (projectId, contactId, role) => 
    portalApi.put(`/admin/projects/${projectId}/members/${contactId}`, { role }),
  
  removeProjectMember: (projectId, contactId) => 
    portalApi.delete(`/admin/projects/${projectId}/members/${contactId}`),
  
  // Contact assignment (CRM)
  assignContacts: (data) => 
    portalApi.post('/admin/contacts/assign', data),
  
  // User Management (Super Admin)
  listUsers: (params = {}) => 
    portalApi.get('/admin/users', { params }),
  
  getUser: (id) => 
    portalApi.get(`/admin/users/${id}`),
  
  updateUser: (id, data) => 
    portalApi.put(`/admin/users/${id}`, data),
  
  deleteUser: (id) => 
    portalApi.delete(`/admin/users/${id}`),
  
  resendSetupEmail: (userId) => 
    portalApi.post(`/admin/users/${userId}/resend-setup`),
}

// ============================================================================
// Drive API - Google Drive file management (per-user workspace OAuth)
// ============================================================================

export const driveApi = {
  // List files (per-user workspace integration)
  listFiles: (params = {}) => 
    portalApi.get('/integrations/workspace/google/drive/files', { params }),
  
  // Search files
  searchFiles: (query) => 
    portalApi.get('/integrations/workspace/google/drive/files', { params: { query } }),
  
  // Upload file (TODO: implement multipart upload via workspace integration)
  uploadFile: (data) => 
    portalApi.post('/files/drive/upload', data),
  
  // Download file
  downloadFile: (fileId) => 
    portalApi.get(`/integrations/workspace/google/drive/${fileId}/download`),
  
  // Delete file
  deleteFile: (fileId, permanent = false) =>
    portalApi.delete('/integrations/workspace/google/drive', { data: { fileId, permanent } }),

  // Create folder
  createFolder: (name, parentId = null) =>
    portalApi.post('/integrations/workspace/google/drive/folder', { name, parentId }),
}

// ============================================================================
// Ecommerce API - Shopify integration
// ============================================================================

export const ecommerceApi = {
  // Store connection
  getStores: () => 
    portalApi.get('/ecommerce/stores'),
  
  connectStore: (data) => 
    portalApi.post('/ecommerce/stores', data),
  
  disconnectStore: (storeId) => 
    portalApi.delete(`/ecommerce/stores/${storeId}`),
  
  // Products
  listProducts: (params = {}) => 
    portalApi.get('/ecommerce/products', { params }),
  
  getProduct: (productId) => 
    portalApi.get(`/ecommerce/products/${productId}`),
  
  updateProduct: (productId, data) => 
    portalApi.put(`/ecommerce/products/${productId}`, data),
  
  // Product images
  uploadProductImage: (productId, imageData) =>
    portalApi.post(`/ecommerce/products/${productId}/images`, imageData),
  
  deleteProductImage: (productId, imageId) =>
    portalApi.delete(`/ecommerce/products/${productId}/images/${imageId}`),
  
  // Variants
  updateVariant: (variantId, data) => 
    portalApi.put(`/ecommerce/variants/${variantId}`, data),
  
  // Inventory
  updateInventory: (inventoryItemId, data) => 
    portalApi.post('/ecommerce/inventory', { inventoryItemId, ...data }),
  
  adjustInventory: (data) => 
    portalApi.post('/ecommerce/inventory/adjust', data),
  
  // Orders
  listOrders: (params = {}) => 
    portalApi.get('/ecommerce/orders', { params }),
  
  getOrder: (orderId) => 
    portalApi.get(`/ecommerce/orders/${orderId}`),
  
  // Sync
  triggerSync: (syncType) => 
    portalApi.post('/ecommerce/sync', { syncType }),
  
  getSyncStatus: () => 
    portalApi.get('/ecommerce/sync'),
  
  // Tenant sales (for multi-tenant billing)
  listTenantCustomers: (tenantId) =>
    portalApi.get(`/ecommerce/tenants/${tenantId}/customers`),
  
  listTenantInvoices: (tenantId, params = {}) =>
    portalApi.get(`/ecommerce/tenants/${tenantId}/invoices`, { params }),
}

// ============================================================================
// Analytics API - Site analytics, page views, web vitals
// ============================================================================

export const analyticsApi = {
  // Overview
  getOverview: (params = {}) => 
    portalApi.get('/analytics/overview', { params }),
  
  // Page Views
  getPageViews: (params = {}) => 
    portalApi.get('/analytics/page-views', { params }),
  
  // Events
  getEvents: (params = {}) => 
    portalApi.get('/analytics/events', { params }),
  
  // Web Vitals
  getWebVitals: (params = {}) => 
    portalApi.get('/analytics/web-vitals', { params }),
  
  // Sessions
  getSessions: (params = {}) => 
    portalApi.get('/analytics/sessions', { params }),
  
  // Scroll Depth
  getScrollDepth: (params = {}) => 
    portalApi.get('/analytics/scroll-depth', { params }),
  
  // Heatmap
  getHeatmap: (params = {}) => 
    portalApi.get('/analytics/heatmap', { params }),

  // Realtime
  getRealtime: (params = {}) =>
    portalApi.get('/analytics/realtime', { params }),
  
  // ==================== ORG-LEVEL ANALYTICS ====================
  
  /**
   * Get portfolio overview - aggregate analytics across all projects
   * Returns: { totals, projects[], trends }
   */
  getPortfolioOverview: (orgId, params = {}) =>
    portalApi.get(`/analytics/org/${orgId}/portfolio`, { params }),
  
  /**
   * Get project comparison data for org dashboard
   * Returns: { projects[], insights[] }
   */
  getProjectComparison: (orgId, params = {}) =>
    portalApi.get(`/analytics/org/${orgId}/comparison`, { params }),
  
  /**
   * Get org-wide traffic summary
   * Returns: { totalPageViews, totalSessions, topProject, trend }
   */
  getOrgTrafficSummary: (orgId, params = {}) =>
    portalApi.get(`/analytics/org/${orgId}/traffic-summary`, { params }),
  
  /**
   * Get aggregated daily stats for all projects in org
   * Returns: { dailyStats[], totals }
   */
  getOrgDailyStats: (orgId, params = {}) =>
    portalApi.get(`/analytics/org/${orgId}/daily-stats`, { params }),
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
    portalApi.get(`/config/square/${projectId}`).then(res => res.data),
  
  /**
   * Get Square config by invoice token (for public payment pages)
   * Does not require authentication
   */
  getSquareConfigByInvoiceToken: (token) =>
    portalApi.get('/config/square/by-invoice-token', { params: { token } }).then(res => res.data),

  /**
   * Get Square config by proposal ID (for deposit payment pages)
   * Does not require authentication
   */
  getSquareConfigByProposalId: (proposalId) =>
    portalApi.get(`/config/square/by-proposal/${proposalId}`).then(res => res.data),

  // ==============================================
  // SQUARE OAUTH MULTI-MERCHANT
  // ==============================================

  /**
   * Get Square OAuth authorization URL
   * Returns { authUrl } that you should redirect the user to
   */
  getSquareOAuthUrl: (projectId) =>
    portalApi.get(`/config/square/oauth/authorize/${projectId}`).then(res => res.data),

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
    portalApi.delete(`/config/square/oauth/${projectId}`).then(res => res.data),

  /**
   * Get Square connection status for a project
   */
  getSquareStatus: (projectId) =>
    portalApi.get(`/config/square/status/${projectId}`).then(res => res.data),

  /**
   * Get Square locations for connected merchant
   */
  getSquareLocations: (projectId) =>
    portalApi.get(`/config/square/locations/${projectId}`).then(res => res.data),

  /**
   * Set which Square location to use for payments
   */
  setSquareLocation: (projectId, locationId) =>
    portalApi.put(`/config/square/location/${projectId}`, { locationId }).then(res => res.data),

  // ==============================================
  // GENERAL CONFIG
  // ==============================================

  /**
   * Get full tenant config (admin only, sensitive fields masked)
   */
  getTenantConfig: (projectId) =>
    portalApi.get(`/config/${projectId}`).then(res => res.data),

  /**
   * Update Square config for a project
   */
  updateSquareConfig: (projectId, config) =>
    portalApi.put(`/config/${projectId}/square`, config),

  /**
   * Update Email config for a project (fromAddress, fromName, replyTo)
   */
  updateEmailConfig: (projectId, config) =>
    portalApi.put(`/config/${projectId}/email`, config),

  /**
   * Update OpenPhone config for a project
   */
  updateOpenPhoneConfig: (projectId, config) =>
    portalApi.put(`/config/${projectId}/openphone`, config),

  /**
   * Update Shopify config for a project
   */
  updateShopifyConfig: (projectId, config) =>
    portalApi.put(`/config/${projectId}/shopify`, config),

  /**
   * Bulk update tenant config
   */
  updateTenantConfig: (projectId, config) =>
    portalApi.put(`/config/${projectId}`, config),
}

// ============================================================================
// Commerce API - Products, Services, Classes, Events, Sales
// ============================================================================

export const commerceApi = {
  // ==================== OFFERINGS ====================
  
  /** Get all offerings for a project */
  getOfferings: (projectId, params = {}) =>
    portalApi.get(`/commerce/offerings/${projectId}`, { params }),
  
  /** Get a single offering by ID */
  getOffering: (projectId, id) =>
    portalApi.get(`/commerce/offerings/${projectId}/${id}`),
  
  /** Create a new offering */
  createOffering: (projectId, data) =>
    portalApi.post(`/commerce/offerings/${projectId}`, data),
  
  /** Update an offering */
  updateOffering: (projectId, id, data) =>
    portalApi.put(`/commerce/offerings/${projectId}/${id}`, data),
  
  /** Delete an offering */
  deleteOffering: (projectId, id) =>
    portalApi.delete(`/commerce/offerings/${projectId}/${id}`),
  
  // ==================== CATEGORIES ====================
  
  /** Get all categories for a project */
  getCategories: (projectId) =>
    portalApi.get(`/commerce/categories/${projectId}`),
  
  /** Create a category */
  createCategory: (projectId, data) =>
    portalApi.post(`/commerce/categories/${projectId}`, data),
  
  /** Update a category */
  updateCategory: (projectId, id, data) =>
    portalApi.put(`/commerce/categories/${projectId}/${id}`, data),
  
  /** Delete a category */
  deleteCategory: (projectId, id) =>
    portalApi.delete(`/commerce/categories/${projectId}/${id}`),
  
  // ==================== SALES / TRANSACTIONS ====================
  
  /** Get all sales for a project */
  getSales: (projectId, params = {}) =>
    portalApi.get(`/commerce/sales/${projectId}`, { params }),
  
  /** Get a single sale by ID */
  getSale: (projectId, id) =>
    portalApi.get(`/commerce/sales/${projectId}/${id}`),
  
  /** Create a sale (manual entry) */
  createSale: (projectId, data) =>
    portalApi.post(`/commerce/sales/${projectId}`, data),
  
  /** Update a sale */
  updateSale: (projectId, id, data) =>
    portalApi.put(`/commerce/sales/${projectId}/${id}`, data),
  
  /** Get sales stats */
  getSalesStats: (projectId, params = {}) =>
    portalApi.get(`/commerce/sales/${projectId}/stats`, { params }),

  /** Generate shipping label for a sale */
  shipSale: (projectId, saleId, options = {}) =>
    portalApi.post(`/commerce/sales/${projectId}/${saleId}/ship`, options),

  /** Batch ship multiple orders */
  batchShip: (projectId, saleIds) =>
    portalApi.post(`/commerce/sales/${projectId}/ship/batch`, { saleIds }),
  
  // ==================== CUSTOMERS ====================
  
  /** Get all customers for a project */
  getCustomers: (projectId, params = {}) =>
    portalApi.get(`/commerce/customers/${projectId}`, { params }),
  
  /** Get a single customer by ID */
  getCustomer: (projectId, id) =>
    portalApi.get(`/commerce/customers/${projectId}/${id}`),
  
  /** Create a customer */
  createCustomer: (projectId, data) =>
    portalApi.post(`/commerce/customers/${projectId}`, data),
  
  /** Update a customer */
  updateCustomer: (projectId, id, data) =>
    portalApi.put(`/commerce/customers/${projectId}/${id}`, data),
  
  /** Delete a customer */
  deleteCustomer: (projectId, id) =>
    portalApi.delete(`/commerce/customers/${projectId}/${id}`),
  
  // ==================== SETTINGS ====================
  
  /** Get commerce settings for a project */
  getSettings: (projectId) =>
    portalApi.get(`/commerce/settings/${projectId}`),
  
  /** Update commerce settings */
  updateSettings: (projectId, data) =>
    portalApi.put(`/commerce/settings/${projectId}`, data),
  
  // ==================== CONTRACTS ====================
  
  /** Get all contracts for a project */
  getContracts: (projectId, params = {}) =>
    portalApi.get(`/commerce/contracts/${projectId}`, { params }),
  
  /** Get a single contract by ID */
  getContract: (projectId, id) =>
    portalApi.get(`/commerce/contracts/${projectId}/${id}`),
  
  /** Create a new contract */
  createContract: (projectId, data) =>
    portalApi.post(`/commerce/contracts/${projectId}`, data),
  
  /** Update a contract */
  updateContract: (projectId, id, data) =>
    portalApi.put(`/commerce/contracts/${projectId}/${id}`, data),
  
  /** Delete a contract */
  deleteContract: (projectId, id) =>
    portalApi.delete(`/commerce/contracts/${projectId}/${id}`),
  
  /** Send contract via magic link */
  sendContract: (projectId, id) =>
    portalApi.post(`/commerce/contracts/${projectId}/${id}/send`),
  
  /** AI edit contract content */
  aiEditContract: (projectId, id, instruction) =>
    portalApi.post(`/commerce/contracts/${projectId}/${id}/ai/edit`, { instruction }),

  /** Sign contract (public) */
  signContract: (token, signatureData) =>
    portalApi.post(`/commerce/contracts/sign/${token}`, signatureData),
  
  // ==================== SERVICES (for contracts) ====================
  
  /** Get services only (for proposal/contract type selection) */
  getServices: (projectId, params = {}) =>
    portalApi.get(`/commerce/offerings/${projectId}`, { 
      params: { ...params, type: 'service', status: 'active' } 
    }),

  // ==================== SETUP / DISCOVERY ====================

  /** Analyze site pages for commerce discovery (products, services, etc) */
  analyzeSiteForSetup: (projectId) =>
    portalApi.post(`/commerce/setup/analyze-site/${projectId}`),

  /** Generate draft offerings from classified pages */
  generateOfferings: (projectId, pages) =>
    portalApi.post(`/commerce/setup/generate-offerings/${projectId}`, { pages }),

  // ==================== DISCOVERIES ====================

  /** Get pending page discoveries for import */
  getDiscoveries: (projectId, params = {}) =>
    portalApi.get(`/commerce/discoveries/${projectId}`, { params }),

  /** Update discovery status (dismiss, skip) */
  updateDiscoveryStatus: (discoveryId, status) =>
    portalApi.put(`/commerce/discoveries/${discoveryId}/status`, { status }),

  /** Import a single discovery as a draft offering */
  importDiscovery: (discoveryId) =>
    portalApi.post(`/commerce/discoveries/${discoveryId}/import`),

  /** Bulk import multiple discoveries */
  bulkImportDiscoveries: (projectId, discoveryIds) =>
    portalApi.post(`/commerce/discoveries/${projectId}/bulk-import`, { discovery_ids: discoveryIds }),
}

// ============================================================================
// Sync API - Calendar, Booking & Scheduling
// ============================================================================

export const syncApi = {
  // ==================== ADMIN: BOOKING TYPES ====================
  
  /** Get booking types for org (pass project_id to scope to project) */
  getBookingTypes: (params = {}) =>
    portalApi.get('/sync/admin/types', { params }),
  
  /** Create a booking type */
  createBookingType: (data) =>
    portalApi.post('/sync/admin/types', data),
  
  /** Update a booking type */
  updateBookingType: (id, data) =>
    portalApi.put(`/sync/admin/types/${id}`, data),
  
  /** Delete a booking type */
  deleteBookingType: (id) =>
    portalApi.delete(`/sync/admin/types/${id}`),
  
  // ==================== ADMIN: HOSTS ====================
  
  /** Get hosts for org (pass project_id to scope to project) */
  getHosts: (params = {}) =>
    portalApi.get('/sync/admin/hosts', { params }),
  
  /** Create a host */
  createHost: (data) =>
    portalApi.post('/sync/admin/hosts', data),
  
  /** Update a host */
  updateHost: (id, data) =>
    portalApi.put(`/sync/admin/hosts/${id}`, data),
  
  /** Delete a host (pass project_id to scope: only deletes if host belongs to that project) */
  deleteHost: (id, params = {}) =>
    portalApi.delete(`/sync/admin/hosts/${id}`, { params }),
  
  /** Assign host to booking type */
  assignHostToType: (hostId, typeId, priority = 1) =>
    portalApi.post(`/sync/admin/hosts/${hostId}/booking-types/${typeId}?priority=${priority}`),
  
  // ==================== ADMIN: BOOKING ROUTES ====================
  
  /** Get routes for a booking type */
  getBookingTypeRoutes: (typeId) =>
    portalApi.get(`/sync/admin/types/${typeId}/routes`),
  
  /** Create a booking route */
  createBookingRoute: (data) =>
    portalApi.post('/sync/admin/routes', data),
  
  /** Update a booking route */
  updateBookingRoute: (id, data) =>
    portalApi.put(`/sync/admin/routes/${id}`, data),
  
  /** Delete a booking route */
  deleteBookingRoute: (id) =>
    portalApi.delete(`/sync/admin/routes/${id}`),
  
  // ==================== ADMIN: AVAILABILITY ====================
  
  /** Get host availability rules */
  getHostAvailability: (hostId) =>
    portalApi.get(`/sync/admin/hosts/${hostId}/availability`),
  
  /** Update host availability rules */
  updateHostAvailability: (hostId, data) =>
    portalApi.put(`/sync/admin/hosts/${hostId}/availability`, data),
  
  /** Create availability exception (PTO, holiday, etc) */
  createException: (data) =>
    portalApi.post('/sync/admin/exceptions', data),
  
  /** Delete an exception */
  deleteException: (id) =>
    portalApi.delete(`/sync/admin/exceptions/${id}`),
  
  /** Get all exceptions (org-wide) */
  getExceptions: (params = {}) =>
    portalApi.get('/sync/admin/exceptions', { params }),
  
  /** Update an exception */
  updateException: (id, data) =>
    portalApi.put(`/sync/admin/exceptions/${id}`, data),
  /** List bookings with filters */
  getBookings: (params = {}) =>
    portalApi.get('/sync/admin/bookings', { params }),
  
  /** Get single booking */
  getBooking: (id) =>
    portalApi.get(`/sync/admin/bookings/${id}`),
  
  /** Update a booking (notes, tags, etc) */
  updateBooking: (id, data) =>
    portalApi.put(`/sync/admin/bookings/${id}`, data),
  
  /** Cancel a booking (admin) */
  cancelBooking: (id, reason) =>
    portalApi.post(`/sync/admin/bookings/${id}/cancel`, { reason }),
  
  // ==================== PUBLIC: BOOKING FLOW ====================
  
  /** Get public booking types for an org */
  getPublicBookingTypes: (orgSlug) =>
    portalApi.get(`/sync/public/${orgSlug}/types`),
  
  /** Get availability for a booking type */
  getAvailability: (orgSlug, typeSlug, date, timezone) =>
    portalApi.get(`/sync/public/${orgSlug}/availability/${typeSlug}`, {
      params: { date, timezone }
    }),
  
  /** Create a slot hold */
  createHold: (data) =>
    portalApi.post('/sync/public/hold', data),
  
  /** Release a slot hold */
  releaseHold: (id) =>
    portalApi.delete(`/sync/public/hold/${id}`),
  
  /** Create a booking */
  createBooking: (data) =>
    portalApi.post('/sync/public/booking', data),

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
    return portalApi.get('/sync/admin/unified-tasks', { params })
  },
  
  /**
   * Get Signal autonomous activity (What Signal Did feed)
   * Returns completed actions from last 24h
   */
  getSignalActivity: (limit = 50) =>
    portalApi.get('/sync/admin/signal-activity', { params: { limit } }),
  
  /**
   * Get calendar items for a date range
   * Includes synced tasks, bookings, and events
   */
  getCalendarItems: (startDate, endDate, projectId) =>
    portalApi.get('/sync/admin/calendar-items', { 
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
    portalApi.post('/sync/admin/tasks', data),

  // ==================== TEAM VIEW - Manager & Admin Features ====================
  
  /**
   * Get current user's role permissions and available view modes
   * Returns: permissions, available_views (personal, team, overview)
   */
  getUserPermissions: () =>
    portalApi.get('/sync/admin/user-permissions'),
  
  /**
   * Get team members the user can manage (lower hierarchy level)
   * Requires can_assign_tasks permission
   */
  getTeamMembers: (projectId) =>
    portalApi.get('/sync/admin/team-members', {
      params: projectId ? { project_id: projectId } : {}
    }),
  
  /**
   * Get tasks for team members (manager view)
   * Returns tasks grouped by team member with capacity info
   * Requires can_assign_tasks permission
   */
  getTeamTasks: (projectId, assigneeId) =>
    portalApi.get('/sync/admin/team-tasks', {
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
    portalApi.get('/sync/admin/org-overview'),
  
  /**
   * Get team capacity for workload balancing
   * Returns capacity percentage and workload per team member
   * Requires can_assign_tasks permission
   */
  getTeamCapacity: () =>
    portalApi.get('/sync/admin/team-capacity'),

  // ==================== PLAYBOOKS - Growth Task Templates ====================
  
  /**
   * Get all playbooks (org + system templates)
   * Returns playbooks with step counts and usage stats
   */
  getPlaybooks: () =>
    portalApi.get('/sync/admin/playbooks'),
  
  /**
   * Get a single playbook with all steps
   */
  getPlaybook: (id) =>
    portalApi.get(`/sync/admin/playbooks/${id}`),
  
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
    portalApi.post('/sync/admin/playbooks', data),
  
  /**
   * Update a playbook
   */
  updatePlaybook: (id, data) =>
    portalApi.put(`/sync/admin/playbooks/${id}`, data),
  
  /**
   * Delete a playbook (cannot delete system playbooks)
   */
  deletePlaybook: (id) =>
    portalApi.delete(`/sync/admin/playbooks/${id}`),
  
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
    portalApi.post(`/sync/admin/playbooks/${id}/apply`, data),
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
    portalApi.get('/seo/location-pages/locations', { params: { project_id: projectId } }).then(res => res.data),
  
  /**
   * Get a single location with full context
   */
  getLocation: (locationId) =>
    portalApi.get(`/seo/location-pages/locations/${locationId}`).then(res => res.data),
  
  /**
   * Create a new location
   */
  createLocation: (data) =>
    portalApi.post('/seo/location-pages/locations', data).then(res => res.data),
  
  /**
   * Update location context (landmarks, court info, etc.)
   */
  updateLocationContext: (locationId, context) =>
    portalApi.put(`/seo/location-pages/locations/${locationId}/context`, context).then(res => res.data),
  
  // ==================== LANDMARK DISCOVERY ====================
  
  /**
   * Discover landmarks for a location using Places API
   */
  discoverLandmarks: (locationId, categories) =>
    portalApi.post(`/seo/location-pages/locations/${locationId}/discover-landmarks`, { categories }).then(res => res.data),
  
  /**
   * Discover courthouses for a location (law firms)
   */
  discoverCourthouses: (locationId) =>
    portalApi.post(`/seo/location-pages/locations/${locationId}/discover-courthouses`).then(res => res.data),
  
  // ==================== SERVICE LOCATIONS ====================
  
  /**
   * Get all service locations for a location
   */
  getServiceLocations: (locationId) =>
    portalApi.get(`/seo/location-pages/locations/${locationId}/services`).then(res => res.data),
  
  /**
   * Create or update a service location
   */
  upsertServiceLocation: (locationId, data) =>
    portalApi.post(`/seo/location-pages/locations/${locationId}/services`, data).then(res => res.data),
  
  // ==================== CASE OUTCOMES ====================
  
  /**
   * Get case outcomes for a location
   */
  getCaseOutcomes: ({ projectId, county, serviceSlug, limit }) =>
    portalApi.get('/seo/location-pages/case-outcomes', {
      params: { project_id: projectId, county, service_slug: serviceSlug, limit }
    }).then(res => res.data),
  
  // ==================== PAGE GENERATION ====================
  
  /**
   * Generate a single location page using Signal AI
   */
  generateLocationPage: (data) =>
    portalApi.post('/seo/location-pages/generate', data).then(res => res.data),
  
  /**
   * Bulk generate location pages
   */
  bulkGenerateLocationPages: (data) =>
    portalApi.post('/seo/location-pages/generate/bulk', data).then(res => res.data),
  
  /**
   * Build context rails for a location page (preview without generating)
   */
  buildContextRails: (data) =>
    portalApi.post('/seo/location-pages/context-rails', data).then(res => res.data),
  
  // ==================== LOCATION PAGES CRUD ====================
  
  /**
   * Get all generated location pages for a project
   */
  getLocationPages: ({ projectId, status, locationId }) =>
    portalApi.get('/seo/location-pages/pages', {
      params: { project_id: projectId, status, location_id: locationId }
    }).then(res => res.data),
  
  /**
   * Update location page status
   */
  updatePageStatus: (pageId, status) =>
    portalApi.put(`/seo/location-pages/pages/${pageId}/status`, { status }).then(res => res.data),
  
  /**
   * Publish location page to client site
   */
  publishToSite: (pageId, projectId) =>
    portalApi.post(`/seo/location-pages/pages/${pageId}/publish`, null, {
      params: { project_id: projectId }
    }).then(res => res.data),
  
  // ==================== CENSUS DEMOGRAPHICS ====================
  
  /**
   * Get all counties in a state
   * @param {string} state - State abbreviation (e.g., 'KY', 'OH')
   */
  getCountiesInState: (state) =>
    portalApi.get(`/seo/location-pages/census/states/${state}/counties`).then(res => res.data),
  
  /**
   * Get county boundaries (GeoJSON) for a state
   * @param {string} state - State abbreviation
   */
  getCountyBoundaries: (state) =>
    portalApi.get(`/seo/location-pages/census/states/${state}/boundaries`).then(res => res.data),
  
  /**
   * Get demographics for a specific county
   * @param {string} state - State abbreviation
   * @param {string} countyFips - County FIPS code (3 digits)
   */
  getCountyDemographics: (state, countyFips) =>
    portalApi.get(`/seo/location-pages/census/states/${state}/counties/${countyFips}/demographics`).then(res => res.data),
  
  /**
   * Get bulk demographics for multiple counties
   * @param {Object} data - { counties: [{ state: 'KY', county_fips: '037' }, ...] }
   */
  getBulkDemographics: (data) =>
    portalApi.post('/seo/location-pages/census/demographics/bulk', data).then(res => res.data),
  
  /**
   * Get counties within a radius of a point
   * @param {Object} params - { lat, lng, radius_miles }
   */
  getCountiesNearby: (params) =>
    portalApi.get('/seo/location-pages/census/nearby', { params }).then(res => res.data),
  
  /**
   * Get adjacent counties
   * @param {string} state - State abbreviation
   * @param {string} countyFips - County FIPS code
   */
  getAdjacentCounties: (state, countyFips) =>
    portalApi.get(`/seo/location-pages/census/states/${state}/counties/${countyFips}/adjacent`).then(res => res.data),
  
  /**
   * Find a county by name
   * @param {string} state - State abbreviation
   * @param {string} name - County name to search for
   */
  findCountyByName: (state, name) =>
    portalApi.get(`/seo/location-pages/census/states/${state}/find-county`, { params: { name } }).then(res => res.data),
  
  /**
   * Discover demographics for a location and store in context
   * @param {string} locationId - Location UUID
   */
  discoverDemographics: (locationId) =>
    portalApi.post(`/seo/location-pages/locations/${locationId}/discover-demographics`).then(res => res.data),
  
  // ==================== HERO IMAGE GENERATION ====================
  
  /**
   * Generate an AI hero image for a location page
   * @param {string} locationId - Location UUID
   * @param {Object} data - { service_slug, service_name, style?, aspect_ratio? }
   */
  generateHeroImage: (locationId, data) =>
    portalApi.post(`/seo/location-pages/locations/${locationId}/generate-hero-image`, data).then(res => res.data),
  
  /**
   * Get all generated images for a location
   * @param {string} locationId - Location UUID
   */
  getLocationImages: (locationId) =>
    portalApi.get(`/seo/location-pages/locations/${locationId}/images`).then(res => res.data),
  
  /**
   * Delete a generated image
   * @param {string} imageId - Image UUID
   */
  deleteImage: (imageId) =>
    portalApi.delete(`/seo/location-pages/images/${imageId}`).then(res => res.data),
  
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
    portalApi.post(`/seo/location-pages/locations/${locationId}/generate-schema`, data).then(res => res.data),
  
  /**
   * Get stored schema for a location page
   * @param {string} locationId - Location UUID
   * @param {string} serviceSlug - Service identifier
   */
  getSchema: (locationId, serviceSlug) =>
    portalApi.get(`/seo/location-pages/locations/${locationId}/schema/${serviceSlug}`).then(res => res.data),
  
  /**
   * Validate a JSON-LD schema
   * @param {Object} schema - Schema to validate
   */
  validateSchema: (schema) =>
    portalApi.post('/seo/location-pages/schema/validate', schema).then(res => res.data),
  
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
    portalApi.post(`/seo/location-pages/locations/${locationId}/submit-for-indexing`, data).then(res => res.data),
  
  /**
   * Submit multiple location page URLs for Google indexing
   * @param {Object} data - Bulk indexing request
   * @param {string} data.project_id - Project UUID
   * @param {string[]} data.urls - URLs to submit
   * @param {string} [data.type] - 'URL_UPDATED' or 'URL_DELETED'
   */
  bulkSubmitForIndexing: (data) =>
    portalApi.post('/seo/location-pages/bulk-submit-for-indexing', data).then(res => res.data),
  
  /**
   * Get remaining indexing quota for today
   * @param {string} projectId - Project UUID
   */
  getIndexingQuota: (projectId) =>
    portalApi.get('/seo/location-pages/indexing-quota', { params: { project_id: projectId } }).then(res => res.data),
  
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
    portalApi.post(`/seo/location-pages/locations/${locationId}/analyze-competitors`, data).then(res => res.data),
  
  /**
   * Get stored competitor analysis for a location
   * @param {string} locationId - Location UUID
   * @param {string} service - Service name
   */
  getCompetitorAnalysis: (locationId, service) =>
    portalApi.get(`/seo/location-pages/locations/${locationId}/competitor-analysis`, { params: { service } }).then(res => res.data),
  
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
    portalApi.post('/seo/location-pages/conversions/track', data).then(res => res.data),
  
  /**
   * Get ROI summary for a location
   * @param {string} locationId - Location UUID
   * @param {string} [period] - '7d' | '30d' | '90d' | '1y'
   */
  getLocationROI: (locationId, period = '30d') =>
    portalApi.get(`/seo/location-pages/locations/${locationId}/roi`, { params: { period } }).then(res => res.data),
  
  /**
   * Get project-wide ROI dashboard
   * @param {string} projectId - Project UUID
   * @param {string} [period] - '7d' | '30d' | '90d' | '1y'
   */
  getProjectROIDashboard: (projectId, period = '30d') =>
    portalApi.get('/seo/location-pages/roi-dashboard', { params: { project_id: projectId, period } }).then(res => res.data),
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
    portalApi.get('/trends/feed', { params }).then(res => res.data),
  
  /**
   * Get daily trends for a specific date
   * @param {Object} params - Query params
   * @param {string} params.geo - Geo code (e.g., 'US')
   * @param {string} params.date - Date in YYYY-MM-DD format
   * @param {number} [params.category_id] - Google Trends category ID
   */
  getDaily: (params) =>
    portalApi.get('/trends/daily', { params }).then(res => res.data),
  
  /**
   * Get a single trend signal by ID
   * @param {string} id - Trend signal ID
   */
  getSignal: (id) =>
    portalApi.get(`/trends/${id}`).then(res => res.data),
  
  /**
   * Trigger trending topics fetch (admin only)
   * @param {Object} data - { geo, category_id }
   */
  triggerTrending: (data) =>
    portalApi.post('/trends/jobs/trending', data).then(res => res.data),
  
  /**
   * Trigger daily trends fetch (admin only)
   * @param {Object} data - { geo, date, category_id }
   */
  triggerDaily: (data) =>
    portalApi.post('/trends/jobs/daily', data).then(res => res.data),
  
  /**
   * Trigger stale trends cleanup (admin only)
   * @param {Object} data - { max_age_hours }
   */
  triggerPurge: (data) =>
    portalApi.post('/trends/jobs/purge-stale', data).then(res => res.data),
}

// ============================================================================
// Default Export
// ============================================================================

export default portalApi
