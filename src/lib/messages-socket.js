/**
 * Messages Socket.io Client
 * 
 * Handles real-time WebSocket connection to Portal API for:
 * - Message delivery (new, edited, deleted)
 * - Read receipts
 * - Typing indicators
 * - Presence (online/offline)
 * - Reactions
 * 
 * Replaces Supabase Realtime for messages.
 */
import { io } from 'socket.io-client'

const PORTAL_API_URL = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || 'https://api.sonor.io'

let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30000

// Event handlers registry
const handlers = {
  onConnect: null,
  onDisconnect: null,
  onMessage: null,
  onMessageEdited: null,
  onMessageDeleted: null,
  onMessageRead: null,
  onMessageDelivered: null,
  onTyping: null,
  onPresence: null,
  onPresenceBulk: null,
  onReactionAdded: null,
  onReactionRemoved: null,
  onEngageMessage: null,
  onEngageSession: null,
}

/**
 * Connect to the messages WebSocket namespace
 */
export function connectSocket(token, options = {}) {
  if (socket?.connected) {
    console.log('[Socket] Already connected')
    return socket
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect()
  }

  console.log('[Socket] Connecting to', `${PORTAL_API_URL}/messages`)

  socket = io(`${PORTAL_API_URL}/messages`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    timeout: 20000,
    autoConnect: true,
  })

  // Connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected, socket id:', socket.id)
    reconnectAttempts = 0
    
    // Authenticate and join rooms
    socket.emit('auth:init')
    
    handlers.onConnect?.()
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
    handlers.onDisconnect?.(reason)
  })

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message)
    reconnectAttempts++
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
    // Re-authenticate on reconnect
    socket.emit('auth:init')
  })

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Socket] Reconnection attempt', attemptNumber)
  })

  // Message events
  socket.on('message:new', (message) => {
    console.log('[Socket] New message:', message.id)
    handlers.onMessage?.(message)
  })

  socket.on('message:edited', (data) => {
    console.log('[Socket] Message edited:', data.messageId)
    handlers.onMessageEdited?.(data)
  })

  socket.on('message:deleted', (data) => {
    console.log('[Socket] Message deleted:', data.messageId)
    handlers.onMessageDeleted?.(data)
  })

  socket.on('message:read', (data) => {
    console.log('[Socket] Message read:', data.messageId)
    handlers.onMessageRead?.(data)
  })

  socket.on('message:delivered', (data) => {
    console.log('[Socket] Message delivered:', data.messageId)
    handlers.onMessageDelivered?.(data)
  })

  // Typing events
  socket.on('typing', (data) => {
    handlers.onTyping?.(data)
  })

  // Presence events
  socket.on('presence', (data) => {
    handlers.onPresence?.(data)
  })

  socket.on('presence:bulk', (data) => {
    handlers.onPresenceBulk?.(data)
  })

  // Reaction events
  socket.on('reaction:added', (data) => {
    handlers.onReactionAdded?.(data)
  })

  socket.on('reaction:removed', (data) => {
    handlers.onReactionRemoved?.(data)
  })

  // Engage (live chat) events
  socket.on('engage:message', (data) => {
    console.log('[Socket] Engage message:', data)
    handlers.onEngageMessage?.(data)
  })

  socket.on('engage:session', (data) => {
    console.log('[Socket] Engage session update:', data)
    handlers.onEngageSession?.(data)
  })

  return socket
}

/**
 * Disconnect from the WebSocket
 */
export function disconnectSocket() {
  if (socket) {
    console.log('[Socket] Disconnecting...')
    socket.disconnect()
    socket = null
  }
}

/**
 * Get the current socket instance
 */
export function getSocket() {
  return socket
}

/**
 * Check if socket is connected
 */
export function isConnected() {
  return socket?.connected ?? false
}

/**
 * Register event handlers
 */
export function setHandlers(newHandlers) {
  Object.assign(handlers, newHandlers)
}

/**
 * Emit typing indicator
 */
export function emitTyping(conversationId, isTyping) {
  if (!socket?.connected) return
  
  socket.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId })
}

/**
 * Emit message read
 */
export function emitMessageRead(messageId) {
  if (!socket?.connected) return
  
  socket.emit('message:read', { messageId })
}

/**
 * Emit message delivered (acknowledge receipt)
 */
export function emitMessageDelivered(messageId) {
  if (!socket?.connected) return
  
  socket.emit('message:delivered', { messageId })
}

/**
 * Emit presence heartbeat
 */
export function emitHeartbeat() {
  if (!socket?.connected) return
  
  socket.emit('presence:heartbeat')
}

/**
 * Add reaction via socket
 */
export function emitAddReaction(messageId, emoji) {
  if (!socket?.connected) return
  
  socket.emit('reaction:add', { messageId, emoji })
}

/**
 * Remove reaction via socket
 */
export function emitRemoveReaction(messageId, emoji) {
  if (!socket?.connected) return
  
  socket.emit('reaction:remove', { messageId, emoji })
}

/**
 * Join a thread room for focused updates
 */
export function joinThread(messageId) {
  if (!socket?.connected) return
  
  socket.emit('thread:join', { messageId })
}

/**
 * Leave a thread room
 */
export function leaveThread(messageId) {
  if (!socket?.connected) return
  
  socket.emit('thread:leave', { messageId })
}

/**
 * Save draft via socket (auto-save)
 */
export function emitSaveDraft(conversationId, content) {
  if (!socket?.connected) return
  
  socket.emit('draft:save', { conversationId, content })
}

// Heartbeat interval (keep presence alive)
let heartbeatInterval = null

export function startHeartbeat() {
  if (heartbeatInterval) return
  
  heartbeatInterval = setInterval(() => {
    emitHeartbeat()
  }, 60000) // Every minute
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

export default {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket,
  isConnected,
  setHandlers,
  emitTyping,
  emitMessageRead,
  emitMessageDelivered,
  emitHeartbeat,
  emitAddReaction,
  emitRemoveReaction,
  joinThread,
  leaveThread,
  emitSaveDraft,
  startHeartbeat,
  stopHeartbeat,
}
