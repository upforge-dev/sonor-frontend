import { useState, useRef, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, X, Pen, Loader2, Mail, Calendar, User } from 'lucide-react'
import { proposalsApi } from '@/lib/sonor-api'
import { supabase } from '@/lib/supabase'
import ProposalDepositPayment from './ProposalDepositPayment'

export default function ProposalSignature({ 
  proposalId, 
  proposalSlug,
  proposalTitle, 
  clientName: initialClientName, 
  clientEmail, 
  onSignatureStarted,
  // For displaying already-signed proposals (from ProposalView)
  clientSignature,
  clientSignedBy,
  clientSignedAt,
  adminSignature,
  adminSignedBy,
  adminSignedAt,
  status,
  // Payment info
  depositPercentage,
  depositAmount,
  totalAmount,
  depositPaidAt
}) {
  const sigPad = useRef(null)
  const [signed, setSigned] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')
  const [isEmpty, setIsEmpty] = useState(true)
  const [hasTriggeredStart, setHasTriggeredStart] = useState(false)
  const [printedName, setPrintedName] = useState(initialClientName || '')
  const [signatureData, setSignatureData] = useState(null)
  const [signedDate, setSignedDate] = useState(null)
  // Payment state
  const [showPayment, setShowPayment] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const depositScrollDoneRef = useRef(false)

  useEffect(() => {
    depositScrollDoneRef.current = false
  }, [proposalId])

  // Re-open proposal link: show deposit payment when already signed but unpaid
  useEffect(() => {
    if (clientSignature || clientSignedAt) {
      setSigned(true)
      setSignatureData(clientSignature)
      setPrintedName(clientSignedBy || initialClientName || '')
      setSignedDate(clientSignedAt)
      if (depositPaidAt) {
        setPaymentComplete(true)
        setShowPayment(false)
      } else if (depositAmount != null && Number(depositAmount) > 0) {
        setPaymentInfo({
          depositAmount: Number(depositAmount),
          totalAmount: totalAmount != null ? Number(totalAmount) : undefined,
        })
        setShowPayment(true)
      }
    } else {
      checkSignatureStatus()
    }
  }, [
    proposalId,
    clientSignature,
    clientSignedAt,
    depositPaidAt,
    depositAmount,
    totalAmount,
    clientSignedBy,
    initialClientName,
  ])

  useEffect(() => {
    if (!signed || !showPayment || paymentComplete || !paymentInfo || depositScrollDoneRef.current) return
    depositScrollDoneRef.current = true
    const t = window.setTimeout(() => {
      document.getElementById('deposit-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 400)
    return () => clearTimeout(t)
  }, [signed, showPayment, paymentComplete, paymentInfo])

  const checkSignatureStatus = async () => {
    if (!proposalId) return
    
    try {
      const response = await proposalsApi.get(proposalId)
      const proposal = response.data?.proposal
      
      if (proposal) {
        // Check if proposal has signature data
        if (proposal?.signed_at || proposal?.client_signed_at || proposal?.client_signature || proposal?.client_signature_url) {
          setSigned(true)
          setSignatureData(proposal.client_signature_url || proposal.client_signature)
          setPrintedName(proposal.client_signed_by || initialClientName || '')
          setSignedDate(proposal.client_signed_at || proposal.signed_at)
          
          // Check deposit status
          if (proposal?.deposit_paid_at) {
            setPaymentComplete(true)
          } else if (proposal?.deposit_amount) {
            // Proposal is signed but deposit not paid - show payment
            setPaymentInfo({
              depositAmount: proposal.deposit_amount,
              totalAmount: proposal.total_amount
            })
            setShowPayment(true)
          }
        }
      }
    } catch (err) {
      console.error('Error checking signature status:', err)
    }
  }

  const handleClear = () => {
    sigPad.current?.clear()
    setIsEmpty(true)
    setError('')
  }

  const handleBegin = () => {
    setIsEmpty(false)
    setError('')
    
    // Track signature started (only once)
    if (!hasTriggeredStart && onSignatureStarted) {
      setHasTriggeredStart(true)
      onSignatureStarted()
    }
  }

  const handleSign = async () => {
    if (isEmpty || !sigPad.current) {
      setError('Please provide your signature before accepting.')
      return
    }

    if (!printedName.trim()) {
      setError('Please type your full legal name.')
      return
    }

    setSigning(true)
    setError('')

    try {
      // Convert canvas to PNG blob and upload to Supabase Storage
      const canvas = sigPad.current.getCanvas()
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const fileName = `${proposalId}/${Date.now()}.png`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('proposal-signatures')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadError) throw new Error('Failed to upload signature: ' + uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('proposal-signatures')
        .getPublicUrl(uploadData.path)

      // Call the sign endpoint with the Storage URL
      const response = await proposalsApi.sign(proposalId, {
        signatureUrl: publicUrl,
        signerName: printedName.trim(),
        ...(clientEmail ? { signerEmail: clientEmail } : {}),
      })

      const data = response.data
      const signedAt = data.signed_at || new Date().toISOString()

      setSignatureData(publicUrl)
      setSignedDate(signedAt)
      setSigned(true)
      setSigning(false)
      
      // Check if there's a deposit invoice to pay
      const payment = data.payment
      if (payment?.paymentToken && payment.depositAmount > 0) {
        window.location.href = payment.paymentUrl
        return
      } else if (payment?.depositAmount && payment.depositAmount > 0) {
        setPaymentInfo({
          depositAmount: payment.depositAmount,
          totalAmount: payment.totalAmount
        })
        setShowPayment(true)
      } else {
        setPaymentComplete(true)
      }
      
    } catch (err) {
      console.error('Signature error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to process signature. Please try again.')
      setSigning(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Handle payment completion
  const handlePaymentComplete = () => {
    setPaymentComplete(true)
    setShowPayment(false)
  }

  const glassBase = 'relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] rounded-3xl'

  // Show inline signature block if already signed
  if (signed) {
    return (
      <div id="signature" className="space-y-6 scroll-mt-24 my-10">
        {/* Client Signature Block */}
        <div className={`${glassBase} p-8 md:p-10`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#39bfb0]/20 border border-[#39bfb0]/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#39bfb0]" />
              </div>
              <div>
                <span className="text-sm uppercase tracking-widest text-[#39bfb0] block">Complete</span>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Contract Signed</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signature Image */}
              <div className="bg-white rounded-2xl border border-white/20 p-6">
                {signatureData ? (
                  <img
                    src={signatureData}
                    alt="Client Signature"
                    className="max-h-24 mx-auto"
                  />
                ) : (
                  <div className="h-24 flex items-center justify-center text-gray-400">
                    Signature on file
                  </div>
                )}
              </div>

              {/* Signature Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <User className="h-4 w-4 text-[#39bfb0]" />
                  <div>
                    <span className="text-xs text-[var(--text-tertiary)] block">Signed by</span>
                    <span className="font-medium text-[var(--text-primary)]">{printedName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <Calendar className="h-4 w-4 text-[#39bfb0]" />
                  <div>
                    <span className="text-xs text-[var(--text-tertiary)] block">Date</span>
                    <span className="font-medium text-[var(--text-primary)]">{formatDate(signedDate)}</span>
                  </div>
                </div>
                {clientEmail && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <Mail className="h-4 w-4 text-[#39bfb0]" />
                    <div>
                      <span className="text-xs text-[var(--text-tertiary)] block">Email</span>
                      <span className="font-medium text-[var(--text-primary)]">{clientEmail}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-[#39bfb0]/10 border border-[#39bfb0]/20">
              <p className="text-sm text-[#39bfb0] font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                This contract is fully executed and legally binding
              </p>
            </div>

            <p className="text-xs text-[var(--text-tertiary)] mt-4">
              Electronically signed and legally binding under the ESIGN Act and UETA.
            </p>
          </div>
        </div>

        {/* Payment Section */}
        {showPayment && paymentInfo && !paymentComplete && (
          <div id="deposit-payment" className="scroll-mt-24">
            <ProposalDepositPayment
              proposalId={proposalId}
              proposalTitle={proposalTitle}
              depositAmount={paymentInfo.depositAmount}
              depositPercentage={depositPercentage || 50}
              totalAmount={paymentInfo.totalAmount}
              onPaymentSuccess={handlePaymentComplete}
            />
          </div>
        )}

        {/* Payment Complete Confirmation */}
        {paymentComplete && (
          <div className={`${glassBase} p-8`}>
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#39bfb0]/20 border border-[#39bfb0]/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-[#39bfb0]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#39bfb0] mb-1">Thank You!</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Your contract has been signed and your deposit payment has been received.
                  We're excited to get started on your project! Check your email for next steps
                  and project timeline details.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show signature form
  return (
    <div id="signature" className={`${glassBase} overflow-hidden my-10 scroll-mt-24 border-[#39bfb0]/40`}>
      {/* Subtle brand glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#39bfb0]/15 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#39bfb0]/20 border border-[#39bfb0]/30 flex items-center justify-center">
              <Pen className="w-6 h-6 text-[#39bfb0]" />
            </div>
            <div>
              <span className="text-sm uppercase tracking-widest text-[#39bfb0] block">Accept</span>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Sign to Accept Proposal</h2>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] ml-15 mb-6">
            By signing below, you agree to the terms and pricing outlined in this proposal.
          </p>
        </div>

        <div className="p-8 pt-0 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Legal Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <CheckCircle className="h-5 w-5 text-[#39bfb0] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-[var(--text-primary)]">Legally Binding</p>
                <p className="text-xs text-[var(--text-secondary)]">Enforceable under the ESIGN Act.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <Mail className="h-5 w-5 text-[#39bfb0] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-[var(--text-primary)]">Email Confirmation</p>
                <p className="text-xs text-[var(--text-secondary)]">Signed PDF copy sent via email.</p>
              </div>
            </div>
          </div>

          {/* Printed Name Field */}
          <div className="space-y-2">
            <Label htmlFor="printedName" className="text-[var(--text-primary)]">
              Your Full Legal Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="printedName"
              type="text"
              value={printedName}
              onChange={(e) => setPrintedName(e.target.value)}
              placeholder="Type your full legal name"
              className="bg-white/5 border-white/20 text-[var(--text-primary)] rounded-xl h-12"
              disabled={signing}
            />
          </div>

          {/* Signature Canvas */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)]">
              Your Signature <span className="text-red-400">*</span>
            </Label>
            <div className="border-2 border-white/20 rounded-2xl bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigPad}
                onBegin={handleBegin}
                canvasProps={{
                  className: 'w-full h-40 cursor-crosshair',
                  style: { touchAction: 'none' }
                }}
                backgroundColor="rgb(255, 255, 255)"
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              Sign above using your mouse, trackpad, or touch screen
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={signing}
              className="flex-1 border-white/20 hover:bg-white/5 rounded-xl h-12"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={handleSign}
              disabled={signing || isEmpty || !printedName.trim()}
              className="flex-1 bg-[#39bfb0] hover:bg-[#39bfb0]/90 text-white rounded-xl h-12 shadow-lg shadow-[#39bfb0]/20"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Sign & Accept Proposal
                </>
              )}
            </Button>
          </div>

          {/* Signature Details Preview */}
          <div className="pt-4 border-t border-white/10 text-xs text-[var(--text-tertiary)] space-y-1">
            <p><strong>Proposal:</strong> {proposalTitle}</p>
            {clientEmail && <p><strong>Email:</strong> {clientEmail}</p>}
            <p><strong>Date:</strong> {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
