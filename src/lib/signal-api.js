/**
 * Signal API Client
 * 
 * Direct connection to the Signal AI API for:
 * - Echo chat (SSE streaming)
 * - AI skills (SEO analysis, proposal generation, etc.)
 * - Knowledge base queries
 * - Any AI-powered features
 * 
 * For local dev:
 * - Frontend runs on :8888 (netlify dev) or :5173 (vite)
 * - Signal API runs on :3001
 * - Portal API runs on :3002
 * 
 * ARCHITECTURE NOTE:
 * - Signal API = AI brain (Echo, skills, knowledge, learning)
 * - Portal API = Business operations (CRUD, billing, files, etc.)
 * - Frontend calls Signal directly for AI features (speed + SSE streaming)
 * - Portal API can call Signal internally for AI-enhanced business logic
 */
import axios from 'axios'
import { supabase } from './supabase-auth'
import useAuthStore from './auth-store'

// Signal API URL - AI brain for Echo, skills, knowledge
const SIGNAL_API_URL = import.meta.env.VITE_SIGNAL_API_URL || 'https://signal.uptrademedia.com'

// Signal API Key for service-to-service auth (local dev)
const SIGNAL_API_KEY = import.meta.env.VITE_SIGNAL_API_KEY || ''

// Helper to get Signal API URL (used by SSE connections)
export function getSignalApiUrl() {
  return SIGNAL_API_URL
}

// Helper to get Signal API Key (for SSE connections)
export function getSignalApiKey() {
  return SIGNAL_API_KEY
}

// Create axios instance for Signal API (non-streaming requests)
const signalApi = axios.create({
  baseURL: SIGNAL_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    ...(SIGNAL_API_KEY && { 'X-API-Key': SIGNAL_API_KEY })
  }
})

// Add request interceptor to attach Supabase session token
signalApi.interceptors.request.use(
  async (config) => {
    console.log('[Signal API Request]', config.method?.toUpperCase(), config.url)
    
    // Get Supabase session and add to Authorization header
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    // Get auth state for organization/project context headers
    const state = useAuthStore.getState()
    
    // Add organization/project context headers
    if (state.currentOrg?.id) {
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
    console.error('[Signal API Request Error]', error)
    return Promise.reject(error)
  }
)

// Track Signal API connectivity to suppress repeated connection errors
let _signalApiDown = false
let _signalApiDownLoggedAt = 0

// Add response interceptor for error handling
signalApi.interceptors.response.use(
  (response) => {
    // Signal API is reachable again
    if (_signalApiDown) {
      _signalApiDown = false
      console.log('[Signal API] Connection restored')
    }
    return response
  },
  async (error) => {
    // Suppress connection-refused noise -- log once per minute max
    const isConnectionError = error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || !error.response
    if (isConnectionError) {
      const now = Date.now()
      if (!_signalApiDown || now - _signalApiDownLoggedAt > 60000) {
        console.warn('[Signal API] Unreachable — AI features will be unavailable')
        _signalApiDownLoggedAt = now
      }
      _signalApiDown = true
      return Promise.reject(error)
    }

    console.error('[Signal API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    })
    
    // Handle 401 - session expired
    if (error.response?.status === 401) {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (!session || refreshError) {
        console.log('[Signal API] Session expired')
        // Don't redirect - let the app handle it
      }
    }
    
    return Promise.reject(error)
  }
)

/**
 * Check if Signal API is currently reachable.
 * Components can use this to skip API calls when Signal is down.
 */
export function isSignalApiAvailable() {
  return !_signalApiDown
}

// ============================================================================
// Helper: Get auth headers for fetch/SSE requests
// ============================================================================

async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  }
  
  // Add Signal API key for service auth (if configured)
  if (SIGNAL_API_KEY) {
    headers['X-API-Key'] = SIGNAL_API_KEY
  }
  
  // Get Supabase session token
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  // Get org/project context
  const state = useAuthStore.getState()
  
  if (state.currentOrg?.id) {
    headers['X-Organization-Id'] = state.currentOrg.id
  }
  
  if (state.currentProject?.id) {
    headers['X-Project-Id'] = state.currentProject.id
    if (state.currentProject.org_id) {
      headers['X-Tenant-Org-Id'] = state.currentProject.org_id
    }
  }
  
  return headers
}

// ============================================================================
// Echo API - AI Chat (SSE Streaming)
// ============================================================================

