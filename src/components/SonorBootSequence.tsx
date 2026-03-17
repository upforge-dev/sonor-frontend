/**
 * SonorBootSequence — Cinematic post-login boot animation.
 *
 * One continuous flow: dark void → sound bars materialize from center →
 * circular shell traces around them → teal glow blooms → tagline fades in →
 * everything scales down and dissolves into the dashboard.
 *
 * All animations are CSS-driven with overlapping timelines — no discrete
 * "phase" boundaries. The entire sequence feels like one breath.
 *
 * Renders as a fixed overlay at z-[100]. Parent controls mount/unmount.
 */

import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Sound bar positions derived from Sonor logo (logo.svg, viewBox 0 0 300 300).
 * Each bar: { x: center-x in SVG coords, top: y-start, h: height }
 */
const LOGO_BARS = [
  { x: 64.25,  top: 139.7,  h: 25.73 },
  { x: 78.54,  top: 129.9,  h: 45.93 },
  { x: 92.83,  top: 138.9,  h: 26.72 },
  { x: 107.12, top: 143.44, h: 18.28 },
  { x: 121.42, top: 131.61, h: 42.91 },
  { x: 135.5,  top: 112.64, h: 76.44 },
  { x: 150.0,  top: 92.91,  h: 114.45 }, // center bar, tallest
  { x: 164.5,  top: 113.44, h: 76.44 },
  { x: 179.0,  top: 129.98, h: 43.51 },
  { x: 193.49, top: 141.98, h: 18.53 },
  { x: 207.99, top: 137.69, h: 25.68 },
  { x: 222.49, top: 128.69, h: 46.57 },
  { x: 236.99, top: 137.17, h: 26.86 },
]

const LOGO_CENTER = 150
const SCALE = 0.75

const bars = LOGO_BARS.map((bar, i) => ({
  offsetX: (bar.x - LOGO_CENTER) * SCALE,
  height: bar.h * SCALE,
  centerY: (bar.top + bar.h / 2 - LOGO_CENTER) * SCALE,
  // Stagger from center outward for a ripple effect
  delay: Math.abs(i - 6) * 0.03,
}))

interface Props {
  onComplete: () => void
}

