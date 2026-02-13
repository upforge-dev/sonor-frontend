/**
 * GscConnectModal - Connect Google Search Console via OAuth in a popup
 *
 * - If the project already has a Google (GSC) connection, shows "Select a property" only (no re-auth).
 * - Otherwise opens OAuth in a popup; after success shows property selection when needed.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { Link2, Loader2, AlertCircle, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { oauthApi } from '@/lib/portal-api'

const POPUP_WIDTH = 520
const POPUP_HEIGHT = 600

export default function GscConnectModal({ open, onOpenChange, projectId, onSuccess }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'opening' | 'waiting' | 'success' | 'error'
  const [step, setStep] = useState('connect') // 'connect' | 'select_property'
  const [connectionIdForProperty, setConnectionIdForProperty] = useState(null)
  const [properties, setProperties] = useState([])
  const [selectedPropertyUrl, setSelectedPropertyUrl] = useState(null)
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [propertySaving, setPropertySaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const popupRef = useRef(null)
  const messageHandlerRef = useRef(null)
  const intervalRef = useRef(null)

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

  // When modal opens, check for existing GSC connection so we can show "Select property" instead of re-auth
  useEffect(() => {
    if (!open || !projectId) return
    let cancelled = false
    oauthApi.getConnectionStatus(projectId).then((res) => {
      if (cancelled) return
      const google = res?.platforms?.google
      if (google?.connected && google?.connectionId) {
        setStep('select_property')
        setConnectionIdForProperty(google.connectionId)
        setStatus('idle')
      } else {
        setStep('connect')
        setConnectionIdForProperty(null)
      }
    }).catch(() => {
      if (!cancelled) setStep('connect')
    })
    return () => { cancelled = true }
  }, [open, projectId])

  useEffect(() => {
    if (!open) {
      cleanup()
      setStatus('idle')
      setStep('connect')
      setConnectionIdForProperty(null)
      setProperties([])
      setSelectedPropertyUrl(null)
      setErrorMessage(null)
    }
  }, [open, cleanup])

  // Fetch GSC properties when showing property step
  useEffect(() => {
    if (step !== 'select_property' || !connectionIdForProperty) return
    setPropertiesLoading(true)
    setErrorMessage(null)
    oauthApi.getGscProperties(connectionIdForProperty)
      .then((data) => {
        const list = data?.properties || []
        setProperties(list)
        const url = data?.selectedPropertyUrl || list[0]?.siteUrl || list[0]?.url
        setSelectedPropertyUrl(url || null)
      })
      .catch((err) => {
        setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to load properties')
      })
      .finally(() => setPropertiesLoading(false))
  }, [step, connectionIdForProperty])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  const handleOpenPopup = useCallback(async () => {
    if (!projectId) return
    setStatus('opening')
    setErrorMessage(null)
    try {
      const returnUrl = window.location.origin + window.location.pathname
      const res = await oauthApi.initiate('google', projectId, 'seo', returnUrl, { popupMode: true })
      const url = res?.url
      if (!url || typeof url !== 'string' || !url.startsWith('https://accounts.google.com')) {
        setErrorMessage(
          'Could not get Google sign-in URL. The Portal API may be unreachable or OAuth is not configured. Check VITE_PORTAL_API_URL and that the API is running.'
        )
        setStatus('error')
        toast.error('Failed to start GSC connection')
        return
      }
      const left = Math.round((window.screen.width - POPUP_WIDTH) / 2)
      const top = Math.round((window.screen.height - POPUP_HEIGHT) / 2)
      const popup = window.open(
        url,
        'gsc-oauth',
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
          if (data.selectProperty === true && data.connectionId) {
            setStep('select_property')
            setConnectionIdForProperty(data.connectionId)
            setStatus('idle')
            toast.success('Signed in — select a Search Console property')
          } else {
            setStatus('success')
            toast.success('Google Search Console connected')
            onSuccess?.({ connectionId: data.connectionId, selectProperty: false })
            onOpenChange?.(false)
          }
        } else if (data.type === 'oauth-error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          window.removeEventListener('message', messageHandlerRef.current)
          messageHandlerRef.current = null
          setErrorMessage(data.error || 'Connection failed')
          setStatus('error')
          toast.error(data.error || 'Failed to connect GSC')
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
      console.error('Connect GSC failed:', err)
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to start connection')
      setStatus('error')
      toast.error('Failed to connect GSC')
    }
  }, [projectId, onSuccess, onOpenChange, cleanup])

  const handleSelectProperty = useCallback(async () => {
    if (!connectionIdForProperty || !selectedPropertyUrl) return
    setPropertySaving(true)
    setErrorMessage(null)
    try {
      await oauthApi.selectGscProperty(connectionIdForProperty, selectedPropertyUrl)
      toast.success('Search Console property connected')
      onSuccess?.({ connectionId: connectionIdForProperty, selectProperty: true })
      onOpenChange?.(false)
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to save property')
      toast.error('Failed to save property selection')
    } finally {
      setPropertySaving(false)
    }
  }, [connectionIdForProperty, selectedPropertyUrl, onSuccess, onOpenChange])

  const handleClose = useCallback(() => {
    cleanup()
    setStatus('idle')
    setErrorMessage(null)
    onOpenChange?.(false)
  }, [cleanup, onOpenChange])

  const isSelectPropertyStep = step === 'select_property'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => status === 'waiting' && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSelectPropertyStep ? (
              <Globe className="h-5 w-5 text-amber-500" />
            ) : (
              <Link2 className="h-5 w-5 text-amber-500" />
            )}
            {isSelectPropertyStep ? 'Select Search Console property' : 'Connect Google Search Console'}
          </DialogTitle>
          <DialogDescription>
            {isSelectPropertyStep && 'Choose which Search Console property (site) to use for this project. You’re already signed in.'}
            {!isSelectPropertyStep && status === 'idle' && 'We\'ll open a popup to connect your Google account. No full-page redirect.'}
            {!isSelectPropertyStep && status === 'opening' && 'Opening Google sign-in...'}
            {!isSelectPropertyStep && status === 'waiting' && 'Complete the sign-in in the popup window. You can leave this dialog open.'}
            {!isSelectPropertyStep && status === 'success' && 'Connected! Refreshing your data.'}
            {!isSelectPropertyStep && status === 'error' && (errorMessage || 'Something went wrong.')}
          </DialogDescription>
        </DialogHeader>

        {isSelectPropertyStep && (
          <>
            {propertiesLoading && (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading properties...</span>
              </div>
            )}
            {!propertiesLoading && properties.length > 0 && (
              <ScrollArea className="max-h-[240px] rounded-md border border-border/50 p-2">
                <div className="space-y-1">
                  {properties.map((p) => {
                    const url = p.siteUrl || p.url
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedPropertyUrl(url)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${selectedPropertyUrl === url ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                      >
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{url?.replace(/^sc-domain:/, '') || p.displayName || url}</span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
            {!propertiesLoading && properties.length === 0 && !errorMessage && (
              <p className="text-sm text-muted-foreground py-2">No Search Console properties found for this account.</p>
            )}
          </>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {isSelectPropertyStep && errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {isSelectPropertyStep && !propertiesLoading && (
            <>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSelectProperty} disabled={!selectedPropertyUrl || propertySaving}>
                {propertySaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {propertySaving ? 'Saving...' : 'Use this property'}
              </Button>
            </>
          )}
          {!isSelectPropertyStep && status === 'error' && (
            <Button variant="outline" onClick={handleOpenPopup}>Try again</Button>
          )}
          {!isSelectPropertyStep && status !== 'waiting' && status !== 'opening' && (
            <Button variant="ghost" onClick={handleClose}>
              {status === 'success' ? 'Close' : 'Cancel'}
            </Button>
          )}
          {!isSelectPropertyStep && status === 'idle' && (
            <Button onClick={handleOpenPopup}>Continue with Google</Button>
          )}
          {!isSelectPropertyStep && (status === 'opening' || status === 'waiting') && (
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
