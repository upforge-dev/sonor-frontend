// src/components/proposals/ProposalEditorMain.jsx
/**
 * Proposal Editor Main - Main content area when editing a proposal with AI sidebar
 * Shows proposal preview + top bar (back, title, save, preview).
 * Renders in ModuleLayout content; AI panel goes in rightSidebar.
 */
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, BarChart2, Loader2, Save } from 'lucide-react'
import ProposalView from './ProposalView'
import { cn } from '@/lib/utils'

export default function ProposalEditorMain({
  contract,
  hasUnsavedChanges,
  hasBeenViewed,
  showAnalytics,
  onToggleAnalytics,
  onBack,
  onSave,
  isSaving,
}) {
  if (!contract) return null

  return (
    <div className="flex flex-col min-h-0">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-[var(--surface-primary)]/95 backdrop-blur border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[var(--border-primary)]" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-1">
                  {contract.title || 'Untitled'}
                </h1>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200">
                    Unsaved
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                {(contract.recipient_name || contract.contact?.name) && (
                  <span>{contract.recipient_name || contract.contact?.name}</span>
                )}
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {contract.status || 'draft'}
                </Badge>
                {(contract.total_amount || contract.totalAmount) && (
                  <>
                    <span>•</span>
                    <span className="font-medium">
                      $
                      {parseFloat(
                        contract.total_amount || contract.totalAmount || 0
                      ).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasBeenViewed && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleAnalytics}
                className={cn(showAnalytics && 'bg-purple-500/10 border-purple-500')}
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                {showAnalytics ? 'Hide' : 'Show'} Analytics
              </Button>
            )}

            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            )}

            {contract.slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/p/${contract.slug}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <ProposalView
            proposal={{
              ...contract,
              totalAmount: contract.totalAmount || contract.total_amount,
            }}
            isPublicView={false}
            showSignature={false}
          />
        </div>
      </div>
    </div>
  )
}
