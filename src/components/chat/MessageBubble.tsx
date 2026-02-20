/**
 * MessageBubble Component
 * 
 * Individual message display with:
 * - Markdown rendering
 * - Code block syntax highlighting
 * - Timestamps
 * - Read receipts (human messages)
 * - Feedback buttons (AI messages)
 * - Streaming animation
 * - Edit/Delete actions with hover menu
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatDistanceToNow, format } from 'date-fns'
import { Check, CheckCheck, RefreshCw, User, MoreHorizontal, Pencil, Trash2, X, SmilePlus, CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeBlock } from './CodeBlock'
import { FeedbackButtons } from './FeedbackButtons'
import { AttachmentPreview, type Attachment } from './Attachments'
import { LinkPreviewCard, extractFirstUrl } from './LinkPreviewCard'
import type { ChatKitItem, MessageContent, ItemReaction } from './types'
import EchoLogo from '@/components/EchoLogo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const COMMON_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👀', '✅', '🎉', '🤔']

function ReactionsRow({
  reactions,
  canReact,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  isOwn,
}: {
  reactions: ItemReaction[]
  canReact: boolean
  currentUserId?: string
  onAddReaction?: (emoji: string) => void
  onRemoveReaction?: (emoji: string) => void
  isOwn: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 mt-1',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {reactions.map((r) => {
        const hasReacted = !!currentUserId && r.user_ids.includes(currentUserId)
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => {
              if (!canReact || !onAddReaction || !onRemoveReaction) return
              if (hasReacted) onRemoveReaction(r.emoji)
              else onAddReaction(r.emoji)
            }}
            disabled={!canReact}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors',
              'border-[var(--glass-border)]/50 bg-[var(--surface-secondary)]/80 hover:bg-[var(--surface-tertiary)]/80',
              hasReacted && 'ring-1 ring-[var(--brand-primary)]/50 bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)]'
            )}
          >
            <span>{r.emoji}</span>
            {r.count > 1 && <span className="text-xs text-[var(--text-tertiary)]">{r.count}</span>}
          </button>
        )
      })}
      {canReact && onAddReaction && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/80 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Add reaction"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align={isOwn ? 'end' : 'start'} className="w-auto p-2">
            <div className="grid grid-cols-5 gap-1">
              {COMMON_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="p-1.5 rounded hover:bg-[var(--surface-secondary)] text-lg leading-none"
                  onClick={() => {
                    onAddReaction(emoji)
                    setPickerOpen(false)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatKitItem & { 
    attachments?: Attachment[]
    edited_at?: string | null
    deleted_at?: string | null
  }
  /** Is this from the current user? */
  isOwn: boolean
  /** Is this message currently streaming? */
  isStreaming?: boolean
  /** Content being streamed (overrides message.content) */
  streamingContent?: string
  /** Show relative timestamp */
  showTimestamp?: boolean
  /** Show read receipt (for human messages) */
  showReadReceipt?: boolean
  /** Show feedback buttons (for AI messages) */
  showFeedback?: boolean
  /** Allow editing this message (only for own messages) */
  canEdit?: boolean
  /** Allow deleting this message (only for own messages) */
  canDelete?: boolean
  /** Retry callback for failed messages */
  onRetry?: () => void
  /** Feedback callback */
  onFeedback?: (messageId: string, type: 'positive' | 'negative') => void
  /** Edit callback */
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  /** Delete callback */
  onDelete?: (messageId: string, forEveryone?: boolean) => Promise<void>
  /** Reactions (Phase 2.4). Only for Team chat. */
  reactions?: ItemReaction[]
  /** Allow adding/removing reactions */
  canReact?: boolean
  /** Current user id (auth) for "you reacted" highlight */
  currentUserId?: string
  /** Add reaction */
  onAddReaction?: (emoji: string) => void
  /** Remove reaction */
  onRemoveReaction?: (emoji: string) => void
  /** Reply-in-thread (Phase 2.6). Call when user chooses "Reply in thread". */
  onReplyInThread?: (messageId: string) => void
  /** Show "Reply in thread" action (Team tab). */
  canReplyInThread?: boolean
  className?: string
}

