// src/components/sync/CalendarConnectionsPanel.jsx
// Panel for connecting external calendars (Google, Outlook, Apple)

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRightLeft,
  Download,
  Upload,
  ExternalLink,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { syncApi, portalApi } from '@/lib/sonor-api'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

const CALENDAR_PROVIDERS = [
  { 
    id: 'google', 
    name: 'Google Calendar', 
    icon: '/icons/google-calendar.svg',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    brandColor: '#4285F4',
    description: 'Connect your Google Calendar for availability sync and auto-add meetings'
  },
  { 
    id: 'outlook', 
    name: 'Microsoft Outlook', 
    icon: '/icons/outlook.svg',
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
    brandColor: '#0078D4',
    description: 'Sync with Outlook/Microsoft 365 calendar'
  },
  { 
    id: 'apple', 
    name: 'Apple Calendar', 
    icon: '/icons/apple-calendar.svg',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
    brandColor: '#000000',
    description: 'Connect via CalDAV (iCloud calendar)'
  },
]

const SYNC_DIRECTIONS = [
  { value: 'pull', label: 'Read Only', icon: Download, description: 'Check availability from this calendar' },
  { value: 'push', label: 'Write Only', icon: Upload, description: 'Add bookings to this calendar' },
  { value: 'bidirectional', label: 'Two-Way', icon: ArrowRightLeft, description: 'Full sync both directions' },
]

