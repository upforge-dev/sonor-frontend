/**
 * useEngageLiveChat - Live (visitor) chat via Engage API + Socket
 *
 * Used when activeTab === 'visitor' in Messages. Loads session + messages from
 * Engage API, sends via REST, and subscribes to Engage socket for realtime updates.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { engageApi, portalApi } from '@/lib/sonor-api'
import { useEngageChatSocket } from '@/lib/useEngageChatSocket'
import type { ChatKitThread, ChatKitItem, TypingUser } from '@/components/chat/types'

interface EngageAttachment {
  name?: string
  url: string
  size?: number
  mimeType?: string
}

interface EngageMessage {
  id: string
  session_id: string
  role: string
  content: string
  created_at: string
  sender_id?: string
  attachments?: EngageAttachment[]
}

export interface EngageSessionDetails {
  id: string
  project_id: string
  org_id: string
  visitor_id: string
  visitor_name?: string
  visitor_email?: string
  status: string
  source_url?: string
  referrer?: string
  user_agent?: string
  messages?: EngageMessage[]
  visitorContext?: Record<string, unknown>
  previousSessions?: unknown[]
  created_at?: string
  updated_at?: string
}

interface EngageSession extends EngageSessionDetails {
  messages?: EngageMessage[]
}

function mapEngageSessionToThread(session: EngageSession): ChatKitThread {
  return {
    thread_id: session.id,
    user_id: '',
    org_id: session.org_id,
    project_id: session.project_id,
    thread_type: 'visitor',
    title: session.visitor_name || session.visitor_email || 'Visitor',
    last_message_at: session.messages?.length
      ? session.messages[session.messages.length - 1]?.created_at
      : session.created_at ?? '',
    unread_count: 0,
    status: session.status === 'closed' ? 'closed' : 'active',
    visitor_id: session.visitor_id,
    created_at: (session as { created_at?: string }).created_at ?? '',
    updated_at: (session as { updated_at?: string }).updated_at,
    recipient: session.visitor_name
      ? {
          id: session.visitor_id,
          email: session.visitor_email ?? '',
          full_name: session.visitor_name,
        }
      : undefined,
    last_message_preview: session.messages?.length
      ? session.messages[session.messages.length - 1]?.content?.slice(0, 80)
      : undefined,
  }
}

function mapEngageAttachments(attachments: EngageAttachment[] | undefined): Array<{ id: string; filename: string; original_filename: string; mime_type: string; size_bytes: number; url?: string }> {
  if (!attachments?.length) return []
  return attachments.map((a, i) => ({
    id: `att-${i}-${a.url?.slice(-8) ?? i}`,
    filename: a.name ?? 'file',
    original_filename: a.name ?? 'file',
    mime_type: a.mimeType ?? 'application/octet-stream',
    size_bytes: a.size ?? 0,
    url: a.url,
  }))
}

function mapEngageMessageToItem(m: EngageMessage): ChatKitItem & { attachments?: Array<{ id: string; filename: string; original_filename: string; mime_type: string; size_bytes: number; url?: string }> } {
  const isUser = m.role === 'visitor'
  const item: ChatKitItem & { attachments?: Array<{ id: string; filename: string; original_filename: string; mime_type: string; size_bytes: number; url?: string }> } = {
    id: m.id,
    thread_id: m.session_id,
    type: isUser ? 'user_message' : 'assistant_message',
    content: [{ type: 'text', text: m.content }],
    sender_id: m.sender_id ?? undefined,
    created_at: m.created_at,
  }
  if (m.attachments?.length) {
    item.attachments = mapEngageAttachments(m.attachments)
  }
  return item
}

interface UseEngageLiveChatOptions {
  sessionId: string | null
  projectId: string | null
  orgId?: string | null
  enabled: boolean
}

interface UseEngageLiveChatReturn {
  thread: ChatKitThread | null
  messages: ChatKitItem[]
  isLoading: boolean
  error: Error | null
  typingUsers: TypingUser[]
  isConnected: boolean
  sendMessage: (content: string, files?: File[]) => Promise<void>
  loadThread: (id: string) => Promise<void>
  loadMessages: () => Promise<void>
  setAgentTyping: (sessionId: string, isTyping: boolean) => void
  joinSession: (sessionId: string) => void
  retrySend: () => Promise<void>
  lastFailedMessageId: string | null
  sessionDetails: EngageSessionDetails | null
}

export function useEngageLiveChat({
  sessionId,
  projectId,
  orgId,
  enabled,
}: UseEngageLiveChatOptions): UseEngageLiveChatReturn {
  const [thread, setThread] = useState<ChatKitThread | null>(null)
  const [messages, setMessages] = useState<ChatKitItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [lastFailedMessageId, setLastFailedMessageId] = useState<string | null>(null)
  const lastFailedRef = useRef<{ content: string; files?: File[] } | null>(null)
  const loadedSessionRef = useRef<string | null>(null)

  const onMessage = useCallback(
    (data: { sessionId?: string; message?: EngageMessage }) => {
      if (data.sessionId !== loadedSessionRef.current) return
      const msg = data.message
      if (!msg) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, mapEngageMessageToItem({ ...msg, session_id: data.sessionId ?? '' })]
      })
    },
    []
  )

  const onVisitorTyping = useCallback(
    (data: { sessionId?: string; isTyping?: boolean }) => {
      if (data.sessionId !== loadedSessionRef.current) return
      setTypingUsers((prev) =>
        data.isTyping ? [{ user_id: 'visitor' }] : []
      )
    },
    []
  )

  const onSessionUpdate = useCallback(() => {}, [])
  const onHandoffRequest = useCallback(() => {}, [])
  const onAgentJoined = useCallback(() => {}, [])

  const { isConnected, setAgentTyping, joinSession } = useEngageChatSocket({
    enabled: enabled && !!projectId,
    projectId: projectId ?? undefined,
    orgId: orgId ?? undefined,
    onMessage,
    onVisitorTyping,
    onSessionUpdate,
    onHandoffRequest,
    onAgentJoined,
  })

  const [sessionDetails, setSessionDetails] = useState<EngageSessionDetails | null>(null)

  const loadThread = useCallback(
    async (id: string) => {
      if (!enabled || !id || loadedSessionRef.current === id) return
      setIsLoading(true)
      setError(null)
      setSessionDetails(null)
      try {
        const res = await engageApi.getChatSession(id)
        const raw = res?.data ?? res
        const session = (raw?.data ?? (typeof raw === 'object' && raw !== null && 'id' in raw ? raw : null)) as EngageSession | null
        if (!session?.id) {
          setThread(null)
          setMessages([])
          return
        }
        const msgs = (session.messages ?? []) as EngageMessage[]
        setThread(mapEngageSessionToThread({ ...session, messages: msgs }))
        setMessages(msgs.map(mapEngageMessageToItem))
        const { messages: _m, ...details } = session
        setSessionDetails(details as EngageSessionDetails)
        loadedSessionRef.current = id
      } catch (err) {
        console.error('[useEngageLiveChat] Load error:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    },
    [enabled, joinSession]
  )

  const loadMessages = useCallback(async () => {
    if (!thread?.thread_id) return
    try {
      const res = await engageApi.getChatSession(thread.thread_id)
      const raw = res?.data ?? res
      const session = (raw?.data ?? raw) as EngageSession
      const msgs = (session.messages ?? []) as EngageMessage[]
      setMessages(msgs.map(mapEngageMessageToItem))
    } catch (err) {
      console.error('[useEngageLiveChat] Load messages error:', err)
    }
  }, [thread?.thread_id])

  const sendMessage = useCallback(
    async (content: string, files?: File[]) => {
      const currentId = thread?.thread_id ?? loadedSessionRef.current
      if (!currentId) throw new Error('No session selected')
      let attachments: EngageAttachment[] = []
      if (files?.length) {
        const formData = (file: File) => {
          const fd = new FormData()
          fd.append('file', file)
          return fd
        }
        for (const file of files) {
          try {
            const res = await portalApi.post(`/engage/chat/sessions/${currentId}/upload`, formData(file))
            const d = res?.data?.data ?? res?.data ?? res
            if (d?.url) attachments.push({ name: d.name, url: d.url, size: d.size, mimeType: d.mimeType })
          } catch (e) {
            console.error('[useEngageLiveChat] Upload failed', e)
            throw e
          }
        }
      }
      const optimisticId = `temp-${Date.now()}`
      const optimistic: ChatKitItem & { attachments?: unknown[] } = {
        id: optimisticId,
        thread_id: currentId,
        type: 'user_message',
        content: [{ type: 'text', text: content }],
        created_at: new Date().toISOString(),
      }
      if (attachments.length) optimistic.attachments = mapEngageAttachments(attachments)
      setMessages((prev) => [...prev, optimistic])
      try {
        const res = await portalApi.post(`/engage/chat/sessions/${currentId}/messages`, { content, attachments: attachments.length ? attachments : undefined })
        const data = res?.data?.data ?? res?.data ?? res
        if (data?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticId
                ? mapEngageMessageToItem({
                    id: data.id,
                    session_id: currentId,
                    role: 'agent',
                    content: data.content ?? content,
                    created_at: data.created_at ?? new Date().toISOString(),
                    sender_id: data.sender_id,
                    attachments: data.attachments ?? attachments,
                  })
                : m
            )
          )
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        }
      } catch (err) {
        setLastFailedMessageId(optimisticId)
        lastFailedRef.current = { content, files }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId ? { ...m, sendFailed: true } as (typeof m) & { sendFailed?: boolean } : m
          )
        )
        throw err
      }
    },
    [thread?.thread_id]
  )

  const retrySend = useCallback(async () => {
    const currentId = thread?.thread_id ?? loadedSessionRef.current
    const pending = lastFailedRef.current
    if (!currentId || !pending) return
    setLastFailedMessageId(null)
    lastFailedRef.current = null
    setMessages((prev) => prev.filter((m) => !(m as { sendFailed?: boolean }).sendFailed))
    try {
      await sendMessage(pending.content, pending.files)
    } catch {
      setLastFailedMessageId(`temp-${Date.now()}`)
      lastFailedRef.current = pending
    }
  }, [thread?.thread_id, sendMessage])

  useEffect(() => {
    if (enabled && sessionId) {
      loadThread(sessionId)
    } else {
      loadedSessionRef.current = null
      setThread(null)
      setMessages([])
      setSessionDetails(null)
    }
  }, [enabled, sessionId, loadThread])

  return {
    thread,
    messages,
    isLoading,
    error,
    typingUsers,
    isConnected,
    sendMessage,
    loadThread,
    loadMessages,
    setAgentTyping,
    joinSession,
    retrySend,
    lastFailedMessageId,
    sessionDetails,
  }
}
