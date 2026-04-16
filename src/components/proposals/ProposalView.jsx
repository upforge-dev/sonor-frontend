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
import { AddonSelectionProvider } from '../contracts/ContractBlocks'
import { useState, useCallback } from 'react'

// JSON sections renderer
function ProposalJSONContent({ sectionsJson, proposal, isPublicView, addonContext }) {
  const raw = Array.isArray(sectionsJson) ? sectionsJson : []
  const alreadySigned = !!(proposal?.client_signature_url || proposal?.signed_at)

  const sections = raw
    .flatMap(x => (Array.isArray(x) ? x : [x]))
    .map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
      const type = entry.type || entry.component || entry.name
      if (typeof type !== 'string' || !type.trim()) return null
      const props = entry.props || entry.props_map || entry.fields || {}
      return { type, props: typeof props === 'object' && !Array.isArray(props) ? props : {} }
    })
    .filter(Boolean)
    // On the public signing page for an unsigned contract, the interactive
    // ProposalSignature below handles the signature. The static
    // SignatureBlock is for the signed-PDF snapshot, not the live page.
    .filter(section => !(isPublicView && !alreadySigned && section.type === 'SignatureBlock'))

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

  const sectionsJson = proposal.sectionsJson || proposal.sections_json

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

  const docLabel = (proposal.doc_type || proposal.docType) === 'contract' ? 'Contract' : 'Proposal'
  const docLabelLower = docLabel.toLowerCase()
  const isContract = docLabel === 'Contract'
  const hasContent = Array.isArray(sectionsJson) && sectionsJson.length > 0
  const isGenerating = !hasContent && proposal.status === 'draft'

  // Addon selection state — provided at the ProposalView level so
  // AddonSelector / PricingTable / PaymentTerms / ProposalSignature all read
  // from the same source of truth. Changes here update totals live.
  const addonGroups = proposal.metadata?.addon_groups || []
  const baseForAddons = proposal.metadata?.base_price
    ?? (Number(proposal.total_amount) - (proposal.metadata?.addons_total || 0))
  const [liveAddons, setLiveAddons] = useState(null)
  const handleAddonChange = useCallback(payload => setLiveAddons(payload), [])

  if (isGenerating) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Generating Your {docLabel}...
            </h3>
            <p className="text-[var(--text-secondary)]">
              Our AI is drafting this {docLabelLower}. This usually takes 30-60 seconds.
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

  // Inject the project's brand color for the public view. Public routes don't
  // run through the authenticated brand theme loader, so --brand-primary
  // would otherwise fall back to Sonor green. Scoping via inline style keeps
  // this override localized to the proposal/contract view only.
  const brandPrimary = proposal.project?.brand_primary || proposal.organization?.brand_primary
  const brandStyle = brandPrimary
    ? { '--brand-primary': brandPrimary, '--brand-primary-hover': brandPrimary }
    : undefined

  return (
    <div className={`max-w-6xl mx-auto ${className}`} style={brandStyle}>
      {onBack && (
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Proposals
          </Button>
        </div>
      )}

      <AddonSelectionProvider
        groups={addonGroups}
        basePrice={baseForAddons}
        taxRate={Number(proposal.tax_rate_snapshot) || 0}
        onChange={handleAddonChange}
      >
        {/* Contracts read like a printed document — force a light "paper"
            surface so the text stays legible in both light and dark themes. */}
        <div className={isContract ? 'mb-8 contract-paper' : 'mb-8'}>
          {isContract ? (
            <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-6 md:p-10">
              <ProposalJSONContent sectionsJson={sectionsJson} proposal={proposal} isPublicView={isPublicView} />
            </div>
          ) : (
            <ProposalJSONContent sectionsJson={sectionsJson} proposal={proposal} isPublicView={isPublicView} />
          )}
        </div>

        {isPublicView && showSignature && (
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
            docType={proposal.doc_type || proposal.docType || 'proposal'}
            accessToken={proposal.access_token || proposal.accessToken}
            addonSelections={liveAddons}
          />
        )}
      </AddonSelectionProvider>

      <div className="pb-8" />
    </div>
  )
}
