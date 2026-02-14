/**
 * Sync Module Types - Booking Widget for Client Sites
 */

export interface BookingType {
  id: string
  slug: string
  name: string
  description?: string
  duration_minutes: number
  buffer_before?: number
  buffer_after?: number
  color?: string
  location_type: 'video' | 'phone' | 'in_person' | 'custom'
  location_details?: string
  price_cents?: number
  currency?: string
  is_active: boolean
}

export interface TimeSlot {
  start: string  // ISO datetime
  end: string    // ISO datetime
  hostId?: string
  available: boolean
}

export interface Host {
  id: string
  name: string
  email?: string
  avatar?: string
  title?: string
  bio?: string
}

export interface SlotHold {
  holdId: string
  expiresAt: string
  expiresInSeconds: number
}

export interface BookingResult {
  success: boolean
  booking: {
    id: string
    confirmationCode: string
    scheduledAt: string
    durationMinutes: number
    hostName?: string
    timezone: string
  }
  cancelUrl: string
  rescheduleUrl: string
  calendarLinks: {
    google: string
    outlook: string
    ics: string
  }
}

export interface BookingWidgetProps {
  /** Organization slug – required for public (unauthenticated) mode, optional with apiKey */
  orgSlug?: string
  
  /** API key – when provided, uses authenticated /sync/widget/* endpoints (no orgSlug needed) */
  apiKey?: string
  
  /** API base URL - defaults to https://api.uptrademedia.com */
  apiUrl?: string
  
  /** Specific booking type slug to show (optional - shows all if not provided) */
  bookingTypeSlug?: string
  
  /** Guest's timezone (auto-detected if not provided) */
  timezone?: string
  
  /** Custom class name for styling */
  className?: string
  
  /** Number of days to show availability for */
  daysToShow?: number
  
  /** Called when booking is completed */
  onBookingComplete?: (result: BookingResult) => void
  
  /** Called when an error occurs */
  onError?: (error: Error) => void
  
  /** Hide the booking type selector (for single type embed) */
  hideTypeSelector?: boolean
  
  /** Custom styles */
  styles?: {
    primaryColor?: string
    borderRadius?: string
    fontFamily?: string
  }
}

export interface DatePickerProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  availableDates: string[]  // YYYY-MM-DD format
  className?: string
}

export interface TimeSlotPickerProps {
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  onSlotSelect: (slot: TimeSlot) => void
  className?: string
  timezone: string
}

export interface BookingFormProps {
  onSubmit: (data: GuestInfo) => Promise<void>
  isLoading?: boolean
  className?: string
  bookingType?: BookingType
  selectedSlot?: TimeSlot
}

export interface GuestInfo {
  name: string
  email: string
  phone?: string
  notes?: string
}

export interface SyncWidgetConfig {
  apiUrl: string
  orgSlug: string
  timezone: string
}
