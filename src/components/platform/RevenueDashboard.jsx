import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Building2, User, Loader2 } from 'lucide-react'
import { useRevenue } from '@/lib/hooks/use-platform'
import { EmptyState } from '@/components/EmptyState'

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })

function MetricCard({ label, value, icon: Icon, description }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{value}</p>
            {description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[var(--brand-primary)]/10 shrink-0">
            <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RevenueDashboard() {
  const { data, isLoading } = useRevenue()

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
        icon={DollarSign}
        title="No revenue data"
        description="Revenue metrics will appear here once tenants have active subscriptions."
      />
    )
  }

  const metrics = data.metrics || data
  const planBreakdown = data.plan_breakdown || metrics.plan_breakdown || []

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total MRR"
          value={currencyFmt.format(metrics.total_mrr || 0)}
          icon={DollarSign}
          description={metrics.mrr_change ? `${metrics.mrr_change > 0 ? '+' : ''}${currencyFmt.format(metrics.mrr_change)} this month` : null}
        />
        <MetricCard
          label="Active Subscriptions"
          value={metrics.active_subscriptions || 0}
          icon={TrendingUp}
        />
        <MetricCard
          label="Agency Revenue"
          value={currencyFmt.format(metrics.agency_revenue || 0)}
          icon={Building2}
          description={`${metrics.agency_count || 0} agencies`}
        />
        <MetricCard
          label="Independent Revenue"
          value={currencyFmt.format(metrics.independent_revenue || 0)}
          icon={User}
          description={`${metrics.independent_count || 0} businesses`}
        />
      </div>

      {/* Plan Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Revenue by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {planBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">No plan data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Plan</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">Tenants</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">MRR</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {planBreakdown.map((row) => {
                    const pctOfTotal = metrics.total_mrr > 0
                      ? ((row.mrr || 0) / metrics.total_mrr * 100).toFixed(1)
                      : '0.0'
                    return (
                      <tr key={row.plan} className="border-b border-[var(--glass-border)] last:border-0">
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="capitalize">{row.plan}</Badge>
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--text-primary)]">{row.count || 0}</td>
                        <td className="py-2 px-3 text-right font-medium text-[var(--text-primary)]">
                          {currencyFmt.format(row.mrr || 0)}
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{pctOfTotal}%</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--glass-border)]">
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">Total</td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--text-primary)]">
                      {planBreakdown.reduce((sum, r) => sum + (r.count || 0), 0)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-[var(--text-primary)]">
                      {currencyFmt.format(metrics.total_mrr || 0)}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-secondary)]">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
