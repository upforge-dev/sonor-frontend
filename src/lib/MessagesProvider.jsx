/**
 * MessagesProvider - Socket lifecycle and query invalidation for Messages
 *
 * Connects to the messages WebSocket when user is authenticated.
 * Invalidates React Query cache when real-time events arrive.
 * Replaces the socket/subscription logic from messages-store.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase-auth'
import {
  connectSocket,
  disconnectSocket,
  setHandlers,
  startHeartbeat,
  stopHeartbeat,
} from './messages-socket'
import { messagesKeys } from './hooks/use-messages'

// Audio for notification sounds
let messageNotificationAudio = null
function playNotificationSound() {
  try {
    if (!messageNotificationAudio) {
      messageNotificationAudio = new Audio('/chatnotification.wav')
      messageNotificationAudio.volume = 0.5
    }
    messageNotificationAudio.currentTime = 0
    messageNotificationAudio.play().catch(() => {})
  } catch {}
}

/** Play an urgent, unmissable notification for live chat handoffs — full volume, twice. */
function playUrgentNotificationSound() {
  try {
    const audio = new Audio('/chatnotification.wav')
    audio.volume = 1.0
    audio.currentTime = 0
    audio.play().catch(() => {})
    // Second chime after 1.5s to make it impossible to miss
    setTimeout(() => {
      const audio2 = new Audio('/chatnotification.wav')
      audio2.volume = 1.0
      audio2.currentTime = 0
      audio2.play().catch(() => {})
    }, 1500)
  } catch {}
}

const PendingHandoffsContext = createContext([])
export function usePendingHandoffs() {
  return useContext(PendingHandoffsContext)
}

/**
 * Provider that manages the messages socket connection.
 * Wrap your app (or the layout that needs messaging) with this.
 */
export function MessagesProvider({ children }) {
  const queryClient = useQueryClient()
  const [pendingHandoffs, setPendingHandoffs] = useState([])

  useEffect(() => {
    let resolvedUserId = null
    let soundEnabled = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const sessionData = session

      if (!sessionData?.access_token || !sessionData?.user) {
        return
      }

      const user = sessionData.user
      resolvedUserId = user.id
      const orgId = user.user_metadata?.org_id || user.app_metadata?.org_id
      const userName = user.user_metadata?.name || user.email || 'User'

      if (!orgId) {
        console.warn('[MessagesProvider] No org_id, skipping socket connect')
        return
      }

      setHandlers({
        onConnect: () => {
          startHeartbeat()
        },
        onDisconnect: () => {
          stopHeartbeat()
        },
        onMessage: (message) => {
          queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
          if (soundEnabled && message.sender_id !== resolvedUserId) {
            playNotificationSound()
          }
        },
        onMessageEdited: () => {
          queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() })
        },
        onMessageDeleted: () => {
          queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
        },
        onMessageRead: () => {
          queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
        },
        onEngageMessage: () => {
          queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
        },
        onEngageSession: (data) => {
          queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() })
          queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
          const session = data?.session || data
          if (session?.status === 'pending_handoff' || session?.chat_status === 'pending_handoff') {
            setPendingHandoffs((prev) => {
              const exists = prev.some((h) => h.id === session.id)
              if (exists) return prev
              return [...prev, { id: session.id, ...session }]
            })

            // Urgent live handoff — play loud sound and force-open the chat widget
            if (data?.urgent || data?.type === 'live_handoff') {
              playUrgentNotificationSound()
              window.dispatchEvent(
                new CustomEvent('open-livechat', {
                  detail: { sessionId: session.id, urgent: true },
                }),
              )
            }
          } else {
            setPendingHandoffs((prev) => prev.filter((h) => h.id !== session?.id))
          }
        },
      })

      connectSocket(sessionData.access_token)
    }

    init()

    return () => {
      stopHeartbeat()
      disconnectSocket()
    }
  }, [queryClient])

  return (
    <PendingHandoffsContext.Provider value={pendingHandoffs}>
      {children}
    </PendingHandoffsContext.Provider>
  )
}

export function openChatBubble(conversationId) {
  const event = new CustomEvent('openChatBubble', { detail: { conversationId } })
  window.dispatchEvent(event)
}
