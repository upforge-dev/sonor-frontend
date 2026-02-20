// src/pages/commerce/components/CommerceStats.jsx
// Stats and activity components for the Commerce module

import { cn } from '@/lib/utils'
import {
  DollarSign,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
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

// Stats Card - Glass style with optional trend
export function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue, brandColors }) {
  return (
    <div className="rounded-xl bg-card border border-[var(--glass-border)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{value}</p>
          {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              trend === 'up' ? "text-[var(--accent-green)]" : trend === 'down' ? "text-[var(--accent-red)]" : "text-[var(--text-tertiary)]"
            )}>
              {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}
