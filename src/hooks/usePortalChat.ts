/**
 * usePortalChat - Human-to-Human Chat Hook
 * 
 * Manages Team/Live chat using WebSocket for real-time messaging.
 * Used for user-to-user and visitor conversations.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase-auth'
import { useChatSocket } from './useChatSocket'
import { chatkitApi } from '@/lib/portal-api'
import type { ChatKitThread, ChatKitItem, TypingUser, PresenceStatus, MessageContent } from '@/components/chat/types'

const PORTAL_API_URL = import.meta.env.VITE_PORTAL_API_URL || 'https://api.sonor.io'
const SEND_QUEUE_KEY = 'messages-send-queue'

function genClientMessageId(): string {
  return `ck-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

interface QueueItem {
  clientMessageId: string
  threadId: string
  parentId?: string
  content: string
  tempMessageId: string
}

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(SEND_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(q: QueueItem[]): void {
  try {
    if (q.length) localStorage.setItem(SEND_QUEUE_KEY, JSON.stringify(q))
    else localStorage.removeItem(SEND_QUEUE_KEY)
  } catch {}
}

interface UsePortalChatOptions {
  /** Thread ID to load */
  threadId?: string | null
  /** Recipient user ID (for creating new threads) */
  recipientUserId?: string | null
  /** Thread type (Phase 2.9: 'channel' for channel threads) */
  threadType: 'user' | 'visitor' | 'channel'
  /** Project ID for scoping */
  projectId?: string | null
  /** Enable the chat */
  enabled?: boolean
  /** Current user's auth ID (for presence: "other" in DM) */
  currentUserId?: string | null
}

interface UsePortalChatReturn {
  thread: ChatKitThread | null
  messages: ChatKitItem[]
  isLoading: boolean
  error: Error | null
  typingUsers: TypingUser[]
  isConnected: boolean

  // Actions
  sendMessage: (content: string, parentId?: string) => Promise<void>
  loadThread: (threadId: string) => Promise<void>
  createThread: (recipientId: string) => Promise<string>
  markAsRead: () => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  loadMessages: () => Promise<void>
  updateMessage: (messageId: string, updates: Partial<ChatKitItem>) => void
  addReaction: (threadId: string, itemId: string, emoji: string) => Promise<void>
  removeReaction: (threadId: string, itemId: string, emoji: string) => Promise<void>

  // Reply-in-thread (Phase 2.6)
  repliesByParent: Record<string, ChatKitItem[]>
  loadReplies: (parentId: string) => Promise<void>
  repliesFor: (parentId: string) => ChatKitItem[]

  // Presence (Phase 2.10)
  presenceByUser: Record<string, PresenceStatus>
  presenceFor: (userId: string) => PresenceStatus
  sendPresenceHeartbeat: () => void
  setPresenceDnd: (dnd: boolean) => void

  // Phase 3.1.1: Retry failed sends
  retryMessage: (messageId: string) => Promise<void>
}

