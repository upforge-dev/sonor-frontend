/**
 * SonicWaveform — Ambient waveform visualizer.
 *
 * Renders a smooth, animated sine-wave-composite that breathes and shifts.
 * Used as background texture in onboarding, behind the boot sequence,
 * and anywhere the platform's sonic identity should be felt.
 *
 * The waveform is built from layered sine waves with slightly different
 * frequencies and phases, creating an organic, audio-reactive look
 * without any actual audio input.
 *
 * Variants:
 *   - "ambient"  — Slow, subtle background wave (default)
 *   - "active"   — Faster, more energetic (data flowing, processing)
 *   - "pulse"    — Single wave that expands and fades (milestone hit)
 *   - "idle"     — Near-flat with occasional micro-movements
 */

import { useEffect, useRef } from 'react'

type WaveformVariant = 'ambient' | 'active' | 'pulse' | 'idle'

interface SonicWaveformProps {
  /** Visual intensity variant */
  variant?: WaveformVariant
  /** Primary color (default: teal #39bfb0) */
  color?: string
  /** Height of the component in px (default: 120) */
  height?: number
  /** Opacity (default: 0.15 for ambient, 0.3 for active) */
  opacity?: number
  /** Additional className */
  className?: string
}

const VARIANT_CONFIG: Record<WaveformVariant, {
  speed: number
  amplitude: number
  layers: number
  opacity: number
}> = {
  ambient: { speed: 0.3, amplitude: 0.4, layers: 3, opacity: 0.12 },
  active:  { speed: 0.8, amplitude: 0.7, layers: 4, opacity: 0.25 },
  pulse:   { speed: 1.2, amplitude: 1.0, layers: 2, opacity: 0.35 },
  idle:    { speed: 0.1, amplitude: 0.15, layers: 2, opacity: 0.06 },
}

export default function SonicWaveform({
  variant = 'ambient',
  color = '#39bfb0',
  height = 120,
  opacity,
  className = '',
}: SonicWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  const config = VARIANT_CONFIG[variant]
  const finalOpacity = opacity ?? config.opacity

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Parse color to RGB for alpha compositing
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = (rect?.width || 600) * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    startRef.current = performance.now()

    const draw = (timestamp: number) => {
      const elapsed = (timestamp - startRef.current) / 1000
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = height

      ctx.clearRect(0, 0, w, h)

      const mid = h / 2

      for (let layer = 0; layer < config.layers; layer++) {
        const layerOffset = layer * 0.7
        const layerAmplitude = config.amplitude * (1 - layer * 0.2) * (h * 0.35)
        const layerSpeed = config.speed * (1 + layer * 0.15)
        const layerOpacity = finalOpacity * (1 - layer * 0.15)

        ctx.beginPath()
        ctx.moveTo(0, mid)

        const points = Math.ceil(w / 2)
        for (let i = 0; i <= points; i++) {
          const x = (i / points) * w
          const normalizedX = x / w

          // Composite of multiple sine waves for organic feel
          const wave1 = Math.sin(normalizedX * Math.PI * 3 + elapsed * layerSpeed + layerOffset)
          const wave2 = Math.sin(normalizedX * Math.PI * 5 + elapsed * layerSpeed * 0.7 + layerOffset * 1.3) * 0.5
          const wave3 = Math.sin(normalizedX * Math.PI * 7 + elapsed * layerSpeed * 0.4 + layerOffset * 0.8) * 0.25

          // Envelope: fade edges to zero
          const envelope = Math.sin(normalizedX * Math.PI)

          const y = mid + (wave1 + wave2 + wave3) * layerAmplitude * envelope

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${layerOpacity})`
        ctx.lineWidth = 1.5 - layer * 0.3
        ctx.stroke()

        // Fill under the wave with very subtle gradient
        ctx.lineTo(w, mid)
        ctx.lineTo(0, mid)
        ctx.closePath()
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${layerOpacity * 0.15})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [variant, color, height, finalOpacity, config])

  return (
    <div
      className={`sonic-waveform ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
