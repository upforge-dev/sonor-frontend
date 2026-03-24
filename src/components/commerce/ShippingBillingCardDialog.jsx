/**
 * ShippingBillingCardDialog - Collect billing card for platform shipping via Stripe Elements
 */
import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { commerceApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

function CardForm({ projectId, clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements || !clientSecret) return

    setLoading(true)
    setError(null)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setError(submitError.message || 'Invalid card details')
        setLoading(false)
        return
      }

      const { setupIntent, error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret,
      })

      if (confirmError) {
        setError(confirmError.message || 'Failed to save card')
        setLoading(false)
        return
      }

      const paymentMethodId = setupIntent?.payment_method
      if (!paymentMethodId) {
        setError('Could not get payment method. Please try again.')
        setLoading(false)
        return
      }

      await commerceApi.attachShippingBillingCard(projectId, paymentMethodId)
      toast.success('Billing card saved')
      onSuccess?.()
    } catch (err) {
      console.error('Shipping billing card error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to save card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
        }}
      />
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Card'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ShippingBillingCardDialog({ open, onOpenChange, projectId, onSuccess }) {
  const [stripePromise, setStripePromise] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !projectId) return

    let cancelled = false

    const init = async () => {
      setLoading(true)
      setError(null)
      setClientSecret(null)

      try {
        const { data: config } = await commerceApi.getShippingBillingConfig()
        if (!config?.publishableKey) {
          setError('Stripe is not configured for shipping billing.')
          setLoading(false)
          return
        }

        if (cancelled) return
        setStripePromise(loadStripe(config.publishableKey))

        const { data: intent } = await commerceApi.createShippingBillingSetupIntent(projectId)
        if (cancelled) return
        setClientSecret(intent.clientSecret)
      } catch (err) {
        console.error('Shipping billing init error:', err)
        setError(err.response?.data?.message || err.message || 'Failed to load form')
      } finally {
        setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [open, projectId])

  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Billing Card</DialogTitle>
          <DialogDescription>
            Add a card to pay for shipping labels when using platform shipping.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        ) : stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardForm
              projectId={projectId}
              clientSecret={clientSecret}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
