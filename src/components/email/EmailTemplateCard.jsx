/**
 * EmailTemplateCard — Reusable template preview card with scaled iframe.
 * Used in: CampaignComposer (step 3), EmailTemplatesTab, TemplateGallery.
 *
 * Shows a live HTML preview (top-cropped at 600px email width) or a
 * gradient + icon fallback when no HTML exists.
 */

import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, FileText, Mail } from 'lucide-react'
import { templateGradients, templateCategories } from '@/components/email/utils/constants'

function getGradient(template) {
  return (
    templateGradients[template.system_type] ||
    templateGradients[template.category] ||
    templateGradients.default
  )
}

function getCategoryEmoji(category) {
  const cat = templateCategories.find((c) => c.value === category)
  return cat?.emoji || ''
}

/**
 * @param {object} props
 * @param {object} props.template - Template object with id, name, category, html
 * @param {boolean} [props.selected] - Whether this card is selected
 * @param {() => void} props.onClick - Click handler
 * @param {React.ReactNode} [props.footer] - Optional footer content (buttons, metadata)
 * @param {'compact' | 'default'} [props.size] - Card size variant
 */
export function EmailTemplateCard({ template, selected = false, onClick, footer, size = 'default' }) {
  const previewHeight = size === 'compact' ? 'h-28' : 'h-36'
  const iframeScale = size === 'compact' ? 0.25 : 0.3

  return (
    <GlassCard
      hover
      className={`cursor-pointer transition-all overflow-hidden ${
        selected
          ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
          : 'hover:border-[var(--text-tertiary)]'
      }`}
      onClick={onClick}
    >
      {/* Live HTML preview or gradient fallback */}
      <div className={`relative ${previewHeight} overflow-hidden bg-[var(--glass-bg-inset)] rounded-t-lg`}>
        {template.html ? (
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>html,body{margin:0;padding:0;pointer-events:none;overflow:hidden;background:#0a0a0a;width:100%;}</style></head><body>${template.html}</body></html>`}
              className="border-0 pointer-events-none absolute inset-0"
              style={{ height: '1200px', transformOrigin: 'top left', transform: `scale(${iframeScale})`, width: `${Math.round(100 / iframeScale)}%` }}
              tabIndex={-1}
              loading="lazy"
              title={template.name}
            />
          </div>
        ) : (
          <div className={`h-full bg-gradient-to-br ${getGradient(template)} flex items-center justify-center`}>
            <Mail className="h-8 w-8 text-white/80" />
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: 'var(--brand-primary)' }}>
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>

      <GlassCardContent className="p-3">
        {/* Name + category */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {getCategoryEmoji(template.category)} {template.name}
          </p>
          <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0 ml-2">
            {template.category || 'custom'}
          </Badge>
        </div>

        {/* Optional footer slot (edit button, dates, etc.) */}
        {footer}
      </GlassCardContent>
    </GlassCard>
  )
}

export default EmailTemplateCard
