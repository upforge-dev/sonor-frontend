/**
 * useEchoChat - AI Chat Hook with SSE Streaming
 *
 * Manages Echo (AI) conversations using the Echo API (/echo/stream, /echo/conversations).
 * Connects to Signal API for AI-powered responses via the 4-tier model system.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { echoApi } from '@/lib/signal-api'
import type { ChatKitThread, ChatKitItem } from '@/components/chat/types'
import { parseSuggestions, type SuggestionChip } from '@/components/chat/SuggestionChips'

export interface EchoPageContext {
  contextId?: string
  module?: string
  page?: string
  entityType?: string
  entityId?: string
  entityName?: string
  data?: Record<string, unknown>
}

interface UseEchoChatOptions {
  /** Thread/conversation ID to load */
  threadId?: string | null
  /** Pre-scoped skill (for module Echo) */
  skill?: string | null
  /** Context ID (project, site, etc.) */
  contextId?: string | null
  /** Rich page context for module-embedded Echo */
  pageContext?: EchoPageContext | null
  /** Project ID */
  projectId?: string | null
  /** Enable the chat */
  enabled?: boolean
}

interface ActiveToolCall {
  toolName: string
  label: string
}

interface UseEchoChatReturn {
  thread: ChatKitThread | null
  messages: ChatKitItem[]
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  activeToolCall: ActiveToolCall | null
  suggestionChips: SuggestionChip[]
  error: Error | null

  sendMessage: (content: string, files?: File[]) => Promise<void>
  loadThread: (threadId: string) => Promise<void>
  createThread: () => Promise<string>
  retryMessage: (messageId: string) => Promise<void>
  sendFeedback: (messageId: string, type: 'positive' | 'negative', correction?: string) => void
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
  const { threadId, skill, contextId, pageContext, projectId, enabled = true } = options

  const [thread, setThread] = useState<ChatKitThread | null>(null)
  const [messages, setMessages] = useState<ChatKitItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [activeToolCall, setActiveToolCall] = useState<ActiveToolCall | null>(null)
  const [suggestionChips, setSuggestionChips] = useState<SuggestionChip[]>([])
  const [error, setError] = useState<Error | null>(null)

  const loadedThreadRef = useRef<string | null>(null)