export const echoApi = {
  /**
   * Stream a chat response from Echo via SSE
   * @param {Object} params - Chat parameters
   * @param {string} params.message - User's message
   * @param {string} params.conversationId - Optional conversation ID to continue
   * @param {string} params.skill - Optional skill to use (bypasses router)
   * @param {Object} callbacks - SSE event callbacks
   * @param {Function} callbacks.onToken - Called for each streamed token
   * @param {Function} callbacks.onComplete - Called when stream completes
   * @param {Function} callbacks.onError - Called on error
   * @param {Function} callbacks.onToolCall - Called when a tool is invoked
   * @returns {Promise<void>}
   */
  streamChat: async (params, { onToken, onComplete, onError, onToolCall }) => {
    const headers = await getAuthHeaders()
    
    try {
      const response = await fetch(`${SIGNAL_API_URL}/echo/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: params.message,
          conversationId: params.conversationId,
          skill: params.skill,
          pageContext: params.pageContext, // Pass page context for Echo awareness
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let conversationId = params.conversationId
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process SSE events (data: {...}\n\n format)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              onComplete?.({ response: fullContent, conversationId })
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              
              switch (parsed.type) {
                case 'token':
                  fullContent += parsed.content || ''
                  onToken?.(parsed.content)
                  break
                  
                case 'tool_call':
                  onToolCall?.(parsed)
                  break
                  
                case 'metadata':
                  conversationId = parsed.conversationId || conversationId
                  break
                  
                case 'error':
                  onError?.(parsed.error)
                  return
                  
                default:
                  // Handle raw content chunks
                  if (parsed.content) {
                    fullContent += parsed.content
                    onToken?.(parsed.content)
                  }
              }
            } catch (parseError) {
              // If not JSON, treat as raw token
              if (data && data !== '') {
                fullContent += data
                onToken?.(data)
              }
            }
          }
        }
      }
      
      // Stream ended without [DONE]
      onComplete?.({ response: fullContent, conversationId })
      
    } catch (error) {
      console.error('[Echo Stream Error]', error)
      onError?.(error.message)
    }
  },
  
  /**
   * Send a message to Echo (non-streaming, for simple requests)
   * Use streamChat for better UX in most cases
   */
  chat: async (params) => {
    const response = await signalApi.post('/echo/chat', {
      message: params.message,
      conversationId: params.conversationId,
      skill: params.skill,
    })
    return response.data.data
  },
  
  /**
   * Send a message to a specific skill (bypasses router)
   */
  moduleChat: async (skill, params) => {
    const response = await signalApi.post(`/echo/module/${skill}`, {
      message: params.message,
      conversationId: params.conversationId,
    })
    return response.data.data
  },
  
  /**
   * List user's Echo conversations
   */
  listConversations: async (params = {}) => {
    const response = await signalApi.get('/echo/conversations', { params })
    return response.data.data
  },
  
  /**
   * Get a specific conversation with messages
   */
  getConversation: async (conversationId) => {
    const response = await signalApi.get(`/echo/conversation/${conversationId}`)
    return response.data.data
  },
  
  /**
   * Rate an Echo response (for learning)
   */
  rateResponse: async (params) => {
    const response = await signalApi.post('/echo/rate', {
      messageId: params.messageId,
      conversationId: params.conversationId,
      rating: params.rating,
      feedbackType: params.feedbackType,
      correction: params.correction,
      issueCategory: params.issueCategory,
    })
    return response.data.data
  },
  
  /**
   * Close/end a conversation
   */
  closeConversation: async (conversationId, reason) => {
    const response = await signalApi.put(`/echo/conversation/${conversationId}/close`, { reason })
    return response.data.data
  },
  
  /**
   * Get conversation summary
   */
  getConversationSummary: async (conversationId) => {
    const response = await signalApi.get(`/echo/conversation/${conversationId}/summary`)
    return response.data.data
  },
  
  /**
   * Invoke a skill tool directly (programmatic access)
   */
  invokeTool: async (params) => {
    const response = await signalApi.post('/echo/tool-invoke', {
      skill: params.skill,
      tool: params.tool,
      params: params.params,
      conversationId: params.conversationId,
      tenantId: params.tenantId,
    })
    return response.data.data
  },
}

// ============================================================================
// Skills API - Direct skill invocation
// ============================================================================

export const skillsApi = {
  /**
   * List available skills
   */
  listSkills: async () => {
    const response = await signalApi.get('/skills')
    return response.data.data
  },
  
  /**
   * Get skill definition
   */
  getSkill: async (skillKey) => {
    const response = await signalApi.get(`/skills/${skillKey}`)
    return response.data.data
  },
  
  /**
   * Invoke a skill tool (POST /skills/tools/:skill/:tool so fixed routes like
   * /skills/seo/blog-ideas are not shadowed by the generic param route)
   */
  invoke: async (skillKey, tool, params) => {
    const response = await signalApi.post(`/skills/tools/${skillKey}/${tool}`, params)
    return response.data.data
  },
}

// ============================================================================
// Knowledge API - RAG and knowledge base
// ============================================================================

export const knowledgeApi = {
  /**
   * Search knowledge base
   */
  search: async (query, params = {}) => {
    const response = await signalApi.post('/knowledge/search', { query, ...params })
    return response.data.data
  },
  
  /**
   * List knowledge chunks
   */
  list: async (params = {}) => {
    const response = await signalApi.get('/knowledge', { params })
    return response.data.data
  },
  
  /**
   * Add knowledge chunk
   */
  add: async (data) => {
    const response = await signalApi.post('/knowledge', data)
    return response.data.data
  },
  
  /**
   * Sync knowledge from website
   */
  sync: async (params) => {
    const response = await signalApi.post('/knowledge/sync', params)
    return response.data.data
  },
}

// ============================================================================
// FAQs API
// ============================================================================

export const faqsApi = {
  list: async (params = {}) => {
    const response = await signalApi.get('/faqs', { params })
    return response.data.data
  },
  
  create: async (data) => {
    const response = await signalApi.post('/faqs', data)
    return response.data.data
  },
  
  update: async (id, data) => {
    const response = await signalApi.put(`/faqs/${id}`, data)
    return response.data.data
  },
  
  delete: async (id) => {
    const response = await signalApi.delete(`/faqs/${id}`)
    return response.data.data
  },
  
  generate: async (params) => {
    const response = await signalApi.post('/faqs/generate', params)
    return response.data.data
  },
  
  /**
   * Get FAQ generation job status
   */
  getJobStatus: async (jobId) => {
    const response = await signalApi.get(`/faqs/jobs/${jobId}`)
    return response.data.data
  },
  
  approve: async (id) => {
    const response = await signalApi.post(`/faqs/${id}/approve`)
    return response.data.data
  },
}

// ============================================================================
// Profile API - Client profile extraction
// ============================================================================

export const profileApi = {
  /**
   * Extract profile from website content
   */
  extract: async (params) => {
    const response = await signalApi.post('/profile/extract', params)
    return response.data.data
  },
  
  /**
   * Sync profile with SEO knowledge base
   */
  sync: async (params) => {
    const response = await signalApi.post('/profile/sync', params)
    return response.data.data
  },
  
  /**
   * Get current profile
   */
  get: async (params = {}) => {
    const response = await signalApi.get('/profile', { params })
    return response.data.data
  },
}

// ============================================================================
// Config API - Signal configuration management
// ============================================================================

export const configApi = {
  /**
   * Get Signal config for a project
   */
  get: async (projectId) => {
    const response = await signalApi.get('/config', { params: { projectId } })
    return response.data.data
  },
  
  /**
   * Initialize Signal config (wizard step)
   */
  init: async (projectId) => {
    const response = await signalApi.put('/config', { 
      action: 'init',
      projectId
    })
    return response.data.data
  },
  
  /**
   * Update Signal config
   */
  update: async (config, projectId) => {
    const response = await signalApi.put('/config', { config, projectId })
    return response.data.data
  },
}

// ============================================================================
// Setup API - Signal setup and training
// ============================================================================

export const setupApi = {
  /**
   * Get setup status for a project
   */
  getStatus: async (projectId) => {
    const response = await signalApi.get('/setup/status', { params: { projectId } })
    return response.data
  },
  
  /**
   * Run auto-setup (extract profile, sync knowledge, generate FAQs)
   */
  autoSetup: async (projectId) => {
    const response = await signalApi.post('/setup/auto', { projectId })
    return response.data
  },
}

// ============================================================================
// Engage AI API (Signal-powered engagement analysis)
// ============================================================================

export const engageAiApi = {
  /**
   * Analyze A/B tests with Signal AI
   */
  analyzeTests: async (params = {}) => {
    const response = await signalApi.post('/skills/engage/analyze-tests', params)
    return response.data.data
  },
  
  /**
   * Analyze engagement metrics with Signal AI
   */
  analyzeEngagement: async (params = {}) => {
    const response = await signalApi.post('/skills/engage/analyze', params)
    return response.data.data
  },
  
  /**
   * Design element via Echo conversation
   */
  designElement: async (params) => {
    const response = await signalApi.post('/echo/chat', {
      message: params.message,
      context: {
        mode: 'designer',
        projectId: params.projectId
      }
    })
    return response.data.data || response.data
  },
}

// ============================================================================
// Forms AI API (Signal-powered form design)
// ============================================================================

export const formsAiApi = {
  /**
   * Get AI-suggested form fields based on form purpose
   */
  suggestFields: async (params) => {
    const response = await signalApi.post('/skills/forms/suggest-fields', {
      formPurpose: params.formPurpose,
      formType: params.formType,
      targetAudience: params.targetAudience,
      conversationHistory: params.conversationHistory,
      existingFields: params.existingFields,
    })
    return response.data
  },
  
  /**
   * Continue form design conversation
   */
  continueDesign: async (params) => {
    const response = await signalApi.post('/skills/forms/continue-design', {
      message: params.message,
      conversationHistory: params.conversationHistory,
      currentFields: params.currentFields,
      formType: params.formType,
    })
    return response.data
  },
  
  /**
   * Optimize form for conversions
   */
  optimizeForm: async (params) => {
    const response = await signalApi.post('/skills/forms/optimize', {
      fields: params.fields,
      formType: params.formType,
      conversionRate: params.conversionRate,
      abandonmentPoints: params.abandonmentPoints,
    })
    return response.data
  },
  
  /**
   * Stream form design conversation via Echo
   * Opens a mini-conversation for form design
   */
  streamDesign: async (params, { onToken, onComplete, onError }) => {
    const headers = await getAuthHeaders()
    
    try {
      const response = await fetch(`${SIGNAL_API_URL}/echo/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: params.message,
          conversationId: params.conversationId,
          skill: 'forms', // Route to forms skill
          pageContext: {
            pageType: 'form-builder',
            formType: params.formType,
            existingFields: params.existingFields,
          },
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              onComplete?.({ response: fullContent })
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'token' && parsed.content) {
                fullContent += parsed.content
                onToken?.(parsed.content)
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
      
      onComplete?.({ response: fullContent })
    } catch (error) {
      console.error('[Forms AI Stream Error]', error)
      onError?.(error)
    }
  },
}

// ============================================================================
// SEO AI API (Signal-powered SEO AI features)
// ============================================================================
// 
// These call the Signal API's SEO skill endpoints.
// All endpoints use POST with projectId in the request body.
// API pattern: POST /skills/seo/{action} with { projectId, ...params }
//

export const signalSeoApi = {
  // AI Brain - Training & Knowledge
  // POST /skills/seo/train
  trainSite: async (projectId) => {
    const response = await signalApi.post('/skills/seo/train', { projectId })
    return response.data.data
  },
  
  // POST /skills/seo/brain (no knowledge endpoint - use brain with quick analysis)
  getProjectKnowledge: async (projectId) => {
    const response = await signalApi.post('/skills/seo/brain', { 
      projectId,
      analysisType: 'quick'
    })
    return response.data.data
  },
  
  // POST /skills/seo/brain
  runAiBrain: async (projectId, options = {}) => {
    const response = await signalApi.post('/skills/seo/brain', { 
      projectId,
      ...options 
    })
    return response.data.data
  },
  
  // Signal AI - Learning & Auto-Fixes (via quick-wins endpoint)
  // POST /skills/seo/quick-wins
  getSignalLearning: async (projectId, params = {}) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      ...params 
    })
    return response.data.data
  },
  
  // No direct auto-fix endpoint - returns suggestions only
  applySignalAutoFixes: async (projectId, fixes) => {
    console.warn('applySignalAutoFixes: Signal API returns suggestions, apply via Portal API')
    return { applied: false, message: 'Use Portal API to apply fixes' }
  },
  
  // POST /skills/seo/quick-wins for page suggestions
  getSignalSuggestions: async (projectId, pageUrl, params = {}) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      pageUrl,
      ...params 
    })
    return response.data.data
  },
  
  // AI Recommendations via quick-wins
  // POST /skills/seo/quick-wins
  getAiRecommendations: async (projectId, params = {}) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      ...params 
    })
    return response.data.data
  },
  
  // Recommendations are managed via Portal API, not Signal
  applyRecommendation: async (projectId, recommendationId) => {
    console.warn('applyRecommendation: Use Portal API seoApi.applyRecommendation()')
    return { applied: false, message: 'Use Portal API seoApi methods' }
  },
  
  applyRecommendations: async (projectId, recommendationIds) => {
    console.warn('applyRecommendations: Use Portal API seoApi.applyRecommendations()')
    return { applied: false, message: 'Use Portal API seoApi methods' }
  },
  
  dismissRecommendation: async (projectId, recommendationId) => {
    console.warn('dismissRecommendation: Use Portal API seoApi.dismissRecommendation()')
    return { applied: false, message: 'Use Portal API seoApi methods' }
  },
  
  // AI Page Analysis
  // POST /skills/seo/analyze-page
  analyzePageWithAi: async (projectId, url, options = {}) => {
    const response = await signalApi.post('/skills/seo/analyze-page', { 
      projectId,
      url,
      ...options 
    })
    return response.data.data
  },
  
  // AI Content Brief Generation
  // POST /skills/seo/content-brief
  generateContentBrief: async (projectId, data) => {
    const response = await signalApi.post('/skills/seo/content-brief', { 
      projectId,
      targetKeyword: data.targetKeyword || data.keyword,
      contentType: data.contentType
    })
    return response.data.data
  },
  
  // Blog AI Brain
  // POST /skills/seo/blog-ideas
  trainBlogAiBrain: async (projectId, options = {}) => {
    // No separate training - blog-ideas returns fresh ideas
    const response = await signalApi.post('/skills/seo/blog-ideas', { 
      projectId,
      ...options 
    })
    return response.data.data
  },
  
  // POST /skills/seo/blog-ideas
  getBlogAiSuggestions: async (projectId, params = {}) => {
    const response = await signalApi.post('/skills/seo/blog-ideas', { 
      projectId,
      topic: params.topic,
      count: params.count
    })
    return response.data.data
  },
  
  // Competitor Analysis (AI-powered)
  // POST /skills/seo/competitor-analysis
  analyzeCompetitorWithAi: async (projectId, competitorUrl) => {
    const response = await signalApi.post('/skills/seo/competitor-analysis', { 
      projectId,
      competitorUrl 
    })
    return response.data.data
  },
  
  // GSC AI Suggestions - use quick-wins which analyzes GSC data
  generateGscFixSuggestions: async (projectId) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      focusAreas: ['gsc', 'search-console']
    })
    return response.data.data
  },
  
  // Additional Signal API endpoints
  
  // POST /skills/seo/keyword-recommendations
  getKeywordRecommendations: async (projectId, pageUrl = null) => {
    const response = await signalApi.post('/skills/seo/keyword-recommendations', { 
      projectId,
      pageUrl 
    })
    return response.data.data
  },
  
  // POST /skills/seo/technical-audit
  runTechnicalAudit: async (projectId) => {
    const response = await signalApi.post('/skills/seo/technical-audit', { projectId })
    return response.data.data
  },
  
  // POST /skills/seo/schema
  generateSchema: async (projectId, pageUrl, schemaType) => {
    const response = await signalApi.post('/skills/seo/schema', { 
      projectId,
      pageUrl,
      schemaType 
    })
    return response.data.data
  },

  // ============================================================================
  // UNIFIED PAGE OPTIMIZATION
  // ============================================================================

  /**
   * Optimize a page with full context - generates alt text, metadata, schema, and LLM schema together.
   * This is the recommended way to optimize a page as Signal has all context simultaneously.
   * 
   * @param projectId - Project ID
   * @param pageIdOrPath - Page ID (UUID) or page path (e.g., '/services/seo')
   * @param options - Optimization options
   * @param options.optimize_alt - Generate optimized alt text for images (default: true)
   * @param options.optimize_meta - Generate optimized title/meta description (default: true)
   * @param options.optimize_schema - Generate JSON-LD schema (default: true)
   * @param options.optimize_llm - Generate LLM-optimized content blocks (default: true)
   * @param options.target_keywords - Optional focus keywords
   * @param options.force_regenerate - Skip cache and regenerate (default: false)
   * @param options.analyze_content - Include content analysis (default: true)
   * @param apply - Apply changes to database immediately (default: false)
   */
  optimizePage: async (projectId, pageIdOrPath, options = {}, apply = false) => {
    const response = await signalApi.post('/skills/seo/optimize-page', {
      projectId,
      ...(pageIdOrPath.includes('-') && pageIdOrPath.length === 36 
        ? { pageId: pageIdOrPath } 
        : { pagePath: pageIdOrPath }),
      options: {
        optimize_alt: options.optimize_alt ?? true,
        optimize_meta: options.optimize_meta ?? true,
        optimize_schema: options.optimize_schema ?? true,
        optimize_llm: options.optimize_llm ?? true,
        analyze_content: options.analyze_content ?? true,
        target_keywords: options.target_keywords || [],
        force_regenerate: options.force_regenerate ?? false,
      },
      apply,
    })
    return response.data.data
  },

  /**
   * Analyze page content for SEO insights
   * Extracts topics, entities, keywords and provides recommendations
   * 
   * @param projectId - Project UUID
   * @param pageIdOrPath - Page UUID or path (e.g., '/about-us')
   * @param options - Analysis options
   * @param options.extract_topics - Extract main topics/themes (default: true)
   * @param options.extract_entities - Named entity recognition (default: true)
   * @param options.extract_keywords - Important keywords (default: true)
   * @param options.analyze_depth - Content comprehensiveness (default: true)
   * @param options.analyze_readability - Reading level (default: true)
   * @param options.compare_to_competitors - Competitive analysis (default: false)
   * @param options.target_keywords - Optional focus keywords
   * 
   * @returns Analysis result with topics, entities, keywords, scores, recommendations
   */
  analyzeContent: async (projectId, pageIdOrPath, options = {}) => {
    const response = await signalApi.post('/skills/seo/analyze-content', {
      projectId,
      ...(pageIdOrPath.includes('-') && pageIdOrPath.length === 36 
        ? { pageId: pageIdOrPath } 
        : { pagePath: pageIdOrPath }),
      options: {
        extract_topics: options.extract_topics ?? true,
        extract_entities: options.extract_entities ?? true,
        extract_keywords: options.extract_keywords ?? true,
        analyze_depth: options.analyze_depth ?? true,
        analyze_readability: options.analyze_readability ?? true,
        compare_to_competitors: options.compare_to_competitors ?? false,
        target_keywords: options.target_keywords || [],
      },
    })
    return response.data.data
  },

  // ============================================================================
  // SEO PIPELINE (Ashbound-style 8-phase optimization)
  // ============================================================================

  /**
   * Run the full SEO optimization pipeline (Ashbound architecture).
   * This is the comprehensive, world-state-aware optimization that:
   * 1. Loads full site world state (pages, keywords, GSC, images, competitors)
   * 2. Runs pre-optimization checks
   * 3. AI opportunity analysis
   * 4. Generates optimizations (metadata, schema, FAQs, alt text, internal links)
   * 5. Validates content
   * 6. Repair loop if needed (max 3 iterations)
   * 7. Predicts ranking impact
   * 8. Applies changes to database
   * 
   * @param projectId - Project UUID
   * @param pageIdOrPath - Page UUID or path (e.g., '/services/seo')
   * @param options - Pipeline options
   * @param options.siteId - Optional site ID
   * @param options.skipPhases - Optional array of phase IDs to skip
   * @param options.maxRepairLoops - Max repair iterations (default: 3)
   * @returns Pipeline run state with all phase results
   */
  runPipeline: async (projectId, pageIdOrPath, options = {}) => {
    const response = await signalApi.post('/skills/seo/pipeline/run', {
      projectId,
      siteId: options.siteId,
      pageIdOrPath,
      options: {
        skipPhases: options.skipPhases || [],
        maxRepairLoops: options.maxRepairLoops ?? 3,
      },
    })
    return { runId: response.data.runId, state: response.data.state }
  },

  /**
   * Get the current state of a pipeline run.
   * Use this to poll for progress during long-running pipeline executions.
   * 
   * @param runId - Pipeline run UUID
   * @returns Pipeline run state with phase results
   */
  getPipelineRunState: async (runId) => {
    const response = await signalApi.get(`/skills/seo/pipeline/run/${runId}`)
    return response.data
  },
  
  // POST /skills/seo/topic-clusters
  generateTopicClusters: async (projectId, seedKeyword = null) => {
    const response = await signalApi.post('/skills/seo/topic-clusters', { 
      projectId,
      seedKeyword 
    })
    return response.data.data
  },
  
  // POST /skills/seo/internal-links
  analyzeInternalLinks: async (projectId, pageUrl = null) => {
    const response = await signalApi.post('/skills/seo/internal-links', { 
      projectId,
      pageUrl 
    })
    return response.data.data
  },
  
  // POST /skills/seo/serp-analyze
  analyzeSerpForKeyword: async (projectId, keyword) => {
    const response = await signalApi.post('/skills/seo/serp-analyze', { 
      projectId,
      keyword 
    })
    return response.data.data
  },

  // POST /skills/seo/local-seo
  analyzeLocalSeo: async (projectId) => {
    const response = await signalApi.post('/skills/seo/local-seo', { 
      projectId 
    })
    return response.data.data
  },

  // POST /skills/seo/suggest-faqs
  // Generate AI-powered FAQ suggestions for a page
  suggestFAQs: async (projectId, pageUrl, options = {}) => {
    const response = await signalApi.post('/skills/seo/suggest-faqs', { 
      projectId,
      pageUrl,
      count: options.count || 5,
      existingFaqs: options.existingFaqs || [],
    })
    return response.data.data
  },

  // ============================================================================
  // RANKING PREDICTIONS (ML-based)
  // ============================================================================

  /**
   * Get ML-based ranking prediction for a change
   * Uses Signal's RankingPredictionService
   */
  predictRankingImpact: async (projectId, params) => {
    const response = await signalApi.post('/skills/seo/predict-ranking', {
      projectId,
      changeType: params.changeType,
      oldValue: params.oldValue,
      newValue: params.newValue,
      pageUrl: params.pageUrl,
      targetKeyword: params.targetKeyword,
      currentMetrics: params.currentMetrics,
    })
    return response.data.data
  },

  /**
   * Get prediction accuracy stats for the project
   * Shows how accurate past predictions have been
   */
  getPredictionAccuracy: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/prediction-accuracy/${projectId}`)
    return response.data.data
  },

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  /**
   * Create a new metadata A/B test
   * testData: { path, field: 'title'|'description', variant_a, variant_b, traffic_split? }
   */
  createABTest: async (projectId, testData) => {
    const response = await signalApi.post('/skills/seo/ab-test/create', {
      project_id: projectId,
      path: testData.path,
      field: testData.field || 'title',
      variant_a: testData.variant_a,
      variant_b: testData.variant_b,
      traffic_split: testData.traffic_split,
    })
    return response.data?.data ?? response.data
  },

  /**
   * Get all A/B tests for a project
   */
  getABTests: async (projectId, status) => {
    const params = status && status !== 'all' ? { status } : {}
    const response = await signalApi.get(`/skills/seo/ab-tests/${projectId}`, { params })
    return response.data?.data ?? response.data
  },

  /**
   * Get A/B test details and results
   */
  getABTestDetails: async (testId) => {
    const response = await signalApi.get(`/skills/seo/ab-test/${testId}`)
    return response.data?.data ?? response.data
  },

  /**
   * Pause an active A/B test
   */
  pauseABTest: async (testId) => {
    const response = await signalApi.patch(`/skills/seo/ab-test/${testId}/pause`)
    return response.data?.data ?? response.data
  },

  /**
   * Resume a paused A/B test
   */
  resumeABTest: async (testId) => {
    const response = await signalApi.patch(`/skills/seo/ab-test/${testId}/resume`)
    return response.data?.data ?? response.data
  },

  /**
   * Apply winning variant from A/B test. variantId is 'a' or 'b'
   */
  applyABTestWinner: async (testId, variantId) => {
    const response = await signalApi.post(`/skills/seo/ab-test/${testId}/apply-winner`, {
      winner: variantId === 'a' || variantId === 'b' ? variantId : 'a',
    })
    return response.data?.data ?? response.data
  },

  /**
   * Generate A/B test variant suggestions using AI
   */
  generateABVariants: async (projectId, pageUrl, currentTitle, currentDescription) => {
    const response = await signalApi.post('/skills/seo/ab-test/generate-variants', {
      projectId,
      pageUrl,
      currentTitle,
      currentDescription,
    })
    return response.data.data
  },

  // ============================================================================
  // COMPETITOR MONITORING
  // ============================================================================

  /**
   * Get competitor monitor summary (competitors + latest analysis)
   */
  getCompetitorMonitoring: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/competitor-monitor/${projectId}`)
    return response.data?.data ?? response.data
  },

  /**
   * Get competitor changes (from analysis / alerts)
   */
  getCompetitorChanges: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/competitor-changes/${projectId}`)
    return response.data?.data ?? response.data
  },

  /**
   * Trigger a fresh SERP snapshot for a keyword
   */
  refreshSerpSnapshot: async (projectId, keyword) => {
    const response = await signalApi.post('/skills/seo/serp-snapshot', {
      projectId,
      keyword,
    })
    return response.data?.data ?? response.data
  },

  /**
   * Generate counter-strategy for competitor change
   */
  generateCounterStrategy: async (projectId, changeData) => {
    const response = await signalApi.post('/skills/seo/counter-strategy', {
      projectId,
      ...changeData,
    })
    return response.data?.data ?? response.data
  },

  // ============================================================================
  // E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
  // ============================================================================

  /**
   * Get E-E-A-T analysis rows for a project
   */
  getEEATAnalysis: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/eeat/${projectId}`)
    return response.data?.data ?? response.data
  },

  /**
   * Analyze content for E-E-A-T and store result
   * body: { projectId, pageId?, content?, contentType? }
   */
  analyzeContentEEAT: async (projectId, body = {}) => {
    const response = await signalApi.post('/skills/seo/eeat/analyze-content', {
      projectId,
      pageId: body.pageId,
      content: body.content,
      contentUrl: body.contentUrl,
      contentType: body.contentType || 'page',
    })
    return response.data?.data ?? response.data
  },

  /**
   * Suggest author attribution for content/topic
   */
  suggestAuthor: async (projectId, topic, existingAuthors = []) => {
    const response = await signalApi.post('/skills/seo/eeat/suggest-author', {
      projectId,
      content: topic,
      topic,
      existingAuthors,
    })
    return response.data?.data ?? response.data
  },

  /**
   * Generate Person/author JSON-LD schema
   */
  generateAuthorSchema: async (projectId, authorData) => {
    const response = await signalApi.post('/skills/seo/eeat/author-schema', {
      projectId,
      authorName: authorData.name,
      authorUrl: authorData.url,
      ...authorData,
    })
    return response.data?.data ?? response.data
  },

  /**
   * Suggest authoritative citations for content/claims
   */
  suggestCitations: async (projectId, content, claims) => {
    const response = await signalApi.post('/skills/seo/eeat/suggest-citations', {
      projectId,
      content,
      claims: claims || [],
    })
    return response.data?.data ?? response.data
  },

  /**
   * Generate blog post with E-E-A-T enhancements
   */
  generateBlogWithEEAT: async (projectId, params) => {
    const response = await signalApi.post('/skills/seo/eeat/generate-blog', {
      projectId,
      topic: params.topic,
      targetKeyword: params.targetKeyword,
      authorId: params.authorId,
      includeFAQ: params.includeFAQ ?? params.includeFaqs ?? true,
      citationLevel: params.citationLevel ?? 'standard',
    })
    return response.data.data
  },

  // ============================================================================
  // BLOG PIPELINE (Ashbound-inspired phased generation)
  // ============================================================================

  /**
   * Generate a blog post using the new phased pipeline
   * Returns complete blog with TOC, FAQs, schemas, and quality score
   */
  generateBlogPipeline: async (projectId, params, options = {}) => {
    const response = await signalApi.post('/skills/seo/blog/pipeline/generate', {
      projectId,
      topic: params.topic,
      targetKeyword: params.targetKeyword || params.target_keyword,
      contentType: params.contentType || params.content_type || 'how_to_guide',
      authorId: params.authorId || params.author_id,
      wordCountTarget: params.targetWordCount || params.wordCountTarget || params.word_count_target || 2000,
      tone: params.tone,
      categoryId: params.categoryId || params.category_id,
      publishImmediately: params.publishImmediately ?? false,
    }, {
      timeout: options.timeout || 300000, // 5 minute timeout for full pipeline with citation fetching
    })
    return response.data.data || response.data
  },

  /**
   * Plan a blog post without generating (for preview/approval)
   * Returns outline, section plans, suggested content
   */
  planBlogPipeline: async (projectId, params) => {
    const response = await signalApi.post('/skills/seo/blog/pipeline/plan', {
      projectId,
      topic: params.topic,
      targetKeyword: params.targetKeyword || params.target_keyword,
      contentType: params.contentType || params.content_type || 'how_to_guide',
      authorId: params.authorId || params.author_id,
      wordCountTarget: params.targetWordCount || params.wordCountTarget || params.word_count_target || 2000,
      tone: params.tone,
      categoryId: params.categoryId || params.category_id,
    })
    return response.data.data || response.data
  },

  /**
   * Generate blog from an existing plan (after approval)
   */
  generateBlogFromPlan: async (projectId, planId) => {
    const response = await signalApi.post('/skills/seo/blog/pipeline/generate-from-plan', {
      projectId,
      planId,
    }, {
      timeout: 120000,
    })
    return response.data.data || response.data
  },

  // ============================================================================
  // SIGNAL LEARNING & INSIGHTS
  // ============================================================================

  /**
   * Get learning insights and patterns
   */
  getLearningInsights: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/learning/${projectId}`)
    return response.data.data
  },

  /**
   * Analyze prediction accuracy and generate learnings
   */
  analyzeLearnings: async (projectId) => {
    const response = await signalApi.post('/skills/seo/learning/analyze', {
      projectId,
    })
    return response.data.data
  },

  /**
   * Get model adjustment recommendations
   */
  getModelAdjustments: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/learning/adjustments/${projectId}`)
    return response.data.data
  },

  // ============================================================================
  // REDIRECTS (Signal-powered)
  // ============================================================================

  /**
   * Suggest redirects for 404 errors
   */
  suggest404Redirects: async (projectId) => {
    const response = await signalApi.post('/skills/seo/redirects/suggest-404-fixes', {
      projectId,
    })
    return response.data.data
  },

  /**
   * Analyze redirect chains
   */
  analyzeRedirectChains: async (projectId) => {
    const response = await signalApi.get(`/skills/seo/redirects/chains/${projectId}`)
    return response.data.data
  },
}

