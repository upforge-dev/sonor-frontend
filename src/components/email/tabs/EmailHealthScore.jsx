/**
 * EmailHealthScore — Circular ring gauge showing overall email health (0-100).
 *
 * Weighted scoring:
 *   Deliverability (30pts) — bounce rate < 2% = 30, < 5% = 15, else 0
 *   Engagement (25pts)     — open rate vs 21% industry avg
 *   List growth (15pts)    — any new subscribers this month
 *   Automation (15pts)     — at least 1 active automation
 *   Regular sending (15pts)— sent a campaign in the last 14 days
 *
 * Uses GlassCard, CSS variables, brand-primary.
 */

import { useMemo } from 'react'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/glass-card'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const RING_SIZE = 96
const STROKE_WIDTH = 8
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function scoreColor(score) {
  if (score >= 80) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 50) return 'Fair'
  return 'Needs Work'
}

/**
 * @param {object} props
 * @param {number} props.bounceRate - Bounce rate as a percentage (0-100)
 * @param {number} props.openRate - Weighted open rate percentage
 * @param {boolean} props.hasNewSubscribers - New subscribers this month
 * @param {boolean} props.hasActiveAutomation - At least 1 active automation
 * @param {boolean} props.hasRecentCampaign - Sent campaign in last 14 days
 * @param {boolean} props.domainVerified - Primary sending domain verified in Resend
 * @param {boolean} props.spfValid - SPF record configured correctly
 * @param {boolean} props.dkimValid - DKIM record configured correctly
 */
export default function EmailHealthScore({
  bounceRate = 0,
  openRate = 0,
  hasNewSubscribers = false,
  hasActiveAutomation = false,
  hasRecentCampaign = false,
  domainVerified = false,
  spfValid = false,
  dkimValid = false,
}) {
  const { score, breakdown } = useMemo(() => {
    const items = []

    // Deliverability (30pts) — domain health + bounce rate
    let deliverability = 0
    // Domain verification (15pts of the 30)
    if (domainVerified) deliverability += 10
    if (spfValid) deliverability += 3
    if (dkimValid) deliverability += 2
    // Bounce rate (15pts of the 30)
    if (bounceRate < 2) deliverability += 15
    else if (bounceRate < 5) deliverability += 8
    items.push({ label: 'Deliverability', pts: deliverability, max: 30 })

    // Engagement (25pts)
    let engagement = 0
    if (openRate >= 21) engagement = 25
    else if (openRate >= 16) engagement = 15
    items.push({ label: 'Engagement', pts: engagement, max: 25 })

    // List growth (15pts)
    const growth = hasNewSubscribers ? 15 : 0
    items.push({ label: 'List Growth', pts: growth, max: 15 })

    // Automation (15pts)
    const automation = hasActiveAutomation ? 15 : 0
    items.push({ label: 'Automation', pts: automation, max: 15 })

    // Regular sending (15pts)
    const sending = hasRecentCampaign ? 15 : 0
    items.push({ label: 'Sending', pts: sending, max: 15 })

    const total = items.reduce((s, i) => s + i.pts, 0)
    return { score: total, breakdown: items }
  }, [bounceRate, openRate, hasNewSubscribers, hasActiveAutomation, hasRecentCampaign])

  const color = scoreColor(score)
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  return (
    <GlassCard>
      <GlassCardContent className="p-5">
        <div className="flex items-center gap-5">
          {/* SVG Ring Gauge */}
          <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
            >
              {/* Background track */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--glass-border)"
                strokeWidth={STROKE_WIDTH}
              />
              {/* Score arc */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={color}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[var(--text-primary)]">{score}</span>
            </div>
          </div>

          {/* Score details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" style={{ color }} />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Email Health
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${color}15`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {scoreLabel(score)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {breakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span
                    className={cn(
                      'font-medium',
                      item.pts === item.max
                        ? 'text-emerald-500'
                        : item.pts > 0
                        ? 'text-yellow-500'
                        : 'text-[var(--text-tertiary)]',
                    )}
                  >
                    {item.pts}/{item.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
