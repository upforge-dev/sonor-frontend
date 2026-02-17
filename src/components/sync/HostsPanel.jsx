// src/components/sync/HostsPanel.jsx
// Panel for managing booking hosts and their availability

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Clock,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Link2,
  CalendarOff
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'
import CalendarConnectionsPanel from './CalendarConnectionsPanel'
import AvailabilityExceptionsPanel from './AvailabilityExceptionsPanel'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const DEFAULT_AVAILABILITY = [
  { day_of_week: 1, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 2, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 3, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 4, start_time: '09:00', end_time: '17:00' },
  { day_of_week: 5, start_time: '09:00', end_time: '17:00' },
]

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = (i % 2) * 30
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  const display = `${hours === 0 ? 12 : hours > 12 ? hours - 12 : hours}:${minutes.toString().padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
  return { value: time, label: display }
})

export default function HostsPanel({ isOpen, onClose, inline = false }) {
  const { currentProject } = useAuthStore()
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingHost, setEditingHost] = useState(null)
  const [showAvailability, setShowAvailability] = useState(null)
  const [availability, setAvailability] = useState([])
  const [savingAvailability, setSavingAvailability] = useState(false)
  
  // New panels
  const [showCalendarConnections, setShowCalendarConnections] = useState(null)
  const [showExceptions, setShowExceptions] = useState(false)

  useEffect(() => {
    if (isOpen || inline) {
      fetchHosts()
    }
  }, [isOpen, inline, currentProject?.id])

  const fetchHosts = async () => {
    try {
      setLoading(true)
      const params = {}
      if (currentProject?.id) params.project_id = currentProject.id
      const { data } = await syncApi.getHosts(params)
      setHosts(data.hosts || [])
    } catch (error) {
      console.error('Failed to fetch hosts:', error)
      toast.error('Failed to load hosts')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHost = () => {
    setEditingHost({
      name: '',
      email: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_active: true,
      bio: '',
    })
  }

  const handleEditHost = (host) => {
    setEditingHost({ ...host })
  }

  const handleSaveHost = async () => {
    try {
      if (!editingHost.name || !editingHost.email) {
        toast.error('Name and email are required')
        return
      }

      // Include project_id for project scoping
      const hostData = { ...editingHost }
      if (currentProject?.id && !editingHost.id) {
        hostData.projectId = currentProject.id
      }

      if (editingHost.id) {
        await syncApi.updateHost(editingHost.id, hostData)
        toast.success('Host updated')
      } else {
        await syncApi.createHost(hostData)
        toast.success('Host created')
      }
      
      setEditingHost(null)
      fetchHosts()
    } catch (error) {
      toast.error('Failed to save host')
    }
  }

  const handleDeleteHost = async (host) => {
    if (!confirm(`Delete host "${host.name}"?`)) return
    
    try {
      const params = currentProject?.id ? { project_id: currentProject.id } : {}
      await syncApi.deleteHost(host.id, params)
      toast.success('Host deleted')
      fetchHosts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete host')
    }
  }

  const handleToggleActive = async (host) => {
    try {
      await syncApi.updateHost(host.id, { is_active: !host.is_active })
      toast.success(host.is_active ? 'Host deactivated' : 'Host activated')
      fetchHosts()
    } catch (error) {
      toast.error('Failed to update host')
    }
  }

  const handleShowAvailability = async (host) => {
    try {
      const { data } = await syncApi.getHostAvailability(host.id)
      setAvailability(data.rules || DEFAULT_AVAILABILITY)
      setShowAvailability(host)
    } catch (error) {
      setAvailability(DEFAULT_AVAILABILITY)
      setShowAvailability(host)
    }
  }

  const handleSaveAvailability = async () => {
    try {
      setSavingAvailability(true)
      await syncApi.updateHostAvailability(showAvailability.id, { rules: availability })
      toast.success('Availability saved')
      setShowAvailability(null)
    } catch (error) {
      toast.error('Failed to save availability')
    } finally {
      setSavingAvailability(false)
    }
  }

  const toggleDayAvailability = (dayOfWeek) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek)
    if (existing) {
      setAvailability(availability.filter(a => a.day_of_week !== dayOfWeek))
    } else {
      setAvailability([...availability, { day_of_week: dayOfWeek, start_time: '09:00', end_time: '17:00' }])
    }
  }

  const updateDayTime = (dayOfWeek, field, value) => {
    setAvailability(availability.map(a => 
      a.day_of_week === dayOfWeek ? { ...a, [field]: value } : a
    ))
  }

  const content = (
    <>
        <ScrollArea className={inline ? "flex-1" : "flex-1 -mx-6 px-6"}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : hosts.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No hosts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add team members who can accept bookings
              </p>
              <Button onClick={handleCreateHost}>
                <Plus className="h-4 w-4 mr-2" />
                Add Host
              </Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {hosts.map((host) => (
                <motion.div
                  key={host.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center gap-4 p-4 border rounded-lg transition-colors",
                    host.is_active ? "bg-background" : "bg-muted/50 opacity-60"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {host.name?.[0]?.toUpperCase() || 'H'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{host.name}</h4>
                      {!host.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{host.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {host.timezone || 'Not set'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={host.is_active}
                      onCheckedChange={() => handleToggleActive(host)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleShowAvailability(host)}
                    >
                      <Calendar className="h-4 w-4 mr-1.5" />
                      Hours
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCalendarConnections(host)}
                    >
                      <Link2 className="h-4 w-4 mr-1.5" />
                      Calendars
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditHost(host)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteHost(host)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Edit Host Modal */}
        <AnimatePresence>
          {editingHost && (
            <Dialog open={!!editingHost} onOpenChange={() => setEditingHost(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingHost.id ? 'Edit Host' : 'Add Host'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editingHost.name}
                      onChange={(e) => setEditingHost({ ...editingHost, name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingHost.email}
                      onChange={(e) => setEditingHost({ ...editingHost, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={editingHost.timezone}
                      onChange={(e) => setEditingHost({ ...editingHost, timezone: e.target.value })}
                      placeholder="America/New_York"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio (optional)</Label>
                    <Textarea
                      id="bio"
                      value={editingHost.bio || ''}
                      onChange={(e) => setEditingHost({ ...editingHost, bio: e.target.value })}
                      placeholder="Brief description..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingHost(null)}>Cancel</Button>
                  <Button onClick={handleSaveHost}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Availability Modal */}
        <AnimatePresence>
          {showAvailability && (
            <Dialog open={!!showAvailability} onOpenChange={() => setShowAvailability(null)}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Availability for {showAvailability.name}
                  </DialogTitle>
                  <DialogDescription>
                    Set the hours when this host can accept bookings
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-2 py-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayAvail = availability.find(a => a.day_of_week === day.value)
                    const isAvailable = !!dayAvail

                    return (
                      <div
                        key={day.value}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                          isAvailable ? "bg-background" : "bg-muted/50"
                        )}
                      >
                        <Switch
                          checked={isAvailable}
                          onCheckedChange={() => toggleDayAvailability(day.value)}
                        />
                        <span className={cn(
                          "w-24 font-medium",
                          !isAvailable && "text-muted-foreground"
                        )}>
                          {day.label}
                        </span>
                        
                        {isAvailable ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Select
                              value={dayAvail.start_time}
                              onValueChange={(v) => updateDayTime(day.value, 'start_time', v)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground">to</span>
                            <Select
                              value={dayAvail.end_time}
                              onValueChange={(v) => updateDayTime(day.value, 'end_time', v)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unavailable</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAvailability(null)}>Cancel</Button>
                  <Button onClick={handleSaveAvailability} disabled={savingAvailability}>
                    {savingAvailability ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Availability
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
        
        {/* Calendar Connections Panel */}
        <CalendarConnectionsPanel
          isOpen={!!showCalendarConnections}
          onClose={() => setShowCalendarConnections(null)}
          hostId={showCalendarConnections?.id}
          hostName={showCalendarConnections?.name}
        />
        
        {/* Availability Exceptions Panel */}
        <AvailabilityExceptionsPanel
          isOpen={showExceptions}
          onClose={() => setShowExceptions(false)}
          hosts={hosts}
        />
    </>
  )

  if (inline) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Hosts
            </h2>
            <p className="text-sm text-muted-foreground">Manage team members who can accept bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowExceptions(true)}>
              <CalendarOff className="h-4 w-4 mr-2" />
              PTO & Holidays
            </Button>
            <Button onClick={handleCreateHost}>
              <Plus className="h-4 w-4 mr-2" />
              Add Host
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6">
          {content}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Hosts
          </DialogTitle>
          <DialogDescription>
            Manage team members who can accept bookings
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter className="border-t pt-4 flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="mr-auto"
            onClick={() => setShowExceptions(true)}
          >
            <CalendarOff className="h-4 w-4 mr-2" />
            PTO & Holidays
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleCreateHost}>
            <Plus className="h-4 w-4 mr-2" />
            Add Host
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
