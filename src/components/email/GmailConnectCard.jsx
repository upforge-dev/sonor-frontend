/**
 * GmailConnectCard - Unified Gmail OAuth connection component
 * 
 * Used across the portal for connecting Gmail to a project:
 * - Project Settings → Email section
 * - Outreach → Settings tab
 * - CRM → Email integration panel
 * 
 * Features:
 * - Shows connection status
 * - Initiates OAuth flow
 * - Handles disconnect
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mail, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Link2Off,
  RefreshCw
} from 'lucide-react'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'

/**
 * Full Gmail connect card with status display
 */
export function GmailConnectCard({ 
  className = '',
  onStatusChange,
  showHeader = true,
}) {
  const { currentProject } = useAuthStore()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Check URL params for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmailConnected = params.get('gmail_connected')
    const gmailEmail = params.get('gmail_email')
    const gmailError = params.get('gmail_error')

    if (gmailConnected === 'true' && gmailEmail) {
      toast.success(`Gmail connected: ${decodeURIComponent(gmailEmail)}`)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (gmailError) {
      toast.error(`Failed to connect Gmail: ${gmailError}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Fetch Gmail status
  const fetchStatus = async () => {
    if (!currentProject?.id) {
      setLoading(false)
      return
    }

    try {
      const response = await emailApi.getGmailStatus(currentProject.id)
      const result = response.data || response
      setStatus(result)
      onStatusChange?.(result)
    } catch (error) {
      console.error('Failed to get Gmail status:', error)
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [currentProject?.id])

  // Handle connect click
  const handleConnect = async () => {
    if (!currentProject?.id) {
      toast.error('No project selected')
      return
    }

    setConnecting(true)
    try {
      const returnUrl = window.location.href.split('?')[0] // Current page without params
      const response = await emailApi.getGmailAuthUrl(currentProject.id, returnUrl)
      const { authUrl } = response.data || response
      
      if (!authUrl) {
        throw new Error('No auth URL returned')
      }
      
      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error)
      toast.error('Failed to start Gmail connection')
      setConnecting(false)
    }
  }

  // Handle disconnect click
  const handleDisconnect = async () => {
    if (!currentProject?.id) return

    setDisconnecting(true)
    try {
      await emailApi.disconnectGmail(currentProject.id)
      setStatus({ connected: false })
      onStatusChange?.({ connected: false })
      toast.success('Gmail disconnected')
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error)
      toast.error('Failed to disconnect Gmail')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Connection
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection
          </CardTitle>
          <CardDescription>
            Send emails directly from your Gmail account
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {status?.connected ? (
          // Connected state
          <>
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Connected</p>
                  <p className="text-sm text-green-700">{status.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                Active
              </Badge>
            </div>

            {status.tokenExpired && (
              <Alert variant="warning" className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  Your Gmail connection has expired. Please reconnect to continue sending emails.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {status.tokenExpired ? (
                <Button 
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex-1"
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reconnect Gmail
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1"
                >
                  {disconnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2Off className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              )}
            </div>
          </>
        ) : (
          // Not connected state
          <>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Gmail account to send emails directly from your email address. 
                This allows you to send form confirmations, newsletters, and CRM emails.
              </p>
              <Button onClick={handleConnect} disabled={connecting} className="w-full">
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Connect Gmail Account
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Google to authorize access. We only request permission 
              to send emails and read email threads for CRM integration.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact version for settings pages
 */
export function GmailConnectCompact({ className = '', onStatusChange }) {
  const { currentProject } = useAuthStore()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    async function fetchStatus() {
      if (!currentProject?.id) {
        setLoading(false)
        return
      }

      try {
        const response = await emailApi.getGmailStatus(currentProject.id)
        const result = response.data || response
        setStatus(result)
        onStatusChange?.(result)
      } catch (error) {
        setStatus({ connected: false })
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [currentProject?.id])

  const handleConnect = async () => {
    if (!currentProject?.id) return

    setConnecting(true)
    try {
      const returnUrl = window.location.href.split('?')[0]
      const response = await emailApi.getGmailAuthUrl(currentProject.id, returnUrl)
      const { authUrl } = response.data || response
      if (!authUrl) {
        throw new Error('No auth URL returned')
      }
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error)
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking Gmail...</span>
      </div>
    )
  }

  if (status?.connected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm">
          Gmail: <span className="font-medium">{status.email}</span>
        </span>
        {status.tokenExpired && (
          <Badge variant="warning" className="text-xs">Expired</Badge>
        )}
      </div>
    )
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleConnect} 
      disabled={connecting}
      className={className}
    >
      {connecting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      Connect Gmail
    </Button>
  )
}

/**
 * Status indicator only (for headers/nav)
 */
export function GmailConnectionStatus({ className = '' }) {
  const { currentProject } = useAuthStore()
  const [status, setStatus] = useState(null)

  useEffect(() => {
    async function fetchStatus() {
      if (!currentProject?.id) return

      try {
        const result = await emailApi.getGmailStatus(currentProject.id)
        setStatus(result)
      } catch {
        setStatus({ connected: false })
      }
    }

    fetchStatus()
  }, [currentProject?.id])

  if (!status) return null

  if (status.connected && !status.tokenExpired) {
    return (
      <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-300 ${className}`}>
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Gmail Connected
      </Badge>
    )
  }

  if (status.connected && status.tokenExpired) {
    return (
      <Badge variant="outline" className={`bg-amber-50 text-amber-700 border-amber-300 ${className}`}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Gmail Expired
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={`bg-muted text-muted-foreground ${className}`}>
      <Mail className="h-3 w-3 mr-1" />
      Gmail Not Connected
    </Badge>
  )
}

export default GmailConnectCard
