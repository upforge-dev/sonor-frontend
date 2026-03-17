/**
 * PlanSelector — Reusable plan tier picker
 *
 * Used in:
 * - NewProjectModal Step 4 (project activation)
 * - SubscriptionTab (change project plan)
 * - ProjectPlanChange dialog
 */
import React from 'react'
import { cn } from '@/lib/utils'
import { Check, Zap, Brain, Sparkles } from 'lucide-react'

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    icon: Zap,
    color: 'text-blue-500',
    features: ['SEO', 'Analytics', 'Forms', 'Blog', 'Commerce', 'Reputation', 'Engage'],
    excluded: ['No AI features'],
  },
  {
    id: 'limited_ai',
    name: 'Limited AI',
    icon: Brain,
    color: 'text-purple-500',
    features: ['Everything in Standard', 'Echo AI', 'Signal insights', 'Basic Copilot'],
    excluded: [],
  },
  {
    id: 'full_signal',
    name: 'Full Signal AI',
    icon: Sparkles,
    color: 'text-amber-500',
    features: ['Everything in Limited AI', 'Full Echo AI', 'Full Signal AI', 'Full Copilot', 'A/B Experiments'],
    excluded: [],
  },
]

/** Agency per-project prices */
const AGENCY_PRICES = {
  standard: '$49',
  limited_ai: '$124',
  full_signal: '$249',
}

/** Independent business prices */
const INDEPENDENT_PRICES = {
  standard: '$99',
  limited_ai: '$249',
  full_signal: '$499',
}

export default function PlanSelector({
  value,
  onChange,
  isAgency = false,
  disabled = false,
  compact = false,
}) {
  const prices = isAgency ? AGENCY_PRICES : INDEPENDENT_PRICES

  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
      {PLANS.map((plan) => {
        const isSelected = value === plan.id
        const Icon = plan.icon

        return (
          <button
            key={plan.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(plan.id)}
            className={cn(
              'relative flex flex-col rounded-lg border-2 p-4 text-left transition-all',
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('h-5 w-5', plan.color)} />
              <span className="font-semibold text-sm">{plan.name}</span>
            </div>

            <div className="text-lg font-bold mb-3">
              {prices[plan.id]}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </div>

            {!compact && (
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground/50 flex items-center gap-1">
                    <span className="h-3 w-3 shrink-0 text-center">-</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { PLANS, AGENCY_PRICES, INDEPENDENT_PRICES }
