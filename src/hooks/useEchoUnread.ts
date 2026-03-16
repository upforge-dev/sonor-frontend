/**
 * useEchoUnread — Polls for unread Echo messages and returns a badge count.
 *
 * Used by MessagesModuleV2 to show an unread badge on the Echo tab
 * when proactive insights or AI messages arrive while the user isn't on the tab.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { echoApi } from '@/lib/signal-api'

const POLL_INTERVAL_MS = 30_000

interface UseEchoUnreadOptions {
  /** Only poll when the Echo tab is NOT active */
  isEchoActive: boolean
  enabled?: boolean
}

export function useEchoUnread({ isEchoActive, enabled = true }: UseEchoUnreadOptions) {
  const [unreadCount, setUnreadCount] = useState(0)
  const lastSeenRef = useRef<string>(new Date().toISOString())

  const markSeen = useCallback(() => {
    lastSeenRef.current = new Date().toISOString()
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    if (!enabled) return

    // When switching TO Echo, mark as seen
    if (isEchoActive) {
      markSeen()
      return
    }

    // When NOT on Echo, poll for new messages
    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const count = await echoApi.getUnreadCount(lastSeenRef.current)
        setUnreadCount(typeof count === 'number' ? count : 0)
      } catch {
        // Silently fail — polling is best-effort
      }
    }

    poll()
    timer = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isEchoActive, enabled, markSeen])

  return { unreadCount, markSeen }
}