export function MessageBubble({
  message,
  isOwn,
  isStreaming = false,
  streamingContent,
  showTimestamp = true,
  showReadReceipt = false,
  showFeedback = false,
  canEdit = false,
  canDelete = false,
  onRetry,
  onFeedback,
  onEdit,
  onDelete,
  reactions = [],
  canReact = false,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  onReplyInThread,
  canReplyInThread = false,
  className,
}: MessageBubbleProps) {
  const isEchoSender = message.sender?.name === 'Echo' || message.sender?.full_name === 'Echo'
  const isAssistant = message.type === 'assistant_message' || isEchoSender
  const isDeleted = !!message.deleted_at
  const isEdited = !!message.edited_at
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Focus edit input when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(
        editInputRef.current.value.length,
        editInputRef.current.value.length
      )
    }
  }, [isEditing])
  
  // Start editing
  const handleStartEdit = () => {
    setEditContent(messageText)
    setIsEditing(true)
  }
  
  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }
  
  // Save edit
  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim() || editContent === messageText) {
      handleCancelEdit()
      return
    }
    
    setIsSaving(true)
    try {
      await onEdit(message.id, editContent.trim())
      setIsEditing(false)
      setEditContent('')
    } catch (error) {
      console.error('Failed to edit message:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle keyboard shortcuts in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
  }
  
  // Delete message
  const handleDelete = async (forEveryone: boolean = false) => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(message.id, forEveryone)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete message:', error)
    } finally {
      setIsDeleting(false)
    }
  }
  
  const showEditDelete = isOwn && !isAssistant && !isStreaming && !isDeleted && (canEdit || canDelete)
  const showReplyInThread = canReplyInThread && !isAssistant && !isStreaming && !isDeleted
  const showActions = showEditDelete || showReplyInThread
  
  // Extract text from content (handles both array and string formats)
  const messageText = useMemo(() => {
    if (isStreaming && streamingContent !== undefined) {
      return streamingContent
    }
    
    if (typeof message.content === 'string') {
      return message.content
    }
    
    if (Array.isArray(message.content)) {
      return message.content
        .filter((c: MessageContent) => c.type === 'text' || c.type === 'output_text' || c.type === 'input_text')
        .map((c: MessageContent) => c.text)
        .join('\n')
    }
    
    // Handle object format { text: '...' } from chatkit storage
    if (message.content && typeof message.content === 'object' && 'text' in message.content) {
      return (message.content as { text: string }).text
    }
    
    return ''
  }, [message.content, isStreaming, streamingContent])

  // Highlight @mentions for display (wrap in ** so they render bold)
  const messageTextWithMentions = useMemo(() => {
    if (!messageText) return ''
    return messageText.replace(/@[\w.-]+/g, '**$&**')
  }, [messageText])

  const firstUrl = useMemo(() => extractFirstUrl(messageText), [messageText])
  
  // Format timestamp
  const timestamp = useMemo(() => {
    if (!message.created_at) return null
    const date = new Date(message.created_at)
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: format(date, 'MMM d, yyyy h:mm a'),
    }
  }, [message.created_at])
  
  // Skip rendering empty messages (can happen from thread creation without content)
  if (!messageText && !isStreaming && !isDeleted) {
    return null
  }
  
  return (
    <div
      className={cn(
        'flex gap-3 group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isAssistant ? (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
            <EchoLogo size={20} />
          </div>
        ) : (message.sender?.avatar || message.sender?.avatar_url) ? (
          <img
            src={message.sender.avatar || message.sender.avatar_url}
            alt={message.sender.name || message.sender.full_name || 'User'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-tertiary)]">
            <User className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
        )}
      </div>
      
      {/* Message Content */}
      <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (if not own message) */}
        {!isOwn && (message.sender?.name || message.sender?.full_name) && (
          <span className="text-xs text-[var(--text-tertiary)] mb-1 px-1">
            {message.sender.name || message.sender.full_name}
          </span>
        )}
        
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 relative',
            isDeleted
              ? 'bg-[var(--surface-secondary)]/50 italic'
              : isAssistant
                ? 'bg-transparent border border-[var(--glass-border)]/50'
                : isOwn
                  ? 'bg-[color-mix(in_srgb,var(--brand-primary)_15%,transparent)]'
                  : 'bg-[var(--surface-secondary)]'
          )}
        >
          {/* Hover action menu */}
          {showActions && !isEditing && (
            <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-md bg-[var(--surface-primary)] border border-[var(--glass-border)]/50 shadow-sm hover:bg-[var(--surface-secondary)] transition-colors">
                    <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                  {showReplyInThread && onReplyInThread && (
                    <DropdownMenuItem
                      inset={false}
                      onClick={() => onReplyInThread(message.id)}
                    >
                      <CornerDownRight className="h-4 w-4 mr-2" />
                      Reply in thread
                    </DropdownMenuItem>
                  )}
                  {canEdit && onEdit && (
                    <DropdownMenuItem className="" inset={false} onClick={handleStartEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && onDelete && (
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600"
                      inset={false}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          {/* Deleted message state */}
          {isDeleted ? (
            <p className="text-sm text-[var(--text-tertiary)]">
              This message was deleted
            </p>
          ) : isEditing ? (
            /* Edit mode */
            <div className="space-y-2">
              <textarea
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full min-h-[60px] p-2 rounded-lg bg-[var(--surface-primary)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
                placeholder="Edit your message..."
                disabled={isSaving}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim() || editContent === messageText}
                  className="px-3 py-1 text-xs rounded-md bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                Press Enter to save, Esc to cancel
              </p>
            </div>
          ) : (
            /* Normal message content */
            <>
              {/* Markdown Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className: codeClassName, children, ...props }) {
                      const match = /language-(\w+)/.exec(codeClassName || '')
                      const language = match ? match[1] : ''
                      const codeString = String(children).replace(/\n$/, '')
                      
                      // Block code has multiple lines or a language specified
                      const isBlock = codeString.includes('\n') || language
                      
                      if (isBlock) {
                        return (
                          <CodeBlock
                            code={codeString}
                            language={language}
                            className="my-2 -mx-2"
                          />
                        )
                      }
                      
                      // Inline code
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded bg-[var(--surface-tertiary)] text-[var(--text-primary)] font-mono text-xs"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    },
                    // Links open in new tab
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--brand-primary)] hover:underline"
                        >
                          {children}
                        </a>
                      )
                    },
                    // Paragraphs with proper spacing
                    p({ children }) {
                      return <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>
                    },
                    // Lists
                    ul({ children }) {
                      return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                    },
                    ol({ children }) {
                      return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                    },
                  }}
                >
                  {messageTextWithMentions}
                </ReactMarkdown>
              </div>
              
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <AttachmentPreview attachments={message.attachments} />
              )}

              {/* Link preview (Phase 3.2.2) */}
              {firstUrl && !isStreaming && (
                <LinkPreviewCard url={firstUrl} className="max-w-[320px]" />
              )}
              
              {/* Streaming cursor */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-[var(--text-primary)] animate-pulse ml-0.5" />
              )}
            </>
          )}
        </div>

        {/* Reactions (Phase 2.4) */}
        {((canReact && (onAddReaction || onRemoveReaction)) || reactions.length > 0) && !isDeleted && (
          <ReactionsRow
            reactions={reactions}
            canReact={canReact}
            currentUserId={currentUserId}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            isOwn={isOwn}
          />
        )}
        
        {/* Footer: Timestamp, Edited badge, Read Receipt, Actions */}
        <div className="flex items-center gap-2 mt-1 px-1">
          {/* Timestamp */}
          {showTimestamp && timestamp && (
            <span
              className="text-xs text-[var(--text-tertiary)]"
              title={timestamp.absolute}
            >
              {timestamp.relative}
            </span>
          )}
          
          {/* Edited badge */}
          {isEdited && !isDeleted && (
            <span 
              className="text-xs text-[var(--text-tertiary)] italic"
              title={message.edited_at ? format(new Date(message.edited_at), 'MMM d, yyyy h:mm a') : undefined}
            >
              (edited)
            </span>
          )}
          
          {/* Read receipt */}
          {showReadReceipt && isOwn && !isAssistant && !isDeleted && (
            <span className="text-[var(--text-tertiary)]">
              {message.read_at ? (
                <CheckCheck className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          )}
          
          {/* Retry button (for failed messages) */}
          {onRetry && !isDeleted && (
            <button
              onClick={onRetry}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          
          {/* Feedback buttons (AI messages only) */}
          {showFeedback && isAssistant && !isStreaming && !isDeleted && (
            <FeedbackButtons
              messageId={message.id}
              onFeedback={onFeedback}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          )}
        </div>
      </div>
      
      {/* Delete confirmation dialog (Phase 3.5.2: Delete for me vs everyone) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="">
          <AlertDialogHeader className="">
            <AlertDialogTitle className="">Delete message?</AlertDialogTitle>
            <AlertDialogDescription className="">
              Choose how you want to delete this message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              disabled={isDeleting}
              className="w-full bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)]"
            >
              {isDeleting ? 'Deleting...' : 'Delete for me'}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleDelete(true)}
              disabled={isDeleting}
              className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete for everyone'}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-2" disabled={isDeleting}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