// ============================================================================
// INSIGHTS API - Proactive Insights & Traffic Analysis
// ============================================================================

const insightsApi = {
  /**
   * Get insight history for a project
   * @param {string} projectId 
   * @param {Object} options - { limit: number }
   */
  getHistory: async (projectId, options = {}) => {
    const response = await signalApi.get(`/insights/${projectId}/history`, {
      params: { limit: options.limit || 20 },
    })
    return response.data
  },

  /**
   * Get traffic anomaly alerts for a project
   * @param {string} projectId 
   * @param {Object} options - { limit: number, days: number }
   */
  getTrafficAlerts: async (projectId, options = {}) => {
    const response = await signalApi.get(`/insights/${projectId}/traffic-alerts`, {
      params: { 
        limit: options.limit || 10,
        days: options.days || 30,
      },
    })
    return response.data
  },

  /**
   * Run on-demand traffic analysis with root cause diagnosis
   * @param {string} projectId 
   */
  analyzeTraffic: async (projectId) => {
    const response = await signalApi.post(`/insights/${projectId}/analyze-traffic`)
    return response.data
  },

  /**
   * Trigger a briefing for a project
   * @param {string} projectId 
   */
  triggerBriefing: async (projectId) => {
    const response = await signalApi.post(`/insights/${projectId}/briefing`)
    return response.data
  },
}

