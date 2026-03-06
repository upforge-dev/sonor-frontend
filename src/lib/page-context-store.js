/**
 * Page Context Store
 * 
 * Tracks the current page/module the user is on for Echo's contextual awareness.
 * Components can update this when the user navigates or focuses on specific entities.
 */
import { create } from 'zustand'

/**
 * @typedef {Object} PageContext
 * @property {string} [module] - Current module (e.g., 'email', 'seo', 'crm')
 * @property {string} [page] - Current page/view (e.g., 'campaign-editor', 'keyword-research')
 * @property {string} [entityId] - ID of entity being worked on
 * @property {string} [entityType] - Type of entity (e.g., 'campaign', 'template')
 * @property {string} [entityName] - Name/title of entity
 * @property {Object} [data] - Additional context data (e.g., current HTML)
 */

const usePageContextStore = create((set, get) => ({
  // Current page context
  module: null,
  page: null,
  entityId: null,
  entityType: null,
  entityName: null,
  data: null,

  /** When true, hide the floating MessagesWidget (e.g. on proposal edit page) */
  hideMessengerWidget: false,
  setHideMessengerWidget: (hide) => set({ hideMessengerWidget: !!hide }),

  /**
   * Set the current module (high-level navigation)
   * @param {string} module - Module name (e.g., 'email', 'seo', 'crm')
   * @param {string} [page] - Optional page within module
   */
  setModule: (module, page = null) => {
    set({ 
      module, 
      page,
      // Clear entity when switching modules
      entityId: null,
      entityType: null,
      entityName: null,
      data: null
    })
  },

  /**
   * Set the current page within a module
   * @param {string} page - Page name
   */
  setPage: (page) => {
    set({ page })
  },

  /**
   * Set entity being worked on (e.g., specific email campaign)
   * @param {Object} entity
   * @param {string} entity.id - Entity ID
   * @param {string} entity.type - Entity type (e.g., 'campaign', 'template')
   * @param {string} [entity.name] - Entity name/title
   * @param {Object} [entity.data] - Additional data (e.g., current HTML)
   */
  setEntity: ({ id, type, name, data }) => {
    set({
      entityId: id,
      entityType: type,
      entityName: name,
      data
    })
  },

  /**
   * Update additional data (e.g., current HTML content)
   * @param {Object} newData - Data to merge
   */
  updateData: (newData) => {
    set(state => ({
      data: { ...state.data, ...newData }
    }))
  },

  /**
   * Clear entity context (e.g., when closing editor)
   */
  clearEntity: () => {
    set({
      entityId: null,
      entityType: null,
      entityName: null,
      data: null
    })
  },

  /**
   * Clear all context
   */
  clearAll: () => {
    set({
      module: null,
      page: null,
      entityId: null,
      entityType: null,
      entityName: null,
      data: null
    })
  },

  /**
   * Get full page context object for Echo
   * @returns {PageContext}
   */
  getContext: () => {
    const state = get()
    const context = {}
    
    if (state.module) context.module = state.module
    if (state.page) context.page = state.page
    if (state.entityId) context.entityId = state.entityId
    if (state.entityType) context.entityType = state.entityType
    if (state.entityName) context.entityName = state.entityName
    if (state.data) context.data = state.data
    
    // Return null if no context is set
    return Object.keys(context).length > 0 ? context : null
  }
}))

export default usePageContextStore
