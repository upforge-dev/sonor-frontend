/**
 * StatTile — Unified stat/metric card used across all modules.
 *
 * This is the SINGLE source of truth for stat tiles in the portal.
 * All modules (Analytics, Commerce, CRM, SEO, Dashboard, etc.) should
 * import from here instead of defining their own metric cards.
 *
 * Variants:
 *   "centered"  — icon above, label, value, change (analytics style)
 *   "horizontal" — icon right, title left with value + subtitle (commerce style)
 *
 * Usage:
 *   <StatTile label="Page Views" value="1,234" icon={Eye} color="brand" />
 *   <StatTile label="Revenue" value="$5,400" icon={DollarSign} variant="horizontal" trend="up" change="+12.5%" />
 */

import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'

// ─── Color palette ────────────────────────────────────────────────────
const ICON_COLORS = {
  brand:  'text-[var(--brand-primary)]',
  teal:   'text-[#39bfb0]',
  blue:   'text-blue-500',
  purple: 'text-purple-500',
  green:  'text-emerald-500',
  orange: 'text-orange-500',
  pink:   'text-pink-500',
  red:    'text-red-500',
  yellow: 'text-yellow-500',
}

const ICON_BG_COLORS = {
  brand:  'bg-[var(--brand-primary)]/10',
  teal:   'bg-[#39bfb0]/10',
  blue:   'bg-blue-500/10',
  purple: 'bg-purple-500/10',
  green:  'bg-emerald-500/10',
  orange: 'bg-orange-500/10',
  pink:   'bg-pink-500/10',
  red:    'bg-red-500/10',
  yellow: 'bg-yellow-500/10',
}

const ICON_BG_SOLID = {
  brand:  'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]',
  teal:   'bg-gradient-to-br from-[#39bfb0] to-[#2a998e]',
  blue:   'bg-gradient-to-br from-blue-500 to-blue-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  green:  'bg-gradient-to-br from-emerald-500 to-emerald-600',
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  pink:   'bg-gradient-to-br from-pink-500 to-pink-600',
  red:    'bg-gradient-to-br from-red-500 to-red-600',
  yellow: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
}

// Auto-cycle palette for grids
const COLOR_CYCLE = ['brand', 'blue', 'purple', 'green', 'orange', 'pink']

// ─── Glass base classes (single source of truth) ──────────────────────
const TILE_BASE = [
  'rounded-2xl',
  'bg-[var(--glass-bg)]',
  'backdrop-blur-[var(--blur-lg)]',
  'dark:backdrop-blur-[var(--blur-md)]',
  'backdrop-saturate-[1.5]',
  'dark:backdrop-saturate-[1.3]',
  'border border-[var(--glass-border)]',
  'shadow-[var(--shadow-glass)]',
  'hover:border-[var(--glass-border-strong)]',
  'transition-colors',
].join(' ')

// ─── Trend helpers ────────────────────────────────────────────────────
function getTrendInfo(trend, invertTrend) {
  const isUp = trend === 'up'
  const isDown = trend === 'down'
  // invertTrend: for metrics like bounce rate where "up" is bad
  const isPositive = invertTrend ? isDown : isUp
  const isNegative = invertTrend ? isUp : isDown

  const color = isPositive
    ? 'text-emerald-500'
    : isNegative
    ? 'text-red-500'
    : 'text-[var(--text-tertiary)]'

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : ArrowUpRight

  return { color, Icon }
}

// ─── StatTile ─────────────────────────────────────────────────────────
export function StatTile({
  label,
  value,
  subtitle,
  change = null,
  trend = 'neutral',
  invertTrend = false,
  icon: Icon,
  color = 'brand',
  variant = 'centered',
  className,
  onClick,
}) {
  const { color: trendColor, Icon: TrendIcon } = getTrendInfo(trend, invertTrend)

  // Format change display
  const changeText =
    change !== null && change !== undefined
      ? typeof change === 'number'
        ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
        : change
      : null

  if (variant === 'horizontal') {
    return (
      <div
        className={cn(TILE_BASE, 'p-4', onClick && 'cursor-pointer', className)}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-[var(--text-secondary)]">{label}</p>
            <p className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{value}</p>
            {subtitle && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>
            )}
            {changeText && (
              <div className={cn('flex items-center gap-1 text-xs mt-1', trendColor)}>
                <TrendIcon className="h-3 w-3" />
                <span>{changeText}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                ICON_BG_SOLID[color] || ICON_BG_SOLID.brand
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default: centered variant
  return (
    <div
      className={cn(TILE_BASE, 'p-5', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center">
        {Icon && (
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
              ICON_BG_COLORS[color] || ICON_BG_COLORS.brand
            )}
          >
            <Icon className={cn('h-5 w-5', ICON_COLORS[color] || ICON_COLORS.brand)} />
          </div>
        )}
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        {subtitle && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>
        )}
        {changeText && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {changeText}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StatTileGrid ─────────────────────────────────────────────────────
// Convenience wrapper that renders a responsive grid of StatTiles
const GRID_COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

export function StatTileGrid({
  metrics = [],
  isLoading = false,
  columns = 4,
  variant = 'centered',
  className,
}) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4', GRID_COLS[columns] || GRID_COLS[4], className)}>
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn(TILE_BASE, 'p-5 h-28 flex items-center justify-center')}
          >
            <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4', GRID_COLS[columns] || GRID_COLS[4], className)}>
      {metrics.map((metric, index) => (
        <StatTile
          key={metric.key || index}
          label={metric.label}
          value={metric.value}
          subtitle={metric.subtitle}
          change={metric.change}
          trend={metric.trend}
          invertTrend={metric.invertTrend}
          icon={metric.icon}
          color={metric.color || COLOR_CYCLE[index % COLOR_CYCLE.length]}
          variant={variant}
          onClick={metric.onClick}
        />
      ))}
    </div>
  )
}

// Re-export color cycle for consumers that need it
export { COLOR_CYCLE, TILE_BASE }

export default StatTile
