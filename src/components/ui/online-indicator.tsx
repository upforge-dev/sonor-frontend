/**
 * OnlineIndicator - Shows online/away/offline status
 */
import * as React from 'react'
import { cn } from '@/lib/utils'
import { usePresence } from '@/lib/use-presence'
import { formatDistanceToNow } from 'date-fns'

export type OnlineIndicatorSize = 'xs' | 'sm' | 'md' | 'lg'
export type AvatarWithPresenceSize = 'sm' | 'md' | 'lg' | 'xl'

export interface OnlineIndicatorProps {
  userId: string
  lastSeen?: string | Date | null
  size?: OnlineIndicatorSize
  showLabel?: boolean
  className?: string
}

export function OnlineIndicator({
  userId,
  lastSeen,
  size = 'sm',
  showLabel = false,
  className
}: OnlineIndicatorProps) {
  const { getPresenceStatus } = usePresence()
  const status = getPresenceStatus(userId, lastSeen)

  const sizes: Record<OnlineIndicatorSize, string> = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  }

  const dotSize = sizes[size] || sizes.sm

  if (status.online) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span
          className={cn(
            dotSize,
            'rounded-full bg-emerald-500 ring-2 ring-emerald-500/30',
            'animate-pulse'
          )}
          title="Online now"
        />
        {showLabel && (
          <span className="text-xs text-emerald-400">Online</span>
        )}
      </div>
    )
  }

  if (status.away) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span
          className={cn(
            dotSize,
            'rounded-full bg-amber-500 ring-2 ring-amber-500/30'
          )}
          title="Away"
        />
        {showLabel && (
          <span className="text-xs text-amber-400">Away</span>
        )}
      </div>
    )
  }

  // Offline
  const lastSeenDate = status.lastSeen || (lastSeen ? new Date(lastSeen) : null)
  const lastSeenText = lastSeenDate
    ? `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`
    : 'Offline'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          dotSize,
          'rounded-full bg-gray-500 ring-2 ring-gray-500/30'
        )}
        title={lastSeenText}
      />
      {showLabel && (
        <span className="text-xs text-[var(--text-tertiary)]">
          {lastSeenDate ? formatDistanceToNow(lastSeenDate, { addSuffix: true }) : 'Offline'}
        </span>
      )}
    </div>
  )
}

export interface AvatarWithPresenceProps {
  userId: string
  lastSeen?: string | Date | null
  src?: string
  fallback?: React.ReactNode
  size?: AvatarWithPresenceSize
  className?: string
}

/**
 * AvatarWithPresence - Avatar component with online indicator overlay
 */
export function AvatarWithPresence({
  userId,
  lastSeen,
  src,
  fallback,
  size = 'md',
  className
}: AvatarWithPresenceProps) {
  const avatarSizes: Record<AvatarWithPresenceSize, string> = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const indicatorSizes: Record<AvatarWithPresenceSize, OnlineIndicatorSize> = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
    xl: 'lg'
  }

  const indicatorPositions: Record<AvatarWithPresenceSize, string> = {
    sm: 'bottom-0 right-0',
    md: 'bottom-0 right-0',
    lg: '-bottom-0.5 -right-0.5',
    xl: '-bottom-1 -right-1'
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          avatarSizes[size] || avatarSizes.md,
          'rounded-full overflow-hidden bg-[var(--glass-bg)]'
        )}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] font-medium">
            {fallback || '?'}
          </div>
        )}
      </div>
      <div className={cn('absolute', indicatorPositions[size] || indicatorPositions.md)}>
        <OnlineIndicator
          userId={userId}
          lastSeen={lastSeen}
          size={indicatorSizes[size] || indicatorSizes.md}
        />
      </div>
    </div>
  )
}

export default OnlineIndicator
