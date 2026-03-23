// src/components/commerce/CommerceMetrics.jsx
// Top-level metrics — uses unified StatTile system

import { StatTileGrid } from '@/components/ui/stat-tile'
import { DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLOR_CYCLE = ['brand', 'teal', 'brand', 'teal']

export function CommerceMetrics({
  metrics = [],
  brandColors = {},
  className,
  isLoading = false,
}) {
  const tileMetrics = metrics.map((metric, index) => ({
    key: metric.key,
    label: metric.label,
    value: metric.value,
    icon: metric.icon || DollarSign,
    change: metric.change,
    trend: metric.trend || 'up',
    subtitle: metric.subtitle,
    color: COLOR_CYCLE[index % COLOR_CYCLE.length],
    onClick: metric.onClick,
  }))

  if (tileMetrics.length === 0 && !isLoading) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground text-sm', className)}>
        No metrics available
      </div>
    )
  }

  return (
    <StatTileGrid
      metrics={tileMetrics}
      isLoading={isLoading}
      columns={4}
      variant="horizontal"
      className={className}
    />
  )
}

export default CommerceMetrics