export function usePortalChat(options: UsePortalChatOptions): UsePortalChatReturn {
  const {
    threadId,
    recipientUserId,
    threadType,
    projectId,
    enabled = true,
    currentUserId,
  } = options
  
  const [thread, setThread] = useState<ChatKitThread | null>(null)
  const [messages, setMessages] = useState<ChatKitItem[]>([])
  const [repliesByParent, setRepliesByParent] = useState<Record<string, ChatKitItem[]>>({})
  const [presenceByUser, setPresenceByUser] = useState<Record<string, PresenceStatus>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  /** When true, show "Echo is typing..." (set on @Echo send, cleared when Echo reply arrives) */
  const [echoTyping, setEchoTyping] = useState(false)
  
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})
  const echoTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadedThreadRef = useRef<string | null>(null)
  const flushingRef = useRef(false)
  
  // Get auth headers
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'X-ChatKit-Project-Id': projectId || '',
      'X-ChatKit-Thread-Type': threadType,
    }
  }, [projectId, threadType])
  
  // WebSocket connection
  const {
    isConnected,
    joinThread,
    leaveThread,
    startTyping: socketStartTyping,
    stopTyping: socketStopTyping,
    sendPresenceHeartbeat,
    sendPresenceSet,
  } = useChatSocket({
    enabled,
    onMessage: useCallback((data) => {
      if (data.thread_id !== loadedThreadRef.current) return
      const msg = data.message as ChatKitItem
      // Clear "Echo is typing..." when Echo's reply arrives (backend sends sender.name === 'Echo')
      const isEchoReply = msg.sender?.name === 'Echo' || msg.sender?.full_name === 'Echo'
      if (isEchoReply) {
        setEchoTyping(false)
        if (echoTypingTimeoutRef.current) {
          clearTimeout(echoTypingTimeoutRef.current)
          echoTypingTimeoutRef.current = null
        }
      }
      if (msg.parent_id) {
        setRepliesByParent(prev => {
          const list = prev[msg.parent_id] ?? []
          if (list.some(m => m.id === msg.id)) return prev
          return { ...prev, [msg.parent_id]: [...list, msg] }
        })
      } else {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }, []),
    onTypingStart: useCallback((data) => {
      if (data.thread_id === loadedThreadRef.current) {
        setTypingUsers(prev => {
          if (prev.some(u => u.user_id === data.user_id)) return prev
          return [...prev, { user_id: data.user_id }]
        })
        
        // Clear after timeout
        if (typingTimeoutRef.current[data.user_id]) {
          clearTimeout(typingTimeoutRef.current[data.user_id])
        }
        typingTimeoutRef.current[data.user_id] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id))
        }, 3000)
      }
    }, []),
    onTypingStop: useCallback((data) => {
      if (data.thread_id === loadedThreadRef.current) {
        setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id))
        if (typingTimeoutRef.current[data.user_id]) {
          clearTimeout(typingTimeoutRef.current[data.user_id])
        }
      }
    }, []),
    onMessageRead: useCallback((data) => {
      if (data.thread_id === loadedThreadRef.current) {
        setMessages(prev => prev.map(m => 
          m.id === data.message_id 
            ? { ...m, read_at: data.read_at }
            : m
        ))
      }
    }, []),
    onReactionAdded: useCallback((data) => {
      if (data.thread_id !== loadedThreadRef.current || !data.reactions) return
      const upd = (m: ChatKitItem) => m.id === data.item_id ? { ...m, reactions: data.reactions } : m
      setMessages(prev => prev.map(upd))
      setRepliesByParent(prev => {
        let changed = false
        const next: Record<string, ChatKitItem[]> = {}
        for (const [k, list] of Object.entries(prev)) {
          const mapped = list.map(upd)
          if (mapped.some((m, i) => m !== list[i])) changed = true
          next[k] = mapped
        }
        return changed ? next : prev
      })
    }, []),
    onReactionRemoved: useCallback((data) => {
      if (data.thread_id !== loadedThreadRef.current || !data.reactions) return
      const upd = (m: ChatKitItem) => m.id === data.item_id ? { ...m, reactions: data.reactions } : m
      setMessages(prev => prev.map(upd))
      setRepliesByParent(prev => {
        let changed = false
        const next: Record<string, ChatKitItem[]> = {}
        for (const [k, list] of Object.entries(prev)) {
          const mapped = list.map(upd)
          if (mapped.some((m, i) => m !== list[i])) changed = true
          next[k] = mapped
        }
        return changed ? next : prev
      })
    }, []),
    onPresenceChange: useCallback((data: { user_id: string; status: PresenceStatus }) => {
      setPresenceByUser(prev => ({ ...prev, [data.user_id]: data.status }))
    }, []),
  })

  const presenceFor = useCallback((userId: string) => presenceByUser[userId] ?? 'offline', [presenceByUser])
  const setPresenceDnd = useCallback((dnd: boolean) => {
    const status = dnd ? 'dnd' : 'online'
    // Optimistic update: immediately reflect the change in local state
    if (currentUserId) {
      setPresenceByUser(prev => ({ ...prev, [currentUserId]: status }))
    }
    sendPresenceSet(status)
  }, [sendPresenceSet, currentUserId])

  // Presence heartbeat when connected (Phase 2.10)
  useEffect(() => {
    if (!enabled || !isConnected) return
    heartbeatRef.current = setInterval(sendPresenceHeartbeat, 60_000)
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }
  }, [enabled, isConnected, sendPresenceHeartbeat])

  // Fetch presence for current thread's other user (Phase 2.10; skip for channels)
  useEffect(() => {
    if (threadType !== 'user' || !thread || !currentUserId) return
    const other = thread.user_id === currentUserId ? thread.recipient_user_id : thread.user_id
    if (!other) return
    let cancelled = false
    chatkitApi.getPresence([other]).then((res) => {
      if (cancelled) return
      const body = res?.data ?? res
      const map = (typeof body === 'object' && body !== null && body.data) ? body.data as Record<string, PresenceStatus> : {}
      setPresenceByUser(prev => ({ ...prev, ...map }))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [threadType, thread?.thread_id, thread?.user_id, thread?.recipient_user_id, currentUserId])

  // Load thread and messages
  const loadThread = useCallback(async (id: string) => {
    if (!enabled || loadedThreadRef.current === id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const headers = await getAuthHeaders()
      
      // Load thread details
      const threadRes = await fetch(`${PORTAL_API_URL}/chatkit/threads/${id}`, {
        headers,
      })
      
      if (!threadRes.ok) throw new Error('Failed to load thread')
      const threadData = await threadRes.json()
      setThread(threadData.data || threadData)
      
      // Load messages
      const itemsRes = await fetch(`${PORTAL_API_URL}/chatkit/threads/${id}/items?limit=50&order=asc`, {
        headers,
      })
      
      if (!itemsRes.ok) throw new Error('Failed to load messages')
      const itemsData = await itemsRes.json()
      setMessages(itemsData.data || [])
      
      // Join WebSocket room
      loadedThreadRef.current = id
      joinThread(id)
      
    } catch (err) {
      console.error('[usePortalChat] Load error:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, getAuthHeaders, joinThread])
  
  // Load just messages (for refresh). Root-level only (no parent_id).
  const loadMessages = useCallback(async () => {
    if (!thread?.thread_id) return
    
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${PORTAL_API_URL}/chatkit/threads/${thread.thread_id}/items?limit=50&order=asc`, {
        headers,
      })
      
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data || [])
      }
    } catch (err) {
      console.error('[usePortalChat] Load messages error:', err)
    }
  }, [thread?.thread_id, getAuthHeaders])

  // Reply-in-thread: load replies for a parent message.
  const loadReplies = useCallback(async (parentId: string) => {
    const tid = thread?.thread_id || loadedThreadRef.current
    if (!tid) return
    
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(
        `${PORTAL_API_URL}/chatkit/threads/${tid}/items?limit=50&order=asc&parent_id=${encodeURIComponent(parentId)}`,
        { headers }
      )
      if (!res.ok) return
      const data = await res.json()
      const list = data.data || []
      setRepliesByParent(prev => ({ ...prev, [parentId]: list }))
    } catch (err) {
      console.error('[usePortalChat] Load replies error:', err)
    }
  }, [thread?.thread_id, getAuthHeaders])

  const repliesFor = useCallback((parentId: string) => {
    return repliesByParent[parentId] ?? []
  }, [repliesByParent])
  
  // Create a new thread WITH first message (Portal API combines these)
  const createThreadWithMessage = useCallback(async (recipientId: string, content: string): Promise<string> => {
    const headers = await getAuthHeaders()
    
    const res = await fetch(`${PORTAL_API_URL}/chatkit/threads`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        thread_type: threadType,
        recipient_user_id: recipientId,
        project_id: projectId,
        content: content, // Portal API expects content for first message
      }),
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[usePortalChat] Create thread error:', res.status, errorText)
      throw new Error('Failed to create thread')
    }
    const data = await res.json()
    // API returns { thread: ThreadMetadata, item: ThreadItem }; support wrapped { data: { thread } } too
    const threadObj = data.data?.thread ?? data.thread ?? data
    const threadId = threadObj?.thread_id ?? threadObj?.id
    if (!threadId) {
      console.error('[usePortalChat] Create thread invalid response:', data)
      throw new Error('Invalid create thread response')
    }
    setThread(threadObj)
    loadedThreadRef.current = threadId
    joinThread(threadId)
    return threadId
  }, [getAuthHeaders, threadType, projectId, joinThread])
  
  // Create thread only (no message yet). Portal API allows empty content when creating thread (recipient required).
  const createThread = useCallback(async (recipientId: string): Promise<string> => {
    return createThreadWithMessage(recipientId, '')
  }, [createThreadWithMessage])
  
  // Send a message (optionally as reply-in-thread via parentId).
  const sendMessage = useCallback(async (content: string, parentId?: string) => {
    if (!thread?.thread_id && !loadedThreadRef.current) {
      if (recipientUserId) {
        const threadId = await createThreadWithMessage(recipientUserId, content)
        const newMessage: ChatKitItem = {
          id: `msg-${Date.now()}`,
          thread_id: threadId,
          type: 'user_message',
          content: [{ type: 'text', text: content }],
          created_at: new Date().toISOString(),
        }
        setMessages([newMessage])
        return
      }
      throw new Error('No thread or recipient')
    }

    const currentThreadId = thread?.thread_id || loadedThreadRef.current
    if (!currentThreadId) throw new Error('No thread')

    const headers = await getAuthHeaders()
    const clientMessageId = genClientMessageId()
    const optimisticId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: optimisticId,
      thread_id: currentThreadId,
      type: 'user_message' as const,
      content: [{ type: 'text' as const, text: content }],
      parent_id: parentId ?? null,
      created_at: new Date().toISOString(),
      client_message_id: clientMessageId,
    } as ChatKitItem & { client_message_id?: string }

    if (parentId) {
      setRepliesByParent(prev => ({
        ...prev,
        [parentId]: [...(prev[parentId] ?? []), optimisticMessage],
      }))
    } else {
      setMessages(prev => [...prev, optimisticMessage])
    }

    const payload: { thread_id: string; content: string; parent_id?: string; client_message_id?: string } = {
      thread_id: currentThreadId,
      content,
      client_message_id: clientMessageId,
    }
    if (parentId) payload.parent_id = parentId

    // Show "Echo is typing..." when user sends a message that mentions @Echo
    if (/@[Ee]cho\b/i.test(content)) {
      setEchoTyping(true)
      if (echoTypingTimeoutRef.current) clearTimeout(echoTypingTimeoutRef.current)
      echoTypingTimeoutRef.current = setTimeout(() => {
        setEchoTyping(false)
        echoTypingTimeoutRef.current = null
      }, 60000) // fallback: clear after 60s if no reply
    }

    if (!navigator.onLine) {
      const q = loadQueue()
      q.push({ clientMessageId, threadId: currentThreadId, parentId, content, tempMessageId: optimisticId })
      saveQueue(q)
      return
    }

    try {
      const res = await fetch(`${PORTAL_API_URL}/chatkit/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('[usePortalChat] Send message error:', res.status, errorText)
        throw new Error('Failed to send message')
      }
      const data = await res.json()
      const serverItem = data.data || data

      if (parentId) {
        setRepliesByParent(prev => ({
          ...prev,
          [parentId]: (prev[parentId] ?? []).map(m =>
            m.id === optimisticId ? serverItem : m
          ),
        }))
      } else {
        setMessages(prev => prev.map(m =>
          m.id === optimisticId ? serverItem : m
        ))
      }
    } catch (err) {
      if (/@[Ee]cho\b/i.test(content)) setEchoTyping(false)
      const failed = { ...optimisticMessage, sendFailed: true } as ChatKitItem & { sendFailed?: boolean; client_message_id?: string }
      if (parentId) {
        setRepliesByParent(prev => ({
          ...prev,
          [parentId]: (prev[parentId] ?? []).map(m => m.id === optimisticId ? failed : m),
        }))
      } else {
        setMessages(prev => prev.map(m => m.id === optimisticId ? failed : m))
      }
      throw err
    }
  }, [thread, recipientUserId, createThreadWithMessage, getAuthHeaders])

  function contentToText(c: MessageContent[] | string | undefined): string {
    if (!c) return ''
    if (typeof c === 'string') return c
    return c.map((x: { type?: string; text?: string }) => x?.text ?? '').join('')
  }

  const retryMessage = useCallback(async (messageId: string) => {
    const tid = thread?.thread_id ?? loadedThreadRef.current
    if (!tid) return
    let msg: (ChatKitItem & { sendFailed?: boolean }) | undefined
    let parentId: string | undefined
    for (const m of messages) {
      if (m.id === messageId) { msg = m as (ChatKitItem & { sendFailed?: boolean }); break }
    }
    if (!msg) {
      for (const [pid, list] of Object.entries(repliesByParent)) {
        const m = list.find((x) => x.id === messageId) as (ChatKitItem & { sendFailed?: boolean }) | undefined
        if (m) { msg = m; parentId = pid; break }
      }
    }
    if (!msg?.sendFailed) return
    const text = contentToText(msg.content)
    if (!text) return
    const headers = await getAuthHeaders()
    const cid = (msg as { client_message_id?: string }).client_message_id
    const payload: { thread_id: string; content: string; parent_id?: string; client_message_id?: string } = { thread_id: tid, content: text }
    if (parentId) payload.parent_id = parentId
    if (cid) payload.client_message_id = cid
    try {
      const res = await fetch(`${PORTAL_API_URL}/chatkit/messages`, { method: 'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      const serverItem = data.data || data
      if (parentId) {
        setRepliesByParent(prev => ({
          ...prev,
          [parentId!]: (prev[parentId!] ?? []).map(m => m.id === messageId ? serverItem : m),
        }))
      } else {
        setMessages(prev => prev.map(m => m.id === messageId ? serverItem : m))
      }
    } catch (e) {
      console.error('[usePortalChat] Retry failed:', e)
    }
  }, [thread?.thread_id, messages, repliesByParent, getAuthHeaders])

  // Phase 3.1.4: Flush offline send queue when back online
  const flushQueue = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return
    const q = loadQueue()
    if (!q.length) return
    flushingRef.current = true
    const remaining: QueueItem[] = []
    const currentThreadId = thread?.thread_id ?? loadedThreadRef.current
    try {
      const headers = await getAuthHeaders()
      for (const item of q) {
        const payload: { thread_id: string; content: string; parent_id?: string; client_message_id: string } = {
          thread_id: item.threadId,
          content: item.content,
          client_message_id: item.clientMessageId,
        }
        if (item.parentId) payload.parent_id = item.parentId
        try {
          const res = await fetch(`${PORTAL_API_URL}/chatkit/messages`, { method: 'POST', headers, body: JSON.stringify(payload) })
          if (!res.ok) throw new Error('Flush send failed')
          const data = await res.json()
          const serverItem = data.data || data
          if (item.threadId === currentThreadId) {
            if (item.parentId) {
              setRepliesByParent(prev => ({
                ...prev,
                [item.parentId!]: (prev[item.parentId!] ?? []).map(m =>
                  m.id === item.tempMessageId ? serverItem : m
                ),
              }))
            } else {
              setMessages(prev => prev.map(m => m.id === item.tempMessageId ? serverItem : m))
            }
          }
        } catch {
          if (item.threadId === currentThreadId) {
            const failed = { sendFailed: true }
            if (item.parentId) {
              setRepliesByParent(prev => ({
                ...prev,
                [item.parentId!]: (prev[item.parentId!] ?? []).map(m =>
                  m.id === item.tempMessageId ? { ...m, ...failed } : m
                ),
              }))
            } else {
              setMessages(prev => prev.map(m => m.id === item.tempMessageId ? { ...m, ...failed } : m))
            }
          }
          remaining.push(item)
        }
      }
    } finally {
      flushingRef.current = false
      saveQueue(remaining)
    }
  }, [getAuthHeaders, thread?.thread_id])

  // Mark thread as read
  const markAsRead = useCallback(async () => {
    if (!thread?.thread_id) return
    
    try {
      const headers = await getAuthHeaders()
      await fetch(`${PORTAL_API_URL}/chatkit/threads/${thread.thread_id}/read`, {
        method: 'POST',
        headers,
      })
    } catch (err) {
      console.error('[usePortalChat] Mark as read error:', err)
    }
  }, [thread?.thread_id, getAuthHeaders])
  
  // Typing indicators
  const startTyping = useCallback(() => {
    if (thread?.thread_id) {
      socketStartTyping(thread.thread_id)
    }
  }, [thread?.thread_id, socketStartTyping])
  
  const stopTyping = useCallback(() => {
    if (thread?.thread_id) {
      socketStopTyping(thread.thread_id)
    }
  }, [thread?.thread_id, socketStopTyping])
  
  // Update a message in local state (for edit/delete/reactions)
  const updateMessage = useCallback((messageId: string, updates: Partial<ChatKitItem>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    )
  }, [])

  // Reactions (Phase 2.4)
  const addReaction = useCallback(async (threadId: string, itemId: string, emoji: string) => {
    try {
      const res = await chatkitApi.addReaction(threadId, itemId, emoji)
      const reactions = res?.data ?? res
      if (Array.isArray(reactions)) {
        updateMessage(itemId, { reactions })
      }
    } catch (err) {
      console.error('[usePortalChat] Add reaction error:', err)
    }
  }, [updateMessage])

  const removeReaction = useCallback(async (threadId: string, itemId: string, emoji: string) => {
    try {
      const res = await chatkitApi.removeReaction(threadId, itemId, emoji)
      const reactions = res?.data ?? res
      if (Array.isArray(reactions)) {
        updateMessage(itemId, { reactions })
      }
    } catch (err) {
      console.error('[usePortalChat] Remove reaction error:', err)
    }
  }, [updateMessage])
  
  // Load thread when threadId changes
  useEffect(() => {
    if (threadId && enabled) {
      loadThread(threadId)
    }
    
    return () => {
      setEchoTyping(false)
      if (echoTypingTimeoutRef.current) {
        clearTimeout(echoTypingTimeoutRef.current)
        echoTypingTimeoutRef.current = null
      }
      // Leave room on cleanup
      if (loadedThreadRef.current) {
        leaveThread(loadedThreadRef.current)
        loadedThreadRef.current = null
      }
    }
  }, [threadId, enabled, loadThread, leaveThread])
  
  // Cleanup typing timeouts and heartbeat
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout)
      if (echoTypingTimeoutRef.current) {
        clearTimeout(echoTypingTimeoutRef.current)
        echoTypingTimeoutRef.current = null
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }
  }, [])

  // Phase 3.1.4: Flush offline send queue on 'online' and on mount if queue non-empty
  useEffect(() => {
    const run = () => { void flushQueue() }
    if (navigator.onLine && loadQueue().length) run()
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [flushQueue])

  // Include Echo in typing list when waiting for @Echo reply
  const typingUsersWithEcho = echoTyping
    ? [...typingUsers, { user_id: 'echo', full_name: 'Echo' }]
    : typingUsers

  return {
    thread,
    messages,
    isLoading,
    error,
    typingUsers: typingUsersWithEcho,
    isConnected,
    sendMessage,
    loadThread,
    createThread,
    markAsRead,
    startTyping,
    stopTyping,
    loadMessages,
    updateMessage,
    addReaction,
    removeReaction,
    repliesByParent,
    loadReplies,
    repliesFor,
    presenceByUser,
    presenceFor,
    sendPresenceHeartbeat,
    setPresenceDnd,
    retryMessage,
  }
}
