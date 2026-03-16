// src/components/integrations/UserGoogleIntegrationPanel.jsx
// Unified Google workspace integration panel (per-user)
// Shows Gmail + Google Calendar + Google Drive connection status and controls.
// Used in both Sync and CRM modules.

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
  Link2Off,
  RefreshCw,
  ExternalLink,
  ArrowRightLeft,
  Download,
  Upload,
  Settings2,
  Clock,
  ChevronDown,
  Shield,
  FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { workspaceIntegrationsApi } from '@/lib/portal-api'
import { openOAuthPopup } from '@/lib/oauth-popup'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

// Google logo SVG inline (avoids missing asset issues)
function GoogleLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

const SYNC_DIRECTIONS = [
  { value: 'pull', label: 'Read Only', icon: Download, description: 'Check availability from Google Calendar' },
  { value: 'push', label: 'Write Only', icon: Upload, description: 'Push Sync events to Google Calendar' },
  { value: 'bidirectional', label: 'Two-Way Sync', icon: ArrowRightLeft, description: 'Full bidirectional sync' },
]

/**
 * Unified Google workspace integration panel.
 * Shows Gmail and Calendar status, connect/disconnect controls.
 * 
 * @param {Object} props
 * @param {boolean} props.inline - Render inline (not in a dialog)
 * @param {Function} props.onClose - Close handler (when used inline with back button)
 * @param {Function} props.onStatusChange - Callback when connection status changes
 * @param {'sync'|'crm'|'both'} props.context - Which module is showing this (affects feature emphasis)
 */
