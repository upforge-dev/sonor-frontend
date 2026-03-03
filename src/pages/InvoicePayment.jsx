// src/pages/InvoicePayment.jsx
// World-class public invoice payment page - no login required
// Accessible via /pay/:invoiceId?token=xxx

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Lock,
  Shield,
  CreditCard,
  ArrowRight
} from 'lucide-react'
import api from '@/lib/api'
import { billingApi, configApi } from '@/lib/portal-api'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

function formatDate(dateString) {
  if (!dateString) return 'Upon Receipt'
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

// Brand Logo Component - uses project logo_url and brand name (default: Upforge)
const BrandLogo = ({ logoUrl, brandName = 'Upforge', className = "h-10", showText = true }) => (
  <div className="flex items-center gap-3">
    <img 
      src={logoUrl || '/logo.svg'} 
      alt={brandName} 
      className={className}
      onError={(e) => {
        e.target.onerror = null
        e.target.src = '/logo.svg'
      }}
    />
    {showText && (
      <span className="text-xl font-bold text-gray-900">
        {brandName}
      </span>
    )}
  </div>
)

export default function InvoicePayment() {
  const { token: urlToken } = useParams()
  
  // Get token from query string OR URL path
  // Supports both /pay/:token and /pay/:id?token=xxx formats
  const searchParams = new URLSearchParams(window.location.search)
  const queryToken = searchParams.get('token')
  const token = queryToken || urlToken
  
  const [invoice, setInvoice] = useState(null)
  const [squareConfig, setSquareConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [card, setCard] = useState(null)
  const [cardReady, setCardReady] = useState(false)
  
  const cardContainerRef = useRef(null)
  const cardInitializedRef = useRef(false)

  const brandName = invoice?.project?.title || 'Upforge'
  const logoUrl = invoice?.project?.logoUrl

  // Fetch invoice and Square config on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid payment link')
      setLoading(false)
      return
    }
    fetchInvoiceAndConfig()
  }, [token])

  // Initialize Square Web SDK - only once
  useEffect(() => {
    if (!invoice || invoice.status === 'paid' || !squareConfig || cardInitializedRef.current) return
    
    cardInitializedRef.current = true
    initializeSquare()
    
    return () => {
      // Cleanup card instance
      if (card) {
        card.destroy?.()
      }
    }
  }, [invoice, squareConfig])

  const fetchInvoiceAndConfig = async () => {
    try {
      // Fetch invoice and Square config in parallel
      const [invoiceResponse, config] = await Promise.all([
        billingApi.getPublicInvoice(token),
        configApi.getSquareConfigByInvoiceToken(token)
      ])
      
      setInvoice(invoiceResponse.data?.invoice ?? invoiceResponse.data)
      setSquareConfig(config)
    } catch (err) {
      console.error('Failed to fetch invoice:', err)
      if (err.response?.status === 410) {
        setError('This payment link has expired. Please contact us for a new invoice.')
      } else if (err.response?.status === 404) {
        setError('Invoice not found. This link may be invalid or expired.')
      } else {
        setError('Failed to load invoice. Please try again or contact support.')
      }
    } finally {
      setLoading(false)
    }
  }

  const initializeSquare = async () => {
    try {
      console.log('[Square Init] Starting Square initialization...')
      console.log('[Square Init] App ID:', squareConfig?.applicationId ? 'Present' : 'Missing')
      console.log('[Square Init] Location ID:', squareConfig?.locationId ? 'Present' : 'Missing')
      console.log('[Square Init] Environment:', squareConfig?.environment)
      
      // Check if Square config is present
      if (!squareConfig?.applicationId || !squareConfig?.locationId) {
        throw new Error('Square payment configuration is missing. Please contact support.')
      }
      
      // Load Square Web SDK with timeout
      if (!window.Square) {
        console.log('[Square Init] Loading Square SDK...')
        await Promise.race([
          new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = squareConfig.environment === 'production' 
              ? 'https://web.squarecdn.com/v1/square.js'
              : 'https://sandbox.web.squarecdn.com/v1/square.js'
            script.onload = () => {
              console.log('[Square Init] SDK loaded successfully')
              resolve()
            }
            script.onerror = () => {
              console.error('[Square Init] Failed to load SDK')
              reject(new Error('Failed to load Square SDK'))
            }
            document.body.appendChild(script)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Square SDK load timeout')), 10000)
          )
        ])
      }

      console.log('[Square Init] Initializing payments instance...')
      const paymentsInstance = window.Square.payments(squareConfig.applicationId, squareConfig.locationId)
      
      console.log('[Square Init] Creating card instance...')
      const cardInstance = await Promise.race([
        paymentsInstance.card({
          style: {
            '.input-container': {
              borderColor: '#e5e7eb',
              borderRadius: '8px',
            },
            '.input-container.is-focus': {
              borderColor: '#4bbf39',
            },
            '.input-container.is-error': {
              borderColor: '#ef4444',
            },
            '.message-text': {
              color: '#6b7280',
            },
            '.message-icon': {
              color: '#6b7280',
            },
            '.message-text.is-error': {
              color: '#ef4444',
            },
            '.message-icon.is-error': {
              color: '#ef4444',
            },
            input: {
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontSize: '16px',
            },
            'input::placeholder': {
              color: '#9ca3af',
            },
            'input.is-error': {
              color: '#ef4444',
            },
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Card initialization timeout')), 10000)
        )
      ])
      
      console.log('[Square Init] Attaching card to container...')
      await Promise.race([
        cardInstance.attach('#card-container'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Card attach timeout')), 10000)
        )
      ])
      
      console.log('[Square Init] Card ready!')
      setCard(cardInstance)
      setCardReady(true)
    } catch (err) {
      console.error('[Square Init] Failed:', err)
      setPaymentError(err.message || 'Failed to initialize payment form. Please refresh and try again.')
      setCardReady(false)
    }
  }

  const handlePayment = async () => {
    if (!card || !invoice) return

    setProcessing(true)
    setPaymentError(null)

    try {
      const result = await card.tokenize()
      
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message || 'Card validation failed')
      }

      const { data } = await billingApi.payPublicInvoice({
        token,
        sourceId: result.token
      })

      if (data.success) {
        setPaymentSuccess(true)
        setInvoice(prev => ({ ...prev, status: 'paid' }))
      }
    } catch (err) {
      console.error('Payment failed:', err)
      setPaymentError(err.response?.data?.details || err.response?.data?.error || err.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Loading your invoice...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Invoice</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">{error}</p>
            <a 
              href="mailto:hello@upforge.com"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
            >
              Contact Support
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Payment success state
  if (paymentSuccess || invoice?.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <BrandLogo logoUrl={logoUrl} brandName={brandName} className="h-10 mx-auto" />
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl shadow-green-100/50 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Payment Successful!</h1>
                <p className="text-white/80 text-sm">Thank you for your payment</p>
              </div>
            </div>
            
            {/* Receipt Details */}
            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-500">Invoice</span>
                  <span className="font-semibold text-gray-900">{invoice?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold text-gray-900">{formatDate(new Date().toISOString())}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="text-2xl font-bold text-teal-600">{formatCurrency(invoice?.totalAmount)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <p className="text-sm text-gray-500">
                  A receipt has been sent to your email.
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-gray-400 mt-8">
            Questions? <a href="mailto:hello@upforge.com" className="text-teal-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>
    )
  }

  // Main payment view
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrandLogo logoUrl={logoUrl} brandName={brandName} className="h-8 md:h-10" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="w-4 h-4 text-teal-500" />
            <span className="hidden sm:inline">Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Invoice Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden mb-6">
          {/* Invoice Header */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-8 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Invoice</p>
                <h1 className="text-2xl md:text-3xl font-bold">{invoice?.invoiceNumber}</h1>
              </div>
              <div className="bg-amber-400/20 text-amber-300 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Payment Due
              </div>
            </div>
            
            {invoice?.description && (
              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-md">
                {invoice.description}
              </p>
            )}
          </div>
          
          {/* Invoice Details */}
          <div className="p-6 md:p-8">
            {invoice?.contact && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Billed To</p>
                <p className="font-semibold text-gray-900">{invoice.contact.name}</p>
                {invoice.contact.company && (
                  <p className="text-gray-500">{invoice.contact.company}</p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Due Date</p>
                <p className="font-semibold text-gray-900">{formatDate(invoice?.dueDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Status</p>
                <p className="font-semibold text-amber-600">Awaiting Payment</p>
              </div>
            </div>
            
            {/* Amount Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-5 md:p-6">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice?.amount)}</span>
                </div>
                {invoice?.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">Total Due</span>
                <span className="text-3xl font-bold text-teal-600">{formatCurrency(invoice?.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
                <p className="text-sm text-gray-500">Enter your card information</p>
              </div>
            </div>

            {paymentError && (
              <Alert variant="destructive" className="mb-6 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {/* Square Card Element Container */}
            <div 
              id="card-container" 
              ref={cardContainerRef}
              className="mb-6 min-h-[100px]"
            />

            <Button 
              onClick={handlePayment}
              disabled={processing || !cardReady}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-6 text-lg rounded-2xl font-semibold shadow-lg shadow-teal-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : !cardReady ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Pay {formatCurrency(invoice?.totalAmount)}
                </>
              )}
            </Button>

            {/* Security Badges */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Lock className="w-4 h-4" />
                <span>256-bit SSL Encrypted</span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>Secured by Square</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 space-y-2">
          <p className="text-sm text-gray-500">
            Questions about this invoice?{' '}
            <a href="mailto:hello@upforge.com" className="text-teal-600 hover:underline font-medium">
              Contact us
            </a>
          </p>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  )
}
