/**
 * CRMRemindersManager - Comprehensive reminders with Sync calendar integration
 * 
 * Features:
 * - Create/edit/delete reminders
 * - Link reminders to prospects
 * - Schedule reminders with Sync calendar
 * - Email/SMS notification options
 * - Snooze and reschedule functionality
 * - Recurring reminders
 * - Priority levels
 * - Status tracking (upcoming, snoozed, completed, overdue)
 * - Calendar view integration
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Plus,
  Calendar,
  Clock,
  Bell,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  CalendarPlus,
  X,
  Mail,
  MessageSquare,
  Repeat,
  AlarmClock,
  BellOff,
  CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { crmApi, syncApi } from '@/lib/sonor-api'
import { toast } from '@/lib/toast'
import { format, isPast, isToday, isTomorrow, addMinutes, addHours, addDays } from 'date-fns'

// Priority configurations
const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30'
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30'
  },
  high: {
    label: 'High',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30'
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30'
  }
}

export default function CRMRemindersManager({ projectId, brandColors }) {
  const [reminders, setReminders] = useState([])
  const [prospects, setProspects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedReminders, setSelectedReminders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('upcoming') // all, upcoming, snoozed, completed, overdue
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [prospectFilter, setProspectFilter] = useState('all')
  
  // Reminder dialog state
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    prospect_id: null,
    remind_at: '',
    priority: 'medium',
    notification_methods: ['portal'], // portal, email, sms
    is_recurring: false,
    recurring_interval: 'daily', // daily, weekly, monthly
    recurring_until: '',
    schedule_sync_event: false, // Create calendar event in Sync
    sync_event_duration: 30, // minutes
  })

  // Fetch reminders and prospects
  useEffect(() => {
    fetchReminders()
    fetchProspects()
  }, [projectId])

  const fetchReminders = useCallback(async () => {
    if (!projectId) return
    
    setIsLoading(true)
    try {
      const response = await crmApi.listReminders({ project_id: projectId })
      // Handle both array and object responses
      const reminderData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.reminders || []
      setReminders(reminderData)
    } catch (err) {
      console.error('Failed to fetch reminders:', err)
      toast.error('Failed to load reminders')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const fetchProspects = useCallback(async () => {
    if (!projectId) return
    
    try {
      const response = await crmApi.listProspects({ project_id: projectId })
      // API returns { prospects: [...], total, summary, pagination }
      setProspects(response.data?.prospects || [])
    } catch (err) {
      console.error('Failed to fetch prospects:', err)
    }
  }, [projectId])

  // Filtered reminders
  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = searchQuery === '' || 
      reminder.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Status filtering
    let matchesStatus = true
    if (statusFilter !== 'all') {
      const remindDate = reminder.remind_at ? new Date(reminder.remind_at) : null
      if (statusFilter === 'upcoming') {
        matchesStatus = !reminder.completed_at && remindDate && !isPast(remindDate)
      } else if (statusFilter === 'overdue') {
        matchesStatus = !reminder.completed_at && remindDate && isPast(remindDate)
      } else if (statusFilter === 'completed') {
        matchesStatus = !!reminder.completed_at
      } else if (statusFilter === 'snoozed') {
        matchesStatus = reminder.snoozed_until && new Date(reminder.snoozed_until) > new Date()
      }
    }
    
    const matchesPriority = priorityFilter === 'all' || reminder.priority === priorityFilter
    const matchesProspect = prospectFilter === 'all' || reminder.prospect_id === prospectFilter
    
    return matchesSearch && matchesStatus && matchesPriority && matchesProspect
  })

  // Group reminders by status
  const remindersByStatus = {
    overdue: filteredReminders.filter(r => {
      const remindDate = r.remind_at ? new Date(r.remind_at) : null
      return !r.completed_at && remindDate && isPast(remindDate)
    }),
    today: filteredReminders.filter(r => {
      const remindDate = r.remind_at ? new Date(r.remind_at) : null
      return !r.completed_at && remindDate && isToday(remindDate)
    }),
    upcoming: filteredReminders.filter(r => {
      const remindDate = r.remind_at ? new Date(r.remind_at) : null
      return !r.completed_at && remindDate && !isPast(remindDate) && !isToday(remindDate)
    }),
    completed: filteredReminders.filter(r => r.completed_at)
  }

  // Create/update reminder
  const handleSaveReminder = async () => {
    if (!reminderForm.title.trim()) {
      toast.error('Reminder title is required')
      return
    }
    if (!reminderForm.remind_at) {
      toast.error('Reminder date/time is required')
      return
    }

    setIsCreating(true)
    try {
      // Build payload - pushToCalendar is now handled by the backend
      const payload = {
        title: reminderForm.title,
        dueAt: reminderForm.remind_at,
        reminderType: reminderForm.reminder_type || 'follow_up',
        notes: reminderForm.description,
        projectId: projectId,
        // Backend will create calendar event automatically unless this is false
        pushToCalendar: reminderForm.schedule_sync_event !== false,
      }

      if (editingReminder) {
        await crmApi.updateReminder(editingReminder.id, payload)
        toast.success('Reminder updated')
      } else {
        await crmApi.createReminder(reminderForm.prospect_id || projectId, payload)
        toast.success(reminderForm.schedule_sync_event !== false 
          ? 'Reminder created with calendar event' 
          : 'Reminder created')
      }

      fetchReminders()
      closeReminderDialog()
    } catch (err) {
      console.error('Failed to save reminder:', err)
      toast.error(editingReminder ? 'Failed to update reminder' : 'Failed to create reminder')
    } finally {
      setIsCreating(false)
    }
  }

  // Delete reminder
  const handleDeleteReminder = async (reminderId) => {
    if (!confirm('Delete this reminder?')) return
    
    try {
      await crmApi.deleteReminder(reminderId)
      toast.success('Reminder deleted')
      fetchReminders()
    } catch (err) {
      console.error('Failed to delete reminder:', err)
      toast.error('Failed to delete reminder')
    }
  }

  // Complete reminder
  const handleCompleteReminder = async (reminder) => {
    try {
      await crmApi.completeReminder(reminder.id)
      setReminders(reminders.map(r => 
        r.id === reminder.id ? { ...r, completed_at: new Date().toISOString() } : r
      ))
      toast.success('Reminder completed!')
    } catch (err) {
      console.error('Failed to complete reminder:', err)
      toast.error('Failed to complete reminder')
    }
  }

  // Snooze reminder
  const handleSnoozeReminder = async (reminder, duration) => {
    const snoozeUntil = duration === 'custom' 
      ? null 
      : duration === '1h' 
        ? addHours(new Date(), 1)
        : duration === '4h'
          ? addHours(new Date(), 4)
          : duration === '1d'
            ? addDays(new Date(), 1)
            : addDays(new Date(), 7)
    
    try {
      await crmApi.updateReminder(reminder.id, {
        snoozed_until: snoozeUntil?.toISOString()
      })
      toast.success(`Reminder snoozed ${duration === '1h' ? 'for 1 hour' : duration === '4h' ? 'for 4 hours' : duration === '1d' ? 'for 1 day' : 'for 1 week'}`)
      fetchReminders()
    } catch (err) {
      console.error('Failed to snooze reminder:', err)
      toast.error('Failed to snooze reminder')
    }
  }

  // Bulk actions
  const handleBulkComplete = async () => {
    if (selectedReminders.length === 0) return
    
    try {
      await Promise.all(
        selectedReminders.map(id => crmApi.completeReminder(id))
      )
      toast.success(`${selectedReminders.length} reminders completed`)
      setSelectedReminders([])
      fetchReminders()
    } catch (err) {
      console.error('Failed to complete reminders:', err)
      toast.error('Failed to complete reminders')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedReminders.length === 0) return
    if (!confirm(`Delete ${selectedReminders.length} reminders?`)) return
    
    try {
      await Promise.all(
        selectedReminders.map(id => crmApi.deleteReminder(id))
      )
      toast.success(`${selectedReminders.length} reminders deleted`)
      setSelectedReminders([])
      fetchReminders()
    } catch (err) {
      console.error('Failed to delete reminders:', err)
      toast.error('Failed to delete reminders')
    }
  }

  // Dialog management
  const openCreateDialog = () => {
    setEditingReminder(null)
    setReminderForm({
      title: '',
      description: '',
      prospect_id: null,
      remind_at: '',
      priority: 'medium',
      notification_methods: ['portal'],
      is_recurring: false,
      recurring_interval: 'daily',
      recurring_until: '',
      schedule_sync_event: false,
      sync_event_duration: 30,
    })
    setIsReminderDialogOpen(true)
  }

  const openEditDialog = (reminder) => {
    setEditingReminder(reminder)
    setReminderForm({
      title: reminder.title || '',
      description: reminder.description || '',
      prospect_id: reminder.prospect_id,
      remind_at: reminder.remind_at || '',
      priority: reminder.priority || 'medium',
      notification_methods: reminder.notification_methods || ['portal'],
      is_recurring: reminder.is_recurring || false,
      recurring_interval: reminder.recurring_interval || 'daily',
      recurring_until: reminder.recurring_until || '',
      schedule_sync_event: false,
      sync_event_duration: 30,
    })
    setIsReminderDialogOpen(true)
  }

  const closeReminderDialog = () => {
    setIsReminderDialogOpen(false)
    setEditingReminder(null)
  }

  // Format reminder time
  const formatReminderTime = (remindAt) => {
    if (!remindAt) return null
    const date = new Date(remindAt)
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
    if (isPast(date)) return `Overdue - ${format(date, 'MMM d, h:mm a')}`
    return format(date, 'MMM d, yyyy h:mm a')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" style={{ color: brandColors.primary }} />
              Reminders
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule follow-ups and never miss important actions
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            style={{ backgroundColor: brandColors.primary, color: 'white' }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Reminder
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="snoozed">Snoozed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={prospectFilter} onValueChange={setProspectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Prospect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prospects</SelectItem>
              {prospects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedReminders.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkComplete}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete ({selectedReminders.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reminders List */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColors.primary }} />
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No reminders found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || prospectFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Set your first reminder to stay on top of follow-ups'}
              </p>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && prospectFilter === 'all' && (
                <Button
                  onClick={openCreateDialog}
                  style={{ backgroundColor: brandColors.primary, color: 'white' }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Reminder
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overdue Reminders */}
              {remindersByStatus.overdue.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Overdue ({remindersByStatus.overdue.length})
                  </h3>
                  <div className="space-y-2">
                    {remindersByStatus.overdue.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        isSelected={selectedReminders.includes(reminder.id)}
                        onToggleSelect={() => {
                          setSelectedReminders(prev =>
                            prev.includes(reminder.id)
                              ? prev.filter(id => id !== reminder.id)
                              : [...prev, reminder.id]
                          )
                        }}
                        onComplete={handleCompleteReminder}
                        onSnooze={handleSnoozeReminder}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteReminder}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Reminders */}
              {remindersByStatus.today.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Today ({remindersByStatus.today.length})
                  </h3>
                  <div className="space-y-2">
                    {remindersByStatus.today.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        isSelected={selectedReminders.includes(reminder.id)}
                        onToggleSelect={() => {
                          setSelectedReminders(prev =>
                            prev.includes(reminder.id)
                              ? prev.filter(id => id !== reminder.id)
                              : [...prev, reminder.id]
                          )
                        }}
                        onComplete={handleCompleteReminder}
                        onSnooze={handleSnoozeReminder}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteReminder}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Reminders */}
              {remindersByStatus.upcoming.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Upcoming ({remindersByStatus.upcoming.length})
                  </h3>
                  <div className="space-y-2">
                    {remindersByStatus.upcoming.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        isSelected={selectedReminders.includes(reminder.id)}
                        onToggleSelect={() => {
                          setSelectedReminders(prev =>
                            prev.includes(reminder.id)
                              ? prev.filter(id => id !== reminder.id)
                              : [...prev, reminder.id]
                          )
                        }}
                        onComplete={handleCompleteReminder}
                        onSnooze={handleSnoozeReminder}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteReminder}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Reminders */}
              {remindersByStatus.completed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed ({remindersByStatus.completed.length})
                  </h3>
                  <div className="space-y-2">
                    {remindersByStatus.completed.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        isSelected={selectedReminders.includes(reminder.id)}
                        onToggleSelect={() => {
                          setSelectedReminders(prev =>
                            prev.includes(reminder.id)
                              ? prev.filter(id => id !== reminder.id)
                              : [...prev, reminder.id]
                          )
                        }}
                        onComplete={handleCompleteReminder}
                        onSnooze={handleSnoozeReminder}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteReminder}
                        prospects={prospects}
                        brandColors={brandColors}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium block mb-2">Title *</label>
              <Input
                placeholder="Reminder title..."
                value={reminderForm.title}
                onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Description</label>
              <Textarea
                placeholder="Reminder details..."
                value={reminderForm.description}
                onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={reminderForm.remind_at}
                  onChange={(e) => setReminderForm({ ...reminderForm, remind_at: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Priority</label>
                <Select
                  value={reminderForm.priority}
                  onValueChange={(value) => setReminderForm({ ...reminderForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Linked Prospect</label>
              <Select
                value={reminderForm.prospect_id || 'none'}
                onValueChange={(value) => setReminderForm({ ...reminderForm, prospect_id: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {prospects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notification Methods */}
            <div>
              <label className="text-sm font-medium block mb-2">Notification Methods</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notify_portal"
                    checked={reminderForm.notification_methods.includes('portal')}
                    onCheckedChange={(checked) => {
                      const methods = checked
                        ? [...reminderForm.notification_methods, 'portal']
                        : reminderForm.notification_methods.filter(m => m !== 'portal')
                      setReminderForm({ ...reminderForm, notification_methods: methods })
                    }}
                  />
                  <label htmlFor="notify_portal" className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Portal Notification
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notify_email"
                    checked={reminderForm.notification_methods.includes('email')}
                    onCheckedChange={(checked) => {
                      const methods = checked
                        ? [...reminderForm.notification_methods, 'email']
                        : reminderForm.notification_methods.filter(m => m !== 'email')
                      setReminderForm({ ...reminderForm, notification_methods: methods })
                    }}
                  />
                  <label htmlFor="notify_email" className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notification
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="notify_sms"
                    checked={reminderForm.notification_methods.includes('sms')}
                    onCheckedChange={(checked) => {
                      const methods = checked
                        ? [...reminderForm.notification_methods, 'sms']
                        : reminderForm.notification_methods.filter(m => m !== 'sms')
                      setReminderForm({ ...reminderForm, notification_methods: methods })
                    }}
                  />
                  <label htmlFor="notify_sms" className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Notification
                  </label>
                </div>
              </div>
            </div>

            {/* Recurring */}
            <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_recurring"
                  checked={reminderForm.is_recurring}
                  onCheckedChange={(checked) => setReminderForm({ ...reminderForm, is_recurring: checked })}
                />
                <label htmlFor="is_recurring" className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Recurring Reminder
                </label>
              </div>
              
              {reminderForm.is_recurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Repeat Every</label>
                    <Select
                      value={reminderForm.recurring_interval}
                      onValueChange={(value) => setReminderForm({ ...reminderForm, recurring_interval: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Until (Optional)</label>
                    <Input
                      type="date"
                      value={reminderForm.recurring_until}
                      onChange={(e) => setReminderForm({ ...reminderForm, recurring_until: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sync Integration */}
            {!editingReminder && (
              <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="schedule_sync"
                    checked={reminderForm.schedule_sync_event}
                    onCheckedChange={(checked) => setReminderForm({ ...reminderForm, schedule_sync_event: checked })}
                  />
                  <label htmlFor="schedule_sync" className="text-sm font-medium flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" style={{ color: brandColors.primary }} />
                    Schedule in Sync Calendar
                  </label>
                </div>
                
                {reminderForm.schedule_sync_event && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Event Duration (minutes)</label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={reminderForm.sync_event_duration}
                      onChange={(e) => setReminderForm({ ...reminderForm, sync_event_duration: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeReminderDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReminder}
              disabled={isCreating || !reminderForm.title.trim() || !reminderForm.remind_at}
              style={{ backgroundColor: brandColors.primary, color: 'white' }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingReminder ? 'Update Reminder' : 'Create Reminder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Reminder Card Component
function ReminderCard({ reminder, isSelected, onToggleSelect, onComplete, onSnooze, onEdit, onDelete, prospects, brandColors }) {
  const priorityConfig = PRIORITY_CONFIG[reminder.priority || 'medium']
  const prospect = prospects.find(p => p.id === reminder.prospect_id)
  const remindDate = reminder.remind_at ? new Date(reminder.remind_at) : null
  const isOverdue = remindDate && isPast(remindDate) && !reminder.completed_at
  const isCompleted = !!reminder.completed_at

  const formatTime = (date) => {
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
    return format(date, 'MMM d, h:mm a')
  }

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isCompleted && "opacity-60",
      isOverdue && "border-red-200 dark:border-red-500/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          
          <button
            onClick={() => onComplete(reminder)}
            className="mt-1"
            disabled={isCompleted}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Bell className={cn(
                "h-5 w-5 transition-colors",
                isOverdue ? "text-red-600" : "text-muted-foreground hover:text-primary"
              )} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className={cn(
                "font-medium",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {reminder.title}
              </h4>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isCompleted && (
                    <>
                      <DropdownMenuItem onClick={() => onSnooze(reminder, '1h')}>
                        <AlarmClock className="h-4 w-4 mr-2" />
                        Snooze 1 hour
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSnooze(reminder, '4h')}>
                        <AlarmClock className="h-4 w-4 mr-2" />
                        Snooze 4 hours
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSnooze(reminder, '1d')}>
                        <AlarmClock className="h-4 w-4 mr-2" />
                        Snooze 1 day
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(reminder)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(reminder.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {reminder.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {reminder.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={cn(priorityConfig.bg, priorityConfig.color, priorityConfig.border)}
              >
                {priorityConfig.label}
              </Badge>

              {remindDate && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1",
                    isOverdue && "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {formatTime(remindDate)}
                </Badge>
              )}

              {prospect && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {prospect.name}
                </Badge>
              )}

              {reminder.notification_methods?.includes('email') && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Badge>
              )}

              {reminder.is_recurring && (
                <Badge 
                  variant="outline"
                  style={{ 
                    backgroundColor: brandColors.rgba.primary10,
                    color: brandColors.primary,
                    border: 'none'
                  }}
                  className="flex items-center gap-1"
                >
                  <Repeat className="h-3 w-3" />
                  {reminder.recurring_interval}
                </Badge>
              )}

              {isCompleted && (
                <Badge className="bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400">
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
