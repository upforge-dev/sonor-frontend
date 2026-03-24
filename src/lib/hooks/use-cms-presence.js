/**
 * useCmsPresence — Real-time CMS page editing presence.
 *
 * Connects to Portal API `/cms` WebSocket namespace.
 * Tracks which users are currently editing a CMS page and broadcasts
 * "X is editing" indicators.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { supabase } from '@/lib/supabase-auth'

const PORTAL_API_URL = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || 'https://api.sonor.io'
const HEARTBEAT_INTERVAL = 30_000 // 30s

/**
 * @param {string|null} pageId - Sanity document ID of the CMS page being edited
 * @param {{ enabled?: boolean }} options
 * @returns {{ editors: Array<{ userId, userName, avatar, joinedAt }>, isConnected: boolean }}
 */
export function useCmsPresence(pageId, { enabled = true } = {}) {
  const socketRef = useRef(null)
  const heartbeatRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [editors, setEditors] = useState([])

  useEffect(() => {
    if (!enabled || !pageId) return

    let socket = null

    const connect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      socket = io(`${PORTAL_API_URL}/cms`, {
        auth: { token: session.access_token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setIsConnected(true)
        socket.emit('cms:page:join', { pageId })

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          socket.emit('cms:heartbeat')
        }, HEARTBEAT_INTERVAL)
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }
      })

      socket.on('cms:presence', (payload) => {
        if (payload.pageId === pageId) {
          setEditors(payload.editors || [])
        }
      })

      socket.on('connect_error', () => {
        setIsConnected(false)
      })
    }

    connect()

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      if (socketRef.current) {
        socketRef.current.emit('cms:page:leave')
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setEditors([])
      setIsConnected(false)
    }
  }, [pageId, enabled])

  return { editors, isConnected }
}
