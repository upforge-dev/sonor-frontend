/**
 * HourlyChart - Traffic distribution by hour of day
 */
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart } from '@tremor/react'
import { Clock, Loader2 } from 'lucide-react'

// Custom tooltip component for dark mode compatibility
function CustomTooltip({ payload, active, label }) {
  if (!active || !payload) return null
  
  return (
    <div className="rounded-lg border bg-[rgba(44,44,46,0.95)] backdrop-blur-xl border-white/10 p-3 shadow-xl">
      <p className="text-sm font-medium text-white/90 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/70">{entry.dataKey}:</span>
          <span className="text-white font-medium">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// Convert hour index to display label
function formatHour(hour) {
  if (hour === 0) return '12am'
  if (hour === 12) return '12pm'
  if (hour < 12) return `${hour}am`
  return `${hour - 12}pm`
}

export function HourlyChart({ 
  data = [], 
  isLoading = false,
  height = 280
}) {
  // Tremor "brand" → fill-tremor-brand-default → var(--brand-primary) in index.css (light + dark)
  // Process data into hourly distribution
  const hourlyData = useMemo(() => {
    // Initialize all 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: formatHour(i),
      hourIndex: i,
      visits: 0
    }))
    
    // If we have event-level data with timestamps, aggregate by hour
    if (data.length > 0 && data[0]?.timestamp) {
      data.forEach(event => {
        const date = new Date(event.timestamp)
        const hour = date.getHours()
        hours[hour].visits += 1
      })
    }
    // If we have pre-aggregated hourly data
    else if (data.length > 0 && typeof data[0]?.hour !== 'undefined') {
      data.forEach(item => {
        const hourIndex = parseInt(item.hour, 10)
        if (hourIndex >= 0 && hourIndex < 24) {
          hours[hourIndex].visits = item.visits || item.count || 0
        }
      })
    }
    
    return hours
  }, [data])

  // Find peak hour
  const peakHour = useMemo(() => {
    if (!hourlyData.length) return null
    return hourlyData.reduce((max, h) => h.visits > max.visits ? h : max, hourlyData[0])
  }, [hourlyData])

  // Calculate total and average
  const totalVisits = hourlyData.reduce((sum, h) => sum + h.visits, 0)
  const avgPerHour = totalVisits > 0 ? Math.round(totalVisits / 24) : 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--brand-primary)]" />
              Traffic by Hour
            </CardTitle>
            <CardDescription>When your visitors are most active</CardDescription>
          </div>
          
          {peakHour && peakHour.visits > 0 && (
            <div className="text-right">
              <p className="text-xs text-[var(--text-tertiary)]">Peak Hour</p>
              <p className="text-lg font-semibold text-[var(--brand-primary)]">
                {peakHour.hour}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {totalVisits > 0 ? (
          <div className="mt-4">
            <BarChart
              data={hourlyData}
              index="hour"
              categories={["visits"]}
              colors={['brand']}
              valueFormatter={(v) => v.toLocaleString()}
              showAnimation={true}
              animationDuration={800}
              showLegend={false}
              showGridLines={true}
              yAxisWidth={48}
              autoMinValue={true}
              className="h-64"
              customTooltip={CustomTooltip}
            />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
            <Clock className="h-12 w-12 mb-3 opacity-40" />
            <p>No hourly data available</p>
            <p className="text-xs mt-1">Check back when more events are tracked</p>
          </div>
        )}
        
        {totalVisits > 0 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--glass-border)] text-sm text-[var(--text-secondary)]">
            <span>
              Total:{' '}
              <span className="font-medium tabular-nums text-[var(--brand-primary)]">
                {totalVisits.toLocaleString()}
              </span>{' '}
              visits
            </span>
            <span>
              Avg/hour:{' '}
              <span className="font-medium tabular-nums text-[var(--brand-primary)]">
                {avgPerHour.toLocaleString()}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default HourlyChart
