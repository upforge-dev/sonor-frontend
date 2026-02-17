// src/components/commerce/ScheduleManagement.jsx
// Manage schedules for events and classes

import { useState, useEffect } from 'react'
import useAuthStore from '@/lib/auth-store'
import portalApi from '@/lib/portal-api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  Calendar,
  Clock,
  Users,
  Edit2,
  Trash2,
  Loader2,
  Save,
  X,
  CalendarPlus,
  Repeat,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO, addDays, addWeeks, addMonths } from 'date-fns'

// Recurrence options
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

export default function ScheduleManagement({ 
  open, 
  onOpenChange, 
  offeringId, 
  offeringName,
  offeringType = 'event',
  defaultCapacity,
  onScheduleChange 
}) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [deletingSchedule, setDeletingSchedule] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSchedule, setNewSchedule] = useState(getDefaultSchedule())

  const ALLOWED_STATUSES = ['scheduled', 'cancelled', 'completed']

  function getDefaultSchedule() {
    return {
      start_time: '',
      end_time: '',
      location: '',
      max_capacity: defaultCapacity ? defaultCapacity.toString() : '',
      status: 'scheduled',
      recurrence: 'none',
      recurrence_end_date: '',
    }
  }

  function normalizeStatusForApi(status) {
    return ALLOWED_STATUSES.includes(status) ? status : 'scheduled'
  }

  // Load schedules
  useEffect(() => {
    if (open && offeringId) {
      loadSchedules()
    }
  }, [open, offeringId])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/commerce/schedules/${offeringId}`)
      const raw = response.data || []
      // API returns starts_at/ends_at; normalize for display/edit (start_time/end_time for datetime-local)
      setSchedules(raw.map((s) => ({
        ...s,
        start_time: s.starts_at || s.start_time,
        end_time: s.ends_at || s.end_time,
        max_capacity: s.capacity ?? s.max_capacity,
        current_enrollment: s.capacity != null && s.spots_remaining != null ? s.capacity - s.spots_remaining : (s.current_enrollment ?? 0),
      })))
    } catch (error) {
      console.error('Failed to load schedules:', error)
      toast.error('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSchedule = async () => {
    if (!newSchedule.start_time) {
      toast.error('Start time is required')
      return
    }

    try {
      setSaving(true)
      
      const cap = newSchedule.max_capacity ? parseInt(newSchedule.max_capacity) : null
      const scheduleData = {
        starts_at: new Date(newSchedule.start_time).toISOString(),
        ends_at: newSchedule.end_time ? new Date(newSchedule.end_time).toISOString() : new Date(newSchedule.start_time).toISOString(),
        capacity: cap,
        spots_remaining: cap,
        status: normalizeStatusForApi(newSchedule.status),
      }

      // If recurring, generate multiple schedules
      if (newSchedule.recurrence !== 'none' && newSchedule.recurrence_end_date) {
        const endDate = new Date(newSchedule.recurrence_end_date)
        let currentDate = new Date(newSchedule.start_time)
        const schedulesToCreate = []

        while (currentDate <= endDate) {
          const startIso = currentDate.toISOString()
          const endIso = newSchedule.end_time
            ? new Date(new Date(newSchedule.end_time).getTime() + (currentDate.getTime() - new Date(newSchedule.start_time).getTime())).toISOString()
            : startIso
          schedulesToCreate.push({
            ...scheduleData,
            starts_at: startIso,
            ends_at: endIso,
          })

          // Advance date based on recurrence
          switch (newSchedule.recurrence) {
            case 'daily':
              currentDate = addDays(currentDate, 1)
              break
            case 'weekly':
              currentDate = addWeeks(currentDate, 1)
              break
            case 'biweekly':
              currentDate = addWeeks(currentDate, 2)
              break
            case 'monthly':
              currentDate = addMonths(currentDate, 1)
              break
            default:
              currentDate = addDays(currentDate, 999) // Exit loop
          }
        }

        // Create all schedules (API expects starts_at, ends_at, capacity, status)
        for (const schedule of schedulesToCreate) {
          await portalApi.post(`/commerce/schedules/${offeringId}`, schedule)
        }
        toast.success(`${schedulesToCreate.length} schedules created`)
      } else {
        await portalApi.post(`/commerce/schedules/${offeringId}`, scheduleData)
        toast.success('Schedule created')
      }

      setShowAddForm(false)
      setNewSchedule(getDefaultSchedule())
      await loadSchedules()
      onScheduleChange?.()
    } catch (error) {
      console.error('Failed to create schedule:', error)
      toast.error('Failed to create schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSchedule = async () => {
    const startAt = editingSchedule?.start_time || editingSchedule?.starts_at
    if (!startAt) {
      toast.error('Start date & time is required')
      return
    }

    try {
      setSaving(true)
      await portalApi.put(`/commerce/schedule/${editingSchedule.id}`, {
        starts_at: new Date(startAt).toISOString(),
        ends_at: (editingSchedule.end_time || editingSchedule.ends_at)
          ? new Date(editingSchedule.end_time || editingSchedule.ends_at).toISOString()
          : new Date(startAt).toISOString(),
        capacity: editingSchedule.max_capacity ? parseInt(editingSchedule.max_capacity) : (editingSchedule.capacity ?? null),
        status: normalizeStatusForApi(editingSchedule.status),
      })

      toast.success('Schedule updated')
      setEditingSchedule(null)
      await loadSchedules()
      onScheduleChange?.()
    } catch (error) {
      console.error('Failed to update schedule:', error)
      toast.error('Failed to update schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSchedule = async () => {
    if (!deletingSchedule) return

    try {
      setSaving(true)
      await portalApi.delete(`/commerce/schedule/${deletingSchedule.id}`)

      toast.success('Schedule deleted')
      setDeletingSchedule(null)
      await loadSchedules()
      onScheduleChange?.()
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      toast.error('Failed to delete schedule')
    } finally {
      setSaving(false)
    }
  }

  const formatScheduleTime = (schedule) => {
    const startRaw = schedule.starts_at || schedule.start_time
    if (!startRaw) return 'No date set'
    const start = typeof startRaw === 'string' ? parseISO(startRaw) : startRaw
    const dateStr = format(start, 'EEE, MMM d, yyyy')
    const timeStr = format(start, 'h:mm a')
    const endRaw = schedule.ends_at || schedule.end_time
    if (endRaw) {
      const end = typeof endRaw === 'string' ? parseISO(endRaw) : endRaw
      return `${dateStr} at ${timeStr} – ${format(end, 'h:mm a')}`
    }
    return `${dateStr} at ${timeStr}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
      case 'active':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'cancelled':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20'
      case 'completed':
        return 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20'
      default:
        return 'bg-gray-500/15 text-gray-600'
    }
  }

  // Schedule form component (reused for add and edit)
  const ScheduleForm = ({ schedule, setSchedule, onSave, onCancel, isEdit }) => (
    <div className="space-y-4 rounded-lg border border-dashed border-[var(--glass-border-strong)] p-4 bg-[var(--glass-bg)]">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Date & Time *</Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={(schedule.start_time || schedule.starts_at || '')?.slice(0, 16) || ''}
            onChange={(e) => setSchedule({ ...schedule, start_time: e.target.value })}
            autoFocus={!isEdit}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">End Date & Time</Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={(schedule.end_time || schedule.ends_at || '')?.slice(0, 16) || ''}
            onChange={(e) => setSchedule({ ...schedule, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="location"
              value={schedule.location || ''}
              onChange={(e) => setSchedule({ ...schedule, location: e.target.value })}
              placeholder="e.g., Room 101 or Virtual"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_capacity">Max Capacity</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="max_capacity"
              type="number"
              min="1"
              value={schedule.max_capacity || ''}
              onChange={(e) => setSchedule({ ...schedule, max_capacity: e.target.value })}
              placeholder="Unlimited"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Recurrence (only for new schedules) */}
      {!isEdit && (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurrence">Repeat</Label>
              <Select
                value={schedule.recurrence || 'none'}
                onValueChange={(v) => setSchedule({ ...schedule, recurrence: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {schedule.recurrence && schedule.recurrence !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="recurrence_end_date">Repeat Until</Label>
                <Input
                  id="recurrence_end_date"
                  type="date"
                  value={schedule.recurrence_end_date || ''}
                  onChange={(e) => setSchedule({ ...schedule, recurrence_end_date: e.target.value })}
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEdit ? 'Update' : 'Add Schedule'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Manage Schedules
            </DialogTitle>
            <DialogDescription>
              {offeringName ? `Schedule sessions for "${offeringName}"` : 'Schedule sessions for this offering'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {/* Add Schedule Form */}
                  {showAddForm ? (
                    <ScheduleForm
                      schedule={newSchedule}
                      setSchedule={setNewSchedule}
                      onSave={handleAddSchedule}
                      onCancel={() => {
                        setShowAddForm(false)
                        setNewSchedule(getDefaultSchedule())
                      }}
                      isEdit={false}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => setShowAddForm(true)}
                    >
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Add Schedule
                    </Button>
                  )}

                  {/* Schedules List */}
                  {schedules.length === 0 && !showAddForm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No schedules yet</p>
                      <p className="text-sm">Add schedules to start accepting registrations</p>
                    </div>
                  ) : (
                    schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className={cn(
                          "rounded-lg border border-[var(--glass-border)] p-4",
                          "bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-colors"
                        )}
                      >
                        {editingSchedule?.id === schedule.id ? (
                          <ScheduleForm
                            schedule={editingSchedule}
                            setSchedule={setEditingSchedule}
                            onSave={handleUpdateSchedule}
                            onCancel={() => setEditingSchedule(null)}
                            isEdit={true}
                          />
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
                                <span className="font-medium text-[var(--text-primary)]">
                                  {formatScheduleTime(schedule)}
                                </span>
                                <Badge variant="outline" className={cn("text-xs", getStatusColor(schedule.status))}>
                                  {schedule.status}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {schedule.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {schedule.location}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {schedule.current_enrollment ?? (schedule.capacity != null && schedule.spots_remaining != null ? schedule.capacity - schedule.spots_remaining : 0)}
                                  {(schedule.max_capacity ?? schedule.capacity) != null ? ` / ${schedule.max_capacity ?? schedule.capacity}` : ''} enrolled
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingSchedule({ ...schedule })}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingSchedule(schedule)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={!!deletingSchedule} 
        onOpenChange={(open) => !open && setDeletingSchedule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? 
              {deletingSchedule?.current_enrollment > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This schedule has {deletingSchedule.current_enrollment} enrolled attendees.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSchedule}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
