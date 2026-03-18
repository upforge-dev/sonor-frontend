/**
 * FrequencyBars — EQ-style animated bars for loading/processing states.
 *
 * Replaces generic spinners with the Sonor sonic identity. Each bar
 * oscillates at a slightly different frequency, creating an audio
 * equalizer visualization that reinforces the brand.
 *
 * Variants:
 *   - "loading"    — Gentle, rhythmic oscillation (default)
 *   - "processing" — Faster, more energetic (AI thinking, data syncing)
 *   - "success"    — Bars peak then settle to a steady state
 *   - "listening"  — Subtle, responsive micro-movements (Echo waiting)
 *
 * Usage:
 *   <FrequencyBars variant="processing" label="Syncing data..." />
 */

interface FrequencyBarsProps {
  variant?: 'loading' | 'processing' | 'success' | 'listening'
  /** Number of bars (default 13, matching the Sonor logo) */
  bars?: number
  /** Bar color (default teal) */
  color?: string
  /** Height of tallest bar in px (default 32) */
  height?: number
  /** Optional label text below */
  label?: string
  /** Additional className */
  className?: string
}

// The Sonor logo has 13 bars with specific relative heights.
// We use these as base amplitudes so the EQ "rests" in the logo shape.
const LOGO_AMPLITUDES = [
  0.35, 0.45, 0.55, 0.70, 0.80, 0.90, 1.0, 0.90, 0.80, 0.70, 0.55, 0.45, 0.35,
]

const VARIANT_CONFIG = {
  loading:    { speed: '1.4s', range: 0.4, timing: 'ease-in-out' },
  processing: { speed: '0.6s', range: 0.6, timing: 'ease-in-out' },
  success:    { speed: '0.8s', range: 0.2, timing: 'ease-out' },
  listening:  { speed: '2.0s', range: 0.15, timing: 'ease-in-out' },
}

export default function FrequencyBars({
  variant = 'loading',
  bars = 13,
  color = '#39bfb0',
  height = 32,
  label,
  className = '',
}: FrequencyBarsProps) {
  const config = VARIANT_CONFIG[variant]

  // If not 13 bars, interpolate the logo amplitudes
  const amplitudes = bars === 13
    ? LOGO_AMPLITUDES
    : Array.from({ length: bars }, (_, i) => {
        const t = i / (bars - 1)
        // Bell curve
        return 0.3 + 0.7 * Math.sin(t * Math.PI)
      })

  return (
    <div className={`frequency-bars-container ${className}`}>
      <style>{`
        .frequency-bars-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .frequency-bars-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2.5px;
          height: ${height}px;
        }

        .freq-bar {
          width: 3px;
          border-radius: 1.5px;
          transform-origin: center;
          will-change: transform;
        }

        .frequency-bars-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.03em;
          text-align: center;
        }

        @keyframes freqOscillate {
          0%, 100% { transform: scaleY(var(--freq-min)); }
          50% { transform: scaleY(var(--freq-max)); }
        }

        @keyframes freqSuccess {
          0% { transform: scaleY(var(--freq-min)); }
          30% { transform: scaleY(1.1); }
          100% { transform: scaleY(var(--freq-base)); }
        }
      `}</style>

      <div className="frequency-bars-row">
        {amplitudes.map((amp, i) => {
          const baseHeight = amp * height
          const minScale = Math.max(0.15, 1 - config.range)
          const maxScale = Math.min(1, 1 + config.range * 0.3)

          // Stagger: center bars are slightly ahead
          const centerDist = Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2)
          const delay = centerDist * 0.3

          const isSuccess = variant === 'success'

          return (
            <div
              key={i}
              className="freq-bar"
              style={{
                height: baseHeight,
                background: `linear-gradient(to top, ${color}88, ${color})`,
                boxShadow: `0 0 ${4 + amp * 4}px ${color}33`,
                '--freq-min': minScale,
                '--freq-max': maxScale,
                '--freq-base': amp,
                animation: isSuccess
                  ? `freqSuccess 0.8s ease-out ${delay}s forwards`
                  : `freqOscillate ${config.speed} ${config.timing} ${delay}s infinite`,
              } as React.CSSProperties}
            />
          )
        })}
      </div>

      {label && <span className="frequency-bars-label">{label}</span>}
    </div>
  )
}

/**
 * SonicLoader — Drop-in replacement for generic spinners.
 * Compact frequency bars that serve as the Sonor-branded loading indicator.
 */
export function SonicLoader({
  size = 'md',
  label,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}) {
  const config = {
    sm: { bars: 5, height: 16, gap: 2 },
    md: { bars: 9, height: 24, gap: 2.5 },
    lg: { bars: 13, height: 32, gap: 3 },
  }[size]

  return (
    <FrequencyBars
      variant="loading"
      bars={config.bars}
      height={config.height}
      label={label}
      className={className}
    />
  )
}
