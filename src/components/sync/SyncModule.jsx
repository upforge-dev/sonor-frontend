// src/components/sync/SyncModule.jsx
// Sync Module - uses ModuleLayout for consistent shell (left sidebar, calendar, right sidebar)
// Motion-inspired Calendar & Scheduling with AI-powered scheduling

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Video,
  Users,
  Plus,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  CalendarPlus,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Sparkles,
  Brain,
  Focus,
  Sun,
  Target,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  Coffee,
  Briefcase,
  CheckSquare,
  Timer,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CalendarCheck,
  CalendarOff,
  Lightbulb,
  History,
  FileText,
  HelpCircle,
  BarChart3,
  Zap,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import useAuthStore from '@/lib/auth-store'
import { useSignalAccess } from '@/lib/signal-access'
import { portalApi, syncApi, workspaceIntegrationsApi, commerceApi } from '@/lib/portal-api'
import { syncApi as signalSyncApi } from '@/lib/signal-api'
import { toast } from 'sonner'
import { ModuleLayout } from '@/components/ModuleLayout'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { MODULE_ICONS } from '@/lib/module-icons'

// Import modal/panel components
import PlanDayDialog from './PlanDayDialog'
import PlaybooksPanel from './PlaybooksPanel'
// Import modal components
import CreateEventModal from './CreateEventModal'
import BookingTypesPanel from './BookingTypesPanel'
import BookingsListPanel from './BookingsListPanel'
import HostsPanel from './HostsPanel'
import AvailabilityExceptionsPanel from './AvailabilityExceptionsPanel'
import CalendarConnectionsPanel from './CalendarConnectionsPanel'
import UnifiedTasksPanel from './UnifiedTasksPanel'
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog'
import TeamTasksPanel from './TeamTasksPanel'
import AdminOverviewPanel from './AdminOverviewPanel'
import UserGoogleIntegrationPanel from '../integrations/UserGoogleIntegrationPanel'

// ── Default color palette ──────────────────────────────────────────────────
// Professional, muted palette. Meetings & Bookings share the same hue so they
// read as one category. Each key maps to Tailwind utility classes + a hex
// accent used for the left-border stripe and the sidebar legend dot.
const DEFAULT_EVENT_COLORS = {
  meeting: {                       // Meetings & Bookings – calm slate-blue
    bg: 'bg-slate-500',
    light: 'bg-slate-100 dark:bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-400',
    accent: '#64748b',
  },
  focus: {                         // Focus time – brand teal/emerald
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-400',
    accent: '#10b981',
  },
  task: {                          // Tasks – warm amber
    bg: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-500/12',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-400',
    accent: '#f59e0b',
  },
  lunch: {                         // Breaks – soft orange
    bg: 'bg-orange-400',
    light: 'bg-orange-50 dark:bg-orange-500/12',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-400',
    accent: '#fb923c',
  },
  work: {                          // CRM activities / project work – muted purple
    bg: 'bg-purple-400',
    light: 'bg-purple-50 dark:bg-purple-500/12',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-400',
    accent: '#a855f7',
  },
  personal: {                      // Personal / misc – sky blue
    bg: 'bg-sky-400',
    light: 'bg-sky-50 dark:bg-sky-500/12',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-400',
    accent: '#38bdf8',
  },
  google: {                        // Google Calendar – Google blue
    bg: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-400',
    accent: '#4285f4',
  },
  commerce: {                      // Commerce Events – indigo
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50 dark:bg-indigo-500/12',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-400',
    accent: '#6366f1',
  },
  followup: {                      // CRM Follow-ups – warm cyan
    bg: 'bg-cyan-500',
    light: 'bg-cyan-50 dark:bg-cyan-500/12',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-400',
    accent: '#06b6d4',
  },
  default: {
    bg: 'bg-gray-400',
    light: 'bg-gray-50 dark:bg-gray-500/12',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-400',
    accent: '#9ca3af',
  },
}

// Build a live EVENT_COLORS object that merges user-customised accents over
// the defaults.  `customSourceColors` state (see below) stores per-source hex
// overrides and is persisted in localStorage.
function buildEventColors(customSourceColors) {
  // Clone defaults
  const colors = {}
  for (const [key, val] of Object.entries(DEFAULT_EVENT_COLORS)) {
    colors[key] = { ...val }
  }
  // Apply custom source → color-key overrides
  // The mapping is: source-id → color-key in EVENT_COLORS
  const sourceToColorKey = {
    'google-calendar': 'google',
    'booking': 'meeting',
    'crm-followup': 'followup',
    'crm-activity': 'work',
    'project-task': 'task',
    'commerce-event': 'commerce',
  }
  for (const [sourceId, hex] of Object.entries(customSourceColors || {})) {
    const colorKey = sourceToColorKey[sourceId]
    if (colorKey && colors[colorKey]) {
      colors[colorKey] = { ...colors[colorKey], accent: hex }
    }
  }
  return colors
}

// Available preset colors for the picker
const COLOR_PRESETS = [
  '#64748b', // slate
  '#6b7280', // gray
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#38bdf8', // sky
  '#4285f4', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#f59e0b', // amber
  '#fb923c', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#f43f5e', // rose
]

// Calendar source definitions for the color legend
const CALENDAR_SOURCE_DEFS = [
  { id: 'google-calendar', name: 'Google Calendar', defaultAccent: '#4285f4', icon: Calendar },
  { id: 'booking', name: 'Bookings', defaultAccent: '#64748b', icon: Video },
  { id: 'crm-followup', name: 'CRM Follow-ups', defaultAccent: '#06b6d4', icon: Users },
  { id: 'crm-activity', name: 'CRM Activities', defaultAccent: '#a855f7', icon: Briefcase },
  { id: 'project-task', name: 'Tasks', defaultAccent: '#f59e0b', icon: CheckSquare },
  { id: 'commerce-event', name: 'Events', defaultAccent: '#6366f1', icon: CalendarDays },
]

