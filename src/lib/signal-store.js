/**
 * Signal Store
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store for Signal AI state management.
 * All calls go directly to Signal API (NestJS) - no Netlify function proxies.
 * 
 * Handles:
 * - Echo interface (chat UI)
 * - Signal Module (knowledge base, FAQs, widget config)
 * - Conversations and learning suggestions
 * - Knowledge gap detection (SIGNAL-017)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import { supabase } from './supabase-auth'
import useAuthStore from './auth-store'

// ─────────────────────────────────────────────────────────────────────────────
// Signal API Direct Access
// ─────────────────────────────────────────────────────────────────────────────
// Signal API runs on NestJS - all requests go directly there
const SIGNAL_API_URL = import.meta.env.VITE_SIGNAL_API_URL || 'https://signal.sonor.io'

// Create Signal API axios instance
const signalApi = axios.create({
  baseURL: SIGNAL_API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Add auth interceptor for Signal API calls
signalApi.interceptors.request.use(async (config) => {
  // Get Supabase session and add to Authorization header
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  
  // Get org/project from current context (will be set by components)
  const orgId = localStorage.getItem('signal_org_id')
  const projectId = localStorage.getItem('signal_project_id')
  if (orgId) config.headers['X-Organization-Id'] = orgId
  if (projectId) config.headers['X-Project-Id'] = projectId
  
  // Also try to get from auth store for consistency
  try {
    const state = useAuthStore.getState()
    if (state.currentProject?.id) {
      config.headers['X-Project-Id'] = state.currentProject.id
    }
  } catch (e) {
    // Auth store not available yet
  }
  
  return config
})

export const useSignalStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────────────────────────────────
      // Echo UI State
      // ─────────────────────────────────────────────────────────────────────────
      
      // Echo UI state
      isEchoOpen: false,
      isEchoMinimized: false,
      echoSkill: null,
      echoContextId: null,

      // Conversations
      conversations: [],
      activeConversation: null,
      messages: [],

      // Skills
      skills: [],
      skillsLoaded: false,

      // Memory (cached)
      memories: [],

      // Loading states
      isLoading: false,
      isSending: false,
      error: null,
      
      // ─────────────────────────────────────────────────────────────────────────
      // Signal Module State (Knowledge Base, FAQs, Widget Config)
      // ─────────────────────────────────────────────────────────────────────────
      
      // Config state
      moduleConfig: null,
      moduleConfigLoading: false,
      moduleConfigError: null,
      
      // Knowledge base state
      knowledge: [],
      knowledgeLoading: false,
      knowledgePagination: { page: 1, total: 0, pages: 0 },
      knowledgeStats: { totalChunks: 0, byType: {}, withEmbeddings: 0, lastUpdated: null },
      
      // FAQs state
      faqs: [],
      faqsLoading: false,
      faqsPagination: { page: 1, total: 0, pages: 0 },
      faqsStats: { pending: 0, approved: 0, rejected: 0 },
      
      // Widget conversations state
      widgetConversations: [],
      widgetConversationsLoading: false,
      widgetConversationsPagination: { page: 1, total: 0, pages: 0 },
      widgetConversationsStats: { total: 0, byStatus: {}, leadsCreated: 0 },
      activeWidgetConversation: null,
      activeWidgetMessages: [],
      
      // Analytics state (from dedicated endpoint)
      analytics: null,
      analyticsLoading: false,
      analyticsError: null,
      
      // Patterns state (learned behaviors)
      patterns: [],
      patternsLoading: false,
      patternsStats: { total: 0, bySkill: {} },
      
      // Learning suggestions state
      suggestions: [],
      suggestionsLoading: false,
      suggestionsPagination: { page: 1, total: 0, pages: 0 },
      suggestionsStats: { byStatus: {}, byType: {} },
      // 24h cache for suggestions so navigating to Signal doesn't refetch every time
      suggestionsCache: {},
      suggestionsCacheTtlMs: 24 * 60 * 60 * 1000,
      
      // Knowledge gaps state (SIGNAL-017)
      knowledgeGaps: [],
      knowledgeGapsLoading: false,
      knowledgeGapsPagination: { page: 1, total: 0, pages: 0 },
      knowledgeGapsStats: { 
        openGaps: 0, 
        addressedGaps: 0, 
        dismissedGaps: 0, 
        totalOccurrences: 0,
        avgSimilarity: 0 
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Echo Actions
      // ─────────────────────────────────────────────────────────────────────────

      openEcho: (skill = null, contextId = null) => {
        set({ 
          isEchoOpen: true, 
          isEchoMinimized: false,
          echoSkill: skill,
          echoContextId: contextId
        })
      },

      closeEcho: () => {
        set({ isEchoOpen: false })
      },

      toggleEcho: () => {
        set(state => ({ isEchoOpen: !state.isEchoOpen }))
      },

      minimizeEcho: (minimized = true) => {
        set({ isEchoMinimized: minimized })
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Conversation Actions
      // ─────────────────────────────────────────────────────────────────────────

      /**
       * Send a message to Echo
       */
      sendMessage: async (message, options = {}) => {
        const { echoSkill, echoContextId, activeConversation } = get()
        set({ isSending: true, error: null })

        // Add user message optimistically
        set(state => ({
          messages: [...state.messages, { role: 'user', content: message }]
        }))

        try {
          // Use Signal API directly
          const endpoint = options.skill || echoSkill 
            ? `/echo/module/${options.skill || echoSkill}`
            : `/echo/chat`

          const payload = {
            message,
            conversationId: activeConversation?.id,
            ...(options.skill || echoSkill ? {
              contextId: options.contextId || echoContextId
            } : {})
          }

          const res = await signalApi.post(endpoint, payload)
          const { message: response, conversation_id, skill } = res.data?.data || res.data

          // Update active conversation
          if (conversation_id && !activeConversation) {
            set({ activeConversation: { id: conversation_id, skill_key: skill } })
          }

          // Add assistant message
          set(state => ({
            messages: [...state.messages, { 
              role: 'assistant', 
              content: response,
              skill
            }],
            isSending: false
          }))

          return res.data

        } catch (error) {
          console.error('Signal send error:', error)
          set(state => ({
            messages: [...state.messages, { 
              role: 'error', 
              content: 'Sorry, I encountered an error. Please try again.'
            }],
            error: error.message,
            isSending: false
          }))
          throw error
        }
      },

      /**
       * Load conversation list
       */
      fetchConversations: async (skill = null) => {
        set({ isLoading: true, error: null })

        try {
          const params = skill ? { skill } : {}
          const res = await signalApi.get('/echo/conversations', { params })
          const data = res.data?.data || res.data
          set({ conversations: data.items || data.conversations || [], isLoading: false })
          return data.items || data.conversations || []
        } catch (error) {
          console.error('Failed to fetch conversations:', error)
          set({ error: error.message, isLoading: false })
          return []
        }
      },

      /**
       * Load a specific conversation
       */
      loadConversation: async (conversationId) => {
        set({ isLoading: true, error: null })

        try {
          const res = await signalApi.get(`/echo/conversation/${conversationId}`)
          const { conversation, messages } = res.data?.data || res.data

          set({ 
            activeConversation: conversation,
            messages: messages.map(m => ({
              role: m.role === 'echo' ? 'assistant' : m.role,
              content: m.content,
              skill: m.skill_key
            })),
            isLoading: false
          })

          return res.data?.data || res.data
        } catch (error) {
          console.error('Failed to load conversation:', error)
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      /**
       * Start a new conversation
       */
      startNewConversation: () => {
        set({ 
          activeConversation: null, 
          messages: [] 
        })
      },

      /**
       * Rate the last response
       */
      rateResponse: async (rating, feedback = null) => {
        const { activeConversation } = get()
        if (!activeConversation?.id) return

        try {
          await signalApi.post('/echo/rate', {
            conversationId: activeConversation.id,
            rating,
            feedback
          })
        } catch (error) {
          console.error('Failed to rate:', error)
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Skill Actions
      // ─────────────────────────────────────────────────────────────────────────

      /**
       * Fetch available skills
       */
      fetchSkills: async () => {
        if (get().skillsLoaded) return get().skills

        try {
          const res = await signalApi.get('/skills')
          const data = res.data?.data || res.data
          set({ skills: data.skills || data || [], skillsLoaded: true })
          return data.skills || data || []
        } catch (error) {
          console.error('Failed to fetch skills:', error)
          return []
        }
      },

      /**
       * Invoke a specific tool
       */
      invokeTool: async (skill, tool, params = {}) => {
        set({ isLoading: true, error: null })

        try {
          const res = await signalApi.post('/echo/tool-invoke', { skill, tool, params })
          const data = res.data?.data || res.data
          set({ isLoading: false })
          return data
        } catch (error) {
          console.error('Tool invocation error:', error)
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Memory Actions
      // ─────────────────────────────────────────────────────────────────────────

      /**
       * Fetch Signal memories
       */
      fetchMemories: async (skill = null, type = null) => {
        try {
          const params = {}
          if (skill) params.skill = skill
          if (type) params.type = type

          const res = await signalApi.get('/memory', { params })
          const data = res.data?.data || res.data
          set({ memories: data.memories || data || [] })
          return data.memories || data || []
        } catch (error) {
          console.error('Failed to fetch memories:', error)
          return []
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Signal Module Config Actions
      // TODO: Signal API needs /config endpoint - using Netlify proxy for now
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchModuleConfig: async (projectId) => {
        set({ moduleConfigLoading: true, moduleConfigError: null })
        try {
          // TODO: Create /config endpoint in Signal API
          const res = await signalApi.get('/config', { params: { projectId } })
          const data = res.data?.data || res.data
          set({ 
            moduleConfig: data.config || data, 
            moduleConfigLoading: false 
          })
          return data
        } catch (error) {
          set({ moduleConfigLoading: false, moduleConfigError: error.message })
          throw error
        }
      },
      
      updateModuleConfig: async (projectId, updates) => {
        set({ moduleConfigLoading: true })
        try {
          // TODO: Create /config endpoint in Signal API
          const res = await signalApi.put('/config', {
            projectId,
            config: updates
          })
          const data = res.data?.data || res.data
          set({ moduleConfig: data.config || data, moduleConfigLoading: false })
          return data
        } catch (error) {
          set({ moduleConfigLoading: false, moduleConfigError: error.message })
          throw error
        }
      },
      
      enableSignal: async (projectId) => {
        return get().updateModuleConfig(projectId, { is_enabled: true })
      },
      
      disableSignal: async (projectId) => {
        return get().updateModuleConfig(projectId, { is_enabled: false })
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Knowledge Base Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      /**
       * Fetch knowledge stats from dedicated endpoint
       * Returns totalChunks, byType breakdown, withEmbeddings count
       */
      fetchKnowledgeStats: async (projectId) => {
        try {
          const res = await signalApi.get('/knowledge/stats', { 
            params: { projectId } 
          })
          const data = res.data?.data || res.data
          set({ 
            knowledgeStats: {
              totalChunks: data.totalChunks || 0,
              byType: data.byType || {},
              withEmbeddings: data.withEmbeddings || 0,
              lastUpdated: data.lastUpdated || null
            }
          })
          return data
        } catch (error) {
          console.error('Failed to fetch knowledge stats:', error)
          return { totalChunks: 0, byType: {}, withEmbeddings: 0, lastUpdated: null }
        }
      },
      
      fetchKnowledge: async (projectId, options = {}) => {
        set({ knowledgeLoading: true })
        try {
          const res = await signalApi.get('/knowledge', { 
            params: { projectId, ...options } 
          })
          const data = res.data?.data || res.data
          set({ 
            knowledge: data.items || data.chunks || [],
            knowledgePagination: data.pagination || { page: 1, total: 0, pages: 0 },
            knowledgeLoading: false
          })
          return data
        } catch (error) {
          set({ knowledgeLoading: false })
          throw error
        }
      },
      
      addKnowledge: async (projectId, entry) => {
        const res = await signalApi.post('/knowledge', {
          ...entry,
          projectId
        })
        await get().fetchKnowledge(projectId)
        return res.data?.data || res.data
      },
      
      updateKnowledge: async (projectId, id, updates) => {
        const res = await signalApi.put(`/knowledge/${id}`, {
          ...updates,
          projectId
        })
        const chunk = res.data?.data?.chunk || res.data?.data || res.data?.chunk || res.data
        set(state => ({
          knowledge: state.knowledge.map(k => k.id === id ? chunk : k)
        }))
        return res.data?.data || res.data
      },
      
      deleteKnowledge: async (id) => {
        await signalApi.delete(`/knowledge/${id}`)
        set(state => ({
          knowledge: state.knowledge.filter(k => k.id !== id)
        }))
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // FAQ Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchFaqs: async (projectId, options = {}) => {
        set({ faqsLoading: true })
        try {
          const res = await signalApi.get('/faqs', { 
            params: { projectId, ...options } 
          })
          const data = res.data?.data || res.data
          set({ 
            faqs: data.items || data.faqs || [],
            faqsPagination: data.pagination || { page: 1, total: 0, pages: 0 },
            faqsStats: data.stats || { pending: 0, approved: 0, rejected: 0 },
            faqsLoading: false
          })
          return data
        } catch (error) {
          set({ faqsLoading: false })
          throw error
        }
      },
      
      createFaq: async (projectId, faq) => {
        const res = await signalApi.post('/faqs', {
          ...faq,
          projectId
        })
        await get().fetchFaqs(projectId)
        return res.data?.data || res.data
      },
      
      updateFaq: async (projectId, id, updates) => {
        const res = await signalApi.put(`/faqs/${id}`, {
          ...updates,
          projectId
        })
        const faq = res.data?.data?.faq || res.data?.data || res.data?.faq || res.data
        set(state => ({
          faqs: state.faqs.map(f => f.id === id ? faq : f)
        }))
        return res.data?.data || res.data
      },
      
      approveFaq: async (projectId, id) => {
        const res = await signalApi.post(`/faqs/${id}/approve`, { projectId })
        const faq = res.data?.data?.faq || res.data?.data || res.data?.faq || res.data
        set(state => ({
          faqs: state.faqs.map(f => f.id === id ? faq : f)
        }))
        return res.data?.data || res.data
      },
      
      rejectFaq: async (projectId, id) => {
        const res = await signalApi.post(`/faqs/${id}/reject`, { projectId })
        const faq = res.data?.data?.faq || res.data?.data || res.data?.faq || res.data
        set(state => ({
          faqs: state.faqs.map(f => f.id === id ? faq : f)
        }))
        return res.data?.data || res.data
      },
      
      deleteFaq: async (id) => {
        await signalApi.delete(`/faqs/${id}`)
        set(state => ({
          faqs: state.faqs.filter(f => f.id !== id)
        }))
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Widget Conversation Actions
      // TODO: Signal API needs /conversations endpoint - using Echo for now
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchWidgetConversations: async (projectId, options = {}) => {
        set({ widgetConversationsLoading: true })
        try {
          const res = await signalApi.get('/echo/conversations', { 
            params: { projectId, type: 'widget', ...options } 
          })
          const data = res.data?.data || res.data
          set({ 
            widgetConversations: data.items || data.conversations || [],
            widgetConversationsPagination: data.pagination || { page: 1, total: 0, pages: 0 },
            widgetConversationsStats: data.stats || { total: 0, byStatus: {}, leadsCreated: 0 },
            widgetConversationsLoading: false
          })
          return data
        } catch (error) {
          set({ widgetConversationsLoading: false })
          throw error
        }
      },
      
      fetchWidgetConversation: async (conversationId) => {
        set({ widgetConversationsLoading: true })
        try {
          const res = await signalApi.get(`/echo/conversation/${conversationId}`)
          const data = res.data?.data || res.data
          set({ 
            activeWidgetConversation: data.conversation || data,
            activeWidgetMessages: data.messages || [],
            widgetConversationsLoading: false
          })
          return data
        } catch (error) {
          set({ widgetConversationsLoading: false })
          throw error
        }
      },
      
      closeWidgetConversation: async (conversationId) => {
        const res = await signalApi.put(`/echo/conversation/${conversationId}/close`, {
          reason: 'user_closed'
        })
        const conv = res.data?.data?.conversation || res.data?.data || res.data?.conversation || res.data
        set(state => ({
          widgetConversations: state.widgetConversations.map(c => 
            c.id === conversationId ? conv : c
          ),
          activeWidgetConversation: state.activeWidgetConversation?.id === conversationId 
            ? conv 
            : state.activeWidgetConversation
        }))
        return res.data?.data || res.data
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Analytics Actions
      // TODO: Signal API needs /analytics endpoint - creating basic version
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchAnalytics: async (projectId, options = {}) => {
        set({ analyticsLoading: true, analyticsError: null })
        try {
          const res = await signalApi.get('/analytics', { 
            params: { projectId, ...options } 
          })
          const data = res.data?.data || res.data
          set({ 
            analytics: data,
            analyticsLoading: false
          })
          return data
        } catch (error) {
          set({ 
            analyticsError: error.message,
            analyticsLoading: false 
          })
          throw error
        }
      },
      
      fetchQualityTrend: async (projectId, options = {}) => {
        try {
          const res = await signalApi.get('/analytics/quality-trend', { 
            params: { projectId, ...options } 
          })
          const data = res.data?.data || res.data
          return data.trend || []
        } catch (error) {
          console.error('Failed to fetch quality trend:', error)
          return []
        }
      },
      
      fetchKnowledgeCoverage: async (projectId) => {
        try {
          const res = await signalApi.get('/analytics/knowledge-coverage', { 
            params: { projectId } 
          })
          const data = res.data?.data || res.data
          return data.coverage || []
        } catch (error) {
          console.error('Failed to fetch knowledge coverage:', error)
          return []
        }
      },
      
      fetchActivityFeed: async (projectId, limit = 10) => {
        try {
          const res = await signalApi.get('/analytics/activity-feed', { 
            params: { projectId, limit } 
          })
          const data = res.data?.data || res.data
          return data.activities || []
        } catch (error) {
          console.error('Failed to fetch activity feed:', error)
          return []
        }
      },
      
      fetchKnowledgeDomains: async (projectId) => {
        try {
          const res = await signalApi.get('/analytics/knowledge-domains', { 
            params: { projectId } 
          })
          const data = res.data?.data || res.data
          return data
        } catch (error) {
          console.error('Failed to fetch knowledge domains:', error)
          return { domains: [], totalCoverage: 0, totalChunks: 0, hasProfile: false }
        }
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Patterns Actions
      // Learned behaviors from successful interactions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchPatterns: async (projectId, skillKey = 'all') => {
        set({ patternsLoading: true })
        try {
          // Fetch patterns for a specific skill or all skills
          const endpoint = skillKey === 'all' ? '/patterns/router' : `/patterns/${skillKey}`
          const res = await signalApi.get(endpoint)
          const data = res.data?.data || res.data
          set({ 
            patterns: data.patterns || data || [],
            patternsStats: data.stats || { total: (data.patterns || data || []).length, bySkill: {} },
            patternsLoading: false
          })
          return data.patterns || data || []
        } catch (error) {
          console.error('Failed to fetch patterns:', error)
          set({ patternsLoading: false })
          return []
        }
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Learning Suggestions Actions
      // TODO: Signal API needs /learning controller - creating it
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchSuggestions: async (projectId, options = {}) => {
        const cacheKey = `${projectId}:${options.status ?? 'all'}:${options.type ?? 'all'}:${options.page ?? 1}`
        const { suggestionsCache, suggestionsCacheTtlMs } = get()
        const cached = suggestionsCache?.[cacheKey]
        if (cached && (Date.now() - cached.fetchedAt) < suggestionsCacheTtlMs) {
          set({
            suggestions: cached.data.items ?? cached.data.suggestions ?? [],
            suggestionsPagination: cached.data.pagination ?? { page: 1, total: 0, pages: 0 },
            suggestionsStats: cached.data.stats ?? { byStatus: {}, byType: {} },
            suggestionsLoading: false
          })
          return cached.data
        }
        set({ suggestionsLoading: true })
        try {
          const res = await signalApi.get('/learning/suggestions', { 
            params: { projectId, ...options } 
          })
          const data = res.data?.data || res.data
          const payload = {
            items: data.items || data.suggestions || [],
            pagination: data.pagination || { page: 1, total: 0, pages: 0 },
            stats: data.stats || { byStatus: {}, byType: {} }
          }
          set({ 
            suggestions: payload.items,
            suggestionsPagination: payload.pagination,
            suggestionsStats: payload.stats,
            suggestionsLoading: false,
            suggestionsCache: {
              ...get().suggestionsCache,
              [cacheKey]: { data: payload, fetchedAt: Date.now() }
            }
          })
          return data
        } catch (error) {
          set({ suggestionsLoading: false })
          throw error
        }
      },
      
      approveSuggestion: async (projectId, suggestionId) => {
        const res = await signalApi.post(`/learning/suggestions/${suggestionId}/approve`, { 
          projectId 
        })
        const suggestion = res.data?.data?.suggestion || res.data?.data || res.data?.suggestion || res.data
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? suggestion : s
          ),
          suggestionsCache: {} // invalidate so next fetch is fresh
        }))
        return res.data?.data || res.data
      },
      
      applySuggestion: async (projectId, suggestionId) => {
        const res = await signalApi.post(`/learning/suggestions/${suggestionId}/apply`, { 
          projectId 
        })
        const suggestion = res.data?.data?.suggestion || res.data?.data || res.data?.suggestion || res.data
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? suggestion : s
          ),
          suggestionsCache: {} // invalidate so next fetch is fresh
        }))
        return res.data?.data || res.data
      },
      
      rejectSuggestion: async (projectId, suggestionId, reason) => {
        const res = await signalApi.post(`/learning/suggestions/${suggestionId}/reject`, {
          projectId,
          reason
        })
        const suggestion = res.data?.data?.suggestion || res.data?.data || res.data?.suggestion || res.data
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? suggestion : s
          ),
          suggestionsCache: {} // invalidate so next fetch is fresh
        }))
        return res.data?.data || res.data
      },
      
      deferSuggestion: async (projectId, suggestionId) => {
        const res = await signalApi.post(`/learning/suggestions/${suggestionId}/defer`, { 
          projectId 
        })
        const suggestion = res.data?.data?.suggestion || res.data?.data || res.data?.suggestion || res.data
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? suggestion : s
          ),
          suggestionsCache: {} // invalidate so next fetch is fresh
        }))
        return res.data?.data || res.data
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Knowledge Gaps Actions (SIGNAL-017) - Direct Signal API calls
      // ─────────────────────────────────────────────────────────────────────────
      
      // Set context for Signal API calls (call this when project changes)
      setSignalContext: (orgId, projectId) => {
        if (orgId) localStorage.setItem('signal_org_id', orgId)
        if (projectId) localStorage.setItem('signal_project_id', projectId)
      },
      
      fetchKnowledgeGaps: async (projectId, options = {}) => {
        set({ knowledgeGapsLoading: true })
        // Set project context for this request
        localStorage.setItem('signal_project_id', projectId)
        try {
          const params = new URLSearchParams()
          if (options.status) params.append('status', options.status)
          if (options.limit) params.append('limit', options.limit)
          if (options.offset) params.append('offset', options.offset)
          if (options.sortBy) params.append('sortBy', options.sortBy)
          if (options.sortOrder) params.append('sortOrder', options.sortOrder)
          
          const [gapsRes, statsRes] = await Promise.all([
            signalApi.get(`/knowledge/gaps?${params.toString()}`),
            signalApi.get('/knowledge/gaps/stats')
          ])
          
          set({ 
            knowledgeGaps: gapsRes.data.gaps || gapsRes.data,
            knowledgeGapsPagination: gapsRes.data.pagination || {
              page: 1,
              limit: options.limit || 50,
              total: gapsRes.data.total || (gapsRes.data.gaps?.length || 0),
              pages: Math.ceil((gapsRes.data.total || gapsRes.data.gaps?.length || 0) / (options.limit || 50))
            },
            knowledgeGapsStats: statsRes.data,
            knowledgeGapsLoading: false
          })
          return { gaps: gapsRes.data, stats: statsRes.data }
        } catch (error) {
          set({ knowledgeGapsLoading: false })
          throw error
        }
      },
      
      fetchKnowledgeGapsStats: async (projectId) => {
        localStorage.setItem('signal_tenant_id', projectId)
        try {
          const res = await signalApi.get('/knowledge/gaps/stats')
          set({ knowledgeGapsStats: res.data })
          return res.data
        } catch (error) {
          console.error('Failed to fetch knowledge gaps stats:', error)
          throw error
        }
      },
      
      addressKnowledgeGap: async (projectId, gapId, knowledgeChunkId, note) => {
        localStorage.setItem('signal_tenant_id', projectId)
        const res = await signalApi.put(`/knowledge/gaps/${gapId}/address`, {
          knowledgeChunkId,
          note
        })
        set(state => ({
          knowledgeGaps: state.knowledgeGaps.map(g => 
            g.id === gapId ? res.data : g
          )
        }))
        return res.data
      },
      
      dismissKnowledgeGap: async (projectId, gapId, reason) => {
        localStorage.setItem('signal_tenant_id', projectId)
        const res = await signalApi.put(`/knowledge/gaps/${gapId}/dismiss`, {
          reason
        })
        set(state => ({
          knowledgeGaps: state.knowledgeGaps.map(g => 
            g.id === gapId ? res.data : g
          )
        }))
        return res.data
      },
      
      mergeKnowledgeGaps: async (projectId, primaryId, duplicateIds) => {
        localStorage.setItem('signal_tenant_id', projectId)
        const res = await signalApi.put(`/knowledge/gaps/${primaryId}/merge`, {
          duplicateIds
        })
        // Remove merged gaps from state
        set(state => ({
          knowledgeGaps: state.knowledgeGaps.filter(g => 
            !duplicateIds.includes(g.id)
          ).map(g => g.id === primaryId ? res.data : g)
        }))
        return res.data
      },
      
      fillKnowledgeGap: async (projectId, gapId, content, options = {}) => {
        localStorage.setItem('signal_tenant_id', projectId)
        const res = await signalApi.post(`/knowledge/gaps/${gapId}/fill`, {
          content,
          contentType: options.contentType || 'faq',
          sourceUrl: options.sourceUrl,
          isPublic: options.isPublic ?? true
        })
        set(state => ({
          knowledgeGaps: state.knowledgeGaps.map(g => 
            g.id === gapId ? res.data.gap : g
          )
        }))
        return res.data
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Reset
      // ─────────────────────────────────────────────────────────────────────────

      reset: () => {
        set({
          // Echo state
          conversations: [],
          activeConversation: null,
          messages: [],
          isEchoOpen: false,
          isEchoMinimized: false,
          echoSkill: null,
          echoContextId: null,
          error: null,
          // Module state
          moduleConfig: null,
          moduleConfigLoading: false,
          moduleConfigError: null,
          knowledge: [],
          knowledgeLoading: false,
          faqs: [],
          faqsLoading: false,
          widgetConversations: [],
          widgetConversationsLoading: false,
          activeWidgetConversation: null,
          activeWidgetMessages: [],
          suggestions: [],
          suggestionsLoading: false,
          suggestionsCache: {},
          // Knowledge gaps state
          knowledgeGaps: [],
          knowledgeGapsLoading: false,
          knowledgeGapsStats: { openGaps: 0, addressedGaps: 0, dismissedGaps: 0, totalOccurrences: 0, avgSimilarity: 0 }
        })
      }
    }),
    {
      name: 'signal-store',
      partialize: (state) => ({
        // Only persist UI preferences
        isEchoOpen: state.isEchoOpen,
        isEchoMinimized: state.isEchoMinimized
      })
    }
  )
)

