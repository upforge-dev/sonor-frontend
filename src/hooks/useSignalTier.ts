import useAuthStore from '@/lib/auth-store'

type Plan = 'standard' | 'limited_ai' | 'full_signal'

interface SignalTier {
  /** Current project plan */
  plan: Plan
  /** True for limited_ai or full_signal */
  hasSignalAI: boolean
  /** True for full_signal only */
  hasFullSignal: boolean
  /** True for standard only */
  isStandard: boolean
  /** True for limited_ai or full_signal — Echo chat access */
  canUseEcho: boolean
  /** True for limited_ai or full_signal — inline AI content generation */
  canUseInlineGenerate: boolean
  /** True for limited_ai or full_signal — contextual AI suggestions */
  canUseSuggestions: boolean
  /** True for full_signal only — natural language commands and queries */
  canUseNaturalLanguage: boolean
  /** True for full_signal only — A/B experiments via SignalBridge */
  canUseExperiments: boolean
  /** True for full_signal only (limited_ai gets basic copilot) */
  canUseCopilot: boolean
  /** User-facing label for the upgrade CTA */
  upgradeLabel: string
  /** Route to navigate for upgrade */
  upgradePath: string
}

/**
 * Hook that reads the current project's Signal AI plan and returns
 * granular feature-access flags.
 *
 * Uses the same plan source as useSignalAccess (currentProject.plan from auth-store)
 * but provides a more detailed feature matrix aligned with the three-tier plan model.
 */
export function useSignalTier(): SignalTier {
  const currentProject = useAuthStore((state) => state.currentProject)

  const plan: Plan = (currentProject?.plan as Plan) || 'standard'

  const hasSignalAI = plan === 'limited_ai' || plan === 'full_signal'
  const hasFullSignal = plan === 'full_signal'
  const isStandard = plan === 'standard'

  // limited_ai and full_signal both unlock Echo, inline generation, and suggestions
  const canUseEcho = hasSignalAI
  const canUseInlineGenerate = hasSignalAI
  const canUseSuggestions = hasSignalAI

  // full_signal exclusives
  const canUseNaturalLanguage = hasFullSignal
  const canUseExperiments = hasFullSignal
  const canUseCopilot = hasFullSignal

  // Determine upgrade messaging based on current plan
  let upgradeLabel: string
  let upgradePath: string

  if (isStandard) {
    upgradeLabel = 'Upgrade to Signal AI'
    upgradePath = '/billing?upgrade=limited_ai'
  } else if (plan === 'limited_ai') {
    upgradeLabel = 'Upgrade to Full Signal'
    upgradePath = '/billing?upgrade=full_signal'
  } else {
    // Already on full_signal — no upgrade needed
    upgradeLabel = ''
    upgradePath = ''
  }

  return {
    plan,
    hasSignalAI,
    hasFullSignal,
    isStandard,
    canUseEcho,
    canUseInlineGenerate,
    canUseSuggestions,
    canUseNaturalLanguage,
    canUseExperiments,
    canUseCopilot,
    upgradeLabel,
    upgradePath,
  }
}
