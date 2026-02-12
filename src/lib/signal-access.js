/**
 * Signal Access Hooks
 * 
 * Signal AI can be enabled at:
 * 1. Organization level (signal_enabled) - all projects get Signal
 * 2. Project level (features includes 'signal') - specific project has Signal
 * 
 * Access is restricted if:
 * - Neither org nor project has Signal enabled
 * - Org has an unpaid Signal invoice > 15 days overdue
 * 
 * @see supabase/migrations/20260122_signal_usage_invoicing.sql
 */

import useAuthStore from './auth-store'

/**
 * Get the current user's Signal access context.
 * Checks both org-level and project-level Signal settings.
 * 
 * @returns {SignalAccessContext}
 */
export const useSignalAccess = () => {
  const currentOrg = useAuthStore(state => state.currentOrg)
  const currentProject = useAuthStore(state => state.currentProject)
  const availableProjects = useAuthStore(state => state.availableProjects)
  const accessLevel = useAuthStore(state => state.accessLevel) // 'organization' | 'project'
  const isSuperAdmin = useAuthStore(state => state.isSuperAdmin)
  const user = useAuthStore(state => state.user)
  
  // Check if user is an admin (superAdmin or admin role)
  const isAdmin = isSuperAdmin || user?.role === 'admin'
  
  // Check if Signal is enabled at org level
  const orgSignalEnabled = currentOrg?.signal_enabled || currentOrg?.signalEnabled || false
  
  // Check if Signal is enabled at project level
  // Two sources: projects.signal_enabled boolean OR legacy features array
  const projectFeatures = currentProject?.features || []
  const projectSignalEnabled = currentProject?.signal_enabled === true
    || (Array.isArray(projectFeatures) && projectFeatures.includes('signal'))
  
  // Check if org is restricted due to unpaid invoice
  const isRestricted = currentOrg?.is_access_restricted === true
  
  // Access granted if Signal is enabled at org OR project level, AND not restricted
  const hasAccess = (orgSignalEnabled || projectSignalEnabled) && !isRestricted
  
  return {
    // Core access flags - Based on org OR project signal setting
    hasAccess,                      // User has Signal access (enabled + not restricted)
    hasOrgSignal: orgSignalEnabled, // Signal enabled at org level
    hasCurrentProjectSignal: projectSignalEnabled || orgSignalEnabled, // Signal for current project
    isAdmin,                        // Is admin with override access
    isRestricted,                   // Org is restricted for unpaid invoice
    
    // Legacy flags - now properly check org AND project settings
    orgActuallyHasSignal: orgSignalEnabled,
    projectActuallyHasSignal: projectSignalEnabled || orgSignalEnabled,
    
    // Feature-specific access - depend on org OR project signal
    canUseEcho: hasAccess,          // Echo available if Signal enabled
    canUseSyncSignal: hasAccess,    // Sync Signal available if Signal enabled
    canUseProjectSignal: hasAccess, // Project module AI features available if Signal enabled
    
    // Scope information
    scope: isRestricted ? 'restricted' : (hasAccess ? 'full' : 'disabled'),
    signalEnabledProjects: hasAccess ? (availableProjects || []) : [],
    signalProjectIds: hasAccess ? (availableProjects || []).map(p => p.id) : [],
    
    // Context
    isOrgLevel: accessLevel === 'organization',
    isProjectLevel: accessLevel === 'project',
    currentProjectId: currentProject?.id || null,
    orgId: currentOrg?.id || null,
  }
}

/**
 * Check if a project has the Signal feature enabled.
 * Checks both org-level signal_enabled AND project-level features array.
 * 
 * @param {Object} project - Project object with features
 * @returns {boolean} - True if project or org has Signal enabled
 */
export const hasSignalFeature = (project) => {
  const currentOrg = useAuthStore.getState().currentOrg
  const orgSignalEnabled = currentOrg?.signal_enabled || currentOrg?.signalEnabled || false
  
  // Check project features array
  const projectFeatures = project?.features || []
  const projectSignalEnabled = Array.isArray(projectFeatures) && projectFeatures.includes('signal')
  
  return orgSignalEnabled || projectSignalEnabled
}

/**
 * Get detailed Signal status for UI display.
 * Now primarily used to show billing/restriction status.
 * 
 * @returns {SignalStatus}
 */
export const useSignalStatus = () => {
  const { hasAccess, isRestricted, orgId } = useSignalAccess()
  const currentOrg = useAuthStore(state => state.currentOrg)
  const currentProject = useAuthStore(state => state.currentProject)
  
  // Org is restricted due to unpaid invoice
  if (isRestricted) {
    return {
      enabled: false,
      reason: 'unpaid_invoice',
      scope: 'restricted',
      canUpgrade: false,
      message: 'Portal access is restricted due to an unpaid Signal invoice. Please pay to restore access.',
      invoiceUrl: `/billing?org=${orgId}`, // Link to billing page
    }
  }
  
  // Normal access - Signal enabled for all
  return {
    enabled: true,
    reason: 'enabled_for_all',
    scope: 'full',
    tier: 'usage_based',
    message: 'Signal AI is active. Usage is tracked and billed monthly.',
  }
}

