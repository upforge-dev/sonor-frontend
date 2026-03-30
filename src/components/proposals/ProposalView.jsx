// src/components/ProposalView.jsx
/**
 * Proposal View — JSON sections only.
 * Used by both:
 * - ProposalEditor (admin preview with toolbar)
 * - ProposalGate (client-facing public view)
 *
 * All proposals use sections_json rendered via ProposalBlockRegistry.
 * MDX rendering has been removed — all legacy proposals have been migrated.
 */
import { ProposalSection } from './ProposalBlockRegistry'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'
import ProposalSignature from './ProposalSignature'
import ProposalTerms from './ProposalTerms'

// JSON sections renderer
function ProposalJSONContent({ sectionsJson, proposal }) {
  const sections = Array.isArray(sectionsJson) ? sectionsJson : []

  if (sections.length === 0) {
    return <p className="text-[var(--text-secondary)]">No content available</p>
  }

  return (
    <div className="proposal-json-content text-[var(--text-primary)]">
      {sections.map((section, index) => (
        <ProposalSection
          key={`${section.type}-${index}`}
          section={section}
          proposal={proposal}
        />
      ))}
    </div>
  )
}

export default function ProposalView({
  proposal,
  isPublicView = false,
  showSignature = true,
  onBack,
  className = '',
}) {
  if (!proposal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  // Normalize field names (API returns camelCase, some places have snake_case)
  const totalAmount = proposal.totalAmount || (proposal.total_amount ? parseFloat(proposal.total_amount) : null)
  const sectionsJson = proposal.sectionsJson || proposal.sections_json
  const rawTimeline = proposal.timeline || '6-weeks'
  const rawPaymentTerms = proposal.paymentTerms || proposal.payment_terms || '50-50'

  // Deposit info
  const depositPercentage = proposal.depositPercentage || proposal.deposit_percentage || 50
  const depositAmount = proposal.depositAmount || proposal.deposit_amount || (totalAmount * depositPercentage / 100)
  const depositPaidAt = proposal.depositPaidAt || proposal.deposit_paid_at

  // Parse timeline into readable format
  const formatTimeline = (value) => {
    if (!value) return '6 weeks'
    const match = value.match(/^(\d+)-?weeks?$/i)
    if (match) {
      const num = parseInt(match[1])
      return num === 1 ? '1 week' : `${num} weeks`
    }
    const monthMatch = value.match(/^(\d+)-?months?$/i)
    if (monthMatch) {
      const num = parseInt(monthMatch[1])
      return num === 1 ? '1 month' : `${num} months`
    }
    if (value.toLowerCase() === 'ongoing') return 'Ongoing'
    return value.replace(/-/g, ' ')
  }

  const timeline = formatTimeline(rawTimeline)

  const clientEmail =
    proposal.contact?.email ||
    proposal.recipient_email ||
    proposal.recipientEmail ||
    null
  const clientSignedAtNorm =
    proposal.clientSignedAt || proposal.client_signed_at || proposal.signedAt || proposal.signed_at
  const clientSignatureNorm =
    proposal.clientSignatureUrl ||
    proposal.client_signature_url ||
    proposal.clientSignature ||
    proposal.client_signature

  const hasContent = Array.isArray(sectionsJson) && sectionsJson.length > 0
  const isGenerating = !hasContent && proposal.status === 'draft'

  if (isGenerating) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Generating Your Proposal...
            </h3>
            <p className="text-[var(--text-secondary)]">
              Our AI is crafting a high-converting proposal. This usually takes 30-60 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasContent) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No Content Yet
            </h3>
            <p className="text-[var(--text-secondary)]">
              This proposal doesn't have any content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Back Button - only show when onBack is provided (internal views) */}
      {onBack && (
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Proposals
          </Button>
        </div>
      )}

      {/* Content — JSON sections via ProposalBlockRegistry */}
      <div className="mb-8">
        <ProposalJSONContent sectionsJson={sectionsJson} proposal={proposal} />
      </div>

      {/* Signature Section - for public client view */}
      {isPublicView && showSignature && (
        <>
          {/* Terms & Conditions - Only show if not yet signed */}
          {!['signed', 'accepted'].includes(proposal.status) && (
            <ProposalTerms
              proposalTitle={proposal.title}
              depositPercentage={depositPercentage}
              timeline={timeline}
            />
          )}

          {/* Signature — component handles its own glass styling */}
          <ProposalSignature
            proposalId={proposal.id}
            proposalSlug={proposal.slug}
            proposalTitle={proposal.title}
            clientName={proposal.contact?.name || proposal.recipient_name || proposal.recipientName}
            clientEmail={clientEmail}
            clientSignature={clientSignatureNorm}
            clientSignedBy={proposal.clientSignedBy || proposal.client_signed_by}
            clientSignedAt={clientSignedAtNorm}
            status={proposal.status}
            depositPercentage={depositPercentage}
            depositAmount={depositAmount}
            totalAmount={totalAmount}
            depositPaidAt={depositPaidAt}
          />
        </>
      )}

      {/* Bottom padding */}
      <div className="pb-8" />
    </div>
  )
}
