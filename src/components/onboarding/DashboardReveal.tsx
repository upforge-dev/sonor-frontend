/**
 * DashboardReveal — Staggered entry animations for dashboard cards on first load.
 *
 * Wraps dashboard content and adds CSS-driven staggered fade-in + slide-up
 * animations to child elements. Only plays once per session (after boot sequence).
 *
 * Usage in ProjectDashboard / TenantDashboard:
 *   <DashboardReveal>
 *     <div className="grid ...">
 *       <StatsCard ... />  // Each grid child animates in sequence
 *     </div>
 *   </DashboardReveal>
 */

import { useEffect, useRef, useState } from 'react'

interface DashboardRevealProps {
  children: React.ReactNode
  /** Whether to play the reveal animation (default: check sessionStorage) */
  shouldAnimate?: boolean
  /** Base delay before first card appears in ms (default 100) */
  baseDelay?: number
  /** Stagger between each card in ms (default 60) */
  stagger?: number
}

export default function DashboardReveal({
  children,
  shouldAnimate,
  baseDelay = 100,
  stagger = 60,
}: DashboardRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    // Determine if we should animate
    const shouldPlay = shouldAnimate ?? (
      sessionStorage.getItem('sonor_has_booted') === '1' &&
      !sessionStorage.getItem('sonor_dashboard_revealed')
    )

    if (shouldPlay) {
      setAnimate(true)
      sessionStorage.setItem('sonor_dashboard_revealed', '1')

      // Apply staggered delays to direct children of grid containers
      if (containerRef.current) {
        const grids = containerRef.current.querySelectorAll('.grid, [class*="grid-cols"]')
        grids.forEach(grid => {
          const children = grid.children
          for (let i = 0; i < children.length; i++) {
            const child = children[i] as HTMLElement
            child.style.setProperty('--reveal-delay', `${baseDelay + i * stagger}ms`)
            child.classList.add('dashboard-reveal-item')
          }
        })
      }
    }
  }, [shouldAnimate, baseDelay, stagger])

  if (!animate) return <>{children}</>

  return (
    <div ref={containerRef} className="dashboard-reveal-container">
      <style>{`
        .dashboard-reveal-item {
          opacity: 0;
          animation: dashRevealIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
          animation-delay: var(--reveal-delay, 0ms);
        }

        @keyframes dashRevealIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      {children}
    </div>
  )
}

/**
 * AnimatedCounter — Counts up from 0 to a target number.
 * Used in dashboard stats cards for the "numbers counting up" effect on first load.
 */
export function AnimatedCounter({
  target,
  duration = 1200,
  prefix = '',
  suffix = '',
  shouldAnimate,
}: {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
  shouldAnimate?: boolean
}) {
  const [current, setCurrent] = useState(shouldAnimate ? 0 : target)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!shouldAnimate) {
      setCurrent(target)
      return
    }

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, shouldAnimate])

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  )
}
