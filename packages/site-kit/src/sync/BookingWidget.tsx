'use client'

/**
 * BookingWidget - Premium embeddable booking widget for client sites
 *
 * Calendly-inspired scheduling experience:
 * 1. Full month calendar for date selection
 * 2. Scrollable time-slot column
 * 3. Polished guest information form
 * 4. Animated booking confirmation
 *
 * Ships with self-contained CSS (no external deps) so it works on any site.
 *
 * @example
 * ```tsx
 * import { BookingWidget } from '@uptrademedia/site-kit'
 *
 * <BookingWidget
 *   orgSlug="manhattan-development-group"
 *   bookingTypeSlug="schedule-a-tour"
 *   hideTypeSelector
 *   onBookingComplete={(r) => console.log(r)}
 * />
 * ```
 */

import * as React from 'react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type {
  BookingWidgetProps,
  BookingType,
  TimeSlot,
  GuestInfo,
  BookingResult,
  SlotHold,
} from './types'
import {
  fetchBookingTypes,
  fetchBookingTypeDetails,
  fetchAvailability,
  createSlotHold,
  releaseSlotHold,
  createBooking,
  detectTimezone,
  formatTime,
  formatDate,
  formatDuration,
} from './api'

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://api.uptrademedia.com'
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
] as const

type BookingStep = 'type' | 'datetime' | 'form' | 'success'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isBeforeDay(a: Date, b: Date) {
  const ac = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const bc = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return ac < bc
}

function calendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const cells: (Date | null)[] = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null) // leading blanks
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  return cells
}

