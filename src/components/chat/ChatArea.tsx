/**
 * ChatArea Component
 * 
 * Main chat view with:
 * - Message list with auto-scroll
 * - Streaming message display
 * - Typing indicator
 * - Welcome screen for empty state
 * - Input composer
 */

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { ArrowDown, Loader2, Download, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { WelcomeScreen } from './WelcomeScreen'
import { SuggestionChips, type SuggestionChip } from './SuggestionChips'
import { VisitorContextPanel, type VisitorContextData } from './VisitorContextPanel'
import type { ChatKitThread, ChatKitItem, TypingUser, PresenceStatus } from './types'

interface ChatAreaProps {
  thread: ChatKitThread | null
  messages: ChatKitItem[]
  isLoading: boolean
  /** Current user ID for determining own messages */
  currentUserId: string
  /** Thread type for appropriate theming */
  threadType: 'echo' | 'user' | 'visitor'
  /** Is a message currently streaming? */
  isStreaming?: boolean
  /** Content being streamed */
  streamingContent?: string
  /** Users currently typing */
  typingUsers?: TypingUser[]
  /** Called when user sends a message (optionally with file attachments) */
  onSendMessage: (content: string, files?: File[]) => void
  /** Called when scrolling to top for pagination */
  onLoadMore?: () => void
  /** Called when a prompt is clicked in welcome screen */
  onPromptClick?: (prompt: string) => void
  /** Called for message feedback (Echo only) */
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => void
  /** Called to retry a message (Echo only) */
  onRetry?: (messageId: string) => void
  /** Called to edit a message */
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  /** Called to delete a message */
  onDelete?: (messageId: string, forEveryone?: boolean) => Promise<void>
  /** Welcome screen config */
  welcomeConfig?: {
    greeting?: string
    description?: string
    prompts?: Array<{ label: string; prompt: string; icon?: string }>
  }
  /** Input placeholder */
  placeholder?: string
  /** Show feedback buttons on AI messages */
  showFeedback?: boolean
  /** Show read receipts on user messages */
  showReadReceipts?: boolean
  /** Allow editing own messages */
  allowEdit?: boolean
  /** Allow deleting own messages */
  allowDelete?: boolean
  /** Disable input */
  inputDisabled?: boolean
  /** Error to show inline (e.g. Echo stream/load error) */
  error?: Error | null
  /** Called when agent is typing (Live tab → visitor) */
  onAgentTyping?: (isTyping: boolean) => void
  /** Called to close the session (Live tab) */
  onCloseSession?: () => void
  /** Show "Close chat" when true (Live tab) */
  canCloseSession?: boolean
  /** Visitor context for Live tab (source_url, referrer, visitor_name, etc.) */
  visitorContext?: VisitorContextData
  /** Canned responses for Live tab composer */
  cannedResponses?: Array<{ id: string; title?: string; body: string }>
  /** Called when user selects a canned response to insert */
  onInsertCannedResponse?: (text: string) => void
  /** Contacts for @mention autocomplete (Team tab) */
  mentionContacts?: Array<{ id: string; name?: string; email?: string }>
  /** Reactions (Phase 2.4, Team only). Add reaction. */
  onAddReaction?: (itemId: string, emoji: string) => void
  /** Remove reaction. */
  onRemoveReaction?: (itemId: string, emoji: string) => void
  /** Allow adding/removing reactions (Team tab) */
  canReact?: boolean
  /** Reply-in-thread (Phase 2.6). Call when user chooses "Reply in thread". */
  onReplyInThread?: (messageId: string) => void
  /** Show "Reply in thread" action (Team tab) */
  canReplyInThread?: boolean
  /** Presence (Phase 2.10). (userId) => status. */
  presenceFor?: (userId: string) => PresenceStatus
  /** Active tool call label to show during skill execution (Echo only) */
  toolCallLabel?: string | null
  /** Suggestion chips to show after last assistant message (Echo only) */
  suggestionChips?: SuggestionChip[]
  /** Dynamic welcome context from backend (Echo only) */
  echoWelcomeContext?: any
  /** Pin/unpin handler (Echo only) — returns new is_pinned state */
  onPinMessage?: (messageId: string) => Promise<{ is_pinned: boolean }>
  /** IDs of currently pinned messages (Echo only) */
  pinnedMessageIds?: Set<string>
  /** Called when an inline action button is clicked (```actions blocks) */
  onActionClick?: (actionId: string, prompt?: string) => void
  /** Called when an OAuth action button is clicked (opens OAuth popup) */
  onOAuthClick?: (provider: string) => void
  className?: string
}

export function ChatArea({
  thread,
  messages,
  isLoading,
  currentUserId,
  threadType,
  isStreaming = false,
  streamingContent = '',
  typingUsers = [],
  onSendMessage,
  onLoadMore,
  onPromptClick,
  onFeedback,
  onRetry,
  onEdit,
  onDelete,
  welcomeConfig,
  placeholder,
  showFeedback = false,
  showReadReceipts = false,
  allowEdit = false,
  allowDelete = false,
  inputDisabled = false,
  error = null,
  onAgentTyping,
  onCloseSession,
  canCloseSession = false,
  visitorContext,
  cannedResponses,
  onInsertCannedResponse,
  mentionContacts,
  onAddReaction,
  onRemoveReaction,
  canReact = false,
  onReplyInThread,
  canReplyInThread = false,
  presenceFor,
  toolCallLabel,
  suggestionChips = [],
  echoWelcomeContext,
  onPinMessage,
  pinnedMessageIds,
  onActionClick,
  onOAuthClick,
  className,
}: ChatAreaProps) {
  const otherUserId = useMemo(() => {
    if (threadType !== 'user' || !thread || !currentUserId) return null
    return thread.user_id === currentUserId ? thread.recipient_user_id ?? null : thread.user_id
  }, [threadType, thread, currentUserId])
  const presenceStatus = otherUserId && presenceFor ? presenceFor(otherUserId) : null
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  
  // Check if we're at the bottom of the scroll
  const checkIsAtBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    const threshold = 100
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])
  
  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    })
  }, [])
  
  // Auto-scroll when new messages arrive (if at bottom)
  useEffect(() => {
    if (isAtBottomRef.current || isStreaming) {
      scrollToBottom(false)
    }
  }, [messages.length, isStreaming, streamingContent, scrollToBottom])
  
  // Track scroll position
  const handleScroll = useCallback(() => {
    isAtBottomRef.current = checkIsAtBottom()
    
    // Load more when scrolling to top
    const container = scrollContainerRef.current
    if (container && container.scrollTop < 100 && onLoadMore) {
      onLoadMore()
    }
  }, [checkIsAtBottom, onLoadMore])
  
  // Handle prompt click from welcome screen
  const handlePromptClick = useCallback((prompt: string) => {
    if (onPromptClick) {
      onPromptClick(prompt)
    } else {
      onSendMessage(prompt)
    }
  }, [onPromptClick, onSendMessage])

  // Handle inline action button click (```actions blocks)
  const handleActionClick = useCallback((actionId: string, prompt?: string) => {
    if (onActionClick) {
      onActionClick(actionId, prompt)
    } else if (prompt) {
      // Default: send the prompt text as a message (like suggestion chips)
      onSendMessage(prompt)
    }
  }, [onActionClick, onSendMessage])

  // Handle OAuth action button click
  const handleOAuthClick = useCallback((provider: string) => {
    if (onOAuthClick) {
      onOAuthClick(provider)
    }
  }, [onOAuthClick])
  
  // Typing indicator names
  const typingNames = useMemo(() => {
    if (typingUsers.length === 0) return null
    if (typingUsers.length === 1) {
      return typingUsers[0].full_name || 'Someone'
    }
    return `${typingUsers.length} people`
  }, [typingUsers])

  const [copied, setCopied] = useState(false)

  const getTranscriptMarkdown = useCallback(() => {
    if (!thread || messages.length === 0) return ''
    const title = thread.title || 'Conversation'
    const lines = [`# ${title}`, `Exported: ${format(new Date(), 'PPpp')}`, '']
    for (const m of messages) {
      const sender = m.type === 'user_message' ? '**You**' : '**Echo**'
      const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? (m.content as Array<{ text?: string }>).map(c => c.text ?? '').join('') : ''
      const time = m.created_at ? format(new Date(m.created_at), 'p') : ''
      lines.push(`${sender} ${time ? `*(${time})*` : ''}`)
      lines.push(text)
      lines.push('')
    }
    return lines.join('\n')
  }, [thread, messages])

  const handleExportMarkdown = useCallback(() => {
    const md = getTranscriptMarkdown()
    if (!md) return
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echo-${(thread?.title || 'chat').replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [getTranscriptMarkdown, thread])

  const handleCopyTranscript = useCallback(async () => {
    const md = getTranscriptMarkdown()
    if (!md) return
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = md
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [getTranscriptMarkdown])
  
  // Show welcome screen if no thread or no messages
  const showWelcome = !thread || (messages.length === 0 && !isLoading)
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Inline error banner (e.g. Echo) */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {error.message}
        </div>
      )}
      {/* Visitor context (Live tab) */}
      {threadType === 'visitor' && visitorContext && (
        <VisitorContextPanel data={visitorContext} />
      )}
      {/* Presence (Phase 2.10, Team DM) */}
      {threadType === 'user' && presenceStatus && presenceStatus !== 'offline' && (
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 border-b border-[var(--glass-border)]/30 text-xs text-[var(--text-tertiary)]">
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full',
              presenceStatus === 'online' && 'bg-emerald-500',
              presenceStatus === 'away' && 'bg-amber-500',
              presenceStatus === 'dnd' && 'bg-red-500'
            )}
            aria-hidden
          />
          <span>
            {presenceStatus === 'online' && 'Online'}
            {presenceStatus === 'away' && 'Away'}
            {presenceStatus === 'dnd' && 'Do not disturb'}
          </span>
        </div>
      )}
      {/* Thread actions: Export & Copy */}
      {thread && messages.length > 0 && (
        <div className="shrink-0 flex items-center justify-end gap-0.5 px-4 py-1 border-b border-[var(--glass-border)]/30">
          <button
            type="button"
            onClick={handleCopyTranscript}
            className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
            title="Copy transcript"
            aria-label="Copy transcript"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
            title="Download as Markdown"
            aria-label="Download as Markdown"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {showWelcome ? (
          <WelcomeScreen
            greeting={welcomeConfig?.greeting}
            description={welcomeConfig?.description}
            prompts={welcomeConfig?.prompts}
            onPromptClick={handlePromptClick}
            chatType={threadType}
            dynamicContext={echoWelcomeContext}
          />
        ) : (
          <div className="p-4 space-y-4">
            {/* New messages divider (when thread has unread) */}
            {thread && (thread.unread_count ?? 0) > 0 && (
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-[var(--glass-border)]/50" />
                <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  New messages
                </span>
                <div className="flex-1 h-px bg-[var(--glass-border)]/50" />
              </div>
            )}
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
              </div>
            )}
            
            {/* Messages */}
            {messages.map((message, index) => {
              const isOwn = message.sender_id === currentUserId || 
                           (message.type === 'user_message' && !message.sender_id)
              const isLastAssistant = threadType === 'echo' && 
                                      message.type === 'assistant_message' && 
                                      index === messages.length - 1
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  isStreaming={isLastAssistant && isStreaming}
                  streamingContent={isLastAssistant && isStreaming ? streamingContent : undefined}
                  showTimestamp
                  showReadReceipt={showReadReceipts && !message.type.includes('assistant')}
                  showFeedback={showFeedback && message.type === 'assistant_message'}
                  canEdit={allowEdit && isOwn && !message.type.includes('assistant')}
                  canDelete={allowDelete && isOwn && !message.type.includes('assistant')}
                  reactions={message.reactions ?? []}
                  canReact={canReact && !message.type.includes('assistant')}
                  currentUserId={currentUserId}
                  onAddReaction={onAddReaction ? (emoji) => onAddReaction(message.id, emoji) : undefined}
                  onRemoveReaction={onRemoveReaction ? (emoji) => onRemoveReaction(message.id, emoji) : undefined}
                  onReplyInThread={onReplyInThread}
                  canReplyInThread={canReplyInThread}
                  onFeedback={onFeedback}
                  onRetry={onRetry && (message as { sendFailed?: boolean }).sendFailed ? () => onRetry(message.id) : undefined}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPin={threadType === 'echo' && onPinMessage ? (id) => { onPinMessage(id) } : undefined}
                  isPinned={pinnedMessageIds?.has(message.id) ?? false}
                  onAction={threadType === 'echo' ? handleActionClick : undefined}
                  onOAuth={threadType === 'echo' ? handleOAuthClick : undefined}
                />
              )
            })}
            
            {/* Tool call indicator — shown when Echo is executing a skill */}
            {toolCallLabel && isStreaming && !streamingContent && (
              <div className="flex items-center gap-2 px-4 py-2 ml-12">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)]">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-primary)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--brand-primary)' }}>{toolCallLabel}</span>
                </div>
              </div>
            )}
            {/* Echo/Assistant typing (three dots) when streaming but no content yet */}
            {isStreaming && !streamingContent && !toolCallLabel && (
              <TypingIndicator name={threadType === 'echo' ? 'Echo' : 'Assistant'} />
            )}
            {/* Streaming placeholder (new message) */}
            {isStreaming && streamingContent && messages.length > 0 && 
             messages[messages.length - 1]?.type !== 'assistant_message' && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  thread_id: thread?.thread_id || '',
                  type: 'assistant_message',
                  content: [{ type: 'output_text', text: streamingContent }],
                  created_at: new Date().toISOString(),
                }}
                isOwn={false}
                isStreaming={true}
                streamingContent={streamingContent}
                showTimestamp={false}
              />
            )}
            
            {/* Typing indicator */}
            {typingNames && (
              <TypingIndicator name={typingNames} />
            )}

            {/* Suggestion chips (Echo only, after response) */}
            {threadType === 'echo' && !isStreaming && suggestionChips.length > 0 && (
              <SuggestionChips chips={suggestionChips} onChipClick={handlePromptClick} />
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Scroll to bottom button */}
      {!isAtBottomRef.current && messages.length > 5 && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-6 p-2 rounded-full bg-[var(--surface-primary)] border border-[var(--glass-border)]/50 shadow-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
      
      {/* Close chat (Live) - full layout */}
      {canCloseSession && onCloseSession && (
        <div className="shrink-0 px-4 py-2 border-t border-[var(--glass-border)]/30 flex justify-end">
          <button
            type="button"
            onClick={onCloseSession}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Close chat
          </button>
        </div>
      )}
      {/* Input */}
      <div className="border-t border-[var(--glass-border)]/30 bg-[var(--surface-primary)]/50 backdrop-blur-sm">
        <MessageInput
          onSend={onSendMessage}
          onTyping={onAgentTyping}
          placeholder={placeholder || (threadType === 'echo' ? 'Message Echo...' : 'Type a message...')}
          disabled={inputDisabled || isStreaming}
          showAttachments={threadType !== 'echo'}
          isAIChat={threadType === 'echo'}
          cannedResponses={cannedResponses}
          onInsertCannedResponse={onInsertCannedResponse}
          mentionContacts={mentionContacts}
          draftKey={thread?.thread_id ? `${threadType}-${thread.thread_id}` : null}
          acceptedTypes={threadType === 'echo' ? 'image/*,.pdf,.doc,.docx,.txt,.csv' : undefined}
        />
      </div>
    </div>
  )
}
