// src/components/sync/HostsPanel.jsx
// Panel for managing booking hosts — add team members with Google Calendar connected

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
  CalendarOff,
  ExternalLink,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { syncApi, workspaceIntegrationsApi } from '@/lib/sonor-api'
import { openOAuthPopup } from '@/lib/oauth-popup'
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

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Convert API availability (monday/tuesday/etc. with enabled + slots) to Portal rules array */
function availabilityToRules(availability) {
  if (!availability || typeof availability !== 'object') return DEFAULT_AVAILABILITY
  const rules = []
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    const dayName = DAY_NAMES[dayOfWeek]
    const day = availability[dayName]
    if (day?.enabled && day.slots?.length) {
      const slot = day.slots[0]
      rules.push({
        day_of_week: dayOfWeek,
        start_time: slot.start ?? '09:00',
        end_time: slot.end ?? '17:00',
      })
    }
  }
  return rules.length ? rules : DEFAULT_AVAILABILITY
}

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

  // Calendar connections and exceptions panels
  const [showCalendarConnections, setShowCalendarConnections] = useState(null)
  const [showExceptions, setShowExceptions] = useState(false)

  // Add Team Member modal
  const [showAddTeamMember, setShowAddTeamMember] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [addingHostId, setAddingHostId] = useState(null)

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

  // ==================== Add Team Member Flow ====================

  const openAddTeamMember = async () => {
    setShowAddTeamMember(true)
    setCandidateSearch('')
    setCandidatesLoading(true)
    try {
      const params = {}
      if (currentProject?.id) params.project_id = currentProject.id
      const { data } = await syncApi.getHostCandidates(params)
      setCandidates(data?.candidates || data || [])
    } catch (error) {
      console.error('Failed to fetch host candidates:', error)
      toast.error('Failed to load team members')
      setCandidates([])
    } finally {
      setCandidatesLoading(false)
    }
  }

  const handleAddAsHost = async (candidate) => {
    setAddingHostId(candidate.id)
    try {
      await syncApi.createHost({
        contactId: candidate.id,
        projectId: currentProject?.id,
      })
      toast.success(`${candidate.name} added as a booking host`)
      fetchHosts()
      setShowAddTeamMember(false)
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add host'
      toast.error(msg)
    } finally {
      setAddingHostId(null)
    }
  }

  const handleConnectCalendar = async () => {
    try {
      const result = await workspaceIntegrationsApi.connectGoogle(window.location.href)
      if (result?.authUrl) {
        const popup = window.open(result.authUrl, 'google-workspace-oauth', 'width=600,height=700')
        // After popup closes, refresh candidates
        const interval = setInterval(() => {
          if (popup?.closed) {
            clearInterval(interval)
            // Re-fetch candidates to get updated calendar status
            if (showAddTeamMember) {
              openAddTeamMember()
            }
          }
        }, 500)
      }
    } catch (error) {
      toast.error('Failed to initiate Google Calendar connection')
    }
  }

  // Filter candidates — exclude those already added as hosts
  const existingHostEmails = new Set(hosts.map(h => h.email?.toLowerCase()))
  const existingHostContactIds = new Set(hosts.map(h => h.contact_id).filter(Boolean))

  const filteredCandidates = candidates.filter(c => {
    // Exclude already-added hosts
    if (existingHostContactIds.has(c.id)) return false
    if (c.email && existingHostEmails.has(c.email.toLowerCase())) return false
    // Search filter
    if (candidateSearch) {
      const q = candidateSearch.toLowerCase()
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ==================== Edit Host (limited — no email editing) ====================

  const handleEditHost = (host) => {
    setEditingHost({ ...host })
  }

  const handleSaveHost = async () => {
    try {
      if (!editingHost.id) return
      // Only allow editing timezone and bio — name/email derived from contact
      const updates = {
        timezone: editingHost.timezone,
        bio: editingHost.bio,
      }
      await syncApi.updateHost(editingHost.id, updates)
      toast.success('Host updated')
      setEditingHost(null)
      fetchHosts()
    } catch (error) {
      toast.error('Failed to save host')
    }
  }

  const handleDeleteHost = async (host) => {
    if (!confirm(`Remove host "${host.name}"? They will no longer receive bookings.`)) return

    try {
      const params = currentProject?.id ? { project_id: currentProject.id } : {}
      await syncApi.deleteHost(host.id, params)
      toast.success('Host removed')
      fetchHosts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove host')
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

  // ==================== Availability ====================

  const handleShowAvailability = async (host) => {
    try {
      const { data } = await syncApi.getHostAvailability(host.id)
      setAvailability(availabilityToRules(data?.availability))
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
      fetchHosts()
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

  // ==================== Render ====================

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
                Add team members with Google Calendar connected to accept bookings
              </p>
              <Button onClick={openAddTeamMember}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Team Member
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 overflow-hidden">
                    {host.avatar_url ? (
                      <img src={host.avatar_url} alt={host.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {host.name?.[0]?.toUpperCase() || 'H'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold truncate">{host.name}</h4>
                      {!host.project_id && (
                        <Badge variant="outline" className="text-xs font-normal">Org-level</Badge>
                      )}
                      {!host.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{host.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {host.has_hours ? 'Hours: Set' : 'Hours: Not set'}
                      </span>
                      {/* Calendar connection status */}
                      {host.calendar_connected !== undefined && (
                        host.calendar_connected ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-normal">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Calendar Connected
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs font-normal">
                            <XCircle className="h-3 w-3 mr-1" />
                            No Calendar
                          </Badge>
                        )
                      )}
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
                    {/* Reconnect button if calendar is disconnected */}
                    {host.calendar_connected === false && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={handleConnectCalendar}
                      >
                        <RefreshCw className="h-4 w-4 mr-1.5" />
                        Reconnect
                      </Button>
                    )}
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

        {/* Add Team Member Modal */}
        <Dialog open={showAddTeamMember} onOpenChange={setShowAddTeamMember}>
          <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Team Member as Host
              </DialogTitle>
              <DialogDescription>
                Select a team member with Google Calendar connected to accept bookings
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Candidates list */}
            <ScrollArea className="flex-1 -mx-6 px-6 min-h-[300px] max-h-[400px]">
              {candidatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {candidates.length === 0
                      ? 'No team members found in your organization'
                      : candidateSearch
                        ? 'No team members match your search'
                        : 'All team members are already added as hosts'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {filteredCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        "bg-[var(--glass-bg)] hover:bg-accent/50"
                      )}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 overflow-hidden">
                        {candidate.avatar ? (
                          <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold">
                            {candidate.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{candidate.name}</p>
                          {(candidate.role || candidate.title) && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {candidate.title || candidate.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      </div>

                      {/* Calendar status + action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {candidate.hasCalendar ? (
                          <>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-normal">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Calendar Connected
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleAddAsHost(candidate)}
                              disabled={addingHostId === candidate.id}
                            >
                              {addingHostId === candidate.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Plus className="h-4 w-4 mr-1" />
                              )}
                              Add as Host
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs font-normal">
                              <XCircle className="h-3 w-3 mr-1" />
                              No Calendar
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleConnectCalendar}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Connect Calendar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTeamMember(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Host Modal (limited — timezone/bio only, no email editing) */}
        <AnimatePresence>
          {editingHost && (
            <Dialog open={!!editingHost} onOpenChange={(open) => { if (!open) setEditingHost(null) }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Host</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Read-only name and email */}
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <p className="text-sm px-3 py-2 rounded-md border bg-muted/50 text-muted-foreground">
                      {editingHost.name}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <p className="text-sm px-3 py-2 rounded-md border bg-muted/50 text-muted-foreground">
                      {editingHost.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Email is derived from Google Calendar account and cannot be edited
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={editingHost.timezone || ''}
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
            <Button onClick={openAddTeamMember}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
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
          <Button onClick={openAddTeamMember}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
