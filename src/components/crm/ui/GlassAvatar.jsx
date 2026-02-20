/**
 * GlassAvatar - Frosted glass avatar with gradient fallback
 * Supports images, initials, and status indicators
 */
import { cn } from '@/lib/utils'

export default function GlassAvatar({
  src,
  name,
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status, // 'online' | 'away' | 'busy' | 'offline'
  gradient = 'brand', // 'brand' | 'blue' | 'purple' | 'orange' | 'pink'
  className
}) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl'
  }

  const statusSizes = {
    xs: 'h-1.5 w-1.5 border',
    sm: 'h-2 w-2 border-[1.5px]',
    md: 'h-2.5 w-2.5 border-2',
    lg: 'h-3 w-3 border-2',
    xl: 'h-4 w-4 border-[3px]'
  }

  const gradients = {
    brand: 'from-[var(--brand-primary)] to-[var(--brand-primary)]',
    blue: 'from-[#4bbf39] to-[#39bfb0]',
    purple: 'from-[#39bfb0] to-[#4bbf39]',
    orange: 'from-orange-500 to-yellow-400',
    pink: 'from-pink-500 to-rose-400'
  }

  const statusColors = {
    online: 'bg-[#4bbf39]',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400'
  }

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  return (
    <div className={cn('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={cn(
            'rounded-full object-cover ring-2 ring-white/20',
            sizes[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            'bg-gradient-to-br ring-2 ring-white/20',
            sizes[size],
            gradients[gradient]
          )}
        >
          {initials}
        </div>
      )}
      
      {status && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-white',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  )
}
