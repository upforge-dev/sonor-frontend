import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, getCurrentUser, getSession, signOut, signInWithPassword, signUp as supabaseSignUp } from './supabase-auth'
import axios from 'axios'
import { authApi, adminApi } from './sonor-api'

// Global flag to prevent multiple simultaneous auth checks
let isCheckingAuth = false
let authCheckPromise = null

// Configure axios to include organization/project headers and auth token
// 
// Two-tier context:
// - X-Organization-Id: The business entity (GWA LLC) - for org-level services
// - X-Project-Id: The specific project (GWA NextJS Site) - for project-level tools
//
// When in PROJECT context: Both headers are set
// When in ORG-only context: Only X-Organization-Id is set
axios.interceptors.request.use(async config => {
  const state = useAuthStore.getState()
  
  // Add organization ID header (for org-level services: billing, messages, proposals, files)
  if (state.currentOrg?.id) {
    config.headers['X-Organization-Id'] = state.currentOrg.id
  }
  
  // Add project ID header (for project-level tools: CRM, SEO, Ecommerce, Blog, Analytics)
  // When in a project context, this is the project.id
  // Project-level data uses this for filtering (contacts.org_id, seo_sites.org_id, etc.)
  if (state.currentProject?.id) {
    config.headers['X-Project-Id'] = state.currentProject.id
    // Also set org_id to the project's organization for legacy compatibility
    // Many tables use org_id which should be the project's org_id (same as org_id)
    if (state.currentProject.org_id) {
      config.headers['X-Tenant-Org-Id'] = state.currentProject.org_id
    }
  }
  
  // Add auth token
  try {
    const { data } = await getSession()
    if (data?.session?.access_token) {
      config.headers['Authorization'] = `Bearer ${data.session.access_token}`
    }
  } catch (error) {
    console.error('Failed to get session for axios request:', error)
  }
  
  return config
}, error => {
  return Promise.reject(error)
})

