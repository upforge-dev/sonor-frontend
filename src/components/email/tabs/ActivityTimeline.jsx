/**
 * ActivityTimeline — Chronological feed of recent email events.
 *
 * Events:
 *   campaign_sent      — Send icon, brand color
 *   campaign_scheduled — Send icon, blue
 *   subscribers_added  — UserPlus icon, green
 *   unsubscribe        — UserMinus icon, red
 *   bounce             — AlertTriangle icon, orange
 *   automation_trigger  — Zap icon, purple
 *
 * Uses GlassCard, CSS variables, SonorSpinner for loading.
 */

import { useEffect, useState, useRef } from 'react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import {
  Send,
  UserPlus,
  UserMinus,
  AlertTriangle,
  Zap,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'

const EVENT_CONFIG = {
  campaign_sent: {
    icon: Send,
    bgClass: 'bg-[rgba(20,184,166,0.15)]',
    textClass: 'text-[#14B8A6]',
  },
  campaign_scheduled: {
    icon: Send,
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-500',
  },
  subscribers_added: {
    icon: UserPlus,
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-500',
  },
  unsubscribe: {
    icon: UserMinus,
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-500',
  },
  bounce: {
    icon: AlertTriangle,
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-500',
  },
  automation_trigger: {
    icon: Zap,
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-500',
  },
}

function timeAgo(timestamp) {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityTimeline() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const fetched = useRef(false)
  const currentProject = useAuthStore((s) => s.currentProject)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    const load = async () => {
      try {
        const res = await emailApi.getActivity(currentProject?.id)
        const data = res.data || res
        setEvents(data.events || [])
      } catch {
        // Silent fail — empty state shown
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentProject?.id])

  const fallbackConfig = {
    icon: Activity,
    bgClass: 'bg-[var(--glass-bg)]',
    textClass: 'text-[var(--text-tertiary)]',
  }

  return (
    <GlassCard className="h-full flex flex-col">
      <GlassCardHeader className="pb-3 shrink-0">
        <GlassCardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--brand-primary)]" />
          Activity
        </GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-end gap-1 h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-[var(--brand-primary)]"
                  style={{
                    animation: `eq-bar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                    height: '30%',
                  }}
                />
              ))}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto mb-3 w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center opacity-60">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
            {events.slice(0, 10).map((event, idx) => {
              const config = EVENT_CONFIG[event.type] || fallbackConfig
              const IconComponent = config.icon
              return (
                <div
                  key={`${event.type}-${idx}`}
                  className={cn(
                    'flex items-start gap-3 p-2.5 rounded-lg',
                    'hover:bg-[var(--glass-bg)] transition-colors duration-150',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                      config.bgClass,
                    )}
                  >
                    <IconComponent className={cn('h-4 w-4', config.textClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-snug">
                      {event.description}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {timeAgo(event.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
