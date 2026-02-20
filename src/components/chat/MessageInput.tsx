/**
 * MessageInput Component
 * 
 * Text input with send button for chat messages.
 * Features:
 * - Auto-growing textarea
 * - Cmd/Ctrl+Enter to send
 * - Shift+Enter for new line
 * - File attachments with preview
 * - Drag-and-drop support
 * - Disabled state while sending
 */

import { useState, useRef, useCallback, useMemo, useEffect, KeyboardEvent, ChangeEvent, useId } from 'react'
import { Send, MessageSquarePlus, Bold, Italic, Code2, Strikethrough, List } from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  AttachmentUploadButton, 
  AttachmentThumbnail, 
  DropZone,
  type PendingAttachment 
} from './Attachments'
import EchoLogo from '@/components/EchoLogo'

interface MessageInputProps {
  /** Called when user sends a message with optional files */
  onSend: (content: string, files?: File[]) => void | Promise<void>
  /** Called when user is typing (e.g. for Live tab agent typing indicator) */
  onTyping?: (isTyping: boolean) => void
  /** Placeholder text */
  placeholder?: string
  /** Disable input (e.g., while sending) */
  disabled?: boolean
  /** Show attachment button */
  showAttachments?: boolean
  /** Show emoji picker button */
  showEmoji?: boolean
  /** Canned responses for Live tab (insert into input) */
  cannedResponses?: Array<{ id: string; title?: string; body: string }>
  /** Called when user selects a canned response to insert */
  onInsertCannedResponse?: (text: string) => void
  /** Contacts for @mention autocomplete (Team tab) */
  mentionContacts?: Array<{ id: string; name?: string; email?: string }>
  /** Character limit */
  maxLength?: number
  /** Max file size in bytes (default 10MB) */
  maxFileSize?: number
  /** Max number of attachments (default 10) */
  maxFiles?: number
  /** Accepted file types */
  acceptedTypes?: string
  /** Additional className */
  className?: string
  /** Whether the input is for AI (streaming) vs human messages */
  isAIChat?: boolean
  /** Optional draft key (e.g. thread_id). Persist/restore draft from localStorage (Phase 3.1.2). */
  draftKey?: string | null
}

const TYPING_DEBOUNCE_MS = 2000

