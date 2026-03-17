import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, FolderPlus, Key, Zap, Loader2 } from 'lucide-react'
import { useOnboarding } from '@/lib/hooks/use-platform'
import { EmptyState } from '@/components/EmptyState'

const STAGES = [
  { key: 'signed_up', label: 'Signed Up', icon: UserPlus, color: 'bg-blue-500' },
  { key: 'project_created', label: 'Project Created', icon: FolderPlus, color: 'bg-violet-500' },
  { key: 'activated', label: 'Activated (API Key)', icon: Key, color: 'bg-amber-500' },
  { key: 'integrated', label: 'Integrated (First Data)', icon: Zap, color: 'bg-emerald-500' },
]

function FunnelStage({ stage, count, maxCount, index, total }) {
  const Icon = stage.icon
  const widthPct = maxCount > 0 ? Math.max(10, (count / maxCount) * 100) : 10
  const conversionRate = index > 0 && total > 0 ? ((count / total) * 100).toFixed(0) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center h-7 w-7 rounded-md ${stage.color}/10`}>
            <Icon className={`h-3.5 w-3.5 ${stage.color.replace('bg-', 'text-')}`} />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">{stage.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {conversionRate && (
            <span className="text-xs text-[var(--text-secondary)]">
              {conversionRate}% of total
            </span>
          )}
          <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums w-10 text-right">
            {count}
          </span>
        </div>
      </div>
      <div className="h-3 w-full rounded-full bg-[var(--glass-border)] overflow-hidden">
        <div
          className={`h-full rounded-full ${stage.color} transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}

export default function OnboardingPipeline() {
  const { data, isLoading } = useOnboarding()

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
        icon={UserPlus}
        title="No onboarding data"
        description="Onboarding pipeline will appear here once organizations begin signing up."
      />
    )
  }

  const pipeline = data.pipeline || data.stages || data
  const stageCounts = STAGES.map((stage) => ({
    ...stage,
    count: pipeline[stage.key] ?? pipeline[stage.label] ?? 0,
  }))
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1)
  const totalSignedUp = stageCounts[0]?.count || 0

  // Conversion summary
  const integrated = stageCounts[3]?.count || 0
  const overallConversion = totalSignedUp > 0 ? ((integrated / totalSignedUp) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stageCounts.map((stage) => {
          const Icon = stage.icon
          return (
            <Card key={stage.key}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${stage.color}/10 shrink-0`}>
                  <Icon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text-primary)] tabular-nums">{stage.count}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{stage.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Onboarding Funnel</CardTitle>
            <span className="text-xs text-[var(--text-secondary)]">
              Overall conversion: <span className="font-medium text-[var(--text-primary)]">{overallConversion}%</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {stageCounts.map((stage, i) => (
              <FunnelStage
                key={stage.key}
                stage={stage}
                count={stage.count}
                maxCount={maxCount}
                index={i}
                total={totalSignedUp}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drop-off Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stage Drop-off</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stageCounts.slice(1).map((stage, i) => {
              const prev = stageCounts[i]
              const dropoff = prev.count - stage.count
              const dropoffPct = prev.count > 0 ? ((dropoff / prev.count) * 100).toFixed(1) : '0'
              return (
                <div key={stage.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {prev.label} &rarr; {stage.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-primary)] tabular-nums">
                      {dropoff} dropped
                    </span>
                    <span className={`text-xs font-medium tabular-nums ${dropoff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {dropoffPct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
