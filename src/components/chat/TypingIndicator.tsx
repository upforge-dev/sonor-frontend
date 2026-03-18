/**
 * TypingIndicator Component
 *
 * Sonic frequency bars showing Echo is "thinking" —
 * replaces generic bouncing dots with the Sonor sound identity.
 */

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  /** Name to show (e.g., "Echo is thinking...") */
  name?: string
  className?: string
}

const BAR_HEIGHTS = [0.4, 0.7, 1.0, 0.8, 0.5]

export function TypingIndicator({ name, className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <style>{`
        @keyframes echoTypingBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div className="flex items-center gap-[2px] px-3 py-2.5 rounded-2xl bg-[var(--surface-secondary)]" style={{ height: 32 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              width: 2.5,
              height: h * 14,
              borderRadius: 1.5,
              background: 'var(--brand-primary, #39bfb0)',
              transformOrigin: 'center',
              animation: `echoTypingBar 1s ease-in-out ${i * 0.12}s infinite`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      {name && (
        <span className="text-xs text-[var(--text-tertiary)]">
          {name} is thinking...
        </span>
      )}
    </div>
  )
}
