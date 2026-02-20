/**
 * GlassMetric - Frosted glass metric card with optional trend indicator
 * Perfect for dashboard stats and KPIs
 */
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function GlassMetric({
  label,
  value,
  subValue,
  icon: Icon,
  trend, // { value: number, direction: 'up' | 'down' | 'flat' }
  color = 'default', // 'default' | 'success' | 'warning' | 'error' | 'brand' | 'blue' | 'purple'
  size = 'md', // 'sm' | 'md' | 'lg'
  className
}) {
  const colorStyles = {
    default: {
      icon: 'bg-[var(--glass-bg-inset)] text-[var(--text-secondary)]',
      value: 'text-[var(--text-primary)]',
      accent: 'from-gray-500/20 to-transparent'
    },
    success: {
      icon: 'bg-[#4bbf39]/10 text-[#4bbf39]',
      value: 'text-[#4bbf39]',
      accent: 'from-[#4bbf39]/10 to-transparent'
    },
    warning: {
      icon: 'bg-amber-500/10 text-amber-500',
      value: 'text-amber-600',
      accent: 'from-amber-500/10 to-transparent'
    },
    error: {
      icon: 'bg-red-500/10 text-red-500',
      value: 'text-red-600',
      accent: 'from-red-500/10 to-transparent'
    },
    brand: {
      icon: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
      value: 'text-[var(--brand-primary)]',
      accent: 'from-[var(--brand-primary)]/10 to-transparent'
    },
    blue: {
      icon: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
      value: 'text-[var(--brand-primary)]',
      accent: 'from-[var(--brand-primary)]/10 to-transparent'
    },
    purple: {
      icon: 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]',
      value: 'text-[var(--brand-primary)]',
      accent: 'from-[var(--brand-primary)]/10 to-transparent'
    }
  }

  const sizes = {
    sm: {
      container: 'p-3',
      icon: 'p-1.5',
      iconSize: 'h-4 w-4',
      value: 'text-lg',
      label: 'text-xs'
    },
    md: {
      container: 'p-4',
      icon: 'p-2',
      iconSize: 'h-5 w-5',
      value: 'text-2xl',
      label: 'text-xs'
    },
    lg: {
      container: 'p-5',
      icon: 'p-2.5',
      iconSize: 'h-6 w-6',
      value: 'text-3xl',
      label: 'text-sm'
    }
  }

  const style = colorStyles[color]
  const sizeStyle = sizes[size]

  const TrendIcon = trend?.direction === 'up' ? TrendingUp 
    : trend?.direction === 'down' ? TrendingDown 
    : Minus

  return (
    <div 
      className={cn(
        'glass rounded-2xl relative overflow-hidden group',
        sizeStyle.container,
        className
      )}
    >
      {/* Subtle gradient accent */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
        style.accent
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn('text-[var(--text-tertiary)] font-medium', sizeStyle.label)}>
            {label}
          </p>
          <p className={cn('font-bold tracking-tight', sizeStyle.value, style.value)}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-[var(--text-tertiary)]">{subValue}</p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {Icon && (
            <div className={cn('rounded-xl', sizeStyle.icon, style.icon)}>
              <Icon className={sizeStyle.iconSize} />
            </div>
          )}
          
          {trend && (
            <div className={cn(
              'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
              trend.direction === 'up' && 'bg-[#4bbf39]/10 text-[#4bbf39]',
              trend.direction === 'down' && 'bg-red-500/10 text-red-600',
              trend.direction === 'flat' && 'bg-gray-500/10 text-gray-500'
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
