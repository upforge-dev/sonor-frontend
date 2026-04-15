import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Users,
  RefreshCw,
  Route,
  Search,
  Loader2,
  Mail,
  Globe,
  MapPin,
  Building2,
  Activity,
  Sparkles,
  History,
  Shuffle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSignalTier } from '@/hooks/useSignalTier'
import { outreachApi } from '@/lib/sonor-api'
import {
  OutreachLoading,
  OutreachEmptyState,
  OutreachStatusBadge,
} from '@/components/outreach/ui'

const STATE_FILTERS = [
  { value: 'all', label: 'All states' },
  { value: 'new', label: 'New' },
  { value: 'enriched', label: 'Enriched' },
  { value: 'audited', label: 'Audited' },
  { value: 'routed', label: 'Routed' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'suppressed', label: 'Suppressed' },
  { value: 'failed', label: 'Failed' },
]

function formatLocal(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function LeadsTab() {
  const { hasFullSignal, upgradeLabel, upgradePath } = useSignalTier()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({})
  const [stateFilter, setStateFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [routing, setRouting] = useState(false)
  const [routingAll, setRoutingAll] = useState(false)
  const [routeDialog, setRouteDialog] = useState(null) // route result for current lead
  const [enriching, setEnriching] = useState(false)
  const [reRouting, setReRouting] = useState(false)
  const [reRoutingExpired, setReRoutingExpired] = useState(false)
  const [touches, setTouches] = useState([])
  const [touchesLoading, setTouchesLoading] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (stateFilter !== 'all') params.state = stateFilter
      if (search.trim()) params.search = search.trim()
      const [leadsRes, countsRes] = await Promise.all([
        outreachApi.listLeads(params),
        outreachApi.getLeadCounts(),
      ])
      setLeads(leadsRes.data?.rows || [])
      setCounts(countsRes.data || {})
    } catch (err) {
      if (err?.response?.status !== 403) toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [stateFilter, search])

  useEffect(() => {
    if (hasFullSignal) fetchLeads()
    else setLoading(false)
  }, [hasFullSignal, fetchLeads])

  const totalCount = useMemo(
    () => Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0),
    [counts],
  )

  const handleRoute = async (lead) => {
    setRouting(true)
    try {
      const res = await outreachApi.routeLead(lead.id)
      setRouteDialog(res.data)
      toast.success(
        res.data?.assigned_narrative_id
          ? `Routed — score ${(res.data.score || 0).toFixed(2)}`
          : 'No confident narrative match',
      )
      await fetchLeads()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Route failed')
    } finally {
      setRouting(false)
    }
  }

  const handleRouteAll = async () => {
    if (!window.confirm('Route every unassigned lead through the narrative matcher now?')) return
    setRoutingAll(true)
    try {
      const res = await outreachApi.routeAllLeads()
      const { routed = 0, skipped = 0, failed = 0 } = res.data || {}
      toast.success(`Routed ${routed}, skipped ${skipped}, failed ${failed}`)
      await fetchLeads()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk route failed')
    } finally {
      setRoutingAll(false)
    }
  }

  const handleEnrich = async (lead) => {
    setEnriching(true)
    try {
      const res = await outreachApi.enrichLead(lead.id)
      const status = res.data?.enrichmentStatus
      const statusMessages = {
        enriched: 'Lead enriched via Apollo',
        no_apollo_source: 'No Apollo source configured for this project',
        no_domain: 'Lead has no company domain to enrich',
        no_contacts_found: 'Apollo returned no matching contacts',
      }
      toast.success(statusMessages[status] || `Enrichment: ${status}`)
      if (res.data?.lead) setSelectedLead(res.data.lead)
      await fetchLeads()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Enrich failed')
    } finally {
      setEnriching(false)
    }
  }

  const handleReRoute = async (lead) => {
    setReRouting(true)
    try {
      const res = await outreachApi.reRouteLead(lead.id)
      setRouteDialog(res.data)
      toast.success(
        res.data?.assigned_narrative_id
          ? `Re-routed — score ${(res.data.score || 0).toFixed(2)}`
          : 'No alternate narrative available',
      )
      await fetchLeads()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Re-route failed')
    } finally {
      setReRouting(false)
    }
  }

  const handleReRouteExpired = async () => {
    if (
      !window.confirm(
        'Re-route every lead whose cooldown has expired through the narrative matcher now?',
      )
    )
      return
    setReRoutingExpired(true)
    try {
      const res = await outreachApi.reRouteExpiredLeads()
      const { routed = 0, skipped = 0, failed = 0 } = res.data || {}
      toast.success(`Re-routed ${routed}, skipped ${skipped}, failed ${failed}`)
      await fetchLeads()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Re-route expired failed')
    } finally {
      setReRoutingExpired(false)
    }
  }

  // When the detail dialog opens, pull the touch history
  useEffect(() => {
    if (!selectedLead?.id) {
      setTouches([])
      return
    }
    let cancelled = false
    setTouchesLoading(true)
    outreachApi
      .getLeadTouches(selectedLead.id)
      .then((res) => {
        if (cancelled) return
        setTouches(res.data?.touches || res.data || [])
      })
      .catch(() => {
        if (cancelled) return
        setTouches([])
      })
      .finally(() => {
        if (!cancelled) setTouchesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedLead?.id])

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
              Leads require Full Signal AI
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Leads are the cold prospects that flow through the drip pipeline. Upgrade to Full
              Signal AI to unlock CSV upload, narrative routing, and AI-conditioned outreach.
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

  if (loading) return <OutreachLoading label="Loading leads" />

  if (leads.length === 0 && stateFilter === 'all' && !search.trim()) {
    return (
      <div className="p-6">
        <OutreachEmptyState
          icon={Users}
          title="No leads yet"
          description="Upload a CSV or configure a lead source to start populating the pipeline. Leads flow: new → enriched → audited → routed → sent."
          action={null}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header + bulk actions */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Leads</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {totalCount} total · {counts.routed || 0} routed · {counts.sent || 0} sent ·{' '}
            {counts.replied || 0} replied
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRouteAll}
            disabled={routingAll}
          >
            {routingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Route className="h-3.5 w-3.5 mr-1.5" />
            )}
            Route unassigned
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReRouteExpired}
            disabled={reRoutingExpired}
          >
            {reRoutingExpired ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Clock className="h-3.5 w-3.5 mr-1.5" />
            )}
            Re-route expired
          </Button>
          <Button size="sm" variant="outline" onClick={fetchLeads}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, domain, or email…"
            className="pl-8 text-xs"
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATE_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
                {s.value !== 'all' && counts[s.value] !== undefined
                  ? ` (${counts[s.value]})`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {leads.map((lead) => (
          <GlassCard
            key={lead.id}
            className="cursor-pointer hover:border-[var(--glass-border-strong)] transition-all"
            onClick={() => setSelectedLead(lead)}
          >
            <GlassCardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <GlassCardTitle className="truncate text-sm">
                    {lead.company_name || lead.company_domain || 'Unnamed'}
                  </GlassCardTitle>
                  <GlassCardDescription className="truncate">
                    {[lead.contact_first_name, lead.contact_last_name]
                      .filter(Boolean)
                      .join(' ') || lead.contact_email || '—'}
                  </GlassCardDescription>
                </div>
                <OutreachStatusBadge status={lead.state} />
              </div>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[var(--text-tertiary)]">
                {lead.company_domain && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {lead.company_domain}
                  </span>
                )}
                {lead.contact_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {lead.contact_email}
                  </span>
                )}
                {(lead.company_city || lead.company_state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[lead.company_city, lead.company_state].filter(Boolean).join(', ')}
                  </span>
                )}
                {lead.company_industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {lead.company_industry}
                  </span>
                )}
              </div>
              {lead.audit?.top_finding && (
                <p className="text-[var(--text-secondary)] italic line-clamp-2">
                  "{lead.audit.top_finding}"
                </p>
              )}
              {lead.state_reason && (
                <p className="text-[var(--text-tertiary)]">
                  <span className="text-[var(--text-secondary)] font-medium">Reason: </span>
                  {lead.state_reason}
                </p>
              )}
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>

      {leads.length === 0 && (
        <p className="text-center text-xs text-[var(--text-tertiary)] py-8">
          No leads match the current filters.
        </p>
      )}

      {/* Lead detail drawer (as a dialog) */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <DialogTitle>
                      {selectedLead.company_name || selectedLead.company_domain || 'Lead'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedLead.contact_email || 'no email'} ·{' '}
                      <OutreachStatusBadge status={selectedLead.state} />
                    </DialogDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEnrich(selectedLead)}
                    disabled={enriching}
                  >
                    {enriching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Enrich via Apollo
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Contact details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase text-[var(--text-tertiary)]">
                      Contact
                    </Label>
                    <p className="text-[var(--text-primary)]">
                      {[selectedLead.contact_first_name, selectedLead.contact_last_name]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </p>
                    {selectedLead.contact_role && (
                      <p className="text-[var(--text-secondary)]">{selectedLead.contact_role}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-[var(--text-tertiary)]">
                      Company
                    </Label>
                    <p className="text-[var(--text-primary)]">
                      {selectedLead.company_name || '—'}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      {[selectedLead.company_city, selectedLead.company_state]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>

                {/* Routing */}
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-[var(--text-tertiary)]">
                    Routing
                  </Label>
                  {selectedLead.assigned_narrative_id ? (
                    <>
                      <p className="text-[var(--text-primary)]">
                        Narrative: {selectedLead.assigned_narrative_id.slice(0, 8)}…
                      </p>
                      {selectedLead.assigned_mailbox_id && (
                        <p className="text-[var(--text-secondary)]">
                          Mailbox: {selectedLead.assigned_mailbox_id.slice(0, 8)}…
                        </p>
                      )}
                      <p className="text-[var(--text-tertiary)]">
                        Last routed: {formatLocal(selectedLead.last_routed_at)}
                      </p>
                    </>
                  ) : (
                    <p className="text-[var(--text-tertiary)] italic">Not yet routed</p>
                  )}
                </div>

                {/* Audit */}
                {selectedLead.audit && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-[var(--text-tertiary)]">
                      Audit
                    </Label>
                    {selectedLead.audit.opportunity_score !== undefined && (
                      <p className="text-[var(--text-primary)]">
                        Opportunity score:{' '}
                        <span className="font-mono font-semibold">
                          {selectedLead.audit.opportunity_score}
                        </span>{' '}
                        / 100
                      </p>
                    )}
                    {selectedLead.audit.top_finding && (
                      <p className="text-[var(--text-secondary)] italic">
                        "{selectedLead.audit.top_finding}"
                      </p>
                    )}
                    {selectedLead.audit.narrative_hooks_matched?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedLead.audit.narrative_hooks_matched.map((h) => (
                          <span
                            key={h}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedLead.audit.homepage_issues?.length > 0 && (
                      <div>
                        <p className="text-[var(--text-tertiary)] uppercase text-[10px]">
                          Homepage
                        </p>
                        <ul className="list-disc list-inside text-[var(--text-secondary)]">
                          {selectedLead.audit.homepage_issues.slice(0, 4).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedLead.audit.seo_gaps?.length > 0 && (
                      <div>
                        <p className="text-[var(--text-tertiary)] uppercase text-[10px]">SEO</p>
                        <ul className="list-disc list-inside text-[var(--text-secondary)]">
                          {selectedLead.audit.seo_gaps.slice(0, 4).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedLead.audit.conversion_blockers?.length > 0 && (
                      <div>
                        <p className="text-[var(--text-tertiary)] uppercase text-[10px]">
                          Conversion
                        </p>
                        <ul className="list-disc list-inside text-[var(--text-secondary)]">
                          {selectedLead.audit.conversion_blockers.slice(0, 4).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Touch history */}
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-[var(--text-tertiary)] flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Touch history
                  </Label>
                  {touchesLoading ? (
                    <p className="text-[var(--text-tertiary)] italic">Loading touches…</p>
                  ) : touches.length === 0 ? (
                    <p className="text-[var(--text-tertiary)] italic">No touches yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {touches.map((t, i) => (
                        <li
                          key={t.id || i}
                          className="flex items-start gap-2 text-[var(--text-secondary)] leading-tight"
                        >
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-[var(--text-primary)]">
                              {formatLocal(
                                t.sent_at || t.scheduled_at_utc || t.touched_at || t.created_at,
                              )}
                            </span>
                            {t.mailbox_email && (
                              <span>
                                {' '}
                                · sent from{' '}
                                <span className="text-[var(--text-primary)]">
                                  {t.mailbox_email}
                                </span>
                              </span>
                            )}
                            {t.narrative_name && (
                              <span>
                                {' '}
                                · via{' '}
                                <span className="text-[var(--text-primary)]">
                                  {t.narrative_name}
                                </span>
                              </span>
                            )}
                            {t.domain && (
                              <span>
                                {' '}
                                on{' '}
                                <span className="text-[var(--text-primary)]">{t.domain}</span>
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="text-[var(--text-tertiary)]">
                  Created: {formatLocal(selectedLead.created_at)}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedLead(null)}>
                  Close
                </Button>
                {selectedLead.state === 'sent' && (
                  <Button
                    variant="outline"
                    onClick={() => handleReRoute(selectedLead)}
                    disabled={reRouting}
                  >
                    {reRouting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Re-routing
                      </>
                    ) : (
                      <>
                        <Shuffle className="h-3.5 w-3.5 mr-1.5" /> Re-route
                      </>
                    )}
                  </Button>
                )}
                <Button onClick={() => handleRoute(selectedLead)} disabled={routing}>
                  {routing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Routing
                    </>
                  ) : (
                    <>
                      <Route className="h-3.5 w-3.5 mr-1.5" /> Route now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Route result dialog */}
      <Dialog open={!!routeDialog} onOpenChange={(open) => !open && setRouteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Routing result</DialogTitle>
            <DialogDescription>
              Signal ranked each narrative against this lead.
            </DialogDescription>
          </DialogHeader>
          {routeDialog && (
            <div className="space-y-2 text-xs">
              {(routeDialog.ranked || []).map((r, i) => (
                <div
                  key={r.narrative_id}
                  className={`p-2 rounded-md border ${
                    i === 0
                      ? 'border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-primary)]">{r.name}</span>
                    <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                      {(r.score || 0).toFixed(2)}
                    </span>
                  </div>
                  {r.reasoning && (
                    <p className="text-[var(--text-tertiary)] mt-0.5">{r.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRouteDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