// ============================================================================
// CRM AI API - Prospect Insights & Automation (Requires Signal)
// ============================================================================

export const crmAiApi = {
  // ==================== LEAD SCORING & PRIORITIZATION ====================

  /**
   * Score a lead with AI analysis
   * @param {string} prospectId - Prospect ID to score
   * @returns {Promise<Object>} Lead score with factors, risks, and recommendations
   */
  scoreLead: async (prospectId) => {
    const response = await signalApi.post('/skills/crm/score-lead', { prospectId })
    return response.data
  },

  /**
   * Get AI-prioritized list of contacts needing follow-up
   * @param {number} capacity - Max number of contacts to return
   * @param {string} [projectId] - Optional project ID to scope results
   * @returns {Promise<Object>} Prioritized contacts with reasons and suggested actions
   */
  prioritizeFollowups: async (capacity = 10, projectId = null) => {
    const payload = { capacity }
    if (projectId) payload.projectId = projectId
    const response = await signalApi.post('/skills/crm/prioritize-followups', payload)
    return response.data
  },

  /**
   * Suggest next best action for a prospect
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} Suggested action with talking points and timing
   */
  suggestNextAction: async (prospectId) => {
    const response = await signalApi.post('/skills/crm/suggest-next-action', { prospectId })
    return response.data
  },

  // ==================== PIPELINE ANALYSIS ====================

  /**
   * Analyze sales pipeline health
   * @param {string} stage - Optional stage filter
   * @returns {Promise<Object>} Pipeline health, at-risk deals, and recommendations
   */
  analyzePipeline: async (stage) => {
    const response = await signalApi.post('/skills/crm/analyze-pipeline', { stage })
    return response.data
  },

  /**
   * Predict deal close probability
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} Close probability with factors and improvement actions
   */
  predictClose: async (prospectId) => {
    const response = await signalApi.post(`/skills/crm/predict-close/${prospectId}`)
    return response.data
  },

  // ==================== EMAIL INTELLIGENCE ====================

  /**
   * Analyze an email thread for insights
   * @param {string} prospectId - Prospect ID
   * @param {string} threadId - Gmail thread ID
   * @param {Array} messages - Email messages in the thread
   * @returns {Promise<Object>} Thread analysis with sentiment, topics, action items
   */
  analyzeEmailThread: async (prospectId, threadId, messages) => {
    const response = await signalApi.post('/skills/crm/email/analyze-thread', {
      prospectId,
      threadId,
      messages,
    })
    return response.data
  },

  /**
   * Generate smart reply suggestions for an email
   * @param {string} prospectId - Prospect ID
   * @param {string} threadId - Gmail thread ID
   * @param {Object} lastMessage - The email to reply to
   * @param {Object} options - Reply options (tone, senderName, previousMessages)
   * @returns {Promise<Object>} Reply suggestions with different tones
   */
  generateReplySuggestions: async (prospectId, threadId, lastMessage, options = {}) => {
    const response = await signalApi.post('/skills/crm/email/suggest-replies', {
      prospectId,
      threadId,
      lastMessage,
      ...options,
    })
    return response.data
  },

  /**
   * Get cached email insights for a prospect
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} All email insights for the prospect
   */
  getEmailInsights: async (prospectId) => {
    const response = await signalApi.get(`/skills/crm/email/insights/${prospectId}`)
    return response.data
  },

  // ==================== EMAIL DRAFTING ====================

  /**
   * Draft a personalized email for a prospect
   * @param {string} prospectId - Prospect ID
   * @param {string} purpose - Email purpose/goal
   * @param {Object} options - Options (tone, senderName)
   * @returns {Promise<Object>} Draft email with subject, body, and CTA
   */
  draftEmail: async (prospectId, purpose, options = {}) => {
    const response = await signalApi.post('/skills/crm/draft-email', {
      prospectId,
      purpose,
      ...options,
    })
    return response.data
  },

  // ==================== DASHBOARD ====================

  /**
   * Get AI insights for CRM dashboard
   * @param {number} limit - Max items per category
   * @returns {Promise<Object>} Dashboard insights including priority actions and trends
   */
  getDashboardInsights: async (limit = 5) => {
    const response = await signalApi.get('/skills/crm/dashboard-insights', { params: { limit } })
    return response.data
  },

  // ==================== EMAIL REPLY DRAFT GENERATION ====================

  /**
   * Generate a draft reply to an email using Signal AI
   * Draft is for approval only - never auto-sends
   * 
   * @param {Object} params - Draft generation parameters
   * @param {string} params.emailId - Email cache ID
   * @param {Object} params.threadContext - Email context (subject, from, body, classification, etc.)
   * @param {Object} params.businessContext - Business context (orgName, userName, replyTone)
   * @param {string} params.additionalInstructions - Optional custom instructions
   * @returns {Promise<Object>} Draft with subject, body, suggestions, tone, confidence
   */
  generateReplyDraft: async (params) => {
    const response = await signalApi.post('/email/draft/generate', params)
    return response.data
  },

  /**
   * Get an existing draft for an email
   * @param {string} emailId - Email cache ID
   * @returns {Promise<Object|null>} Draft or null if none exists
   */
  getDraft: async (emailId) => {
    const response = await signalApi.get(`/email/draft/${emailId}`)
    return response.data
  },

  /**
   * Approve a draft (mark as ready to send)
   * User can optionally provide edited body
   * @param {string} draftId - Draft ID
   * @param {string} editedBody - Optional edited body text
   * @returns {Promise<Object>} Success status
   */
  approveDraft: async (draftId, editedBody) => {
    const response = await signalApi.post(`/email/draft/${draftId}/approve`, { editedBody })
    return response.data
  },

  /**
   * Reject a draft
   * @param {string} draftId - Draft ID
   * @param {string} reason - Optional rejection reason
   * @returns {Promise<Object>} Success status
   */
  rejectDraft: async (draftId, reason) => {
    const response = await signalApi.post(`/email/draft/${draftId}/reject`, { reason })
    return response.data
  },
}

