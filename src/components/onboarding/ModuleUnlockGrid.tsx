/**
 * ModuleUnlockGrid — Cinematic module activation grid for onboarding.
 *
 * Displays all Sonor modules as a grid of greyed-out icons. When modules
 * are activated, they illuminate one by one with a teal pulse + glow.
 *
 * Usage:
 *   <ModuleUnlockGrid
 *     enabledModules={['seo', 'analytics', 'crm']}
 *     animateIn={true}
 *     onComplete={() => ...}
 *   />
 */

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import {
  Search,
  BarChart3,
  Users,
  ShoppingCart,
  FileText,
  Star,
  Send,
  Calendar,
  MessageSquare,
  Zap,
  Globe,
  Palette,
  Megaphone,
  Handshake,
  type LucideIcon,
} from 'lucide-react'

interface ModuleDef {
  key: string
  label: string
  icon: LucideIcon
}

const ALL_MODULES: ModuleDef[] = [
  { key: 'seo', label: 'SEO', icon: Search },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'commerce', label: 'Commerce', icon: ShoppingCart },
  { key: 'blog', label: 'Blog', icon: FileText },
  { key: 'reputation', label: 'Reputation', icon: Star },
  { key: 'broadcast', label: 'Broadcast', icon: Send },
  { key: 'sync', label: 'Sync', icon: Calendar },
  { key: 'engage', label: 'Engage', icon: MessageSquare },
  { key: 'signal', label: 'Signal AI', icon: Zap },
  { key: 'website', label: 'Website', icon: Globe },
  { key: 'forms', label: 'Forms', icon: Palette },
  { key: 'outreach', label: 'Outreach', icon: Megaphone },
  { key: 'affiliates', label: 'Affiliates', icon: Handshake },
]

interface ModuleUnlockGridProps {
  /** Module keys that should illuminate */
  enabledModules: string[]
  /** Whether to animate them in sequentially (true) or show all at once (false) */
  animateIn?: boolean
  /** Stagger delay between each module unlock in ms (default 200) */
  staggerDelay?: number
  /** Called when all modules have finished animating */
  onComplete?: () => void
}

const SonicPulse = lazy(() => import('./SonicPulse'))

export default function ModuleUnlockGrid({
  enabledModules,
  animateIn = true,
  staggerDelay = 200,
  onComplete,
}: ModuleUnlockGridProps) {
  const [unlockedSet, setUnlockedSet] = useState<Set<string>>(
    animateIn ? new Set() : new Set(enabledModules),
  )
  const [allUnlocked, setAllUnlocked] = useState(false)
  const hasAnimatedRef = useRef(false)

  // Sequential unlock animation
  useEffect(() => {
    if (!animateIn || hasAnimatedRef.current || enabledModules.length === 0) return
    hasAnimatedRef.current = true

    // Initial delay before first unlock
    const startDelay = 400

    enabledModules.forEach((mod, i) => {
      setTimeout(() => {
        setUnlockedSet(prev => new Set([...prev, mod]))
        if (i === enabledModules.length - 1) {
          // All done — fire sonic pulse
          setAllUnlocked(true)
          setTimeout(() => onComplete?.(), 600)
        }
      }, startDelay + i * staggerDelay)
    })
  }, [animateIn, enabledModules, staggerDelay, onComplete])

  return (
    <div className="module-unlock-grid">
      <style>{`
        .module-unlock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 12px;
          max-width: 520px;
          width: 100%;
          position: relative;
        }

        .module-unlock-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 8px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          position: relative;
          overflow: hidden;
        }

        .module-unlock-cell.locked {
          opacity: 0.3;
        }

        .module-unlock-cell.unlocked {
          border-color: rgba(57, 191, 176, 0.25);
          background: rgba(57, 191, 176, 0.06);
          opacity: 1;
          animation: moduleReveal 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        .module-unlock-cell.unlocked .module-icon {
          color: #39bfb0;
          filter: drop-shadow(0 0 8px rgba(57, 191, 176, 0.4));
        }

        .module-unlock-cell.unlocked .module-label {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Pulse ring on unlock */
        .module-unlock-cell.unlocked::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          border: 2px solid rgba(57, 191, 176, 0.5);
          animation: unlockPulse 0.8s ease-out forwards;
          pointer-events: none;
        }

        .module-icon {
          width: 24px;
          height: 24px;
          color: rgba(255, 255, 255, 0.2);
          transition: all 0.6s ease;
        }

        .module-label {
          font-size: 10px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.2);
          text-align: center;
          transition: color 0.6s ease;
          letter-spacing: 0.02em;
        }

        @keyframes moduleReveal {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes unlockPulse {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.15); }
        }
      `}</style>

      {ALL_MODULES.map(mod => {
        const isUnlocked = unlockedSet.has(mod.key)
        const Icon = mod.icon
        return (
          <div
            key={mod.key}
            className={`module-unlock-cell ${isUnlocked ? 'unlocked' : 'locked'}`}
          >
            <Icon className="module-icon" />
            <span className="module-label">{mod.label}</span>
          </div>
        )
      })}

      {/* Sonic pulse fires when all modules unlock */}
      {allUnlocked && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          <Suspense fallback={null}>
            <SonicPulse trigger={true} rings={3} size={300} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
