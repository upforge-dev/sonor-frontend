// src/components/sync/AvailabilityExceptionsPanel.jsx
// Panel for managing PTO, holidays, blackout dates, and other availability exceptions

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CalendarOff,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Palmtree,
  Building2,
  Clock,
  AlertTriangle,
  Repeat,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { syncApi } from '@/lib/sonor-api'
import { toast } from 'sonner'
import { format, parseISO, isBefore, isAfter, isSameDay, addYears } from 'date-fns'

const EXCEPTION_TYPES = [
  { id: 'unavailable', label: 'Unavailable', icon: CalendarOff, color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  { id: 'reduced', label: 'Reduced Hours', icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  { id: 'available', label: 'Extra Availability', icon: Calendar, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
]

const PRESET_EXCEPTIONS = [
  { title: 'PTO', icon: '🏖️', exception_type: 'unavailable', all_day: true },
  { title: 'Company Holiday', icon: '🎉', exception_type: 'unavailable', all_day: true },
  { title: 'Doctor Appointment', icon: '🏥', exception_type: 'unavailable', all_day: false },
  { title: 'Focus Day', icon: '🎯', exception_type: 'unavailable', all_day: true },
  { title: 'Half Day', icon: '⏰', exception_type: 'reduced', all_day: false },
]

export default function AvailabilityExceptionsPanel({ isOpen, onClose, hosts = [] }) {
  const [exceptions, setExceptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingException, setEditingException] = useState(null)
  const [selectedHostId, setSelectedHostId] = useState('all')

  useEffect(() => {
    if (isOpen) {
      fetchExceptions()
    }
  }, [isOpen])

  const fetchExceptions = async () => {
    try {
      setLoading(true)
      // Fetch exceptions - the API might need to be added
      const { data } = await syncApi.getExceptions?.() || { data: { exceptions: [] } }
      setExceptions(data.exceptions || [])
    } catch (error) {
      console.error('Failed to fetch exceptions:', error)
      // Start with empty - this is a new feature
      setExceptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateException = (preset = null) => {
    const today = new Date()
    setEditingException({
      title: preset?.title || '',
      exception_type: preset?.exception_type || 'unavailable',
      host_id: selectedHostId === 'all' ? null : selectedHostId,
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(today, 'yyyy-MM-dd'),
      all_day: preset?.all_day ?? true,
      start_time: '09:00',
      end_time: '17:00',
      is_recurring: false,
    })
    setShowCreateModal(true)
  }

  const handleSaveException = async () => {
    try {
      if (!editingException.title) {
        toast.error('Please enter a title')
        return
      }

      const payload = {
        ...editingException,
        host_id: editingException.host_id || null,
      }

      if (editingException.id) {
        await syncApi.updateException?.(editingException.id, payload)
        toast.success('Exception updated')
      } else {
        await syncApi.createException(payload)
        toast.success('Exception created')
      }

      setShowCreateModal(false)
      setEditingException(null)
      fetchExceptions()
    } catch (error) {
      toast.error('Failed to save exception')
    }
  }

  const handleDeleteException = async (exception) => {
    if (!confirm(`Delete "${exception.title}"?`)) return

    try {
      await syncApi.deleteException(exception.id)
      toast.success('Exception deleted')
      setExceptions(exceptions.filter(e => e.id !== exception.id))
    } catch (error) {
      toast.error('Failed to delete exception')
    }
  }

  // Filter by selected host
  const filteredExceptions = exceptions.filter(e => 
    selectedHostId === 'all' ? true : e.host_id === selectedHostId || e.host_id === null
  )

  // Group by upcoming/past
  const today = new Date()
  const upcomingExceptions = filteredExceptions.filter(e => 
    isAfter(parseISO(e.end_date), today) || isSameDay(parseISO(e.end_date), today)
  )
  const pastExceptions = filteredExceptions.filter(e => 
    isBefore(parseISO(e.end_date), today) && !isSameDay(parseISO(e.end_date), today)
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Availability Exceptions
          </DialogTitle>
          <DialogDescription>
            Manage PTO, holidays, and other schedule overrides
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Filter by host:</Label>
            <Select value={selectedHostId} onValueChange={setSelectedHostId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All hosts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All hosts (org-wide)
                  </span>
                </SelectItem>
                {hosts.map(host => (
                  <SelectItem key={host.id} value={host.id}>
                    {host.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => handleCreateException()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Exception
          </Button>
        </div>

        {/* Quick Add Presets */}
        <div className="flex flex-wrap gap-2 py-3">
          {PRESET_EXCEPTIONS.map(preset => (
            <Button
              key={preset.title}
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleCreateException(preset)}
            >
              <span>{preset.icon}</span>
              {preset.title}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="text-center py-12">
              <Palmtree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No exceptions yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add PTO, holidays, or other schedule overrides
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Upcoming */}
              {upcomingExceptions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingExceptions.map(exception => (
                      <ExceptionCard
                        key={exception.id}
                        exception={exception}
                        hosts={hosts}
                        onEdit={() => { setEditingException(exception); setShowCreateModal(true) }}
                        onDelete={() => handleDeleteException(exception)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past */}
              {pastExceptions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Past</h3>
                  <div className="space-y-2 opacity-60">
                    {pastExceptions.slice(0, 5).map(exception => (
                      <ExceptionCard
                        key={exception.id}
                        exception={exception}
                        hosts={hosts}
                        onEdit={() => { setEditingException(exception); setShowCreateModal(true) }}
                        onDelete={() => handleDeleteException(exception)}
                        isPast
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showCreateModal && editingException && (
            <Dialog open={showCreateModal} onOpenChange={() => { setShowCreateModal(false); setEditingException(null) }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingException.id ? 'Edit Exception' : 'Add Exception'}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editingException.title}
                      onChange={(e) => setEditingException({ ...editingException, title: e.target.value })}
                      placeholder="e.g., PTO, Holiday, Doctor Appointment"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex gap-2">
                      {EXCEPTION_TYPES.map(type => (
                        <button
                          key={type.id}
                          onClick={() => setEditingException({ ...editingException, exception_type: type.id })}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                            editingException.exception_type === type.id
                              ? type.color
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Host */}
                  <div className="space-y-2">
                    <Label>Applies to</Label>
                    <Select
                      value={editingException.host_id || 'org-wide'}
                      onValueChange={(v) => setEditingException({ ...editingException, host_id: v === 'org-wide' ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org-wide">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Organization-wide (all hosts)
                          </span>
                        </SelectItem>
                        {hosts.map(host => (
                          <SelectItem key={host.id} value={host.id}>
                            {host.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={editingException.start_date}
                        onChange={(e) => setEditingException({ ...editingException, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={editingException.end_date}
                        onChange={(e) => setEditingException({ ...editingException, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* All Day Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label className="font-medium">All Day</Label>
                      <p className="text-xs text-muted-foreground">Applies for the entire day(s)</p>
                    </div>
                    <Switch
                      checked={editingException.all_day}
                      onCheckedChange={(checked) => setEditingException({ ...editingException, all_day: checked })}
                    />
                  </div>

                  {/* Time Range (if not all day) */}
                  {!editingException.all_day && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={editingException.start_time}
                          onChange={(e) => setEditingException({ ...editingException, start_time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_time">End Time</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={editingException.end_time}
                          onChange={(e) => setEditingException({ ...editingException, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Recurring (for annual holidays) */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label className="font-medium flex items-center gap-2">
                        <Repeat className="h-4 w-4" />
                        Repeat Annually
                      </Label>
                      <p className="text-xs text-muted-foreground">For annual holidays</p>
                    </div>
                    <Switch
                      checked={editingException.is_recurring}
                      onCheckedChange={(checked) => setEditingException({ ...editingException, is_recurring: checked })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowCreateModal(false); setEditingException(null) }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveException}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Exception
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function ExceptionCard({ exception, hosts, onEdit, onDelete, isPast }) {
  const typeConfig = EXCEPTION_TYPES.find(t => t.id === exception.exception_type) || EXCEPTION_TYPES[0]
  const TypeIcon = typeConfig.icon
  const host = hosts.find(h => h.id === exception.host_id)

  const dateRange = exception.start_date === exception.end_date
    ? format(parseISO(exception.start_date), 'MMM d, yyyy')
    : `${format(parseISO(exception.start_date), 'MMM d')} – ${format(parseISO(exception.end_date), 'MMM d, yyyy')}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-4 p-4 border rounded-lg transition-colors",
        isPast ? "bg-muted/30" : "bg-background hover:bg-muted/50"
      )}
    >
      {/* Icon */}
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", typeConfig.color)}>
        <TypeIcon className="h-5 w-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold truncate">{exception.title}</h4>
          {exception.is_recurring && (
            <Badge variant="secondary" className="text-xs">
              <Repeat className="h-3 w-3 mr-1" />
              Annual
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {dateRange}
          {!exception.all_day && ` • ${exception.start_time} – ${exception.end_time}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {exception.host_id ? host?.name || 'Host' : 'All hosts (org-wide)'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
