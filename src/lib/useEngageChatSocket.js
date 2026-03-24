// src/lib/useEngageChatSocket.js
// React hook for Portal API WebSocket connection to /engage/chat namespace
// Handles real-time messaging, typing indicators, and agent notifications

import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { supabase } from './supabase-auth'

const PORTAL_API_URL = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || 'https://api.sonor.io'

/**
 * Hook for connecting to Engage live chat WebSocket
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to connect
 * @param {string} options.projectId - Project ID to filter sessions
 * @param {string} options.orgId - Org ID for handoff/org-level events
 * @param {Function} options.onMessage - Callback for new messages
 * @param {Function} options.onVisitorTyping - Callback for visitor typing status
 * @param {Function} options.onSessionUpdate - Callback for session status changes
 * @param {Function} options.onHandoffRequest - Callback for handoff requests
 * @param {Function} options.onAgentJoined - Callback when another agent joins
 */
export function useEngageChatSocket({
  enabled = true,
  projectId,
  orgId,
  onMessage,
  onVisitorTyping,
  onSessionUpdate,
  onHandoffRequest,
  onAgentJoined,
} = {}) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [visitorTypingStates, setVisitorTypingStates] = useState({}) // { sessionId: { isTyping, timestamp } }

  // Get token: prefer Supabase session (same as Portal API Bearer) so gateway validates correctly.
  // Fallback to cookie (sb-access-token or sb-<project-ref>-auth-token) for legacy/envs.
  const getToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) return session.access_token
    } catch (_) {}
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})
    return cookies['sb-access-token'] || cookies['sb-qxnfswulhjrwinosjxon-auth-token']
  }, [])

  const typingCleanupRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    const connect = async () => {
      const token = await getToken()
      if (!token) {
        console.warn('[EngageChatSocket] No auth token found (check Supabase session or cookies)')
        return
      }

      console.log('[EngageChatSocket] Connecting to Portal API...')

      const socket = io(`${PORTAL_API_URL}/engage/chat`, {
        auth: { token },
        query: { projectId, orgId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socketRef.current = socket

      // Connection events
      socket.on('connect', () => {
        console.log('[EngageChatSocket] Connected')
        setIsConnected(true)
        setConnectionError(null)
        if (projectId) socket.emit('agent:join-project', { projectId })
      })

      socket.on('disconnect', (reason) => {
        console.log('[EngageChatSocket] Disconnected:', reason)
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('[EngageChatSocket] Connection error:', error.message)
        setConnectionError(error.message)
      })

      socket.on('chat:message', (data) => {
        onMessage?.(data)
      })

      socket.on('message:sent', () => {})

      socket.on('visitor:typing', (data) => {
        const { sessionId, isTyping } = data
        if (isTyping) {
          setVisitorTypingStates(prev => ({ ...prev, [sessionId]: { isTyping: true, timestamp: Date.now() } }))
        } else {
          setVisitorTypingStates(prev => {
            const newState = { ...prev }
            delete newState[sessionId]
            return newState
          })
        }
        onVisitorTyping?.(data)
      })

      socket.on('session:updated', (session) => {
        onSessionUpdate?.(session)
      })

      socket.on('handoff:requested', (data) => {
        onHandoffRequest?.(data)
      })

      socket.on('agent:joined', (data) => {
        onAgentJoined?.(data)
      })

      socket.on('chat:transferred', (data) => {
        onSessionUpdate?.(data)
      })

      typingCleanupRef.current = setInterval(() => {
        setVisitorTypingStates(prev => {
          const now = Date.now()
          const next = {}
          for (const [sid, state] of Object.entries(prev)) {
            if (now - state.timestamp < 3000) next[sid] = state
          }
          return next
        })
      }, 1000)
    }

    connect()
    return () => {
      if (typingCleanupRef.current) {
        clearInterval(typingCleanupRef.current)
        typingCleanupRef.current = null
      }
      const socket = socketRef.current
      if (socket) {
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [enabled, projectId, orgId, getToken])

  // ─────────────────────────────────────────────────────────────────────────────
  // Agent Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send message to visitor
   */
  const sendMessage = useCallback((sessionId, content) => {
    if (!socketRef.current?.connected) {
      console.warn('[EngageChatSocket] Not connected')
      return false
    }
    socketRef.current.emit('agent:message', { sessionId, content })
    return true
  }, [])

  /**
   * Emit agent typing status
   */
  const setAgentTyping = useCallback((sessionId, isTyping) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('agent:typing', { sessionId, isTyping })
  }, [])

  /**
   * Join a specific chat session
   */
  const joinSession = useCallback((sessionId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('agent:join', { sessionId })
  }, [])

  /**
   * Leave a chat session
   */
  const leaveSession = useCallback((sessionId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('agent:leave', { sessionId })
  }, [])

  /**
   * Transfer chat to another agent
   */
  const transferChat = useCallback((sessionId, toAgentId, note) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('chat:transfer', { sessionId, toAgentId, note })
  }, [])

  /**
   * Close a chat session
   */
  const closeSession = useCallback((sessionId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('session:close', { sessionId })
  }, [])

  /**
   * Check if visitor is typing in a session
   */
  const isVisitorTyping = useCallback((sessionId) => {
    return visitorTypingStates[sessionId]?.isTyping || false
  }, [visitorTypingStates])

  return {
    // State
    isConnected,
    connectionError,
    socket: socketRef.current,
    visitorTypingStates,
    
    // Actions
    sendMessage,
    setAgentTyping,
    joinSession,
    leaveSession,
    transferChat,
    closeSession,
    
    // Utilities
    isVisitorTyping,
  }
}

export default useEngageChatSocket
