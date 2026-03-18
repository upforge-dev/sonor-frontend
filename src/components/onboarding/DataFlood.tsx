/**
 * DataFlood — Cinematic data streaming animation for onboarding.
 *
 * When a user connects Google (GSC, Analytics, GBP) or any data source,
 * this renders a terminal-like cascade of real or simulated data entries
 * with ticking counters. Think: the Matrix, but for your business data.
 *
 * Usage:
 *   <DataFlood
 *     provider="google"
 *     entries={['sonor.io/pricing — #3 for "ai marketing"', ...]}
 *     counters={{ keywords: 142, pages: 38, reviews: 24 }}
 *     onComplete={() => ...}
 *   />
 */

import { useState, useEffect, useRef, useMemo } from 'react'

interface DataFloodProps {
  /** Which provider was connected */
  provider: string
  /** Data entries to stream (real or simulated) */
  entries?: string[]
  /** Counter targets to tick up to */
  counters?: Record<string, number>
  /** Label overrides for counter keys */
  counterLabels?: Record<string, string>
  /** Called when animation finishes */
  onComplete?: () => void
  /** Duration in ms (default 3000) */
  duration?: number
}

const DEFAULT_LABELS: Record<string, string> = {
  keywords: 'Keywords Found',
  pages: 'Pages Indexed',
  reviews: 'Reviews Synced',
  contacts: 'Contacts Imported',
  posts: 'Posts Discovered',
  products: 'Products Found',
  sessions: 'Sessions Tracked',
  conversions: 'Conversions',
  rankings: 'Rankings Tracked',
  locations: 'Locations',
  subscribers: 'Subscribers',
}

// Simulated data entries per provider when none are provided
const SIMULATED_ENTRIES: Record<string, string[]> = {
  google: [
    'Fetching Search Console data...',
    'keywords:discover → 142 tracked keywords',
    'pages:index → 38 indexed pages',
    'rankings:sync → position data flowing',
    'analytics:connect → sessions streaming',
    'gbp:profile → business info loaded',
    'gbp:reviews → review feed synced',
    'gsc:clicks → click-through data ready',
    'gsc:impressions → impression data ready',
    'ga4:events → conversion tracking active',
    'ga4:audiences → audience segments loaded',
    'gbp:photos → photo library synced',
  ],
  facebook: [
    'Connecting Facebook Business...',
    'pages:fetch → business page found',
    'insights:sync → engagement data flowing',
    'posts:recent → 30 days of posts loaded',
    'audience:demographics → insights ready',
  ],
  shopify: [
    'Connecting Shopify store...',
    'products:sync → catalog loading',
    'orders:recent → order history streaming',
    'customers:import → customer data flowing',
    'inventory:check → stock levels synced',
  ],
  default: [
    'Establishing connection...',
    'data:fetch → records loading',
    'sync:progress → data streaming',
    'index:build → organizing data',
    'status:ready → sync complete',
  ],
}

function TickingCounter({ target, duration }: { target: number; duration: number }) {
  const [current, setCurrent] = useState(0)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out curve for the counter
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress >= 1) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [target, duration])

  return <span>{current.toLocaleString()}</span>
}

export default function DataFlood({
  provider,
  entries,
  counters,
  counterLabels,
  onComplete,
  duration = 3000,
}: DataFloodProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [phase, setPhase] = useState<'streaming' | 'counters' | 'done'>('streaming')
  const scrollRef = useRef<HTMLDivElement>(null)

  const allEntries = useMemo(() => {
    if (entries && entries.length > 0) return entries
    return SIMULATED_ENTRIES[provider] || SIMULATED_ENTRIES.default
  }, [entries, provider])

  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...counterLabels }), [counterLabels])

  // Stream entries one by one
  useEffect(() => {
    if (phase !== 'streaming') return

    const perLine = (duration * 0.6) / allEntries.length
    let line = 0

    const interval = setInterval(() => {
      line++
      setVisibleLines(line)

      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }

      if (line >= allEntries.length) {
        clearInterval(interval)
        // Brief pause then show counters
        setTimeout(() => setPhase('counters'), 200)
      }
    }, perLine)

    return () => clearInterval(interval)
  }, [phase, allEntries, duration])

  // Counters phase → done
  useEffect(() => {
    if (phase !== 'counters') return
    const timer = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, duration * 0.4)
    return () => clearTimeout(timer)
  }, [phase, duration, onComplete])

  return (
    <div className="data-flood-container">
      <style>{`
        .data-flood-container {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(57, 191, 176, 0.15);
          border-radius: 12px;
          padding: 20px;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          overflow: hidden;
          max-width: 520px;
          width: 100%;
        }

        .data-flood-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .data-flood-sonic {
          display: flex;
          align-items: center;
          gap: 1.5px;
          height: 14px;
        }

        .data-flood-sonic-bar {
          width: 2px;
          border-radius: 1px;
          background: #39bfb0;
          transform-origin: center;
          animation: floodBar 0.6s ease-in-out infinite alternate;
        }

        @keyframes floodBar {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }

        .data-flood-title {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .data-flood-scroll {
          max-height: 180px;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .data-flood-scroll::-webkit-scrollbar { display: none; }

        .data-flood-line {
          font-size: 12px;
          line-height: 1.8;
          color: rgba(57, 191, 176, 0.7);
          opacity: 0;
          animation: floodLineIn 0.15s ease-out forwards;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .data-flood-line::before {
          content: '>';
          margin-right: 8px;
          color: rgba(57, 191, 176, 0.3);
        }

        .data-flood-counters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .data-flood-counter {
          text-align: center;
          opacity: 0;
          animation: counterReveal 0.4s ease-out forwards;
        }

        .data-flood-counter-value {
          font-size: 24px;
          font-weight: 700;
          color: #39bfb0;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 20px rgba(57, 191, 176, 0.3);
        }

        .data-flood-counter-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 2px;
        }

        @keyframes floodLineIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @keyframes counterReveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes floodPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      {/* Header */}
      <div className="data-flood-header">
        <div className="data-flood-sonic">
          {[0.6, 0.9, 1, 0.7, 0.5].map((h, i) => (
            <div
              key={i}
              className="data-flood-sonic-bar"
              style={{
                height: h * 14,
                animationDelay: `${i * 0.1}s`,
                animationDuration: phase === 'streaming' ? '0.5s' : '1.2s',
                opacity: phase === 'done' ? 0.3 : 1,
              }}
            />
          ))}
        </div>
        <span className="data-flood-title">
          {provider === 'google' ? 'Google Data Sync' : `${provider} Sync`}
        </span>
      </div>

      {/* Streaming lines */}
      <div className="data-flood-scroll" ref={scrollRef}>
        {allEntries.slice(0, visibleLines).map((entry, i) => (
          <div
            key={i}
            className="data-flood-line"
            style={{ animationDelay: `${i * 0.02}s` }}
          >
            {entry}
          </div>
        ))}
      </div>

      {/* Counters */}
      {phase !== 'streaming' && counters && Object.keys(counters).length > 0 && (
        <div className="data-flood-counters">
          {Object.entries(counters).map(([key, target], i) => (
            <div
              key={key}
              className="data-flood-counter"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="data-flood-counter-value">
                <TickingCounter target={target} duration={duration * 0.35} />
              </div>
              <div className="data-flood-counter-label">
                {labels[key] || key}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
