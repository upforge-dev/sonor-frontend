/**
 * ReputationOAuthDialogs - OAuth connection dialogs for review platforms
 * Google uses unified OAuth (same as Files/SEO/Broadcast); after sign-in
 * user may need to select a specific business location/property.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ExternalLink, Key, Star, CheckCircle2, MapPin } from 'lucide-react'
import { reputationApi, getPortalApiUrl, oauthApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

// Platform configuration
const PLATFORM_CONFIG = {
  google: {
    name: 'Google Business Profile',
    color: '#4285f4',
    icon: '🔵',
    description: 'Connect your Google Business Profile to sync reviews automatically.',
    permissions: [
      'Access your business reviews',
      'Read review ratings and content',
      'Sync new reviews automatically',
    ],
    oauth: true,
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    icon: '🔷',
    description: 'Connect your Facebook Page to sync reviews and recommendations.',
    permissions: [
      'Access page reviews and recommendations',
      'Read review content',
      'Monitor new feedback',
    ],
    oauth: true,
  },
  trustpilot: {
    name: 'Trustpilot',
    color: '#00b67a',
    icon: '🟢',
    description: 'Connect your Trustpilot business account to sync reviews.',
    permissions: [
      'Access your business reviews',
      'Read ratings and feedback',
      'Sync verified reviews',
    ],
    oauth: true,
  },
  yelp: {
    name: 'Yelp',
    color: '#d32323',
    icon: '🔴',
    description: 'Connect your Yelp business listing using an API key.',
    permissions: [
      'Access public business reviews',
      'Read ratings and content',
      'Monitor review activity',
    ],
    oauth: false, // API key based
  },
}

const POPUP_WIDTH = 520
const POPUP_HEIGHT = 600

// Google OAuth Dialog – uses unified OAuth with popup (same as GSC).
// Opens OAuth in a popup (no full-page redirect). Listens for postMessage from
// the callback so the connection is completed and the UI updates without leaving the page.
export function GoogleOAuthDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'opening' | 'waiting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null)
  const popupRef = useRef(null)
  const messageHandlerRef = useRef(null)
  const intervalRef = useRef(null)
  const config = PLATFORM_CONFIG.google

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (messageHandlerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('message', messageHandlerRef.current)
      messageHandlerRef.current = null
    }
    if (popupRef.current && !popupRef.current.closed) {
      try { popupRef.current.close() } catch (_) {}
      popupRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) {
      cleanup()
      setStatus('idle')
      setErrorMessage(null)
    }
  }, [open, cleanup])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  const handleOpenPopup = useCallback(async () => {
    if (!projectId) {
      setErrorMessage('Select a project first')
      setStatus('error')
      return
    }
    setStatus('opening')
    setErrorMessage(null)
    try {
      const returnUrl = window.location.origin + window.location.pathname
      const res = await oauthApi.initiate('google', projectId, 'reputation', returnUrl, { popupMode: true })
      const url = res?.url
      if (!url || typeof url !== 'string' || !url.startsWith('https://accounts.google.com')) {
        setErrorMessage(
          'Could not get Google sign-in URL. The Portal API may be unreachable or OAuth is not configured.'
        )
        setStatus('error')
        toast.error('Failed to start GBP connection')
        return
      }
      const left = Math.round((window.screen.width - POPUP_WIDTH) / 2)
      const top = Math.round((window.screen.height - POPUP_HEIGHT) / 2)
      const popup = window.open(
        url,
        'gbp-oauth',
        `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      )
      popupRef.current = popup
      if (!popup) {
        setErrorMessage('Popup was blocked. Please allow popups for this site and try again.')
        setStatus('error')
        return
      }
      setStatus('waiting')

      const handleMessage = (event) => {
        if (event.source !== popup) return
        const data = event.data
        if (!data || typeof data !== 'object') return
        if (data.type === 'oauth-success') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          window.removeEventListener('message', messageHandlerRef.current)
          messageHandlerRef.current = null
          try { popup.close() } catch (_) {}
          popupRef.current = null
          setStatus('success')
          toast.success('Google Business Profile connected')
          onSuccess?.({
            connectionId: data.connectionId,
            selectLocation: data.selectLocation === true,
          })
          onOpenChange?.(false)
        } else if (data.type === 'oauth-error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          window.removeEventListener('message', messageHandlerRef.current)
          messageHandlerRef.current = null
          setErrorMessage(data.error || 'Connection failed')
          setStatus('error')
          toast.error(data.error || 'Failed to connect GBP')
        }
      }

      messageHandlerRef.current = handleMessage
      window.addEventListener('message', handleMessage)

      intervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          cleanup()
          setStatus((s) => {
            if (s === 'waiting') onOpenChange?.(false)
            return 'idle'
          })
        }
      }, 500)
    } catch (err) {
      console.error('Connect GBP failed:', err)
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to start connection')
      setStatus('error')
      toast.error('Failed to connect GBP')
    }
  }, [projectId, onSuccess, onOpenChange, cleanup])

  const handleClose = useCallback(() => {
    cleanup()
    setStatus('idle')
    setErrorMessage(null)
    onOpenChange?.(false)
  }, [cleanup, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => status === 'waiting' && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {status === 'idle' && 'We\'ll open a popup to connect your Google Business Profile. No full-page redirect.'}
            {status === 'opening' && 'Opening Google sign-in...'}
            {status === 'waiting' && 'Complete the sign-in in the popup window. You can leave this dialog open.'}
            {status === 'success' && 'Connected! Refreshing your data.'}
            {status === 'error' && (errorMessage || 'Something went wrong.')}
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <div
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: `${config.color}10` }}
          >
            <p className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: config.color }} />
              What happens next
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>A popup will open for Google sign-in</li>
              <li>If you have multiple business locations, you&apos;ll pick which one to connect</li>
              <li>Reviews from that location will sync here</li>
            </ul>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {status === 'error' && (
            <Button variant="outline" onClick={handleOpenPopup}>Try again</Button>
          )}
          {status !== 'waiting' && status !== 'opening' && (
            <Button variant="ghost" onClick={handleClose}>
              {status === 'success' ? 'Close' : 'Cancel'}
            </Button>
          )}
          {status === 'idle' && (
            <Button 
              onClick={handleOpenPopup}
              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
            >
              Continue with Google
            </Button>
          )}
          {(status === 'opening' || status === 'waiting') && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{status === 'opening' ? 'Opening...' : 'Waiting for approval...'}</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Facebook OAuth Dialog
export function FacebookOAuthDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const config = PLATFORM_CONFIG.facebook

  const handleConnect = async () => {
    setError(null)
    setIsConnecting(true)
    
    try {
      // Redirect to Facebook OAuth flow
      const apiUrl = getPortalApiUrl()
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `${apiUrl}/reputation/platforms/oauth/initiate/facebook?projectId=${projectId}&returnUrl=${returnUrl}`
    } catch (error) {
      console.error('Failed to initiate Facebook OAuth:', error)
      setError(error.response?.data?.message || 'Failed to connect Facebook')
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Facebook to authorize this connection.
            </p>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What you'll authorize:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                {config.permissions.map((perm, i) => (
                  <li key={i}>{perm}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can disconnect {config.name} at any time from the Platforms view.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Trustpilot OAuth Dialog
export function TrustpilotOAuthDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const config = PLATFORM_CONFIG.trustpilot

  const handleConnect = async () => {
    setError(null)
    setIsConnecting(true)
    
    try {
      // Redirect to Trustpilot OAuth flow
      const apiUrl = getPortalApiUrl()
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `${apiUrl}/reputation/platforms/oauth/initiate/trustpilot?projectId=${projectId}&returnUrl=${returnUrl}`
    } catch (error) {
      console.error('Failed to initiate Trustpilot OAuth:', error)
      setError(error.response?.data?.message || 'Failed to connect Trustpilot')
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You'll be redirected to Trustpilot to authorize this connection.
            </p>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What you'll authorize:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                {config.permissions.map((perm, i) => (
                  <li key={i}>{perm}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can disconnect {config.name} at any time from the Platforms view.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Yelp API Key Dialog (not OAuth, uses API key)
export function YelpApiKeyDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [businessId, setBusinessId] = useState('')
  const config = PLATFORM_CONFIG.yelp

  const handleConnect = async () => {
    if (!apiKey.trim() || !businessId.trim()) {
      setError('Please enter both API key and business ID')
      return
    }

    setError(null)
    setIsConnecting(true)
    
    try {
      await reputationApi.post('/reputation/platforms/yelp/connect', {
        project_id: projectId,
        api_key: apiKey,
        business_id: businessId,
      })
      toast.success('Yelp connected successfully!')
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to connect Yelp:', error)
      setError(error.response?.data?.message || 'Failed to connect Yelp')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="yelp-api-key">Yelp Fusion API Key</Label>
              <Input
                id="yelp-api-key"
                type="password"
                placeholder="Enter your Yelp API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a 
                  href="https://www.yelp.com/developers/v3/manage_app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Yelp Fusion Developer Portal
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yelp-business-id">Business ID or Alias</Label>
              <Input
                id="yelp-business-id"
                placeholder="e.g., my-business-name-new-york"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Find your business ID in your Yelp business page URL
              </p>
            </div>
            
            <div 
              className="p-4 rounded-lg space-y-2"
              style={{ backgroundColor: `${config.color}10` }}
            >
              <p className="text-sm font-medium">What you'll enable:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                {config.permissions.map((perm, i) => (
                  <li key={i}>{perm}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !apiKey.trim() || !businessId.trim()}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Connect {config.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick Connect Platforms Dialog - shows all available platforms
export function ConnectPlatformsDialog({ open, onOpenChange, projectId, platforms = [], onSuccess }) {
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Determine which platforms are already connected
  const connectedPlatforms = platforms.reduce((acc, p) => {
    if (p.isConnected) acc[p.platformType] = true
    return acc
  }, {})

  const handlePlatformClick = (platformKey) => {
    setSelectedPlatform(platformKey)
  }

  const handleConnect = async (platformKey) => {
    setIsConnecting(true)
    try {
      if (platformKey === 'yelp') {
        // Yelp needs API key dialog - close this and parent will handle
        onOpenChange(false)
        return platformKey // Signal to parent to open Yelp dialog
      }
      // For OAuth platforms, redirect
      const apiUrl = reputationApi.defaults?.baseURL || '/api'
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `${apiUrl}/reputation/platforms/oauth/initiate/${platformKey}?projectId=${projectId}&returnUrl=${returnUrl}`
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Connect Review Platforms
          </DialogTitle>
          <DialogDescription>
            Connect your review platforms to sync reviews automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
            const isConnected = connectedPlatforms[key]
            return (
              <button
                key={key}
                onClick={() => !isConnected && handleConnect(key)}
                disabled={isConnected || isConnecting}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  isConnected 
                    ? 'border-[var(--glass-border)] bg-[var(--glass-bg-inset)] opacity-60 cursor-default'
                    : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 bg-[var(--glass-bg)] cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{config.name}</span>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {config.oauth ? 'OAuth connection' : 'API key required'}
                      </p>
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand-primary)' }}>
                      <CheckCircle2 className="h-4 w-4" />
                      Connected
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: config.color, color: config.color }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnect(key)
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