// ─── SVG Icons (inline, no deps) ──────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 4.5V8L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 8H14.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 1.5C9.66 3.34 10.61 5.62 10.61 8C10.61 10.38 9.66 12.66 8 14.5C6.34 12.66 5.39 10.38 5.39 8C5.39 5.62 6.34 3.34 8 1.5Z" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill="var(--bw-primary)"/>
      <path d="M18 28.5L24.5 35L38 21.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CalendarPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 1V4M11 1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8 9V12M6.5 10.5H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="bw-spinner">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="50.265" strokeDashoffset="25" opacity="0.3"/>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="50.265" strokeDashoffset="37.7"/>
    </svg>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BookingWidget({
  orgSlug,
  apiUrl = DEFAULT_API_URL,
  bookingTypeSlug,
  timezone: propTimezone,
  className = '',
  daysToShow = 60,
  onBookingComplete,
  onError,
  hideTypeSelector = false,
  styles = {},
}: BookingWidgetProps) {
  // ── State ──
  const [step, setStep] = useState<BookingStep>(bookingTypeSlug ? 'datetime' : 'type')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([])
  const [selectedType, setSelectedType] = useState<BookingType | null>(null)
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [confirmedSlot, setConfirmedSlot] = useState(false)
  const [hold, setHold] = useState<SlotHold | null>(null)
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '' })
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const slotsRef = useRef<HTMLDivElement>(null)
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const timezone = useMemo(() => propTimezone || detectTimezone(), [propTimezone])

  const shortTz = useMemo(() => {
    try {
      const parts = Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
        .formatToParts(new Date())
      return parts.find(p => p.type === 'timeZoneName')?.value || timezone
    } catch { return timezone }
  }, [timezone])

  // Calendar grid for the current view month
  const days = useMemo(() => calendarDays(viewMonth.getFullYear(), viewMonth.getMonth()), [viewMonth])
  const maxDate = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + daysToShow); return d }, [today, daysToShow])

  // ── Data Loading ──

  useEffect(() => {
    if (bookingTypeSlug) {
      setLoading(true)
      fetchBookingTypeDetails(orgSlug, bookingTypeSlug, apiUrl)
        .then(type => { setSelectedType(type); setStep('datetime') })
        .catch(err => { setError(err.message); onError?.(err) })
        .finally(() => setLoading(false))
    } else {
      setLoading(true)
      fetchBookingTypes(orgSlug, apiUrl)
        .then(types => setBookingTypes(types.filter(t => t.is_active)))
        .catch(err => { setError(err.message); onError?.(err) })
        .finally(() => setLoading(false))
    }
  }, [orgSlug, bookingTypeSlug, apiUrl, onError])

  useEffect(() => {
    if (!selectedDate || !selectedType) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    setSlotsLoading(true)
    setSlots([])
    setSelectedSlot(null)
    setConfirmedSlot(false)

    fetchAvailability(orgSlug, selectedType.slug, dateStr, apiUrl, timezone)
      .then(s => setSlots(s.filter(slot => slot.available)))
      .catch(err => { setError(err.message); onError?.(err) })
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, selectedType, orgSlug, apiUrl, timezone, onError])

  // ── Handlers ──

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot)
    setConfirmedSlot(false)
  }, [])

  const handleSlotConfirm = useCallback(async () => {
    if (!selectedType || !selectedSlot) return
    if (hold) await releaseSlotHold(hold.holdId, apiUrl).catch(() => {})

    setLoading(true)
    try {
      const newHold = await createSlotHold(selectedType.id, selectedSlot.start, selectedSlot.hostId, timezone, apiUrl)
      setHold(newHold)
      setConfirmedSlot(true)
      setStep('form')
    } catch (err: any) {
      setError(err.message)
      onError?.(err)
    } finally {
      setLoading(false)
    }
  }, [selectedType, selectedSlot, hold, timezone, apiUrl, onError])

  const handleBookingSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !selectedSlot) return
    setSubmitting(true)
    setError(null)

    try {
      const result = await createBooking(selectedType.id, selectedSlot.start, guestInfo, timezone, selectedSlot.hostId, hold?.holdId, apiUrl)
      setBookingResult(result)
      setStep('success')
      onBookingComplete?.(result)
    } catch (err: any) {
      setError(err.message)
      onError?.(err)
    } finally {
      setSubmitting(false)
    }
  }, [selectedType, selectedSlot, guestInfo, timezone, hold, apiUrl, onBookingComplete, onError])

  useEffect(() => {
    return () => { if (hold) releaseSlotHold(hold.holdId, apiUrl).catch(() => {}) }
  }, [hold, apiUrl])

  // ── Month Navigation ──

  const canGoPrev = viewMonth.getFullYear() > today.getFullYear() || viewMonth.getMonth() > today.getMonth()
  const canGoNext = viewMonth < maxDate

  const goMonth = (dir: -1 | 1) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1))
  }

  // ── Group slots by morning/afternoon ──

  const groupedSlots = useMemo(() => {
    const morning: TimeSlot[] = []
    const afternoon: TimeSlot[] = []
    const evening: TimeSlot[] = []
    for (const s of slots) {
      const h = new Date(s.start).getHours()
      if (h < 12) morning.push(s)
      else if (h < 17) afternoon.push(s)
      else evening.push(s)
    }
    return { morning, afternoon, evening }
  }, [slots])

  // ── CSS vars ──

  const cssVars = {
    '--bw-primary': styles.primaryColor || '#0069ff',
    '--bw-primary-light': styles.primaryColor
      ? `color-mix(in srgb, ${styles.primaryColor} 12%, white)`
      : '#e8f1ff',
    '--bw-primary-hover': styles.primaryColor
      ? `color-mix(in srgb, ${styles.primaryColor} 90%, black)`
      : '#0055d4',
    '--bw-radius': styles.borderRadius || '8px',
    '--bw-font': styles.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  } as React.CSSProperties

  // ── Render ──

  return (
    <div className={`bw-root ${className}`} style={cssVars}>
      {/* Error Toast */}
      {error && (
        <div className="bw-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error">&times;</button>
        </div>
      )}

      {/* ───── Type Selection ───── */}
      {step === 'type' && !hideTypeSelector && (
        <div className="bw-step bw-fade-in">
          <h2 className="bw-heading">Select a Service</h2>
          {loading ? (
            <div className="bw-loading"><SpinnerIcon /> Loading services...</div>
          ) : (
            <div className="bw-type-list">
              {bookingTypes.map(type => (
                <button
                  key={type.id}
                  className="bw-type-card"
                  onClick={() => { setSelectedType(type); setStep('datetime') }}
                >
                  <span className="bw-type-name">{type.name}</span>
                  {type.description && <span className="bw-type-desc">{type.description}</span>}
                  <span className="bw-type-meta">
                    <ClockIcon /> {formatDuration(type.duration_minutes)}
                    {type.price_cents ? ` · $${(type.price_cents / 100).toFixed(2)}` : ' · Free'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───── Date & Time ───── */}
      {step === 'datetime' && selectedType && (
        <div className="bw-step bw-fade-in">
          {/* Booking info header */}
          <div className="bw-info-header">
            {!bookingTypeSlug && (
              <button className="bw-back" onClick={() => { setSelectedType(null); setStep('type') }}>
                <ArrowLeftIcon />
              </button>
            )}
            <div>
              <h2 className="bw-heading">{selectedType.name}</h2>
              <div className="bw-meta-row">
                <span className="bw-badge"><ClockIcon /> {formatDuration(selectedType.duration_minutes)}</span>
                <span className="bw-badge"><GlobeIcon /> {shortTz}</span>
              </div>
            </div>
          </div>

          <div className="bw-datetime-layout">
            {/* Calendar */}
            <div className="bw-calendar">
              <div className="bw-cal-header">
                <button className="bw-cal-nav" onClick={() => goMonth(-1)} disabled={!canGoPrev} aria-label="Previous month">
                  <ChevronLeft />
                </button>
                <span className="bw-cal-title">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
                <button className="bw-cal-nav" onClick={() => goMonth(1)} disabled={!canGoNext} aria-label="Next month">
                  <ChevronRight />
                </button>
              </div>
              <div className="bw-cal-weekdays">
                {DAYS.map(d => <span key={d} className="bw-cal-wd">{d}</span>)}
              </div>
              <div className="bw-cal-grid">
                {days.map((date, i) => {
                  if (!date) return <span key={`e-${i}`} className="bw-cal-empty" />
                  const past = isBeforeDay(date, today)
                  const future = date > maxDate
                  const disabled = past || future
                  const sel = selectedDate && isSameDay(date, selectedDate)
                  const isToday = isSameDay(date, today)
                  return (
                    <button
                      key={date.toISOString()}
                      className={`bw-cal-day${sel ? ' selected' : ''}${isToday ? ' today' : ''}${disabled ? ' disabled' : ''}`}
                      onClick={() => !disabled && setSelectedDate(date)}
                      disabled={disabled}
                      aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      aria-pressed={sel || undefined}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots (appear when date selected) */}
            <div className={`bw-times${selectedDate ? ' visible' : ''}`} ref={slotsRef}>
              {!selectedDate ? (
                <div className="bw-times-placeholder">
                  <CalendarPlusIcon />
                  <span>Select a date to view available times</span>
                </div>
              ) : slotsLoading ? (
                <div className="bw-loading"><SpinnerIcon /> Loading times...</div>
              ) : slots.length === 0 ? (
                <div className="bw-times-empty">No available times on this date. Try another day.</div>
              ) : (
                <div className="bw-times-scroll">
                  <p className="bw-times-date">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  {groupedSlots.morning.length > 0 && (
                    <div className="bw-time-group">
                      <span className="bw-time-label">Morning</span>
                      {groupedSlots.morning.map(slot => (
                        <TimeButton key={slot.start} slot={slot} selected={selectedSlot?.start === slot.start} confirmed={confirmedSlot && selectedSlot?.start === slot.start} onClick={() => handleSlotSelect(slot)} onConfirm={handleSlotConfirm} timezone={timezone} loading={loading} />
                      ))}
                    </div>
                  )}
                  {groupedSlots.afternoon.length > 0 && (
                    <div className="bw-time-group">
                      <span className="bw-time-label">Afternoon</span>
                      {groupedSlots.afternoon.map(slot => (
                        <TimeButton key={slot.start} slot={slot} selected={selectedSlot?.start === slot.start} confirmed={confirmedSlot && selectedSlot?.start === slot.start} onClick={() => handleSlotSelect(slot)} onConfirm={handleSlotConfirm} timezone={timezone} loading={loading} />
                      ))}
                    </div>
                  )}
                  {groupedSlots.evening.length > 0 && (
                    <div className="bw-time-group">
                      <span className="bw-time-label">Evening</span>
                      {groupedSlots.evening.map(slot => (
                        <TimeButton key={slot.start} slot={slot} selected={selectedSlot?.start === slot.start} confirmed={confirmedSlot && selectedSlot?.start === slot.start} onClick={() => handleSlotSelect(slot)} onConfirm={handleSlotConfirm} timezone={timezone} loading={loading} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── Guest Form ───── */}
      {step === 'form' && selectedType && selectedSlot && (
        <div className="bw-step bw-fade-in">
          <div className="bw-info-header">
            <button className="bw-back" onClick={() => setStep('datetime')}>
              <ArrowLeftIcon />
            </button>
            <div>
              <h2 className="bw-heading">Your Details</h2>
              <div className="bw-meta-row">
                <span className="bw-badge"><ClockIcon /> {formatDuration(selectedType.duration_minutes)}</span>
                <span className="bw-badge-accent">
                  {formatDate(selectedSlot.start, timezone)} · {formatTime(selectedSlot.start, timezone)}
                </span>
              </div>
            </div>
          </div>

          {hold && (
            <div className="bw-hold-notice">
              <SpinnerIcon /> Slot held for you — complete your details to confirm.
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="bw-form">
            <div className="bw-field">
              <label htmlFor="bw-name">Name <span className="bw-req">*</span></label>
              <input
                id="bw-name"
                type="text"
                required
                value={guestInfo.name}
                onChange={e => setGuestInfo(p => ({ ...p, name: e.target.value }))}
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </div>
            <div className="bw-field">
              <label htmlFor="bw-email">Email <span className="bw-req">*</span></label>
              <input
                id="bw-email"
                type="email"
                required
                value={guestInfo.email}
                onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))}
                placeholder="jane@example.com"
                autoComplete="email"
              />
            </div>
            <div className="bw-field">
              <label htmlFor="bw-phone">Phone</label>
              <input
                id="bw-phone"
                type="tel"
                value={guestInfo.phone || ''}
                onChange={e => setGuestInfo(p => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
            </div>
            <div className="bw-field">
              <label htmlFor="bw-notes">Notes</label>
              <textarea
                id="bw-notes"
                value={guestInfo.notes || ''}
                onChange={e => setGuestInfo(p => ({ ...p, notes: e.target.value }))}
                placeholder="Anything you'd like us to know..."
                rows={3}
              />
            </div>
            <button type="submit" className="bw-submit" disabled={submitting || !guestInfo.name || !guestInfo.email}>
              {submitting ? <><SpinnerIcon /> Confirming...</> : 'Confirm Booking'}
            </button>
          </form>
        </div>
      )}

      {/* ───── Success ───── */}
      {step === 'success' && bookingResult && (
        <div className="bw-step bw-fade-in bw-success">
          <div className="bw-success-icon"><CheckCircleIcon /></div>
          <h2 className="bw-heading">You&rsquo;re Booked!</h2>
          <p className="bw-conf-code">{bookingResult.booking.confirmationCode}</p>

          <div className="bw-details-card">
            <div className="bw-detail-row">
              <span className="bw-detail-label">When</span>
              <span className="bw-detail-value">
                {formatDate(bookingResult.booking.scheduledAt, timezone)}<br/>
                {formatTime(bookingResult.booking.scheduledAt, timezone)} ({shortTz})
              </span>
            </div>
            <div className="bw-detail-row">
              <span className="bw-detail-label">Duration</span>
              <span className="bw-detail-value">{formatDuration(bookingResult.booking.durationMinutes)}</span>
            </div>
            {bookingResult.booking.hostName && (
              <div className="bw-detail-row">
                <span className="bw-detail-label">With</span>
                <span className="bw-detail-value">{bookingResult.booking.hostName}</span>
              </div>
            )}
          </div>

          <p className="bw-cal-links-label">Add to your calendar</p>
          <div className="bw-cal-links">
            <a href={bookingResult.calendarLinks.google} target="_blank" rel="noopener noreferrer" className="bw-cal-link">
              <CalendarPlusIcon /> Google
            </a>
            <a href={bookingResult.calendarLinks.outlook} target="_blank" rel="noopener noreferrer" className="bw-cal-link">
              <CalendarPlusIcon /> Outlook
            </a>
            <a href={bookingResult.calendarLinks.ics} download className="bw-cal-link">
              <CalendarPlusIcon /> iCal
            </a>
          </div>

          <p className="bw-email-notice">A confirmation email has been sent to <strong>{guestInfo.email}</strong>.</p>
        </div>
      )}

      {/* Loading overlay for initial type load */}
      {loading && step === 'datetime' && !selectedType && (
        <div className="bw-loading"><SpinnerIcon /> Loading...</div>
      )}

      <style>{WIDGET_CSS}</style>
    </div>
  )
}

// ─── TimeButton Sub-component ──────────────────────────────────────────────────

function TimeButton({
  slot, selected, confirmed, onClick, onConfirm, timezone, loading,
}: {
  slot: TimeSlot; selected: boolean; confirmed: boolean; onClick: () => void; onConfirm: () => void; timezone: string; loading: boolean
}) {
  if (selected && !confirmed) {
    return (
      <div className="bw-time-btn-wrap selected">
        <span className="bw-time-text">{formatTime(slot.start, timezone)}</span>
        <button className="bw-time-confirm" onClick={onConfirm} disabled={loading}>
          {loading ? <SpinnerIcon /> : 'Confirm'}
        </button>
      </div>
    )
  }
  return (
    <button className={`bw-time-btn${selected ? ' selected' : ''}`} onClick={onClick} disabled={loading}>
      {formatTime(slot.start, timezone)}
    </button>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const WIDGET_CSS = `
/* ── Base ── */
.bw-root {
  font-family: var(--bw-font);
  color: #1a1a1a;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}
.bw-root *, .bw-root *::before, .bw-root *::after { box-sizing: border-box; }

/* ── Animation ── */
@keyframes bw-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes bw-spin { to { transform: rotate(360deg); } }
.bw-fade-in { animation: bw-fade-in 0.25s ease-out; }
.bw-spinner { animation: bw-spin 0.8s linear infinite; }

/* ── Error ── */
.bw-error {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
  padding: 10px 14px; border-radius: var(--bw-radius); margin-bottom: 16px; font-size: 0.875rem;
}
.bw-error button { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.25rem; line-height: 1; padding: 0; }

/* ── Headings ── */
.bw-heading { font-size: 1.125rem; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
.bw-meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.bw-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.8125rem; color: #6b7280; font-weight: 400;
}
.bw-badge-accent {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.8125rem; color: var(--bw-primary); font-weight: 500;
}

/* ── Info Header ── */
.bw-info-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 20px; }
.bw-back {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb;
  background: #fff; cursor: pointer; color: #4b5563; flex-shrink: 0; margin-top: 1px;
  transition: all 0.15s;
}
.bw-back:hover { background: #f3f4f6; border-color: #d1d5db; }

/* ── Loading ── */
.bw-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 32px; color: #6b7280; font-size: 0.875rem;
}

/* ── Type Selection ── */
.bw-type-list { display: flex; flex-direction: column; gap: 10px; }
.bw-type-card {
  display: flex; flex-direction: column; text-align: left; gap: 4px;
  padding: 16px; border: 1.5px solid #e5e7eb; border-radius: var(--bw-radius);
  background: #fff; cursor: pointer; transition: all 0.15s;
}
.bw-type-card:hover { border-color: var(--bw-primary); box-shadow: 0 0 0 3px var(--bw-primary-light); }
.bw-type-name { font-weight: 600; font-size: 0.9375rem; }
.bw-type-desc { color: #6b7280; font-size: 0.8125rem; }
.bw-type-meta { display: flex; align-items: center; gap: 4px; font-size: 0.8125rem; color: #9ca3af; margin-top: 4px; }

/* ── Date-Time Layout ── */
.bw-datetime-layout {
  display: flex; gap: 0; border-top: 1px solid #f0f0f0; padding-top: 16px;
}
@media (max-width: 559px) {
  .bw-datetime-layout { flex-direction: column; }
}
@media (min-width: 560px) {
  .bw-datetime-layout { min-height: 340px; }
  .bw-calendar { flex: 1 1 auto; padding-right: 16px; border-right: 1px solid #f0f0f0; }
  .bw-times { width: 180px; flex-shrink: 0; padding-left: 16px; }
}

/* ── Calendar ── */
.bw-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.bw-cal-title { font-weight: 600; font-size: 0.9375rem; }
.bw-cal-nav {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: transparent; cursor: pointer; color: #374151; transition: background 0.15s;
}
.bw-cal-nav:hover:not(:disabled) { background: #f3f4f6; }
.bw-cal-nav:disabled { opacity: 0.25; cursor: default; }

.bw-cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0; text-align: center; margin-bottom: 4px; }
.bw-cal-wd { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; padding: 4px 0; }

.bw-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.bw-cal-empty { aspect-ratio: 1; }
.bw-cal-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: none; background: none; border-radius: 50%;
  font-size: 0.8125rem; font-weight: 500; cursor: pointer;
  color: #1a1a1a; transition: all 0.15s; position: relative;
}
.bw-cal-day:hover:not(.disabled):not(.selected) { background: #f3f4f6; }
.bw-cal-day.today:not(.selected)::after {
  content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
  width: 4px; height: 4px; border-radius: 50%; background: var(--bw-primary);
}
.bw-cal-day.selected {
  background: var(--bw-primary); color: #fff; font-weight: 600;
}
.bw-cal-day.disabled { color: #d1d5db; cursor: default; }

/* ── Time Slots ── */
.bw-times { transition: opacity 0.2s; }
.bw-times:not(.visible) { opacity: 0.5; }
.bw-times.visible { opacity: 1; }
.bw-times-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  height: 100%; min-height: 160px; color: #9ca3af; font-size: 0.8125rem; text-align: center; padding: 16px;
}
.bw-times-empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; min-height: 160px; color: #9ca3af; font-size: 0.8125rem; text-align: center; padding: 16px;
}
.bw-times-scroll { overflow-y: auto; max-height: 340px; }
.bw-times-date { font-weight: 600; font-size: 0.8125rem; color: #374151; margin: 0 0 12px 0; }
.bw-time-group { margin-bottom: 16px; }
.bw-time-label { display: block; font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }

.bw-time-btn {
  display: block; width: 100%;
  padding: 10px 12px; margin-bottom: 6px;
  border: 1.5px solid #e5e7eb; border-radius: var(--bw-radius);
  background: #fff; cursor: pointer;
  font-size: 0.875rem; font-weight: 500; color: var(--bw-primary); text-align: center;
  transition: all 0.15s;
}
.bw-time-btn:hover:not(:disabled) {
  border-color: var(--bw-primary); background: var(--bw-primary-light);
}
.bw-time-btn.selected {
  border-color: var(--bw-primary); background: var(--bw-primary); color: #fff;
}
.bw-time-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.bw-time-btn-wrap {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
  border: 1.5px solid var(--bw-primary); border-radius: var(--bw-radius); overflow: hidden;
  animation: bw-fade-in 0.15s ease-out;
}
.bw-time-btn-wrap .bw-time-text {
  flex: 1; padding: 10px 12px; font-size: 0.875rem; font-weight: 500; color: #374151; text-align: center;
  background: var(--bw-primary-light);
}
.bw-time-confirm {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  padding: 10px 16px; border: none;
  background: var(--bw-primary); color: #fff;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.bw-time-confirm:hover:not(:disabled) { background: var(--bw-primary-hover); }
.bw-time-confirm:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Form ── */
.bw-hold-notice {
  display: flex; align-items: center; gap: 8px;
  background: var(--bw-primary-light); color: var(--bw-primary);
  padding: 10px 14px; border-radius: var(--bw-radius);
  font-size: 0.8125rem; font-weight: 500; margin-bottom: 20px;
}
.bw-form { display: flex; flex-direction: column; gap: 16px; }
.bw-field label {
  display: block; font-size: 0.8125rem; font-weight: 500; color: #374151; margin-bottom: 4px;
}
.bw-req { color: #ef4444; }
.bw-field input, .bw-field textarea {
  display: block; width: 100%;
  padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: var(--bw-radius);
  font-size: 0.9375rem; font-family: inherit; color: #1a1a1a; background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.bw-field input::placeholder, .bw-field textarea::placeholder { color: #c0c5cc; }
.bw-field input:focus, .bw-field textarea:focus {
  outline: none; border-color: var(--bw-primary);
  box-shadow: 0 0 0 3px var(--bw-primary-light);
}
.bw-submit {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; margin-top: 4px;
  background: var(--bw-primary); color: #fff; border: none;
  border-radius: var(--bw-radius); font-size: 0.9375rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.bw-submit:hover:not(:disabled) { background: var(--bw-primary-hover); }
.bw-submit:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Success ── */
.bw-success { text-align: center; }
.bw-success-icon { margin: 0 auto 16px; width: 56px; height: 56px; animation: bw-fade-in 0.4s ease-out; }
.bw-conf-code {
  display: inline-block; font-family: 'SF Mono', 'Fira Code', monospace;
  background: #f3f4f6; padding: 6px 14px; border-radius: 6px;
  font-size: 0.8125rem; color: #6b7280; margin: 4px 0 20px; letter-spacing: 0.04em;
}

.bw-details-card {
  text-align: left; background: #f9fafb; border: 1px solid #f0f0f0;
  border-radius: var(--bw-radius); padding: 16px; margin-bottom: 20px;
}
.bw-detail-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.bw-detail-row:last-child { border-bottom: none; }
.bw-detail-label { width: 70px; flex-shrink: 0; font-size: 0.8125rem; color: #9ca3af; font-weight: 500; }
.bw-detail-value { font-size: 0.875rem; font-weight: 500; color: #374151; }

.bw-cal-links-label { font-size: 0.8125rem; color: #6b7280; margin: 0 0 8px 0; }
.bw-cal-links { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
.bw-cal-link {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1.5px solid #e5e7eb; border-radius: var(--bw-radius);
  text-decoration: none; color: #374151; font-size: 0.8125rem; font-weight: 500;
  transition: all 0.15s;
}
.bw-cal-link:hover { border-color: var(--bw-primary); color: var(--bw-primary); }

.bw-email-notice { font-size: 0.8125rem; color: #9ca3af; margin: 0; }
.bw-email-notice strong { color: #374151; font-weight: 500; }
`

export default BookingWidget
