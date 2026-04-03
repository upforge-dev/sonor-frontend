/**
 * MessagesModuleV2 - All-in-One Messaging Interface (Custom Implementation)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Custom chat implementation replacing OpenAI ChatKit.
 * Handles:
 * - Echo AI conversations (thread_type: 'echo') → Signal API with SSE streaming
 * - User-to-user direct messages (thread_type: 'user') → Portal API with WebSocket
 * - Live website visitor chats (thread_type: 'visitor') → Portal API with WebSocket
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  MessageCircle, 
  Users, 
  Search, 
  Plus,
  Globe,
  User,
  ArrowLeft,
  Hash,
  LogIn,
  Moon,
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Custom chat components
import { ChatArea, ThreadList, ThreadRepliesDrawer } from '@/components/chat'
import type { ChatKitThread, ChatKitItem } from '@/components/chat/types'

// Hooks
import { useEchoChat } from '@/hooks/useEchoChat'
import { useEchoUnread } from '@/hooks/useEchoUnread'
import { usePortalChat } from '@/hooks/usePortalChat'
import { useEngageLiveChat } from '@/hooks/useEngageLiveChat'

// Store & API
import SignalIcon from '@/components/ui/SignalIcon'
import EchoLogo from '@/components/EchoLogo.jsx'
import useAuthStore from '@/lib/auth-store'
import usePageContextStore from '@/lib/page-context-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { messagesApi, chatkitApi, engageApi, portalApi } from '@/lib/sonor-api'
import { echoApi } from '@/lib/signal-api'
import { toast } from '@/lib/toast'
import { usePendingHandoffs } from '@/lib/MessagesProvider'
import { QuickSwitcher } from './QuickSwitcher'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ThreadType = 'echo' | 'user' | 'visitor'

interface MessagesModuleProps {
  /** Default tab to show */
  defaultTab?: ThreadType
  /** Hide the tab selector */
  hideTabs?: boolean
  /** Force a specific thread type */
  threadType?: ThreadType
  /** Force a specific thread ID */
  threadId?: string
  /** Callback when thread changes */
  onThreadChange?: (thread: ChatKitThread | null) => void
  /** Custom className */
  className?: string
  /** 'widget' = single-column layout with back button when thread selected (for floating bubble) */
  variant?: 'full' | 'widget'
  /** Context string from open-echo events (e.g., 'whats-this:crm/pipeline', 'error-help:...') */
  echoContext?: string | null
  /** Called after echoContext has been consumed (auto-sent to Echo) so parent can clear it */
  onEchoContextConsumed?: () => void
}

interface Contact {
  id: string
  name: string
  email: string
  avatar_url?: string
  avatar?: string
  role?: string
  is_ai?: boolean
  contact_type?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// New DM Dialog
// ─────────────────────────────────────────────────────────────────────────────

function NewDMDialog({ 
  open, 
  onOpenChange, 
  onSelectContact,
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectContact: (contact: Contact) => void
}) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const brandColors = useBrandColors()
  const user = useAuthStore(state => state.user)
  
