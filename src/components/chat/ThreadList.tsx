/**
 * ThreadList Component
 * 
 * Sidebar list of chat threads with:
 * - Thread previews
 * - Unread badges
 * - Empty state with new thread action
 * - Pin/delete support via context menu
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { MessageCircle, Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThreadListItem } from './ThreadListItem'
import type { ChatKitThread } from './types'

interface SearchResult {
  conversationId: string
  title: string
  snippet: string
  matchedAt: string
}

interface ThreadListProps {
  threads: ChatKitThread[]
  selectedThreadId: string | null
  onSelectThread: (thread: ChatKitThread) => void
  onNewThread: () => void
  onPinThread?: (threadId: string, pinned: boolean) => Promise<void>
  onDeleteThread?: (threadId: string) => Promise<void>
  /** Mute toggle (Phase 3.4.1). */
  onMuteThread?: (threadId: string, muted: boolean) => Promise<void>
  threadType: 'echo' | 'user' | 'visitor'
  isLoading?: boolean
  /** Presence (Phase 2.10). (userId) => status. */
  presenceFor?: (userId: string) => string
  /** Search handler for Echo conversations */
  onSearch?: (query: string) => Promise<SearchResult[]>
  /** Called when a search result is clicked */
  onSearchResultClick?: (conversationId: string) => void
  className?: string
}

export function ThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  onNewThread,
  onPinThread,
  onDeleteThread,
  onMuteThread,
  threadType,
  isLoading = false,
  presenceFor,
  onSearch,
  onSearchResultClick,
  className,
}: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      if (onSearch) {
        try {
          const results = await onSearch(value.trim())
          setSearchResults(results)
        } catch {
          setSearchResults([])
        }
      }
      setIsSearching(false)
    }, 350)
  }, [onSearch])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }, [])

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
  }, [showSearch])

  // Sort: pinned first, then unread at top, then by last_message_at
  const { unreadThreads, readThreads } = useMemo(() => {
    const sorted = [...threads].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      const unreadA = (a.unread_count ?? 0) > 0 ? 1 : 0
      const unreadB = (b.unread_count ?? 0) > 0 ? 1 : 0
      if (unreadB !== unreadA) return unreadB - unreadA
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : 0)
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : 0)
      return bTime - aTime
    })
    const unread = sorted.filter((t) => (t.unread_count ?? 0) > 0)
    const read = sorted.filter((t) => (t.unread_count ?? 0) === 0)
    return { unreadThreads: unread, readThreads: read }
  }, [threads])
  const showUnreadSection = unreadThreads.length > 0 && (threadType === 'user' || threadType === 'visitor')
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search bar (Echo only) */}
      {threadType === 'echo' && onSearch && (
        <div className="shrink-0 px-2 pt-2">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md bg-[var(--surface-secondary)] border border-[var(--glass-border)]/30 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--brand-primary)]/50"
              />
              <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Search className="h-3 w-3" />
              Search
            </button>
          )}
        </div>
      )}

      {/* Search results overlay */}
      {showSearch && searchQuery.trim().length >= 2 && (
        <div className="shrink-0 max-h-48 overflow-y-auto border-b border-[var(--glass-border)]/30">
          {isSearching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-3">No results</p>
          ) : (
            <div className="p-1 space-y-0.5">
              {searchResults.map((r) => (
                <button
                  key={r.conversationId}
                  type="button"
                  onClick={() => {
                    onSearchResultClick?.(r.conversationId)
                    clearSearch()
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">{r.snippet}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-tertiary)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[var(--surface-tertiary)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--surface-tertiary)]" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--surface-secondary)] mb-3">
              <MessageCircle className="h-6 w-6 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {threadType === 'echo' && 'No conversations yet'}
              {threadType === 'user' && 'No team messages yet'}
              {threadType === 'visitor' && 'No live chats waiting'}
            </p>
            {threadType !== 'visitor' && (
              <button
                onClick={onNewThread}
                className="mt-3 text-sm font-medium text-[var(--brand-primary)] hover:underline"
              >
                Start a new conversation
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1" role="list" aria-label="Conversations">
            {showUnreadSection && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Unread
                </div>
                {unreadThreads.map((thread) => {
                  const stableId = thread.thread_id || (thread as { id?: string }).id
                  return (
                    <ThreadListItem
                      key={stableId}
                      thread={thread}
                      isSelected={stableId === selectedThreadId}
                      onClick={() => onSelectThread(thread)}
                      onPin={onPinThread}
                      onDelete={onDeleteThread}
                      onMute={onMuteThread}
                      presenceFor={presenceFor}
                    />
                  )
                })}
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mt-2">
                  All
                </div>
              </>
            )}
            {(showUnreadSection ? readThreads : unreadThreads.concat(readThreads)).map((thread) => {
              const stableId = thread.thread_id || (thread as { id?: string }).id
              return (
                <ThreadListItem
                  key={stableId}
                  thread={thread}
                  isSelected={stableId === selectedThreadId}
                  onClick={() => onSelectThread(thread)}
                  onPin={onPinThread}
                  onDelete={onDeleteThread}
                  onMute={onMuteThread}
                  presenceFor={presenceFor}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}