// Supabase Auth integration with multi-tenant support
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      // Multi-tenant state - Two-tier hierarchy
      // Organization = business entity (e.g., "Garcia's Welding LLC")
      // Project = web app/site under org (e.g., "GWA NextJS Site")
      currentOrg: null,        // The organization context
      currentProject: null,    // The project context (if viewing a specific project)
      availableOrgs: [],       // Organizations the user belongs to
      availableProjects: [],   // Projects under the current organization
      managedOrgs: [],         // Client orgs managed by this agency (for agency users)
      isSuperAdmin: false,
      accessLevel: null,       // 'organization' (full access) or 'project' (limited)

      // Set user data (session verified via cookie)
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null
        })
      },

      // Merge partial user data into current user (e.g. after PATCH contact)
      updateUser: (data) => {
        const current = get().user
        if (!current) return
        set({ user: { ...current, ...data } })
      },
      
      // Set organization context
      setOrganization: (org) => {
        set({ currentOrg: org })
      },
      
      // Set project context (within the current organization)
      setProject: (project) => {
        set({ currentProject: project })
        // Also persist to localStorage so it survives hard reloads
        if (project) {
          localStorage.setItem('currentTenantProject', JSON.stringify(project))
        }
      },
      
      // Set available organizations
      setAvailableOrgs: (orgs) => {
        set({ availableOrgs: orgs || [] })
      },
      
      // Set available projects for current organization
      setAvailableProjects: (projects) => {
        set({ availableProjects: projects || [] })
      },
      
      // Set super admin flag
      setSuperAdmin: (isSuperAdmin) => {
        set({ isSuperAdmin })
      },
      
      // Set access level for current org ('organization' or 'project')
      setAccessLevel: (accessLevel) => {
        set({ accessLevel })
      },

      // Clear authentication data
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          currentOrg: null,
          currentProject: null,
          availableOrgs: [],
          availableProjects: [],
          managedOrgs: [],
          isSuperAdmin: false,
          accessLevel: null
        })
      },

      // Check if user is authenticated (verify Supabase session + fetch contacts data)
      checkAuth: async () => {
        // DEV BYPASS: Skip auth check if we have a dev-bypass user
        const currentUser = get().user
        if (currentUser?.id === 'dev-bypass') {
          console.log('[AuthStore] Dev bypass user detected, skipping auth check');
          set({ isLoading: false })
          return { success: true, user: currentUser }
        }
        
        // If already checking, return the existing promise
        if (isCheckingAuth && authCheckPromise) {
          console.log('[AuthStore] Auth check already in progress, returning existing promise');
          return authCheckPromise
        }
        
        console.log('[AuthStore] Checking authentication');
        isCheckingAuth = true
        set({ isLoading: true, error: null })
        
        authCheckPromise = (async () => {
          try {
            // Check Supabase session
            const { data: { session }, error: sessionError } = await getSession()
            
            if (sessionError || !session) {
              console.log('[AuthStore] No active Supabase session');
              get().clearAuth()
              set({ isLoading: false })
              return { success: false }
            }

            // Fetch user data from contacts table
            const contactUser = await getCurrentUser()
            console.log('[AuthStore checkAuth] getCurrentUser returned:', contactUser?.email, 'org_id:', contactUser?.org_id)
            
            if (contactUser) {
              console.log('[AuthStore] Auth verification successful, user:', contactUser.email);
              get().setUser(contactUser)
              
              // Fetch organization context from backend
              await get().fetchOrganizationContext(session.access_token)
              
              set({ isLoading: false })
              return { success: true, user: contactUser }
            } else {
              // SECURITY: User has a Supabase session but no contact record
              // This means they shouldn't have access - sign them out completely
              console.warn('[AuthStore] No matching contact found for auth user - signing out');
              try {
                await signOut()
              } catch (signOutErr) {
                console.error('[AuthStore] Error signing out orphan session:', signOutErr)
              }
              get().clearAuth()
              set({ isLoading: false })
              return { success: false, error: 'Account not found in system. Please contact support.' }
            }
          } catch (error) {
            console.error('[AuthStore] Auth verification error:', error);
            get().clearAuth()
            set({ isLoading: false, error: error.message })
            return { success: false, error: error.message }
          } finally {
            isCheckingAuth = false
            authCheckPromise = null
          }
        })()
        
        return authCheckPromise
      },
      
      // Fetch organization context from backend
      fetchOrganizationContext: async (accessToken) => {
        try {
          // Check if we have stored contexts
          const storedOrg = localStorage.getItem('currentOrganization')
          const storedProject = localStorage.getItem('currentTenantProject')
          
          // Restore org context first (parent org)
          if (storedOrg) {
            try {
              const org = JSON.parse(storedOrg)
              console.log('[AuthStore] Restoring org context:', org.name)
              set({ currentOrg: org })
            } catch (e) {
              console.error('[AuthStore] Failed to parse stored org:', e)
              localStorage.removeItem('currentOrganization')
            }
          }
          
          // Restore project context if exists (in addition to org)
          if (storedProject) {
            try {
              const project = JSON.parse(storedProject)
              console.log('[AuthStore] Restoring project context:', project.title)

              // If cached project is missing plan field, it's stale (pre-plan-propagation).
              // Clear cache and skip restore — the fresh /auth/me fetch will auto-select with full data.
              if (!project.plan) {
                console.log('[AuthStore] Stale project cache (missing plan), clearing — will re-select from API')
                localStorage.removeItem('currentTenantProject')
                throw new Error('stale_cache') // Jump to catch → skip setting stale context
              }

              // Build project context (logo lives on project.logo_url from settings, not theme)
              const projectContext = {
                id: project.id,
                name: project.title,
                domain: project.domain,
                plan: project.plan || 'standard',
                features: project.features || [],
                brand_primary: project.brand_primary,
                logo_url: project.logo_url ?? null,
                theme: {
                  primaryColor: project.brand_primary || project.theme?.primaryColor || '#4bbf39',
                  logoUrl: project.logo_url || project.theme?.logoUrl,
                  faviconUrl: project.favicon_url || project.theme?.faviconUrl
                },
                isProjectTenant: true,
                org_id: project.org_id
              }
              
              set({
                currentProject: projectContext,
                isSuperAdmin: true // Admin who switched to project
              })
            } catch (e) {
              if (e?.message !== 'stale_cache') {
                console.error('[AuthStore] Failed to parse stored project:', e)
              }
              localStorage.removeItem('currentTenantProject')
            }
          }
          
          // Fetch fresh context from Portal API
          // Pass the stored org ID so backend returns projects for the correct org
          const currentOrgId = get().currentOrg?.id
          console.log('[AuthStore] About to call authApi.getMe() with orgId:', currentOrgId)
          const response = await authApi.getMe(currentOrgId)
          
          console.log('[AuthStore] FULL auth-me response:', response)
          console.log('[AuthStore] Response data:', response.data)
          
          let { organization, availableOrgs, managedOrgs, projects, isSuperAdmin, accessLevel } = response.data

          console.log('[AuthStore] auth-me response - org:', organization?.name, 'projects:', projects?.length, 'isSuperAdmin:', isSuperAdmin, 'accessLevel:', accessLevel, 'managedOrgs:', managedOrgs?.length)

          // Always set isSuperAdmin, accessLevel, and managedOrgs, even if no org context
          set({
            isSuperAdmin: isSuperAdmin || false,
            accessLevel: accessLevel || 'organization', // Default to org-level for backwards compatibility
            managedOrgs: managedOrgs || [],
          })
          
          // If admin/superAdmin has no org context, automatically set them to Sonor org
          if (!organization && (isSuperAdmin || get().user?.role === 'admin')) {
            console.log('[AuthStore] Admin with no org - fetching Sonor org')
            const allOrgs = await get().fetchAllOrganizations()
            const uptradeOrg = allOrgs?.find(org =>
              org.org_type === 'agency'
            )
            
            if (uptradeOrg) {
              console.log('[AuthStore] Auto-setting admin to Sonor org')
              set({ currentOrg: uptradeOrg })
              localStorage.setItem('currentOrganization', JSON.stringify(uptradeOrg))
              return // Early return, no need to process further
            }
          }
          
          if (organization) {
            // Use the org from the API response - it's authoritative
            // Only merge with cached if same org (to preserve any extra fields)
            const cachedOrg = get().currentOrg
            let mergedOrg
            
            if (cachedOrg?.id === organization.id) {
              // Same org - merge fresh data into cached (preserves extra fields)
              mergedOrg = { ...cachedOrg, ...organization }
            } else if (cachedOrg) {
              // Different org in cache vs API — trust the cached org (user explicitly switched here).
              // But the projects from getMe are for the API's resolved org, not the cached one.
              // We need to re-fetch projects for the cached org so the project switcher shows the right list.
              console.log('[AuthStore] Cached org differs from API org, keeping cached:', cachedOrg.name, '— re-fetching projects')
              mergedOrg = cachedOrg

              try {
                const switchResponse = await authApi.switchOrg({ organizationId: cachedOrg.id })
                const cachedOrgProjects = switchResponse?.data?.projects || []
                projects = cachedOrgProjects
                console.log('[AuthStore] Re-fetched projects for cached org:', cachedOrgProjects.length)
              } catch (refetchErr) {
                console.warn('[AuthStore] Failed to re-fetch projects for cached org:', refetchErr.message)
                // Fall through with the API projects as best-effort
              }
            } else {
              // No cached org - use fresh from API
              mergedOrg = organization
            }

            set({
              currentOrg: mergedOrg,
              availableOrgs: availableOrgs || [],
              availableProjects: projects || []
            })

            // Update localStorage with merged data
            localStorage.setItem('currentOrganization', JSON.stringify(mergedOrg))

            // If a project is already selected (from cache), refresh plan / logo from fresh API list.
            const selectedProject = get().currentProject
            if (selectedProject?.id && projects?.length) {
              const freshProject = projects.find((p) => p.id === selectedProject.id)
              if (freshProject) {
                const planChanged =
                  freshProject.plan && freshProject.plan !== selectedProject.plan
                const logoChanged =
                  (freshProject.logo_url || null) !== (selectedProject.logo_url ?? selectedProject.theme?.logoUrl ?? null)
                if (planChanged || logoChanged) {
                  if (planChanged) {
                    console.log('[AuthStore] Refreshing stale project plan:', selectedProject.plan, '->', freshProject.plan)
                  }
                  const updatedProject = {
                    ...selectedProject,
                    plan: freshProject.plan || selectedProject.plan,
                    logo_url: freshProject.logo_url ?? selectedProject.logo_url,
                    theme: {
                      ...selectedProject.theme,
                      logoUrl: freshProject.logo_url || selectedProject.theme?.logoUrl,
                    },
                  }
                  set({ currentProject: updatedProject })
                  localStorage.setItem('currentTenantProject', JSON.stringify({ ...freshProject }))
                }
              }
            }
            
            // Auto-select project if:
            // 1. User has exactly one project, OR
            // 2. This is a non-agency org and there's at least one project
            // AND no project is currently selected AND no stored project
            // AND user hasn't explicitly chosen to stay at org level
            const storedProject = localStorage.getItem('currentTenantProject')
            const currentProject = get().currentProject
            const preferOrgView = localStorage.getItem('preferOrgView')
            
            // Clear the preferOrgView flag after reading it (one-time use)
            if (preferOrgView) {
              localStorage.removeItem('preferOrgView')
            }
            
            if (!storedProject && !currentProject && !preferOrgView && projects?.length > 0) {
              // Only skip auto-select for agency orgs with multiple projects
              // null/undefined org_type means regular client org - always auto-select
              const isAgencyWithMultipleProjects = organization.org_type === 'agency' && projects.length > 1
              
              // Auto-select first project unless it's an agency with multiple projects
              if (!isAgencyWithMultipleProjects) {
                const firstProject = projects[0]
                const projectContext = {
                  id: firstProject.id,
                  name: firstProject.title,
                  domain: firstProject.domain,
                  plan: firstProject.plan || 'standard',
                  features: firstProject.features || [],
                  brand_primary: firstProject.brand_primary,
                  logo_url: firstProject.logo_url ?? null,
                  theme: {
                    primaryColor: firstProject.brand_primary || '#4bbf39',
                    logoUrl: firstProject.logo_url || firstProject.theme?.logoUrl
                  },
                  isProjectTenant: true,
                  org_id: organization.id
                }
                
                console.log('[AuthStore] Auto-selecting project:', firstProject.title)
                set({ currentProject: projectContext })
                localStorage.setItem('currentTenantProject', JSON.stringify(firstProject))
              }
            }
          }
        } catch (error) {
          console.error('[AuthStore] ERROR fetching org context:', error)
          console.error('[AuthStore] Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack
          })
          // Not a fatal error - org context is optional during migration
        }
      },
      
      // Switch to a different organization
      // This sets the org context and clears any project context
      switchOrganization: async (organizationId) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await getSession()
          if (!session) throw new Error('Not authenticated')
          
          const response = await authApi.switchOrg({ organizationId })
          
          const { organization, role, isSuperAdmin, projects } = response.data

          // Auto-select first project if available
          const firstProject = (projects || []).length > 0 ? projects[0] : null

          set({
            currentOrg: { ...organization, userRole: role },
            currentProject: firstProject,
            availableProjects: projects || [],
            isSuperAdmin,
            isLoading: false
          })

          // Store project context if auto-selected
          if (firstProject) {
            localStorage.setItem('currentTenantProject', JSON.stringify(firstProject))
          } else {
            localStorage.removeItem('currentTenantProject')
          }
          // Store org context
          localStorage.setItem('currentOrganization', JSON.stringify(organization))
          
          // Reload the page to apply new org context everywhere
          window.location.reload()
          
          return { success: true, organization }
        } catch (error) {
          console.error('[AuthStore] Switch organization error:', error)
          set({ isLoading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },
      
      // Switch to a specific project within the current organization
      // This sets project context while keeping org context
      switchProject: async (projectId) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data: { session } } = await getSession()
          if (!session) throw new Error('Not authenticated')
          
          const response = await authApi.switchOrg({ projectId })
          
          const { organization, project, role, isSuperAdmin, projects } = response.data
          
          // Build the project context from the returned project data
          const projectContext = project ? {
            id: project.id,
            name: project.title,
            domain: project.domain,
            plan: project.plan || 'standard',
            features: project.features || [],
            brand_primary: project.brand_primary,
            logo_url: project.logo_url ?? null,
            theme: {
              primaryColor: project.brand_primary || '#4bbf39',
              logoUrl: project.logo_url || project.theme?.logoUrl,
              faviconUrl: project.favicon_url
            },
            isProjectTenant: true,
            org_id: project.org_id || organization?.id
          } : null
          
          // Use the PARENT organization if returned, otherwise keep current
          // The backend now returns the actual parent org, not the project-as-org
          const orgContext = organization 
            ? { ...organization, userRole: role }
            : get().currentOrg
          
          // Update available projects if the backend returned the sibling project list
          const updates = {
            currentOrg: orgContext,
            currentProject: projectContext,
            isSuperAdmin,
            isLoading: false,
            // Update available projects so the project switcher shows all org projects
            ...(projects ? { availableProjects: projects } : {}),
          }
          
          set(updates)
          
          // Store project context for restoration
          if (project) {
            localStorage.setItem('currentTenantProject', JSON.stringify(project))
            // Clear prefer org view flag since user explicitly selected a project
            localStorage.removeItem('preferOrgView')
          }
          // Store org context (the parent organization)
          if (organization) {
            localStorage.setItem('currentOrganization', JSON.stringify(organization))
          }
          
          // Reload the page to apply new context everywhere
          window.location.reload()
          
          return { success: true, project: projectContext, organization: orgContext }
        } catch (error) {
          console.error('[AuthStore] Switch project error:', error)
          set({ isLoading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },
      
      // Return to admin/organization view (clear project context, keep org)
      exitProjectView: async () => {
        set({ isLoading: true })
        
        // Clear project context but keep org
        localStorage.removeItem('currentTenantProject')
        // Set flag to prevent auto-selecting project on reload
        localStorage.setItem('preferOrgView', 'true')
        
        set({
          currentProject: null,
          isLoading: false
        })
        
        // Reload to show org dashboard (not admin portal)
        window.location.reload()
        
        return { success: true }
      },
      
      // Fetch all organizations (super admin only)
      fetchAllOrganizations: async () => {
        try {
          const response = await adminApi.listOrganizations()
          const data = response.data || response
          
          set({ availableOrgs: data.organizations || [] })
          return data.organizations || []
        } catch (error) {
          console.error('[AuthStore] Fetch all organizations error:', error)
          return []
        }
      },

  // Login function using Supabase Auth
  login: async (email, password, nextPath = '/') => {
    // Clear stale org/project context BEFORE login to prevent sending
    // a previous user's org ID in the X-Organization-Id header
    get().clearAuth()
    set({ isLoading: true, error: null })
    
    try {
      // Use Supabase signInWithPassword
      const { user, session } = await signInWithPassword(email.trim(), password)
      
      if (!session) {
        throw new Error('Login failed - no session returned')
      }
      
      console.log('[AuthStore] Supabase login successful, fetching user data...')
      
      // Fetch user data from contacts table
      const contactUser = await getCurrentUser()
      
      if (contactUser) {
        get().setUser(contactUser)
        set({ isLoading: false })
        
        // Determine redirect based on role
        const redirect = contactUser.role === 'admin' ? '/admin' : (nextPath || '/dashboard')
        return { success: true, redirect }
      } else {
        // SECURITY: User authenticated to Supabase but has no contact record
        // Sign them out immediately to prevent session from persisting
        console.warn('[AuthStore] No contact record for user - signing out')
        try {
          await signOut()
        } catch (signOutErr) {
          console.error('[AuthStore] Error signing out:', signOutErr)
        }
        throw new Error('Account not found in system. Please contact support.')
      }
      
    } catch (error) {
      console.error('[AuthStore] Login error:', error)
      const errorMessage = error.message || 'Login failed'
      set({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false
      })
      return { success: false, error: errorMessage }
    }
  },

  // Logout function (signs out from Supabase)
  logout: async () => {
    try {
      // Invalidate Redis cache on backend before signing out
      await authApi.logout()
    } catch (error) {
      // Don't block logout if cache invalidation fails
      console.warn('Cache invalidation on logout failed:', error)
    }
    
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    get().clearAuth()
    // Redirect to login
    window.location.href = '/login'
  },

  // Sign up function using Supabase Auth
  signup: async (email, password, name, nextPath = '/') => {
    set({ isLoading: true, error: null })
    
    try {
      // Use Supabase signUp
      const { user, session } = await supabaseSignUp(email.trim(), password, { name: name.trim() })
      
      if (!session) {
        // Supabase might require email confirmation
        set({ isLoading: false })
        return { 
          success: true, 
          requiresConfirmation: true,
          message: 'Please check your email to confirm your account.'
        }
      }
      
      console.log('[AuthStore] Supabase signup successful')
      
      // Fetch user data from contacts table
      await get().checkAuth()
      
      set({ isLoading: false })
      return { success: true, redirect: nextPath || '/dashboard' }
      
    } catch (error) {
      console.error('[AuthStore] Signup error:', error)
      const errorMessage = error.message || 'Sign up failed'
      set({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false
      })
      return { success: false, error: errorMessage }
    }
  },

  // Clear error
  clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      // Only persist organization/project context, not sensitive auth data
      partialize: (state) => ({
        currentOrg: state.currentOrg,
        currentProject: state.currentProject,
        isSuperAdmin: state.isSuperAdmin
      })
    }
  )
)

// Custom hook to check if a feature is enabled for current org
export function useOrgFeatures() {
  const currentOrg = useAuthStore((state) => state.currentOrg)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)
  
  return {
    features: currentOrg?.features || {},
    // Check if feature is enabled
    // - For super admins: returns true UNLESS ignoreSuperAdmin is true
    // - For regular users: checks the features object
    hasFeature: (featureKey, options = {}) => {
      const { ignoreSuperAdmin = false } = options
      // Super admins see all features unless explicitly checking raw value
      if (isSuperAdmin && !ignoreSuperAdmin) return true
      return currentOrg?.features?.[featureKey] === true
    },
    // Check raw feature value (ignores super admin override)
    hasFeatureRaw: (featureKey) => {
      return currentOrg?.features?.[featureKey] === true
    },
    orgName: currentOrg?.name || 'Portal',
    orgSlug: currentOrg?.slug,
    orgTheme: currentOrg?.theme || {},
    billingPlan: currentOrg?.billing_plan || currentOrg?.plan || 'free'
  }
}

export default useAuthStore
