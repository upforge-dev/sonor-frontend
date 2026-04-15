import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Lock,
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  MapPin,
  Plus,
  X,
  Building,
  Share2,
  ShareOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import {
  OutreachLoading,
  OutreachEmptyState,
} from '@/components/outreach/ui'

const TYPE_LABELS = {
  csv_upload: 'CSV upload',
  places: 'Google Places',
  apollo: 'Apollo',
  manual: 'Manual',
}

function formatLocal(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const BUSINESS_TYPES = [
  'local_business',
  'dentist',
  'lawyer',
  'contractor',
  'med_spa',
  'real_estate',
  'restaurant',
  'gym',
  'salon',
]

const APOLLO_SENIORITIES = [
  'owner',
  'founder',
  'c_suite',
  'vp',
  'head',
  'director',
  'manager',
]

const APOLLO_EMPLOYEE_RANGES = [
  '1,10',
  '11,50',
  '51,200',
  '201,1000',
  '1000,50000',
]

function TagInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  const addTag = () => {
    const t = draft.trim()
    if (!t) return
    if (value.includes(t)) {
      setDraft('')
      return
    }
    onChange([...value, t])
    setDraft('')
  }
  const removeTag = (t) => onChange(value.filter((x) => x !== t))

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="hover:opacity-70"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder={placeholder}
          className="text-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={addTag}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

const EMPTY_APOLLO_CONFIG = {
  sourceName: '',
  api_key: '',
  person_titles: [],
  person_seniorities: [],
  organization_keywords: [],
  organization_locations: [],
  organization_num_employees_ranges: [],
  max_results: 50,
}

export default function LeadSourcesTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadCsv, setUploadCsv] = useState('')
  const [uploading, setUploading] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const fileInputRef = useRef(null)

  // Places dialog state
  const [placesOpen, setPlacesOpen] = useState(false)
  const [placesRunning, setPlacesRunning] = useState(false)
  const [placesConfig, setPlacesConfig] = useState({
    location: '',
    radius: 10,
    max_results: 20,
    business_types: ['local_business'],
    sourceName: '',
  })

  // Apollo dialog state
  const [apolloOpen, setApolloOpen] = useState(false)
  const [apolloRunning, setApolloRunning] = useState(false)
  const [apolloConfig, setApolloConfig] = useState(EMPTY_APOLLO_CONFIG)

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      const res = await outreachApi.listLeadSources()
      setSources(res.data || [])
    } catch (err) {
      if (err?.response?.status !== 403) toast.error('Failed to load lead sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasFullSignal) fetchSources()
    else setLoading(false)
  }, [hasFullSignal, fetchSources])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!uploadName) setUploadName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setUploadCsv(String(ev.target?.result || ''))
    reader.onerror = () => toast.error('Could not read file')
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!uploadCsv.trim()) {
      toast.error('Paste CSV content or select a file')
      return
    }
    setUploading(true)
    try {
      const res = await outreachApi.ingestLeadCsv({
        sourceName: uploadName || undefined,
        csv: uploadCsv,
      })
      const payload = res.data || {}
      setLastResult(payload)
      toast.success(
        `Ingested ${payload.inserted || 0} lead${(payload.inserted || 0) === 1 ? '' : 's'} (${payload.skipped || 0} skipped)`,
      )
      setUploadOpen(false)
      setUploadName('')
      setUploadCsv('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchSources()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRunPlaces = async () => {
    if (!placesConfig.location.trim()) {
      toast.error('Location is required')
      return
    }
    setPlacesRunning(true)
    try {
      const res = await outreachApi.runPlacesSource({
        sourceName: placesConfig.sourceName || undefined,
        config: {
          location: placesConfig.location.trim(),
          radius: Number(placesConfig.radius) || 10,
          max_results: Number(placesConfig.max_results) || 20,
          business_types: placesConfig.business_types,
        },
      })
      const payload = res.data || {}
      setLastResult({
        rowCount: payload.found,
        inserted: payload.inserted,
        skipped: payload.skipped,
        unknownHeaders: [],
        _type: 'places',
        _businessTypes: payload.businessTypesUsed,
      })
      toast.success(
        `Discovered ${payload.found || 0} places, added ${payload.inserted || 0} new leads`,
      )
      setPlacesOpen(false)
      await fetchSources()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Places run failed')
    } finally {
      setPlacesRunning(false)
    }
  }

  const toggleBusinessType = (type) => {
    setPlacesConfig((c) => {
      const has = c.business_types.includes(type)
      return {
        ...c,
        business_types: has
          ? c.business_types.filter((t) => t !== type)
          : [...c.business_types, type],
      }
    })
  }

  const handleDelete = async (source) => {
    if (!window.confirm(`Delete lead source "${source.name}"?`)) return
    try {
      await outreachApi.deleteLeadSource(source.id)
      toast.success('Deleted')
      await fetchSources()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  const toggleApolloSeniority = (s) => {
    setApolloConfig((c) => {
      const has = c.person_seniorities.includes(s)
      return {
        ...c,
        person_seniorities: has
          ? c.person_seniorities.filter((x) => x !== s)
          : [...c.person_seniorities, s],
      }
    })
  }

  const toggleApolloEmployeeRange = (r) => {
    setApolloConfig((c) => {
      const has = c.organization_num_employees_ranges.includes(r)
      return {
        ...c,
        organization_num_employees_ranges: has
          ? c.organization_num_employees_ranges.filter((x) => x !== r)
          : [...c.organization_num_employees_ranges, r],
      }
    })
  }

  const handleRunApollo = async () => {
    if (!apolloConfig.api_key.trim()) {
      toast.error('Apollo API key is required')
      return
    }
    setApolloRunning(true)
    try {
      const res = await outreachApi.runApolloSource({
        sourceName: apolloConfig.sourceName || undefined,
        config: {
          api_key: apolloConfig.api_key.trim(),
          person_titles: apolloConfig.person_titles,
          person_seniorities: apolloConfig.person_seniorities,
          organization_keywords: apolloConfig.organization_keywords,
          organization_locations: apolloConfig.organization_locations,
          organization_num_employees_ranges: apolloConfig.organization_num_employees_ranges,
          max_results: Number(apolloConfig.max_results) || 50,
        },
      })
      const payload = res.data || {}
      setLastResult({
        rowCount: payload.contactsFetched,
        inserted: payload.inserted,
        skipped: payload.skipped,
        unknownHeaders: [],
        _type: 'apollo',
        _totalMatching: payload.totalEntriesApollo,
      })
      toast.success(
        `Apollo: ${payload.inserted || 0} new leads added (${payload.contactsFetched || 0} fetched, ${payload.totalEntriesApollo || 0} matching)`,
      )
      setApolloOpen(false)
      setApolloConfig(EMPTY_APOLLO_CONFIG)
      await fetchSources()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Apollo run failed')
    } finally {
      setApolloRunning(false)
    }
  }

  const handleToggleSharing = async (source, e) => {
    e?.stopPropagation()
    try {
      await outreachApi.setLeadSourceSharing(source.id, !source.is_shared_across_org)
      toast.success(
        !source.is_shared_across_org
          ? 'Sharing enabled — visible to sibling projects in this org'
          : 'Sharing disabled',
      )
      await fetchSources()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sharing toggle failed')
    }
  }

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
              Lead sources require Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Upload CSVs, configure Google Places scraping, or integrate Apollo. Upgrade to Full
              Signal AI to unlock lead sourcing.
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

  if (loading) return <OutreachLoading label="Loading lead sources" />

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Lead sources</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {sources.length} source{sources.length === 1 ? '' : 's'} · CSV upload, Google Places,
            Apollo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setApolloOpen(true)}>
            <Building className="h-3.5 w-3.5 mr-1.5" /> Run Apollo
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPlacesOpen(true)}>
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> Run Places
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload CSV
          </Button>
        </div>
      </div>

      {lastResult && (
        <GlassCard>
          <GlassCardContent className="py-4 text-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-[var(--text-primary)] font-medium">
                  Ingest complete — {lastResult.inserted} new leads added
                </p>
                <p className="text-[var(--text-secondary)]">
                  {lastResult.rowCount} rows parsed · {lastResult.skipped} skipped
                </p>
                {lastResult.unknownHeaders?.length > 0 && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-amber-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      Unknown headers ignored: {lastResult.unknownHeaders.join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => setLastResult(null)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {sources.length === 0 ? (
        <OutreachEmptyState
          icon={FileText}
          title="No lead sources yet"
          description="Upload a CSV to add your first batch of leads. The CSV should have headers for at least one of: company_domain, website, or contact_email."
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload CSV
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((s) => {
            const result = s.last_run_result || {}
            const owned = s.owned_by_current_project !== false
            return (
              <GlassCard key={s.id}>
                <GlassCardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <GlassCardTitle className="text-sm flex items-center gap-2">
                        <span className="truncate">{s.name}</span>
                        {s.is_shared_across_org && owned && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">
                            Shared
                          </span>
                        )}
                      </GlassCardTitle>
                      <GlassCardDescription>
                        {TYPE_LABELS[s.type] || s.type}
                      </GlassCardDescription>
                      {!owned && (
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                          Shared from{' '}
                          <span className="text-[var(--text-secondary)]">
                            {s.owning_project_name || 'another project'}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {owned && (
                        <button
                          onClick={(e) => handleToggleSharing(s, e)}
                          className={`${
                            s.is_shared_across_org
                              ? 'text-[var(--brand-primary)]'
                              : 'text-[var(--text-tertiary)]'
                          } hover:text-[var(--brand-primary)]`}
                          title={
                            s.is_shared_across_org
                              ? 'Sharing enabled (click to disable)'
                              : 'Click to share with sibling projects in this org'
                          }
                          aria-label="Toggle sharing"
                        >
                          {s.is_shared_across_org ? (
                            <Share2 className="h-3.5 w-3.5" />
                          ) : (
                            <ShareOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => owned && handleDelete(s)}
                        className={`${
                          owned
                            ? 'text-[var(--text-tertiary)] hover:text-red-500'
                            : 'text-[var(--text-tertiary)]/40 cursor-not-allowed'
                        }`}
                        aria-label="Delete"
                        disabled={!owned}
                        title={
                          owned
                            ? 'Delete source'
                            : 'Only the owning project can delete a shared source'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </GlassCardHeader>
                <GlassCardContent className="text-[11px] space-y-1 text-[var(--text-secondary)]">
                  <p>
                    Last run:{' '}
                    <span className="text-[var(--text-primary)]">
                      {formatLocal(s.last_run_at)}
                    </span>
                  </p>
                  {result.inserted !== undefined && (
                    <p>
                      Inserted: <span className="text-[var(--text-primary)]">{result.inserted}</span>
                      {' · '}Skipped: {result.skipped || 0}
                      {' · '}Rows: {result.rowCount || 0}
                    </p>
                  )}
                  {result.unknownHeaders?.length > 0 && (
                    <p className="text-amber-600">
                      Unknown headers: {result.unknownHeaders.join(', ')}
                    </p>
                  )}
                </GlassCardContent>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Apollo run dialog */}
      <Dialog open={apolloOpen} onOpenChange={setApolloOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run Apollo prospecting</DialogTitle>
            <DialogDescription>
              Searches Apollo for people matching the filters below and imports them as leads.
              Your API key is stored on the lead source record and used for subsequent runs and
              enrichment. Need a key? Grab it from Apollo's{' '}
              <a
                href="https://app.apollo.io/#/settings/integrations/api"
                target="_blank"
                rel="noreferrer"
                className="underline text-[var(--brand-primary)]"
              >
                settings → integrations → API
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Source name (optional)</Label>
              <Input
                value={apolloConfig.sourceName}
                onChange={(e) =>
                  setApolloConfig((c) => ({ ...c, sourceName: e.target.value }))
                }
                placeholder={`Apollo — ${new Date().toISOString().slice(0, 10)}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apollo API key</Label>
              <Input
                type="password"
                value={apolloConfig.api_key}
                onChange={(e) =>
                  setApolloConfig((c) => ({ ...c, api_key: e.target.value }))
                }
                placeholder="Paste your Apollo API key"
                autoComplete="off"
              />
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Stored on the lead source record. Never sent to the browser afterward — only the
                last 4 digits are shown on subsequent loads.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Person titles</Label>
              <TagInput
                value={apolloConfig.person_titles}
                onChange={(v) => setApolloConfig((c) => ({ ...c, person_titles: v }))}
                placeholder="CEO, Founder, Head of Marketing…"
              />
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Free-text role titles. Press Enter or comma to add.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Person seniorities</Label>
              <div className="flex flex-wrap gap-1.5">
                {APOLLO_SENIORITIES.map((s) => {
                  const active = apolloConfig.person_seniorities.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleApolloSeniority(s)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
                        active
                          ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[var(--glass-border-strong)]'
                      }`}
                    >
                      {active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {s.replace(/_/g, ' ')}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Organization industry keywords</Label>
              <TagInput
                value={apolloConfig.organization_keywords}
                onChange={(v) =>
                  setApolloConfig((c) => ({ ...c, organization_keywords: v }))
                }
                placeholder="law firm, real estate, dental…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Organization locations</Label>
              <TagInput
                value={apolloConfig.organization_locations}
                onChange={(v) =>
                  setApolloConfig((c) => ({ ...c, organization_locations: v }))
                }
                placeholder="Ohio, US"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Organization employee range</Label>
              <div className="flex flex-wrap gap-1.5">
                {APOLLO_EMPLOYEE_RANGES.map((r) => {
                  const active = apolloConfig.organization_num_employees_ranges.includes(r)
                  const [lo, hi] = r.split(',')
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleApolloEmployeeRange(r)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
                        active
                          ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[var(--glass-border-strong)]'
                      }`}
                    >
                      {active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {lo}–{hi}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max results</Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={apolloConfig.max_results}
                onChange={(e) =>
                  setApolloConfig((c) => ({ ...c, max_results: e.target.value }))
                }
              />
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Caps per run (1–500). Each result consumes one Apollo credit.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApolloOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRunApollo}
              disabled={apolloRunning || !apolloConfig.api_key.trim()}
            >
              {apolloRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Running
                </>
              ) : (
                'Run Apollo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Places run dialog */}
      <Dialog open={placesOpen} onOpenChange={setPlacesOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Run Google Places discovery</DialogTitle>
            <DialogDescription>
              Searches Google Places near a location for businesses matching the selected types,
              then creates new leads for every result with a website. Results are deduplicated
              against existing leads by contact_email and domain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Source name (optional)</Label>
              <Input
                value={placesConfig.sourceName}
                onChange={(e) =>
                  setPlacesConfig((c) => ({ ...c, sourceName: e.target.value }))
                }
                placeholder={`Places \u2014 ${placesConfig.location || 'location'} \u2014 ${new Date()
                  .toISOString()
                  .slice(0, 10)}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={placesConfig.location}
                onChange={(e) =>
                  setPlacesConfig((c) => ({ ...c, location: e.target.value }))
                }
                placeholder="Cincinnati, OH"
              />
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Any geocodable location. City + state works, as does ZIP or a specific address.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Radius (miles)</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={placesConfig.radius}
                  onChange={(e) =>
                    setPlacesConfig((c) => ({ ...c, radius: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max results</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={placesConfig.max_results}
                  onChange={(e) =>
                    setPlacesConfig((c) => ({ ...c, max_results: e.target.value }))
                  }
                />
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Google caps per-type at 20; more → cycles types.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Business types</Label>
              <div className="flex flex-wrap gap-1.5">
                {BUSINESS_TYPES.map((type) => {
                  const active = placesConfig.business_types.includes(type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleBusinessType(type)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
                        active
                          ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[var(--glass-border-strong)]'
                      }`}
                    >
                      {active ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {type.replace(/_/g, ' ')}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                At least one required. Multiple types cycle through to reach max_results.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlacesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRunPlaces}
              disabled={
                placesRunning ||
                !placesConfig.location.trim() ||
                placesConfig.business_types.length === 0
              }
            >
              {placesRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Discovering
                </>
              ) : (
                'Run discovery'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload leads CSV</DialogTitle>
            <DialogDescription>
              Paste CSV content or select a file. Headers are matched case-insensitively —
              supported: company_name, company_domain / website, company_city, company_state,
              company_industry, contact_email / email, contact_first_name, contact_last_name,
              contact_role / title, phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Source name (optional)</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder={`CSV upload — ${new Date().toISOString().slice(0, 10)}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CSV file</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="block text-xs text-[var(--text-secondary)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Or paste CSV content</Label>
              <textarea
                className="w-full rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 text-xs font-mono"
                rows={8}
                value={uploadCsv}
                onChange={(e) => setUploadCsv(e.target.value)}
                placeholder={`company_name,company_domain,contact_first_name,contact_email\nAcme Corp,acme.com,Jane,jane@acme.com`}
              />
              {uploadCsv && (
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {uploadCsv.split('\n').filter((l) => l.trim()).length - 1} data rows detected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadCsv.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Uploading
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