export default function SonorBootSequence({ onComplete }: Props) {
  const [dissolving, setDissolving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const finish = useCallback(() => {
    setDissolving(true)
    timerRef.current = setTimeout(() => onComplete(), 700)
  }, [onComplete])

  useEffect(() => {
    // Total animation: ~3s, then dissolve
    const t = setTimeout(finish, 2800)
    return () => {
      clearTimeout(t)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [finish])

  return (
    <div
      className="sonor-boot"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: dissolving ? 0 : 1,
        transform: dissolving ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: dissolving ? 'none' as const : 'auto' as const,
      }}
    >
      <style>{`
        /* ================================================================
           BOOT SEQUENCE — One continuous CSS-driven animation flow.
           All timings overlap so phases blend into each other.
           ================================================================ */

        /* ── Ambient glow (fades in 0.4–1.2s) ── */
        .boot-ambient {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(57, 191, 176, 0.10) 0%,
            rgba(57, 191, 176, 0.04) 40%,
            transparent 70%
          );
          opacity: 0;
          animation: ambientIn 1.2s ease-out 0.3s forwards;
          pointer-events: none;
        }
        @keyframes ambientIn {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0.8; transform: scale(1.05); }
        }

        /* ── Sound bars ── */
        .boot-bar {
          position: absolute;
          width: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.9);
          transform-origin: center;
          will-change: transform, opacity, height, box-shadow;
          /* Start invisible and tiny */
          opacity: 0;
          height: 0px;
        }

        /* Bars materialize: each bar grows from 0 to target height.
           Uses individual animation-delay set via inline style. */
        .boot-bar {
          animation:
            barGrow 0.6s cubic-bezier(0.16, 1, 0.3, 1) var(--bar-delay) forwards,
            barGlow 0.8s ease-out calc(var(--bar-delay) + 0.8s) forwards;
        }

        @keyframes barGrow {
          0%   { opacity: 0; height: 2px; transform: scaleY(0.1); }
          40%  { opacity: 1; }
          70%  { transform: scaleY(1.15); }
          100% { opacity: 1; height: var(--bar-h); transform: scaleY(1); }
        }

        @keyframes barGlow {
          0%   { box-shadow: none; }
          50%  { box-shadow: 0 0 16px rgba(57, 191, 176, 0.5), 0 0 32px rgba(57, 191, 176, 0.15); }
          100% { box-shadow: 0 0 10px rgba(57, 191, 176, 0.35), 0 0 20px rgba(57, 191, 176, 0.1); }
        }

        /* ── Circular shell (SVG stroke-draw, starts at 0.6s) ── */
        .boot-shell {
          position: absolute;
          inset: 0;
          opacity: 0;
          animation: shellFadeIn 0.3s ease-out 0.6s forwards;
        }
        @keyframes shellFadeIn {
          to { opacity: 1; }
        }

        .boot-shell-path {
          fill: none;
          stroke: rgba(255, 255, 255, 0.7);
          stroke-width: 2;
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: shellTrace 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.7s forwards;
        }
        .boot-shell-path-2 {
          animation-delay: 0.85s;
        }
        @keyframes shellTrace {
          to { stroke-dashoffset: 0; }
        }

        /* Shell fill — white fill fades in after stroke trace completes */
        .boot-shell-fill {
          fill: rgba(255, 255, 255, 0.85);
          stroke: none;
          opacity: 0;
          animation: shellFillIn 0.6s ease-out 1.8s forwards;
        }
        .boot-shell-fill-2 {
          animation-delay: 1.8s;
        }
        @keyframes shellFillIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }

        /* Shell teal glow (appears as stroke completes) */
        .boot-shell-glow {
          fill: none;
          stroke: rgba(57, 191, 176, 0.3);
          stroke-width: 3;
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          filter: blur(4px);
          animation: shellTrace 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.75s forwards;
        }
        .boot-shell-glow-2 {
          animation-delay: 0.9s;
        }

        /* ── Tagline: "Intelligence, activated." ── */
        .boot-tagline {
          opacity: 0;
          transform: translateY(8px);
          animation: taglineIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 2.0s forwards;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 28px;
        }
        @keyframes taglineIn {
          to { opacity: 1; transform: translateY(0); }
        }

      `}</style>

      {/* Ambient background glow */}
      <div className="boot-ambient" />

      {/* Logo assembly: bars + shell. overflow:visible prevents shell clipping. */}
      <div style={{ position: 'relative', width: 240, height: 240, overflow: 'visible' }}>
        {/* Sound bars */}
        {bars.map((bar, i) => (
          <div
            key={i}
            className="boot-bar"
            style={{
              '--bar-delay': `${bar.delay}s`,
              '--bar-h': `${bar.height}px`,
              left: `calc(50% + ${bar.offsetX}px - 2px)`,
              top: `calc(50% + ${bar.centerY}px - ${bar.height / 2}px)`,
            } as React.CSSProperties}
          />
        ))}

        {/* Circular shell SVG */}
        <svg
          className="boot-shell"
          viewBox="-5 -5 310 310"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', inset: '-4%', width: '108%', height: '108%', overflow: 'visible' }}
        >
          {/* Shell trace paths */}
          <path
            className="boot-shell-path"
            d="M249.09,139.04l-.2,22.1c25.34,5.49,26.16,23.05,19.68,40.95,0,0-3.46,8.15-5.22,11.5-10.34,19.73-24.87,35.38-43.61,46.95-18.74,11.57-40.7,17.36-65.9,17.36s-46.84-5.79-65.58-17.36c-18.74-11.57-33.33-27.22-43.77-46.95-5.22-9.86-9.11-20.3-11.72-31.28-13.91-1.19-25.01-6.06-32.77-13.62,2.21,21.48,8.57,39.43,19.13,57.52,13.35,22.88,31.71,40.9,55.08,54.05,23.37,13.15,49.91,19.73,79.63,19.73s56.53-6.58,79.79-19.73c23.26-13.15,42.13-30.87,54.92-54.05,24.74-44.86,8.43-87.18-39.46-87.18Z"
          />
          <path
            className="boot-shell-path boot-shell-path-2"
            d="M50.91,160.96l.2-22.1c-25.34-5.49-26.16-23.05-19.68-40.95,0,0,3.46-8.15,5.22-11.5,10.34-19.73,24.87-35.38,43.61-46.95,18.74-11.57,40.7-17.36,65.9-17.36,24.98,0,46.84,5.79,65.58,17.36,18.74,11.57,33.33,27.22,43.77,46.95,5.22,9.86,9.11,20.3,11.72,31.28,13.91,1.19,25.01,6.06,32.77,13.62-2.21-21.48-8.57-39.43-19.13-57.52-13.35-22.88-31.71-40.9-55.08-54.05C202.43,6.58,175.88,0,146.17,0c-29.93,0-56.53,6.58-79.79,19.73-23.26,13.15-42.13,30.87-54.92,54.05-24.74,44.86-8.43,87.18,39.46,87.18Z"
          />
          {/* Teal glow layer behind the strokes */}
          <path
            className="boot-shell-glow"
            d="M249.09,139.04l-.2,22.1c25.34,5.49,26.16,23.05,19.68,40.95,0,0-3.46,8.15-5.22,11.5-10.34,19.73-24.87,35.38-43.61,46.95-18.74,11.57-40.7,17.36-65.9,17.36s-46.84-5.79-65.58-17.36c-18.74-11.57-33.33-27.22-43.77-46.95-5.22-9.86-9.11-20.3-11.72-31.28-13.91-1.19-25.01-6.06-32.77-13.62,2.21,21.48,8.57,39.43,19.13,57.52,13.35,22.88,31.71,40.9,55.08,54.05,23.37,13.15,49.91,19.73,79.63,19.73s56.53-6.58,79.79-19.73c23.26-13.15,42.13-30.87,54.92-54.05,24.74-44.86,8.43-87.18-39.46-87.18Z"
          />
          <path
            className="boot-shell-glow boot-shell-glow-2"
            d="M50.91,160.96l.2-22.1c-25.34-5.49-26.16-23.05-19.68-40.95,0,0,3.46-8.15,5.22-11.5,10.34-19.73,24.87-35.38,43.61-46.95,18.74-11.57,40.7-17.36,65.9-17.36,24.98,0,46.84,5.79,65.58,17.36,18.74,11.57,33.33,27.22,43.77,46.95,5.22,9.86,9.11,20.3,11.72,31.28,13.91,1.19,25.01,6.06,32.77,13.62-2.21-21.48-8.57-39.43-19.13-57.52-13.35-22.88-31.71-40.9-55.08-54.05C202.43,6.58,175.88,0,146.17,0c-29.93,0-56.53,6.58-79.79,19.73-23.26,13.15-42.13,30.87-54.92,54.05-24.74,44.86-8.43,87.18,39.46,87.18Z"
          />
          {/* White fill — fades in after stroke trace completes */}
          <path
            className="boot-shell-fill"
            d="M249.09,139.04l-.2,22.1c25.34,5.49,26.16,23.05,19.68,40.95,0,0-3.46,8.15-5.22,11.5-10.34,19.73-24.87,35.38-43.61,46.95-18.74,11.57-40.7,17.36-65.9,17.36s-46.84-5.79-65.58-17.36c-18.74-11.57-33.33-27.22-43.77-46.95-5.22-9.86-9.11-20.3-11.72-31.28-13.91-1.19-25.01-6.06-32.77-13.62,2.21,21.48,8.57,39.43,19.13,57.52,13.35,22.88,31.71,40.9,55.08,54.05,23.37,13.15,49.91,19.73,79.63,19.73s56.53-6.58,79.79-19.73c23.26-13.15,42.13-30.87,54.92-54.05,24.74-44.86,8.43-87.18-39.46-87.18Z"
          />
          <path
            className="boot-shell-fill boot-shell-fill-2"
            d="M50.91,160.96l.2-22.1c-25.34-5.49-26.16-23.05-19.68-40.95,0,0,3.46-8.15,5.22-11.5,10.34-19.73,24.87-35.38,43.61-46.95,18.74-11.57,40.7-17.36,65.9-17.36,24.98,0,46.84,5.79,65.58,17.36,18.74,11.57,33.33,27.22,43.77,46.95,5.22,9.86,9.11,20.3,11.72,31.28,13.91,1.19,25.01,6.06,32.77,13.62-2.21-21.48-8.57-39.43-19.13-57.52-13.35-22.88-31.71-40.9-55.08-54.05C202.43,6.58,175.88,0,146.17,0c-29.93,0-56.53,6.58-79.79,19.73-23.26,13.15-42.13,30.87-54.92,54.05-24.74,44.86-8.43,87.18,39.46,87.18Z"
          />
        </svg>
      </div>

      {/* Tagline */}
      <p className="boot-tagline">Intelligence, activated.</p>

    </div>
  )
}