// ============================================================================
// Budget API - Token Budget & Usage Management
// ============================================================================

// ============================================================================
// Sync API - AI-Powered Calendar & Planning (Requires Signal)
// ============================================================================

export const syncApi = {
  /**
   * Get calendar overview with availability
   * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
   * @returns {Promise<Object>} Calendar overview with events, availability, and AI insights
   */
  getCalendar: async (date) => {
    const params = date ? { date } : {}
    const response = await signalApi.get('/sync/calendar', { params })
    return response.data
  },

  /**
   * Get AI-powered meeting preparation
   * @param {string} eventId - Calendar event ID to prepare for
   * @param {Object} options - Optional prep options
   * @returns {Promise<Object>} Meeting prep with attendee context, talking points, insights
   */
  getMeetingPrep: async (eventId, options = {}) => {
    const response = await signalApi.post('/sync/meeting-prep', { eventId, ...options })
    return response.data
  },

  /**
   * Get AI-generated daily briefing
   * @param {Object} options - Optional briefing options
   * @returns {Promise<Object>} Daily briefing with priorities, prep notes, recommendations
   */
  getDailyBriefing: async (options = {}) => {
    const response = await signalApi.post('/sync/daily-briefing', options)
    return response.data
  },

  /**
   * Get focus time recommendations
   * @param {Object} options - Optional focus options
   * @returns {Promise<Object>} Focus time recommendations and available slots
   */
  getFocusTime: async (options = {}) => {
    const response = await signalApi.post('/sync/focus-time', options)
    return response.data
  },

  /**
   * AI-powered task scheduling
   * @param {Object} task - Task to schedule
   * @param {string} task.title - Task title
   * @param {number} task.estimatedMinutes - Estimated duration
   * @param {string} task.priority - Priority level
   * @param {string} task.deadline - Optional deadline
   * @returns {Promise<Object>} Scheduling recommendation with time slot and reasoning
   */
  scheduleTask: async (task) => {
    const response = await signalApi.post('/sync/schedule-task', task)
    return response.data
  },

  /**
   * Block focus time on calendar
   * @param {Object} slot - Time slot to block
   * @param {string} slot.start - Start time ISO string
   * @param {string} slot.end - End time ISO string
   * @param {string} slot.title - Block title
   * @returns {Promise<Object>} Created calendar block
   */
  blockFocusTime: async (slot) => {
    const response = await signalApi.post('/sync/focus-time/block', slot)
    return response.data
  },
}

