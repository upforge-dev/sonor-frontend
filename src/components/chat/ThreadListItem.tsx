/**
 * ThreadListItem Component
 * 
 * Single thread preview in the thread list.
 * Features:
 * - Right-click context menu for pin/delete
 * - Hover three-dots menu for same actions
 */

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, User, Bot, MoreVertical, Pin, Trash2, PinOff, BellOff, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatKitThread } from './types'
import EchoLogo from '@/components/EchoLogo'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface ThreadListItemProps {
  thread: ChatKitThread
  isSelected: boolean
  onClick: () => void
  onPin?: (threadId: string, pinned: boolean) => Promise<void>
  onDelete?: (threadId: string) => Promise<void>
  /** Mute toggle (Phase 3.4.1). */
  onMute?: (threadId: string, muted: boolean) => Promise<void>
  /** Presence (Phase 2.10). (userId) => status. */
  presenceFor?: (userId: string) => string
  className?: string
}

export function ThreadListItem({
  thread,
  isSelected,
  onClick,
  onPin,
  onDelete,
  onMute,
  presenceFor,
  className,
}: ThreadListItemProps) {
  const recipientUserId = thread.recipient_user_id ?? thread.recipient?.id ?? null
  const presenceStatus = recipientUserId && presenceFor ? presenceFor(recipientUserId) : null
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  
  const isEcho = thread.thread_type === 'echo'
  const isVisitor = thread.thread_type === 'visitor'
  const isPinned = thread.is_pinned || false
  const isMuted = (thread as { is_muted?: boolean }).is_muted || false
  
  // Format timestamp
  const timeAgo = useMemo(() => {
    if (!thread.last_message_at) return null
    return formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false })
  }, [thread.last_message_at])
  
  // Get display title
  const title = useMemo(() => {
    if (thread.title) return thread.title
    if (isEcho) return 'New conversation'
    // Support both name and full_name from API
    if (thread.recipient?.name) return thread.recipient.name
    if (thread.recipient?.full_name) return thread.recipient.full_name
    if (thread.recipient?.email) return thread.recipient.email
    if (isVisitor) return `Visitor ${thread.visitor_id?.slice(0, 8) || 'Unknown'}`
    return 'Untitled'
  }, [thread, isEcho, isVisitor])
  
  // Get preview text
  const preview = thread.last_message_preview || thread.metadata?.last_message_preview || ''
  
  const stableThreadId = thread.thread_id || (thread as { id?: string }).id || ''
  const handlePin = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (onPin && stableThreadId) await onPin(stableThreadId, !isPinned)
  }
  
  const handleDelete = async () => {
    if (onDelete && stableThreadId) await onDelete(stableThreadId)
    setShowDeleteConfirm(false)
  }

  const handleMute = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (onMute && stableThreadId) await onMute(stableThreadId, !isMuted)
  }

  // Menu items shared between context menu and dropdown
  const MenuItems = ({ isContext = false }: { isContext?: boolean }) => {
    const Item = isContext ? ContextMenuItem : DropdownMenuItem
    const Separator = isContext ? ContextMenuSeparator : DropdownMenuSeparator
    
    return (
      <>
        <Item 
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            handlePin()
          }}
          className="cursor-pointer"
        >
          {isPinned ? (
            <>
              <PinOff className="h-4 w-4 mr-2" />
              Unpin conversation
            </>
          ) : (
            <>
              <Pin className="h-4 w-4 mr-2" />
              Pin conversation
            </>
          )}
        </Item>
        {onMute && (
          <Item 
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              handleMute()
            }}
            className="cursor-pointer"
          >
            {isMuted ? (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Unmute conversation
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Mute conversation
              </>
            )}
          </Item>
        )}
        <Separator />
        <Item 
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            setShowDeleteConfirm(true)
          }}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete conversation
        </Item>
      </>
    )
  }
  
  const itemContent = (
    <div
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 cursor-pointer group relative',
        isSelected
          ? 'bg-[color-mix(in_srgb,var(--brand-primary)_15%,transparent)] border border-[var(--brand-primary)]/30'
          : 'hover:bg-[var(--surface-secondary)] border border-transparent',
        className
      )}
    >
      {/* Pin / Muted indicators */}
      {(isPinned || isMuted) && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5">
          {isPinned && <Pin className="h-3 w-3 text-[var(--brand-primary)]" />}
          {isMuted && <BellOff className="h-3 w-3 text-[var(--text-tertiary)]" />}
        </div>
      )}
      
      {/* Avatar + presence (Phase 2.10) */}
      <div className="flex-shrink-0 relative">
        {isEcho ? (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]">
            <EchoLogo size={24} />
          </div>
        ) : (thread.recipient?.avatar || thread.recipient?.avatar_url) ? (
          <img
            src={thread.recipient.avatar || thread.recipient.avatar_url}
            alt={title}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : isVisitor ? (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/10">
            <MessageCircle className="h-5 w-5 text-orange-500" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface-tertiary)]">
            <User className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>
        )}
        {!isEcho && !isVisitor && presenceStatus && presenceStatus !== 'offline' && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-primary)]',
              presenceStatus === 'online' && 'bg-emerald-500',
              presenceStatus === 'away' && 'bg-amber-500',
              presenceStatus === 'dnd' && 'bg-red-500'
            )}
            aria-label={presenceStatus}
          />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium truncate',
            thread.unread_count > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
          )}>
            {title}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {timeAgo && !isHovered && !menuOpen && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {timeAgo}
              </span>
            )}
            
            {/* Three-dots menu on hover */}
            {(isHovered || menuOpen) && (onPin || onDelete) && (
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-md hover:bg-[var(--surface-tertiary)] transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <MenuItems />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {preview && (
          <p className={cn(
            'text-sm truncate mt-0.5',
            thread.unread_count > 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
          )}>
            {preview}
          </p>
        )}
        
        {/* Unread badge + skill indicator */}
        <div className="flex items-center gap-2 mt-1">
          {thread.unread_count > 0 && (
            <span 
              className="px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {thread.unread_count}
            </span>
          )}
          
          {isEcho && thread.skill_key && thread.skill_key !== 'router' && (
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-tertiary)] px-2 py-0.5 rounded-full">
              {thread.skill_key}
            </span>
          )}
          
          {isVisitor && (
            <span className="text-xs text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
  
  // Wrap with context menu if handlers are provided
  if (onPin || onDelete) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {itemContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-[180px]">
          <MenuItems isContext />
        </ContextMenuContent>
      </ContextMenu>
    )
  }
  
  return itemContent
}