export default function CalendarConnectionsPanel({ isOpen, onClose, hostId, hostName }) {
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(null)
  const [showSettings, setShowSettings] = useState(null)
  const connectTimeoutRef = useRef(null)

  useEffect(() => {
    if (isOpen && hostId) {
      fetchConnections()
    }
  }, [isOpen, hostId])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'sync-oauth-complete') return

      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }

      setConnecting(null)
      fetchConnections()
      toast.success('Calendar connected')
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [hostId])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      const { data } = await portalApi.get(`/sync/admin/hosts/${hostId}/calendars`).catch(() => ({ data: { connections: [] } }))
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Failed to fetch calendar connections:', error)
      setConnections([])
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (provider) => {
    try {
      setConnecting(provider.id)
      
      // Get OAuth URL from backend
      const { data } = await portalApi.post(`/sync/admin/hosts/${hostId}/calendars/connect`, {
        provider: provider.id,
        redirectUrl: `${window.location.origin}/sync/callback`
      })

      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, 'calendar-connect', 'width=600,height=700')

        if (!popup) {
          toast.error('Popup blocked. Please allow popups and try again.')
          setConnecting(null)
          return
        }

        // Fallback timeout in case postMessage doesn't arrive
        connectTimeoutRef.current = setTimeout(() => {
          setConnecting(null)
          toast.error('Connection timed out. Please try again.')
        }, 3 * 60 * 1000)
      } else {
        toast.error('Failed to start connection')
      }
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message

      toast.error(apiMessage || 'Failed to connect calendar')
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (connection) => {
    if (!confirm(`Disconnect ${connection.provider_account_email}?`)) return

    try {
      await portalApi.delete(`/sync/admin/hosts/${hostId}/calendars/${connection.id}`)
      toast.success('Calendar disconnected')
      fetchConnections()
    } catch (error) {
      toast.error('Failed to disconnect calendar')
    }
  }

  const handleSync = async (connection) => {
    try {
      toast.info('Syncing calendar...')
      await portalApi.post(`/sync/admin/hosts/${hostId}/calendars/${connection.id}/sync`)
      toast.success('Calendar synced')
      fetchConnections()
    } catch (error) {
      toast.error('Failed to sync calendar')
    }
  }

  const handleUpdateSettings = async (connection, settings) => {
    try {
      await portalApi.put(`/sync/admin/hosts/${hostId}/calendars/${connection.id}`, settings)
      toast.success('Settings updated')
      fetchConnections()
      setShowSettings(null)
    } catch (error) {
      toast.error('Failed to update settings')
    }
  }

  const connectedProviders = connections.map(c => c.provider)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Calendar Connections
          </DialogTitle>
          <DialogDescription>
            Connect external calendars for {hostName || 'this host'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Connected Calendars */}
              {connections.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Connected</h3>
                  {connections.map(connection => {
                    const provider = CALENDAR_PROVIDERS.find(p => p.id === connection.provider)
                    const syncDirection = SYNC_DIRECTIONS.find(d => d.value === connection.sync_direction)
                    const SyncIcon = syncDirection?.icon || ArrowRightLeft

                    return (
                      <motion.div
                        key={connection.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 border rounded-lg bg-background"
                      >
                        {/* Provider Icon */}
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", provider?.color)}>
                          <Calendar className="h-6 w-6" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">{provider?.name}</h4>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                connection.sync_status === 'active' 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                              )}
                            >
                              {connection.sync_status === 'active' ? 'Active' : 'Error'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {connection.provider_account_email}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <SyncIcon className="h-3 w-3" />
                              {syncDirection?.label}
                            </span>
                            {connection.last_sync_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last synced {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {connection.sync_error && (
                            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {connection.sync_error}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleSync(connection)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setShowSettings(connection)}>
                                <Settings2 className="h-4 w-4 mr-2" />
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDisconnect(connection)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Add New Connection */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {connections.length > 0 ? 'Connect Another' : 'Connect a Calendar'}
                </h3>
                {CALENDAR_PROVIDERS
                  .filter(p => !connectedProviders.includes(p.id))
                  .map(provider => (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", provider.color)}>
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold">{provider.name}</h4>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                      <Button
                        onClick={() => handleConnect(provider)}
                        disabled={connecting === provider.id}
                      >
                        {connecting === provider.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ))}
              </div>

              {/* All Connected */}
              {CALENDAR_PROVIDERS.every(p => connectedProviders.includes(p.id)) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p>All available calendars connected!</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Connection Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <ConnectionSettingsModal
              connection={showSettings}
              onClose={() => setShowSettings(null)}
              onSave={(settings) => handleUpdateSettings(showSettings, settings)}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function ConnectionSettingsModal({ connection, onClose, onSave }) {
  const [settings, setSettings] = useState({
    sync_direction: connection.sync_direction || 'pull',
    sync_frequency_minutes: connection.sync_frequency_minutes || 5,
    calendars: connection.calendars || [],
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(settings)
    setSaving(false)
  }

  return (
    <Dialog open={!!connection} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
          <DialogDescription>
            Configure sync settings for {connection.provider_account_email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sync Direction */}
          <div className="space-y-2">
            <Label>Sync Direction</Label>
            <div className="grid grid-cols-3 gap-2">
              {SYNC_DIRECTIONS.map(direction => (
                <button
                  key={direction.value}
                  onClick={() => setSettings({ ...settings, sync_direction: direction.value })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                    settings.sync_direction === direction.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  )}
                >
                  <direction.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{direction.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {direction.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sync Frequency */}
          <div className="space-y-2">
            <Label>Sync Frequency</Label>
            <Select
              value={String(settings.sync_frequency_minutes)}
              onValueChange={(v) => setSettings({ ...settings, sync_frequency_minutes: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 minute</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calendar Selection */}
          {settings.calendars.length > 0 && (
            <div className="space-y-2">
              <Label>Calendars to Sync</Label>
              <div className="space-y-2">
                {settings.calendars.map((cal, i) => (
                  <div key={cal.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{cal.name}</p>
                      <p className="text-xs text-muted-foreground">{cal.id}</p>
                    </div>
                    <Switch
                      checked={cal.sync_read}
                      onCheckedChange={(checked) => {
                        const newCalendars = [...settings.calendars]
                        newCalendars[i] = { ...cal, sync_read: checked }
                        setSettings({ ...settings, calendars: newCalendars })
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
