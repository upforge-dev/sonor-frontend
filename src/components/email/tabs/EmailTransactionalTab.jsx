/**
 * EmailTransactionalTab - Transactional email template management with glass design
 * Code-split from EmailPlatform.jsx for better load performance
 *
 * UX improvements over original:
 * - Rewritten info banner clarifying Automations relationship
 * - "Used in X automations" badge per template card
 * - Gradient preview area at top of each card
 * - Always-visible Edit button (not hover-only)
 * - OutreachLoading / OutreachEmptyState for consistency
 * - CSS variables only, no hardcoded colors or text-muted-foreground
 */

import { useState, useEffect, useMemo } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { OutreachLoading, OutreachEmptyState } from '@/components/outreach/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Bell,
  Mail,
  Edit,
  Sparkles,
  Workflow,
  Info,
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { defaultTransactionalEmails, templateGradients } from '@/components/email/utils/constants'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTemplateGradient(template) {
  return (
    templateGradients[template.system_type] ||
    templateGradients[template.category] ||
    templateGradients.default
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmailTransactionalTab({ onEditTemplate }) {
  const { templates, templatesLoading, fetchTemplates } = useEmailPlatformStore()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Get transactional templates (category = 'transactional' OR is_system with transactional types)
  const transactionalTemplates = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.category === 'transactional' ||
          (t.is_system && ['form-confirmation', 'thank-you'].includes(t.system_type))
      ),
    [templates]
  )

  // If no saved transactional templates, fall back to default definitions
  const displayTemplates = useMemo(() => {
    if (transactionalTemplates.length > 0) return transactionalTemplates
    return defaultTransactionalEmails
  }, [transactionalTemplates])

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return displayTemplates
    const q = searchQuery.toLowerCase()
    return displayTemplates.filter((t) => t.name.toLowerCase().includes(q))
  }, [displayTemplates, searchQuery])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (templatesLoading) {
    return <OutreachLoading label="Loading transactional emails..." />
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-500" />
          Transactional Emails
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Automated emails triggered by form submissions, purchases, and other events
        </p>
      </div>

      {/* Info Banner */}
      <GlassCard className="border-amber-500/20">
        <GlassCardContent className="py-3 px-4 flex items-center gap-3">
          <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">
            These templates are used by your <strong className="text-[var(--text-primary)]">Automations</strong>.
            Design them here, then select them when building automation steps.
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <Input
          placeholder="Search transactional emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Templates */}
      {filteredTemplates.length === 0 && displayTemplates.length === 0 ? (
        <OutreachEmptyState
          icon={Workflow}
          title="No transactional emails yet"
          description="Transactional emails are created automatically when you set up automations like form confirmations. Head to the Automations tab to create one."
          action={
            <p className="text-xs text-[var(--text-tertiary)]">
              Default templates will appear here once your first automation is configured.
            </p>
          }
        />
      ) : filteredTemplates.length === 0 ? (
        <OutreachEmptyState
          icon={Search}
          title="No matches found"
          description="Try a different search term"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <GlassCard
              key={template.id}
              hover
              className="cursor-pointer group overflow-hidden"
              onClick={() => onEditTemplate(template)}
            >
              {/* Gradient preview area */}
              <div
                className={`h-24 bg-gradient-to-br ${getTemplateGradient(template)} flex items-center justify-center`}
              >
                <Mail className="h-10 w-10 text-white/80" />
              </div>

              <GlassCardContent className="p-4">
                {/* Name + badges */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">
                    {template.name}
                  </h3>
                  {template.is_system && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Default
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                  {template.description || 'No description'}
                </p>

                {/* Footer: automation usage + edit */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    {/* Automation count badge */}
                    {(template.automation_count != null && template.automation_count > 0) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                        <Workflow className="h-3 w-3" />
                        Used in {template.automation_count} automation{template.automation_count !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span>Used {template.use_count || 0} times</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditTemplate(template)
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
