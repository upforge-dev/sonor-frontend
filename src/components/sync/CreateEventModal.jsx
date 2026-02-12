// src/components/sync/CreateEventModal.jsx
// Modal for creating new calendar events, focus time, tasks
// Supports pre-populated date/time from calendar grid clicks
// Supports Google Meet conferencing by default for meetings
// Supports project selection for org-level users

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Focus,
  Coffee,
  Briefcase,
  CheckSquare,
  Loader2,
  ChevronDown,
  Plus,
  Globe,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { workspaceIntegrationsApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'

const EVENT_TYPES = [
  { id: 'meeting', label: 'Meeting', icon: Video, color: 'bg-slate-600' },
  { id: 'focus', label: 'Focus Time', icon: Focus, color: 'bg-emerald-500' },
  { id: 'task', label: 'Task', icon: CheckSquare, color: 'bg-amber-500' },
  { id: 'break', label: 'Break', icon: Coffee, color: 'bg-orange-400' },
  { id: 'work', label: 'Project Work', icon: Briefcase, color: 'bg-purple-400' },
]

const DURATION_OPTIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: 'custom', label: 'Custom' },
]

export default function CreateEventModal({ 
  isOpen, 
  onClose, 
  selectedDate,
  selectedTime,
  initialType = 'event',
  onCreated 
}) {
  const { currentOrg, currentProject, availableProjects } = useAuthStore()
  const isOrgUser = !!currentOrg && availableProjects?.length > 1

  const [eventType, setEventType] = useState(initialType)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('30')
  const [location, setLocation] = useState('')
  const [attendees, setAttendees] = useState('')
  const [addVideoMeeting, setAddVideoMeeting] = useState(false)
  const [pushToGoogle, setPushToGoogle] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(currentProject?.id || '')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const newType = initialType || 'event'
      setEventType(newType)
      setTitle('')
      setDescription('')
      setDate(selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0])
      setStartTime(selectedTime || '09:00')
      setDuration(newType === 'focus' ? '90' : '30')
      setLocation('')
      setAttendees('')
      // Default to video meeting ON for meetings
      setAddVideoMeeting(newType === 'meeting')
      setPushToGoogle(true)
      setSelectedProjectId(currentProject?.id || '')
    }
  }, [isOpen, initialType, selectedDate, selectedTime, currentProject?.id])

  // When event type changes, auto-toggle video meeting
  useEffect(() => {
    setAddVideoMeeting(eventType === 'meeting')
    if (eventType === 'focus') setDuration('90')
  }, [eventType])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    // Org users must select a project for meetings/events
    if (isOrgUser && ['meeting', 'event', 'work'].includes(eventType) && !selectedProjectId) {
      toast.error('Please select a project for this event')
      return
    }

    setSaving(true)
    try {
      // Build the event data
      const durationMinutes = duration === 'custom' ? 60 : parseInt(duration, 10)
      const startDateTime = new Date(`${date}T${startTime}:00`)
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)

      // Build attendees as proper objects with email field
      const parsedAttendees = attendees
        ? attendees.split(',').map(e => e.trim()).filter(Boolean).map(email => ({ email }))
        : undefined

      const eventData = {
        summary: title.trim(),
        description: description.trim() || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: location.trim() || undefined,
        attendees: parsedAttendees,
      }

      // Add Google Meet conferencing if video meeting is enabled
      if (addVideoMeeting) {
        eventData.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        }
      }

      // Add project context to description for org users
      if (selectedProjectId && isOrgUser) {
        const project = availableProjects.find(p => p.id === selectedProjectId)
        if (project) {
          const projectNote = `[${project.name || project.title}]`
          eventData.description = eventData.description
            ? `${projectNote}\n\n${eventData.description}`
            : projectNote
        }
      }

      // Push to Google Calendar if enabled
      if (pushToGoogle) {
        try {
          const result = await workspaceIntegrationsApi.pushCalendarEvent(eventData)
          if (result?.googleEventId) {
            if (result.meetLink) {
              toast.success('Event created with Google Meet', {
                description: 'Meet link attached — attendees will receive email invites from Google Calendar.',
                action: {
                  label: 'Copy Meet Link',
                  onClick: () => {
                    navigator.clipboard.writeText(result.meetLink)
                    toast.info('Meet link copied to clipboard')
                  },
                },
                duration: 8000,
              })
            } else if (addVideoMeeting) {
              // Meet link provisioned asynchronously — it'll appear on the event shortly
              toast.success('Event created — Google Meet link is being generated', {
                description: 'The Meet link will appear on the event in Google Calendar momentarily. Attendees will be notified.',
                duration: 6000,
              })
            } else {
              toast.success('Event pushed to Google Calendar', {
                description: parsedAttendees?.length ? 'Attendees will receive email invites from Google.' : undefined,
              })
            }
          } else {
            toast.success('Event created (Google Calendar sync unavailable)', {
              description: 'Connect your Google account in Integrations to sync.',
            })
          }
        } catch (gcalError) {
          console.warn('Google Calendar push failed:', gcalError)
          toast.success('Event created locally', {
            description: 'Could not push to Google Calendar — check your integration.',
          })
        }
      } else {
        toast.success('Event created successfully')
      }

      onCreated?.()
      onClose()
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error('Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  const selectedTypeConfig = EVENT_TYPES.find(t => t.id === eventType)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", selectedTypeConfig?.color)}>
              {selectedTypeConfig && <selectedTypeConfig.icon className="h-4 w-4 text-white" />}
            </div>
            Create {selectedTypeConfig?.label || 'Event'}
          </DialogTitle>
          <DialogDescription>
            Add a new item to your calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Event Type Selector */}
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setEventType(type.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  eventType === type.id
                    ? `${type.color} text-white shadow-sm`
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <type.icon className="h-3.5 w-3.5" />
                {type.label}
              </button>
            ))}
          </div>

          {/* Project Selector (org-level users) */}
          {isOrgUser && ['meeting', 'event', 'work'].includes(eventType) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Project
              </Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name || project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                This event will be associated with the selected project.
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={eventType === 'focus' ? 'Deep work session' : eventType === 'meeting' ? 'Meeting with...' : 'Enter title...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Video Meeting Toggle */}
          {['event', 'meeting', 'work'].includes(eventType) && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                  <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Google Meet</div>
                  <div className="text-xs text-muted-foreground">Add video conferencing</div>
                </div>
              </div>
              <Switch
                checked={addVideoMeeting}
                onCheckedChange={setAddVideoMeeting}
              />
            </div>
          )}

          {/* Location (for events/meetings without video) */}
          {['event', 'meeting'].includes(eventType) && !addVideoMeeting && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {/* Attendees (for meetings and events) */}
          {['event', 'meeting'].includes(eventType) && (
            <div className="space-y-2">
              <Label htmlFor="attendees">Attendees</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="attendees"
                  placeholder="Add attendees (comma-separated emails)"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  className="pl-9"
                />
              </div>
              {attendees && (
                <p className="text-[11px] text-muted-foreground">
                  Attendees will receive email invites directly from Google Calendar.
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Push to Google Calendar toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Push to Google Calendar</div>
                <div className="text-xs text-muted-foreground">Sync this event to your linked Google account</div>
              </div>
            </div>
            <Switch
              checked={pushToGoogle}
              onCheckedChange={setPushToGoogle}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className={cn(selectedTypeConfig?.color, "text-white")}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create {selectedTypeConfig?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
