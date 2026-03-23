/**
 * SonicBackground — Full-viewport ambient wave field.
 *
 * Renders layered sine-wave bands that drift slowly across the viewport,
 * providing a living "sound field" texture behind the frosted glass UI.
 *
 * Performance: renders at 0.5× device pixel ratio, uses ~w/4 sample points
 * per wave, and respects prefers-reduced-motion (single static frame).
 */

import { useEffect, useRef } from 'react'

// Single wave band centered at 50% viewport height, with 5 varied layers
const BAND_Y_FRACTION = 0.50
const LAYER_COUNT = 5
const BASE_SPEED = 0.18
const BASE_AMPLITUDE = 0.55

// Each layer has unique freq/phase/amplitude offsets for organic variation
const LAYERS = [
  { freqMult: 1.0,  phaseOffset: 0,    ampScale: 1.0,  opacityScale: 1.0,  lineWidth: 2.2 },
  { freqMult: 0.85, phaseOffset: 1.5,  ampScale: 0.85, opacityScale: 0.8,  lineWidth: 1.8 },
  { freqMult: 1.2,  phaseOffset: 3.0,  ampScale: 0.7,  opacityScale: 0.6,  lineWidth: 1.4 },
  { freqMult: 0.7,  phaseOffset: 4.5,  ampScale: 0.55, opacityScale: 0.45, lineWidth: 1.1 },
  { freqMult: 1.35, phaseOffset: 6.0,  ampScale: 0.4,  opacityScale: 0.3,  lineWidth: 0.8 },
]

// Fallback: Sonor teal
const DEFAULT_RGB = { r: 57, g: 191, b: 176 }

const BASE_OPACITY = { light: 0.50, dark: 0.55 } as const

function parseBrandColor(): { r: number; g: number; b: number } {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary')
      .trim()
    if (raw.startsWith('#') && (raw.length === 4 || raw.length === 7)) {
      let hex = raw.slice(1)
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }
    }
    const m = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (m) return { r: +m[1], g: +m[2], b: +m[3] }
  } catch {}
  return DEFAULT_RGB
}

export default function SonicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stateRef = useRef({
    raf: 0,
    start: 0,
    isDark: false,
    reducedMotion: false,
    rgb: DEFAULT_RGB,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const s = stateRef.current

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    s.reducedMotion = mq.matches

    const detectDark = () => {
      s.isDark = document.documentElement.classList.contains('dark')
      s.rgb = parseBrandColor()
    }
    detectDark()
    // Re-read brand color when CSS custom properties change (e.g. project switch)
    const styleObs = new MutationObserver(() => { s.rgb = parseBrandColor() })
    styleObs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    const darkObs = new MutationObserver(detectDark)
    darkObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    const scale = Math.min((window.devicePixelRatio || 1) * 0.5, 1)

    const resize = () => {
      canvas.width = window.innerWidth * scale
      canvas.height = window.innerHeight * scale
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    s.start = performance.now()

    const draw = (ts: number) => {
      const elapsed = (ts - s.start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight

      const { r, g, b } = s.rgb
      const baseOpacity = s.isDark ? BASE_OPACITY.dark : BASE_OPACITY.light

      ctx.clearRect(0, 0, w, h)

      const pts = Math.ceil(w / 4)
      const bandY = h * BAND_Y_FRACTION

      for (let li = 0; li < LAYER_COUNT; li++) {
        const layer = LAYERS[li]
        const phase = layer.phaseOffset
        const amp = BASE_AMPLITUDE * layer.ampScale * h * 0.18
        const spd = BASE_SPEED * layer.freqMult
        const alpha = baseOpacity * layer.opacityScale

        ctx.beginPath()

        for (let i = 0; i <= pts; i++) {
          const x = (i / pts) * w
          const nx = x / w

          const wave =
            Math.sin(nx * Math.PI * 2.5 + elapsed * spd + phase) +
            Math.sin(nx * Math.PI * 4 + elapsed * spd * 0.6 + phase * 1.3) * 0.5 +
            Math.sin(nx * Math.PI * 6.5 + elapsed * spd * 0.35 + phase * 0.7) * 0.3 +
            Math.sin(nx * Math.PI * 1.2 + elapsed * spd * 0.2 + phase * 2.1) * 0.15

          const y = bandY + wave * amp
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.lineWidth = layer.lineWidth
        ctx.stroke()

        ctx.lineTo(w, bandY)
        ctx.lineTo(0, bandY)
        ctx.closePath()
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.08})`
        ctx.fill()
      }

      if (!s.reducedMotion) {
        s.raf = requestAnimationFrame(draw)
      }
    }

    const kick = () => {
      cancelAnimationFrame(s.raf)
      s.raf = requestAnimationFrame(draw)
    }

    const onMotionChange = (e: MediaQueryListEvent) => {
      s.reducedMotion = e.matches
      if (!e.matches) kick()
    }
    mq.addEventListener('change', onMotionChange)

    kick()

    return () => {
      cancelAnimationFrame(s.raf)
      window.removeEventListener('resize', resize)
      mq.removeEventListener('change', onMotionChange)
      darkObs.disconnect()
      styleObs.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}
