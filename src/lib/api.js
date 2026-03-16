import axios from 'axios'
import { supabase } from './supabase-auth'
import useAuthStore from './auth-store'

// Create axios instance with default config
const api = axios.create({
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to attach Supabase session token and org context
api.interceptors.request.use(
  async (config) => {
    console.log('[API Request]', config.method?.toUpperCase(), config.url)
    
    // Get Supabase session and add to Authorization header
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    // Get auth state for organization/project context headers
    const state = useAuthStore.getState()
    
    // Check if this is an agency org (Sonor) - agency orgs should NOT filter by org
    const isAgencyOrg = state.currentOrg?.org_type === 'agency'
    
    // X-Organization-Id: The business entity (GWA LLC) - for org-level services (billing, proposals)
    // Only send for CLIENT orgs, not agency org (Sonor sees all data)
    if (state.currentOrg?.id && !isAgencyOrg) {
      config.headers['X-Organization-Id'] = state.currentOrg.id
    }
    
    // X-Project-Id: The specific project (GWA NextJS Site) - for project-level tools (CRM, SEO, Blog)
    if (state.currentProject?.id) {
      config.headers['X-Project-Id'] = state.currentProject.id
      // Also set the project's org_id for tables that use org_id
      if (state.currentProject.org_id) {
        config.headers['X-Tenant-Org-Id'] = state.currentProject.org_id
      }
    }
    
    // Fallback: Check localStorage for backward compatibility
    if (!config.headers['X-Organization-Id'] && !config.headers['X-Project-Id']) {
      const storedTenantProject = localStorage.getItem('currentTenantProject')
      if (storedTenantProject) {
        try {
          const project = JSON.parse(storedTenantProject)
          config.headers['X-Organization-Id'] = project.org_id || project.org_id || project.id
          config.headers['X-Project-Id'] = project.id
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Add response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status)
    return response
  },
  async (error) => {
    // Log the error details
    console.error('[API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    })
    
    // If we get a 401, the session has expired or is invalid
    if (error.response?.status === 401) {
      console.error('[API] 401 Unauthorized - Session expired or invalid')
      
      // Check if we're on an auth page already
      const isOnAuthPage = window.location.pathname.includes('/login') ||
                           window.location.pathname.includes('/reset-password') ||
                           window.location.pathname.includes('/auth/')
      
      if (!isOnAuthPage) {
        // Try to refresh the session first
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
        
        if (!session || refreshError) {
          console.log('[API] Session expired, redirecting to login')
          window.location.href = '/login'
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default api