// src/components/sync/HostRoutingPanel.jsx
// Panel for assigning hosts to booking types with routing strategies

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Calendar,
  Shuffle,
  BarChart3,
  ArrowUpDown,
  CheckCircle,
  Loader2,
  X,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  Hand
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

const ROUTING_STRATEGIES = {
  'all-available': {
    label: 'Guest Picks',
    description: 'Shows all hosts as options, guest picks their preference',
    icon: Hand,
    color: 'text-purple-500'
  },
  'round-robin': {
    label: 'Round Robin',
    description: 'Distributes bookings evenly across all hosts in rotation',
    icon: Shuffle,
    color: 'text-blue-500'
  },
  'weighted': {
    label: 'Weighted',
    description: 'Distributes based on assigned weights (higher = more bookings)',
    icon: BarChart3,
    color: 'text-emerald-500'
  },
  'priority': {
    label: 'Priority',
    description: 'Always tries first host first, falls back if unavailable',
    icon: ArrowUpDown,
    color: 'text-amber-500'
  },
}

export default function HostRoutingPanel({ isOpen, onClose, bookingType, hosts, onUpdated }) {
  const { currentProject } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routes, setRoutes] = useState([])
  const [strategy, setStrategy] = useState(bookingType?.routing_strategy || 'all-available')
  const [showAddHost, setShowAddHost] = useState(false)
  const [selectedHostId, setSelectedHostId] = useState('')
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [teamCandidates, setTeamCandidates] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  useEffect(() => {
    if (isOpen && bookingType) {
      setStrategy(bookingType?.routing_strategy || 'all-available')
      fetchRoutes()
    }
  }, [isOpen, bookingType])

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      const { data } = await syncApi.getBookingTypeRoutes(bookingType.id)
      const list = Array.isArray(data?.routes) ? data.routes : (Array.isArray(data) ? data : [])
      setRoutes(list)
    } catch (error) {
      console.error('Failed to fetch routes:', error)
      setRoutes([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStrategy = async () => {
    setSaving(true)
    try {
      await syncApi.updateBookingType(bookingType.id, { routing_strategy: strategy })
      toast.success('Routing strategy updated')
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to update strategy')
    } finally {
      setSaving(false)
    }
  }

  // Fetch org team members when "Add Host" dialog opens so agency users
  // can assign team members directly without visiting the Hosts tab first
  const openAddHostDialog = async () => {
    setShowAddHost(true)
    setSelectedHostId('')
    setLoadingCandidates(true)
    try {
      const params = {}
      if (currentProject?.id) params.project_id = currentProject.id
      const { data } = await syncApi.getHostCandidates(params)
      setTeamCandidates(Array.isArray(data?.candidates) ? data.candidates : (Array.isArray(data) ? data : []))
    } catch (err) {
      console.error('Failed to fetch team candidates:', err)
      setTeamCandidates([])
    } finally {
      setLoadingCandidates(false)
    }
  }

  const handleAddHost = async () => {
    if (!selectedHostId) return

    setSaving(true)
    try {
      const existingPriorities = routes.map(r => r.priority || 0)
      const nextPriority = Math.max(0, ...existingPriorities) + 1
      let hostId = selectedHostId

      // If the selected ID is a team candidate (contact), auto-create the host first
      const isExistingHost = hosts.some(h => h.id === selectedHostId)
      if (!isExistingHost) {
        const { data: newHost } = await syncApi.createHost({
          contactId: selectedHostId,
          projectId: currentProject?.id,
        })
        hostId = newHost?.id || newHost?.host?.id
        if (!hostId) throw new Error('Failed to create host')
      }

      await syncApi.createBookingRoute({
        booking_type_id: bookingType.id,
        host_id: hostId,
        priority: nextPriority,
        weight: 1,
        is_active: true
      })

      toast.success('Host added to booking type')
      setShowAddHost(false)
      setSelectedHostId('')
      fetchRoutes()
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to add host')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRoute = async (routeId, updates) => {
    setSaving(true)
    try {
      await syncApi.updateBookingRoute(routeId, updates)
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, ...updates } : r))
      toast.success('Route updated')
    } catch (error) {
      toast.error('Failed to update route')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveRoute = async (routeId) => {
    setSaving(true)
    try {
      await syncApi.deleteBookingRoute(routeId)
      setRoutes(prev => prev.filter(r => r.id !== routeId))
      toast.success('Host removed from booking type')
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to remove host')
    } finally {
      setSaving(false)
    }
  }

  // ==================== Weight handling ====================

  const handleWeightChange = (routeId, newWeight) => {
    // Optimistic UI update (no save yet — save on commit)
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, weight: newWeight } : r))
  }

  const handleWeightCommit = (routeId, newWeight) => {
    handleUpdateRoute(routeId, { weight: newWeight })
  }

  // Calculate weight percentages for display
  const totalWeight = routes.reduce((sum, r) => sum + (r.weight || 1), 0)

  // ==================== Priority reorder ====================

  const sortedRoutes = [...routes].sort((a, b) => (a.priority || 0) - (b.priority || 0))

  const movePriority = async (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sortedRoutes.length) return

    const routeA = sortedRoutes[index]
    const routeB = sortedRoutes[newIndex]

    // Swap priorities
    const priorityA = routeA.priority || index + 1
    const priorityB = routeB.priority || newIndex + 1

    setSaving(true)
    try {
      await Promise.all([
        syncApi.updateBookingRoute(routeA.id, { priority: priorityB }),
        syncApi.updateBookingRoute(routeB.id, { priority: priorityA }),
      ])
      setRoutes(prev => prev.map(r => {
        if (r.id === routeA.id) return { ...r, priority: priorityB }
        if (r.id === routeB.id) return { ...r, priority: priorityA }
        return r
      }))
      toast.success('Priority updated')
    } catch (error) {
      toast.error('Failed to update priority')
    } finally {
      setSaving(false)
    }
  }

  const assignedHostIds = routes.map(r => r.host_id)
  const availableHosts = hosts.filter(h => !assignedHostIds.includes(h.id))
  // Team candidates not yet added as hosts — exclude anyone whose contact_id
  // matches an existing host's contact_id (already a host in this project)
  const existingHostContactIds = new Set(hosts.map(h => h.contact_id).filter(Boolean))
  const newTeamCandidates = teamCandidates.filter(
    c => !existingHostContactIds.has(c.id) && !assignedHostIds.includes(c.id)
  )
  const hasAnyCandidates = availableHosts.length > 0 || newTeamCandidates.length > 0
  const strategyInfo = ROUTING_STRATEGIES[strategy]
  const showStrategyConfig = routes.length > 1

  if (!bookingType) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Host Routing: {bookingType.name}
          </DialogTitle>
          <DialogDescription>
            Configure which hosts can accept this booking type and how bookings are distributed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Routing Strategy — only show when multiple hosts */}
          {showStrategyConfig && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Routing Strategy</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROUTING_STRATEGIES).map(([key, config]) => {
                  const Icon = config.icon
                  const isSelected = strategy === key

                  return (
                    <button
                      key={key}
                      onClick={() => setStrategy(key)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {config.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {strategy !== (bookingType.routing_strategy || 'all-available') && (
                <Button
                  size="sm"
                  onClick={handleSaveStrategy}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                  Save Strategy
                </Button>
              )}
            </div>
          )}

          {/* Assigned Hosts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Assigned Hosts</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={openAddHostDialog}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Host
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hosts assigned yet</p>
                <p className="text-xs">Add hosts to enable bookings</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {sortedRoutes.map((route, index) => {
                    const host = hosts.find(h => h.id === route.host_id)
                    if (!host) return null
                    const weightPct = totalWeight > 0
                      ? Math.round(((route.weight || 1) / totalWeight) * 100)
                      : 0

                    return (
                      <motion.div
                        key={route.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-3 rounded-lg border bg-[var(--glass-bg)]",
                          !route.is_active && "opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Priority reorder controls */}
                          {strategy === 'priority' && (
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => movePriority(index, -1)}
                                disabled={index === 0 || saving}
                                className={cn(
                                  "p-0.5 rounded hover:bg-accent transition-colors",
                                  index === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                )}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-xs font-semibold text-muted-foreground w-4 text-center">
                                {index + 1}
                              </span>
                              <button
                                onClick={() => movePriority(index, 1)}
                                disabled={index === sortedRoutes.length - 1 || saving}
                                className={cn(
                                  "p-0.5 rounded hover:bg-accent transition-colors",
                                  index === sortedRoutes.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                )}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Host Avatar */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {host.avatar_url ? (
                              <img src={host.avatar_url} alt={host.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-xs font-semibold">
                                {host.name?.[0]?.toUpperCase() || 'H'}
                              </span>
                            )}
                          </div>

                          {/* Host Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{host.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{host.email}</p>
                          </div>

                          {/* Active Toggle */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={route.is_active}
                                  onCheckedChange={(checked) => handleUpdateRoute(route.id, { is_active: checked })}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {route.is_active ? 'Active' : 'Paused'}
                            </TooltipContent>
                          </Tooltip>

                          {/* Remove */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveRoute(route.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Weighted: show slider below the host row */}
                        {strategy === 'weighted' && (
                          <div className="mt-3 pl-11 flex items-center gap-3">
                            <Slider
                              value={[route.weight || 1]}
                              min={1}
                              max={100}
                              step={1}
                              onValueChange={([v]) => handleWeightChange(route.id, v)}
                              onValueCommit={([v]) => handleWeightCommit(route.id, v)}
                              className="flex-1"
                            />
                            <div className="flex items-center gap-1.5 shrink-0 min-w-[60px] justify-end">
                              <span className="text-sm font-medium tabular-nums">{route.weight || 1}</span>
                              <span className="text-xs text-muted-foreground">({weightPct}%)</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Strategy Info */}
          {strategyInfo && showStrategyConfig && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="font-medium">{strategyInfo.label}:</span>{' '}
                <span className="text-muted-foreground">{strategyInfo.description}</span>
              </div>
            </div>
          )}
        </div>

        {/* Add Host Dialog */}
        <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add Host</DialogTitle>
              <DialogDescription>
                Select a team member to assign to "{bookingType.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingCandidates ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading team members...</span>
                </div>
              ) : !hasAnyCandidates ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No team members available</p>
                  <p className="text-xs mt-1">Add team members to this organization first</p>
                </div>
              ) : (
                <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Existing hosts not yet assigned to this booking type */}
                    {availableHosts.length > 0 && (
                      <>
                        {newTeamCandidates.length > 0 && (
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Existing Hosts
                          </div>
                        )}
                        {availableHosts.map((host) => (
                          <SelectItem key={host.id} value={host.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center overflow-hidden">
                                {host.avatar_url ? (
                                  <img src={host.avatar_url} alt={host.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white text-xs font-semibold">
                                    {host.name?.[0]?.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span>{host.name}</span>
                              {host.calendar_connected && (
                                <Calendar className="h-3 w-3 text-emerald-500 ml-auto" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {/* Team members not yet added as hosts */}
                    {newTeamCandidates.length > 0 && (
                      <>
                        {availableHosts.length > 0 && (
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-1.5">
                            Team Members
                          </div>
                        )}
                        {newTeamCandidates.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center overflow-hidden">
                                {candidate.avatar ? (
                                  <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white text-xs font-semibold">
                                    {candidate.name?.[0]?.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span>{candidate.name}</span>
                              {candidate.hasCalendar && (
                                <Calendar className="h-3 w-3 text-emerald-500 ml-auto" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddHost(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHost} disabled={!selectedHostId || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {/* Show "Add & Invite" when selecting a team candidate without calendar */}
                {!saving && selectedHostId && !hosts.some(h => h.id === selectedHostId) &&
                 newTeamCandidates.find(c => c.id === selectedHostId && !c.hasCalendar)
                  ? 'Add & Invite'
                  : 'Add Host'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
