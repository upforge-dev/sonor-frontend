/**
 * @uptrade/site-kit/engage - Chat Widget (Redesigned)
 *
 * Features:
 * - Pulls brand colors (primary/secondary) + business info from project settings via API
 * - Welcome screen with quick-action chips before first message
 * - Echo (AI) chat when mode is ai / hybrid; gateway returns Echo responses
 * - Automated handoff to live agent (re-checks availability; if agents online, POST handoff)
 * - Managed offline form when nobody is online (configurable heading/subheading)
 * - Socket.io with auto-reconnect for real-time live chat
 * - Proper AI → Live → Offline sequence routing
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { ChatConfig } from './types'

// Socket type — the actual library is lazy-loaded via socket-loader.ts
// to keep socket.io-client out of the main bundle entirely.
type Socket = { connected: boolean; disconnect: () => void; on: (ev: string, fn: (...args: any[]) => void) => void; emit: (ev: string, data?: any) => void }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatWidgetProps {
  projectId: string
  config?: Partial<ChatConfig>
  apiUrl?: string
}

interface MessageAttachment {
  name: string
  url: string
  size?: number
  mimeType?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'agent' | 'system'
  content: string
  timestamp: Date
  agentName?: string
  attachments?: MessageAttachment[]
  suggestions?: string[]
  sendFailed?: boolean
}

interface AvailabilityStatus {
  available: boolean
  mode: 'live' | 'ai' | 'offline'
  agentsOnline: number
  operatingHoursActive: boolean
}

interface OfflineFormData {
  name: string
  email: string
  phone: string
  message: string
}

/** Enriched widget config from API (engage_chat_config + project settings) */
interface WidgetConfigFromApi {
  // Chat config fields
  is_enabled?: boolean
  position?: string
  initial_message?: string
  welcome_message?: string
  form_heading?: string
  form_description?: string
  offline_message?: string
  offlineFormSlug?: string
  chat_mode?: string
  signal_enabled?: boolean
  offline_mode?: string
  offline_heading?: string
  offline_subheading?: string
  welcome_screen_enabled?: boolean
  welcome_quick_actions?: string[]
  handoff_enabled?: boolean
  show_powered_by?: boolean
  business_hours?: any
  // Branding from Project Settings
  brand_primary?: string
  brand_secondary?: string
  logo_url?: string
  project_name?: string
  // Business info from Project Settings
  business_info?: {
    name?: string
    phone?: string
    domain?: string
    address?: string
    hours?: any
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiConfig() {
  const apiUrl =
    typeof window !== 'undefined'
      ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
      : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' ? (window as any).__SITE_KIT_API_KEY__ : undefined
  return { apiUrl, apiKey }
}

function generateVisitorId(): string {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('engage_visitor_id') : null
  if (stored) return stored
  const id = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  if (typeof localStorage !== 'undefined') localStorage.setItem('engage_visitor_id', id)
  return id
}

/** Darken / lighten a hex colour */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Determine if a hex colour is light enough to need dark text */
function isLightColor(hex: string): boolean {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = num >> 16
  const g = (num >> 8) & 0x00ff
  const b = num & 0x0000ff
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatWidget({ projectId, config, apiUrl: propApiUrl }: ChatWidgetProps) {
  // State -------------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityStatus | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [visitorId] = useState(generateVisitorId)
  const [agentTyping, setAgentTyping] = useState(false)
  const [showOfflineForm, setShowOfflineForm] = useState(false)
  const [offlineForm, setOfflineForm] = useState<OfflineFormData>({ name: '', email: '', phone: '', message: '' })
  const [offlineSubmitted, setOfflineSubmitted] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfigFromApi | null>(null)
  const [handoffOfflinePrompt, setHandoffOfflinePrompt] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [lastFailedSend, setLastFailedSend] = useState<{ content: string; attachments: MessageAttachment[] } | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingInitialMessageRef = useRef<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived values ----------------------------------------------------------
  const position = config?.position || widgetConfig?.position || 'bottom-right'
  const primaryColor = widgetConfig?.brand_primary || config?.buttonColor || '#00afab'
  const secondaryColor = widgetConfig?.brand_secondary || config?.brandSecondary || adjustColor(primaryColor, -30)
  const businessName = widgetConfig?.project_name || widgetConfig?.business_info?.name || 'Chat with us'
  const logoUrl = widgetConfig?.logo_url || null
  const welcomeEnabled = widgetConfig?.welcome_screen_enabled !== false
  const quickActions: string[] = Array.isArray(widgetConfig?.welcome_quick_actions) ? widgetConfig.welcome_quick_actions : []
  const showPoweredBy = widgetConfig?.show_powered_by !== false
  const welcomeMessage =
    widgetConfig?.initial_message ?? widgetConfig?.welcome_message ?? config?.welcomeMessage ?? 'Hi! How can I help you today?'
  const offlineHeading = widgetConfig?.offline_heading ?? 'No agents available right now'
  const offlineSubheading =
    handoffOfflinePrompt ?? widgetConfig?.offline_subheading ?? widgetConfig?.form_description ?? widgetConfig?.offline_message ?? config?.offlineMessage ?? "Leave us a message and we'll get back to you!"

  const baseUrl = propApiUrl || getApiConfig().apiUrl

  // -------------------------------------------------------------------------
  // API calls
  // -------------------------------------------------------------------------

  const fetchWidgetConfig = useCallback(async () => {
    if (!projectId) return
    try {
      const { apiKey } = getApiConfig()
      const response = await fetch(`${baseUrl}/engage/widget/config?projectId=${projectId}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      if (response.ok) {
        const { data } = await response.json()
        setWidgetConfig(data ?? null)
      }
    } catch (error) {
      // Silently degrade when API unreachable (e.g. local dev, CORS, network)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ChatWidget] Config fetch failed:', error instanceof Error ? error.message : error)
      }
    }
  }, [projectId, baseUrl])

  const checkAvailability = useCallback(async (): Promise<AvailabilityStatus | null> => {
    if (!projectId) return null
    try {
      const { apiKey } = getApiConfig()
      const response = await fetch(`${baseUrl}/engage/widget/availability?projectId=${projectId}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      if (response.ok) {
        const { data } = await response.json()
        setAvailability(data)
        return data
      }
    } catch (error) {
      // Silently degrade when API unreachable (e.g. local dev, CORS, network)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ChatWidget] Availability check failed:', error instanceof Error ? error.message : error)
      }
    }
    return null
  }, [projectId, baseUrl])

  const initSession = useCallback(async () => {
    try {
      const { apiKey } = getApiConfig()
      const response = await fetch(`${baseUrl}/engage/widget/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && { 'x-api-key': apiKey }) },
        body: JSON.stringify({
          projectId,
          visitorId,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })
      if (response.ok) {
        const { data } = await response.json()
        const sid = data.id || data.session_id
        setSessionId(sid)
        if (data.messages?.length > 0) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role === 'visitor' ? 'user' : m.role,
              content: m.content,
              timestamp: new Date(m.created_at),
              agentName: m.sender_name,
            })),
          )
        }
        return sid
      }
    } catch (error) {
      console.error('[ChatWidget] Session init failed:', error)
    }
    return null
  }, [projectId, visitorId, baseUrl])

  // -------------------------------------------------------------------------
  // Socket.io message handler
  // -------------------------------------------------------------------------

  const handleSocketMessage = useCallback((data: any) => {
    switch (data.type || data.event) {
      case 'message': {
        const role = data.role === 'visitor' ? 'user' : data.role === 'ai' ? 'assistant' : (data.role as Message['role'])
        const newMessage: Message = {
          id: data.id || `msg-${Date.now()}`,
          role,
          content: data.content ?? '',
          timestamp: new Date(),
          agentName: data.agentName,
          ...(data.attachments?.length ? { attachments: data.attachments } : {}),
          ...(data.suggestions?.length ? { suggestions: data.suggestions as string[] } : {}),
        }
        setMessages((prev) => [...prev, newMessage])
        if (role === 'assistant' || role === 'agent') {
          setAgentTyping(false)
          setIsLoading(false)
        }
        break
      }
      case 'agent:joined':
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            role: 'system',
            content: data.agentName ? `${data.agentName} has joined the chat.` : 'An agent has joined the chat.',
            timestamp: new Date(),
          },
        ])
        break
      case 'typing':
        setAgentTyping(data.isTyping)
        break
      case 'handoff:initiated':
        setMessages((prev) => [
          ...prev,
          { id: `system-${Date.now()}`, role: 'system', content: data.message || 'Connecting you with a team member...', timestamp: new Date() },
        ])
        break
      case 'chat:closed':
        setMessages((prev) => [
          ...prev,
          { id: `system-${Date.now()}`, role: 'system', content: data.message || 'This chat has been closed.', timestamp: new Date() },
        ])
        break
    }
  }, [])

  // -------------------------------------------------------------------------
  // Socket.io connection (with auto-reconnect)
  // -------------------------------------------------------------------------

  const connectSocket = useCallback(
    async (currentSessionId: string) => {
      if (socketRef.current?.connected) return

      // Disconnect any stale socket first
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }

      // Lazy-load socket.io via separate module so bundlers never pull it
      // into the main engage chunk (avoids massive client bundle).
      const { createSocket } = await import('./socket-loader')

      const namespaceUrl = `${baseUrl.replace(/\/$/, '')}/engage/chat`
      const socket = await createSocket(namespaceUrl, {
        query: { projectId, visitorId, sessionId: currentSessionId },
        transports: ['websocket', 'polling'],
        // Auto-reconnect config
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 15000,
      })

      socket.on('connect', () => {
        setConnectionStatus('connected')
        console.log('[ChatWidget] Socket.io connected')
        // Re-fetch messages to catch anything missed while disconnected
        if (currentSessionId) {
          const { apiKey } = getApiConfig()
          fetch(`${baseUrl}/engage/widget/messages?sessionId=${currentSessionId}`, {
            headers: apiKey ? { 'x-api-key': apiKey } : {},
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
              const data = json?.data ?? json
              if (Array.isArray(data) && data.length) {
                setMessages((prev) => {
                  const byId = new Map(prev.map((m) => [m.id, m]))
                  data.forEach((m: any) =>
                    byId.set(m.id, {
                      id: m.id,
                      role: m.role === 'visitor' ? 'user' : m.role,
                      content: m.content,
                      timestamp: new Date(m.created_at),
                      agentName: m.sender_name,
                      attachments: m.attachments,
                    }),
                  )
                  return Array.from(byId.values()).sort((a, b) => (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime())
                })
              }
            })
            .catch((err) => console.warn('[ChatWidget] Refetch messages on reconnect failed', err))
        }

        // Retry any buffered message
        if (lastFailedSend) {
          socket.emit('visitor:message', {
            content: lastFailedSend.content,
            attachments: lastFailedSend.attachments?.length ? lastFailedSend.attachments : undefined,
          })
          setLastFailedSend(null)
          setMessages((prev) => prev.filter((m) => !m.sendFailed))
          setIsLoading(true)
        }
      })

      socket.on('message', (data: any) => handleSocketMessage({ type: 'message', ...data }))
      socket.on('agent:joined', (data: any) => handleSocketMessage({ type: 'agent:joined', ...data }))
      socket.on('typing', (data: any) => handleSocketMessage({ type: 'typing', ...data }))
      socket.on('handoff:initiated', (data: any) => handleSocketMessage({ type: 'handoff:initiated', ...data }))
      socket.on('chat:closed', (data: any) => handleSocketMessage({ type: 'chat:closed', ...data }))

      socket.on('disconnect', (reason) => {
        setConnectionStatus('disconnected')
        console.log('[ChatWidget] Socket disconnected:', reason)
      })

      socket.on('reconnect_attempt', (attempt) => {
        setConnectionStatus('connecting')
        console.log(`[ChatWidget] Reconnect attempt #${attempt}`)
      })

      socket.on('reconnect_failed', () => {
        console.warn('[ChatWidget] All reconnect attempts failed, falling back to polling')
        if (isOpen && currentSessionId) startPolling(currentSessionId)
      })

      socket.on('connect_error', (err) => {
        console.error('[ChatWidget] Socket connect error:', err)
        setConnectionStatus('connecting') // socket.io will auto-retry
      })

      socketRef.current = socket
    },
    [projectId, visitorId, baseUrl, isOpen, handleSocketMessage, lastFailedSend],
  )

  // Polling fallback
  const startPolling = useCallback(
    (currentSessionId: string) => {
      if (pollingIntervalRef.current) return
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const { apiKey } = getApiConfig()
          const response = await fetch(`${baseUrl}/engage/widget/messages?sessionId=${currentSessionId}`, {
            headers: apiKey ? { 'x-api-key': apiKey } : {},
          })
          if (response.ok) {
            const { data } = await response.json()
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id))
              const newMessages = data.filter((m: any) => !existingIds.has(m.id))
              if (newMessages.length > 0) {
                return [
                  ...prev,
                  ...newMessages.map((m: any) => ({
                    id: m.id,
                    role: m.role === 'visitor' ? 'user' : m.role,
                    content: m.content,
                    timestamp: new Date(m.created_at),
                    agentName: m.sender_name,
                  })),
                ]
              }
              return prev
            })
          }
        } catch (error) {
          console.error('[ChatWidget] Polling failed:', error)
        }
      }, 3000)
    },
    [baseUrl],
  )

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, agentTyping])

  // Focus input when chat opens and welcome screen is hidden
  useEffect(() => {
    if (isOpen && !showWelcome && inputRef.current) inputRef.current.focus()
  }, [isOpen, showWelcome])

  // Fetch config + availability on mount
  useEffect(() => {
    fetchWidgetConfig()
    checkAvailability()
    const interval = setInterval(checkAvailability, 60000)
    return () => {
      clearInterval(interval)
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [fetchWidgetConfig, checkAvailability])

  // Init session and connect when chat opens (after welcome dismissed and routing decided)
  useEffect(() => {
    if (isOpen && !showWelcome && !checkingAvailability && !showOfflineForm && !sessionId) {
      initSession().then(async (id) => {
        if (!id) return
        // Connect for any non-offline mode (live, ai, or default/undefined)
        setConnectionStatus('connecting')
        await connectSocket(id)

        // If there's a pending initial message (from quick action chip), send it
        // once the socket is ready. Give it a short moment to finish connecting.
        const pending = pendingInitialMessageRef.current
        if (pending) {
          pendingInitialMessageRef.current = null
          // Wait briefly for socket to be ready
          const waitForSocket = () => new Promise<void>((resolve) => {
            const check = (attempts = 0) => {
              if (socketRef.current?.connected || attempts > 20) { resolve(); return }
              setTimeout(() => check(attempts + 1), 150)
            }
            check()
          })
          await waitForSocket()
          if (socketRef.current?.connected) {
            socketRef.current.emit('visitor:message', { content: pending })
          }
        }
      })
    }
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [isOpen, showWelcome, checkingAvailability, showOfflineForm, sessionId, initSession, connectSocket])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  /** Start chatting (dismiss welcome screen) with availability routing */
  const startChat = useCallback(
    async (initialMessage?: string) => {
      setShowWelcome(false)

      const beginChatSession = () => {
        setMessages([{ id: 'welcome', role: 'assistant', content: welcomeMessage, timestamp: new Date() }])
        if (initialMessage) {
          // Stash the initial message — the session-init effect will send it
          // once the socket is connected. This avoids duplicate messages.
          pendingInitialMessageRef.current = initialMessage
          const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: initialMessage, timestamp: new Date() }
          setMessages((prev) => [...prev, userMsg])
          setIsLoading(true)
        }
      }

      // Signal/AI mode → go straight to chat (AI is always available)
      if (widgetConfig?.signal_enabled) {
        beginChatSession()
        return
      }

      // ─── Live-only mode: check agent availability ───────────────────
      // No Signal → live chat with human agents or offline form.
      setCheckingAvailability(true)

      // First real-time check
      const firstCheck = await checkAvailability()
      if (firstCheck?.available && firstCheck.agentsOnline > 0) {
        setCheckingAvailability(false)
        beginChatSession()
        return
      }

      // No agents online – wait ~5 seconds for push notification response.
      // Future: this is where we send a push notification to agents via
      // the Uptrade Messenger app.  Agents get 5-6 seconds to open the
      // notification and come online before we fall through to the offline form.
      await new Promise((resolve) => setTimeout(resolve, 5000))

      // Re-check after the grace period
      const secondCheck = await checkAvailability()
      setCheckingAvailability(false)

      if (secondCheck?.available && secondCheck.agentsOnline > 0) {
        // An agent responded – start live chat
        beginChatSession()
      } else {
        // Still no agents – show offline form
        setShowOfflineForm(true)
      }
    },
    [widgetConfig?.signal_enabled, welcomeMessage, checkAvailability],
  )

  const uploadWidgetFile = useCallback(
    async (file: File): Promise<MessageAttachment | null> => {
      if (!sessionId || !visitorId) return null
      const { apiKey } = getApiConfig()
      const form = new FormData()
      form.append('file', file)
      form.append('sessionId', sessionId)
      form.append('visitorId', visitorId)
      const res = await fetch(`${baseUrl}/engage/widget/upload`, {
        method: 'POST',
        headers: apiKey ? { 'x-api-key': apiKey } : {},
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const json = await res.json()
      const d = json?.data ?? json
      return d?.url ? { name: d.name ?? file.name, url: d.url, size: d.size, mimeType: d.mimeType } : null
    },
    [sessionId, visitorId, baseUrl],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const hasText = !!inputValue.trim()
      const hasFiles = pendingFiles.length > 0
      if ((!hasText && !hasFiles) || isLoading) return

      const content = inputValue.trim() || ''
      let attachments: MessageAttachment[] = []
      if (pendingFiles.length) {
        try {
          for (const file of pendingFiles) {
            const att = await uploadWidgetFile(file)
            if (att) attachments.push(att)
          }
          setPendingFiles([])
        } catch (err) {
          console.error('[ChatWidget] File upload failed', err)
          setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Failed to upload file. Please try again.', timestamp: new Date() }])
          return
        }
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        ...(attachments.length ? { attachments } : {}),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setIsLoading(true)

      const socket = socketRef.current
      if (socket?.connected) {
        socket.emit('visitor:message', { content: userMessage.content, attachments: attachments.length ? attachments : undefined })
        setLastFailedSend(null)
        return
      }

      // Buffer for retry on reconnect instead of showing error immediately
      setLastFailedSend({ content: userMessage.content, attachments })
      // Give socket.io a moment to reconnect before showing error
      setTimeout(() => {
        if (!socketRef.current?.connected) {
          setMessages((prev) => [
            ...prev,
            { id: `error-${Date.now()}`, role: 'system', content: 'Reconnecting...', timestamp: new Date(), sendFailed: true },
          ])
          setIsLoading(false)
        }
      }, 3000)
    },
    [inputValue, isLoading, pendingFiles, uploadWidgetFile],
  )

  const retryFailedSend = useCallback(() => {
    if (!lastFailedSend || !sessionId) return
    const socket = socketRef.current
    if (socket?.connected) {
      socket.emit('visitor:message', { content: lastFailedSend.content, attachments: lastFailedSend.attachments?.length ? lastFailedSend.attachments : undefined })
      setLastFailedSend(null)
      setMessages((prev) => prev.filter((m) => !m.sendFailed))
      setIsLoading(true)
    } else {
      connectSocket(sessionId)
    }
  }, [lastFailedSend, sessionId, connectSocket])

  const requestHandoff = useCallback(async () => {
    if (!sessionId) return
    try {
      const { apiKey } = getApiConfig()
      const availRes = await fetch(`${baseUrl}/engage/widget/availability?projectId=${projectId}`, {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      const avail = availRes.ok ? (await availRes.json()).data : null

      if (avail?.agentsOnline === 0) {
        setHandoffOfflinePrompt(widgetConfig?.offline_subheading ?? "Nobody is online right now. Leave your details and we'll get back to you.")
        setShowOfflineForm(true)
        setMessages((prev) => [
          ...prev,
          { id: `handoff-offline-${Date.now()}`, role: 'system', content: offlineHeading, timestamp: new Date() },
        ])
        return
      }

      await fetch(`${baseUrl}/engage/widget/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey && { 'x-api-key': apiKey }) },
        body: JSON.stringify({ sessionId }),
      })
      setMessages((prev) => [
        ...prev,
        { id: `handoff-${Date.now()}`, role: 'system', content: 'Connecting you with a team member. Please hold on!', timestamp: new Date() },
      ])
    } catch (error) {
      console.error('[ChatWidget] Handoff request failed:', error)
    }
  }, [sessionId, baseUrl, projectId, widgetConfig, offlineHeading])

  const [offlineError, setOfflineError] = useState<string | null>(null)

  const handleOfflineSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!offlineForm.name || !offlineForm.email || !offlineForm.message) return
      setIsLoading(true)
      setOfflineError(null)
      try {
        const { apiKey } = getApiConfig()
        const response = await fetch(`${baseUrl}/engage/widget/offline-form`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(apiKey && { 'x-api-key': apiKey }) },
          body: JSON.stringify({
            projectId,
            visitorId,
            ...offlineForm,
            pageUrl: typeof window !== 'undefined' ? window.location.href : '',
            ...(widgetConfig?.offlineFormSlug && { formSlug: widgetConfig.offlineFormSlug }),
          }),
        })
        if (response.ok) {
          setOfflineSubmitted(true)
        } else {
          const errorBody = await response.text().catch(() => '')
          console.error(`[ChatWidget] Offline form returned ${response.status}:`, errorBody)
          setOfflineError('Something went wrong. Please try again.')
        }
      } catch (error) {
        console.error('[ChatWidget] Offline form submission failed:', error)
        setOfflineError('Unable to send message. Please check your connection and try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [offlineForm, projectId, visitorId, baseUrl, widgetConfig],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }, [handleSubmit])

  const handleTyping = useCallback(() => {
    const socket = socketRef.current
    if (socket?.connected) {
      socket.emit('visitor:typing', { isTyping: true })
      setTimeout(() => {
        if (socketRef.current?.connected) socketRef.current.emit('visitor:typing', { isTyping: false })
      }, 2000)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Status label
  // -------------------------------------------------------------------------

  const statusLabel = (() => {
    if (showOfflineForm) return null
    if (checkingAvailability) return { dot: '#f59e0b', text: 'Checking for a team member...' }
    if (widgetConfig?.signal_enabled) return { dot: '#a78bfa', text: 'AI Assistant' }
    if (availability && availability.agentsOnline > 0) return { dot: '#22c55e', text: 'Online' }
    return { dot: '#9ca3af', text: "We'll respond soon" }
  })()

  // -------------------------------------------------------------------------
  // Render: Chat Button
  // -------------------------------------------------------------------------

  const ChatButton = (
    <button
      onClick={handleToggle}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      style={{
        position: 'fixed',
        [position === 'bottom-left' ? 'left' : 'right']: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: primaryColor,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        zIndex: 9999,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)'
      }}
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  )

  // -------------------------------------------------------------------------
  // Render: Header (shared across all views)
  // -------------------------------------------------------------------------

  const Header = (
    <div
      style={{
        padding: '16px 20px',
        background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -25)})`,
        color: isLightColor(primaryColor) ? '#1a1a1a' : 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Logo or icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: isLightColor(primaryColor) ? 'none' : 'brightness(0) invert(1)' }} />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {showOfflineForm ? offlineHeading : businessName}
        </div>
        {statusLabel && (
          <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: statusLabel.dot, flexShrink: 0 }} />
            {statusLabel.text}
          </div>
        )}
      </div>

      {/* Connection status indicator */}
      {connectionStatus === 'connecting' && !showWelcome && !showOfflineForm && (
        <div style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ animation: 'chatDot 1s infinite ease-in-out' }}>●</span>
          Connecting
        </div>
      )}
    </div>
  )

  // -------------------------------------------------------------------------
  // Render: Welcome Screen
  // -------------------------------------------------------------------------

  const WelcomeScreen = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 16 }}>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.5 }}>
          {welcomeMessage}
        </div>
      </div>

      {/* Quick action chips */}
      {quickActions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quickActions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => startChat(action)}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: `1px solid ${primaryColor}33`,
                backgroundColor: `${primaryColor}08`,
                color: primaryColor,
                fontSize: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s, border-color 0.15s',
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${primaryColor}15`
                e.currentTarget.style.borderColor = `${primaryColor}55`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${primaryColor}08`
                e.currentTarget.style.borderColor = `${primaryColor}33`
              }}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Start chat button */}
      <button
        type="button"
        onClick={() => startChat()}
        style={{
          padding: '12px 20px',
          borderRadius: 12,
          border: 'none',
          backgroundColor: primaryColor,
          color: isLightColor(primaryColor) ? '#1a1a1a' : 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 'auto',
        }}
      >
        Start a conversation
      </button>

      {/* Business phone */}
      {widgetConfig?.business_info?.phone && (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
          Or call us at{' '}
          <a href={`tel:${widgetConfig.business_info.phone}`} style={{ color: primaryColor, textDecoration: 'none', fontWeight: 500 }}>
            {widgetConfig.business_info.phone}
          </a>
        </div>
      )}
    </div>
  )

  // -------------------------------------------------------------------------
  // Render: Offline Form
  // -------------------------------------------------------------------------

  const OfflineFormView = (
    <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
      {offlineSubmitted ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: `${primaryColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#111827' }}>Message Sent!</h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{offlineSubheading}</p>
        </div>
      ) : (
        <form onSubmit={handleOfflineSubmit}>
          <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>{offlineSubheading}</p>
          {[
            { name: 'name' as const, type: 'text', placeholder: 'Your name *', required: true },
            { name: 'email' as const, type: 'email', placeholder: 'Your email *', required: true },
            { name: 'phone' as const, type: 'tel', placeholder: 'Phone (optional)', required: false },
          ].map((field) => (
            <div key={field.name} style={{ marginBottom: 12 }}>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={offlineForm[field.name]}
                onChange={(e) => setOfflineForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                required={field.required}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = primaryColor)}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <textarea
              placeholder="How can we help? *"
              value={offlineForm.message}
              onChange={(e) => setOfflineForm((prev) => ({ ...prev, message: e.target.value }))}
              required
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = primaryColor)}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>
          {offlineError && (
            <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
              {offlineError}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: primaryColor,
              color: isLightColor(primaryColor) ? '#1a1a1a' : 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  )

  // -------------------------------------------------------------------------
  // Render: Checking Availability Screen
  // -------------------------------------------------------------------------

  const CheckingScreen = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20, textAlign: 'center' }}>
      {/* Pulsing radar icon */}
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: `${primaryColor}15`,
            animation: 'checkPulse 2s infinite ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            backgroundColor: `${primaryColor}25`,
            animation: 'checkPulse 2s infinite ease-out 0.4s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 16,
            borderRadius: '50%',
            backgroundColor: primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLightColor(primaryColor) ? '#1a1a1a' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
          Checking for a team member
        </div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
          One moment please
          <span style={{ display: 'inline-flex', width: 20 }}>
            <span style={{ animation: 'checkDots 1.5s infinite steps(4, end)' }}>...</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: '80%', height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: primaryColor,
            borderRadius: 2,
            animation: 'checkProgress 5s linear forwards',
            transformOrigin: 'left',
          }}
        />
      </div>

      <div style={{ fontSize: 12, color: '#9ca3af' }}>
        This usually takes just a few seconds
      </div>
    </div>
  )

  // -------------------------------------------------------------------------
  // Render: Messages View
  // -------------------------------------------------------------------------

  const MessagesView = (
    <>
      {/* Messages area */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: '#f9fafb' }}
      >
        {messages.map((message) => (
          <div key={message.id} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '80%',
                padding: message.role === 'system' ? '8px 12px' : '10px 14px',
                borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : message.role === 'system' ? '8px' : '16px 16px 16px 4px',
                backgroundColor: message.role === 'user' ? primaryColor : message.role === 'system' ? '#e5e7eb' : '#ffffff',
                color: message.role === 'user' ? (isLightColor(primaryColor) ? '#1a1a1a' : 'white') : message.role === 'system' ? '#6b7280' : '#111827',
                boxShadow: message.role === 'system' ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
                fontSize: message.role === 'system' ? 13 : 14,
                fontStyle: message.role === 'system' ? 'italic' : 'normal',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.agentName && message.role === 'agent' && (
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{message.agentName}</div>
              )}
              {message.content}
              {/* Attachments */}
              {message.attachments?.length ? (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {message.attachments.map((att, i) =>
                    att.mimeType?.startsWith('image/') ? (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                        <img src={att.url} alt={att.name} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
                      </a>
                    ) : (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                        📎 {att.name}
                      </a>
                    ),
                  )}
                </div>
              ) : null}
              {/* Suggestion chips */}
              {message.suggestions?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {message.suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setInputValue(s)
                        inputRef.current?.focus()
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 16,
                        border: `1px solid ${secondaryColor}`,
                        backgroundColor: `${secondaryColor}10`,
                        color: secondaryColor,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              {/* Retry on failed send */}
              {message.sendFailed && lastFailedSend && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={retryFailedSend}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ef4444', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}
                  >
                    Retry send
                  </button>
                </div>
              )}
              {/* Handoff button — only in AI mode, skip if message already has suggestion chips */}
              {widgetConfig?.signal_enabled && message.role === 'assistant' && !message.suggestions?.length && widgetConfig?.handoff_enabled !== false && messages.filter((m) => m.role === 'user').length >= 2 && message.id === messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.id && (
                <button
                  onClick={requestHandoff}
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: `1px solid ${secondaryColor}`,
                    backgroundColor: 'transparent',
                    color: secondaryColor,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Talk to a person
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {(isLoading || agentTyping) && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                display: 'flex',
                gap: 4,
                color: '#9ca3af',
              }}
            >
              <span style={{ animation: 'chatDot 1.4s infinite ease-in-out', animationDelay: '0s' }}>●</span>
              <span style={{ animation: 'chatDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }}>●</span>
              <span style={{ animation: 'chatDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }}>●</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Failed send bar */}
      {lastFailedSend && (
        <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderTop: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#dc2626' }}>Failed to send</span>
          <button type="button" onClick={retryFailedSend} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ padding: 12, borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              handleTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 24,
              border: '1px solid #e5e7eb',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = primaryColor)}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: (inputValue.trim() || pendingFiles.length) && !isLoading ? primaryColor : '#e5e7eb',
              color: (inputValue.trim() || pendingFiles.length) && !isLoading && isLightColor(primaryColor) ? '#1a1a1a' : 'white',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </>
  )

  // -------------------------------------------------------------------------
  // Render: Popup
  // -------------------------------------------------------------------------

  const ChatPopup = isOpen && (
    <div
      style={{
        position: 'fixed',
        [position === 'bottom-left' ? 'left' : 'right']: 20,
        bottom: 90,
        width: 380,
        maxWidth: 'calc(100vw - 40px)',
        height: 520,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9998,
        animation: 'chatSlideUp 0.3s ease-out',
      }}
    >
      {Header}

      {/* Content: Welcome → Checking → Chat → Offline */}
      {checkingAvailability ? CheckingScreen : showOfflineForm ? OfflineFormView : showWelcome && welcomeEnabled && messages.length === 0 ? WelcomeScreen : MessagesView}

      {/* Powered by */}
      {showPoweredBy && (
        <div style={{ padding: '6px 0', textAlign: 'center', fontSize: 11, color: '#9ca3af', backgroundColor: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
          Powered by{' '}
          <a href="https://uptrademedia.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}>
            Uptrade
          </a>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes checkPulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes checkDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }
        @keyframes checkProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )

  // Don't render if projectId is missing (e.g. env var not set)
  if (!projectId) return null

  return (
    <>
      {ChatPopup}
      {ChatButton}
    </>
  )
}
