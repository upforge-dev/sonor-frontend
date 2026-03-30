import { FileText, Scale, Clock, Shield, AlertCircle, DollarSign } from 'lucide-react'

const liquidGlassBase = `
  relative
  bg-gradient-to-br from-white/10 to-white/5
  backdrop-blur-xl
  border border-white/20
  shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)]
  rounded-3xl
`

function TermsSection({ icon: Icon, iconColor = 'text-[#39bfb0]', title, children }) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {title}
      </h4>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

export default function ProposalTerms({ proposalTitle, depositPercentage = 50, timeline }) {
  return (
    <div id="terms" className={`${liquidGlassBase} p-8 md:p-10 my-10 scroll-mt-24`}>
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Scale className="w-6 h-6 text-[#39bfb0]" />
          </div>
          <div>
            <span className="text-sm uppercase tracking-widest text-[#39bfb0] block">Legal</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Terms & Conditions</h2>
          </div>
        </div>

        <div className="space-y-4">
          <TermsSection icon={FileText} title="Agreement">
            <p>
              By signing this proposal, you ("Client") agree to engage Upforge LLC ("Company")
              to provide the services described herein. This document, once signed, constitutes a
              legally binding agreement between both parties.
            </p>
          </TermsSection>

          <TermsSection icon={DollarSign} title="Payment Terms">
            <ul className="list-disc list-inside space-y-1">
              <li>
                A deposit of <strong className="text-[var(--text-primary)]">{depositPercentage}%</strong> of the total project cost is due
                upon signing before work commences.
              </li>
              {depositPercentage < 100 && (
                <li>
                  The remaining balance ({100 - depositPercentage}%) is due upon project completion
                  and final deliverable handoff.
                </li>
              )}
              <li>
                All payments are processed securely via Square. Invoices are payable within 14 days.
              </li>
              <li>
                Late payments may incur a fee of 1.5% per month on the outstanding balance.
              </li>
            </ul>
          </TermsSection>

          <TermsSection icon={Clock} title="Scope & Timeline">
            <ul className="list-disc list-inside space-y-1">
              <li>
                The scope of work is limited to the services explicitly described in this proposal.
                Additional requests may require a change order.
              </li>
              {timeline && (
                <li>
                  Estimated project timeline: <strong className="text-[var(--text-primary)]">{timeline}</strong>. Begins after
                  deposit payment and receipt of all required client materials.
                </li>
              )}
              <li>
                Client is responsible for providing requested content, assets, and feedback within
                5 business days to maintain project timeline.
              </li>
            </ul>
          </TermsSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TermsSection icon={Shield} title="Intellectual Property">
              <ul className="list-disc list-inside space-y-1">
                <li>Upon full payment, Client receives full ownership of all custom deliverables.</li>
                <li>Company retains the right to display completed work in portfolio materials.</li>
                <li>Third-party assets remain subject to their respective licenses.</li>
              </ul>
            </TermsSection>

            <TermsSection icon={AlertCircle} iconColor="text-amber-400" title="Cancellation Policy">
              <ul className="list-disc list-inside space-y-1">
                <li>Either party may terminate with 14 days written notice.</li>
                <li>Client is responsible for payment of all work completed to date.</li>
                <li>Deposits are non-refundable once work has commenced.</li>
              </ul>
            </TermsSection>
          </div>

          {/* Electronic Signature Consent */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              <strong className="text-[var(--text-secondary)]">Electronic Signature Consent:</strong>{' '}
              By signing below, you consent to electronic signatures and agree they are the legal
              equivalent of manual signatures. This agreement is governed by the laws of the State
              of Texas. Electronic signatures are legally binding under the ESIGN Act and UETA.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
