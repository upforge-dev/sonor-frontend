// src/components/commerce/CommerceMetrics.jsx
// Top-level metrics with sparklines

import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function CommerceMetrics({
  metrics = [],
  brandColors = {},
  className,
}) {
  const displayMetrics = metrics
  
  const primary = brandColors.primary || '#4bbf39'
  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { 
    primary10: 'rgba(75, 191, 57, 0.1)', 
    primary20: 'rgba(75, 191, 57, 0.2)',
    secondary10: 'rgba(57, 191, 176, 0.1)',
    secondary20: 'rgba(57, 191, 176, 0.2)' 
  }

  const getMetricColor = (index) => {
    // Alternate between primary and secondary
    return index % 2 === 0 ? primary : secondary
  }

  const getMetricBgColor = (index) => {
    return index % 2 === 0 ? rgba.primary10 : rgba.secondary10
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {displayMetrics.map((metric, index) => {
        const Icon = metric.icon || DollarSign
        const isPositive = metric.trend !== 'down'
        const color = getMetricColor(index)
        const bgColor = getMetricBgColor(index)
        
        return (
          <Card key={metric.key} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  <div className={cn(
                    "flex items-center gap-1 text-sm mt-1",
                    isPositive ? "text-emerald-600" : "text-red-500"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{Math.abs(metric.change ?? 0)}%</span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: bgColor }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
              </div>
              
              {/* Mini Sparkline */}
              {metric.sparkline && (
                <div className="mt-3 h-8 flex items-end gap-0.5">
                  {metric.sparkline.map((value, i) => {
                    const max = Math.max(...metric.sparkline)
                    const height = (value / max) * 100
                    return (
                      <div 
                        key={i}
                        className="flex-1 rounded-sm transition-all"
                        style={{ 
                          height: `${height}%`,
                          backgroundColor: color,
                          opacity: i === metric.sparkline.length - 1 ? 1 : 0.5
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
      {displayMetrics.length === 0 && (
        <div className="col-span-2 md:col-span-4 text-center py-8 text-muted-foreground text-sm">
          No metrics available
        </div>
      )}
    </div>
  )
}

export default CommerceMetrics
