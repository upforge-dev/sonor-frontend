/**
 * useEchoChat - AI Chat Hook with SSE Streaming
 *
 * Manages Echo (AI) conversations using the Echo API (/echo/stream, /echo/conversations).
 * Connects to Signal API for AI-powered responses via the 4-tier model system.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { echoApi } from '@/lib/signal-api'
import type { ChatKitThread, ChatKitItem } from '@/components/chat/types'

interface UseEchoChatOptions {
  /** Thread/conversation ID to load */
  threadId?: string | null
  /** Pre-scoped skill (for module Echo) */
  skill?: string | null
  /** Context ID (project, site, etc.) */
  contextId?: string | null
  /** Project ID */
  projectId?: string | null
  /** Enable the chat */
  enabled?: boolean
}

interface UseEchoChatReturn {
  thread: ChatKitThread | null
  messages: ChatKitItem[]
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  error: Error | null

  sendMessage: (content: string) => Promise<void>
  loadThread: (threadId: string) => Promise<void>
  createThread: () => Promise<string>
  retryMessage: (messageId: string) => Promise<void>
  sendFeedback: (messageId: string, type: 'positive' | 'negative') => void
  loadThreads: () => Promise<ChatKitThread[]>
}

/** Map Echo conversation to ChatKitThread format */
function toChatKitThread(conv: any): ChatKitThread {
  return {
    thread_id: conv.id,
    user_id: conv.user_id || '',
    org_id: conv.org_id || '',
    project_id: conv.project_id ?? null,
    thread_type: 'echo',
    title: conv.title || 'New conversation',
    last_message_at: conv.last_message_at ?? null,
    unread_count: 0,
    status: conv.status || 'active',
    skill_key: conv.skill_key ?? null,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
  }
}

/** Map Echo message to ChatKitItem format */
function toChatKitItem(msg: any, threadId: string): ChatKitItem {
  const type = msg.role === 'user' ? 'user_message' : 'assistant_message'
  const content =
    typeof msg.content === 'string'
      ? [{ type: type === 'user_message' ? 'input_text' : 'output_text', text: msg.content }]
      : msg.content
  return {
    id: msg.id || `msg-${Date.now()}`,
    thread_id: threadId,
    type,
    content: content || [{ type: 'output_text', text: msg.content || '' }],
    created_at: msg.created_at || new Date().toISOString(),
  }
}

export function useEchoChat(options: UseEchoChatOptions): UseEchoChatReturn {
  const { threadId, skill, contextId, projectId, enabled = true } = options

  const [thread, setThread] = useState<ChatKitThread | null>(null)
  const [messages, setMessages] = useState<ChatKitItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const loadedThreadRef = useRef<string | null>(null)

  // Load a list of Echo conversations
  const loadThreads = useCallback(async (): Promise<ChatKitThread[]> => {
    try {
      const data = await echoApi.listConversations({ page: 1, limit: 50 })
      const list = Array.isArray(data) ? data : data?.data ?? []
      return list.map(toChatKitThread)
    } catch (err) {
      console.error('[useEchoChat] Load threads error:', err)
      return []
    }
  }, [])

  // Load conversation and messages
  const loadThread = useCallback(
    async (id: string) => {
      if (!enabled || loadedThreadRef.current === id) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await echoApi.getConversation(id)
        const { conversation, messages: msgs } = result || {}
        if (!conversation) throw new Error('Conversation not found')

        setThread(toChatKitThread(conversation))
        setMessages((msgs || []).map((m: any) => toChatKitItem(m, id)))
        loadedThreadRef.current = id
      } catch (err) {
        console.error('[useEchoChat] Load error:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    },
    [enabled],
  )

  // Create a new thread (empty state; real ID comes from first send)
  const createThread = useCallback(async (): Promise<string> => {
    const placeholderId = `new-${Date.now()}`
    setThread({
      thread_id: placeholderId,
      user_id: '',
      org_id: '',
      project_id: projectId ?? null,
      thread_type: 'echo',
      title: 'New conversation',
      unread_count: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    setMessages([])
    loadedThreadRef.current = placeholderId
    return placeholderId
  }, [projectId])

  // Send a message and stream response
  const sendMessage = useCallback(
    async (content: string) => {
      let currentThreadId = thread?.thread_id || loadedThreadRef.current
      const isNewThread = !currentThreadId || currentThreadId.startsWith('new-')

      if (isNewThread) {
        currentThreadId = await createThread()
      }

      // Add user message immediately
      const userMessageId = `user-${Date.now()}`
      const userMessage: ChatKitItem = {
        id: userMessageId,
        thread_id: currentThreadId,
        type: 'user_message',
        content: [{ type: 'input_text', text: content }],
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      setIsStreaming(true)
      setStreamingContent('')
      setError(null)

      const conversationId = isNewThread ? undefined : currentThreadId

      try {
        await echoApi.streamChat(
          {
            message: content,
            conversationId,
            skill: skill || undefined,
            pageContext: contextId ? { contextId } : undefined,
          },
          {
            onToken: (token) => setStreamingContent((prev) => prev + token),
            onComplete: ({ response, conversationId: newId }) => {
              const assistantMessage: ChatKitItem = {
                id: `assistant-${Date.now()}`,
                thread_id: newId || currentThreadId,
                type: 'assistant_message',
                content: [{ type: 'output_text', text: response }],
                created_at: new Date().toISOString(),
              }
              setMessages((prev) => [...prev, assistantMessage])
              if (newId && (isNewThread || currentThreadId.startsWith('new-'))) {
                loadedThreadRef.current = newId
                setThread((t) => (t ? { ...t, thread_id: newId } : null))
              }
            },
            onError: (msg) => setError(new Error(msg)),
          },
        )
      } catch (err) {
        console.error('[useEchoChat] Stream error:', err)
        setError(err as Error)
      } finally {
        setIsStreaming(false)
        setStreamingContent('')
      }
    },
    [thread, createThread, skill, contextId],
  )

  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (!message || message.type !== 'user_message') return

      const content =
        typeof message.content === 'string'
          ? message.content
          : (message.content as any[]).map((c) => c.text).join('\n')

      const messageIndex = messages.findIndex((m) => m.id === messageId)
      setMessages((prev) => prev.slice(0, messageIndex))

      await sendMessage(content)
    },
    [messages, sendMessage],
  )

  const sendFeedback = useCallback(async (messageId: string, type: 'positive' | 'negative') => {
    try {
      await echoApi.rateResponse({
        messageId,
        conversationId: thread?.thread_id || loadedThreadRef.current,
        rating: type === 'positive' ? 1 : 0,
        feedbackType: 'rating',
      })
    } catch (err) {
      console.error('[useEchoChat] Feedback error:', err)
    }
  }, [thread])

  useEffect(() => {
    if (threadId && enabled) {
      loadThread(threadId)
    }
  }, [threadId, enabled, loadThread])

  return {
    thread,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    loadThread,
    createThread,
    retryMessage,
    sendFeedback,
    loadThreads,
  }
}
