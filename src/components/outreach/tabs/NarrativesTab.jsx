import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, MessageSquareText, Lock, Sparkles, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import { OutreachLoading, OutreachEmptyState, OutreachStatusBadge } from '@/components/outreach/ui'
import NarrativeEditor from './NarrativeEditor'

export default function NarrativesTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [narratives, setNarratives] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)

  // M6 template picker
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templateCategories, setTemplateCategories] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [templateOverrideName, setTemplateOverrideName] = useState('')
  const [templateOverrideDomain, setTemplateOverrideDomain] = useState('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  const fetchNarratives = useCallback(async () => {
    setLoading(true)
    try {
      const res = await outreachApi.listNarratives()
      setNarratives(res.data || [])
    } catch (err) {
      // If the user doesn't have full_signal the backend will return 403; we
      // handle the gate below so swallow the toast in that case.
      if (err?.response?.status !== 403) {
        toast.error('Failed to load narratives')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasFullSignal) fetchNarratives()
    else setLoading(false)
  }, [hasFullSignal, fetchNarratives])

  const openTemplatePicker = async () => {
    setTemplatePickerOpen(true)
    setSelectedTemplateId(null)
    setTemplateOverrideName('')
    setTemplateOverrideDomain('')
    if (templates.length > 0) return
    setTemplatesLoading(true)
    try {
      const res = await outreachApi.listNarrativeTemplates()
      setTemplates(res.data?.templates || [])
      setTemplateCategories(res.data?.categories || [])
    } catch (err) {
      toast.error('Failed to load narrative templates')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId],
  )

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return
    setApplyingTemplate(true)
    try {
      const overrides = {}
      if (templateOverrideName.trim()) overrides.name = templateOverrideName.trim()
      if (templateOverrideDomain.trim()) overrides.domain_hint = templateOverrideDomain.trim()
      const res = await outreachApi.createNarrativeFromTemplate(
        selectedTemplateId,
        Object.keys(overrides).length > 0 ? overrides : undefined,
      )
      toast.success(`Created narrative "${res.data?.name || 'New narrative'}"`)
      setTemplatePickerOpen(false)
      setSelectedId(res.data?.id || null)
      await fetchNarratives()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create narrative from template')
    } finally {
      setApplyingTemplate(false)
    }
  }

  const selected = useMemo(
    () => narratives.find((n) => n.id === selectedId) || null,
    [narratives, selectedId],
  )

  // ─── Plan gate ────────────────────────────────────────────────────────
  if (!hasFullSignal) {
    return (
      <div className="p-6">
        <GlassCard>
          <GlassCardContent className="flex flex-col items-center text-center py-16 px-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Narratives require Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Narratives define the sender personas used to condition AI email generation across
              your cold outreach mailboxes. Upgrade to Full Signal AI to unlock them.
            </p>
            {upgradeLabel && upgradePath && (
              <Button asChild>
                <a href={upgradePath}>{upgradeLabel}</a>
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  if (loading) return <OutreachLoading label="Loading narratives" />

  // ─── Editor view (edit existing or create new) ────────────────────────
  if (creating || selected) {
    return (
      <div className="p-6">
        <NarrativeEditor
          narrative={creating ? null : selected}
          onSaved={(saved) => {
            setCreating(false)
            setSelectedId(saved?.id || null)
            fetchNarratives()
          }}
          onCancelled={() => {
            setCreating(false)
            setSelectedId(null)
          }}
          onDeleted={() => {
            setCreating(false)
            setSelectedId(null)
            fetchNarratives()
          }}
        />
      </div>
    )
  }

  // ─── List view ────────────────────────────────────────────────────────
  if (narratives.length === 0) {
    return (
      <div className="p-6">
        <OutreachEmptyState
          icon={MessageSquareText}
          title="No narratives yet"
          description="A narrative is a sender persona — positioning, ICP, tone, and hook library — that steers how the AI writes cold outreach emails for a specific sending domain."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create narrative
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Narrative library
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {narratives.length} narrative{narratives.length === 1 ? '' : 's'} defined for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openTemplatePicker} size="sm" variant="outline">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> From template
          </Button>
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New narrative
          </Button>
        </div>
      </div>

      <TemplatePickerDialog
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        templates={templates}
        categories={templateCategories}
        templatesLoading={templatesLoading}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={setSelectedTemplateId}
        selectedTemplate={selectedTemplate}
        overrideName={templateOverrideName}
        onOverrideNameChange={setTemplateOverrideName}
        overrideDomain={templateOverrideDomain}
        onOverrideDomainChange={setTemplateOverrideDomain}
        applying={applyingTemplate}
        onApply={handleApplyTemplate}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {narratives.map((n) => (
          <GlassCard
            key={n.id}
            className="cursor-pointer hover:border-[var(--glass-border-strong)] transition-all"
            onClick={() => setSelectedId(n.id)}
          >
            <GlassCardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <GlassCardTitle className="truncate">{n.name}</GlassCardTitle>
                  {n.domain_hint && (
                    <GlassCardDescription className="truncate">
                      {n.domain_hint}
                    </GlassCardDescription>
                  )}
                </div>
                <OutreachStatusBadge status={n.enabled ? 'active' : 'paused'} />
              </div>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)] line-clamp-3 italic">
                "{n.positioning_statement}"
              </p>

              <div className="flex flex-wrap gap-1">
                {(n.hook_types || []).slice(0, 4).map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  >
                    {h}
                  </span>
                ))}
                {(n.hook_types || []).length > 4 && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    +{(n.hook_types || []).length - 4} more
                  </span>
                )}
              </div>

              {n.forbidden_phrases?.length > 0 && (
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  <span className="font-medium">Avoids: </span>
                  {n.forbidden_phrases.slice(0, 2).join(', ')}
                  {n.forbidden_phrases.length > 2 && '…'}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Template picker dialog (M6)
// ─────────────────────────────────────────────────────────────────────────

function TemplatePickerDialog({
  open,
  onOpenChange,
  templates,
  categories,
  templatesLoading,
  selectedTemplateId,
  onSelectTemplate,
  selectedTemplate,
  overrideName,
  onOverrideNameChange,
  overrideDomain,
  onOverrideDomainChange,
  applying,
  onApply,
}) {
  const byCategory = useMemo(() => {
    const m = new Map()
    for (const c of categories) m.set(c.id, [])
    for (const t of templates) {
      if (!m.has(t.category)) m.set(t.category, [])
      m.get(t.category).push(t)
    }
    return m
  }, [templates, categories])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Starter narrative library
          </DialogTitle>
          <DialogDescription>
            Pick a template that matches your business. Sonor clones it into a real narrative you
            can edit — positioning, tone, hook library, forbidden phrases, example angles, all
            pre-filled with sensible defaults.
          </DialogDescription>
        </DialogHeader>

        {templatesLoading ? (
          <div className="py-16 text-center text-[var(--text-secondary)] text-sm">
            Loading templates…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 min-h-0">
            {/* Category + template list */}
            <div className="md:col-span-2 overflow-y-auto pr-2 space-y-4">
              {categories.map((cat) => {
                const catTemplates = byCategory.get(cat.id) || []
                if (catTemplates.length === 0) return null
                return (
                  <div key={cat.id}>
                    <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1 font-semibold">
                      {cat.label}
                    </div>
                    <div className="space-y-1">
                      {catTemplates.map((t) => {
                        const isSelected = selectedTemplateId === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onSelectTemplate(t.id)}
                            className={`w-full text-left p-2 rounded-md border text-xs transition-all ${
                              isSelected
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--glass-border-strong)]'
                            }`}
                          >
                            <div className="font-medium text-[var(--text-primary)]">{t.name}</div>
                            <div className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">
                              {t.tagline}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Selected template preview */}
            <div className="md:col-span-3 overflow-y-auto pr-2 space-y-4">
              {!selectedTemplate ? (
                <div className="text-sm text-[var(--text-tertiary)] italic py-12 text-center">
                  Pick a template on the left to preview it.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {selectedTemplate.when_to_use}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide">
                      Positioning
                    </Label>
                    <p className="text-xs text-[var(--text-primary)] italic">
                      "{selectedTemplate.positioning_statement}"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide">Target ICP</Label>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {selectedTemplate.target_icp_description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide">Hook types</Label>
                    <div className="flex flex-wrap gap-1">
                      {(selectedTemplate.hook_types || []).map((h) => (
                        <span
                          key={h}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wide">
                      Example openings
                    </Label>
                    <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                      {(selectedTemplate.example_angles || []).slice(0, 3).map((a, i) => (
                        <li key={i} className="italic">
                          "{a}"
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedTemplate.forbidden_phrases?.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide">
                        Forbidden phrases
                      </Label>
                      <p className="text-[11px] text-[var(--text-tertiary)]">
                        {selectedTemplate.forbidden_phrases.slice(0, 4).join(', ')}
                        {selectedTemplate.forbidden_phrases.length > 4 && '…'}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-[var(--glass-border)] pt-3 space-y-3">
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Customize before creating (optional — you can edit everything after):
                    </p>
                    <div className="space-y-2">
                      <Label>Narrative name</Label>
                      <Input
                        placeholder={selectedTemplate.name}
                        value={overrideName}
                        onChange={(e) => onOverrideNameChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain hint (optional)</Label>
                      <Input
                        placeholder="e.g. upforgecincy.com"
                        value={overrideDomain}
                        onChange={(e) => onOverrideDomainChange(e.target.value)}
                      />
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        The sending domain this narrative will be assigned to. Mailboxes on that
                        domain auto-pick this narrative.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onApply} disabled={!selectedTemplateId || applying}>
            {applying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Create from template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
