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
            return (
              <GlassCard key={s.id}>
                <GlassCardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <GlassCardTitle className="text-sm">{s.name}</GlassCardTitle>
                      <GlassCardDescription>
                        {TYPE_LABELS[s.type] || s.type}
                      </GlassCardDescription>
                    </div>
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-[var(--text-tertiary)] hover:text-red-500"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