export default function UserGoogleIntegrationPanel({
  inline = false,
  onClose,
  onStatusChange,
  context = 'both',
}) {
  const { user } = useAuthStore()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showCalendarSettings, setShowCalendarSettings] = useState(false)
  const [calendarSettings, setCalendarSettings] = useState(null)
  const connectTimeoutRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const result = await workspaceIntegrationsApi.getGoogleStatus()
      setStatus(result)
      onStatusChange?.(result)
    } catch (error) {
      console.error('Failed to get Google integration status:', error)
      // Fallback: check legacy Gmail status
      setStatus({ connected: false, gmail: { connected: false }, calendar: { connected: false }, drive: { connected: false } })
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Listen for OAuth popup completion
  useEffect(() => {
    const handleMessage = (event) => {
      const allowedOrigins = [
        'http://localhost:3002',
        'https://api.sonor.io',
        window.location.origin,
      ]
      if (!allowedOrigins.includes(event.origin)) return

      if (event.data?.type === 'oauth-success' || event.data?.type === 'oauth-complete') {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current)
          connectTimeoutRef.current = null
        }
        setConnecting(false)
        fetchStatus()
        toast.success('Google account connected')
      } else if (event.data?.type === 'oauth-error') {
        setConnecting(false)
        toast.error(event.data.error || 'Failed to connect Google account')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
      }
    }
  }, [fetchStatus])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const returnUrl = window.location.href.split('?')[0]
      const result = await workspaceIntegrationsApi.connectGoogle(returnUrl)
      
      if (result.authUrl) {
        // Open OAuth popup
        const popup = window.open(result.authUrl, 'google-workspace-oauth', 'width=600,height=700')
        
        if (!popup) {
          toast.error('Popup blocked. Please allow popups and try again.')
          setConnecting(false)
          return
        }

        // Fallback timeout
        connectTimeoutRef.current = setTimeout(() => {
          setConnecting(false)
          toast.error('Connection timed out. Please try again.')
        }, 3 * 60 * 1000)
      } else {
        throw new Error('No auth URL returned')
      }
    } catch (error) {
      console.error('Failed to initiate Google connection:', error)
      toast.error('Failed to start Google connection')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Google account? This will remove Gmail, Calendar, and Drive access.')) return
    
    setDisconnecting(true)
    try {
      await workspaceIntegrationsApi.disconnectGoogle()
      setStatus({ connected: false, gmail: { connected: false }, calendar: { connected: false }, drive: { connected: false } })
      onStatusChange?.({ connected: false })
      toast.success('Google account disconnected')
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect Google account')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSyncCalendar = async () => {
    setSyncing(true)
    try {
      await workspaceIntegrationsApi.syncCalendar()
      toast.success('Calendar synced')
      fetchStatus()
    } catch (error) {
      console.error('Failed to sync calendar:', error)
      toast.error('Failed to sync calendar')
    } finally {
      setSyncing(false)
    }
  }

  const content = (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : status?.connected ? (
        // ===== CONNECTED STATE =====
        <>
          {/* Connection Card */}
          <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-background border shadow-sm flex items-center justify-center shrink-0">
                <GoogleLogo className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">Google Account</h3>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {status.email || status.gmail?.email || 'Connected'}
                </p>
                {status.connectedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Connected {formatDistanceToNow(new Date(status.connectedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2Off className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="space-y-3">
            {/* Gmail */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Gmail</h4>
                    <p className="text-xs text-muted-foreground">
                      {status.gmail?.connected
                        ? 'Send & receive emails via CRM'
                        : 'Email integration available'}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={cn(
                  "text-xs",
                  status.gmail?.connected
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {status.gmail?.connected ? 'Active' : 'Available'}
                </Badge>
              </div>
              {status.gmail?.tokenExpired && (
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Token expired - reconnect to refresh
                </div>
              )}
            </div>

            {/* Google Calendar */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Google Calendar</h4>
                    <p className="text-xs text-muted-foreground">
                      {status.calendar?.connected
                        ? `Two-way sync ${status.calendar?.lastSyncAt ? '· Last synced ' + formatDistanceToNow(new Date(status.calendar.lastSyncAt), { addSuffix: true }) : ''}`
                        : 'Calendar sync available'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status.calendar?.connected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleSyncCalendar}
                      disabled={syncing}
                    >
                      <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                    </Button>
                  )}
                  <Badge variant="secondary" className={cn(
                    "text-xs",
                    status.calendar?.connected
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {status.calendar?.connected ? 'Active' : 'Available'}
                  </Badge>
                </div>
              </div>
              {status.calendar?.syncError && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {status.calendar.syncError}
                </div>
              )}
            </div>

            {/* Google Drive */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Google Drive</h4>
                    <p className="text-xs text-muted-foreground">
                      {status.drive?.connected
                        ? 'Docs, Sheets & Slides access'
                        : 'File creation & storage available'}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={cn(
                  "text-xs",
                  status.drive?.connected
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {status.drive?.connected ? 'Active' : 'Available'}
                </Badge>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              How sync works
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                Google Calendar events mark booking slots as taken
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                Bookings automatically appear on your Google Calendar
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                Gmail emails sync to CRM for lead tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                Create and edit Docs, Sheets & Slides via Drive
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground/60 mt-0.5">•</span>
                This connection is personal to your account
              </li>
            </ul>
          </div>
        </>
      ) : (
        // ===== NOT CONNECTED STATE =====
        <>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <GoogleLogo className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Connect Google</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Connect your Google account to enable Gmail, Google Calendar, and Drive all in one step.
            </p>
          </div>

          {/* Features preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <Mail className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Gmail</p>
                <p className="text-xs text-muted-foreground">Send emails, track threads in CRM</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">Two-way sync with bookings & events</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <FolderOpen className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Google Drive</p>
                <p className="text-xs text-muted-foreground">Create & edit Docs, Sheets, Slides</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full h-11"
            size="lg"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Google Account
              </>
            )}
          </Button>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              This is a personal connection tied to your user account, not a project. 
              Your Google access works across all modules (CRM, Sync, etc.).
            </p>
          </div>
        </>
      )}
    </div>
  )

  if (inline) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-semibold">Integrations</h2>
              <p className="text-xs text-muted-foreground">Connect your personal workspace tools</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          {content}
        </div>
      </div>
    )
  }

  return content
}
