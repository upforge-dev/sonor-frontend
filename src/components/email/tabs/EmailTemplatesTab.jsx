/**
 * EmailTemplatesTab - Template management with glass design system
 * Code-split from EmailPlatform.jsx for better load performance
 *
 * UX improvements over original:
 * - Clear section labels: "YOUR TEMPLATES" and "STARTER TEMPLATES"
 * - Always-visible Edit button on cards (not hover-only)
 * - Category emoji displayed on cards (from templateCategories config)
 * - Shows "Created" date in addition to "Updated" date
 * - Gallery dialog uses GlassCard styling
 * - OutreachLoading / OutreachEmptyState for consistency
 * - CSS variables only, no hardcoded colors or text-muted-foreground
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { OutreachLoading, OutreachEmptyState, OutreachSectionHeader } from '@/components/outreach/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Edit,
  Copy,
  Mail,
  Image,
  Layout,
  FileText,
  Sparkles,
} from 'lucide-react'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { templateGradients, templateCategories } from '@/components/email/utils/constants'
import { EmailTemplateCard } from '@/components/email/EmailTemplateCard'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTemplateGradient(template) {
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

function formatDate(dateStr) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmailTemplatesTab({
  onEditTemplate,
  onCreateTemplate,
  onOpenImageLibrary,
  onUseSystemTemplate,
}) {
  const {
    templates,
    templatesLoading,
    fetchTemplates,
    systemTemplates,
    systemTemplatesLoading,
    fetchSystemTemplates,
  } = useEmailPlatformStore()

  const [showStarterGallery, setShowStarterGallery] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchTemplates()
    fetchSystemTemplates()
  }, [fetchTemplates, fetchSystemTemplates])

  // Handle using a system template (creates copy with content)
  const handleUseSystemTemplate = useCallback(
    (template) => {
      setShowStarterGallery(false)
      if (onUseSystemTemplate) {
        onUseSystemTemplate(template)
      }
    },
    [onUseSystemTemplate]
  )

  // Filter out system and transactional templates from "Your Templates"
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (t.is_system) return false
      if (t.category === 'transactional') return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [templates, categoryFilter, searchQuery])

  const hasUserTemplates = useMemo(
    () => templates.some((t) => !t.is_system && t.category !== 'transactional'),
    [templates]
  )

  // ── Loading ───────────────────────────────────────────────────────────────

  if (templatesLoading) {
    return <OutreachLoading label="Loading templates..." />
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Templates</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Reusable email templates for campaigns and newsletters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onOpenImageLibrary} className="gap-2">
            <Image className="h-4 w-4" />
            Image Library
          </Button>
          <Button variant="outline" onClick={() => setShowStarterGallery(true)} className="gap-2">
            <Layout className="h-4 w-4" />
            Start from Template
          </Button>
          <Button onClick={onCreateTemplate} className="gap-2">
            <Plus className="h-4 w-4" />
            Blank Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {templateCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── YOUR TEMPLATES section ─────────────────────────────────────────── */}
      <OutreachSectionHeader icon={FileText} title="YOUR TEMPLATES" />

      {!hasUserTemplates ? (
        <div className="space-y-6">
          <OutreachEmptyState
            icon={FileText}
            title="No templates yet"
            description="Start with a pre-built template or create your own from scratch"
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowStarterGallery(true)} className="gap-2">
                  <Layout className="h-4 w-4" />
                  Browse Starters
                </Button>
                <Button onClick={onCreateTemplate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Blank
                </Button>
              </div>
            }
          />

          {/* Featured starters inline when empty */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <OutreachSectionHeader icon={Sparkles} title="STARTER TEMPLATES" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {systemTemplates.slice(0, 3).map((starter) => (
                  <StarterCard
                    key={starter.id}
                    template={starter}
                    onUse={handleUseSystemTemplate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <OutreachEmptyState
          icon={Search}
          title="No templates found"
          description="Try a different search or filter"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={onEditTemplate}
            />
          ))}
        </div>
      )}

      {/* ── Starter Gallery Dialog ─────────────────────────────────────────── */}
      <Dialog open={showStarterGallery} onOpenChange={setShowStarterGallery}>
        <DialogContent className="max-w-4xl bg-[var(--glass-bg-elevated)] backdrop-blur-[var(--blur-xl)] border-[var(--glass-border)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Start from a Template</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Choose a pre-built template to customize
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 py-4 max-h-[60vh] overflow-y-auto">
            {systemTemplatesLoading ? (
              <div className="col-span-3">
                <OutreachLoading label="Loading starter templates..." />
              </div>
            ) : systemTemplates.length === 0 ? (
              <div className="col-span-3">
                <OutreachEmptyState
                  icon={Layout}
                  title="No starter templates available"
                  description="Check back later for pre-built templates"
                />
              </div>
            ) : (
              systemTemplates.map((starter) => (
                <EmailTemplateCard
                  key={starter.id}
                  template={starter}
                  size="compact"
                  onClick={() => handleUseSystemTemplate(starter)}
                  footer={
                    <>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3 mt-1">
                        {starter.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:border-[var(--brand-primary)] transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Use Template
                      </Button>
                    </>
                  }
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Template Card (user-created) ───────────────────────────────────────────

function TemplateCard({ template, onEdit }) {
  return (
    <EmailTemplateCard
      template={template}
      onClick={() => onEdit(template)}
      footer={
        <>
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-3 mt-1">
            <span>Created {formatDate(template.created_at)}</span>
            <span>Used {template.use_count || 0} times</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(template)
            }}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Template
          </Button>
        </>
      }
    />
  )
}

// ─── Starter Card (system template, shown inline when empty) ────────────────

function StarterCard({ template, onUse }) {
  return (
    <EmailTemplateCard
      template={template}
      size="compact"
      onClick={() => onUse(template)}
      footer={
        <>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3 mt-1">
            {template.description}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:border-[var(--brand-primary)] transition-colors"
          >
            <Plus className="h-3 w-3" />
            Use Template
          </Button>
        </>
      }
    />
  )
}
