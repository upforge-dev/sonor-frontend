/**
 * SonicPulse — Radial sound-wave burst for milestone moments.
 *
 * When a user completes a phase, connects a service, or unlocks modules,
 * this fires concentric rings outward from a point — like a speaker cone
 * pushing air. Pure CSS, no canvas needed.
 *
 * Usage:
 *   <SonicPulse trigger={connectionComplete} rings={4} />
 */

interface SonicPulseProps {
  /** When this changes to true, fire the pulse */
  trigger: boolean
  /** Number of concentric rings (default 4) */
  rings?: number
  /** Color (default teal) */
  color?: string
  /** Size in px (default 200) */
  size?: number
  /** Duration in ms per ring (default 800) */
  duration?: number
  /** Additional className */
  className?: string
}

export default function SonicPulse({
  trigger,
  rings = 4,
  color = '#39bfb0',
  size = 200,
  duration = 800,
  className = '',
}: SonicPulseProps) {
  if (!trigger) return null

  const stagger = duration * 0.2 // overlap between rings

  return (
    <div
      className={`sonic-pulse-container ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes sonicRingExpand {
          0% {
            transform: scale(0.1);
            opacity: 0.8;
            border-width: 2.5px;
          }
          60% {
            opacity: 0.4;
            border-width: 1.5px;
          }
          100% {
            transform: scale(1);
            opacity: 0;
            border-width: 0.5px;
          }
        }

        @keyframes sonicCoreFlash {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          20% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(0.3);
            opacity: 0;
          }
        }
      `}</style>

      {/* Core flash — the "impact point" */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: size * 0.15,
          height: size * 0.15,
          marginTop: -(size * 0.075),
          marginLeft: -(size * 0.075),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}, transparent 70%)`,
          animation: `sonicCoreFlash ${duration * 0.6}ms ease-out forwards`,
        }}
      />

      {/* Concentric rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            opacity: 0,
            animation: `sonicRingExpand ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * stagger}ms forwards`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * SonicRipple — Smaller, inline ripple for button clicks / confirmations.
 * Unlike SonicPulse which is a large overlay effect, this is compact
 * and meant for inline use in action buttons, checkmarks, etc.
 */
export function SonicRipple({
  trigger,
  color = '#39bfb0',
  size = 40,
}: {
  trigger: boolean
  color?: string
  size?: number
}) {
  if (!trigger) return null

  return (
    <span
      style={{
        display: 'inline-block',
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      <style>{`
        @keyframes sonicMiniRipple {
          0% { transform: scale(0.3); opacity: 0.7; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
      {[0, 1].map(i => (
        <span
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            opacity: 0,
            animation: `sonicMiniRipple 500ms ease-out ${i * 120}ms forwards`,
          }}
        />
      ))}
    </span>
  )
}
