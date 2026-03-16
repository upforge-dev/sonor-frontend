/**
 * Chat Component Types
 * 
 * Matches the database schema (chatkit_threads, chatkit_items)
 * Uses snake_case to align with Supabase.
 */

export interface ChatKitThread {
  thread_id: string
  user_id: string
  org_id: string
  project_id?: string | null
  thread_type: 'echo' | 'user' | 'visitor'
  recipient_user_id?: string | null
  title?: string | null
  metadata?: Record<string, any> | null
  last_message_at?: string | null
  unread_count: number
  status: 'active' | 'archived' | 'closed'
  visitor_id?: string | null
  skill_key?: string | null
  is_pinned?: boolean
  created_at: string
  updated_at?: string
  
  // Joined data (not in DB, added by API)
  recipient?: {
    id: string
    email?: string
    name?: string
    full_name?: string  // alias for name
    avatar?: string
    avatar_url?: string  // alias for avatar
  } | null
  last_message_preview?: string | null
}

export interface MessageContent {
  type: 'text' | 'output_text' | 'input_text'
  text: string
}

/** One emoji reaction with count and user ids (for "who reacted"). */
export interface ItemReaction {
  emoji: string
  count: number
  user_ids: string[]
}

export interface ChatKitItem {
  id: string
  thread_id: string
  type: 'user_message' | 'assistant_message'
  content: MessageContent[] | string
  sender_id?: string | null
  parent_id?: string | null
  read_at?: string | null
  created_at: string
  edited_at?: string | null
  deleted_at?: string | null
  reactions?: ItemReaction[]
  sendFailed?: boolean

  // For display (computed)
  sender?: {
    id: string
    name?: string
    full_name?: string  // alias for name
    avatar?: string
    avatar_url?: string  // alias for avatar
  } | null
}

export interface TypingUser {
  user_id: string
  full_name?: string
  avatar_url?: string
}

// API Response types
export interface ThreadsResponse {
  data: ChatKitThread[]
  total?: number
}

export interface ItemsResponse {
  data: ChatKitItem[]
  has_more?: boolean
}

// WebSocket events
export interface ChatSocketEvents {
  'message:new': {
    thread_id: string
    message: ChatKitItem
  }
  'typing:started': {
    thread_id: string
    user_id: string
  }
  'typing:stopped': {
    thread_id: string
    user_id: string
  }
  'message:read': {
    thread_id: string
    message_id: string
    user_id: string
    read_at: string
  }
  'thread:update': {
    thread_id: string
    updates: Partial<ChatKitThread>
  }
  'reaction:added': {
    thread_id: string
    item_id: string
    emoji: string
    user_id: string
    reactions: ItemReaction[]
  }
  'reaction:removed': {
    thread_id: string
    item_id: string
    emoji: string
    user_id: string
    reactions: ItemReaction[]
  }
  'presence:change': {
    user_id: string
    status: 'online' | 'away' | 'dnd' | 'offline'
  }
}

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline'

// SSE Event types (for Echo streaming)
export interface SSEEvent {
  type: 
    | 'thread.created'
    | 'thread.item.start'
    | 'thread.item.delta'
    | 'thread.item.done'
    | 'response.done'
    | 'error'
  item?: {
    id: string
    type: string
    content?: MessageContent[]
  }
  delta?: {
    text?: string
    content_index?: number
  }
  error?: {
    message: string
  }
}
