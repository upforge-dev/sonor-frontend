/**
 * SonorLoading — Full-page loading screen (replaces UptradeLoading).
 *
 * Sonor icon (logo.svg) with breathing glow animation on dark background,
 * plus a subtle frequency-bar EQ visualizer underneath — reinforcing
 * the platform's sonic identity even in loading states.
 *
 * Also exports `SonorSpinner` for inline/section loading (replaces UptradeSpinner).
 */

import { cn } from '@/lib/utils'
import LogoSvg from '@/assets/logo.svg?react'

interface SonorSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

// Mini inline frequency bars — no canvas, pure CSS.
// Used in SonorSpinner as a sonic alternative to Loader2.
function MiniFreqBars({ count = 5, height = 16, color = 'var(--brand-primary, #39bfb0)' }: { count?: number; height?: number; color?: string }) {
  const amplitudes = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    return 0.35 + 0.65 * Math.sin(t * Math.PI)
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, height }}>
      <style>{`
        @keyframes miniFreq {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      {amplitudes.map((amp, i) => (
        <div
          key={i}
          style={{
            width: 2.5,
            height: amp * height,
            borderRadius: 1.5,
            background: color,
            transformOrigin: 'center',
            animation: `miniFreq 1.2s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

export function SonorSpinner({ size = 'md', label, className }: SonorSpinnerProps) {
  const config = {
    sm: { bars: 5, height: 12 },
    md: { bars: 7, height: 18 },
    lg: { bars: 9, height: 24 },
  }[size]

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <MiniFreqBars count={config.bars} height={config.height} />
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
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 24px;
          min-height: 100vh;
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
          background: transparent;
        }
        @keyframes sonorBreathe {
          0%, 100% {
            filter: drop-shadow(0 0 20px color-mix(in srgb, var(--brand-primary, #39bfb0) 25%, transparent));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 40px color-mix(in srgb, var(--brand-primary, #39bfb0) 50%, transparent));
            transform: scale(1.02);
          }
        }
        .sonor-loader-icon {
          animation: sonorBreathe 2s ease-in-out infinite;
        }

        /* Full-page frequency bars — logo-shaped EQ */
        .sonor-loader-freq {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 28px;
          opacity: 0.4;
        }
        @keyframes loaderFreq {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
        .sonor-loader-freq-bar {
          width: 3px;
          border-radius: 1.5px;
          background: linear-gradient(to top, color-mix(in srgb, var(--brand-primary, #39bfb0) 40%, transparent), var(--brand-primary, #39bfb0));
          transform-origin: center;
          animation: loaderFreq 1.4s ease-in-out infinite;
        }
      `}</style>

      <div className="sonor-loader-container">
        <div className="sonor-loader-icon">
          <LogoSvg
            fill="white"
            style={{ width: 120, height: 120 }}
          />
        </div>

        {/* 13 bars matching the Sonor logo waveform */}
        <div className="sonor-loader-freq">
          {[0.35, 0.45, 0.55, 0.70, 0.80, 0.90, 1.0, 0.90, 0.80, 0.70, 0.55, 0.45, 0.35].map((amp, i) => (
            <div
              key={i}
              className="sonor-loader-freq-bar"
              style={{
                height: amp * 28,
                animationDelay: `${Math.abs(i - 6) * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
