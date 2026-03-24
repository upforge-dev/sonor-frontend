import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, CheckCircle, Loader2, Lock, Shield, Receipt } from 'lucide-react'
import { billingApi, configApi } from '@/lib/sonor-api'

export default function InvoicePaymentDialog({
  invoice,
  open,
  onOpenChange,
  onPaymentSuccess
}) {
  const [card, setCard] = useState(null)
  const [payments, setPayments] = useState(null)
  const [squareConfig, setSquareConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Initialize Square when dialog opens
  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setSuccess(false)
      setError('')
      setProcessing(false)
      return
    }

    const initSquare = async () => {
      try {
        setLoading(true)
        setError('')
        
        // Fetch Square config for this invoice's project
        const config = await configApi.getSquareConfig(invoice?.project_id)
        setSquareConfig(config)
        
        if (!config?.applicationId || !config?.locationId) {
          setError('Payment system not configured. Please contact support.')
          setLoading(false)
          return
        }
        
        if (!window.Square) {
          // Load Square SDK
          const script = document.createElement('script')
          script.src = config.environment === 'production' 
            ? 'https://web.squarecdn.com/v1/square.js'
            : 'https://sandbox.web.squarecdn.com/v1/square.js'
          script.async = true
          script.onload = () => initPayments(config)
          script.onerror = () => {
            setError('Failed to load payment system')
            setLoading(false)
          }
          document.body.appendChild(script)
        } else {
          await initPayments(config)
        }
      } catch (err) {
        console.error('Error loading Square:', err)
        setError('Failed to load payment system. Please refresh and try again.')
        setLoading(false)
      }
    }

    const initPayments = async (config) => {
      try {
        const paymentsInstance = window.Square.payments(config.applicationId, config.locationId)
        setPayments(paymentsInstance)

        const cardInstance = await paymentsInstance.card()
        await cardInstance.attach('#invoice-card-container')
        setCard(cardInstance)
        setLoading(false)
      } catch (err) {
        console.error('Error initializing Square:', err)
        setError('Failed to initialize payment form.')
        setLoading(false)
      }
    }

    initSquare()

    return () => {
      if (card) {
        card.destroy()
      }
    }
  }, [open, invoice?.project_id])

  const handlePayment = async () => {
    if (!card) {
      setError('Payment form not ready. Please refresh and try again.')
      return
    }

    setProcessing(true)
    setError('')

    try {
      // Tokenize the card
      const tokenResult = await card.tokenize()
      
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Failed to process card')
      }

      // Send to our backend
      const response = await billingApi.processPayment(invoice.id, {
        sourceId: tokenResult.token
      })

      if (response.data.success) {
        setSuccess(true)
        onPaymentSuccess?.(response.data)
      } else {
        throw new Error(response.data.error || 'Payment failed')
      }

    } catch (err) {
      console.error('Payment error:', err)
      setError(err.response?.data?.error || err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--brand-primary)]" />
            Pay Invoice
          </DialogTitle>
          <DialogDescription>
            Complete payment for invoice {invoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Successful!</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Your payment of {formatCurrency(invoice?.total || invoice?.total_amount)} has been processed.
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">
              A receipt has been sent to your email.
            </p>
            <Button 
              className="mt-6" 
              onClick={() => onOpenChange(false)}
              variant="glass-primary"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{invoice?.invoice_number}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{invoice?.project_title || invoice?.description || 'Invoice'}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-[var(--glass-border)]">
                <span className="text-[var(--text-secondary)]">Amount Due</span>
                <span className="text-2xl font-bold text-[var(--brand-primary)]">
                  {formatCurrency(invoice?.total || invoice?.total_amount)}
                </span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Card Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Card Details
              </label>
              <div 
                id="invoice-card-container" 
                className="min-h-[50px] p-3 border border-[var(--glass-border)] rounded-lg bg-white"
              >
                {loading && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
            </div>

            {/* Security Info */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Shield className="w-4 h-4" />
              <span>Your payment is secured with 256-bit encryption</span>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              disabled={loading || processing || !card}
              className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay {formatCurrency(invoice?.total || invoice?.total_amount)}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-[var(--text-tertiary)]">
              By clicking Pay, you authorize this charge to your card.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