/**
 * Get list of project IDs that have Signal enabled.
 * Now returns all projects since Signal is enabled for all.
 * 
 * @returns {string[]} Array of project IDs with Signal access
 */
export const useSignalEnabledProjectIds = () => {
  const availableProjects = useAuthStore(state => state.availableProjects)
  // All projects have Signal now
  return (availableProjects || []).map(p => p.id)
}

/**
 * Check if Echo AI should be visible in the current context.
 * Echo is now available for everyone (unless restricted for unpaid invoice).
 * 
 * @returns {boolean}
 */
export const useEchoAccess = () => {
  const { canUseEcho } = useSignalAccess()
  return canUseEcho
}

/**
 * Check if Sync Signal integration should be available.
 * Sync Signal is now available for everyone (unless restricted for unpaid invoice).
 * 
 * @returns {boolean}
 */
export const useSyncSignalAccess = () => {
  const { canUseSyncSignal } = useSignalAccess()
  return canUseSyncSignal
}

/**
 * Get Echo configuration for the current context.
 * Used when initializing Echo conversations.
 * 
 * @returns {EchoConfig}
 */
export const useEchoConfig = () => {
  const { 
    hasAccess,
    isRestricted,
    currentProjectId,
    orgId,
  } = useSignalAccess()
  
  if (!hasAccess) {
    return {
      available: false,
      scope: isRestricted ? 'restricted' : 'none',
      projectIds: [],
      restrictedReason: isRestricted ? 'unpaid_invoice' : undefined,
    }
  }
  
  return {
    available: true,
    scope: 'full',
    orgId,
    currentProjectId,
    projectIds: null, // null = all projects
  }
}

/**
 * Higher-order component wrapper for Signal-gated features.
 * Now primarily checks for billing restrictions rather than feature access.
 * 
 * @param {React.Component} WrappedComponent 
 * @param {Object} options - { fallback: React.Component }
 */
export const withSignalAccess = (WrappedComponent, options = {}) => {
  const { fallback: Fallback = null } = options
  
  return function SignalGatedComponent(props) {
    const { hasAccess, isRestricted } = useSignalAccess()
    const React = require('react')
    const { createElement } = React
    
    if (!hasAccess) {
      return Fallback 
        ? createElement(Fallback, { ...props, isRestricted }) 
        : null
    }
    
    return createElement(WrappedComponent, props)
  }
}

/**
 * Hook to check if the org has any billing restrictions.
 * Used to show payment prompts in the UI.
 * 
 * @returns {BillingRestriction}
 */
export const useSignalBillingStatus = () => {
  const currentOrg = useAuthStore(state => state.currentOrg)
  
  return {
    isRestricted: currentOrg?.is_access_restricted === true,
    restrictionReason: currentOrg?.restriction_reason || null,
    invoiceId: currentOrg?.overdue_invoice_id || null,
    daysOverdue: currentOrg?.days_overdue || null,
  }
}

// Type definitions for documentation
/**
 * @typedef {Object} SignalAccessContext
 * @property {boolean} hasAccess - User has Signal access (false only if restricted for unpaid invoice)
 * @property {boolean} hasOrgSignal - Always true now (Signal enabled for all)
 * @property {boolean} hasCurrentProjectSignal - Always true now
 * @property {boolean} isAdmin - Is admin
 * @property {boolean} isRestricted - Org is restricted for unpaid invoice
 * @property {boolean} canUseEcho - Can use Echo chat
 * @property {boolean} canUseSyncSignal - Can use Sync Signal integration
 * @property {boolean} canUseProjectSignal - Can use Signal in project modules
 * @property {'restricted'|'full'} scope - Access scope level
 * @property {Object[]} signalEnabledProjects - All projects (Signal enabled for all)
 * @property {string[]} signalProjectIds - All project IDs
 * @property {boolean} isOrgLevel - User is org-level
 * @property {boolean} isProjectLevel - User is project-level only
 * @property {string|null} currentProjectId
 * @property {string|null} orgId
 */

/**
 * @typedef {Object} SignalStatus
 * @property {boolean} enabled - Signal is enabled
 * @property {string} reason - Why enabled/disabled
 * @property {'restricted'|'full'} scope
 * @property {string} [tier] - 'usage_based'
 * @property {boolean} [canUpgrade] - N/A now
 * @property {string} message - Human-readable status message
 * @property {string} [invoiceUrl] - Link to pay invoice if restricted
 */

/**
 * @typedef {Object} EchoConfig
 * @property {boolean} available - Echo is available
 * @property {'restricted'|'full'|'none'} scope
 * @property {string} [orgId]
 * @property {string} [currentProjectId]
 * @property {string[]|null} projectIds - null = all projects
 * @property {string} [restrictedReason] - If restricted
 */

/**
 * @typedef {Object} BillingRestriction
 * @property {boolean} isRestricted - Org is restricted
 * @property {string|null} restrictionReason - Why restricted
 * @property {string|null} invoiceId - Overdue invoice ID
 * @property {number|null} daysOverdue - How many days overdue
 */
