// src/pages/commerce/components/CommerceStats.jsx
// Stats and activity components for the Commerce module
//
// StatsCard now delegates to the unified StatTile component.

import { cn } from '@/lib/utils'
import { StatTile } from '@/components/ui/stat-tile'
import {
  DollarSign,
  Calendar,
  Users,
} from 'lucide-react'

// Recent activity item component
export function ActivityItem({ activity }) {
  const isPositive = activity.type === 'sale' || activity.type === 'booking'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--glass-border)] last:border-0">
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center",
        isPositive ? "bg-[var(--accent-green)]/10" : "bg-[var(--glass-bg-inset)]"
      )}>
        {activity.type === 'sale' && <DollarSign className="h-4 w-4 text-[var(--accent-green)]" />}
        {activity.type === 'booking' && <Calendar className="h-4 w-4 text-[var(--accent-blue)]" />}
        {activity.type === 'view' && <Users className="h-4 w-4 text-[var(--text-tertiary)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {activity.title}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {activity.description}
        </p>
      </div>
      <div className="text-right">
        {activity.amount && (
          <p className="text-sm font-medium text-[var(--accent-green)]">
            +${activity.amount.toFixed(2)}
          </p>
        )}
        <p className="text-xs text-[var(--text-tertiary)]">
          {activity.time}
        </p>
      </div>
    </div>
  )
}

// Stats Card — thin wrapper around unified StatTile (horizontal variant)
export function StatsCard({ title, value, subtitle, icon, trend, trendValue, brandColors, color = 'brand' }) {
  return (
    <StatTile
      label={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      trend={trend}
      change={trendValue}
      color={color}
      variant="horizontal"
    />
  )
}
