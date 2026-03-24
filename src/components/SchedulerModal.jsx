// src/components/SchedulerModal.jsx
// Universal scheduler for booking consultations with Sonor
// Calls Portal API for availability (synced with internal calendar)
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MessageSquare,
  Check,
  Loader2,
  Sparkles,
  Video,
  CalendarDays
} from 'lucide-react'

// Portal API base URL for availability and booking
const API_BASE = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || 'https://api.sonor.io'

// Time slots available for booking (Eastern Time)
const TIME_SLOTS = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
]

// Meeting types
const MEETING_TYPES = [
  {
    id: 'audit',
    name: 'Website Audit Review',
    duration: '30 min',
    description: 'Review your audit results and discuss improvement strategies',
    icon: Check,
  },
  {
    id: 'web-design',
    name: 'Web Design Consultation',
    duration: '30 min',
    description: 'Discuss your website project, goals, and get a custom proposal',
    icon: Sparkles,
  },
  {
    id: 'marketing',
    name: 'Marketing Strategy Call',
    duration: '30 min',
    description: 'Review your marketing goals and explore growth opportunities',
    icon: CalendarDays,
  },
  {
    id: 'general',
    name: 'General Consultation',
    duration: '30 min',
    description: 'Discuss your project needs and how we can help',
    icon: MessageSquare,
  },
]

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()
  
  const days = []
  
  // Previous month days
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startingDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    })
  }
  
  // Next month days to complete the grid
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    })
  }
  
  return days
}

