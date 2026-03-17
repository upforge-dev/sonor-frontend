/**
 * SonorLoading — Full-page loading screen (replaces UptradeLoading).
 *
 * Sonor icon (logo.svg) with breathing glow animation on dark background.
 * Used for route-level Suspense boundaries and initial app load.
 *
 * Also exports `SonorSpinner` for inline/section loading (replaces UptradeSpinner).
 */

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import LogoSvg from '@/assets/logo.svg?react'

interface SonorSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export function SonorSpinner({ size = 'md', label, className }: SonorSpinnerProps) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-10 w-10' }
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <Loader2
        className={cn('animate-spin text-[#39bfb0]', sizeClasses[size])}
        aria-hidden
      />
      {label && <p className="text-sm text-[var(--text-secondary)]">{label}</p>}
    </div>
  )
}

export default function SonorLoading() {
  return (
    <>
      <style>{`
        .sonor-loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
          background: #0a0a0f;
        }
        @keyframes sonorBreathe {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(57, 191, 176, 0.15));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(57, 191, 176, 0.3));
            transform: scale(1.02);
          }
        }
        .sonor-loader-icon {
          animation: sonorBreathe 2s ease-in-out infinite;
        }
      `}</style>

      <div className="sonor-loader-container">
        <div className="sonor-loader-icon">
          <LogoSvg
            fill="white"
            style={{ width: 120, height: 120 }}
          />
        </div>
      </div>
    </>
  )
}