// Get week dates starting from Sunday
const getWeekDates = (date) => {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// Format helpers
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

const formatHour = (hour) => {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour} ${ampm}`
}

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

// ============================================================================
// MINI CALENDAR COMPONENT
// ============================================================================

function MiniCalendar({ selectedDate, setSelectedDate, events }) {
  const today = new Date()
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
  const startDay = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()
  
  const getEventsForDay = (date) => events.filter(e => isSameDay(new Date(e.start_time || e.startTime), date))
  
  const days = []
  for (let i = 0; i < startDay; i++) {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - (startDay - i))
    days.push({ date: d, isCurrentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i), isCurrentMonth: true })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(monthEnd)
    d.setDate(d.getDate() + i)
    days.push({ date: d, isCurrentMonth: false })
  }
  
  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setSelectedDate(newDate)
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-[11px] text-muted-foreground font-medium py-1.5">{day}</div>
        ))}
        {days.map(({ date, isCurrentMonth }, i) => {
          const isSelected = isSameDay(date, selectedDate)
          const isCurrentDay = isSameDay(date, today)
          const hasEvents = getEventsForDay(date).length > 0
          
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "relative w-8 h-8 rounded-full text-xs font-medium transition-all",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && "hover:bg-muted",
                isSelected && "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
                isCurrentDay && !isSelected && "ring-2 ring-emerald-500/50 font-bold text-emerald-600 dark:text-emerald-400"
              )}
            >
              {date.getDate()}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// EVENT DETAIL DIALOG
// ============================================================================

function EventDetailDialog({ event, onClose, onDeleted, onUpdated }) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  if (!event) return null

  const colors = DEFAULT_EVENT_COLORS[event.color] || DEFAULT_EVENT_COLORS.default
  const durationMinutes = Math.round((event.endTime - event.startTime) / (1000 * 60))
  
  const sourceLabels = {
    'booking': 'Booking',
    'crm-followup': 'CRM Follow-up',
    'crm-activity': 'CRM Activity',
    'project-task': 'Task',
    'google-calendar': 'Google Calendar',
    'commerce-event': 'Event',
  }

  const isGoogleEvent = event.source === 'google-calendar'
  const isPortalEvent = ['booking', 'crm-followup', 'crm-activity', 'project-task', 'commerce-event'].includes(event.source)

  const handleDelete = async () => {
    if (!isGoogleEvent) return
    setDeleting(true)
    try {
      await workspaceIntegrationsApi.deleteCalendarEvent(event.sourceId)
      toast.success('Event deleted from Google Calendar')
      onDeleted?.()
    } catch (err) {
      console.error('Failed to delete event:', err)
      toast.error('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const handleStartEdit = () => {
    setEditForm({
      summary: event.title,
      description: event.meta?.description || '',
      location: event.meta?.location || '',
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!isGoogleEvent) return
    try {
      await workspaceIntegrationsApi.updateCalendarEvent(event.sourceId, editForm)
      toast.success('Event updated')
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      console.error('Failed to update event:', err)
      toast.error('Failed to update event')
    }
  }

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8">
            <div className="w-3 h-8 rounded-sm shrink-0" style={{ backgroundColor: colors.accent }} />
            {editing ? (
              <input
                value={editForm.summary}
                onChange={(e) => setEditForm(f => ({ ...f, summary: e.target.value }))}
                className="flex-1 bg-transparent border-b border-primary outline-none text-lg font-semibold"
              />
            ) : (
              <span className="truncate">{event.title}</span>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-xs" style={{ borderColor: colors.accent, color: colors.accent }}>
              {sourceLabels[event.source] || event.source}
            </Badge>
            {event.type && (
              <Badge variant="outline" className="text-xs capitalize">{event.type}</Badge>
            )}
            {event.meta?.projectName && (
              <Badge variant="outline" className="text-xs">{event.meta.projectName}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Date & time */}
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="font-medium">
                {format(event.startTime, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-muted-foreground">
                {formatTime(event.startTime)} – {formatTime(event.endTime)}
                <span className="ml-2 text-xs">({durationMinutes} min)</span>
              </div>
            </div>
          </div>
          
          {/* Location / video link */}
          {(event.meta?.location || event.meta?.videoLink || event.meta?.virtualMeetingUrl) && (
            <div className="flex items-center gap-3 text-sm">
              {(event.meta?.videoLink || event.meta?.virtualMeetingUrl) ? (
                <Video className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div>
                {(event.meta?.videoLink || event.meta?.virtualMeetingUrl) ? (
                  <a href={event.meta.videoLink || event.meta.virtualMeetingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Join video call
                  </a>
                ) : (
                  <span>{event.meta.location}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Attendees */}
          {event.meta?.attendees?.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                {event.meta.attendees.map((a, i) => (
                  <div key={i} className="text-sm">
                    {a.name || a.displayName || a.email}
                    {a.responseStatus && (
                      <span className={cn(
                        "ml-2 text-xs",
                        a.responseStatus === 'accepted' && "text-emerald-600",
                        a.responseStatus === 'declined' && "text-red-500",
                        a.responseStatus === 'tentative' && "text-amber-500",
                      )}>
                        ({a.responseStatus})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Guest info (for bookings) */}
          {event.meta?.guestEmail && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{event.meta.guestEmail}</span>
            </div>
          )}

          {/* Commerce event details */}
          {event.source === 'commerce-event' && (
            <div className="flex items-center gap-3 text-sm">
              {event.meta?.capacity && (
                <Badge variant="outline" className="text-xs">
                  {event.meta.spotsRemaining != null 
                    ? `${event.meta.spotsRemaining}/${event.meta.capacity} spots left` 
                    : `${event.meta.capacity} capacity`}
                </Badge>
              )}
              {event.meta?.price != null && (
                <Badge variant="outline" className="text-xs">
                  ${Number(event.meta.price).toFixed(2)}
                </Badge>
              )}
            </div>
          )}
          
          {/* Description */}
          {editing ? (
            <div className="space-y-2 border-t pt-3">
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="w-full min-h-[80px] p-2 text-sm border rounded-md bg-background resize-none"
                placeholder="Add a description..."
              />
            </div>
          ) : event.meta?.description ? (
            <div className="text-sm text-muted-foreground border-t pt-3 mt-3">
              <p className="whitespace-pre-wrap">{event.meta.description}</p>
            </div>
          ) : null}
          
          {/* Action buttons */}
          <div className="border-t pt-3 flex items-center gap-2 flex-wrap">
            {/* Google Calendar events: edit + delete */}
            {isGoogleEvent && !editing && (
              <>
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <UptradeSpinner size="sm" className="[&_svg]:!h-3.5 [&_svg]:!w-3.5 [&_p]:hidden mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                  Delete
                </Button>
              </>
            )}
            {isGoogleEvent && editing && (
              <>
                <Button size="sm" onClick={handleSaveEdit}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            )}

            {/* Portal events: link to the relevant module */}
            {event.source === 'booking' && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                View in Bookings
              </Button>
            )}
            {event.source === 'commerce-event' && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/commerce/offerings/${event.sourceId}`}>
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                  View in Commerce
                </a>
              </Button>
            )}

            {/* Google Calendar external link */}
            {event.meta?.htmlLink && (
              <Button variant="ghost" size="sm" asChild className="ml-auto">
                <a href={event.meta.htmlLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Google Calendar
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncModule({ className }) {
  const { currentOrg, currentProject, availableProjects, user } = useAuthStore()
  const { hasAccess: hasSignalAccess, hasOrgSignal, hasCurrentProjectSignal, isAdmin } = useSignalAccess()
  
  // State
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('week')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [centerView, setCenterView] = useState('calendar') // 'calendar' | 'bookings' | 'booking-types' | 'hosts' | 'integrations'
  const [rightSidebarMode, setRightSidebarMode] = useState('tasks') // 'tasks' | 'calendar' | 'playbooks'
  const [calendarConnected, setCalendarConnected] = useState(false)
  
  // Task view mode state (personal / team / overview)
  const [taskViewMode, setTaskViewMode] = useState('personal') // 'personal' | 'team' | 'overview'
  const [userPermissions, setUserPermissions] = useState(null)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalType, setCreateModalType] = useState('event')
  const [createModalTime, setCreateModalTime] = useState(null) // HH:mm string for pre-fill
  const [selectedEvent, setSelectedEvent] = useState(null) // event object for detail popover
  const [showExceptionsPanel, setShowExceptionsPanel] = useState(false)
  const [showCalendarConnections, setShowCalendarConnections] = useState(null) // host object or null
  const [showPlanDay, setShowPlanDay] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [hosts, setHosts] = useState([])
  
  // Calendar visibility (source filtering)
  // Custom source colors persisted in localStorage
  const [customSourceColors, setCustomSourceColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sync_custom_colors') || '{}')
    } catch { return {} }
  })
  const [calendarSources, setCalendarSources] = useState(
    CALENDAR_SOURCE_DEFS.map(s => ({ ...s, visible: true, accent: s.defaultAccent }))
  )
  const [projectSourceVisibility, setProjectSourceVisibility] = useState({})
  const [expandedProjects, setExpandedProjects] = useState({})
  const [activeProjectIds, setActiveProjectIds] = useState(new Set()) // which projects are shown in calendar
  const [colorPickerOpen, setColorPickerOpen] = useState(null) // source id of open picker

  // Derive EVENT_COLORS from defaults + user customisations
  const EVENT_COLORS = useMemo(() => buildEventColors(customSourceColors), [customSourceColors])

  // Check workspace Google Calendar connection status
  useEffect(() => {
    workspaceIntegrationsApi.getGoogleStatus()
      .then(status => setCalendarConnected(status?.connected && status?.calendar?.connected))
      .catch(() => setCalendarConnected(false))
  }, [])

  // Keep calendarSources accent in sync with custom colors
  useEffect(() => {
    setCalendarSources(prev => prev.map(s => ({
      ...s,
      accent: customSourceColors[s.id] || s.defaultAccent,
    })))
  }, [customSourceColors])

  // Persist custom colors
  const updateSourceColor = (sourceId, hex) => {
    setCustomSourceColors(prev => {
      const next = { ...prev, [sourceId]: hex }
      localStorage.setItem('sync_custom_colors', JSON.stringify(next))
      return next
    })
    setColorPickerOpen(null)
  }

  const crmSources = [
    { id: 'booking', name: 'Consultations', color: 'slate', icon: Video },
    { id: 'crm-followup', name: 'CRM Follow-ups', color: 'cyan', icon: Users },
    { id: 'crm-activity', name: 'CRM Activities', color: 'purple', icon: Briefcase },
  ]

  const projectList = useMemo(() => {
    if (availableProjects?.length) return availableProjects
    return currentProject ? [currentProject] : []
  }, [availableProjects, currentProject])

  useEffect(() => {
    if (!projectList.length) return
    setProjectSourceVisibility((prev) => {
      const next = { ...prev }
      projectList.forEach((project) => {
        if (!next[project.id]) {
          next[project.id] = {
            booking: true,
            'crm-followup': true,
            'crm-activity': true,
          }
        }
      })
      return next
    })
    // Initialize all projects as active
    setActiveProjectIds((prev) => {
      if (prev.size > 0) return prev
      return new Set(projectList.map(p => p.id))
    })
  }, [projectList])

  
  // Signal AI states
  const [aiLoading, setAiLoading] = useState(null) // 'briefing' | 'focus' | 'prep' | null
  const [dailyBriefing, setDailyBriefing] = useState(null)
  const [focusRecommendations, setFocusRecommendations] = useState(null)
  const [meetingPrep, setMeetingPrep] = useState(null)
  const [showAIPanel, setShowAIPanel] = useState(null) // 'briefing' | 'focus' | 'prep' | null
  
  // Signal AI in Sync requires ORG-LEVEL Signal access (not project-level)
  // Project-level Signal only enables AI features within project modules, not Sync
  const signalEnabled = hasOrgSignal
  
  // Filter events by visible sources and active projects
  const filteredEvents = useMemo(() => {
    const visibleSources = calendarSources.filter(c => c.visible).map(c => c.id)

    return events.filter((event) => {
      // Check global source visibility first
      if (!visibleSources.includes(event.source)) return false

      // Project-scoped sources (bookings, CRM, commerce events)
      if (['booking', 'crm-followup', 'crm-activity', 'commerce-event'].includes(event.source)) {
        const projectId = event.projectId || event.project_id
        if (!projectId) return true
        // Filter by active projects
        if (activeProjectIds.size > 0 && !activeProjectIds.has(projectId)) return false
        const visibility = projectSourceVisibility[projectId]
        if (!visibility) return true
        return visibility[event.source] !== false
      }

      return true
    })
  }, [events, calendarSources, projectSourceVisibility, activeProjectIds])
  
  // Computed values
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)
  
  // Business hours (8 AM to 8 PM)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8)
  
  // Load calendar data from all sources
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startDate = weekDates[0].toISOString().split('T')[0]
      const endDate = weekDates[6].toISOString().split('T')[0]
      const projectId = currentProject?.id
      
      // Parallel fetch from all data sources
      const [
        tasksRes,
        bookingsByProject,
        followUpsByProject,
        activitiesByProject,
        googleCalRes,
        commerceEventsByProject,
      ] = await Promise.all([
        // 1. Project Tasks (per-user, independent of project dropdowns)
        projectId 
          ? portalApi.get(`/seo/projects/${projectId}/tasks`, {
              params: { status: 'pending,in_progress', hasDeadline: true }
            }).catch(() => ({ data: { tasks: [] } }))
          : Promise.resolve({ data: { tasks: [] } }),

        // 2. Consultation Bookings (per project)
        Promise.all(
          projectList.map((project) =>
            portalApi.get('/sync/admin/bookings', {
              params: { startDate, endDate, status: 'confirmed,pending' },
              headers: {
                'X-Project-Id': project.id,
                ...(project.org_id || currentOrg?.id
                  ? { 'X-Tenant-Org-Id': project.org_id || currentOrg?.id }
                  : {}),
              },
            })
              .then((res) => ({ project, data: res.data?.bookings || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),

        // 3. CRM Follow-ups (per project)
        Promise.all(
          projectList.map((project) =>
            portalApi.get('/crm/follow-ups', {
              params: { startDate, endDate },
              headers: {
                'X-Project-Id': project.id,
                ...(project.org_id || currentOrg?.id
                  ? { 'X-Tenant-Org-Id': project.org_id || currentOrg?.id }
                  : {}),
              },
            })
              .then((res) => ({ project, data: res.data?.followUps || res.data?.data || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),

        // 4. CRM Activities (per project)
        Promise.all(
          projectList.map((project) =>
            portalApi.get('/crm/activities', {
              params: { startDate, endDate, type: 'call,meeting' },
              headers: {
                'X-Project-Id': project.id,
                ...(project.org_id || currentOrg?.id
                  ? { 'X-Tenant-Org-Id': project.org_id || currentOrg?.id }
                  : {}),
              },
            })
              .then((res) => ({ project, data: res.data?.activities || res.data?.data || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),

        // 5. Google Calendar events (per-user workspace integration)
        workspaceIntegrationsApi.getCalendarEvents(startDate, endDate)
          .catch(() => ({ events: [] })),

        // 6. Commerce Events (per project — from commerce_offerings + schedules)
        Promise.all(
          projectList.map((project) =>
            commerceApi.getOfferings(project.id, { type: 'event', status: 'active' })
              .then((res) => ({ project, data: res?.data || res || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),
      ])
      
      const allEvents = []
      
      // Transform bookings (per project)
      bookingsByProject.forEach(({ project, data }) => {
        data.forEach(booking => {
          allEvents.push({
            id: `booking-${booking.id}`,
            title: booking.title || `${booking.booking_type_name || 'Meeting'} with ${booking.guest_name}`,
            startTime: new Date(booking.scheduled_at || booking.start_time),
            endTime: new Date(booking.end_time || new Date(new Date(booking.scheduled_at).getTime() + (booking.duration_minutes || 30) * 60000)),
            type: 'meeting',
            color: 'meeting',
            source: 'booking',
            sourceId: booking.id,
            projectId: project.id,
            meta: { guestEmail: booking.guest_email, videoLink: booking.video_link, projectId: project.id }
          })
        })
      })
      
      // Transform CRM follow-ups (per project)
      followUpsByProject.forEach(({ project, data }) => {
        data.forEach(followUp => {
          if (followUp.due_at || followUp.scheduled_at) {
            const scheduledTime = new Date(followUp.due_at || followUp.scheduled_at)
            allEvents.push({
              id: `followup-${followUp.id}`,
              title: followUp.title || `Follow-up: ${followUp.contact_name || 'Contact'}`,
              startTime: scheduledTime,
              endTime: new Date(scheduledTime.getTime() + 30 * 60000), // 30 min default
              type: followUp.type === 'call' ? 'meeting' : 'task',
              color: 'followup',
              source: 'crm-followup',
              sourceId: followUp.id,
              projectId: project.id,
              meta: { contactId: followUp.contact_id, projectId: project.id }
            })
          }
        })
      })
      
      // Transform project tasks with deadlines
      const tasks = tasksRes.data?.tasks || tasksRes.data?.data || []
      tasks.forEach(task => {
        if (task.due_date || task.deadline) {
          const deadline = new Date(task.due_date || task.deadline)
          // Set to end of day if no time specified
          if (deadline.getHours() === 0 && deadline.getMinutes() === 0) {
            deadline.setHours(17, 0, 0, 0)
          }
          allEvents.push({
            id: `task-${task.id}`,
            title: task.title || task.name,
            startTime: new Date(deadline.getTime() - 60 * 60000), // 1 hour before deadline
            endTime: deadline,
            type: 'task',
            color: 'task',
            source: 'project-task',
            sourceId: task.id,
            meta: { projectId: task.project_id, status: task.status, priority: task.priority }
          })
        }
      })
      
      // Transform CRM activities (per project)
      activitiesByProject.forEach(({ project, data }) => {
        data.forEach(activity => {
          if (activity.scheduled_at) {
            const scheduledTime = new Date(activity.scheduled_at)
            allEvents.push({
              id: `activity-${activity.id}`,
              title: activity.title || `${activity.type}: ${activity.contact_name || 'Contact'}`,
              startTime: scheduledTime,
              endTime: new Date(scheduledTime.getTime() + (activity.duration_minutes || 30) * 60000),
              type: activity.type === 'call' ? 'meeting' : 'work',
              color: activity.type === 'call' ? 'meeting' : 'work',
              source: 'crm-activity',
              sourceId: activity.id,
              projectId: project.id,
              meta: { contactId: activity.contact_id, type: activity.type, projectId: project.id }
            })
          }
        })
      })
      
      // Transform Commerce Events (per project)
      commerceEventsByProject.forEach(({ project, data }) => {
        const offerings = Array.isArray(data) ? data : data?.offerings || []
        offerings.forEach(offering => {
          // Commerce events may have schedules with specific dates
          const schedules = offering.schedules || []
          if (schedules.length > 0) {
            schedules.forEach(sched => {
              if (!sched.starts_at) return
              const start = new Date(sched.starts_at)
              const end = sched.ends_at ? new Date(sched.ends_at) : new Date(start.getTime() + (offering.duration_minutes || 60) * 60000)
              allEvents.push({
                id: `commerce-sched-${sched.id}`,
                title: offering.name || 'Event',
                startTime: start,
                endTime: end,
                type: 'work',
                color: 'commerce',
                source: 'commerce-event',
                sourceId: offering.id,
                projectId: project.id,
                meta: {
                  projectId: project.id,
                  projectName: project.name || project.title,
                  scheduleId: sched.id,
                  capacity: sched.capacity || offering.capacity,
                  spotsRemaining: sched.spots_remaining,
                  location: offering.location,
                  isVirtual: offering.is_virtual,
                  virtualMeetingUrl: offering.virtual_meeting_url,
                  price: offering.price,
                  status: sched.status,
                  description: offering.short_description || offering.description,
                }
              })
            })
          } else if (offering.metadata?.event_date) {
            // Fallback: single-date event stored in metadata
            const start = new Date(offering.metadata.event_date)
            const end = new Date(start.getTime() + (offering.duration_minutes || 60) * 60000)
            allEvents.push({
              id: `commerce-${offering.id}`,
              title: offering.name || 'Event',
              startTime: start,
              endTime: end,
              type: 'work',
              color: 'commerce',
              source: 'commerce-event',
              sourceId: offering.id,
              projectId: project.id,
              meta: {
                projectId: project.id,
                projectName: project.name || project.title,
                capacity: offering.capacity,
                location: offering.location,
                isVirtual: offering.is_virtual,
                virtualMeetingUrl: offering.virtual_meeting_url,
                price: offering.price,
                description: offering.short_description || offering.description,
              }
            })
          }
        })
      })

      // Transform Google Calendar events
      const gcalEvents = googleCalRes?.events || []
      gcalEvents.forEach(gEvent => {
        if (!gEvent.startTime) return
        const start = new Date(gEvent.startTime)
        const end = gEvent.endTime ? new Date(gEvent.endTime) : new Date(start.getTime() + 60 * 60000)
        allEvents.push({
          id: `gcal-${gEvent.id}`,
          title: gEvent.title || '(No title)',
          startTime: start,
          endTime: end,
          type: 'personal',
          color: 'google',
          source: 'google-calendar',
          sourceId: gEvent.id,
          allDay: gEvent.allDay || false,
          meta: {
            location: gEvent.location,
            htmlLink: gEvent.htmlLink,
            attendees: gEvent.attendees,
            organizer: gEvent.organizer,
            description: gEvent.description,
          }
        })
      })
      
      setEvents(allEvents)
    } catch (err) {
      console.error('Failed to load sync data:', err)
      setError(err.message || 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [weekDates, currentProject?.id, projectList, currentOrg?.id])
  
  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])
  
  // Load hosts for exceptions panel
  const loadHosts = useCallback(async () => {
    try {
      const { data } = await portalApi.get('/sync/admin/hosts').catch(() => ({ data: { hosts: [] } }))
      setHosts(data.hosts || [])
    } catch (err) {
      console.error('Failed to load hosts:', err)
    }
  }, [])
  
  useEffect(() => {
    loadHosts()
  }, [loadHosts])
  
  // Load user permissions for task view modes
  const loadUserPermissions = useCallback(async () => {
    try {
      const result = await syncApi.getUserPermissions(currentProject?.id)
      setUserPermissions(result.data || result)
    } catch (err) {
      console.error('Failed to load user permissions:', err)
      // Default to personal view only
      setUserPermissions({
        available_views: ['personal'],
        current_role: null,
      })
    }
  }, [currentProject?.id])
  
  useEffect(() => {
    loadUserPermissions()
  }, [loadUserPermissions])
  
  // ==================== Signal AI Handlers ====================
  
  // Load AI Daily Briefing
  const loadDailyBriefing = useCallback(async () => {
    if (!signalEnabled) return
    setAiLoading('briefing')
    try {
      const result = await signalSyncApi.getDailyBriefing({
        date: selectedDate.toISOString().split('T')[0],
        projectId: currentProject?.id,
      })
      setDailyBriefing(result.data || result)
      setShowAIPanel('briefing')
      toast.success('Daily briefing loaded')
    } catch (err) {
      console.error('Failed to load daily briefing:', err)
      toast.error('Failed to load daily briefing')
    } finally {
      setAiLoading(null)
    }
  }, [signalEnabled, selectedDate, currentProject?.id])
  
  // Get Focus Time Recommendations
  const loadFocusRecommendations = useCallback(async () => {
    if (!signalEnabled) return
    setAiLoading('focus')
    try {
      const result = await signalSyncApi.getFocusTime({
        date: selectedDate.toISOString().split('T')[0],
        projectId: currentProject?.id,
      })
      setFocusRecommendations(result.data || result)
      setShowAIPanel('focus')
      toast.success('Focus time recommendations loaded')
    } catch (err) {
      console.error('Failed to load focus recommendations:', err)
      toast.error('Failed to get focus time recommendations')
    } finally {
      setAiLoading(null)
    }
  }, [signalEnabled, selectedDate, currentProject?.id])
  
  // Block a focus time slot
  const handleBlockFocusTime = useCallback(async (slot) => {
    if (!signalEnabled) return
    try {
      await signalSyncApi.blockFocusTime({
        start: slot.start,
        end: slot.end,
        title: slot.title || 'Focus Time',
      })
      toast.success('Focus time blocked!')
      loadCalendarData() // Refresh calendar
      setShowAIPanel(null)
    } catch (err) {
      console.error('Failed to block focus time:', err)
      toast.error('Failed to block focus time')
    }
  }, [signalEnabled, loadCalendarData])
  
  // Get Meeting Prep for an event
  const loadMeetingPrep = useCallback(async (event) => {
    if (!signalEnabled || !event) return
    setAiLoading('prep')
    try {
      const result = await signalSyncApi.getMeetingPrep(event.sourceId || event.id, {
        projectId: currentProject?.id,
      })
      setMeetingPrep({ ...result.data || result, event })
      setShowAIPanel('prep')
      toast.success('Meeting prep loaded')
    } catch (err) {
      console.error('Failed to load meeting prep:', err)
      toast.error('Failed to load meeting prep')
    } finally {
      setAiLoading(null)
    }
  }, [signalEnabled, currentProject?.id])
  
  // Get event color type
  const getEventColor = (type) => {
    if (type === 'focus' || type === 'focus_block') return 'focus'
    if (type === 'meeting' || type === 'call') return 'meeting'
    if (type === 'task') return 'task'
    if (type === 'lunch' || type === 'break') return 'lunch'
    if (type === 'work' || type === 'project_work') return 'work'
    return 'default'
  }
  
  // Navigate dates
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7))
    }
    setSelectedDate(newDate)
  }
  
  const goToToday = () => setSelectedDate(new Date())
  
  // Handle click on calendar grid to create event at that time
  const handleGridClick = (date, hour) => {
    setSelectedDate(date)
    setCreateModalType('meeting')
    setCreateModalTime(`${String(hour).padStart(2, '0')}:00`)
    setShowCreateModal(true)
  }
  
  // Handle click on an existing event to view details
  const handleEventClick = (e, event) => {
    e.stopPropagation() // prevent grid click from firing
    setSelectedEvent(event)
  }
  
  // Get events for a specific day
  const getEventsForDay = (date) => filteredEvents.filter(e => isSameDay(e.startTime, date))
  
  // Current time position for indicator
  const getCurrentTimePosition = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const startHour = 8
    const endHour = 20
    const totalHours = endHour - startHour
    const currentPosition = (hours - startHour) + (minutes / 60)
    return Math.max(0, Math.min(100, (currentPosition / totalHours) * 100))
  }

  const subtitle = viewMode === 'week'
    ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={goToToday}
        className={cn(
          "h-8 px-3",
          isToday && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
        )}
      >
        Today
      </Button>
      <div className="flex items-center border rounded-md">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="font-medium text-sm min-w-[140px] hidden sm:inline">
        {viewMode === 'week'
          ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        }
      </span>
      {signalEnabled && (
        <Button size="sm" className="gap-1.5 hidden md:flex" style={{ backgroundColor: 'var(--brand-primary)' }} onClick={() => setShowPlanDay(true)}>
          <Zap className="h-4 w-4" />
          Plan my day
        </Button>
      )}
      {centerView !== 'calendar' && (
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setCenterView('calendar')}>
          <Calendar className="h-4 w-4" />
          Back to Calendar
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowKeyboardShortcuts(true)}>
            <span className="text-xs font-mono">?</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts</TooltipContent>
      </Tooltip>
      <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={loadCalendarData} disabled={loading}>
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      </Button>
      <div className="flex border rounded-md overflow-hidden">
        {[
          { id: 'day', label: 'Day', icon: CalendarDays },
          { id: 'week', label: 'Week', icon: LayoutGrid },
        ].map((mode) => (
          <Tooltip key={mode.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "h-8 px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                  viewMode === mode.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <mode.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>{mode.label} view</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <ModuleLayout
        ariaLabel="Sync"
        className={className}
        leftSidebarOpen={showLeftSidebar}
        rightSidebarOpen={showRightSidebar}
        onLeftSidebarOpenChange={setShowLeftSidebar}
        onRightSidebarOpenChange={setShowRightSidebar}
        leftSidebarTitle="Views"
        rightSidebarTitle="Tasks & calendar"
        leftSidebarWidth={240}
        rightSidebarWidth={320}
        leftSidebar={(
          <div className="p-4 space-y-6">
                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="w-full justify-between gap-2 bg-emerald-600 hover:bg-emerald-700">
                            <span className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-70" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                          <DropdownMenuItem onClick={() => { setCreateModalType('meeting'); setShowCreateModal(true) }}>
                            <Video className="h-4 w-4 mr-2" />
                            New Meeting
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCreateModalType('focus'); setShowCreateModal(true) }}>
                            <Focus className="h-4 w-4 mr-2" />
                            Block Focus Time
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCreateModalType('task'); setShowCreateModal(true) }}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            New Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setCenterView('booking-types')}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Manage Booking Types
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search events..." 
                        className="pl-8 h-9 text-sm bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Navigation */}
                    <div className="space-y-1">
                      <p className="uppercase tracking-wider text-muted-foreground mb-2">Views</p>
                      {[
                        { id: 'calendar', icon: Calendar, label: 'Calendar' },
                        { id: 'bookings', icon: CalendarCheck, label: 'Bookings' },
                        { id: 'hosts', icon: Users, label: 'Hosts' },
                        { id: 'booking-types', icon: Link2, label: 'Booking Types' },
                        { id: 'pto', icon: CalendarOff, label: 'PTO & Holidays', onClick: () => setShowExceptionsPanel(true) },
                      ].map((item) => (
                        <button 
                          key={item.id}
                          onClick={item.onClick || (() => setCenterView(item.id))}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 transition-colors",
                            (item.id === centerView || (item.id === 'pto' && false))
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Projects */}
                    {projectList.length > 1 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="uppercase tracking-wider text-muted-foreground">Projects</p>
                          <button
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const allActive = projectList.every(p => activeProjectIds.has(p.id))
                              setActiveProjectIds(allActive ? new Set() : new Set(projectList.map(p => p.id)))
                            }}
                          >
                            {projectList.every(p => activeProjectIds.has(p.id)) ? 'Hide all' : 'Show all'}
                          </button>
                        </div>
                        {projectList.map((project) => (
                          <label key={project.id} className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer group">
                            <Checkbox
                              checked={activeProjectIds.has(project.id)}
                              onCheckedChange={(checked) => {
                                setActiveProjectIds((prev) => {
                                  const next = new Set(prev)
                                  if (checked) next.add(project.id)
                                  else next.delete(project.id)
                                  return next
                                })
                              }}
                              className="border-2"
                            />
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                              {project.name || project.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : currentProject && (
                      <div className="space-y-2">
                        <p className="uppercase tracking-wider text-muted-foreground">Project</p>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/50">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium truncate">{currentProject.name || currentProject.title}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Calendar Sources / Color Legend */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="uppercase tracking-wider text-muted-foreground text-[11px]">Calendars</p>
                        <button
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const allVisible = calendarSources.every(s => s.visible)
                            setCalendarSources(prev => prev.map(s => ({ ...s, visible: !allVisible })))
                          }}
                        >
                          {calendarSources.every(s => s.visible) ? 'Hide all' : 'Show all'}
                        </button>
                      </div>
                      {calendarSources.map((source) => (
                        <div key={source.id} className="relative">
                          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                            <Checkbox
                              checked={source.visible}
                              onCheckedChange={(checked) => {
                                setCalendarSources(prev => prev.map(s =>
                                  s.id === source.id ? { ...s, visible: !!checked } : s
                                ))
                              }}
                              className="h-3.5 w-3.5 cursor-pointer"
                              style={{ borderColor: source.accent, backgroundColor: source.visible ? source.accent : undefined }}
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                              onClick={() => setCalendarSources(prev => prev.map(s =>
                                s.id === source.id ? { ...s, visible: !s.visible } : s
                              ))}
                            >
                              <source.icon className="h-3.5 w-3.5 shrink-0" style={{ color: source.accent }} />
                              <span className="text-sm truncate">{source.name}</span>
                            </div>
                            {/* Color dot — click to open picker */}
                            <button
                              onClick={() => setColorPickerOpen(colorPickerOpen === source.id ? null : source.id)}
                              className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20 hover:scale-125 transition-transform"
                              style={{ backgroundColor: source.accent }}
                              title="Change color"
                            />
                            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity tabular-nums w-4 text-right">
                              {events.filter(e => e.source === source.id).length}
                            </span>
                          </div>
                          {/* Color picker popover */}
                          {colorPickerOpen === source.id && (
                            <div className="absolute left-2 right-2 mt-1 p-2 rounded-lg border bg-popover shadow-lg z-50">
                              <div className="grid grid-cols-7 gap-1.5">
                                {COLOR_PRESETS.map((hex) => (
                                  <button
                                    key={hex}
                                    onClick={() => updateSourceColor(source.id, hex)}
                                    className={cn(
                                      "w-5 h-5 rounded-full ring-1 ring-black/10 dark:ring-white/20 hover:scale-125 transition-transform",
                                      source.accent === hex && "ring-2 ring-primary ring-offset-1"
                                    )}
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Signal AI Features */}
                    {signalEnabled && (
                      <div className="space-y-2">
                        <p className="uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-[var(--brand-primary)]" />
                          AI Features
                        </p>
                        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 space-y-1">
                          <button 
                            onClick={loadFocusRecommendations}
                            disabled={aiLoading === 'focus'}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              {aiLoading === 'focus' ? <UptradeSpinner size="sm" className="[&_svg]:!h-4 [&_svg]:!w-4 [&_p]:hidden" /> : <Focus className="h-4 w-4" />}
                              <span>Auto Focus Time</span>
                            </div>
                          </button>
                          <button 
                            onClick={loadDailyBriefing}
                            disabled={aiLoading === 'briefing'}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              {aiLoading === 'briefing' ? <UptradeSpinner size="sm" className="[&_svg]:!h-4 [&_svg]:!w-4 [&_p]:hidden" /> : <Sun className="h-4 w-4" />}
                              <span>Daily Briefing</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => {
                              // Get the next upcoming meeting
                              const upcomingMeetings = filteredEvents
                                .filter(e => e.type === 'meeting' && e.startTime > new Date())
                                .sort((a, b) => a.startTime - b.startTime)
                              if (upcomingMeetings.length > 0) {
                                loadMeetingPrep(upcomingMeetings[0])
                              } else {
                                toast.info('No upcoming meetings to prepare for')
                              }
                            }}
                            disabled={aiLoading === 'prep'}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              {aiLoading === 'prep' ? <UptradeSpinner size="sm" className="[&_svg]:!h-4 [&_svg]:!w-4 [&_p]:hidden" /> : <Target className="h-4 w-4" />}
                              <span className="text-sm font-medium">Meeting Prep</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Integrations section — Commerce-style */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Integrations
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-muted"
                          onClick={() => setCenterView('integrations')}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="px-3 py-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 text-xs">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            calendarConnected ? "bg-emerald-500" : "bg-muted-foreground"
                          )} />
                          <span className={calendarConnected ? "text-foreground" : "text-muted-foreground"}>
                            {calendarConnected ? 'Google Calendar connected' : 'Google Calendar not connected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
        )}
        rightSidebar={(
          <>
            {/* Sidebar Mode Tabs */}
            <div className="flex border-b bg-background/50">
              <button
                onClick={() => setRightSidebarMode('tasks')}
                className={cn(
                  "flex-1 py-2.5 transition-colors relative",
                  rightSidebarMode === 'tasks' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Tasks
                </div>
                {rightSidebarMode === 'tasks' && (
                  <motion.div layoutId="sidebarTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
              <button
                onClick={() => setRightSidebarMode('playbooks')}
                className={cn(
                  "flex-1 py-2.5 transition-colors relative",
                  rightSidebarMode === 'playbooks' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  Playbooks
                </div>
                {rightSidebarMode === 'playbooks' && (
                  <motion.div layoutId="sidebarTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
              <button
                onClick={() => setRightSidebarMode('calendar')}
                className={cn(
                  "flex-1 py-2.5 transition-colors relative",
                  rightSidebarMode === 'calendar' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Calendar
                </div>
                {rightSidebarMode === 'calendar' && (
                  <motion.div layoutId="sidebarTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            </div>

            {rightSidebarMode === 'tasks' && (
              <div className="h-full flex flex-col">
                {userPermissions?.available_views?.length > 1 && (
                  <div className="px-4 pt-3 pb-2 border-b flex gap-1">
                    {userPermissions.available_views.includes('personal') && (
                      <button
                        onClick={() => setTaskViewMode('personal')}
                        className={cn(
                          "px-3 py-1.5 rounded-md transition-colors",
                          taskViewMode === 'personal' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        My Tasks
                      </button>
                    )}
                    {userPermissions.available_views.includes('team') && (
                      <button
                        onClick={() => setTaskViewMode('team')}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                          taskViewMode === 'team' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Users className="h-3.5 w-3.5" />
                        Team
                      </button>
                    )}
                    {userPermissions.available_views.includes('overview') && (
                      <button
                        onClick={() => setTaskViewMode('overview')}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                          taskViewMode === 'overview' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Overview
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1 overflow-auto p-4">
                  {taskViewMode === 'personal' && (
                    <UnifiedTasksPanel
                      projectId={currentProject?.id}
                      className="h-full"
                      onTaskClick={(task) => toast.info(`Viewing: ${task.title}`)}
                      onShowShortcuts={() => setShowKeyboardShortcuts(true)}
                    />
                  )}
                  {taskViewMode === 'team' && (
                    <TeamTasksPanel
                      projectId={currentProject?.id}
                      className="h-full"
                      onMemberClick={(member) => toast.info(`Viewing tasks for: ${member.name}`)}
                    />
                  )}
                  {taskViewMode === 'overview' && (
                    <AdminOverviewPanel
                      orgId={currentOrg?.id}
                      projectId={currentProject?.id}
                      className="h-full"
                    />
                  )}
                </div>
              </div>
            )}

            {rightSidebarMode === 'playbooks' && (
              <div className="h-full overflow-auto p-4">
                <PlaybooksPanel
                  className="h-full"
                  onTasksCreated={() => {
                    setRightSidebarMode('tasks')
                    toast.success('Tasks created! Switching to tasks view.')
                  }}
                />
              </div>
            )}

            {rightSidebarMode === 'calendar' && (
              <ScrollArea className="h-full">
                <MiniCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} events={filteredEvents} />
                <div className="px-4 py-3 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <span className="uppercase tracking-wider text-muted-foreground">Sources</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {calendarSources.map(source => {
                        const SourceIcon = source.icon
                        return (
                          <label key={source.id} className="flex items-center gap-2.5 cursor-pointer group">
                            <Checkbox
                              checked={source.visible}
                              onCheckedChange={(checked) => {
                                setCalendarSources(sources => sources.map(s =>
                                  s.id === source.id ? { ...s, visible: checked } : s
                                ))
                              }}
                              className={cn(
                                "border-2 transition-colors",
                                source.color === 'rose' && "border-rose-500 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500",
                                source.color === 'teal' && "border-teal-500 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                              )}
                            />
                            <SourceIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="group-hover:text-foreground transition-colors">{source.name}</span>
                          </label>
                        )
                      })}
                    </div>
                    {projectList.length > 0 && (
                      <div className="space-y-2">
                        <p className="uppercase tracking-wider text-muted-foreground">Projects</p>
                        <div className="space-y-2">
                          {projectList.map((project) => {
                            const isOpen = expandedProjects[project.id] ?? true
                            return (
                              <div key={project.id} className="rounded-md border bg-background/60">
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
                                  onClick={() => setExpandedProjects(prev => ({ ...prev, [project.id]: !isOpen }))}
                                >
                                  <span className="truncate">{project.name || project.title}</span>
                                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                                </button>
                                {isOpen && (
                                  <div className="px-3 pb-3 space-y-2 border-t pt-2">
                                    {[
                                      { key: 'booking', name: 'Bookings', icon: CalendarCheck },
                                      { key: 'crm-followup', name: 'CRM Follow-ups', icon: Users },
                                      { key: 'crm-activity', name: 'CRM Activities', icon: Clock },
                                    ].map(source => {
                                      const SourceIcon = source.icon
                                      const vis = projectSourceVisibility[project.id] || {}
                                      return (
                                        <label key={source.key} className="flex items-center gap-2 cursor-pointer group">
                                          <Checkbox
                                            checked={vis[source.key] !== false}
                                            onCheckedChange={(checked) => {
                                              setProjectSourceVisibility(prev => ({
                                                ...prev,
                                                [project.id]: {
                                                  ...prev[project.id],
                                                  [source.key]: checked,
                                                },
                                              }))
                                            }}
                                            className="border-2"
                                          />
                                          <SourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="truncate group-hover:text-foreground transition-colors">{source.name}</span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <span className="uppercase tracking-wider text-muted-foreground">Agenda</span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {isSameDay(selectedDate, today) ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {getEventsForDay(selectedDate).length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">No events scheduled</p>
                    ) : (
                      getEventsForDay(selectedDate).slice(0, 6).map((event, i) => {
                        const colors = EVENT_COLORS[event.color] || EVENT_COLORS.default
                        return (
                          <motion.div
                            key={event.id || i}
                            className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                            whileHover={{ x: 2 }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: colors.accent }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{event.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(event.startTime)} – {formatTime(event.endTime)}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </div>
                {signalEnabled && (
                  <div className="px-4 py-3 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</span>
                    </div>
                    <div className="space-y-2">
                      <motion.div
                        className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Schedule Analysis</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          You have 2.5 hours of focus time available this afternoon.
                        </p>
                      </motion.div>
                      <motion.div
                        className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Recommendation</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Block 2-4 PM for deep work — your most productive hours.
                        </p>
                      </motion.div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            )}
          </>
        )}
      >
        <ModuleLayout.Header title="Sync" icon={MODULE_ICONS.sync} subtitle={subtitle} actions={headerActions} />
        <ModuleLayout.Content noPadding>
          {centerView === 'bookings' ? (
            <BookingsListPanel inline onClose={() => setCenterView('calendar')} />
          ) : centerView === 'booking-types' ? (
            <BookingTypesPanel inline onClose={() => setCenterView('calendar')} />
          ) : centerView === 'hosts' ? (
            <HostsPanel inline onClose={() => setCenterView('calendar')} />
          ) : centerView === 'integrations' ? (
            <UserGoogleIntegrationPanel inline context="sync" onClose={() => setCenterView('calendar')} />
          ) : (
          <div className="flex-1 overflow-auto h-full min-h-0 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] min-w-0">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <UptradeSpinner size="lg" label="Loading calendar..." />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3" />
                  <p className="font-medium">Failed to load calendar</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={loadCalendarData}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : viewMode === 'week' ? (
              // ===== WEEK VIEW =====
              <div className="h-full flex flex-col min-h-0">
                {/* Day Headers */}
                <div className="flex-shrink-0 flex border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/90 backdrop-blur-md sticky top-0 z-10">
                  <div className="w-[60px] flex-shrink-0 border-r border-[var(--glass-border)]" /> {/* Time column spacer */}
                  <div className="flex-1 grid grid-cols-7">
                    {weekDates.map((date, i) => {
                      const isCurrentDay = isSameDay(date, today)
                      return (
                        <div 
                          key={i}
                          className={cn(
                            "text-center py-3 border-r border-[var(--glass-border)] last:border-r-0",
                            isCurrentDay && "bg-emerald-50 dark:bg-emerald-500/5"
                          )}
                        >
                          <div className="text-xs text-muted-foreground font-medium mb-1">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                            isCurrentDay && "bg-emerald-500 text-white shadow-sm"
                          )}>
                            {date.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Time Grid */}
                <div className="flex-1 flex flex-col relative min-h-0">
                  {/* Current time indicator */}
                  {weekDates.some(d => isSameDay(d, today)) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute h-0.5 bg-red-500 z-20 pointer-events-none"
                      style={{ top: `${getCurrentTimePosition()}%`, left: '60px', right: 0 }}
                    >
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                    </motion.div>
                  )}
                  
                  {hours.map((hour) => (
                    <div key={hour} className="flex flex-1 min-h-[40px] border-b border-[var(--glass-border)] last:border-b-0">
                      {/* Time Label */}
                      <div className="w-[60px] flex-shrink-0 text-[11px] text-muted-foreground text-right pr-3 pt-0.5 border-r border-[var(--glass-border)]">
                        {formatHour(hour)}
                      </div>
                      
                      {/* Day Columns */}
                      <div className="flex-1 grid grid-cols-7">
                      {weekDates.map((date, dayIndex) => {
                        const isCurrentDay = isSameDay(date, today)
                        const hourEvents = filteredEvents.filter(e => 
                          isSameDay(e.startTime, date) && 
                          e.startTime.getHours() === hour
                        )
                        
                        return (
                          <div 
                            key={dayIndex}
                            onClick={() => handleGridClick(date, hour)}
                            className={cn(
                              "border-r border-[var(--glass-border)] last:border-r-0 relative group cursor-pointer transition-colors",
                              isCurrentDay && "bg-emerald-50/50 dark:bg-emerald-500/5",
                              "hover:bg-muted/30"
                            )}
                          >
                            {/* Events - using percentage-based positioning */}
                            {hourEvents.map((event, eventIndex) => {
                              const colors = EVENT_COLORS[event.color] || EVENT_COLORS.default
                              const durationMinutes = (event.endTime - event.startTime) / (1000 * 60)
                              const heightPercent = Math.max(33, (durationMinutes / 60) * 100)
                              
                              return (
                                <motion.div
                                  key={event.id || eventIndex}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.02 }}
                                  onClick={(e) => handleEventClick(e, event)}
                                  className={cn(
                                    "absolute left-0.5 right-0.5 rounded-md px-2 py-1 text-xs cursor-pointer overflow-hidden z-10",
                                    "shadow-sm hover:shadow-md transition-shadow",
                                    selectedEvent?.id === event.id && "ring-2 ring-primary shadow-md"
                                  )}
                                  style={{ 
                                    height: `${heightPercent}%`,
                                    top: `${(event.startTime.getMinutes() / 60) * 100}%`,
                                    backgroundColor: `${colors.accent}2e`,
                                    borderLeft: `3px solid ${colors.accent}`,
                                  }}
                                >
                                  <div className="font-medium truncate leading-tight" style={{ color: colors.accent }}>
                                    {event.title}
                                  </div>
                                  {durationMinutes >= 30 && (
                                    <div className="text-[10px] mt-0.5" style={{ color: `${colors.accent}99` }}>
                                      {formatTime(event.startTime)} – {formatTime(event.endTime)}
                                    </div>
                                  )}
                                  {event.attendees?.length > 0 && durationMinutes >= 45 && (
                                    <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: `${colors.accent}99` }}>
                                      <Users className="h-3 w-3" />
                                      {event.attendees.length}
                                    </div>
                                  )}
                                </motion.div>
                              )
                            })}
                            
                            {/* Add event on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // ===== DAY VIEW =====
              <div className="h-full flex flex-col min-h-0">
                {hours.map((hour) => {
                  const hourEvents = filteredEvents.filter(e => 
                    isSameDay(e.startTime, selectedDate) && 
                    e.startTime.getHours() === hour
                  )
                  
                  return (
                    <div key={hour} className="flex flex-1 min-h-[40px] border-b border-[var(--glass-border)]">
                      <div className="w-20 flex-shrink-0 text-xs text-muted-foreground text-right pr-4 pt-1 border-r border-[var(--glass-border)]">
                        {formatHour(hour)}
                      </div>
                      <div 
                        className="flex-1 relative border-l border-[var(--glass-border)] group hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleGridClick(selectedDate, hour)}
                      >
                        {hourEvents.map((event, i) => {
                          const colors = EVENT_COLORS[event.color] || EVENT_COLORS.default
                          const durationMinutes = (event.endTime - event.startTime) / (1000 * 60)
                          const heightPercent = Math.max(33, (durationMinutes / 60) * 100)
                          return (
                            <motion.div
                              key={event.id || i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={(e) => handleEventClick(e, event)}
                              className={cn(
                                "absolute left-2 right-2 rounded-md px-3 py-2 text-sm shadow-sm overflow-hidden cursor-pointer z-10",
                                selectedEvent?.id === event.id && "ring-2 ring-primary shadow-md"
                              )}
                              style={{ 
                                backgroundColor: `${colors.accent}2e`,
                                borderLeft: `3px solid ${colors.accent}`,
                                height: `${heightPercent}%`,
                                top: `${(event.startTime.getMinutes() / 60) * 100}%`,
                              }}
                            >
                              <div className="font-medium" style={{ color: colors.accent }}>{event.title}</div>
                              <div className="text-xs" style={{ color: `${colors.accent}99` }}>
                                {formatTime(event.startTime)} – {formatTime(event.endTime)}
                              </div>
                            </motion.div>
                          )
                        })}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Plus className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          )}
        </ModuleLayout.Content>
      </ModuleLayout>
      
        {/* ===== MODALS ===== */}
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setCreateModalTime(null) }}
          initialType={createModalType}
          selectedDate={selectedDate}
          selectedTime={createModalTime}
          onCreated={loadCalendarData}
        />
        
        {/* Event Detail Dialog */}
        <EventDetailDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDeleted={() => { setSelectedEvent(null); loadCalendarData() }}
          onUpdated={() => { setSelectedEvent(null); loadCalendarData() }}
        />
        
        <PlanDayDialog
          open={showPlanDay}
          onOpenChange={setShowPlanDay}
          projectId={currentProject?.id}
          initialDate={selectedDate}
          onPlanComplete={loadCalendarData}
        />
        
        <AvailabilityExceptionsPanel
          isOpen={showExceptionsPanel}
          onClose={() => setShowExceptionsPanel(false)}
          hosts={hosts}
        />
        
        <CalendarConnectionsPanel
          isOpen={!!showCalendarConnections}
          onClose={() => setShowCalendarConnections(null)}
          hostId={showCalendarConnections?.id}
          hostName={showCalendarConnections?.name || showCalendarConnections?.email}
        />
        
        {/* ===== AI PANEL MODALS ===== */}
        
        {/* Daily Briefing Modal */}
        <Dialog open={showAIPanel === 'briefing'} onOpenChange={() => setShowAIPanel(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Daily Briefing
              </DialogTitle>
              <DialogDescription>
                Your AI-generated overview for {format(selectedDate, 'EEEE, MMMM d')}
              </DialogDescription>
            </DialogHeader>
            
            {dailyBriefing ? (
              <div className="space-y-6 mt-4">
                {/* Summary */}
                {dailyBriefing.summary && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-gray-700">{dailyBriefing.summary}</p>
                  </div>
                )}
                
                {/* Today's Focus */}
                {dailyBriefing.focus && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      Today's Focus
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(dailyBriefing.focus) ? dailyBriefing.focus : [dailyBriefing.focus]).map((item, i) => (
                        <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="text-sm text-gray-700">{typeof item === 'string' ? item : item.title || item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Meetings */}
                {dailyBriefing.meetings?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-500" />
                      Meetings ({dailyBriefing.meetings.length})
                    </h4>
                    <div className="space-y-2">
                      {dailyBriefing.meetings.map((meeting, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                            <p className="text-xs text-gray-500">{meeting.time || meeting.start}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setShowAIPanel(null)
                              loadMeetingPrep(meeting)
                            }}
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            Prep
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks */}
                {dailyBriefing.tasks?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      Priority Tasks ({dailyBriefing.tasks.length})
                    </h4>
                    <div className="space-y-2">
                      {dailyBriefing.tasks.map((task, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-sm text-gray-700">{typeof task === 'string' ? task : task.title || task.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Insights */}
                {dailyBriefing.insights && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      AI Insights
                    </h4>
                    <p className="text-sm text-gray-600">{dailyBriefing.insights}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <UptradeSpinner size="lg" className="[&_svg]:text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Focus Time Modal */}
        <Dialog open={showAIPanel === 'focus'} onOpenChange={() => setShowAIPanel(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Focus className="h-5 w-5 text-purple-500" />
                Focus Time Recommendations
              </DialogTitle>
              <DialogDescription>
                AI-optimized time blocks for deep work based on your schedule patterns
              </DialogDescription>
            </DialogHeader>
            
            {focusRecommendations ? (
              <div className="space-y-4 mt-4">
                {focusRecommendations.recommendations?.length > 0 ? (
                  focusRecommendations.recommendations.map((slot, i) => (
                    <div key={i} className="p-4 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {slot.start} - {slot.end}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {slot.reason || slot.description || 'Optimal focus window'}
                        </p>
                        {slot.score && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {Math.round(slot.score * 100)}% optimal
                          </Badge>
                        )}
                      </div>
                      <Button 
                        size="sm"
                        loading={aiLoading === 'blocking'}
                        onClick={() => handleBlockFocusTime(slot)}
                        disabled={aiLoading === 'blocking'}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Block
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No focus time recommendations available</p>
                    <p className="text-xs mt-1">Your calendar may be fully booked</p>
                  </div>
                )}
                
                {focusRecommendations.insights && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
                    <p className="text-xs text-amber-800">
                      <Lightbulb className="h-3 w-3 inline mr-1" />
                      {focusRecommendations.insights}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <UptradeSpinner size="lg" className="[&_svg]:text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Meeting Prep Modal */}
        <Dialog open={showAIPanel === 'prep'} onOpenChange={() => setShowAIPanel(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Meeting Prep
              </DialogTitle>
              <DialogDescription>
                AI-generated preparation notes for your meeting
              </DialogDescription>
            </DialogHeader>
            
            {meetingPrep ? (
              <div className="space-y-6 mt-4">
                {/* Meeting Info */}
                {meetingPrep.meeting && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-gray-900">{meetingPrep.meeting.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {meetingPrep.meeting.time || meetingPrep.meeting.start}
                    </p>
                    {meetingPrep.meeting.attendees && (
                      <p className="text-xs text-gray-500 mt-2">
                        With: {Array.isArray(meetingPrep.meeting.attendees) 
                          ? meetingPrep.meeting.attendees.join(', ') 
                          : meetingPrep.meeting.attendees}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Agenda */}
                {meetingPrep.agenda && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      Suggested Agenda
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(meetingPrep.agenda) ? meetingPrep.agenda : [meetingPrep.agenda]).map((item, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-3">
                          <span className="text-xs font-medium text-muted-foreground mt-0.5">{i + 1}.</span>
                          <p className="text-sm text-gray-700">{typeof item === 'string' ? item : item.topic || item.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Key Points */}
                {meetingPrep.keyPoints && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Key Points to Address
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(meetingPrep.keyPoints) ? meetingPrep.keyPoints : [meetingPrep.keyPoints]).map((point, i) => (
                        <div key={i} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-gray-700">{typeof point === 'string' ? point : point.point || point.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Context */}
                {meetingPrep.context && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <History className="h-4 w-4 text-purple-500" />
                      Background Context
                    </h4>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-700">{meetingPrep.context}</p>
                    </div>
                  </div>
                )}
                
                {/* Questions */}
                {meetingPrep.questions && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                      Questions to Ask
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(meetingPrep.questions) ? meetingPrep.questions : [meetingPrep.questions]).map((q, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm text-gray-700">{typeof q === 'string' ? q : q.question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <UptradeSpinner size="lg" className="[&_svg]:text-muted-foreground" />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsDialog
          open={showKeyboardShortcuts}
          onOpenChange={setShowKeyboardShortcuts}
        />
    </TooltipProvider>
  )
}
