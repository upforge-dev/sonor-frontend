import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Loader2, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'

const STRATEGY_TIERS = [
  { value: 'thoughtful', label: 'Thoughtful — low volume, high personalization' },
  { value: 'standard', label: 'Standard — default pace' },
  { value: 'high_volume', label: 'High volume — more sends, less depth' },
  { value: 'ultra_targeted', label: 'Ultra-targeted — lowest volume, highest intent' },
]

const WEEKDAYS = [
  { key: '0', label: 'Sun' },
  { key: '1', label: 'Mon' },
  { key: '2', label: 'Tue' },
  { key: '3', label: 'Wed' },
  { key: '4', label: 'Thu' },
  { key: '5', label: 'Fri' },
  { key: '6', label: 'Sat' },
]

const EMPTY_MAILBOX = {
  domain_id: '',
  narrative_id: null,
  email_address: '',
  display_name: '',
  strategy_tier: 'standard',
  daily_target: 20,
  daily_variance_pct: 0.15,
  window_start_local: '08:00:00',
  window_end_local: '17:30:00',
  timezone: 'America/New_York',
  min_gap_min: 3,
  max_gap_min: 8,
  pause_windows: [{ start: '12:00', end: '13:00', label: 'lunch' }],
  weekday_multiplier: { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 0.8, 6: 0 },
}

function TimeInput({ value, onChange, ...props }) {
  // value is 'HH:MM:SS' or 'HH:MM'
  const hhmm = (value || '').slice(0, 5)
  return (
    <Input
      type="time"
      value={hhmm}
      onChange={(e) => {
        const v = e.target.value
        onChange(v ? `${v}:00` : '')
      }}
      {...props}
    />
  )
}

