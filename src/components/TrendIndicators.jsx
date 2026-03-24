import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { reportsApi } from '@/lib/sonor-api'

const trendConfig = {
  revenue: {
    label: 'Revenue',
    icon: '💰',
    format: (val) => `$${val.toLocaleString()}`
  },
  projects: {
    label: 'Projects',
    icon: '📁',
    format: (val) => val.toString()
  },
  invoices: {
    label: 'Invoices',
    icon: '📄',
    format: (val) => val.toString()
  },
  messages: {
    label: 'Messages',
    icon: '💬',
    format: (val) => val.toString()
  }
}

export function TrendIndicators({ period = 'month', showComparison = true }) {
  const [trends, setTrends] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTrends()
  }, [period])

  const fetchTrends = async () => {
    try {
      setLoading(true)
      const response = await reportsApi.getDashboard({ period })
      setTrends(response.data.trends)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch trends:', err)
      setError('Failed to load trends')
      setTrends(null)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={fetchTrends}
              className="mt-3 text-sm text-[var(--brand-primary)] hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Trends
          <span className="text-sm font-normal text-[var(--text-tertiary)] ml-2">
            vs. {period === 'week' ? 'last week' : period === 'year' ? 'last year' : 'last month'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : !trends ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)]">No trend data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(trends).map(([key, data]) => {
              const config = trendConfig[key]
              const isPositive = data.trend === 'up'
              const TrendIcon = isPositive ? TrendingUp : TrendingDown

              return (
                <div
                  key={key}
                  className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)] mb-1">{config.label}</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">
                        {config.format(data.current)}
                      </p>
                    </div>
                    <span className="text-2xl">{config.icon}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isPositive ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      <TrendIcon className="w-3 h-3" />
                      <span>{Math.abs(data.percentageChange)}%</span>
                    </Badge>
                    {showComparison && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        from {config.format(data.previous)}
                      </span>
                    )}
                  </div>

                  {data.percentageChange === 0 && (
                    <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                      ➜ No change from previous period
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-2 justify-center">
            {['week', 'month', 'year'].map(p => (
              <button
                key={p}
                onClick={() => period !== p && fetchTrends()}
                className={`text-xs px-3 py-1 rounded capitalize transition-colors ${
                  period === p
                    ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
                }`}
              >
                {p === 'week' ? '7d' : p === 'month' ? '30d' : '1y'}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TrendIndicators
