import { create } from 'zustand'
import { emailApi } from './sonor-api'
import useAuthStore from './auth-store'

/**
 * Email Platform Store
 * Manages state for the multi-tenant email marketing platform
 * - Campaigns
 * - Automations
 * - Templates
 * - Subscribers
 * - Lists
 * - Settings
 */
export const useEmailPlatformStore = create((set, get) => ({
  // ========================================
  // SETTINGS STATE
  // ========================================
  settings: null,
  settingsLoading: false,
  settingsError: null,

  // ========================================
  // CAMPAIGNS STATE
  // ========================================
  campaigns: [],
  campaignsLoading: false,
  campaignsError: null,
  currentCampaign: null,

  // ========================================
  // TEMPLATES STATE
  // ========================================
  templates: [],
  templatesLoading: false,
  templatesError: null,
  currentTemplate: null,
  systemTemplates: [], // Starter templates (is_system = true)
  systemTemplatesLoading: false,

  // ========================================
  // SUBSCRIBERS STATE
  // ========================================
  subscribers: [],
  subscribersLoading: false,
  subscribersError: null,
  subscribersPagination: { page: 1, limit: 50, total: 0 },

  // ========================================
  // LISTS STATE
  // ========================================
  lists: [],
  listsLoading: false,
  listsError: null,

  // ========================================
  // AUTOMATIONS STATE
  // ========================================
  automations: [],
  automationsLoading: false,
  automationsError: null,
  currentAutomation: null,

  // ========================================
  // SETTINGS ACTIONS
  // ========================================
  fetchSettings: async () => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const res = await emailApi.getSettings()
      const settings = res.data?.settings || res.data
      set({ settings, settingsLoading: false })
      return settings
    } catch (error) {
      set({ settingsError: error.response?.data?.error || error.message, settingsLoading: false })
      return null
    }
  },

  updateSettings: async (updates) => {
    set({ settingsLoading: true, settingsError: null })
    try {
      const res = await emailApi.updateSettings(updates)
      const settings = res.data?.settings || res.data
      set({ settings, settingsLoading: false })
      return settings
    } catch (error) {
      set({ settingsError: error.response?.data?.error || error.message, settingsLoading: false })
      throw error
    }
  },

  validateApiKey: async (apiKey) => {
    try {
      const res = await emailApi.validateApiKey(apiKey)
      return res.data || res
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Validation failed')
    }
  },

  // ========================================
  // CAMPAIGNS ACTIONS
  // ========================================
  fetchCampaigns: async (filters = {}) => {
    set({ campaignsLoading: true, campaignsError: null })
    try {
      const { currentProject } = useAuthStore.getState()
      const params = { ...filters }
      if (currentProject?.id && !params.projectId) {
        params.projectId = currentProject.id
      }
      const res = await emailApi.listCampaigns(params)
      const campaigns = res.data?.campaigns || res.data || []
      set({ campaigns, campaignsLoading: false })
      return campaigns
    } catch (error) {
      set({ campaignsError: error.response?.data?.error || error.message, campaignsLoading: false })
      return []
    }
  },

  getCampaign: async (id) => {
    try {
      const res = await emailApi.getCampaign(id)
      const campaign = res.data?.campaign || res.data
      set({ currentCampaign: campaign })
      return campaign
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get campaign')
    }
  },

  createCampaign: async (campaignData) => {
    try {
      const res = await emailApi.createCampaign(campaignData)
      const campaign = res.data?.campaign || res.data
      set(state => ({ campaigns: [campaign, ...state.campaigns] }))
      return campaign
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create campaign')
    }
  },

  updateCampaign: async (id, updates) => {
    try {
      const res = await emailApi.updateCampaign(id, updates)
      const campaign = res.data?.campaign || res.data
      set(state => ({
        campaigns: state.campaigns.map(c => c.id === id ? campaign : c),
        currentCampaign: campaign
      }))
      return campaign
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update campaign')
    }
  },

  sendCampaign: async (campaignId, options = {}) => {
    try {
      const res = await emailApi.sendCampaign(campaignId, options)
      // Refresh campaigns to get updated stats
      get().fetchCampaigns()
      return res.data || res
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send campaign')
    }
  },

  sendTestEmail: async (campaignId, testEmail) => {
    try {
      const res = await emailApi.sendTestEmail(campaignId, testEmail)
      return res.data || res
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send test email')
    }
  },

  // ========================================
  // TEMPLATES ACTIONS
  // ========================================
  fetchTemplates: async () => {
    set({ templatesLoading: true, templatesError: null })
    try {
      // Get current project ID from auth store
      const { currentProject } = useAuthStore.getState()
      const params = currentProject?.id ? { projectId: currentProject.id } : {}
      const res = await emailApi.listTemplates(params)
      const templates = res.data?.templates || res.data || []
      set({ templates, templatesLoading: false })
      return templates
    } catch (error) {
      set({ templatesError: error.response?.data?.error || error.message, templatesLoading: false })
      return []
    }
  },

  fetchSystemTemplates: async () => {
    set({ systemTemplatesLoading: true })
    try {
      // Get current project ID from auth store
      const { currentProject } = useAuthStore.getState()
      const params = { 
        is_system: true,
        ...(currentProject?.id && { projectId: currentProject.id })
      }
      const res = await emailApi.listTemplates(params)
      const systemTemplates = res.data?.templates || res.data || []
      set({ systemTemplates, systemTemplatesLoading: false })
      return systemTemplates
    } catch (error) {
      console.error('Failed to fetch system templates:', error)
      set({ systemTemplatesLoading: false })
      return []
    }
  },

  getTemplate: async (id) => {
    try {
      const res = await emailApi.getTemplate(id)
      const template = res.data?.template || res.data
      set({ currentTemplate: template })
      return template
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get template')
    }
  },

  createTemplate: async (templateData) => {
    try {
      const res = await emailApi.createTemplate(templateData)
      const template = res.data?.template || res.data
      set(state => ({ templates: [template, ...state.templates] }))
      return template
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create template')
    }
  },

  updateTemplate: async (id, updates) => {
    try {
      const res = await emailApi.updateTemplate(id, updates)
      const template = res.data?.template || res.data
      set(state => ({
        templates: state.templates.map(t => t.id === id ? template : t),
        currentTemplate: template
      }))
      return template
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update template')
    }
  },

  // ========================================
  // SUBSCRIBERS ACTIONS
  // ========================================
  fetchSubscribers: async (filters = {}) => {
    set({ subscribersLoading: true, subscribersError: null })
    try {
      const { currentProject } = useAuthStore.getState()
      const params = { limit: 500, ...filters }
      if (currentProject?.id && !params.projectId) {
        params.projectId = currentProject.id
      }
      const res = await emailApi.listSubscribers(params)
      const data = res.data || res
      const subs = data.subscribers || []
      const total = typeof data.total === 'number' ? data.total : subs.length
      const limit = typeof data.limit === 'number' ? data.limit : params.limit
      const offset = typeof data.offset === 'number' ? data.offset : 0
      set({
        subscribers: subs,
        subscribersPagination: {
          total,
          limit,
          offset,
          page: limit > 0 ? Math.floor(offset / limit) + 1 : 1,
        },
        subscribersLoading: false,
      })
      return subs
    } catch (error) {
      set({ subscribersError: error.response?.data?.error || error.message, subscribersLoading: false })
      return []
    }
  },

  createSubscriber: async (subscriberData) => {
    try {
      const { currentProject } = useAuthStore.getState()
      const body = { ...subscriberData }
      if (currentProject?.id && !body.projectId) {
        body.projectId = currentProject.id
      }
      const res = await emailApi.createSubscriber(body)
      const data = res.data || res
      const { subscriber, created } = data
      if (created) {
        set(state => ({ subscribers: [subscriber, ...state.subscribers] }))
      } else {
        set(state => ({
          subscribers: state.subscribers.map(s => s.id === subscriber.id ? subscriber : s)
        }))
      }
      return { subscriber, created }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create subscriber')
    }
  },

  importSubscribers: async (csvData, options = {}) => {
    try {
      const { currentProject } = useAuthStore.getState()
      const body = { ...csvData, ...options }
      if (currentProject?.id && !body.projectId) {
        body.projectId = currentProject.id
      }
      const res = await emailApi.importSubscribers(body)
      // Refresh subscribers and lists after import
      get().fetchSubscribers()
      get().fetchLists()
      return res.data || res
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to import subscribers')
    }
  },

  // ========================================
  // LISTS ACTIONS
  // ========================================
  fetchLists: async () => {
    set({ listsLoading: true, listsError: null })
    try {
      const { currentProject } = useAuthStore.getState()
      const params = currentProject?.id ? { projectId: currentProject.id } : {}
      const res = await emailApi.listLists(params)
      const lists = res.data?.lists || res.data || []
      set({ lists, listsLoading: false })
      return lists
    } catch (error) {
      set({ listsError: error.response?.data?.error || error.message, listsLoading: false })
      return []
    }
  },

  createList: async (listData) => {
    try {
      const res = await emailApi.createList(listData)
      const list = res.data?.list || res.data
      set(state => ({ lists: [list, ...state.lists] }))
      return list
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create list')
    }
  },

  // ========================================
  // AUTOMATIONS ACTIONS
  // ========================================
  fetchAutomations: async () => {
    set({ automationsLoading: true, automationsError: null })
    try {
      const { currentProject } = useAuthStore.getState()
      const params = currentProject?.id ? { projectId: currentProject.id } : {}
      const res = await emailApi.listAutomations(params)
      const automations = res.data?.automations || res.data || []
      set({ automations, automationsLoading: false })
      return automations
    } catch (error) {
      set({ automationsError: error.response?.data?.error || error.message, automationsLoading: false })
      return []
    }
  },

  getAutomation: async (id) => {
    try {
      const res = await emailApi.getAutomation(id)
      const automation = res.data?.automation || res.data
      set({ currentAutomation: automation })
      return automation
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get automation')
    }
  },

  createAutomation: async (automationData) => {
    try {
      const res = await emailApi.createAutomation(automationData)
      const automation = res.data?.automation || res.data
      set(state => ({ automations: [automation, ...state.automations] }))
      return automation
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create automation')
    }
  },

  updateAutomation: async (id, updates) => {
    try {
      const res = await emailApi.updateAutomation(id, updates)
      const automation = res.data?.automation || res.data
      set(state => ({
        automations: state.automations.map(a => a.id === id ? automation : a),
        currentAutomation: automation
      }))
      return automation
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update automation')
    }
  },

  toggleAutomationStatus: async (id, newStatus) => {
    return get().updateAutomation(id, { status: newStatus })
  },

  // ========================================
  // UTILITY ACTIONS
  // ========================================
  clearCurrentCampaign: () => set({ currentCampaign: null }),
  clearCurrentTemplate: () => set({ currentTemplate: null }),
  clearCurrentAutomation: () => set({ currentAutomation: null }),
  
  reset: () => set({
    settings: null,
    campaigns: [],
    templates: [],
    subscribers: [],
    lists: [],
    automations: [],
    currentCampaign: null,
    currentTemplate: null,
    currentAutomation: null
  })
}))
