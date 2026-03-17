import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Loader2 } from 'lucide-react'
import { useHealth } from '@/lib/hooks/use-platform'
import { EmptyState } from '@/components/EmptyState'

const HEALTH_COLORS = {
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', label: 'Healthy' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', label: 'Warning' },
  at_risk: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20', label: 'At Risk' },
}

function getHealthLevel(score) {
  if (score >= 70) return 'healthy'
  if (score >= 40) return 'warning'
  return 'at_risk'
}

function HealthBadge({ score }) {
  const level = getHealthLevel(score)
  const colors = HEALTH_COLORS[level]
  return (
    <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
      {score} - {colors.label}
    </Badge>
  )
}

function HealthBar({ score }) {
  const level = getHealthLevel(score)
  const barColor = level === 'healthy' ? 'bg-emerald-500' : level === 'warning' ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-2 rounded-full bg-[var(--glass-border)] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-[var(--text-primary)] w-7 text-right">{score}</span>
    </div>
  )
}

export default function HealthScores() {
  const { data, isLoading } = useHealth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={Activity}
        title="No health data"
        description="Tenant health scores will appear here once activity data is available."
      />
    )
  }

  const tenants = data.tenants || data || []

  // Summary counts
  const healthyCount = tenants.filter((t) => getHealthLevel(t.health_score || 0) === 'healthy').length
  const warningCount = tenants.filter((t) => getHealthLevel(t.health_score || 0) === 'warning').length
  const atRiskCount = tenants.filter((t) => getHealthLevel(t.health_score || 0) === 'at_risk').length

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{healthyCount}</p>
            <p className="text-xs text-[var(--text-secondary)]">Healthy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-amber-600 tabular-nums">{warningCount}</p>
            <p className="text-xs text-[var(--text-secondary)]">Warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-red-600 tabular-nums">{atRiskCount}</p>
            <p className="text-xs text-[var(--text-secondary)]">At Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tenant Health ({tenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">No tenants to display</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Seats</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Active Projects</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Last Login</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">API Activity</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Health Score</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants
                    .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
                    .map((tenant) => {
                      const score = tenant.health_score || 0
                      return (
                        <tr key={tenant.id} className="border-b border-[var(--glass-border)] last:border-0 hover:bg-[var(--glass-bg)]">
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-[var(--text-primary)]">{tenant.name}</p>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-primary)] tabular-nums">
                            {tenant.seats_used ?? 0}/{tenant.seats_total ?? tenant.seat_limit ?? '--'}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-primary)] tabular-nums">
                            {tenant.active_projects ?? 0}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                            {formatDate(tenant.last_login_at)}
                          </td>
                          <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                            {tenant.api_activity ?? tenant.api_calls_30d ?? '--'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-end">
                              <HealthBar score={score} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