// ============================================================================
// Budget API - Token Budget & Usage Management
// ============================================================================

export const budgetApi = {
  /**
   * Get budget status for an organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Budget status including isWithinBudget, tokensUsed, etc.
   */
  getOrgBudget: async (orgId) => {
    const response = await signalApi.get(`/budget/org/${orgId}`)
    return response.data
  },

  /**
   * Get detailed usage summary for an organization
   * @param {string} orgId - Organization ID
   * @param {number} days - Number of days to include (default 30)
   * @returns {Promise<Object>} Usage summary with breakdown by tier, method, project
   */
  getOrgUsage: async (orgId, days = 30) => {
    const response = await signalApi.get(`/budget/org/${orgId}/usage`, { params: { days } })
    return response.data
  },

  /**
   * Update budget configuration for an organization
   * @param {string} orgId - Organization ID
   * @param {Object} config - Budget configuration
   * @param {number|null} config.budgetTokens - Token limit (null = unlimited)
   * @param {number} config.alertThreshold - Alert threshold percentage (0-100)
   * @param {string} config.period - Budget period: 'monthly', 'weekly', 'daily'
   * @param {boolean} config.isRateLimited - Whether to enforce rate limiting
   * @returns {Promise<Object>} Updated budget status
   */
  updateOrgBudget: async (orgId, config) => {
    const response = await signalApi.post(`/budget/org/${orgId}`, config)
    return response.data
  },

  /**
   * Get usage summary for a specific project
   * @param {string} projectId - Project ID
   * @param {number} days - Number of days to include (default 30)
   * @returns {Promise<Object>} Project usage summary
   */
  getProjectUsage: async (projectId, days = 30) => {
    const response = await signalApi.get(`/budget/project/${projectId}`, { params: { days } })
    return response.data
  },

  /**
   * Get daily usage history for a project
   * @param {string} projectId - Project ID
   * @param {number} days - Number of days (default 30)
   * @returns {Promise<Object>} Daily usage history for charts
   */
  getProjectHistory: async (projectId, days = 30) => {
    const response = await signalApi.get(`/budget/project/${projectId}/history`, { params: { days } })
    return response.data
  },

  /**
   * Quick check if org can make AI calls
   * @param {string} orgId - Organization ID
   * @returns {Promise<boolean>} Whether the org can proceed with AI calls
   */
  canMakeCall: async (orgId) => {
    const response = await signalApi.get(`/budget/check/${orgId}`)
    return response.data.canProceed
  },

  // ==========================================================================
  // SIGNAL SETUP & MANAGEMENT
  // ==========================================================================

  /**
   * Enable Signal and start autonomous setup
   * @param {string} projectId - Project ID
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Setup progress
   */
  enableSignal: async (projectId, orgId) => {
    const response = await signalApi.post('/setup/enable', { project_id: projectId, org_id: orgId })
    return response.data
  },

  /**
   * Get setup progress for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Setup progress
   */
  getSetupProgress: async (projectId) => {
    const response = await signalApi.get(`/setup/progress/${projectId}`)
    return response.data
  },

  /**
   * Retry failed setup steps
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Retry result
   */
  retrySetup: async (projectId) => {
    const response = await signalApi.post(`/setup/retry/${projectId}`)
    return response.data
  },

  /**
   * Get detailed setup logs
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Setup logs
   */
  getSetupLogs: async (projectId) => {
    const response = await signalApi.get(`/setup/logs/${projectId}`)
    return response.data
  },

  // ==========================================================================
  // AUTONOMOUS ACTIONS
  // ==========================================================================

  /**
   * Get pending actions needing approval
   * @param {string} projectId - Project ID
   * @param {number} [tier] - Filter by tier (optional)
   * @returns {Promise<Array>} Pending actions
   */
  getPendingActions: async (projectId, tier) => {
    const params = tier ? { tier } : {}
    const response = await signalApi.get(`/actions/pending/${projectId}`, { params })
    return response.data
  },

  /**
   * Approve an action
   * @param {string} actionId - Action ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated action
   */
  approveAction: async (actionId, userId) => {
    const response = await signalApi.post(`/actions/${actionId}/approve`, { user_id: userId })
    return response.data
  },

  /**
   * Reject an action
   * @param {string} actionId - Action ID
   * @param {string} userId - User ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated action
   */
  rejectAction: async (actionId, userId, reason) => {
    const response = await signalApi.post(`/actions/${actionId}/reject`, { user_id: userId, reason })
    return response.data
  },

  /**
   * Rollback an action
   * @param {string} actionId - Action ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated action
   */
  rollbackAction: async (actionId, userId) => {
    const response = await signalApi.post(`/actions/${actionId}/rollback`, { user_id: userId })
    return response.data
  },

  /**
   * Get action history for a project
   * @param {string} projectId - Project ID
   * @param {number} [limit] - Number of actions to return (default 50)
   * @returns {Promise<Array>} Action history
   */
  getActionHistory: async (projectId, limit) => {
    const params = limit ? { limit } : {}
    const response = await signalApi.get(`/actions/history/${projectId}`, { params })
    return response.data
  },

  /**
   * Get all actions for a project (grouped by status)
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} All actions
   */
  getActions: async (projectId) => {
    const response = await signalApi.get(`/actions/history/${projectId}`, { params: { limit: 100 } })
    return response.data
  },

  /**
   * Get monitors for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Monitors
   */
  getMonitors: async (projectId) => {
    const response = await signalApi.get(`/monitors/${projectId}`)
    return response.data
  },

  /**
   * Get Signal stats for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Stats
   */
  getStats: async (projectId) => {
    const response = await signalApi.get(`/actions/stats/${projectId}`)
    return response.data
  },

  /**
   * Retry a failed action
   * @param {string} actionId - Action ID
   * @returns {Promise<Object>} Updated action
   */
  retryAction: async (actionId) => {
    const response = await signalApi.post(`/actions/${actionId}/retry`)
    return response.data
  },

  /**
   * Pause a monitor
   * @param {string} monitorId - Monitor ID
   * @returns {Promise<Object>} Updated monitor
   */
  pauseMonitor: async (monitorId) => {
    const response = await signalApi.post(`/monitors/${monitorId}/pause`)
    return response.data
  },

  /**
   * Resume a monitor
   * @param {string} monitorId - Monitor ID
   * @returns {Promise<Object>} Updated monitor
   */
  resumeMonitor: async (monitorId) => {
    const response = await signalApi.post(`/monitors/${monitorId}/resume`)
    return response.data
  },
}

