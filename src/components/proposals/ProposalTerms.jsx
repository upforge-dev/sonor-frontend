import { FileText, Scale, Clock, Shield, AlertCircle } from 'lucide-react'

export default function ProposalTerms({ proposalTitle, depositPercentage = 50, timeline }) {
  return (
    <div id="terms" className="scroll-mt-24 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden">
      <div className="bg-[var(--surface-page-secondary)] p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[var(--text-secondary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Terms & Conditions</h3>
        </div>
      </div>
      
      <div className="p-6 space-y-6 text-sm text-[var(--text-secondary)]">
        {/* Agreement */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
            Agreement
          </h4>
          <p className="leading-relaxed">
            By signing this proposal, you ("Client") agree to engage Upforge LLC ("Company") 
            to provide the services described herein. This document, once signed, constitutes a 
            legally binding agreement between both parties.
          </p>
        </section>

        {/* Payment Terms */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
            Payment Terms
          </h4>
          <ul className="list-disc list-inside space-y-1 leading-relaxed">
            <li>
              A deposit of <strong>{depositPercentage}%</strong> of the total project cost is due 
              upon signing this agreement before work commences.
            </li>
            {depositPercentage < 100 && (
              <li>
                The remaining balance ({100 - depositPercentage}%) is due upon project completion 
                and final deliverable handoff.
              </li>
            )}
            <li>
              All payments are processed securely via Square. Invoices are payable within 14 days 
              of receipt.
            </li>
            <li>
              Late payments may incur a fee of 1.5% per month on the outstanding balance.
            </li>
          </ul>
        </section>

        {/* Scope & Timeline */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--brand-primary)]" />
            Scope & Timeline
          </h4>
          <ul className="list-disc list-inside space-y-1 leading-relaxed">
            <li>
              The scope of work is limited to the services explicitly described in this proposal. 
              Additional requests may require a change order.
            </li>
            {timeline && (
              <li>
                Estimated project timeline: <strong>{timeline}</strong>. This timeline begins after 
                deposit payment and receipt of all required client materials.
              </li>
            )}
            <li>
              Client is responsible for providing requested content, assets, and feedback within 
              5 business days to maintain project timeline.
            </li>
            <li>
              Project timelines may be extended due to delays in client feedback or content delivery.
            </li>
          </ul>
        </section>

        {/* Revisions & Approvals */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2">Revisions & Approvals</h4>
          <ul className="list-disc list-inside space-y-1 leading-relaxed">
            <li>
              Two rounds of revisions are included for each deliverable unless otherwise specified.
            </li>
            <li>
              Additional revisions beyond the included rounds will be billed at our standard hourly rate.
            </li>
            <li>
              Final approval is required within 7 days of deliverable presentation. Silence will be 
              considered approval.
            </li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--brand-primary)]" />
            Intellectual Property
          </h4>
          <ul className="list-disc list-inside space-y-1 leading-relaxed">
            <li>
              Upon full payment, Client receives full ownership and rights to all custom deliverables 
              created specifically for this project.
            </li>
            <li>
              Company retains the right to display completed work in portfolio and marketing materials 
              unless otherwise agreed in writing.
            </li>
            <li>
              Third-party assets (stock images, fonts, plugins) remain subject to their respective licenses.
            </li>
          </ul>
        </section>

        {/* Cancellation */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--accent-orange)]" />
            Cancellation Policy
          </h4>
          <ul className="list-disc list-inside space-y-1 leading-relaxed">
            <li>
              Either party may terminate this agreement with 14 days written notice.
            </li>
            <li>
              Upon cancellation, Client is responsible for payment of all work completed to date.
            </li>
            <li>
              Deposits are non-refundable once work has commenced.
            </li>
          </ul>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h4 className="font-semibold text-[var(--text-primary)] mb-2">Limitation of Liability</h4>
          <p className="leading-relaxed">
            Company's total liability under this agreement shall not exceed the total fees paid by 
            Client. Company is not liable for any indirect, incidental, or consequential damages 
            arising from the use of deliverables.
          </p>
        </section>

        {/* Electronic Signature */}
        <section className="bg-[var(--glass-bg-inset)] rounded-lg p-4 border border-[var(--glass-border)]">
          <h4 className="font-semibold text-[var(--text-primary)] mb-2">Electronic Signature Consent</h4>
          <p className="leading-relaxed text-xs">
            By signing below, you consent to the use of electronic signatures and agree that your 
            electronic signature is the legal equivalent of your manual signature. This agreement 
            is governed by the laws of the State of Texas. Electronic signatures are legally binding 
            under the Electronic Signatures in Global and National Commerce Act (ESIGN) and the 
            Uniform Electronic Transactions Act (UETA).
          </p>
        </section>
      </div>
    </div>
  )
}
