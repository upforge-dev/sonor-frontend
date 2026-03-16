/**
 * EchoStatCards — Renders inline stat/KPI cards inside Echo message bubbles.
 *
 * Parses a JSON stats definition from ```stats code blocks.
 */

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Target, Users, Eye, MousePointer, DollarSign, Mail, Star } from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  target: Target,
  users: Users,
  eye: Eye,
  click: MousePointer,
  dollar: DollarSign,
  mail: Mail,
  star: Star,
}

export interface StatDefinition {
  label: string
  value: string | number
  change?: string
  icon?: string
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'default'
}

export interface StatsGroupDefinition {
  title?: string
  stats: StatDefinition[]
}

interface EchoStatCardsProps {
  definition: StatsGroupDefinition
  className?: string
}

const COLOR_MAP = {
  green: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  yellow: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
  default: 'bg-muted/30 border-border/50',
}

export function EchoStatCards({ definition, className }: EchoStatCardsProps) {
  const { title, stats } = definition

  return (
    <div className={cn('my-3', className)}>
      {title && <div className="text-sm font-medium mb-2">{title}</div>}
      <div className={cn('grid gap-2', stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
        {stats.map((stat, i) => {
          const Icon = stat.icon ? ICON_MAP[stat.icon] : null
          const colorClass = COLOR_MAP[stat.color || 'default']
          const isPositive = stat.change?.startsWith('+')
          const isNegative = stat.change?.startsWith('-')

          return (
            <div key={i} className={cn('rounded-lg border p-3', colorClass)}>
              <div className="flex items-center gap-1.5 mb-1">
                {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
              </div>
              <div className="text-lg font-semibold">{stat.value}</div>
              {stat.change && (
                <div className={cn(
                  'text-xs flex items-center gap-0.5 mt-0.5',
                  isPositive && 'text-green-600 dark:text-green-400',
                  isNegative && 'text-red-600 dark:text-red-400',
                  !isPositive && !isNegative && 'text-muted-foreground',
                )}>
                  {isPositive && <TrendingUp className="w-3 h-3" />}
                  {isNegative && <TrendingDown className="w-3 h-3" />}
                  {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
                  {stat.change}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function extractStats(text: string): { statsGroups: StatsGroupDefinition[]; cleanText: string } {
  const statsGroups: StatsGroupDefinition[] = []
  const cleanText = text.replace(/```stats\s*\n([\s\S]*?)```/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim())
      if (parsed.stats && Array.isArray(parsed.stats)) {
        statsGroups.push(parsed)
        return ''
      }
    } catch { /* ignore malformed */ }
    return _
  })
  return { statsGroups, cleanText }
}