// ============================================================================
// SEO Skills API - Unified SEO AI exports (alias for signalSeoApi)
// ============================================================================

export const seoSkillsApi = {
  /**
   * Get data-driven SEO opportunities requiring human decision
   * Unlike AI quick-wins, these are REAL opportunities from GSC data:
   * - striking_distance: Keywords in positions 8-20 with high impressions
   * - low_ctr: High position but poor click-through rate  
   * - cannibalization: Multiple pages competing for same keyword
   * - content: Thin content, content gaps, outdated content
   * - strategic: Competitor gaps, new content opportunities
   * 
   * @param {string} projectId - Project ID
   * @param {Object} options - Options
   * @param {number} options.limit - Max results (default 20)
   * @param {string[]} options.includeTypes - Types to include
   * @returns {Promise<Object>} { opportunities, summary }
   */
  getOpportunities: async (projectId, options = {}) => {
    const response = await signalApi.post('/skills/seo/opportunities', { projectId, ...options })
    return response.data
  },

  /**
   * Get quick win SEO opportunities (AI-generated)
   * @deprecated Use getOpportunities() for real data-driven opportunities
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Quick wins with recommendations
   */
  getQuickWins: async (projectId) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { projectId })
    return response.data
  },

  /**
   * Get keyword recommendations
   * @param {string} projectId - Project ID
   * @param {string} pageUrl - Optional page URL
   * @returns {Promise<Object>} Keyword recommendations
   */
  getKeywordRecommendations: async (projectId, pageUrl) => {
    const response = await signalApi.post('/skills/seo/keyword-recommendations', { projectId, pageUrl })
    return response.data
  },

  /**
   * Analyze a page with AI
   * @param {string} projectId - Project ID
   * @param {string} url - Page URL
   * @returns {Promise<Object>} Page analysis
   */
  analyzePage: async (projectId, url) => {
    const response = await signalApi.post('/skills/seo/analyze-page', { projectId, url })
    return response.data
  },

  /**
   * Run comprehensive AI brain analysis
   * @param {string} projectId - Project ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Comprehensive analysis
   */
  runBrain: async (projectId, options = {}) => {
    const response = await signalApi.post('/skills/seo/brain', { projectId, ...options })
    return response.data
  },

  /**
   * Get content brief for a keyword
   * @param {string} projectId - Project ID
   * @param {string} targetKeyword - Target keyword
   * @returns {Promise<Object>} Content brief
   */
  getContentBrief: async (projectId, targetKeyword) => {
    const response = await signalApi.post('/skills/seo/content-brief', { projectId, targetKeyword })
    return response.data
  },
}

// ============================================================================
// CRM Skills API - Alias for crmAiApi (backward compatibility)
// ============================================================================

export const crmSkillsApi = crmAiApi

// ============================================================================
// Attach APIs to signalApi for convenience
// ============================================================================

signalApi.insights = insightsApi
signalApi.seo = seoSkillsApi
signalApi.crm = crmAiApi

// ============================================================================
// Default Export
// ============================================================================

export default signalApi
export { signalApi, insightsApi }
