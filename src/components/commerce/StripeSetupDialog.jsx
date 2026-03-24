/**
 * StripeSetupDialog - Configure Stripe payment processor via Connect OAuth (popup flow)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

export default function StripeSetupDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const popupRef = useRef(null)
  const pollRef = useRef(null)

  // Listen for postMessage from the OAuth popup callback page
  const handleMessage = useCallback((event) => {
    if (event.data?.type !== 'oauth-complete') return
    if (event.data.processor !== 'stripe') return

    // Clean up
    setIsConnecting(false)
    if (pollRef.current) clearInterval(pollRef.current)

    if (event.data.success) {
      toast.success('Stripe connected successfully!')
      onSuccess?.()
      onOpenChange(false)
    } else {
      setError(event.data.error || 'Failed to connect Stripe')
    }
  }, [onSuccess, onOpenChange])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  // Poll to detect if the user closed the popup without completing
  useEffect(() => {
    if (!isConnecting) return
    pollRef.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        setIsConnecting(false)
        clearInterval(pollRef.current)
      }
    }, 500)
    return () => clearInterval(pollRef.current)
  }, [isConnecting])

  const handleConnect = () => {
    setError(null)
    setIsConnecting(true)

    const authUrl = `${portalApi.defaults.baseURL}/commerce/oauth/stripe/authorize/${projectId}`
    const w = 600, h = 700
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2

    popupRef.current = window.open(
      authUrl,
      'stripe-oauth',
      `width=${w},height=${h},left=${left},top=${top},popup=yes,toolbar=no,menubar=no`
    )

    if (!popupRef.current) {
      // Popup blocked — fall back to redirect
      setIsConnecting(false)
      setError('Popup blocked. Please allow popups for this site and try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Stripe</DialogTitle>
          <DialogDescription>
            Connect your Stripe account to accept payments and manage subscriptions.
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
              A new window will open for you to authorize this connection with Stripe.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">What you'll authorize:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Process payments</li>
                <li>Create and manage products</li>
                <li>Handle subscriptions</li>
                <li>Access transaction data</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              You can disconnect Stripe at any time from your project settings.
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
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Waiting for Stripe...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect Stripe
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
