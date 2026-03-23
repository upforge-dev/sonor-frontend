/**
 * ConversionFunnel - Visual funnel showing visitor journey
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Users, Zap, Target } from 'lucide-react'
import { useBrandColors } from '@/hooks/useBrandColors'

const defaultFormatNumber = (num) => {
  if (!num && num !== 0) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

const FUNNEL_STEPS = [
  { key: 'uniqueVisitors', label: 'Visitors', icon: Users, description: 'Unique visitors' },
  { key: 'engagedSessions', label: 'Engaged', icon: Zap, description: 'Active sessions' },
  { key: 'conversions', label: 'Conversions', icon: Target, description: 'Goal completions' },
]

export function ConversionFunnel({
  data = {},
  isLoading = false,
  formatNumber = defaultFormatNumber,
}) {
  const { primary } = useBrandColors()

  const baseValue = data.uniqueVisitors || data.pageViews || 1

  const steps = FUNNEL_STEPS.map((step, index) => {
    const value = data[step.key] || 0
    const percentage = baseValue > 0 ? (value / baseValue) * 100 : 0
    const prevValue = index > 0 ? (data[FUNNEL_STEPS[index - 1].key] || 0) : value
    const dropOff = index > 0 ? prevValue - value : 0
    const dropOffPct = prevValue > 0 ? (dropOff / prevValue) * 100 : 0
    return { ...step, value, percentage, dropOff, dropOffPct, width: Math.max(40, percentage) }
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-72">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  const conversionRate = baseValue > 0 ? ((data.conversions || 0) / baseValue) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Conversion Funnel</CardTitle>
        <CardDescription>Visitor journey from arrival to conversion</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col items-center gap-0">
          {steps.map((step, index) => {
            const Icon = step.icon
            const opacity = 1 - index * 0.25

            return (
              <div key={step.key} className="w-full flex flex-col items-center">
                {/* Drop-off connector */}
                {index > 0 && (
                  <div className="flex items-center gap-3 py-2 w-full justify-center">
                    <div className="h-px flex-1 bg-[var(--glass-border)]" />
                    {step.dropOff > 0 ? (
                      <span className="text-xs font-medium text-red-400 whitespace-nowrap">
                        ↓ {formatNumber(step.dropOff)} dropped ({step.dropOffPct.toFixed(0)}%)
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">—</span>
                    )}
                    <div className="h-px flex-1 bg-[var(--glass-border)]" />
                  </div>
                )}

                {/* Funnel bar */}
                <div
                  className="rounded-xl overflow-hidden transition-all duration-500 w-full"
                  style={{
                    maxWidth: `${step.width}%`,
                  }}
                >
                  <div
                    className="px-5 py-4 flex items-center justify-between gap-4"
                    style={{
                      backgroundColor: primary,
                      opacity,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-white/20 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{step.label}</p>
                        <p className="text-xs text-white/70">{step.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {formatNumber(step.value)}
                      </p>
                      <p className="text-xs text-white/70 tabular-nums">{step.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Conversion rate summary */}
        <div className="pt-5 mt-5 border-t border-[var(--glass-border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">Overall Conversion Rate</span>
          <span className="text-xl font-bold" style={{ color: primary }}>
            {conversionRate.toFixed(2)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConversionFunnel
