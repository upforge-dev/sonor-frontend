/**
 * Messages Query Hooks
 *
 * React Query hooks for the Messages module (legacy messages API).
 * Replaces messages-store.js data fetching with automatic caching.
 *
 * Note: MessagesModuleV2 uses useEchoChat, usePortalChat, useEngageLiveChat (ChatKit).
 * These hooks support Sidebar badge and the /messages API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '../sonor-api'
import useAuthStore from '../auth-store'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const messagesKeys = {
  all: ['messages'],
  conversations: () => [...messagesKeys.all, 'conversations'],
  contacts: () => [...messagesKeys.all, 'contacts'],
  list: (filters) => [...messagesKeys.all, 'list', filters],
  unreadCount: () => [...messagesKeys.all, 'unreadCount'],
  thread: (id) => [...messagesKeys.all, 'thread', id],
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function useConversations(options = {}) {
  return useQuery({
    queryKey: messagesKeys.conversations(),
    queryFn: async () => {
      const response = await messagesApi.getConversations()
      const data = response?.data || response || {}
      return Array.isArray(data) ? data : (data.data || data.conversations || [])
    },
    staleTime: 1000 * 60 * 2, // 2 min
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════════════════

export function useMessagesContacts(options = {}) {
  return useQuery({
    queryKey: messagesKeys.contacts(),
    queryFn: async () => {
      const response = await messagesApi.getContacts()
      const data = response?.data || response || {}
      return data.contacts || data.data?.contacts || []
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

export function useMessages(filters = {}, options = {}) {
  return useQuery({
    queryKey: messagesKeys.list(filters),
    queryFn: async () => {
      const response = await messagesApi.getMessages(filters)
      const data = response?.data || response || {}
      return {
        messages: data.messages || data.data?.messages || [],
        nextCursor: data.nextCursor,
        prevCursor: data.prevCursor,
        hasMore: data.hasMore,
      }
    },
    staleTime: 1000 * 60,
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════════════════

export function useUnreadMessagesCount(options = {}) {
  const contact = useAuthStore((s) => s.contact)
  const contactId = contact?.id

  return useQuery({
    queryKey: [...messagesKeys.unreadCount(), contactId],
    queryFn: async () => {
      try {
        const response = await messagesApi.getMessages({ limit: 100 })
        const data = response?.data || response || {}
        const messages = data.messages || data.data?.messages || []
        if (!Array.isArray(messages)) return 0
        // Only count messages where the current user is the recipient and hasn't read
        return messages.filter((m) => {
          const isUnread = !m.readAt && !m.read_at
          const isForMe = contactId ? (m.recipient_id === contactId || m.recipientId === contactId) : true
          return isUnread && isForMe
        }).length
      } catch {
        return 0
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!contactId, // don't fetch until we know the user
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => messagesApi.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() })
      queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
    },
  })
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (messageId) => messagesApi.markAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
    },
  })
}

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (partnerId) => messagesApi.markConversationAsRead(partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKeys.unreadCount() })
      queryClient.invalidateQueries({ queryKey: messagesKeys.conversations() })
      queryClient.invalidateQueries({ queryKey: messagesKeys.list() })
    },
  })
}

export function useRefreshMessages() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: messagesKeys.all })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ECHO HELPERS (for ChatBubbles / legacy Echo UI)
// ═══════════════════════════════════════════════════════════════════════════

/** Get Echo contact from contacts list */
export function useEchoContact(options = {}) {
  const { data: contacts = [] } = useMessagesContacts(options)
  return contacts.find((c) => c.is_ai === true || c.contact_type === 'ai') || null
}
