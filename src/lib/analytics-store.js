import { create } from 'zustand'
import { analyticsApi } from './portal-api'

/**
 * Analytics Module Store - Zustand store for the Analytics module UI
 * 
 * Manages:
 * - Current view state (highlights, page-specific)
 * - Page hierarchy from top pages data
 * - Selected page path
 * - Sidebar collapsed state
 */

const useAnalyticsStore = create((set, get) => ({
  // View state
  currentView: 'highlights', // 'highlights' | 'page'
  selectedPath: null, // The path selected for per-page analytics (e.g., '/marketing/seo')
  sidebarCollapsed: false,
  
  // Page hierarchy state
  pageHierarchy: [], // Hierarchical structure built from paths
  flatPages: [], // Flat list of all pages with analytics
  hierarchyLoading: false,
  hierarchyError: null,
  
  // Per-page analytics cache
  pageAnalytics: {}, // { [path]: { data, loading, error } }
  
  // AI Insights
  aiInsights: null,
  aiInsightsLoading: false,
  aiInsightsError: null,
  
  // Actions
  setCurrentView: (view) => set({ currentView: view }),
  
  setSelectedPath: (path) => set((state) => ({ 
    selectedPath: path, 
    // Only change view if we have a path, otherwise preserve current view (for journeys)
    currentView: path ? 'page' : (state.currentView === 'journeys' ? 'journeys' : 'highlights')
  })),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setHierarchyLoading: (loading) => set({ hierarchyLoading: loading }),
  
  /**
   * Build hierarchical page structure from flat page list
   * Converts paths like '/marketing/seo' into nested tree
   */
  buildHierarchy: (pages) => {
    if (!pages || pages.length === 0) {
      set({ pageHierarchy: [], flatPages: [] })
      return
    }
    
    // Sort pages by path for consistent ordering
    const sortedPages = [...pages].sort((a, b) => 
      (a.path || a.name || '').localeCompare(b.path || b.name || '')
    )
    
    const hierarchy = []
    const pathMap = new Map()
    
    // First pass: create all nodes
    for (const page of sortedPages) {
      const path = page.path || page.name || '/'
      const segments = path.split('/').filter(Boolean)
      
      // Handle root/home page specially (path === '/')
      if (segments.length === 0) {
        const homeNode = {
          id: '/',
          path: '/',
          name: 'Home',
          segment: '',
          children: [],
          isOpen: false,
          views: page.count || page.views || 0,
          sessions: page.sessions || 0,
          avgDuration: page.avgDuration || 0,
          bounceRate: page.bounceRate || 0,
        }
        hierarchy.push(homeNode)
        pathMap.set('/', homeNode)
        continue
      }
      
      // Create or get node for each level
      let currentLevel = hierarchy
      let currentPath = ''
      
      for (let i = 0; i < segments.length; i++) {
        currentPath += '/' + segments[i]
        const isLeaf = i === segments.length - 1
        
        let node = currentLevel.find(n => n.path === currentPath)
        
        if (!node) {
          node = {
            id: currentPath,
            path: currentPath,
            name: formatPageName(segments[i]),
            segment: segments[i],
            children: [],
            isOpen: false,
            // Only add stats for actual pages (leaves or pages with data)
            ...(isLeaf ? {
              views: page.count || page.views || 0,
              sessions: page.sessions || 0,
              avgDuration: page.avgDuration || 0,
              bounceRate: page.bounceRate || 0,
            } : {})
          }
          currentLevel.push(node)
          pathMap.set(currentPath, node)
        }
        
        // If this is the actual page, update stats
        if (isLeaf && page.count) {
          node.views = page.count || page.views || 0
          node.sessions = page.sessions || 0
        }
        
        currentLevel = node.children
      }
    }
    
    // Calculate aggregate stats for parent nodes
    const calculateAggregates = (nodes) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          calculateAggregates(node.children)
          
          // Sum up children stats if this node doesn't have its own
          if (!node.views) {
            node.views = node.children.reduce((sum, child) => sum + (child.views || 0), 0)
          }
        }
      }
    }
    
    calculateAggregates(hierarchy)
    
    set({ 
      pageHierarchy: hierarchy, 
      flatPages: sortedPages 
    })
    
    return hierarchy
  },
  
  /**
   * Toggle a page hierarchy node open/closed
   */
  toggleNode: (path) => {
    const toggleInTree = (nodes) => {
      for (const node of nodes) {
        if (node.path === path) {
          node.isOpen = !node.isOpen
          return true
        }
        if (node.children.length > 0 && toggleInTree(node.children)) {
          return true
        }
      }
      return false
    }
    
    set(state => {
      const newHierarchy = JSON.parse(JSON.stringify(state.pageHierarchy))
      toggleInTree(newHierarchy)
      return { pageHierarchy: newHierarchy }
    })
  },
  
  /**
   * Expand path to a specific node (open all parents)
   */
  expandToPath: (targetPath) => {
    const segments = targetPath.split('/').filter(Boolean)
    const pathsToOpen = []
    let currentPath = ''
    
    for (const segment of segments) {
      currentPath += '/' + segment
      pathsToOpen.push(currentPath)
    }
    
    set(state => {
      const newHierarchy = JSON.parse(JSON.stringify(state.pageHierarchy))
      
      const openInTree = (nodes, pathsToOpen) => {
        for (const node of nodes) {
          if (pathsToOpen.includes(node.path)) {
            node.isOpen = true
          }
          if (node.children.length > 0) {
            openInTree(node.children, pathsToOpen)
          }
        }
      }
      
      openInTree(newHierarchy, pathsToOpen)
      return { pageHierarchy: newHierarchy }
    })
  },
  
  /**
   * Fetch page-specific analytics
   */
  fetchPageAnalytics: async (projectId, path, days = 30) => {
    const cacheKey = `${path}:${days}`
    
    set(state => ({
      pageAnalytics: {
        ...state.pageAnalytics,
        [cacheKey]: { data: state.pageAnalytics[cacheKey]?.data, loading: true, error: null }
      }
    }))
    
    try {
      // Fetch multiple data points for the specific page
      const [
        pageViewsRes,
        scrollRes,
        heatmapRes,
        eventsRes,
        webVitalsRes
      ] = await Promise.all([
        analyticsApi.getPageViews({ projectId, days, path }),
        analyticsApi.getScrollDepth({ projectId, days, path }),
        analyticsApi.getHeatmap({ projectId, days, path }),
        analyticsApi.getEvents({ projectId, days, path }),
        analyticsApi.getWebVitals({ projectId, days, path })
      ])
      
      const data = {
        pageViews: pageViewsRes.data || pageViewsRes,
        scrollDepth: scrollRes.data || scrollRes,
        heatmap: heatmapRes.data || heatmapRes,
        events: eventsRes.data || eventsRes,
        webVitals: webVitalsRes.data || webVitalsRes,
        fetchedAt: new Date().toISOString()
      }
      
      set(state => ({
        pageAnalytics: {
          ...state.pageAnalytics,
          [cacheKey]: { data, loading: false, error: null }
        }
      }))
      
      return { success: true, data }
    } catch (error) {
      console.error('[AnalyticsStore] Error fetching page analytics:', error)
      set(state => ({
        pageAnalytics: {
          ...state.pageAnalytics,
          [cacheKey]: { data: null, loading: false, error: error.message }
        }
      }))
      return { success: false, error: error.message }
    }
  },
  
  /**
   * Fetch AI insights from Signal API
   */
  fetchAIInsights: async (projectId, path = null) => {
    set({ aiInsightsLoading: true, aiInsightsError: null })
    
    try {
      // Call Signal API for analytics insights
      const response = await fetch(
        `${import.meta.env.VITE_SIGNAL_API_URL || 'https://signal.sonor.io'}/analytics/insights?projectId=${projectId}${path ? `&path=${encodeURIComponent(path)}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights')
      }
      
      const data = await response.json()
      
      set({ 
        aiInsights: data.data || data, 
        aiInsightsLoading: false 
      })
      
      return { success: true, data: data.data || data }
    } catch (error) {
      console.error('[AnalyticsStore] Error fetching AI insights:', error)
      set({ 
        aiInsightsLoading: false, 
        aiInsightsError: error.message 
      })
      return { success: false, error: error.message }
    }
  },
  
  /**
   * Clear all state (on unmount or project change)
   */
  reset: () => set({
    currentView: 'highlights',
    selectedPath: null,
    pageHierarchy: [],
    flatPages: [],
    pageAnalytics: {},
    aiInsights: null,
    aiInsightsLoading: false,
    aiInsightsError: null
  })
}))

/**
 * Format a URL segment into a readable page name
 * e.g., 'web-design' -> 'Web Design'
 */
function formatPageName(segment) {
  if (!segment || segment === '') return 'Home'
  
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default useAnalyticsStore
