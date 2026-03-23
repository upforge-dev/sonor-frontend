// src/components/sync/SyncCalendarView.jsx
// Calendar view component for Sync module
// Shows events, bookings, blocked time in day/week/month views

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Video,
  Users,
  Phone,
  MapPin,
  Focus,
  Coffee,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Sparkles,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncCalendarView({ data, date, viewMode, signalEnabled, onRefresh }) {
  const [hoveredEvent, setHoveredEvent] = useState(null)
  
  // Parse events
  const events = useMemo(() => {
    if (!data?.events) return []
    
    return data.events.map(event => ({
      ...event,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
    })).sort((a, b) => a.startTime - b.startTime)
  }, [data?.events])
  
  // Business hours for timeline (day view)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM
  
  // Current time
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isToday = date.toDateString() === now.toDateString()
  
  // Get event type config
  const getEventConfig = (type, source) => {
    if (type === 'focus' || type === 'focus_block') {
      return {
        icon: Focus,
        bg: 'bg-emerald-100 dark:bg-emerald-500/20',
        border: 'border-emerald-300 dark:border-emerald-500/30',
        text: 'text-emerald-700 dark:text-emerald-400',
      }
    }
    if (type === 'meeting' || source === 'booking') {
      return {
        icon: Video,
        bg: 'bg-blue-100 dark:bg-blue-500/20',
        border: 'border-blue-300 dark:border-blue-500/30',
        text: 'text-blue-700 dark:text-blue-400',
      }
    }
    if (type === 'break') {
      return {
        icon: Coffee,
        bg: 'bg-amber-100 dark:bg-amber-500/20',
        border: 'border-amber-300 dark:border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-400',
      }
    }
    if (type === 'work' || type === 'project_work') {
      return {
        icon: Briefcase,
        bg: 'bg-purple-100 dark:bg-purple-500/20',
        border: 'border-purple-300 dark:border-purple-500/30',
        text: 'text-purple-700 dark:text-purple-400',
      }
    }
    return {
      icon: Calendar,
      bg: 'bg-gray-100 dark:bg-gray-500/20',
      border: 'border-gray-300 dark:border-gray-500/30',
      text: 'text-gray-700 dark:text-gray-400',
    }
  }
  
  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
  
  // Format hour label
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour} ${ampm}`
  }

  // Day View
  if (viewMode === 'day') {
    return (
      <div className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Meetings" value={events.filter(e => e.type === 'meeting').length} />
          <StatCard label="Focus Blocks" value={events.filter(e => e.type === 'focus').length} />
          <StatCard label="Total Hours" value={`${data?.stats?.totalHours || 0}h`} />
          <StatCard label="Available" value={`${data?.stats?.availableHours || 0}h`} />
        </div>
        
        {/* Timeline */}
        <div className="border rounded-lg overflow-hidden bg-[var(--glass-bg)]">
          {hours.map((hour) => {
            const hourEvents = events.filter(e => e.startTime.getHours() === hour)
            
            return (
              <div key={hour} className="flex border-b last:border-b-0">
                {/* Time Label */}
                <div className="w-20 flex-shrink-0 px-3 py-3 text-xs text-muted-foreground border-r bg-muted/30">
                  {formatHour(hour)}
                </div>
                
                {/* Event Area */}
                <div className="flex-1 min-h-[60px] relative p-1">
                  {hourEvents.map((event, index) => {
                    const config = getEventConfig(event.type, event.source_type)
                    const Icon = config.icon
                    const duration = (event.endTime - event.startTime) / (1000 * 60)
                    
                    return (
                      <motion.div
                        key={event.id || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "p-2.5 rounded-md border mb-1 cursor-pointer transition-all",
                          "hover:shadow-md",
                          config.bg,
                          config.border,
                          hoveredEvent === event.id && "ring-2 ring-primary/30"
                        )}
                        onMouseEnter={() => setHoveredEvent(event.id)}
                        onMouseLeave={() => setHoveredEvent(null)}
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.text)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {event.title}
                              </span>
                              {event.intent_category && signalEnabled && (
                                <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                                  {event.intent_category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                              <span>({duration} min)</span>
                              {event.attendees?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {event.attendees.length}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    )
                  })}
                  
                  {/* Current time indicator */}
                  {isToday && hour === currentHour && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
                      style={{ top: `${(currentMinute / 60) * 100}%` }}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
                    </motion.div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Empty State */}
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No events scheduled</h3>
            <p className="text-sm text-muted-foreground">
              This day is clear. Block some focus time or schedule a meeting.
            </p>
          </div>
        )}
      </div>
    )
  }
  
  // Week View
  if (viewMode === 'week') {
    const weekDays = getWeekDays(date)
    
    return (
      <div className="space-y-4">
        {/* Week Grid */}
        <div className="border rounded-lg overflow-hidden bg-[var(--glass-bg)]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b bg-muted/30">
            <div className="p-2 text-xs font-medium text-muted-foreground border-r" />
            {weekDays.map((day, index) => {
              const isCurrentDay = day.toDateString() === now.toDateString()
              return (
                <div 
                  key={index}
                  className={cn(
                    "p-2 text-center border-r last:border-r-0",
                    isCurrentDay && "bg-primary/5"
                  )}
                >
                  <div className="text-xs text-muted-foreground">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={cn(
                    "text-sm font-semibold mt-0.5",
                    isCurrentDay && "text-primary"
                  )}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Time Rows */}
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[48px]">
              <div className="p-1 text-[10px] text-muted-foreground border-r bg-muted/20">
                {formatHour(hour)}
              </div>
              {weekDays.map((day, dayIndex) => {
                const dayEvents = events.filter(e => 
                  e.startTime.toDateString() === day.toDateString() && 
                  e.startTime.getHours() === hour
                )
                const isCurrentDay = day.toDateString() === now.toDateString()
                
                return (
                  <div 
                    key={dayIndex}
                    className={cn(
                      "border-r last:border-r-0 p-0.5 relative",
                      isCurrentDay && "bg-primary/5"
                    )}
                  >
                    {dayEvents.map((event, index) => {
                      const config = getEventConfig(event.type, event.source_type)
                      return (
                        <div
                          key={event.id || index}
                          className={cn(
                            "text-[10px] p-1 rounded truncate cursor-pointer",
                            "hover:ring-1 hover:ring-primary/30",
                            config.bg,
                            config.text
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Month View
  return (
    <div className="space-y-4">
      <MonthGrid date={date} events={events} />
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ label, value }) {
  return (
    <div className="p-4 rounded-lg border bg-[var(--glass-bg)]">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function MonthGrid({ date, events }) {
  const days = getMonthDays(date)
  const now = new Date()
  
  return (
    <div className="border rounded-lg overflow-hidden bg-[var(--glass-bg)]">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      
      {/* Day Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="min-h-[80px] border-r border-b bg-muted/10" />
          }
          
          const isToday = day.toDateString() === now.toDateString()
          const isCurrentMonth = day.getMonth() === date.getMonth()
          const dayEvents = events.filter(e => e.startTime.toDateString() === day.toDateString())
          
          return (
            <div 
              key={index}
              className={cn(
                "min-h-[80px] p-1 border-r border-b cursor-pointer hover:bg-muted/30",
                !isCurrentMonth && "bg-muted/10 text-muted-foreground"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event, i) => {
                  const config = getEventConfig(event.type, event.source_type)
                  return (
                    <div
                      key={event.id || i}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate",
                        config.bg,
                        config.text
                      )}
                    >
                      {event.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekDays(date) {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())
  
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })
}

function getMonthDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()
  
  const days = []
  
  // Empty cells before first day
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }
  
  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i))
  }
  
  return days
}

function getEventConfig(type, source) {
  if (type === 'focus' || type === 'focus_block') {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
    }
  }
  if (type === 'meeting' || source === 'booking') {
    return {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
    }
  }
  if (type === 'break') {
    return {
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
    }
  }
  if (type === 'work' || type === 'project_work') {
    return {
      bg: 'bg-purple-100 dark:bg-purple-500/20',
      text: 'text-purple-700 dark:text-purple-400',
    }
  }
  return {
    bg: 'bg-gray-100 dark:bg-gray-500/20',
    text: 'text-gray-700 dark:text-gray-400',
  }
}
