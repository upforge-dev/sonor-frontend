/**
 * QuickSwitcher – Cmd+K / Ctrl+K modal to jump to a thread or start a DM
 * Phase 2.2: search by contact name / thread title; recent threads; "Go to" opens thread.
 * Phase 3.3.2: search message snippets
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, MessageCircle, Users, MessageSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ChatKitThread } from '@/components/chat/types'
import { messagesApi, chatkitApi } from '@/lib/portal-api'
import { echoApi } from '@/lib/signal-api'
import { useBrandColors } from '@/hooks/useBrandColors'

interface Contact {
  id: string
  name: string
  email: string
  avatar_url?: string
  avatar?: string
}

interface MessageSearchResult {
  message_id: string
  thread_id: string
  thread_title: string
  content: string
  sender_name?: string
  created_at: string
}

interface EchoSearchResult {
  conversationId: string
  title: string
  snippet: string
  matchedAt?: string
}

interface QuickSwitcherProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threads: ChatKitThread[]
  activeTab: 'echo' | 'user' | 'visitor'
  onSelectThread: (thread: ChatKitThread) => void
  onSelectContact?: (contact: Contact) => void
}

export function QuickSwitcher({
  open,
  onOpenChange,
  threads,
  activeTab,
  onSelectThread,
  onSelectContact,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([])
  const [echoResults, setEchoResults] = useState<EchoSearchResult[]>([])
  const [searchingMessages, setSearchingMessages] = useState(false)
  const [searchingEcho, setSearchingEcho] = useState(false)
  const brandColors = useBrandColors()

  useEffect(() => {
    if (!open) {
      setQuery('')
      setMessageResults([])
      setEchoResults([])
      return
    }
    if (activeTab === 'user' && onSelectContact) {
      setLoadingContacts(true)
      messagesApi.getContacts()
        .then((res) => {
          const data = res?.data || res || {}
          const list = data.contacts || data.data?.contacts || []
          setContacts(Array.isArray(list) ? list : [])
        })
        .catch(() => setContacts([]))
        .finally(() => setLoadingContacts(false))
    } else {
      setContacts([])
    }
  }, [open, activeTab, onSelectContact])

  // Phase 3.3.2: Search messages when query changes (debounced) - user tab
  useEffect(() => {
    if (!open || !query.trim() || activeTab !== 'user') {
      setMessageResults([])
      return
    }

    const timer = setTimeout(() => {
      setSearchingMessages(true)
      chatkitApi.search(query, 'messages', 5)
        .then((res) => {
          const messages = res?.data?.messages || res?.messages || []
          setMessageResults(Array.isArray(messages) ? messages : [])
        })
        .catch(() => setMessageResults([]))
        .finally(() => setSearchingMessages(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [query, open, activeTab])

  // Echo conversation search when Echo tab
  useEffect(() => {
    if (!open || !query.trim() || activeTab !== 'echo') {
      setEchoResults([])
      return
    }

    const timer = setTimeout(() => {
      setSearchingEcho(true)
      echoApi.searchConversations(query.trim(), 10)
        .then((rows) => setEchoResults(Array.isArray(rows) ? rows : []))
        .catch(() => setEchoResults([]))
        .finally(() => setSearchingEcho(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [query, open, activeTab])

  const q = query.trim().toLowerCase()
  const filteredThreads = useMemo(() => {
    if (!q) return threads.slice(0, 15)
    return threads.filter((t) => {
      const title = (t.title ?? '').toLowerCase()
      const recipient = (t.recipient?.full_name ?? t.recipient?.email ?? '').toLowerCase()
      return title.includes(q) || recipient.includes(q)
    }).slice(0, 15)
  }, [threads, q])

  const filteredContacts = useMemo(() => {
    if (activeTab !== 'user' || !onSelectContact || !q) return []
    return contacts.filter((c) => {
      const name = (c.name ?? '').toLowerCase()
      const email = (c.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    }).slice(0, 10)
  }, [activeTab, contacts, q, onSelectContact])

  const handleSelectThread = useCallback((thread: ChatKitThread) => {
    onSelectThread(thread)
    onOpenChange(false)
  }, [onSelectThread, onOpenChange])

  const handleSelectContact = useCallback((contact: Contact) => {
    onSelectContact?.(contact)
    onOpenChange(false)
  }, [onSelectContact, onOpenChange])

  const handleSelectMessage = useCallback((result: MessageSearchResult) => {
    const thread = threads.find((t) => t.thread_id === result.thread_id)
    if (thread) {
      onSelectThread(thread)
      onOpenChange(false)
    }
  }, [threads, onSelectThread, onOpenChange])

  const handleSelectEchoResult = useCallback((result: EchoSearchResult) => {
    const syntheticThread: ChatKitThread = {
      thread_id: result.conversationId,
      title: result.title || 'Conversation',
      thread_type: 'echo',
      user_id: '',
      org_id: '',
      project_id: null,
      last_message_at: null,
      unread_count: 0,
      status: 'active',
      skill_key: null,
      created_at: '',
      updated_at: '',
    }
    onSelectThread(syntheticThread)
    onOpenChange(false)
  }, [onSelectThread, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-[var(--surface-primary)] border-[var(--glass-border)] p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" style={{ color: brandColors.primary }} />
            Go to...
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <Input
            type="text"
            placeholder="Search threads or contacts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-[var(--surface-secondary)] border-[var(--glass-border)]/50"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[400px] px-2 pb-4">
          {/* Echo conversation search results */}
          {activeTab === 'echo' && query.trim() && (searchingEcho || echoResults.length > 0) && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Echo conversations
              </div>
              {searchingEcho ? (
                <div className="py-4 text-center text-sm text-[var(--text-tertiary)]">Searching...</div>
              ) : echoResults.length > 0 ? (
                <div className="space-y-0.5 mb-3">
                  {echoResults.map((result) => (
                    <button
                      key={result.conversationId}
                      type="button"
                      onClick={() => handleSelectEchoResult(result)}
                      className={cn(
                        'w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        'hover:bg-[var(--surface-secondary)]'
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                        <MessageCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate mb-0.5">
                          {result.title || 'Conversation'}
                        </p>
                        {result.snippet && (
                          <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{result.snippet}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-[var(--text-tertiary)]">No Echo conversations match</div>
              )}
              <div className="px-2 py-1.5 mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Recent threads
              </div>
            </>
          )}

          {/* Phase 3.3.2: Message search results */}
          {activeTab === 'user' && query.trim() && messageResults.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Messages
              </div>
              <div className="space-y-0.5 mb-3">
                {messageResults.map((result) => (
                  <button
                    key={result.message_id}
                    type="button"
                    onClick={() => handleSelectMessage(result)}
                    className={cn(
                      'w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      'hover:bg-[var(--surface-secondary)]'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                      <MessageSquare className="h-4 w-4 text-[var(--text-tertiary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--text-secondary)] truncate mb-0.5">
                        {result.thread_title || 'Conversation'}
                        {result.sender_name && ` • ${result.sender_name}`}
                      </p>
                      <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                        {result.content}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'user' && onSelectContact && (query.trim() || filteredContacts.length > 0) && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Contacts
              </div>
              {loadingContacts ? (
                <div className="py-4 text-center text-sm text-[var(--text-tertiary)]">Loading...</div>
              ) : filteredContacts.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        'hover:bg-[var(--surface-secondary)]'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatar_url || contact.avatar} />
                        <AvatarFallback className="text-xs" style={{ backgroundColor: `${brandColors.primary}20`, color: brandColors.primary }}>
                          {(contact.name || contact.email || '?').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{contact.name || 'No name'}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{contact.email}</p>
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">New message</span>
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="py-4 text-center text-sm text-[var(--text-tertiary)]">No contacts match</div>
              ) : null}
              <div className="px-2 py-1.5 mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Recent threads
              </div>
            </>
          )}
          {filteredThreads.length === 0 && (
            <div className="py-4 text-center text-sm text-[var(--text-tertiary)]">
              {query.trim() ? 'No threads match' : 'No recent threads'}
            </div>
          )}
          {filteredThreads.length > 0 && (
            <div className="space-y-0.5">
              {filteredThreads.map((thread) => {
                const stableId = thread.thread_id || (thread as { id?: string }).id
                return (
                  <button
                    key={stableId}
                    type="button"
                    onClick={() => handleSelectThread(thread)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      'hover:bg-[var(--surface-secondary)]'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
                      {thread.thread_type === 'visitor' ? (
                        <MessageCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
                      ) : (
                        <Users className="h-4 w-4 text-[var(--text-tertiary)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {thread.title || 'Conversation'}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {thread.last_message_preview ?? thread.last_message ?? 'No messages yet'}
                      </p>
                    </div>
                    {(thread.unread_count ?? 0) > 0 && (
                      <span className="shrink-0 rounded-full bg-[var(--brand-primary)]/20 px-2 py-0.5 text-xs font-medium" style={{ color: brandColors.primary }}>
                        {thread.unread_count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