function PauseWindowEditor({ value = [], onChange }) {
  const [draftStart, setDraftStart] = useState('12:00')
  const [draftEnd, setDraftEnd] = useState('13:00')
  const [draftLabel, setDraftLabel] = useState('lunch')

  const add = () => {
    if (!draftStart || !draftEnd) return
    onChange([...value, { start: draftStart, end: draftEnd, label: draftLabel }])
  }
  const remove = (idx) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {value.length === 0 && (
          <p className="text-[11px] text-[var(--text-tertiary)]">No pause windows.</p>
        )}
        {value.map((pw, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-2 py-1"
          >
            <span className="font-mono text-[var(--text-primary)]">
              {pw.start}–{pw.end}
            </span>
            {pw.label && (
              <span className="text-[var(--text-tertiary)]">({pw.label})</span>
            )}
            <button
              type="button"
              className="ml-auto text-[var(--text-tertiary)] hover:text-red-500"
              onClick={() => remove(idx)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-1.5 items-center">
        <Input
          type="time"
          value={draftStart}
          onChange={(e) => setDraftStart(e.target.value)}
          className="text-xs"
        />
        <Input
          type="time"
          value={draftEnd}
          onChange={(e) => setDraftEnd(e.target.value)}
          className="text-xs"
        />
        <Input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          placeholder="label"
          className="text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function WeekdayMultiplierEditor({ value = {}, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-2">
      {WEEKDAYS.map(({ key, label }) => {
        const v = typeof value[key] === 'number' ? value[key] : 0
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Label className="text-[var(--text-secondary)]">{label}</Label>
              <span className="font-mono text-[var(--text-tertiary)] tabular-nums">
                {v.toFixed(2)}×
              </span>
            </div>
            <Slider
              value={[v]}
              min={0}
              max={1.5}
              step={0.1}
              onValueChange={([next]) => set(key, next)}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function MailboxEditor({ mailbox, onSaved, onCancelled }) {
  const isNew = !mailbox?.id
  const [form, setForm] = useState(() => (mailbox ? { ...EMPTY_MAILBOX, ...mailbox } : EMPTY_MAILBOX))
  const [saving, setSaving] = useState(false)
  const [domains, setDomains] = useState([])
  const [narratives, setNarratives] = useState([])
  const [domainsLoading, setDomainsLoading] = useState(true)

  useEffect(() => {
    setForm(mailbox ? { ...EMPTY_MAILBOX, ...mailbox } : EMPTY_MAILBOX)
  }, [mailbox?.id])

  useEffect(() => {
    const load = async () => {
      setDomainsLoading(true)
      try {
        const [domainsRes, narrativesRes] = await Promise.all([
          outreachApi.listDomains(),
          outreachApi.listNarratives(),
        ])
        setDomains(domainsRes.data || [])
        setNarratives(narrativesRes.data || [])
      } catch (err) {
        toast.error('Failed to load domains/narratives')
      } finally {
        setDomainsLoading(false)
      }
    }
    load()
  }, [])

  const selectedDomain = useMemo(
    () => domains.find((d) => d.id === form.domain_id),
    [domains, form.domain_id],
  )

  const suggestedNarrative = useMemo(() => {
    if (!selectedDomain) return null
    return narratives.find(
      (n) =>
        n.domain_hint &&
        String(n.domain_hint).toLowerCase() === String(selectedDomain.domain).toLowerCase(),
    )
  }, [selectedDomain, narratives])

  // If the user picks a domain and there's a matching narrative, auto-select it
  useEffect(() => {
    if (isNew && selectedDomain && suggestedNarrative && !form.narrative_id) {
      setForm((f) => ({ ...f, narrative_id: suggestedNarrative.id }))
    }
  }, [selectedDomain?.id, suggestedNarrative?.id])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.display_name?.trim()) return toast.error('Display name is required')
    if (!form.email_address?.trim()) return toast.error('Email address is required')
    if (isNew && !form.domain_id) return toast.error('Choose a sending domain')
    if (form.max_gap_min < form.min_gap_min) {
      return toast.error('Max gap must be >= min gap')
    }

    setSaving(true)
    try {
      const payload = {
        domain_id: form.domain_id,
        narrative_id: form.narrative_id || null,
        email_address: form.email_address.trim(),
        display_name: form.display_name.trim(),
        strategy_tier: form.strategy_tier,
        daily_target: Number(form.daily_target) || 0,
        daily_variance_pct: Number(form.daily_variance_pct) || 0,
        window_start_local: form.window_start_local,
        window_end_local: form.window_end_local,
        timezone: form.timezone,
        min_gap_min: Number(form.min_gap_min) || 1,
        max_gap_min: Number(form.max_gap_min) || 1,
        pause_windows: form.pause_windows,
        weekday_multiplier: form.weekday_multiplier,
      }

      if (isNew) {
        await outreachApi.createMailbox(payload)
        toast.success('Mailbox created')
      } else {
        await outreachApi.updateMailbox(mailbox.id, payload)
        toast.success('Mailbox saved')
      }
      onSaved?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>
          {isNew ? 'New mailbox' : form.display_name || form.email_address}
        </GlassCardTitle>
        <GlassCardDescription>
          {isNew
            ? 'Define a sending identity. Each mailbox is one SDR persona with its own schedule.'
            : 'Adjust the mailbox schedule profile and narrative assignment.'}
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent className="space-y-6">
        {/* Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input
              value={form.display_name}
              onChange={(e) => set('display_name', e.target.value)}
              placeholder="Ryan @ Upforge Labs"
            />
          </div>
          <div className="space-y-2">
            <Label>Email address</Label>
            <Input
              type="email"
              value={form.email_address}
              onChange={(e) => set('email_address', e.target.value)}
              placeholder="ryan@upforgelabs.com"
              disabled={!isNew}
            />
            {!isNew && (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Email address is immutable after creation — create a new mailbox to change it.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sending domain</Label>
            <Select
              value={form.domain_id || undefined}
              onValueChange={(v) => set('domain_id', v)}
              disabled={!isNew || domainsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a sending domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDomain?.status && (
              <p className="text-[11px] text-[var(--text-tertiary)] capitalize">
                Domain status: {selectedDomain.status}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Narrative</Label>
            <Select
              value={form.narrative_id || 'none'}
              onValueChange={(v) => set('narrative_id', v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a narrative" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No narrative (generic template)</SelectItem>
                {narratives.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                    {n.domain_hint ? ` — ${n.domain_hint}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schedule profile */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Schedule profile</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Strategy tier</Label>
              <Select
                value={form.strategy_tier}
                onValueChange={(v) => set('strategy_tier', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                placeholder="America/New_York"
              />
              <p className="text-[11px] text-[var(--text-tertiary)]">
                IANA timezone name. Examples: America/New_York, America/Chicago, America/Los_Angeles.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Daily target</Label>
              <Input
                type="number"
                min="0"
                value={form.daily_target}
                onChange={(e) => set('daily_target', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Variance</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={form.daily_variance_pct}
                onChange={(e) => set('daily_variance_pct', e.target.value)}
              />
              <p className="text-[10px] text-[var(--text-tertiary)]">0..1 (e.g. 0.15 = ±15%)</p>
            </div>
            <div className="space-y-2">
              <Label>Min gap (min)</Label>
              <Input
                type="number"
                min="1"
                value={form.min_gap_min}
                onChange={(e) => set('min_gap_min', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max gap (min)</Label>
              <Input
                type="number"
                min="1"
                value={form.max_gap_min}
                onChange={(e) => set('max_gap_min', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Window start (local)</Label>
              <TimeInput
                value={form.window_start_local}
                onChange={(v) => set('window_start_local', v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Window end (local)</Label>
              <TimeInput
                value={form.window_end_local}
                onChange={(v) => set('window_end_local', v)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pause windows</Label>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Times of day the mailbox should not send (e.g. lunch).
            </p>
            <PauseWindowEditor
              value={form.pause_windows}
              onChange={(v) => set('pause_windows', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Weekday multiplier</Label>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Scale the daily target per weekday. 0× = no sends, 1× = full target, 1.5× = extra push.
            </p>
            <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              <WeekdayMultiplierEditor
                value={form.weekday_multiplier}
                onChange={(v) => set('weekday_multiplier', v)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--glass-border)]">
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
      </GlassCardContent>
    </GlassCard>
  )
}
