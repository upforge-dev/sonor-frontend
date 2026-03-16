/**
 * useChatSocket - WebSocket Connection Manager
 * 
 * Manages Socket.io connection to Portal API for real-time chat.
 * Used by usePortalChat hook.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { supabase } from '@/lib/supabase-auth'
import type { ChatKitItem, ChatSocketEvents } from '@/components/chat/types'

const PORTAL_API_URL = import.meta.env.VITE_PORTAL_API_URL || 'https://api.sonor.io'

interface UseChatSocketOptions {
  /** Enable/disable the socket connection */
  enabled?: boolean
  /** Called when a new message arrives */
  onMessage?: (data: ChatSocketEvents['message:new']) => void
  /** Called when someone starts typing */
  onTypingStart?: (data: ChatSocketEvents['typing:started']) => void
  /** Called when someone stops typing */
  onTypingStop?: (data: ChatSocketEvents['typing:stopped']) => void
  /** Called when a message is read */
  onMessageRead?: (data: ChatSocketEvents['message:read']) => void
  /** Called when thread is updated */
  onThreadUpdate?: (data: ChatSocketEvents['thread:update']) => void
  /** Called when a reaction is added */
  onReactionAdded?: (data: ChatSocketEvents['reaction:added']) => void
  /** Called when a reaction is removed */
  onReactionRemoved?: (data: ChatSocketEvents['reaction:removed']) => void
  /** Called when a user's presence changes (Phase 2.10) */
  onPresenceChange?: (data: ChatSocketEvents['presence:change']) => void
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const {
    enabled = true,
    onMessage,
    onTypingStart,
    onTypingStop,
    onMessageRead,
    onThreadUpdate,
    onReactionAdded,
    onReactionRemoved,
    onPresenceChange,
  } = options
  
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<Error | null>(null)
  const currentThreadRef = useRef<string | null>(null)
  
  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return
    
    const initSocket = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setConnectionError(new Error('No auth session'))
          return
        }
        
        const socket = io(`${PORTAL_API_URL}/chatkit`, {
          auth: { token: session.access_token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })
        
        socket.on('connect', () => {
          console.log('[ChatSocket] Connected')
          setIsConnected(true)
          setConnectionError(null)
          
          // Rejoin thread if we were in one
          if (currentThreadRef.current) {
            socket.emit('join:thread', { thread_id: currentThreadRef.current })
          }
        })
        
        socket.on('disconnect', (reason) => {
          console.log('[ChatSocket] Disconnected:', reason)
          setIsConnected(false)
        })
        
        socket.on('connect_error', (error) => {
          console.error('[ChatSocket] Connection error:', error)
          setConnectionError(error)
          setIsConnected(false)
        })
        
        // Event handlers (ChatKit emits message:received with { thread_id, item })
        socket.on('message:received', (data: { thread_id: string; item: unknown }) => {
          if (data?.thread_id && data?.item) {
            onMessage?.({ thread_id: data.thread_id, message: data.item })
          }
        })
        socket.on('message:new', (data) => {
          onMessage?.(data)
        })
        
        socket.on('typing:started', (data) => {
          onTypingStart?.(data)
        })
        
        socket.on('typing:stopped', (data) => {
          onTypingStop?.(data)
        })
        
        socket.on('message:read', (data) => {
          onMessageRead?.(data)
        })
        
        socket.on('thread:update', (data) => {
          onThreadUpdate?.(data)
        })

        socket.on('reaction:added', (data) => {
          onReactionAdded?.(data)
        })

        socket.on('reaction:removed', (data) => {
          onReactionRemoved?.(data)
        })

        socket.on('presence:change', (data) => {
          onPresenceChange?.(data)
        })
        
        socketRef.current = socket
      } catch (err) {
        console.error('[ChatSocket] Init error:', err)
        setConnectionError(err as Error)
      }
    }
    
    initSocket()
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [enabled])
  
  // Update event handlers when they change
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    
    // Re-register handlers
    socket.off('message:new')
    socket.off('typing:started')
    socket.off('typing:stopped')
    socket.off('message:read')
    socket.off('thread:update')
    socket.off('reaction:added')
    socket.off('reaction:removed')
    socket.off('presence:change')

    if (onMessage) {
      socket.on('message:received', (data: { thread_id: string; item: unknown }) => {
        if (data?.thread_id && data?.item) {
          onMessage({ thread_id: data.thread_id, message: data.item })
        }
      })
      socket.on('message:new', onMessage)
    }
    if (onTypingStart) socket.on('typing:started', onTypingStart)
    if (onTypingStop) socket.on('typing:stopped', onTypingStop)
    if (onMessageRead) socket.on('message:read', onMessageRead)
    if (onThreadUpdate) socket.on('thread:update', onThreadUpdate)
    if (onReactionAdded) socket.on('reaction:added', onReactionAdded)
    if (onReactionRemoved) socket.on('reaction:removed', onReactionRemoved)
    if (onPresenceChange) socket.on('presence:change', onPresenceChange)
  }, [onMessage, onTypingStart, onTypingStop, onMessageRead, onThreadUpdate, onReactionAdded, onReactionRemoved, onPresenceChange])
  
  // Join a thread room
  const joinThread = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      // Leave previous thread
      if (currentThreadRef.current && currentThreadRef.current !== threadId) {
        socketRef.current.emit('leave:thread', { thread_id: currentThreadRef.current })
      }
      
      socketRef.current.emit('join:thread', { thread_id: threadId })
      currentThreadRef.current = threadId
      console.log('[ChatSocket] Joined thread:', threadId)
    }
  }, [isConnected])
  
  // Leave a thread room
  const leaveThread = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave:thread', { thread_id: threadId })
      if (currentThreadRef.current === threadId) {
        currentThreadRef.current = null
      }
    }
  }, [isConnected])
  
  // Send typing start event
  const startTyping = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', { thread_id: threadId })
    }
  }, [isConnected])
  
  // Send typing stop event
  const stopTyping = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', { thread_id: threadId })
    }
  }, [isConnected])

  const sendPresenceHeartbeat = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('presence:heartbeat')
    }
  }, [isConnected])

  const sendPresenceSet = useCallback((status: 'online' | 'dnd') => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('presence:set', { status })
    }
  }, [isConnected])
  
  return {
    isConnected,
    connectionError,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
    sendPresenceHeartbeat,
    sendPresenceSet,
    socket: socketRef.current,
  }
}
