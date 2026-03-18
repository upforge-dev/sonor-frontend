import { Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSignalTier } from '@/hooks/useSignalTier'

interface SignalUpgradePromptProps {
  /** Feature name shown in the prompt, e.g. "Echo AI", "Inline Generation" */
  feature: string
  /** Optional longer description of what the feature does */
  description?: string
  /** Visual variant: inline (small badge), card (glass panel), banner (full-width bar) */
  variant?: 'inline' | 'card' | 'banner'
  /** Additional CSS classes */
  className?: string
  /** Minimum plan tier required for this feature */
  requiredTier?: 'limited_ai' | 'full_signal'
}

/**
 * Consistent upgrade prompt shown when users attempt to use an AI feature
 * that their current plan does not include.
 *
 * Renders nothing if the user already has access to the required tier.
 */
export function SignalUpgradePrompt({
  feature,
  description,
  variant = 'card',
  className,
  requiredTier = 'limited_ai',
}: SignalUpgradePromptProps) {
  const navigate = useNavigate()
  const { plan, hasSignalAI, hasFullSignal } = useSignalTier()

  // Determine if the user already meets the required tier
  const hasAccess =
    requiredTier === 'limited_ai' ? hasSignalAI : hasFullSignal

  // If user already has access, render nothing
  if (hasAccess) return null

  // Build the upgrade path based on required tier
  const upgradePath = `/billing?upgrade=${requiredTier}`

  // Determine the label based on current plan and required tier
  const upgradeLabel =
    plan === 'standard' && requiredTier === 'limited_ai'
      ? 'Upgrade to Signal AI'
      : plan === 'standard' && requiredTier === 'full_signal'
        ? 'Upgrade to Full Signal'
        : 'Upgrade to Full Signal'

  const handleUpgrade = () => {
    navigate(upgradePath)
  }

  // --- Inline variant: compact badge ---
  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleUpgrade}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
          'transition-all duration-200 cursor-pointer',
          'hover:scale-[1.02] active:scale-[0.98]',
          className
        )}
        style={{
          background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
          color: 'var(--brand-primary)',
          border: '1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)',
        }}
      >
        <Sparkles size={12} />
        <span>Upgrade for {feature}</span>
      </button>
    )
  }

  // --- Banner variant: full-width bar ---
  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 px-5 py-3 rounded-lg',
          className
        )}
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {feature} requires {requiredTier === 'full_signal' ? 'Full Signal' : 'Signal AI'}
            </p>
            {description && (
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleUpgrade}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg',
            'text-sm font-medium text-white',
            'transition-all duration-200 cursor-pointer',
            'hover:brightness-110 active:scale-[0.98]'
          )}
          style={{ background: 'var(--brand-primary)' }}
        >
          {upgradeLabel}
          <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  // --- Card variant (default): glass panel with icon, text, and CTA ---
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center gap-4 p-6 rounded-xl',
        className
      )}
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl"
        style={{
          background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
        }}
      >
        <Sparkles size={24} style={{ color: 'var(--brand-primary)' }} />
      </div>

      <div className="space-y-1.5">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {feature}
        </h3>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description ||
            `${feature} is available on the ${requiredTier === 'full_signal' ? 'Full Signal' : 'Signal AI'} plan.`}
        </p>
      </div>

      <button
        type="button"
        onClick={handleUpgrade}
        className={cn(
          'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg',
          'text-sm font-medium text-white',
          'transition-all duration-200 cursor-pointer',
          'hover:brightness-110 hover:shadow-lg active:scale-[0.98]'
        )}
        style={{
          background: 'var(--brand-primary)',
          boxShadow: '0 2px 8px color-mix(in srgb, var(--brand-primary) 30%, transparent)',
        }}
      >
        <Sparkles size={16} />
        {upgradeLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  )
}