  // Load contacts when dialog opens
  useEffect(() => {
    if (!open) return
    
    const loadContacts = async () => {
      setIsLoading(true)
      try {
        const response = await messagesApi.getContacts()
        const data = response?.data || response || {}
        const allContacts = data.contacts || data.data?.contacts || []
        
        // Filter out current user and AI contacts (Echo is separate tab)
        const portalUsers = allContacts.filter((c: Contact) => 
          c.id !== user?.id && 
          !c.is_ai && 
          c.contact_type !== 'ai'
        )
        
        setContacts(portalUsers)
      } catch (error) {
        console.error('Failed to load contacts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadContacts()
  }, [open, user?.id])
  
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts
    const query = searchQuery.toLowerCase()
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(query) || 
      c.email?.toLowerCase().includes(query)
    )
  }, [contacts, searchQuery])
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--surface-primary)] border-[var(--glass-border)]">
        <DialogHeader className="">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: brandColors.primary }} />
            New Message
          </DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[var(--surface-secondary)] border-[var(--glass-border)]/50"
            autoFocus
          />
        </div>
        
        {/* Contacts List */}
        <ScrollArea className="h-72 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <UptradeSpinner size="md" className="[&_svg]:text-[var(--text-tertiary)]" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
              {searchQuery ? 'No contacts found' : 'No contacts available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    onSelectContact(contact)
                    onOpenChange(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-[var(--surface-secondary)]"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar_url || contact.avatar} className="object-cover" />
                    <AvatarFallback 
                      className="text-sm font-medium"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${brandColors.primary} 15%, transparent)`,
                        color: brandColors.primary
                      }}
                    >
                      {contact.name?.charAt(0) || contact.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {contact.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {contact.email}
                    </p>
                  </div>
                  {contact.role && (
                    <Badge variant="secondary" className="text-xs">
                      {contact.role}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Channel Dialog (Phase 2.9)
// ─────────────────────────────────────────────────────────────────────────────

function CreateChannelDialog({
  open,
  onOpenChange,
  onCreateSuccess,
  projectId,
  orgId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateSuccess: (threadId: string) => void
  projectId?: string | null
  orgId?: string | null
}) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const brandColors = useBrandColors()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      setError('Channel name is required')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await chatkitApi.createChannel({ title: t, project_id: projectId ?? undefined, org_id: orgId ?? undefined })
      const data = res?.data ?? res
      const threadId = data?.thread_id ?? data?.id ?? data?.data?.thread_id
      if (threadId) {
        onCreateSuccess(threadId)
        setTitle('')
        onOpenChange(false)
      } else {
        setError('Channel created but could not open it')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create channel')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--surface-primary)] border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" style={{ color: brandColors.primary }} />
            Create channel
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Channel name</label>
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null) }}
              placeholder="e.g. general"
              className="bg-[var(--surface-secondary)] border-[var(--glass-border)]/50"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting} style={{ backgroundColor: brandColors.primary, color: 'white' }}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Join Channel Dialog (Phase 2.9)
// ─────────────────────────────────────────────────────────────────────────────

function JoinChannelDialog({
  open,
  onOpenChange,
  onJoinSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoinSuccess: (threadId: string) => void
}) {
  const [threadId, setThreadId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const brandColors = useBrandColors()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = threadId.trim()
    if (!id) {
      setError('Channel ID is required')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await chatkitApi.joinChannel(id)
      onJoinSuccess(id)
      setThreadId('')
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to join channel')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[var(--surface-primary)] border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" style={{ color: brandColors.primary }} />
            Join channel
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Channel ID</label>
            <Input
              value={threadId}
              onChange={(e) => { setThreadId(e.target.value); setError(null) }}
              placeholder="Paste channel thread ID (UUID)"
              className="bg-[var(--surface-secondary)] border-[var(--glass-border)]/50 font-mono text-sm"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting} style={{ backgroundColor: brandColors.primary, color: 'white' }}>
              Join
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const TAB_PARAM = 'tab'
const THREAD_PARAM = 'thread'
const VALID_TABS: ThreadType[] = ['echo', 'user', 'visitor']

export function MessagesModuleV2({
  defaultTab = 'echo',
  hideTabs = false,
  threadType,
  threadId,
  onThreadChange,
  className,
  variant = 'full',
  echoContext,
  onEchoContextConsumed,
}: MessagesModuleProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Initialize from URL (only tab/thread from URL when props not forcing)
  const urlTab = searchParams.get(TAB_PARAM) as ThreadType | null
  const urlThread = searchParams.get(THREAD_PARAM)
  const initialTab = threadType ?? (urlTab && VALID_TABS.includes(urlTab) ? urlTab : defaultTab)
  const initialEcho = threadId ?? (urlTab === 'echo' ? urlThread : null) ?? null
  const initialPortal = urlTab !== 'echo' && urlThread ? urlThread : null
  
  const [activeTab, setActiveTab] = useState<ThreadType>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDMDialog, setShowNewDMDialog] = useState(false)
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)

  // Search results (Phase 3.3.1)
  const [searchResults, setSearchResults] = useState<{ messages?: any[]; threads?: any[] } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  
  // Selected threads for each tab
  const [selectedEchoThreadId, setSelectedEchoThreadId] = useState<string | null>(initialEcho)
  const [selectedPortalThreadId, setSelectedPortalThreadId] = useState<string | null>(initialPortal)
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(null)
  
  // Sync URL when tab or thread changes (so refresh / share preserves state)
  const updateUrl = useCallback((tab: ThreadType, echoThread: string | null, portalThread: string | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set(TAB_PARAM, tab)
      if (tab === 'echo' && echoThread) next.set(THREAD_PARAM, echoThread)
      else if (tab !== 'echo' && portalThread) next.set(THREAD_PARAM, portalThread)
      else next.delete(THREAD_PARAM)
      return next
    }, { replace: true })
  }, [setSearchParams])
  
  // Cmd+K / Ctrl+K to open Quick Switcher
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowQuickSwitcher(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Sync state from URL when user navigates (e.g. back/forward or deep link)
  useEffect(() => {
    if (threadType != null || threadId != null) return
    const tab = searchParams.get(TAB_PARAM) as ThreadType | null
    const thread = searchParams.get(THREAD_PARAM)
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab)
      if (tab === 'echo') setSelectedEchoThreadId(thread || null)
      else setSelectedPortalThreadId(thread || null)
    }
  }, [searchParams, threadType, threadId])

  // Search messages/threads (Phase 3.3.1) - debounced
  // Echo tab → Signal API; user/visitor → Portal ChatKit API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(() => {
      if (activeTab === 'echo') {
        echoApi.searchConversations(searchQuery.trim())
          .then((rows: Array<{ conversationId: string; title: string; snippet: string }>) => {
            setSearchResults({
              threads: rows.map(r => ({ thread_id: r.conversationId, title: r.title || r.snippet })),
              messages: [],
            })
          })
          .catch(() => setSearchResults(null))
          .finally(() => setIsSearching(false))
      } else {
        chatkitApi.search(searchQuery.trim())
          .then(res => setSearchResults(res?.data ?? res ?? null))
          .catch(() => setSearchResults(null))
          .finally(() => setIsSearching(false))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, activeTab])
  
  // Thread lists
  const [echoThreads, setEchoThreads] = useState<ChatKitThread[]>([])
  const [portalThreads, setPortalThreads] = useState<ChatKitThread[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = useState(true)
  const [pendingHandoffs, setPendingHandoffs] = useState<any[]>([])
  const [threadReplyParent, setThreadReplyParent] = useState<ChatKitItem | null>(null)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [threadListPresence, setThreadListPresence] = useState<Record<string, string>>({})
  const [channelThreads, setChannelThreads] = useState<ChatKitThread[]>([])
  const [selectedTeamThreadType, setSelectedTeamThreadType] = useState<'channel' | 'user' | null>(null)
  const [showCreateChannelDialog, setShowCreateChannelDialog] = useState(false)
  const [showJoinChannelDialog, setShowJoinChannelDialog] = useState(false)

  const brandColors = useBrandColors()
  const user = useAuthStore(state => state.user)
  const project = useAuthStore(state => state.currentProject)
  /** Real-time pending handoffs from MessagesProvider (socket engage:session) */
  const contextPendingHandoffs = usePendingHandoffs()
  /** Merge queue (periodic API) with context (real-time socket) so handoffs show immediately */
  const mergedPendingHandoffs = useMemo(() => {
    const byId = new Map<string, any>()
    ;(pendingHandoffs || []).forEach((s: any) => byId.set(s.id, s))
    ;(contextPendingHandoffs || []).forEach((h: any) => byId.set(h.id, { ...byId.get(h.id), ...h }))
    return Array.from(byId.values())
  }, [pendingHandoffs, contextPendingHandoffs])

  // ─────────────────────────────────────────────────────────────────────────────
  // Echo Chat (AI - SSE Streaming)
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Read current module context from page-context-store (set by MainLayout on navigation)
  const currentModule = usePageContextStore((s) => s.module)
  const currentPage = usePageContextStore((s) => s.page)
  const currentEntityType = usePageContextStore((s) => s.entityType)
  const currentEntityId = usePageContextStore((s) => s.entityId)
  const currentEntityName = usePageContextStore((s) => s.entityName)

  const echoPageContext = useMemo(() => {
    if (!currentModule) return undefined
    return {
      module: currentModule,
      page: currentPage,
      entityType: currentEntityType,
      entityId: currentEntityId,
      entityName: currentEntityName,
    }
  }, [currentModule, currentPage, currentEntityType, currentEntityId, currentEntityName])

  const {
    thread: echoThread,
    messages: echoMessages,
    isLoading: echoLoading,
    isStreaming,
    streamingContent,
    activeToolCall,
    suggestionChips: echoSuggestionChips,
    error: echoError,
    sendMessage: sendEchoMessage,
    loadThread: loadEchoThread,
    createThread: createEchoThread,
    retryMessage: retryEchoMessage,
    sendFeedback: sendEchoFeedback,
    loadThreads: loadEchoThreads,
  } = useEchoChat({
    threadId: activeTab === 'echo' ? selectedEchoThreadId : null,
    skill: null,
    contextId: project?.id,
    projectId: project?.id,
    pageContext: echoPageContext,
    enabled: activeTab === 'echo',
  })
  
  // Unread badge polling for proactive messages
  const { unreadCount: echoUnread } = useEchoUnread({
    isEchoActive: activeTab === 'echo',
    enabled: true,
  })

  // Contextual help auto-send: triggered by either:
  // 1. echoContext prop (from MessagesWidget open-echo event — preferred, stays on page)
  // 2. URL ?context= param (fallback for direct /messages navigation)
  // Converts context strings like 'whats-this:crm/pipeline' into natural questions.
  const contextAutoSentRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeTab !== 'echo') return

    // Prefer prop-based context (from widget), fall back to URL param
    const contextParam = echoContext || searchParams.get('context')
    if (!contextParam || contextAutoSentRef.current === contextParam) return
    if (echoLoading) return // Wait for Echo to be ready

    contextAutoSentRef.current = contextParam

    // Parse the context type and build the auto-message
    let autoMessage: string | null = null
    if (contextParam.startsWith('whats-this:')) {
      const helpKey = contextParam.replace('whats-this:', '')
      const label = helpKey.replace(/\//g, ' > ').replace(/[-_]/g, ' ')
      autoMessage = `What is this? Explain the "${label}" element, what it does, and how to use it.`
    } else if (contextParam.startsWith('page-help:')) {
      const module = contextParam.replace('page-help:', '')
      autoMessage = `I'm on the ${module} page. What can I do here? Give me a quick overview.`
    } else if (contextParam.startsWith('search-help:')) {
      const helpKey = contextParam.replace('search-help:', '')
      const label = helpKey.replace(/\//g, ' > ').replace(/[-_]/g, ' ')
      autoMessage = `Search the help docs for information about "${label}".`
    } else if (contextParam.startsWith('error-help:')) {
      const errorMsg = contextParam.replace('error-help:', '')
      autoMessage = `I got an error: "${errorMsg}". What went wrong and how do I fix it?`
    } else if (contextParam.startsWith('contract:')) {
      const contractData = contextParam.replace('contract:', '')
      autoMessage = `I need to create a contract for this prospect. Here's their quote data:\n\n${contractData}\n\nPlease review this quote, confirm the details look correct, and help me draft a contract. Check date/time availability and include all menu items, pricing, vessel details, and standard legal terms.`
    }

    if (autoMessage) {
      // Small delay to ensure Echo is mounted and ready
      const timer = setTimeout(() => {
        sendEchoMessage(autoMessage!)
        // Notify parent that context was consumed (so widget can clear it)
        onEchoContextConsumed?.()
        // Also clean URL param if it was the source
        if (searchParams.get('context')) {
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.delete('context')
            return next
          }, { replace: true })
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [activeTab, echoContext, searchParams, echoLoading, sendEchoMessage, setSearchParams, onEchoContextConsumed])

  // Dynamic welcome context (latest insight, goals, new leads)
  const [echoWelcomeContext, setEchoWelcomeContext] = useState(null)
  useEffect(() => {
    if (activeTab !== 'echo') return
    let cancelled = false
    echoApi.getWelcomeContext().then((ctx) => {
      if (!cancelled) setEchoWelcomeContext(ctx)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [activeTab])

  // Pinned message IDs (Echo only)
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set())

  const handlePinMessage = useCallback(async (messageId: string) => {
    try {
      const result = await echoApi.togglePin(messageId)
      setPinnedMessageIds(prev => {
        const next = new Set(prev)
        if (result.is_pinned) next.add(messageId)
        else next.delete(messageId)
        return next
      })
      return result
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      return { is_pinned: false }
    }
  }, [])

  // Surface Echo errors in UI (toast + inline in ChatArea)
  useEffect(() => {
    if (activeTab === 'echo' && echoError) {
      toast.error(echoError.message || 'Echo error')
    }
  }, [activeTab, echoError])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Team Chat (Human - ChatKit WebSocket)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const {
    thread: portalThread,
    messages: portalMessages,
    isLoading: portalLoading,
    typingUsers: portalTypingUsers,
    isConnected: portalConnected,
    error: portalError,
    sendMessage: sendPortalMessage,
    loadThread: loadPortalThread,
    createThread: createPortalThread,
    markAsRead,
    startTyping,
    stopTyping,
    updateMessage: updatePortalMessage,
    addReaction: addPortalReaction,
    removeReaction: removePortalReaction,
    loadReplies: loadPortalReplies,
    repliesFor: portalRepliesFor,
    presenceFor: portalPresenceFor,
    setPresenceDnd,
    retryMessage: retryPortalMessage,
  } = usePortalChat({
    threadId: activeTab === 'user' ? selectedPortalThreadId : null,
    recipientUserId: pendingRecipientId,
    threadType: activeTab === 'user' ? (selectedTeamThreadType === 'channel' ? 'channel' : 'user') : 'user',
    projectId: project?.id,
    enabled: activeTab === 'user',
    currentUserId: user?.id ?? null,
  })
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Live Chat (Visitor - Engage API + Socket)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const {
    thread: engageThread,
    messages: engageMessages,
    isLoading: engageLoading,
    typingUsers: engageTypingUsers,
    isConnected: engageConnected,
    error: engageError,
    sendMessage: sendEngageMessage,
    loadThread: loadEngageThread,
    setAgentTyping: setEngageAgentTyping,
    retrySend: retryEngageSend,
    lastFailedMessageId: engageFailedMessageId,
    sessionDetails: engageSessionDetails,
  } = useEngageLiveChat({
    sessionId: activeTab === 'visitor' ? selectedPortalThreadId : null,
    projectId: project?.id ?? null,
    orgId: project?.org_id ?? null,
    enabled: activeTab === 'visitor',
  })

  // Canned responses for Live tab
  const [cannedResponses, setCannedResponses] = useState<Array<{ id: string; title?: string; body: string }>>([])
  useEffect(() => {
    if (activeTab !== 'visitor') {
      setCannedResponses([])
      return
    }
    const load = async () => {
      try {
        const res = await engageApi.getCannedResponses()
        const data = res?.data ?? res ?? {}
        const list = Array.isArray(data) ? data : data?.data ?? []
        setCannedResponses(
          list.map((r: { id: string; title?: string; body: string; shortcut?: string }) => ({
            id: r.id,
            title: r.title ?? r.shortcut,
            body: r.body ?? '',
          }))
        )
      } catch {
        setCannedResponses([])
      }
    }
    load()
  }, [activeTab])

  // Load replies when thread-reply drawer opens (Phase 2.6)
  useEffect(() => {
    if (!threadReplyParent?.id || activeTab !== 'user') return
    let cancelled = false
    setLoadingReplies(true)
    loadPortalReplies(threadReplyParent.id)
      .then(() => { if (!cancelled) setLoadingReplies(false) })
      .catch(() => { if (!cancelled) setLoadingReplies(false) })
    return () => { cancelled = true }
  }, [threadReplyParent?.id, activeTab, loadPortalReplies])

  // Contacts for @mentions (Team tab)
  const [mentionContacts, setMentionContacts] = useState<Array<{ id: string; name?: string; email?: string }>>([])
  useEffect(() => {
    if (activeTab !== 'user') {
      setMentionContacts([])
      return
    }
    const load = async () => {
      try {
        const res = await messagesApi.getContacts()
        const data = res?.data || res || {}
        const list = data.contacts || data.data?.contacts || []
        const portalUsers = (Array.isArray(list) ? list : []).filter(
          (c: Contact) => c.id !== user?.id && !c.is_ai && c.contact_type !== 'ai'
        )
        // Prepend Echo for @Echo in Team chat (backend detects @Echo and posts Echo reply)
        const withEcho = [{ id: 'echo', name: 'Echo' }, ...portalUsers.map((c: Contact) => ({ id: c.id, name: c.name, email: c.email }))]
        setMentionContacts(withEcho)
      } catch {
        setMentionContacts([])
      }
    }
    load()
  }, [activeTab, user?.id])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Load Thread Lists
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Load Echo threads
  useEffect(() => {
    if (activeTab !== 'echo') return
    
    const load = async () => {
      setIsLoadingThreads(true)
      try {
        const threads = await loadEchoThreads()
        setEchoThreads(threads)
      } catch (err) {
        console.error('Failed to load Echo threads:', err)
      } finally {
        setIsLoadingThreads(false)
      }
    }
    
    load()
  }, [activeTab, loadEchoThreads])
  
  // Load Portal threads (Team = ChatKit, Live = Engage sessions)
  useEffect(() => {
    if (activeTab === 'echo') return
    
    const load = async () => {
      setIsLoadingThreads(true)
      try {
        if (activeTab === 'visitor') {
          const response = await engageApi.getChatSessions({ projectId: project?.id })
          const data = response?.data ?? response ?? {}
          const rawSessions = Array.isArray(data) ? data : (data?.data ?? [])
          // Hide AI-phase sessions — visitors still chatting with Echo shouldn't appear here
          const sessions = rawSessions.filter((s: any) => s.status !== 'ai')
          const formatted: ChatKitThread[] = sessions.map((s: any) => ({
            thread_id: s.id,
            user_id: '',
            org_id: s.org_id,
            project_id: s.project_id,
            thread_type: 'visitor',
            title: s.visitor_name || s.visitor_email || 'Visitor',
            last_message_at: s.last_message_at ?? s.updated_at,
            unread_count: 0,
            status: s.status === 'closed' ? 'closed' : 'active',
            visitor_id: s.visitor_id,
            created_at: s.created_at ?? '',
            updated_at: s.updated_at,
            recipient: s.visitor_name ? { id: s.visitor_id, email: s.visitor_email ?? '', full_name: s.visitor_name } : undefined,
            last_message_preview: s.messages?.length ? String(s.messages[s.messages.length - 1]?.content ?? '').slice(0, 80) : undefined,
          }))
          setPortalThreads(formatted)
        } else {
          const [userRes, channelsRes] = await Promise.all([
            chatkitApi.getThreads({ thread_type: 'user' }),
            chatkitApi.listChannels({ limit: 100 }),
          ])
          const userData = userRes?.data || userRes || {}
          const userThreads = userData.data || []
          const userFormatted: ChatKitThread[] = userThreads.map((t: any) => ({
            thread_id: t.thread_id || t.id,
            title: t.title || t.recipient?.name || 'Conversation',
            thread_type: t.thread_type || 'user',
            recipient: t.recipient,
            recipient_user_id: t.recipient_user_id,
            metadata: t.metadata,
            last_item_at: t.last_item_at || t.updated_at,
            last_message: t.last_message || t.last_item?.content,
            created_at: t.created_at,
            updated_at: t.updated_at,
            unread_count: t.unread_count ?? 0,
            is_pinned: t.is_pinned ?? false,
          }))
          setPortalThreads(userFormatted)
          const chData = channelsRes?.data || channelsRes || {}
          const chList = chData.data || []
          const chFormatted: ChatKitThread[] = chList.map((t: any) => ({
            thread_id: t.thread_id || t.id,
            title: t.title || 'Channel',
            thread_type: 'channel',
            recipient: t.recipient,
            recipient_user_id: t.recipient_user_id,
            metadata: t.metadata,
            last_item_at: t.last_item_at || t.updated_at,
            last_message: t.last_message || t.last_item?.content,
            created_at: t.created_at,
            updated_at: t.updated_at,
            unread_count: t.unread_count ?? 0,
            is_pinned: t.is_pinned ?? false,
          }))
          setChannelThreads(chFormatted)
        }
      } catch (err) {
        console.error('Failed to load Portal threads:', err)
        setPortalThreads([])
        if (activeTab === 'user') setChannelThreads([])
      } finally {
        setIsLoadingThreads(false)
      }
    }
    
    load()
  }, [activeTab, project?.id])

  // Sync selectedTeamThreadType from selected thread (Phase 2.9; incl. URL load)
  useEffect(() => {
    if (activeTab !== 'user' || !selectedPortalThreadId) return
    const id = selectedPortalThreadId
    if (channelThreads.some((t) => (t.thread_id || (t as { id?: string }).id) === id)) {
      setSelectedTeamThreadType('channel')
      return
    }
    if (portalThreads.some((t) => (t.thread_id || (t as { id?: string }).id) === id)) {
      setSelectedTeamThreadType('user')
    }
  }, [activeTab, selectedPortalThreadId, channelThreads, portalThreads])

  // Fetch presence for Team thread list recipients (Phase 2.10; DMs only)
  useEffect(() => {
    if (activeTab !== 'user' || !portalThreads.length) return
    const ids = [...new Set(portalThreads.map((t) => t.recipient_user_id ?? t.recipient?.id).filter(Boolean))] as string[]
    if (!ids.length) return
    let cancelled = false
    chatkitApi.getPresence(ids).then((res) => {
      if (cancelled) return
      const body = res?.data ?? res
      const map = (typeof body === 'object' && body !== null && body.data) ? body.data as Record<string, string> : {}
      setThreadListPresence(map)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [activeTab, portalThreads])

  // Refresh Team thread list (e.g. after creating a new DM)
  const refreshPortalThreads = useCallback(async () => {
    if (activeTab !== 'user') return
    try {
      const response = await chatkitApi.getThreads({ thread_type: 'user' })
      const data = response?.data || response || {}
      const threads = data.data || []
      const formatted: ChatKitThread[] = threads.map((t: any) => ({
        thread_id: t.thread_id || t.id,
        title: t.title || t.recipient?.name || 'Conversation',
        thread_type: t.thread_type,
        recipient: t.recipient,
        recipient_user_id: t.recipient_user_id,
        metadata: t.metadata,
        last_item_at: t.last_item_at || t.updated_at,
        last_message: t.last_message || t.last_item?.content,
        created_at: t.created_at,
        updated_at: t.updated_at,
        unread_count: t.unread_count ?? 0,
        is_pinned: t.is_pinned ?? false,
      }))
      setPortalThreads(formatted)
    } catch (err) {
      console.error('Failed to refresh Team threads:', err)
    }
  }, [activeTab])
  
  // When user selects a contact in New DM: create thread and open it
  useEffect(() => {
    if (activeTab !== 'user' || !pendingRecipientId || selectedPortalThreadId) return
    let cancelled = false
    createPortalThread(pendingRecipientId)
      .then((threadId) => {
        if (cancelled) return
        setSelectedPortalThreadId(threadId)
        setSelectedTeamThreadType('user')
        setPendingRecipientId(null)
        updateUrl('user', null, threadId)
        refreshPortalThreads()
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to create Team thread:', err)
          setPendingRecipientId(null)
        }
      })
    return () => { cancelled = true }
  }, [activeTab, pendingRecipientId, selectedPortalThreadId, createPortalThread, updateUrl, refreshPortalThreads])
  
  // Load pending handoffs when on Live tab
  useEffect(() => {
    if (activeTab !== 'visitor' || !project?.id) return
    const load = async () => {
      try {
        const res = await portalApi.get('/engage/chat/queue', { params: { projectId: project?.id } })
        const data = res?.data ?? res
        const queue = Array.isArray(data) ? data : data?.data ?? []
        setPendingHandoffs(Array.isArray(queue) ? queue : [])
      } catch {
        setPendingHandoffs([])
      }
    }
    load()
    const interval = setInterval(load, 60_000) // 60s – reduce auth/API load
    return () => clearInterval(interval)
  }, [activeTab, project?.id])

  // Refresh Live session list when window regains focus
  const refreshLiveSessions = useCallback(async () => {
    if (activeTab !== 'visitor' || !project?.id) return
    try {
      const response = await engageApi.getChatSessions({ projectId: project.id })
      const data = response?.data ?? response ?? {}
      const rawSessions = Array.isArray(data) ? data : (data?.data ?? [])
      const sessions = rawSessions.filter((s: any) => s.status !== 'ai')
      const formatted: ChatKitThread[] = sessions.map((s: any) => ({
        thread_id: s.id,
        user_id: '',
        org_id: s.org_id,
        project_id: s.project_id,
        thread_type: 'visitor',
        title: s.visitor_name || s.visitor_email || 'Visitor',
        last_message_at: s.last_message_at ?? s.updated_at,
        unread_count: 0,
        status: s.status === 'closed' ? 'closed' : 'active',
        visitor_id: s.visitor_id,
        created_at: s.created_at ?? '',
        updated_at: s.updated_at,
        recipient: s.visitor_name ? { id: s.visitor_id, email: s.visitor_email ?? '', full_name: s.visitor_name } : undefined,
        last_message_preview: s.messages?.length ? String(s.messages[s.messages.length - 1]?.content ?? '').slice(0, 80) : undefined,
      }))
      setPortalThreads(formatted)
    } catch (err) {
      console.error('Failed to refresh Live sessions:', err)
    }
  }, [activeTab, project?.id])
  useEffect(() => {
    if (activeTab !== 'visitor') return
    const onFocus = () => refreshLiveSessions()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [activeTab, refreshLiveSessions])
  
  // Refresh channel threads list
  const refreshChannelThreads = useCallback(async () => {
    if (activeTab !== 'user') return
    try {
      const response = await chatkitApi.listChannels({ limit: 100 })
      const data = response?.data || response || {}
      const channels = data.data || []
      const formatted: ChatKitThread[] = channels.map((t: any) => ({
        thread_id: t.thread_id || t.id,
        title: t.title || 'Channel',
        thread_type: 'channel',
        recipient: t.recipient,
        recipient_user_id: t.recipient_user_id,
        metadata: t.metadata,
        last_item_at: t.last_item_at || t.updated_at,
        last_message: t.last_message || t.last_item?.content,
        created_at: t.created_at,
        updated_at: t.updated_at,
        unread_count: t.unread_count ?? 0,
        is_pinned: t.is_pinned ?? false,
      }))
      setChannelThreads(formatted)
    } catch (err) {
      console.error('Failed to refresh channel threads:', err)
    }
  }, [activeTab])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSelectEchoThread = useCallback((thread: ChatKitThread) => {
    const id = thread.thread_id || (thread as { id?: string }).id || null
    setSelectedEchoThreadId(id)
    updateUrl('echo', id, null)
    onThreadChange?.(thread)
  }, [onThreadChange, updateUrl])
  
  const handleSelectPortalThread = useCallback((thread: ChatKitThread) => {
    const id = thread.thread_id || (thread as { id?: string }).id || null
    setSelectedPortalThreadId(id)
    setPendingRecipientId(null)
    const typ = thread.thread_type === 'channel' ? 'channel' : 'user'
    setSelectedTeamThreadType(typ)
    updateUrl(activeTab, selectedEchoThreadId, id)
    onThreadChange?.(thread)
  }, [onThreadChange, updateUrl, activeTab, selectedEchoThreadId])
  
  const handleNewEchoThread = useCallback(async () => {
    try {
      const newThreadId = await createEchoThread()
      setSelectedEchoThreadId(newThreadId)
      updateUrl('echo', newThreadId, null)
    } catch (err) {
      console.error('Failed to create Echo thread:', err)
    }
  }, [createEchoThread, updateUrl])
  
  const handleNewPortalThread = useCallback(() => {
    setShowNewDMDialog(true)
  }, [])
  
  const handleStartDM = useCallback(async (contact: Contact) => {
    setPendingRecipientId(contact.id)
    setSelectedPortalThreadId(null)
    setSelectedTeamThreadType(null)
    setActiveTab('user')
  }, [])

  const handleCreateChannelSuccess = useCallback(async (threadId: string) => {
    await refreshChannelThreads()
    setSelectedPortalThreadId(threadId)
    setSelectedTeamThreadType('channel')
    updateUrl('user', null, threadId)
    toast.success('Channel created')
  }, [refreshChannelThreads, updateUrl])

  const handleJoinChannelSuccess = useCallback(async (threadId: string) => {
    await refreshChannelThreads()
    setSelectedPortalThreadId(threadId)
    setSelectedTeamThreadType('channel')
    updateUrl('user', null, threadId)
    toast.success('Joined channel')
  }, [refreshChannelThreads, updateUrl])

  const handleQuickSwitcherSelectThread = useCallback((thread: ChatKitThread) => {
    const tid = thread.thread_id || (thread as { id?: string }).id
    if (!tid) return
    if (activeTab === 'echo') {
      setSelectedEchoThreadId(tid)
      updateUrl('echo', tid, null)
    } else {
      setSelectedPortalThreadId(tid)
      if (activeTab === 'user') setSelectedTeamThreadType(thread.thread_type === 'channel' ? 'channel' : 'user')
      updateUrl(activeTab, null, tid)
    }
  }, [activeTab, updateUrl])
  
  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    if (activeTab === 'echo') {
      await sendEchoMessage(content, files)
      const threads = await loadEchoThreads()
      setEchoThreads(threads)
    } else if (activeTab === 'visitor') {
      await sendEngageMessage(content, files)
    } else {
      await sendPortalMessage(content)
      setPendingRecipientId(null)
    }
  }, [activeTab, sendEchoMessage, sendEngageMessage, sendPortalMessage, loadEchoThreads])

  const handleReplyInThread = useCallback((messageId: string) => {
    const m = portalMessages.find((msg) => msg.id === messageId)
    if (m) setThreadReplyParent(m)
  }, [portalMessages])

  const handleSendReply = useCallback(async (content: string, parentId: string) => {
    await sendPortalMessage(content, parentId)
  }, [sendPortalMessage])

  const handleCloseLiveSession = useCallback(async () => {
    if (activeTab !== 'visitor' || !selectedPortalThreadId) return
    try {
      await engageApi.closeChatSession(selectedPortalThreadId)
      toast.success('Chat closed')
      setSelectedPortalThreadId(null)
      refreshLiveSessions()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to close chat')
    }
  }, [activeTab, selectedPortalThreadId, refreshLiveSessions])
  
  const handlePromptClick = useCallback((prompt: string) => {
    handleSendMessage(prompt)
  }, [handleSendMessage])
  
  // Edit message handler
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (activeTab === 'echo') {
      // Echo messages can't be edited
      return
    }
    
    try {
      await messagesApi.editMessage(messageId, { content: newContent })
      // Update local state (the websocket will also broadcast the update)
      updatePortalMessage(messageId, { 
        content: newContent, 
        edited_at: new Date().toISOString() 
      })
    } catch (err) {
      console.error('Failed to edit message:', err)
      throw err // Re-throw so MessageBubble can show error state
    }
  }, [activeTab, updatePortalMessage])
  
  // Delete message handler
  const handleDeleteMessage = useCallback(async (messageId: string, forEveryone: boolean = false) => {
    if (activeTab === 'echo') {
      // Echo messages can't be deleted
      return
    }
    
    try {
      await messagesApi.deleteMessage(messageId, forEveryone)
      // Update local state
      updatePortalMessage(messageId, { 
        deleted_at: new Date().toISOString() 
      })
    } catch (err) {
      console.error('Failed to delete message:', err)
      throw err // Re-throw so MessageBubble can show error state
    }
  }, [activeTab, updatePortalMessage])
  
  // Stable thread id for list items (ChatKit uses thread_id; some APIs may return id)
  const threadListId = useCallback((t: ChatKitThread) => t.thread_id || (t as { id?: string }).id || '', [])
  
  // Pin thread handler
  const handlePinThread = useCallback(async (threadId: string, pinned: boolean) => {
    const upd = (t: ChatKitThread) => (threadListId(t) === threadId ? { ...t, is_pinned: pinned } : t)
    if (activeTab === 'echo') {
      // Echo has no conversation-level pin API; use local-only (lost on refresh)
      setEchoThreads(prev => prev.map(upd))
      return
    }
    try {
      await chatkitApi.pinThread(threadId, pinned)
      if (activeTab === 'user') {
        const inCh = channelThreads.some(t => threadListId(t) === threadId)
        if (inCh) setChannelThreads(prev => prev.map(upd))
        else setPortalThreads(prev => prev.map(upd))
      } else {
        setPortalThreads(prev => prev.map(upd))
      }
    } catch (err) {
      console.error('Failed to pin thread:', err)
      throw err
    }
  }, [activeTab, threadListId, channelThreads])

  // Mute thread handler (Phase 3.4.1)
  const handleMuteThread = useCallback(async (threadId: string, muted: boolean) => {
    const upd = (t: ChatKitThread) => (threadListId(t) === threadId ? { ...t, is_muted: muted } as ChatKitThread : t)
    if (activeTab === 'echo') {
      // Echo has no mute API; use local-only (lost on refresh)
      setEchoThreads(prev => prev.map(upd))
      return
    }
    try {
      if (muted) {
        await chatkitApi.muteThread(threadId)
      } else {
        await chatkitApi.unmuteThread(threadId)
      }
      if (activeTab === 'user') {
        const inCh = channelThreads.some(t => threadListId(t) === threadId)
        if (inCh) setChannelThreads(prev => prev.map(upd))
        else setPortalThreads(prev => prev.map(upd))
      } else {
        setPortalThreads(prev => prev.map(upd))
      }
    } catch (err) {
      console.error('Failed to mute thread:', err)
      throw err
    }
  }, [activeTab, threadListId, channelThreads])
  
  // Delete thread handler
  const handleDeleteThread = useCallback(async (threadId: string) => {
    if (activeTab === 'echo') {
      try {
        await echoApi.closeConversation(threadId)
        setEchoThreads(prev => prev.filter(t => threadListId(t) !== threadId))
        if (selectedEchoThreadId === threadId) setSelectedEchoThreadId(null)
      } catch (err) {
        console.error('Failed to close Echo conversation:', err)
        throw err
      }
      return
    }
    try {
      await chatkitApi.deleteThread(threadId)
      if (activeTab === 'user') {
        const inCh = channelThreads.some(t => threadListId(t) === threadId)
        if (inCh) {
          setChannelThreads(prev => prev.filter(t => threadListId(t) !== threadId))
        } else {
          setPortalThreads(prev => prev.filter(t => threadListId(t) !== threadId))
        }
        if (selectedPortalThreadId === threadId) {
          setSelectedPortalThreadId(null)
          setSelectedTeamThreadType(null)
        }
      } else {
        setPortalThreads(prev => prev.filter(t => threadListId(t) !== threadId))
        if (selectedPortalThreadId === threadId) setSelectedPortalThreadId(null)
      }
    } catch (err) {
      console.error('Failed to delete thread:', err)
      throw err
    }
  }, [activeTab, selectedEchoThreadId, selectedPortalThreadId, threadListId, channelThreads])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────────
  
  const currentThread = activeTab === 'echo' ? echoThread : activeTab === 'visitor' ? engageThread : portalThread
  const currentMessages = activeTab === 'echo' ? echoMessages : activeTab === 'visitor' ? engageMessages : portalMessages
  const currentLoading = activeTab === 'echo' ? echoLoading : activeTab === 'visitor' ? engageLoading : portalLoading
  const currentThreads = activeTab === 'echo' ? echoThreads : portalThreads
  const selectedThreadId = activeTab === 'echo' ? selectedEchoThreadId : selectedPortalThreadId
  const typingUsers = activeTab === 'visitor' ? engageTypingUsers : portalTypingUsers
  const isConnected = activeTab === 'visitor' ? engageConnected : portalConnected
  const portalOrEngageError = activeTab === 'visitor' ? engageError : portalError
  
  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!searchQuery) return currentThreads
    const query = searchQuery.toLowerCase()
    return currentThreads.filter(thread => {
      const title = thread.title?.toLowerCase() || ''
      const recipientName = thread.recipient?.full_name?.toLowerCase() || ''
      return title.includes(query) || recipientName.includes(query)
    })
  }, [currentThreads, searchQuery])

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channelThreads
    const q = searchQuery.toLowerCase()
    return channelThreads.filter((t) => (t.title?.toLowerCase() || '').includes(q))
  }, [channelThreads, searchQuery])

  const filteredDMs = useMemo(() => {
    if (!searchQuery) return portalThreads
    const q = searchQuery.toLowerCase()
    return portalThreads.filter((t) => {
      const title = t.title?.toLowerCase() || ''
      const recipient = t.recipient?.full_name?.toLowerCase() || ''
      return title.includes(q) || recipient.includes(q)
    })
  }, [portalThreads, searchQuery])

  // Combined presence (Phase 2.10): prefer live from portal, else list fetch
  const presenceFor = useCallback((userId: string) => {
    const live = activeTab === 'user' ? portalPresenceFor(userId) : 'offline'
    if (live !== 'offline') return live
    return threadListPresence[userId] ?? 'offline'
  }, [activeTab, portalPresenceFor, threadListPresence])
  
  // Module-specific Echo prompts — shown when user is on a specific module page
  const MODULE_PROMPTS: Record<string, { greeting: string; description: string; prompts: Array<{ label: string; prompt: string; icon?: string }> }> = {
    crm: {
      greeting: 'Echo / CRM',
      description: 'Ask me anything about your CRM data.',
      prompts: [
        { label: 'Follow-ups due', prompt: 'Which contacts need follow-up today?', icon: 'users' },
        { label: 'Pipeline status', prompt: 'Give me a pipeline overview', icon: 'chart' },
        { label: 'Draft email', prompt: 'Draft a follow-up email for this contact', icon: 'write' },
      ],
    },
    seo: {
      greeting: 'Echo / SEO',
      description: 'Ask me anything about your SEO performance.',
      prompts: [
        { label: 'Quick wins', prompt: 'What are the top SEO quick wins right now?', icon: 'search' },
        { label: 'Content gaps', prompt: 'Identify content gaps on our pages', icon: 'write' },
        { label: 'Rankings overview', prompt: 'How are our keyword rankings trending?', icon: 'trending' },
      ],
    },
    analytics: {
      greeting: 'Echo / Analytics',
      description: 'Ask me anything about your site performance.',
      prompts: [
        { label: 'Traffic trends', prompt: 'What are the traffic trends this week?', icon: 'trending' },
        { label: 'Top pages', prompt: 'Show me the top performing pages', icon: 'chart' },
        { label: 'Conversion analysis', prompt: 'Analyze our conversion rates', icon: 'search' },
      ],
    },
    blog: {
      greeting: 'Echo / Blog',
      description: 'Ask me anything about your blog and content.',
      prompts: [
        { label: 'Content ideas', prompt: 'Suggest blog topics based on our keywords', icon: 'write' },
        { label: 'Draft a post', prompt: 'Help me write a blog post', icon: 'file' },
        { label: 'Performance', prompt: 'Which blog posts are performing best?', icon: 'trending' },
      ],
    },
    commerce: {
      greeting: 'Echo / Commerce',
      description: 'Ask me anything about your products and sales.',
      prompts: [
        { label: 'Sales overview', prompt: 'How are sales performing this month?', icon: 'chart' },
        { label: 'Product descriptions', prompt: 'Help me write product descriptions', icon: 'write' },
      ],
    },
    reputation: {
      greeting: 'Echo / Reputation',
      description: 'Ask me anything about your reviews and reputation.',
      prompts: [
        { label: 'New reviews', prompt: 'Show me recent reviews that need responses', icon: 'message' },
        { label: 'Draft responses', prompt: 'Help me draft review responses', icon: 'write' },
      ],
    },
    broadcast: {
      greeting: 'Echo / Broadcast',
      description: 'Ask me anything about your email campaigns.',
      prompts: [
        { label: 'Campaign ideas', prompt: 'Suggest email campaign ideas', icon: 'write' },
        { label: 'Performance', prompt: 'How did my last campaign perform?', icon: 'chart' },
      ],
    },
  }

  // Welcome screen config — adapts to current module context
  const welcomeConfig = useMemo(() => {
    if (activeTab === 'echo') {
      // If user is on a specific module, show module-specific prompts
      if (currentModule && MODULE_PROMPTS[currentModule]) {
        return MODULE_PROMPTS[currentModule]
      }
      // Default Echo prompts
      return {
        greeting: "Hi! I'm Echo, your AI assistant.",
        description: "Ask me anything about your business. Analytics, leads, SEO, content, and more.",
        prompts: [
          { label: "Today's schedule", prompt: "What's on my schedule today?", icon: 'calendar' },
          { label: 'Which leads need attention?', prompt: 'Show me my high-priority leads that need follow-up', icon: 'users' },
          { label: 'How did this week go?', prompt: 'How did our landing pages perform this week?', icon: 'chart' },
          { label: 'Any new leads?', prompt: 'Show me any new leads from the last 24 hours', icon: 'trending' },
        ],
      }
    }
    if (activeTab === 'user') {
      return {
        greeting: 'Start a conversation',
        description: 'Send a message to someone on your team.',
        prompts: [],
      }
    }
    return {
      greeting: 'Live Chat',
      description: 'Waiting for visitors to connect...',
      prompts: [],
    }
  }, [activeTab, currentModule])
  
  const isWidget = variant === 'widget'
  const showListView = isWidget && !selectedThreadId

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  
  return (
    <div
      className={cn("flex h-full", className)}
      data-messages
      role="region"
      aria-label="Messages"
    >
      {/* Thread List Sidebar (full width in widget when no thread selected) */}
      <div className={cn(
        "flex flex-col border-r border-[var(--glass-border)]/50 bg-[rgba(0,0,0,0.25)] dark:bg-[rgba(0,0,0,0.35)] backdrop-blur-xl",
        isWidget ? "w-full" : "w-80 flex-shrink-0",
        !showListView && isWidget && "hidden"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--glass-border)]/30">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" style={{ color: brandColors.primary }} />
            Messages
          </h2>
          
          {/* Tabs */}
          {!hideTabs && (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                const newTab = v as ThreadType
                setActiveTab(newTab)
                const echoId = newTab === 'echo' ? selectedEchoThreadId : null
                const portalId = newTab !== 'echo' ? selectedPortalThreadId : null
                updateUrl(newTab, echoId, portalId)
              }}
              className="w-full"
            >
              <TabsList className="w-full bg-[var(--surface-secondary)]">
                <TabsTrigger value="echo" className="flex-1 gap-1.5 text-xs relative">
                  <SignalIcon className="h-3.5 w-3.5" />
                  Echo
                  {echoUnread > 0 && activeTab !== 'echo' && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold px-1">
                      {echoUnread > 99 ? '99+' : echoUnread}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="user" className="flex-1 gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="visitor" className="flex-1 gap-1.5 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  Live
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-[var(--surface-secondary)] border-[var(--glass-border)]/50"
            />
          </div>

          {/* DND toggle (Phase 3.4.2, Team tab) */}
          {activeTab === 'user' && user?.id && setPresenceDnd && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-secondary)]/50 px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Moon className="h-3.5 w-3.5" />
                Do not disturb
              </span>
              <Switch
                checked={presenceFor(user.id) === 'dnd'}
                onCheckedChange={setPresenceDnd}
                aria-label="Toggle Do not disturb"
              />
            </div>
          )}
        </div>
        
        {/* Pending handoffs banner (Live tab) — merged queue + real-time socket */}
        {activeTab === 'visitor' && mergedPendingHandoffs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const first = mergedPendingHandoffs[0]
              if (first?.id) {
                setSelectedPortalThreadId(first.id)
                updateUrl('visitor', null, first.id)
              }
            }}
            className="mx-3 mb-2 w-[calc(100%-24px)] p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-left hover:bg-amber-500/15 transition-colors"
          >
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {mergedPendingHandoffs.length} waiting for agent — click to open first
            </p>
          </button>
        )}

        {/* Search results (Phase 3.3.1) */}
        {searchQuery.trim() && (
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <UptradeSpinner size="sm" className="[&_svg]:text-[var(--text-tertiary)]" />
              </div>
            ) : searchResults ? (
              <div className="space-y-3">
                {(searchResults.threads?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Threads</p>
                    <div className="space-y-1">
                      {searchResults.threads?.map((t: { thread_id: string; title?: string }) => (
                        <button
                          key={t.thread_id}
                          type="button"
                          onClick={() => {
                            if (activeTab === 'echo') {
                              setSelectedEchoThreadId(t.thread_id)
                              setActiveTab('echo')
                            } else {
                              setSelectedPortalThreadId(t.thread_id)
                            }
                            setSearchQuery('')
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--surface-secondary)] text-sm text-[var(--text-primary)] truncate"
                        >
                          {t.title || 'Untitled'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(searchResults.messages?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Messages</p>
                    <div className="space-y-1">
                      {searchResults.messages?.map((m: { item_id: string; thread_id: string; content: string; thread_title?: string }) => (
                        <button
                          key={m.item_id}
                          type="button"
                          onClick={() => {
                            if (activeTab === 'echo') {
                              setSelectedEchoThreadId(m.thread_id)
                              setActiveTab('echo')
                            } else {
                              setSelectedPortalThreadId(m.thread_id)
                            }
                            setSearchQuery('')
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--surface-secondary)]"
                        >
                          <p className="text-xs text-[var(--text-tertiary)]">{m.thread_title || 'Thread'}</p>
                          <p className="text-sm text-[var(--text-primary)] truncate">{m.content}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(searchResults.threads?.length ?? 0) === 0 && (searchResults.messages?.length ?? 0) === 0 && (
                  <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No results found</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No results found</p>
            )}
          </div>
        )}
        
        {/* New Thread Button (Echo or Team DM) */}
        {activeTab !== 'visitor' && !searchQuery.trim() && (
          <div className="p-3">
            <Button
              variant="default"
              size="default"
              onClick={activeTab === 'echo' ? handleNewEchoThread : handleNewPortalThread}
              className="w-full justify-start gap-2 h-10"
              style={{ 
                backgroundColor: brandColors.primary,
                color: 'white',
              }}
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'echo' ? 'New Echo Chat' : 'New Message'}
            </Button>
          </div>
        )}

        {/* Channels (Phase 2.9, Team tab) - hidden during search */}
        {activeTab === 'user' && !searchQuery.trim() && (
          <div className="px-3 pb-2 border-b border-[var(--glass-border)]/30">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Channels</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowCreateChannelDialog(true)}>
                  <Hash className="h-3.5 w-3.5 mr-1" /> Create
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowJoinChannelDialog(true)}>
                  <LogIn className="h-3.5 w-3.5 mr-1" /> Join
                </Button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {isLoadingThreads ? (
                <div className="flex items-center justify-center py-4">
                  <UptradeSpinner size="sm" className="[&_svg]:text-[var(--text-tertiary)]" />
                </div>
              ) : filteredChannels.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] py-2">No channels yet</p>
              ) : (
                filteredChannels.map((ch) => {
                  const id = ch.thread_id || (ch as { id?: string }).id || ''
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectPortalThread(ch)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors',
                        selectedPortalThreadId === id && selectedTeamThreadType === 'channel'
                          ? 'bg-[color-mix(in_srgb,var(--brand-primary)_15%,transparent)] text-[var(--text-primary)]'
                          : 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                      )}
                    >
                      <Hash className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                      <span className="truncate flex-1">{ch.title || 'Channel'}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Direct messages header (Team tab) - hidden during search */}
        {activeTab === 'user' && !searchQuery.trim() && (
          <div className="px-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Direct messages</span>
          </div>
        )}
        
        {/* Thread List - hidden during search */}
        {!searchQuery.trim() && (
        <div className="flex-1 overflow-hidden">
          <ThreadList
            threads={activeTab === 'user' ? filteredDMs : filteredThreads}
            selectedThreadId={activeTab === 'user' ? (selectedTeamThreadType === 'user' ? selectedPortalThreadId : null) : selectedThreadId}
            onSelectThread={activeTab === 'echo' ? handleSelectEchoThread : handleSelectPortalThread}
            onNewThread={activeTab === 'echo' ? handleNewEchoThread : handleNewPortalThread}
            threadType={activeTab}
            isLoading={isLoadingThreads}
            onPinThread={handlePinThread}
            onDeleteThread={handleDeleteThread}
            onMuteThread={handleMuteThread}
            presenceFor={activeTab === 'user' ? presenceFor : undefined}
            onSearch={activeTab === 'echo' ? (q) => echoApi.searchConversations(q) : undefined}
            onSearchResultClick={activeTab === 'echo' ? (convId) => { setSelectedEchoThreadId(convId); loadEchoThread(convId) } : undefined}
          />
        </div>
        )}
      </div>
      
      {/* Chat Area (in widget mode: full width when thread selected, with back) */}
      <div className={cn(
        "flex flex-col min-w-0 bg-[var(--glass-bg)] backdrop-blur-lg",
        isWidget ? "w-full" : "flex-1",
        isWidget && showListView && "hidden"
      )}>
        {isWidget && selectedThreadId && (
          <div className="flex items-center gap-2 p-2 border-b border-[var(--glass-border)]/30 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                if (activeTab === 'echo') setSelectedEchoThreadId(null)
                else setSelectedPortalThreadId(null)
                updateUrl(activeTab, activeTab === 'echo' ? null : selectedEchoThreadId, activeTab !== 'echo' ? null : selectedPortalThreadId)
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1 min-w-0">
              {currentThread?.title ?? currentThread?.last_message_preview ?? 'Chat'}
            </span>
            {activeTab === 'visitor' && selectedPortalThreadId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0"
                onClick={handleCloseLiveSession}
              >
                Close chat
              </Button>
            )}
          </div>
        )}
        <ChatArea
          thread={currentThread}
          messages={currentMessages}
          isLoading={currentLoading}
          currentUserId={user?.id || ''}
          threadType={activeTab}
          isStreaming={activeTab === 'echo' ? isStreaming : false}
          streamingContent={activeTab === 'echo' ? streamingContent : ''}
          toolCallLabel={activeTab === 'echo' ? activeToolCall?.label ?? null : null}
          suggestionChips={activeTab === 'echo' ? echoSuggestionChips : []}
          echoWelcomeContext={activeTab === 'echo' ? echoWelcomeContext : undefined}
          typingUsers={activeTab !== 'echo' ? typingUsers : []}
          onSendMessage={handleSendMessage}
          onPromptClick={handlePromptClick}
          onFeedback={activeTab === 'echo' ? sendEchoFeedback : undefined}
          onRetry={
            activeTab === 'echo'
              ? retryEchoMessage
              : activeTab === 'visitor' && engageFailedMessageId
                ? (messageId) => { if (messageId === engageFailedMessageId) retryEngageSend() }
                : activeTab === 'user' && retryPortalMessage
                  ? retryPortalMessage
                  : undefined
          }
          onEdit={activeTab !== 'echo' ? handleEditMessage : undefined}
          onDelete={activeTab !== 'echo' ? handleDeleteMessage : undefined}
          onAgentTyping={activeTab === 'visitor' && selectedPortalThreadId ? (isTyping) => setEngageAgentTyping(selectedPortalThreadId, isTyping) : undefined}
          onCloseSession={activeTab === 'visitor' ? handleCloseLiveSession : undefined}
          canCloseSession={activeTab === 'visitor' && !!selectedPortalThreadId}
          visitorContext={activeTab === 'visitor' && engageSessionDetails ? { source_url: engageSessionDetails.source_url, referrer: engageSessionDetails.referrer, visitor_name: engageSessionDetails.visitor_name, visitor_email: engageSessionDetails.visitor_email, user_agent: engageSessionDetails.user_agent, visitorContext: engageSessionDetails.visitorContext } : undefined}
          cannedResponses={activeTab === 'visitor' ? cannedResponses : undefined}
          mentionContacts={activeTab === 'user' ? mentionContacts : undefined}
          onAddReaction={activeTab === 'user' && currentThread?.thread_id && addPortalReaction ? (itemId, emoji) => addPortalReaction(currentThread.thread_id!, itemId, emoji) : undefined}
          onRemoveReaction={activeTab === 'user' && currentThread?.thread_id && removePortalReaction ? (itemId, emoji) => removePortalReaction(currentThread.thread_id!, itemId, emoji) : undefined}
          canReact={activeTab === 'user'}
          onReplyInThread={activeTab === 'user' ? handleReplyInThread : undefined}
          canReplyInThread={activeTab === 'user'}
          presenceFor={activeTab === 'user' ? presenceFor : undefined}
          welcomeConfig={welcomeConfig}
          placeholder={activeTab === 'echo' ? 'Message Echo...' : 'Type a message...'}
          showFeedback={activeTab === 'echo'}
          showReadReceipts={activeTab !== 'echo'}
          allowEdit={activeTab === 'user'}
          allowDelete={activeTab === 'user'}
          error={activeTab === 'echo' ? echoError : portalOrEngageError}
          onPinMessage={activeTab === 'echo' ? handlePinMessage : undefined}
          pinnedMessageIds={activeTab === 'echo' ? pinnedMessageIds : undefined}
        />
      </div>
      
      {/* New DM Dialog */}
      <NewDMDialog
        open={showNewDMDialog}
        onOpenChange={setShowNewDMDialog}
        onSelectContact={handleStartDM}
      />

      {/* Create / Join Channel (Phase 2.9) */}
      <CreateChannelDialog
        open={showCreateChannelDialog}
        onOpenChange={setShowCreateChannelDialog}
        onCreateSuccess={handleCreateChannelSuccess}
        projectId={project?.id}
        orgId={project?.org_id}
      />
      <JoinChannelDialog
        open={showJoinChannelDialog}
        onOpenChange={setShowJoinChannelDialog}
        onJoinSuccess={handleJoinChannelSuccess}
      />

      {/* Quick Switcher (Cmd+K / Ctrl+K) */}
      <QuickSwitcher
        open={showQuickSwitcher}
        onOpenChange={setShowQuickSwitcher}
        threads={activeTab === 'user' ? [...filteredChannels, ...filteredDMs] : filteredThreads}
        activeTab={activeTab}
        onSelectThread={handleQuickSwitcherSelectThread}
        onSelectContact={activeTab === 'user' ? handleStartDM : undefined}
      />

      {/* Reply-in-thread drawer (Phase 2.6, Team tab) */}
      <ThreadRepliesDrawer
        open={!!threadReplyParent}
        onOpenChange={(open) => {
          if (!open) {
            setThreadReplyParent(null)
            setLoadingReplies(false)
          }
        }}
        thread={activeTab === 'user' ? portalThread : null}
        parentMessage={threadReplyParent}
        replies={threadReplyParent ? portalRepliesFor(threadReplyParent.id) : []}
        isLoadingReplies={loadingReplies}
        onSendReply={handleSendReply}
        currentUserId={user?.id || ''}
        mentionContacts={activeTab === 'user' ? mentionContacts : undefined}
        canReact={activeTab === 'user'}
        onAddReaction={activeTab === 'user' && portalThread?.thread_id && addPortalReaction ? (itemId, emoji) => addPortalReaction(portalThread.thread_id!, itemId, emoji) : undefined}
        onRemoveReaction={activeTab === 'user' && portalThread?.thread_id && removePortalReaction ? (itemId, emoji) => removePortalReaction(portalThread.thread_id!, itemId, emoji) : undefined}
        onRetry={activeTab === 'user' && retryPortalMessage ? retryPortalMessage : undefined}
      />
    </div>
  )
}

// Default export for easier imports
export default MessagesModuleV2