export function MessageInput({
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  showAttachments = true,
  showEmoji = false,
  maxLength = 10000,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  acceptedTypes = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip',
  className,
  isAIChat = false,
  cannedResponses,
  onInsertCannedResponse,
  mentionContacts,
  draftKey,
}: MessageInputProps) {
  const storageKey = draftKey ? `messages-draft-${draftKey}` : null
  const [value, setValue] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([])
  const draftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!storageKey) {
      setValue('')
      return
    }
    try {
      setValue(localStorage.getItem(storageKey) ?? '')
    } catch { setValue('') }
    return () => {
      if (draftSaveRef.current) clearTimeout(draftSaveRef.current)
    }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    draftSaveRef.current = setTimeout(() => {
      draftSaveRef.current = null
      try {
        if (value) localStorage.setItem(storageKey, value)
        else localStorage.removeItem(storageKey)
      } catch { /* ignore */ }
    }, 500)
    return () => { if (draftSaveRef.current) clearTimeout(draftSaveRef.current) }
  }, [value])
  const [isSending, setIsSending] = useState(false)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [focusedMentionIndex, setFocusedMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionOptionRef = useRef<HTMLButtonElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputId = useId()

  // @mention: filter from text after last @
  const mentionFilter = useMemo(() => {
    const lastAt = value.lastIndexOf('@')
    if (lastAt === -1) return null
    const after = value.slice(lastAt + 1)
    if (/\s/.test(after)) return null
    return after.toLowerCase()
  }, [value])
  const filteredMentionContacts = useMemo(() => {
    if (!mentionContacts?.length || mentionFilter === null) return []
    if (!mentionFilter) return mentionContacts.slice(0, 8)
    return mentionContacts
      .filter((c) => (c.name ?? '').toLowerCase().includes(mentionFilter) || (c.email ?? '').toLowerCase().includes(mentionFilter))
      .slice(0, 8)
  }, [mentionContacts, mentionFilter])
  const showMentionPopover = mentionFilter !== null && filteredMentionContacts.length > 0
  useEffect(() => {
    if (!showMentionPopover) {
      setMentionOpen(false)
    } else {
      setMentionOpen(true)
      setFocusedMentionIndex(0)
    }
  }, [showMentionPopover])
  useEffect(() => {
    setFocusedMentionIndex(0)
  }, [filteredMentionContacts])

  useEffect(() => {
    mentionOptionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedMentionIndex])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])
  
  const insertMention = useCallback((name: string) => {
    const displayName = name || 'Unknown'
    setValue((prev) => {
      const lastAt = prev.lastIndexOf('@')
      if (lastAt === -1) return prev
      return prev.slice(0, lastAt) + '@' + displayName + ' '
    })
    setMentionOpen(false)
    adjustHeight()
  }, [adjustHeight])

  // Phase 3.2.3: Markdown formatting helper
  const wrapWithMarkdown = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart, selectionEnd } = textarea
    const selected = value.slice(selectionStart, selectionEnd)
    const before = value.slice(0, selectionStart)
    const after = value.slice(selectionEnd)
    const wrapped = `${prefix}${selected}${suffix}`
    setValue(before + wrapped + after)
    // Re-focus and position cursor
    setTimeout(() => {
      textarea.focus()
      const cursorPos = selectionStart + prefix.length + selected.length + (selected ? suffix.length : 0)
      textarea.setSelectionRange(
        selectionStart + prefix.length,
        selectionStart + prefix.length + selected.length
      )
    }, 0)
  }, [value])

  const insertListItem = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart } = textarea
    const before = value.slice(0, selectionStart)
    const after = value.slice(selectionStart)
    const needsNewline = before.length > 0 && !before.endsWith('\n')
    const insert = (needsNewline ? '\n' : '') + '- '
    setValue(before + insert + after)
    setTimeout(() => {
      textarea.focus()
      const pos = selectionStart + insert.length
      textarea.setSelectionRange(pos, pos)
    }, 0)
  }, [value])
  
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setValue(newValue)
      adjustHeight()
      if (onTyping) {
        onTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
          typingTimeoutRef.current = null
          onTyping(false)
        }, TYPING_DEBOUNCE_MS)
      }
    }
  }, [maxLength, adjustHeight, onTyping])
  
  // Handle file selection
  const handleFilesSelected = useCallback((files: File[]) => {
    const newPendingFiles: PendingAttachment[] = []
    
    for (const file of files) {
      // Check file count
      if (pendingFiles.length + newPendingFiles.length >= maxFiles) {
        console.warn(`Maximum ${maxFiles} files allowed`)
        break
      }
      
      // Check file size
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds ${maxFileSize / (1024 * 1024)}MB limit`)
        continue
      }
      
      // Create preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }
      
      newPendingFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview,
        progress: 0,
        status: 'pending',
      })
    }
    
    if (newPendingFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...newPendingFiles])
    }
  }, [pendingFiles.length, maxFiles, maxFileSize])
  
  // Remove pending file
  const handleRemoveFile = useCallback((id: string) => {
    setPendingFiles(prev => {
      const file = prev.find(f => f.id === id)
      // Revoke preview URL to prevent memory leaks
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }, [])
  
  // Handle send
  const handleSend = useCallback(async () => {
    const trimmed = value.trim()
    const hasContent = trimmed.length > 0
    const hasFiles = pendingFiles.length > 0
    
    if ((!hasContent && !hasFiles) || disabled || isSending) {
      return
    }
    
    setIsSending(true)
    
    try {
      // Get files to send
      const filesToSend = pendingFiles.map(p => p.file)
      
      // Call onSend
      await onSend(trimmed, filesToSend.length > 0 ? filesToSend : undefined)
      onTyping?.(false)
      
      // Clear input
      setValue('')
      
      // Clean up file previews
      pendingFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview)
      })
      setPendingFiles([])
      
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }, [value, pendingFiles, disabled, isSending, onSend])
  
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mentionActive = mentionOpen && filteredMentionContacts.length > 0

    if (mentionActive) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setValue((prev) => {
          const lastAt = prev.lastIndexOf('@')
          if (lastAt === -1) return prev
          return prev.slice(0, lastAt)
        })
        setMentionOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedMentionIndex((i) => (i + 1) % filteredMentionContacts.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedMentionIndex((i) => (i - 1 + filteredMentionContacts.length) % filteredMentionContacts.length)
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const c = filteredMentionContacts[focusedMentionIndex]
        if (c) insertMention(c.name ?? c.email ?? '')
        return
      }
    }

    // Cmd/Ctrl+Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
      return
    }

    // Enter without shift to send (when mention popover closed)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }

    // Shift+Enter allows new line (default behavior)
  }, [handleSend, mentionOpen, filteredMentionContacts, focusedMentionIndex, insertMention])
  
  const handleInsertCanned = useCallback(
    (body: string) => {
      setValue((prev) => (prev ? `${prev}\n${body}` : body))
      adjustHeight()
      onInsertCannedResponse?.(body)
      onTyping?.(true)
    },
    [adjustHeight, onInsertCannedResponse, onTyping]
  )

  const canSend = (value.trim().length > 0 || pendingFiles.length > 0) && !disabled && !isSending
  const hasPendingFiles = pendingFiles.length > 0
  const showCanned = cannedResponses && cannedResponses.length > 0 && !isAIChat

  return (
    <DropZone 
      onDrop={handleFilesSelected} 
      disabled={disabled || !showAttachments}
      className={cn('relative', className)}
    >
      {/* Pending attachments preview */}
      {hasPendingFiles && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex flex-wrap gap-4">
            {pendingFiles.map(attachment => (
              <AttachmentThumbnail
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemoveFile}
              />
            ))}
          </div>
        </div>
      )}
      
      <div className={cn('relative flex items-center gap-2 p-3', hasPendingFiles && 'pt-6')}>
        {/* Canned responses (Live tab) */}
        {showCanned && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                disabled={disabled || isSending}
                aria-label="Insert quick reply"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              {cannedResponses.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => handleInsertCanned(item.body)}
                  className="whitespace-pre-wrap text-left"
                >
                  {item.title || item.body.slice(0, 60) + (item.body.length > 60 ? '…' : '')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Formatting + Attach: 3x2 grid */}
        {!isAIChat && (
          <div className="grid grid-cols-3 grid-rows-2 gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => wrapWithMarkdown('**')}
              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="Bold (**text**)"
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => wrapWithMarkdown('*')}
              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="Italic (*text*)"
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => wrapWithMarkdown('~~')}
              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="Strikethrough (~~text~~)"
              aria-label="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => wrapWithMarkdown('`')}
              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="Inline code (`code`)"
              aria-label="Code"
            >
              <Code2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={insertListItem}
              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              title="List item (- item)"
              aria-label="List"
            >
              <List className="h-4 w-4" />
            </button>
            {showAttachments && (
              <AttachmentUploadButton
                onSelect={handleFilesSelected}
                disabled={disabled || isSending}
                accept={acceptedTypes}
                multiple
                className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors [&_svg]:h-4 [&_svg]:w-4"
              />
            )}
          </div>
        )}

        {/* Input container */}
        <div className="flex-1 relative min-w-0">
          <textarea
            ref={textareaRef}
            id={inputId}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            aria-label={placeholder || 'Message input'}
            rows={1}
            className={cn(
              'w-full resize-none rounded-2xl px-4 py-3 pr-4',
              'bg-[var(--surface-secondary)] border border-[var(--glass-border)]/50',
              'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          
          {/* @mention popover (Team tab) */}
          {mentionOpen && filteredMentionContacts.length > 0 && (
            <div
              className="absolute left-0 right-0 bottom-full mb-1 rounded-lg border border-[var(--glass-border)]/50 bg-[var(--surface-primary)] shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
              role="listbox"
              aria-label="Mention a contact"
            >
              {filteredMentionContacts.map((contact, idx) => (
                <button
                  key={contact.id}
                  ref={idx === focusedMentionIndex ? mentionOptionRef : null}
                  type="button"
                  role="option"
                  aria-selected={idx === focusedMentionIndex}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2',
                    idx === focusedMentionIndex
                      ? 'bg-[var(--surface-secondary)]'
                      : 'hover:bg-[var(--surface-secondary)]'
                  )}
                  onClick={() => insertMention(contact.name ?? contact.email ?? '')}
                  onMouseEnter={() => setFocusedMentionIndex(idx)}
                >
                  {contact.id === 'echo' ? (
                    <EchoLogo className="h-5 w-5 shrink-0" />
                  ) : null}
                  <span className="font-medium text-[var(--text-primary)]">@{contact.name || contact.email || 'Unknown'}</span>
                  {contact.email && contact.name && contact.id !== 'echo' && (
                    <span className="ml-2 text-xs text-[var(--text-tertiary)]">{contact.email}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Character count (show when approaching limit) */}
          {value.length > maxLength * 0.8 && (
            <span
              className={cn(
                'absolute right-3 bottom-3.5 text-xs',
                value.length > maxLength * 0.95
                  ? 'text-red-500'
                  : 'text-[var(--text-tertiary)]'
              )}
            >
              {value.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Send button - vertically centered with row */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'shrink-0 p-2.5 rounded-xl transition-all duration-200',
            canSend
              ? 'text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90 shadow-lg shadow-[var(--brand-primary)]/20'
              : 'text-[var(--text-tertiary)] bg-[var(--surface-tertiary)] cursor-not-allowed'
          )}
        >
          {isSending ? (
              <UptradeSpinner size="sm" className="gap-0 py-0 [&_svg]:m-0 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
        </button>
      </div>
    </DropZone>
  )
}
