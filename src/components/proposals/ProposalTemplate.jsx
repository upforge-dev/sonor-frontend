import ProposalView from './ProposalView'

/**
 * ProposalTemplate - Wrapper for public/client proposal views
 * Uses ProposalView for rendering.
 * For public view: view and time-on-page are tracked by ProposalGate (getBySlug + PATCH);
 * we do not call POST track-view here to avoid duplicate views and redundant load.
 */
const ProposalTemplate = ({ proposal, proposalId, proposalSlug, isPublicView = false, onBack }) => {
  // Track PDF download (no-op for public view; view/time handled by ProposalGate)
  const handleExportPDF = () => {}

  return (
    <ProposalView 
      proposal={proposal}
      isPublicView={isPublicView}
      onBack={onBack}
      onExportPDF={handleExportPDF}
    />
  )
}

export default ProposalTemplate
