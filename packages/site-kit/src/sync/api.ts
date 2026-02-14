/**
 * Sync API Functions - Client-side API calls for booking widget
 *
 * Two modes:
 *   1. API-key flow (preferred): Uses x-api-key header → /sync/widget/* endpoints.
 *      Project is resolved server-side from the key. No orgSlug needed.
 *   2. Public/orgSlug flow (legacy): Uses /sync/public/:org/* endpoints. No auth.
 */

import type { 
  BookingType, 
  TimeSlot, 
  SlotHold, 
  BookingResult,
  GuestInfo,
} from './types'

const DEFAULT_API_URL = 'https://api.uptrademedia.com'

// ─────────────────────────────────────────────────────────────────────────────
// Config helper (same pattern as analytics, commerce, engage)
// ─────────────────────────────────────────────────────────────────────────────

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined'
    ? (window as any).__SITE_KIT_API_URL__ || DEFAULT_API_URL
    : DEFAULT_API_URL
  const apiKey = typeof window !== 'undefined'
    ? (window as any).__SITE_KIT_API_KEY__
    : undefined
  return { apiUrl, apiKey }
}

/** Build headers – always include Content-Type for POSTs; add x-api-key when available */
function buildHeaders(apiKey?: string, isPost = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (isPost) headers['Content-Type'] = 'application/json'
  if (apiKey) headers['x-api-key'] = apiKey
  return headers
}

// ─────────────────────────────────────────────────────────────────────────────
// Read endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch booking types.
 * - With apiKey → GET /sync/widget/types
 * - With orgSlug → GET /sync/public/:org/types
 */
export async function fetchBookingTypes(
  orgSlug?: string,
  apiUrl?: string,
  apiKey?: string,
): Promise<BookingType[]> {
  const cfg = getApiConfig()
  const url = apiUrl || cfg.apiUrl
  const key = apiKey || cfg.apiKey

  const endpoint = key
    ? `${url}/sync/widget/types`
    : `${url}/sync/public/${orgSlug}/types`

  const response = await fetch(endpoint, { headers: buildHeaders(key) })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch booking types: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.types || []
}

/**
 * Fetch booking type details
 */
export async function fetchBookingTypeDetails(
  typeSlug: string,
  orgSlug?: string,
  apiUrl?: string,
  apiKey?: string,
): Promise<BookingType> {
  const cfg = getApiConfig()
  const url = apiUrl || cfg.apiUrl
  const key = apiKey || cfg.apiKey

  const endpoint = key
    ? `${url}/sync/widget/types/${typeSlug}`
    : `${url}/sync/public/${orgSlug}/types/${typeSlug}`

  const response = await fetch(endpoint, { headers: buildHeaders(key) })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch booking type: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Fetch available time slots for a specific date
 */
export async function fetchAvailability(
  typeSlug: string,
  date: string, // YYYY-MM-DD format
  orgSlug?: string,
  apiUrl?: string,
  apiKey?: string,
  timezone?: string,
  hostId?: string,
): Promise<TimeSlot[]> {
  const cfg = getApiConfig()
  const url = apiUrl || cfg.apiUrl
  const key = apiKey || cfg.apiKey

  const params = new URLSearchParams({ date })
  if (timezone) params.append('timezone', timezone)
  if (hostId) params.append('hostId', hostId)

  const endpoint = key
    ? `${url}/sync/widget/availability/${typeSlug}?${params}`
    : `${url}/sync/public/${orgSlug}/availability/${typeSlug}?${params}`

  const response = await fetch(endpoint, { headers: buildHeaders(key) })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch availability: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.slots || []
}

// ─────────────────────────────────────────────────────────────────────────────
// Write endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hold a time slot temporarily (5-10 minutes)
 */
export async function createSlotHold(
  holdData: {
    bookingType: string
    slotStart: string
    slotEnd: string
    hostId: string
    sessionId: string
    guestEmail?: string
  },
  apiUrl?: string,
  apiKey?: string,
): Promise<SlotHold> {
  const cfg = getApiConfig()
  const url = apiUrl || cfg.apiUrl
  const key = apiKey || cfg.apiKey

  const endpoint = key
    ? `${url}/sync/widget/hold`
    : `${url}/sync/public/hold`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(key, true),
    body: JSON.stringify(holdData),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to hold slot: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Release a slot hold
 */
export async function releaseSlotHold(
  holdId: string,
  apiUrl?: string,
  apiKey?: string,
): Promise<void> {
  const cfg = getApiConfig()
  const url = apiUrl || cfg.apiUrl
  const key = apiKey || cfg.apiKey

  const endpoint = key
    ? `${url}/sync/widget/hold/${holdId}`
    : `${url}/sync/public/hold/${holdId}`

  await fetch(endpoint, {
    method: 'DELETE',
    headers: buildHeaders(key),
  })
}

/**
 * Create a booking
 */
export async function createBooking(
  bookingData: {
    bookingType: string
    scheduledAt: string
    hostId: string
    name: string
    email: string
    phone?: string
    company?: string
    message?: string
    source: string
    timezone?: string
    holdId?: string
    sessionId?: string
    sourceUrl?: string
  },
  apiUrl?: string,
  apiKey?: string,
): Promise<BookingResult> {
  const cfg = getApiConfig()
  const url = apiUrl || cfg.apiUrl
  const key = apiKey || cfg.apiKey

  const endpoint = key
    ? `${url}/sync/widget/booking`
    : `${url}/sync/public/booking`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(key, true),
    body: JSON.stringify(bookingData),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to create booking: ${response.statusText}`)
  }
  
  return response.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get available dates for a month (helper for calendar view)
 * Returns dates that have at least one available slot
 */
export async function fetchAvailableDates(
  typeSlug: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  orgSlug?: string,
  apiUrl?: string,
  apiKey?: string,
  timezone?: string,
): Promise<string[]> {
  const availableDates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const current = new Date(start)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    
    try {
      const slots = await fetchAvailability(typeSlug, dateStr, orgSlug, apiUrl, apiKey, timezone)
      if (slots.some(s => s.available)) {
        availableDates.push(dateStr)
      }
    } catch {
      // Skip dates that fail to load
    }
    
    current.setDate(current.getDate() + 1)
  }
  
  return availableDates
}

/**
 * Detect user's timezone
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York'
  }
}

/**
 * Format time for display
 */
export function formatTime(isoString: string, timezone: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  })
}

/**
 * Format date for display
 */
export function formatDate(isoString: string, timezone: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  })
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${hours}h ${mins}m`
}
