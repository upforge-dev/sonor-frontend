/**
 * Signal Access Hooks
 *
 * Signal AI access is determined by project plan:
 * - 'limited_ai' or 'full_signal' = Signal enabled
 * - 'standard' = no Signal access
 *
 * Access is per-project only. There is no org-level signal toggle.
 */

import useAuthStore from './auth-store'

/**
 * Check if a project has a Signal-enabled plan.
 * @param {Object} project
 * @returns {boolean}
 */
const isSignalPlan = (project) => {
  const plan = project?.plan
  return plan === 'limited_ai' || plan === 'full_signal'
}

/**
 * Get the current user's Signal access context.
 * Checks project plan for Signal eligibility.
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

  // Check if current project has a Signal-enabled plan
  const hasCurrentProjectSignal = isSignalPlan(currentProject)

  // Signal access based on current project's plan
  const hasAccess = hasCurrentProjectSignal

  // Get all signal-enabled projects
  const signalProjects = (availableProjects || []).filter(isSignalPlan)

  return {
    // Core access flags
    hasAccess,
    hasOrgSignal: false, // Org-level signal no longer exists
    hasCurrentProjectSignal,
    isAdmin,
    isRestricted: false, // Billing restriction removed

    // Legacy compat flags — now based on project plan
    orgActuallyHasSignal: false,
    projectActuallyHasSignal: hasCurrentProjectSignal,

    // Feature-specific access — depend on project plan
    canUseEcho: hasAccess,
    canUseSyncSignal: hasAccess,
    canUseProjectSignal: hasAccess,

    // Scope information
    scope: hasAccess ? 'full' : 'disabled',
    signalEnabledProjects: signalProjects,
    signalProjectIds: signalProjects.map(p => p.id),

    // Context
    isOrgLevel: accessLevel === 'organization',
    isProjectLevel: accessLevel === 'project',
    currentProjectId: currentProject?.id || null,
    orgId: currentOrg?.id || null,

    // Plan info
    currentPlan: currentProject?.plan || 'standard',
    isFullSignal: currentProject?.plan === 'full_signal',
    isLimitedAi: currentProject?.plan === 'limited_ai',
  }
}

/**
 * Check if a project has the Signal feature enabled via its plan.
 *
 * @param {Object} project - Project object with plan field
 * @returns {boolean}
 */
export const hasSignalFeature = (project) => {
  return isSignalPlan(project)
}

/**
 * Get detailed Signal status for UI display.
 *
 * @returns {SignalStatus}
 */
export const useSignalStatus = () => {
  const { hasAccess, currentPlan } = useSignalAccess()

  if (!hasAccess) {
    return {
      enabled: false,
      reason: 'plan_not_eligible',
      scope: 'disabled',
      canUpgrade: true,
      message: 'Upgrade to Limited AI or Full Signal plan to enable AI features.',
    }
  }

  return {
    enabled: true,
    reason: 'plan_enabled',
    scope: 'full',
    tier: currentPlan,
    message: currentPlan === 'full_signal'
      ? 'Full Signal AI is active — all AI features enabled.'
      : 'Limited AI is active — core AI features enabled.',
  }
}

/**
 * Get list of project IDs that have Signal enabled.
 * Only returns projects with limited_ai or full_signal plans.
 *
 * @returns {string[]}
 */
export const useSignalEnabledProjectIds = () => {
  const availableProjects = useAuthStore(state => state.availableProjects)
  return (availableProjects || []).filter(isSignalPlan).map(p => p.id)
}

/**
 * Check if Echo AI should be visible in the current context.
 * Requires limited_ai or full_signal plan.
 *
 * @returns {boolean}
 */
export const useEchoAccess = () => {
  const { canUseEcho } = useSignalAccess()
  return canUseEcho
}

/**
 * Check if Sync Signal integration should be available.
 * Requires limited_ai or full_signal plan.
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
    currentProjectId,
    orgId,
    signalProjectIds,
  } = useSignalAccess()

  if (!hasAccess) {
    return {
      available: false,
      scope: 'none',
      projectIds: [],
    }
  }

  return {
    available: true,
    scope: 'full',
    orgId,
    currentProjectId,
    projectIds: signalProjectIds,
  }
}

/**
 * Higher-order component wrapper for Signal-gated features.
 * Gates on project plan (limited_ai or full_signal).
 *
 * @param {React.Component} WrappedComponent
 * @param {Object} options - { fallback: React.Component }
 */
export const withSignalAccess = (WrappedComponent, options = {}) => {
  const { fallback: Fallback = null } = options

  return function SignalGatedComponent(props) {
    const { hasAccess } = useSignalAccess()
    const React = require('react')
    const { createElement } = React

    if (!hasAccess) {
      return Fallback
        ? createElement(Fallback, props)
        : null
    }

    return createElement(WrappedComponent, props)
  }
}

/**
 * Hook to check billing status.
 * Billing restriction (unpaid invoice) no longer exists.
 * Kept for API compatibility — always returns not restricted.
 *
 * @returns {BillingRestriction}
 */
export const useSignalBillingStatus = () => {
  return {
    isRestricted: false,
    restrictionReason: null,
    invoiceId: null,
    daysOverdue: null,
  }
}
