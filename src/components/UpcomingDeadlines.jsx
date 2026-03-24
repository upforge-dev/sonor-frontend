import { useEffect, useState } from 'react'
import { format, formatDistance } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Clock, AlertCircle } from 'lucide-react'
import { reportsApi } from '@/lib/sonor-api'

/* Dark theme + liquid glass: use glass/surface tokens and accent for status tint only */
const priorityConfig = {
  high: { label: 'High', accentClass: 'text-[var(--accent-red)]' },
  normal: { label: 'Normal', accentClass: 'text-[var(--accent-orange)]' },
  low: { label: 'Low', accentClass: 'text-[var(--accent-blue)]' }
}

const statusConfig = {
  overdue: {
    borderAccent: 'border-l-[var(--accent-red)]',
    iconColor: 'text-[var(--accent-red)]',
    icon: AlertCircle
  },
  'in-progress': {
    borderAccent: 'border-l-[var(--accent-orange)]',
    iconColor: 'text-[var(--accent-orange)]',
    icon: Clock
  },
  pending: {
    borderAccent: 'border-l-[var(--accent-blue)]',
    iconColor: 'text-[var(--accent-blue)]',
    icon: Calendar
  },
  completed: {
    borderAccent: 'border-l-[var(--accent-green)]',
    iconColor: 'text-[var(--accent-green)]',
    icon: null
  }
}

function getDaysUntilColor(daysSince) {
  if (daysSince < 0) return 'destructive' // Overdue
  if (daysSince === 0) return 'destructive' // Today
  if (daysSince <= 3) return 'destructive' // 3 days or less
  if (daysSince <= 7) return 'outline' // 7 days or less
  return 'secondary' // More than 7 days
}

function formatDaysUntil(daysSince) {
  if (daysSince < 0) {
    return `${Math.abs(daysSince)}d overdue`
  }
  if (daysSince === 0) return 'Today'
  if (daysSince === 1) return 'Tomorrow'
  return `${daysSince}d away`
}

export function UpcomingDeadlines({ limit = 10 }) {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDeadlines()
  }, [limit])

  const fetchDeadlines = async () => {
    try {
      setLoading(true)
      const response = await reportsApi.getDeadlines({ daysAhead: 30 })
      setDeadlines(response.data.deadlines || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch deadlines:', err)
      setError('Failed to load deadlines')
      setDeadlines([])
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={fetchDeadlines}
              className="mt-3 text-sm text-[var(--accent-blue)] hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.slice(0, limit).map((deadline, index) => {
              const config = statusConfig[deadline.status] || statusConfig.pending
              const priorityConfig_ = priorityConfig[deadline.priority] || priorityConfig.normal
              const daysUntil = deadline.days_until ?? Math.floor((new Date(deadline.dueDate) - Date.now()) / (1000 * 60 * 60 * 24))
              const StatusIcon = config.icon
              const key = deadline.id || deadline.item_id || `${deadline.item_type || 'item'}-${index}`

              return (
                <div
                  key={key}
                  className={`rounded-lg border border-[var(--glass-border)] border-l-4 bg-[var(--glass-bg)] p-3 backdrop-blur-sm transition-colors hover:bg-[var(--glass-bg-hover)] ${config.borderAccent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {StatusIcon && (
                          <StatusIcon className={`w-4 h-4 flex-shrink-0 ${config.iconColor}`} />
                        )}
                        <p className="font-medium truncate text-[var(--text-primary)]">
                          {deadline.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="capitalize">{deadline.item_type}</span>
                        <span>•</span>
                        <span>Due {format(new Date(deadline.dueDate), 'MMM d')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getDaysUntilColor(daysUntil)} className="text-xs whitespace-nowrap">
                        {formatDaysUntil(daysUntil)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs whitespace-nowrap border-[var(--glass-border)] ${priorityConfig_.accentClass}`}
                      >
                        {priorityConfig_.label}
                      </Badge>
                    </div>
                  </div>

                  {deadline.status === 'overdue' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--accent-orange)]">
                      <span aria-hidden>⚠️</span>
                      <span>This deadline has passed</span>
                    </div>
                  )}
                </div>
              )
            })}

            {deadlines.length > limit && (
              <div className="mt-4 border-t border-[var(--glass-border)] pt-3 text-center">
                <a
                  href="/dashboard"
                  className="text-sm text-[var(--accent-blue)] hover:underline"
                >
                  View all {deadlines.length} deadlines
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UpcomingDeadlines