// ═══════════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════════

// Echo selectors
export const selectIsEchoOpen = (state) => state.isEchoOpen
export const selectMessages = (state) => state.messages
export const selectActiveConversation = (state) => state.activeConversation
export const selectSkills = (state) => state.skills
export const selectIsSending = (state) => state.isSending

// Signal Module selectors
export const selectModuleConfig = (state) => state.moduleConfig
export const selectModuleConfigLoading = (state) => state.moduleConfigLoading
export const selectIsSignalEnabled = (state) => state.moduleConfig?.is_enabled || false
export const selectKnowledge = (state) => state.knowledge
export const selectKnowledgeStats = (state) => state.knowledgeStats
export const selectFaqs = (state) => state.faqs
export const selectFaqsStats = (state) => state.faqsStats
export const selectWidgetConversations = (state) => state.widgetConversations
export const selectWidgetConversationsStats = (state) => state.widgetConversationsStats
export const selectSuggestions = (state) => state.suggestions
export const selectSuggestionsStats = (state) => state.suggestionsStats
export const selectAnalytics = (state) => state.analytics
export const selectAnalyticsLoading = (state) => state.analyticsLoading

// Knowledge Gaps selectors (SIGNAL-017)
export const selectKnowledgeGaps = (state) => state.knowledgeGaps
export const selectKnowledgeGapsLoading = (state) => state.knowledgeGapsLoading
export const selectKnowledgeGapsStats = (state) => state.knowledgeGapsStats
export const selectKnowledgeGapsPagination = (state) => state.knowledgeGapsPagination

export default useSignalStore
