import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { X, Plus, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'

/**
 * ChipInput — array-of-strings editor rendered as deletable chips with an
 * inline text input that appends on Enter. Used for hook_types, example_angles,
 * forbidden_phrases, avoid_tone, value_prop_bullets.
 */
function ChipInput({ value = [], onChange, placeholder, multiline = false }) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChange([...value, trimmed])
    setDraft('')
  }

  const remove = (idx) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)]"
          >
            <span className="max-w-[32rem] break-words">{item}</span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-start gap-2">
        {multiline ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                commit()
              }
            }}
          />
        ) : (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
            }}
          />
        )}
        <Button type="button" variant="outline" size="sm" onClick={commit}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * ToneSliders — JSONB tone_profile editor. Known tone keys get sliders;
 * custom keys can be added via free-text. Values clamped to [0, 1].
 */
const KNOWN_TONE_KEYS = [
  'casual',
  'formal',
  'direct',
  'technical',
  'professional',
  'confident',
  'familiar',
  'human',
  'solution_oriented',
  'structured',
  'urgency',
  'local_references',
]

function ToneSliders({ value = {}, onChange }) {
  const setTone = (key, num) => {
    onChange({ ...value, [key]: num })
  }

  const removeTone = (key) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const allKeys = Array.from(
    new Set([...KNOWN_TONE_KEYS, ...Object.keys(value)]),
  )

  return (
    <div className="space-y-3">
      {allKeys.map((key) => {
        const v = typeof value[key] === 'number' ? value[key] : 0
        const isActive = key in value
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Label className="capitalize text-[var(--text-secondary)]">
                {key.replace(/_/g, ' ')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--text-tertiary)] tabular-nums">
                  {isActive ? v.toFixed(2) : '—'}
                </span>
                {isActive && (
                  <button
                    type="button"
                    onClick={() => removeTone(key)}
                    className="text-[var(--text-tertiary)] hover:text-red-500"
                    aria-label="Remove tone key"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <Slider
              value={[isActive ? v : 0]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([next]) => setTone(key, next)}
            />
          </div>
        )
      })}
    </div>
  )
}

const EMPTY_NARRATIVE = {
  name: '',
  domain_hint: '',
  positioning_statement: '',
  target_icp_description: '',
  tone_profile: {},
  hook_types: [],
  example_angles: [],
  forbidden_phrases: [],
  avoid_tone: [],
  value_prop_bullets: [],
  enabled: true,
}

export default function NarrativeEditor({ narrative, onSaved, onCancelled, onDeleted }) {
  const isNew = !narrative?.id
  const [form, setForm] = useState(() => (narrative ? { ...EMPTY_NARRATIVE, ...narrative } : EMPTY_NARRATIVE))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm(narrative ? { ...EMPTY_NARRATIVE, ...narrative } : EMPTY_NARRATIVE)
  }, [narrative?.id])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Narrative name is required')
      return
    }
    if (!form.positioning_statement.trim()) {
      toast.error('Positioning statement is required')
      return
    }
    if (!form.target_icp_description.trim()) {
      toast.error('Target ICP description is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        domain_hint: form.domain_hint.trim() || null,
        positioning_statement: form.positioning_statement.trim(),
        target_icp_description: form.target_icp_description.trim(),
        tone_profile: form.tone_profile,
        hook_types: form.hook_types,
        example_angles: form.example_angles,
        forbidden_phrases: form.forbidden_phrases,
        avoid_tone: form.avoid_tone,
        value_prop_bullets: form.value_prop_bullets,
        enabled: form.enabled,
      }

      const res = isNew
        ? await outreachApi.createNarrative(payload)
        : await outreachApi.updateNarrative(narrative.id, payload)

      toast.success(isNew ? 'Narrative created' : 'Narrative saved')
      onSaved?.(res.data)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Save failed'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isNew) return
    if (!window.confirm(`Delete narrative "${form.name}"? This cannot be undone.`)) return

    setDeleting(true)
    try {
      await outreachApi.deleteNarrative(narrative.id)
      toast.success('Narrative deleted')
      onDeleted?.(narrative.id)
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Delete failed'
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <GlassCardTitle>
              {isNew ? 'New narrative' : form.name || 'Untitled narrative'}
            </GlassCardTitle>
            <GlassCardDescription>
              {isNew
                ? 'Define a sender persona: positioning, ICP, tone, and the hook library that conditions AI email generation.'
                : form.domain_hint || 'Narrative details'}
            </GlassCardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set('enabled', v)}
              aria-label="Enabled"
            />
            <span className="text-xs text-[var(--text-secondary)]">Enabled</span>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-6">
        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Local insider (Cincy)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain_hint">Domain hint</Label>
            <Input
              id="domain_hint"
              value={form.domain_hint || ''}
              onChange={(e) => set('domain_hint', e.target.value)}
              placeholder="upforgecincy.com"
            />
            <p className="text-[11px] text-[var(--text-tertiary)]">
              The sender domain this narrative is associated with. Mailboxes on this domain inherit
              the narrative by default.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="positioning">Positioning statement</Label>
          <Textarea
            id="positioning"
            value={form.positioning_statement}
            onChange={(e) => set('positioning_statement', e.target.value)}
            placeholder="I'm local, I see what's happening in your market, and you're leaving money on the table."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="icp">Target ICP description</Label>
          <Textarea
            id="icp"
            value={form.target_icp_description}
            onChange={(e) => set('target_icp_description', e.target.value)}
            placeholder="Cincinnati / NKY owner-operated businesses — dentists, law firms, contractors, med spas..."
            rows={3}
          />
        </div>

        {/* Tone sliders */}
        <div className="space-y-2">
          <Label>Tone profile</Label>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            How the AI should sound when generating emails for this narrative. Values from 0 (none)
            to 1 (strong).
          </p>
          <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <ToneSliders
              value={form.tone_profile}
              onChange={(v) => set('tone_profile', v)}
            />
          </div>
        </div>

        {/* Array chip inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Hook types</Label>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Short slugs naming the kinds of hooks this narrative can use.
            </p>
            <ChipInput
              value={form.hook_types}
              onChange={(v) => set('hook_types', v)}
              placeholder="outranked_by_competitor"
            />
          </div>

          <div className="space-y-2">
            <Label>Forbidden phrases</Label>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Phrases the AI must never use in this narrative.
            </p>
            <ChipInput
              value={form.forbidden_phrases}
              onChange={(v) => set('forbidden_phrases', v)}
              placeholder="we build websites"
            />
          </div>

          <div className="space-y-2">
            <Label>Avoid tone</Label>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Tone qualities to actively avoid.
            </p>
            <ChipInput
              value={form.avoid_tone}
              onChange={(v) => set('avoid_tone', v)}
              placeholder="corporate"
            />
          </div>

          <div className="space-y-2">
            <Label>Value-prop bullets</Label>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              What this narrative sells, in short bullets.
            </p>
            <ChipInput
              value={form.value_prop_bullets}
              onChange={(v) => set('value_prop_bullets', v)}
              placeholder="More local leads"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Example angles</Label>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Concrete opening lines the AI can model from. Use Cmd/Ctrl+Enter to add.
          </p>
          <ChipInput
            value={form.example_angles}
            onChange={(v) => set('example_angles', v)}
            placeholder="Saw you guys in Covington — quick thing I noticed..."
            multiline
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
          <div>
            {!isNew && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 hover:text-red-700 border-red-500/20 hover:border-red-500/40"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onCancelled}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> {isNew ? 'Create' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
