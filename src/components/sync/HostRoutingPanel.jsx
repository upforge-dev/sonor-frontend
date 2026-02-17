// src/components/sync/HostRoutingPanel.jsx
// Panel for assigning hosts to booking types with routing strategies

import { useState, useEffect } from 'react'
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
  Info,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/portal-api'
import { toast } from 'sonner'

const ROUTING_STRATEGIES = {
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
  'all-available': {
    label: 'All Available',
    description: 'Shows all hosts as options, guest picks their preference',
    icon: Users,
    color: 'text-purple-500'
  }
}

export default function HostRoutingPanel({ isOpen, onClose, bookingType, hosts, onUpdated }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routes, setRoutes] = useState([])
  const [strategy, setStrategy] = useState(bookingType?.routing_strategy || 'round-robin')
  const [showAddHost, setShowAddHost] = useState(false)
  const [selectedHostId, setSelectedHostId] = useState('')

  useEffect(() => {
    if (isOpen && bookingType) {
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
      // Fallback to empty routes
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

  const handleAddHost = async () => {
    if (!selectedHostId) return
    
    setSaving(true)
    try {
      const existingPriorities = routes.map(r => r.priority || 0)
      const nextPriority = Math.max(0, ...existingPriorities) + 1
      
      await syncApi.createBookingRoute({
        booking_type_id: bookingType.id,
        host_id: selectedHostId,
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

  const assignedHostIds = routes.map(r => r.host_id)
  const availableHosts = hosts.filter(h => !assignedHostIds.includes(h.id))
  const strategyInfo = ROUTING_STRATEGIES[strategy]

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
          {/* Routing Strategy */}
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
            
            {strategy !== bookingType.routing_strategy && (
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

          {/* Assigned Hosts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Assigned Hosts</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAddHost(true)}
                disabled={availableHosts.length === 0}
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
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {routes
                    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                    .map((route, index) => {
                      const host = hosts.find(h => h.id === route.host_id)
                      if (!host) return null

                      return (
                        <motion.div
                          key={route.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border bg-card",
                            !route.is_active && "opacity-50"
                          )}
                        >
                          {/* Drag Handle (for priority) */}
                          {strategy === 'priority' && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span className="text-xs font-medium w-4">{index + 1}</span>
                              <GripVertical className="h-4 w-4 cursor-grab" />
                            </div>
                          )}

                          {/* Host Avatar */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {host.name?.[0]?.toUpperCase() || 'H'}
                            </span>
                          </div>

                          {/* Host Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{host.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{host.email}</p>
                          </div>

                          {/* Weight (for weighted strategy) */}
                          {strategy === 'weighted' && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Weight:</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={route.weight || 1}
                                onChange={(e) => handleUpdateRoute(route.id, { weight: parseInt(e.target.value) || 1 })}
                                className="w-14 h-7 text-xs text-center"
                              />
                            </div>
                          )}

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
                        </motion.div>
                      )
                    })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Strategy Info */}
          {strategyInfo && (
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
                Select a host to assign to "{bookingType.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a host..." />
                </SelectTrigger>
                <SelectContent>
                  {availableHosts.map((host) => (
                    <SelectItem key={host.id} value={host.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {host.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span>{host.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddHost(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHost} disabled={!selectedHostId || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Add Host
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