function isDateAvailable(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  
  // Not available if in the past
  if (checkDate < today) return false
  
  // Not available on weekends
  const dayOfWeek = checkDate.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return false
  
  // Not available if less than 24 hours from now
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (checkDate < tomorrow) return false
  
  return true
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Get next 14 available days for mobile list view
function getNextAvailableDays(count = 14) {
  const days = []
  let current = new Date()
  current.setDate(current.getDate() + 1) // Start from tomorrow
  
  while (days.length < count) {
    if (isDateAvailable(current)) {
      days.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function SchedulerModal({ 
  isOpen, 
  onClose, 
  title = "Schedule Your Consultation",
  description = "Book a time that works for you",
  defaultMeetingType = 'audit',
  auditContext = null, // { auditId, targetUrl, grade } - context from audit page
  prefillData = null // { name, email, company } - prefill form data
}) {
  const [step, setStep] = useState(1) // 1: Calendar, 2: Time, 3: Details, 4: Confirmation
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedMeetingType, setSelectedMeetingType] = useState(defaultMeetingType)
  const [bookedSlots, setBookedSlots] = useState([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingError, setBookingError] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Calendar state
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  
  // Form state - prefill if data provided
  const [formData, setFormData] = useState({
    name: prefillData?.name || '',
    email: prefillData?.email || '',
    phone: prefillData?.phone || '',
    company: prefillData?.company || '',
    message: auditContext 
      ? `I'd like to review my website audit results for ${auditContext.targetUrl} (Grade: ${auditContext.grade || 'N/A'})`
      : '',
  })

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch booked slots when date changes
  useEffect(() => {
    if (selectedDate) {
      setIsLoadingSlots(true)
      const dateStr = selectedDate.toISOString().split('T')[0]
      fetch(`${API_BASE}/booking/availability?date=${dateStr}&type=${selectedMeetingType}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(data => {
          // New API returns slots array with available boolean
          if (data.slots) {
            const booked = data.slots.filter(s => !s.available).map(s => s.time)
            setBookedSlots(booked)
          } else {
            setBookedSlots(data.bookedSlots || [])
          }
        })
        .catch(err => {
          console.error('Failed to fetch availability:', err)
          setBookedSlots([])
        })
        .finally(() => setIsLoadingSlots(false))
    }
  }, [selectedDate, selectedMeetingType])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1)
        setSelectedDate(null)
        setSelectedTime(null)
        setBookingComplete(false)
        setBookingError(null)
        // Keep prefilled data
        if (prefillData) {
          setFormData({
            name: prefillData.name || '',
            email: prefillData.email || '',
            phone: prefillData.phone || '',
            company: prefillData.company || '',
            message: auditContext 
              ? `I'd like to review my website audit results for ${auditContext.targetUrl} (Grade: ${auditContext.grade || 'N/A'})`
              : '',
          })
        } else {
          setFormData({ name: '', email: '', phone: '', company: '', message: '' })
        }
      }, 300)
    }
  }, [isOpen, prefillData, auditContext])

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setBookingError(null)
    
    try {
      const response = await fetch(`${API_BASE}/booking/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: selectedMeetingType,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          message: formData.message,
          source: auditContext ? 'audit_page' : 'portal',
          sourceUrl: window.location.href,
          auditId: auditContext?.auditId,
          auditContext: auditContext ? JSON.stringify(auditContext) : null,
        }),
      })
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error. Please try again or contact us directly.')
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment')
      }
      
      setBookingComplete(true)
      setStep(4)
    } catch (error) {
      setBookingError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const days = getMonthDays(currentYear, currentMonth)
  const availableDays = getNextAvailableDays(14)
  const meetingType = MEETING_TYPES.find(t => t.id === selectedMeetingType) || MEETING_TYPES[0]

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg max-h-[95vh] sm:max-h-[85vh] bg-[var(--surface-page)] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[var(--glass-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="Close scheduler"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] px-4 py-4 sm:px-6 sm:py-5 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{title}</h2>
              <p className="text-white text-xs sm:text-sm truncate opacity-80">{meetingType.duration} • Video Call</p>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-1 mt-4">
            {['Date', 'Time', 'Info', 'Done'].map((label, i) => (
              <div key={label} className="flex-1 flex items-center">
                <div className={`flex-1 h-1 rounded-full transition-all ${
                  step > i + 1 ? 'bg-white' : step === i + 1 ? 'bg-white opacity-60' : 'bg-white opacity-20'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs mt-1 text-white opacity-70 px-1">
            <span>Date</span>
            <span>Time</span>
            <span>Info</span>
            <span>Done</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Calendar / Date List */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Select a Date</h3>
                
                {/* Mobile: Scrollable List View */}
                {isMobile ? (
                  <div className="space-y-2">
                    {availableDays.map((date, index) => {
                      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(date)}
                          className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                            isSelected 
                              ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-lg' 
                              : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border border-[var(--glass-border)]'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-white/20' : 'bg-[var(--surface-page)]'
                          }`}>
                            <span className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                              {date.toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <p className={`text-sm truncate ${isSelected ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
                              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-white flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  /* Desktop: Compact Calendar Grid */
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <button 
                        onClick={prevMonth}
                        className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                        {MONTHS[currentMonth]} {currentYear}
                      </h4>
                      <button 
                        onClick={nextMonth}
                        className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {WEEKDAYS.map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-[var(--text-tertiary)] py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {days.map((dayInfo, index) => {
                        const isAvailable = dayInfo.isCurrentMonth && isDateAvailable(dayInfo.date)
                        const isSelected = selectedDate && 
                          dayInfo.date.toDateString() === selectedDate.toDateString()
                        
                        return (
                          <button
                            key={index}
                            onClick={() => isAvailable && setSelectedDate(dayInfo.date)}
                            disabled={!isAvailable}
                            className={`
                              aspect-square rounded-lg text-xs font-medium transition-all p-1 relative
                              ${!dayInfo.isCurrentMonth ? 'text-[var(--text-tertiary)]/30' : ''}
                              ${isAvailable && !isSelected ? 'text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]' : ''}
                              ${!isAvailable && dayInfo.isCurrentMonth ? 'text-[var(--text-tertiary)]/50 bg-[var(--glass-bg)] cursor-not-allowed line-through' : ''}
                              ${isSelected ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-md' : ''}
                            `}
                          >
                            {dayInfo.day}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Selected Date Confirmation */}
                {selectedDate && (
                  <div className="mt-4 p-3 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                      <span className="font-medium text-[var(--text-primary)] text-sm">{formatDate(selectedDate)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Time Selection */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                    aria-label="Back to calendar"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Select a Time</h3>
                </div>

                <div className="mb-3 p-2.5 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)]">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span className="font-medium text-[var(--text-primary)]">{formatShortDate(selectedDate)}</span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--text-secondary)]">Eastern Time</span>
                  </div>
                </div>

                {isLoadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[var(--brand-primary)] animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((time) => {
                      const isBooked = bookedSlots.includes(time)
                      const isSelected = selectedTime === time
                      
                      return (
                        <button
                          key={time}
                          onClick={() => !isBooked && setSelectedTime(time)}
                          disabled={isBooked}
                          className={`
                            p-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${isBooked ? 'bg-[var(--glass-bg)] text-[var(--text-tertiary)] cursor-not-allowed line-through' : ''}
                            ${!isBooked && !isSelected ? 'bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] border border-[var(--glass-border)]' : ''}
                            ${isSelected ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-md' : ''}
                          `}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {time}
                        </button>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Contact Details */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setStep(2)}
                    className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] transition-colors"
                    aria-label="Back to time selection"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Your Details</h3>
                </div>

                {/* Booking Summary */}
                <div className="mb-4 p-2.5 bg-[var(--glass-bg)] rounded-xl flex items-center gap-3 text-sm border border-[var(--glass-border)]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span className="font-medium text-[var(--text-primary)]">{formatShortDate(selectedDate)}</span>
                  </div>
                  <span className="text-[var(--text-tertiary)]">|</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span className="font-medium text-[var(--text-primary)]">{selectedTime}</span>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 outline-none transition-all text-sm"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 outline-none transition-all text-sm"
                        placeholder="Acme Inc."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 outline-none transition-all text-sm"
                      placeholder="john@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 outline-none transition-all text-sm"
                      placeholder="(513) 555-1234"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">What can we help with?</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 outline-none transition-all resize-none text-sm"
                      placeholder="Tell us about your project..."
                    />
                  </div>
                </div>

                {bookingError && (
                  <div className="mt-3 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-xl text-[var(--accent-red)] text-xs">
                    {bookingError}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">You're All Set!</h3>
                <p className="text-[var(--text-secondary)] text-sm mb-4">
                  Confirmation sent to {formData.email}
                </p>

                <div className="bg-[var(--glass-bg)] rounded-xl p-4 mb-4 text-left border border-[var(--glass-border)]">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="font-medium text-[var(--text-primary)]">{formatShortDate(selectedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="font-medium text-[var(--text-primary)]">{selectedTime} ET</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="font-medium text-[var(--text-primary)]">Google Meet (link in email)</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-tertiary)] mb-4">
                  Check your email for the calendar invite with video call link.
                </p>

                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with Actions */}
        {step !== 4 && (
          <div className="flex-shrink-0 border-t border-[var(--glass-border)] p-4 bg-[var(--glass-bg)]">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-[var(--text-primary)] bg-[var(--surface-page)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-colors text-sm"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 3) {
                    handleSubmit()
                  } else {
                    setStep(step + 1)
                  }
                }}
                disabled={
                  (step === 1 && !selectedDate) ||
                  (step === 2 && !selectedTime) ||
                  (step === 3 && (!formData.name || !formData.email)) ||
                  isSubmitting
                }
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : step === 3 ? (
                  <>
                    Confirm Booking
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