  const toolNameToLabel = (name: string): string => {
    const map: Record<string, string> = {
      // Analytics
      get_traffic_overview: 'Pulling traffic data...',
      get_top_pages: 'Analyzing top pages...',
      get_page_performance: 'Checking page performance...',
      get_trending_pages: 'Finding trending pages...',
      get_declining_pages: 'Checking declining pages...',
      get_web_vitals: 'Checking Core Web Vitals...',
      get_conversions: 'Pulling conversion data...',
      analyze_traffic: 'Analyzing traffic patterns...',
      get_portfolio_overview: 'Loading portfolio overview...',
      compare_projects: 'Comparing projects...',
      get_org_traffic_summary: 'Summarizing org traffic...',
      generate_audit_insights: 'Generating audit insights...',
      // CRM
      get_priority_leads: 'Finding high-priority leads...',
      search_contacts: 'Looking up contacts...',
      get_new_leads: 'Checking recent leads...',
      get_today_schedule: 'Pulling today\'s schedule...',
      score_lead: 'Scoring lead...',
      prioritize_followups: 'Prioritizing follow-ups...',
      draft_email: 'Drafting email...',
      send_follow_up_email: 'Sending email...',
      analyze_pipeline: 'Analyzing pipeline...',
      suggest_next_action: 'Analyzing next action...',
      // SEO
      get_recent_seo_changes: 'Checking recent SEO changes...',
      create_seo_ab_test: 'Creating A/B test...',
      analyze_page: 'Analyzing page SEO...',
      quick_wins: 'Finding SEO quick wins...',
      keyword_recommendations: 'Generating keyword ideas...',
      content_brief: 'Creating content brief...',
      competitor_analysis: 'Analyzing competitor...',
      analyze_competitor_full: 'Running deep competitor analysis...',
      technical_audit: 'Running technical audit...',
      internal_linking: 'Analyzing internal links...',
      generate_schema: 'Generating schema markup...',
      train_site: 'Training on site data...',
      // Knowledge & Memory
      searchKnowledge: 'Searching knowledge base...',
      search_knowledge_base: 'Searching knowledge base...',
      remember: 'Saving to memory...',
      recall: 'Recalling from memory...',
      getCurrentDateTime: 'Checking current time...',
      get_user_context: 'Loading user context...',
      // Data Access
      query_data: 'Querying data...',
      get_aggregates: 'Aggregating data...',
      get_available_data: 'Checking available data...',
      describe_table: 'Inspecting table schema...',
      // Goals
      set_goal: 'Setting goal...',
      list_goals: 'Loading goals...',
      check_goal_progress: 'Checking goal progress...',
      update_goal_progress: 'Updating goal...',
      // Reputation
      respond_to_review: 'Responding to review...',
      request_review: 'Sending review request...',
      // Bookings
      cancel_booking: 'Cancelling booking...',
      reschedule_booking: 'Rescheduling booking...',
      create_booking_for_contact: 'Creating booking...',
      // Broadcast
      create_broadcast_post: 'Creating broadcast post...',
      schedule_broadcast: 'Scheduling broadcast...',
      // Forms
      create_form: 'Creating form...',
      update_form_fields: 'Updating form fields...',
      // Automations
      create_automation: 'Creating automation...',
      list_automations: 'Loading automations...',
      toggle_automation: 'Toggling automation...',
      delete_automation: 'Deleting automation...',
      get_automation_runs: 'Loading automation history...',
      // Integrations
      list_integrations: 'Checking integrations...',
      send_slack_message: 'Sending to Slack...',
      send_sms: 'Sending SMS...',
      call_webhook: 'Calling webhook...',
      // Reminders
      set_reminder: 'Setting reminder...',
      list_reminders: 'Checking reminders...',
      cancel_reminder: 'Cancelling reminder...',
      // Notification preferences
      get_notification_preferences: 'Checking notification settings...',
      update_notification_preferences: 'Updating notification settings...',
      // Team
      share_conversation: 'Sharing conversation...',
      // Proposals
      draft_proposal: 'Drafting proposal...',
      edit_proposal: 'Editing proposal...',
      suggest_pricing: 'Analyzing pricing...',
      // Content
      generate_blog: 'Generating blog content...',
    }
    return map[name] || `Running ${name.replace(/_/g, ' ')}...`
  }

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
    async (content: string, files?: File[]) => {
      let currentThreadId = thread?.thread_id || loadedThreadRef.current
      const isNewThread = !currentThreadId || currentThreadId.startsWith('new-')

      if (isNewThread) {
        currentThreadId = await createThread()
      }

      // Convert image files to base64 for vision analysis
      let imageAttachments: Array<{ type: string; data: string; name: string }> = []
      if (files?.length) {
        const imageFiles = files.filter((f) => f.type.startsWith('image/'))
        imageAttachments = await Promise.all(
          imageFiles.map(
            (f) =>
              new Promise<{ type: string; data: string; name: string }>((resolve) => {
                const reader = new FileReader()
                reader.onload = () =>
                  resolve({ type: f.type, data: reader.result as string, name: f.name })
                reader.readAsDataURL(f)
              }),
          ),
        )
      }

      // Add user message immediately
      const userMessageId = `user-${Date.now()}`
      const userMessage: ChatKitItem = {
        id: userMessageId,
        thread_id: currentThreadId,
        type: 'user_message',
        content: [{ type: 'input_text', text: content }],
        attachments: files?.length
          ? files.map((f) => ({
              type: f.type.startsWith('image/') ? 'image' : 'file',
              url: URL.createObjectURL(f),
              name: f.name,
              size: f.size,
            }))
          : undefined,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      setIsStreaming(true)
      setStreamingContent('')
      setActiveToolCall(null)
      setSuggestionChips([])
      setError(null)

      const conversationId = isNewThread ? undefined : currentThreadId

      // Augment message with image descriptions for the AI
      const messageWithAttachments = imageAttachments.length > 0
        ? `${content}\n\n[User attached ${imageAttachments.length} image(s): ${imageAttachments.map((a) => a.name).join(', ')}]`
        : content

      try {
        await echoApi.streamChat(
          {
            message: messageWithAttachments,
            conversationId,
            skill: skill || undefined,
            pageContext: pageContext || (contextId ? { contextId } : undefined),
            attachments: imageAttachments.length > 0 ? imageAttachments : undefined,
          },
          {
            onToken: (token) => {
              setActiveToolCall(null)
              setStreamingContent((prev) => prev + token)
            },
            onToolCall: (toolData: any) => {
              const name = toolData?.toolName || toolData?.name || 'unknown'
              setActiveToolCall({ toolName: name, label: toolNameToLabel(name) })
            },
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
              // Parse suggestion chips from the AI response
              setSuggestionChips(parseSuggestions(response))
            },
            onError: (msg) => {
              setError(new Error(msg))
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === userMessageId ? { ...m, sendFailed: true } : m,
                ),
              )
            },
          },
        )
      } catch (err) {
        console.error('[useEchoChat] Stream error:', err)
        setError(err as Error)
        // Mark the user message as failed so the retry button appears
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessageId ? { ...m, sendFailed: true } : m,
          ),
        )
      } finally {
        setIsStreaming(false)
        setStreamingContent('')
        setActiveToolCall(null)
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

  const sendFeedback = useCallback(async (messageId: string, type: 'positive' | 'negative', correction?: string) => {
    try {
      await echoApi.rateResponse({
        messageId,
        conversationId: thread?.thread_id || loadedThreadRef.current,
        rating: type === 'positive' ? 1 : 0,
        feedbackType: 'rating',
        correction,
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
    activeToolCall,
    suggestionChips,
    error,
    sendMessage,
    loadThread,
    createThread,
    retryMessage,
    sendFeedback,
    loadThreads,
  }
}
