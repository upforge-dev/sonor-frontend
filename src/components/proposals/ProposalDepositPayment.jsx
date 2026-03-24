import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, CheckCircle, Loader2, Lock, Shield } from 'lucide-react'
import { proposalsApi, configApi } from '@/lib/sonor-api'

export default function ProposalDepositPayment({
  proposalId,
  proposalTitle,
  depositAmount,
  depositPercentage,
  totalAmount,
  onPaymentSuccess,
  onSkip
}) {
  const [card, setCard] = useState(null)
  const [payments, setPayments] = useState(null)
  const [squareConfig, setSquareConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Initialize Square
  useEffect(() => {
    const initSquare = async () => {
      try {
        // Fetch Square config for this proposal
        const config = await configApi.getSquareConfigByProposalId(proposalId)
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
        await cardInstance.attach('#card-container')
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
  }, [proposalId])

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
      const response = await proposalsApi.payDeposit(proposalId, {
        sourceId: tokenResult.token,
        verificationToken: tokenResult.verificationToken
      })

      const data = response.data

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed')
      }

      setSuccess(true)
      onPaymentSuccess?.(data)

    } catch (err) {
      console.error('Payment error:', err)
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Payment Successful!</h3>
        <p className="text-[var(--text-secondary)] mb-4">
          Your deposit of ${depositAmount?.toLocaleString()} has been processed.
        </p>
        <p className="text-sm text-[var(--text-tertiary)]">
          Check your email for confirmation and next steps.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--glass-bg)] border-2 border-[var(--brand-primary)] rounded-xl overflow-hidden">
      <div className="bg-[var(--brand-primary)]/10 p-4 border-b border-[var(--brand-primary)]/20">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[var(--brand-primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Complete Your Deposit</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Pay your {depositPercentage}% deposit to kick off the project
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount Summary */}
        <div className="bg-[var(--glass-bg-inset)] rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[var(--text-secondary)]">Project Total</span>
            <span className="text-[var(--text-primary)]">${totalAmount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-semibold">
            <span className="text-[var(--text-primary)]">Deposit Due ({depositPercentage}%)</span>
            <span className="text-[var(--brand-primary)]">${depositAmount?.toLocaleString()}</span>
          </div>
          {depositPercentage < 100 && (
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Remaining ${(totalAmount - depositAmount)?.toLocaleString()} due upon project completion
            </p>
          )}
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
            id="card-container" 
            className={`min-h-[50px] bg-white rounded-lg border-2 border-[var(--glass-border)] p-3 ${loading ? 'animate-pulse' : ''}`}
          />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading secure payment form...
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-3 bg-[var(--glass-bg-inset)] rounded-lg">
          <Shield className="h-5 w-5 text-[var(--brand-primary)] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[var(--text-tertiary)]">
            <p className="font-medium text-[var(--text-secondary)] mb-1">Secure Payment</p>
            <p>Your payment is processed securely by Square. We never store your card details.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handlePayment}
            disabled={loading || processing}
            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white py-6 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 mr-2" />
                Pay ${depositAmount?.toLocaleString()} Deposit
              </>
            )}
          </Button>

          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              I'll pay later via invoice
            </button>
          )}
        </div>

        {/* Project Info */}
        <div className="pt-4 border-t border-[var(--glass-border)] text-xs text-[var(--text-tertiary)]">
          <p><strong>Project:</strong> {proposalTitle}</p>
        </div>
      </div>
    </div>
  )
}
