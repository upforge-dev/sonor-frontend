import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Globe, MoreVertical, CheckCircle2, XCircle, Pause, Play, Trash2,
  Loader2, Shield, AlertTriangle, Flame, Activity, RefreshCw, BarChart3,
  Copy, ChevronDown, ChevronUp, Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'
import { OutreachStatusBadge, OutreachEmptyState, OutreachLoading } from '@/components/outreach/ui'

const STATUS_ICONS = {
  pending: null,
  verifying: Loader2,
  verified: CheckCircle2,
  active: Play,
  paused: Pause,
  killed: XCircle,
}

export default function OutreachDomainsTab() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [capacity, setCapacity] = useState(null)
  const [showCapacity, setShowCapacity] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [expandedDns, setExpandedDns] = useState(null)
  const [blacklistStatus, setBlacklistStatus] = useState({}) // { [domainId]: { listed: [], clean: [], checking: bool } }
  const [warmupStatus, setWarmupStatus] = useState({}) // { [domainId]: { schedule, currentDay, ... } }

  const fetchDomains = useCallback(async () => {
    try {
      const { data } = await outreachApi.listDomains()
      setDomains(data || [])
    } catch (err) {
      toast.error('Failed to load domains')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCapacity = useCallback(async () => {
    try {
      const { data } = await outreachApi.getCapacityReport()
      setCapacity(data)
    } catch (err) {
      toast.error('Failed to load capacity report')
    }
  }, [])

  useEffect(() => { fetchDomains() }, [fetchDomains])

  const handleAdd = async (formData) => {
    try {
      await outreachApi.addDomain(formData)
      toast.success('Domain registered with Resend — configure DNS records to verify')
      setShowAdd(false)
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add domain')
    }
  }

  const handleLink = async (formData) => {
    try {
      await outreachApi.linkDomain(formData)
      toast.success('Domain linked — DNS and verification status loaded from Resend')
      setShowLink(false)
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link domain')
    }
  }

  const handleVerify = async (id) => {
    try {
      const { data } = await outreachApi.verifyDomain(id)
      if (data?.status === 'verified') {
        toast.success('Domain verified!')
      } else {
        toast.info('DNS records not yet propagated. Try again in a few minutes.')
      }
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    }
  }

  const handleActivate = async (id) => {
    try {
      await outreachApi.activateDomain(id)
      toast.success('Domain activated with warmup schedule')
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Activation failed')
    }
  }

  const handlePause = async (id) => {
    try {
      await outreachApi.pauseDomain(id)
      toast.success('Domain paused')
      fetchDomains()
    } catch (err) {
      toast.error('Failed to pause domain')
    }
  }

  const handleDelete = async (id) => {
    try {
      await outreachApi.deleteDomain(id)
      toast.success('Domain removed from Resend and database')
      fetchDomains()
    } catch (err) {
      toast.error('Failed to delete domain')
    }
  }

  const handleStartWarmup = async (id) => {
    try {
      await outreachApi.startWarmup(id)
      toast.success('Warmup schedule started')
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start warmup')
    }
  }

  const handleCheckBlacklist = async (id) => {
    setBlacklistStatus(prev => ({ ...prev, [id]: { ...prev[id], checking: true } }))
    try {
      const { data } = await outreachApi.checkBlacklist(id)
      setBlacklistStatus(prev => ({
        ...prev,
        [id]: { listed: data?.listed || [], clean: data?.clean || [], checking: false, checkedAt: new Date().toISOString() },
      }))
      if (data?.listed?.length) {
        toast.error(`Domain listed on ${data.listed.length} blacklist(s)`)
      } else {
        toast.success('Domain is clean — not listed on any blacklists')
      }
    } catch (err) {
      setBlacklistStatus(prev => ({ ...prev, [id]: { ...prev[id], checking: false } }))
      toast.error('Failed to check blacklist status')
    }
  }

  const handleFetchWarmup = async (id) => {
    try {
      const { data } = await outreachApi.getWarmupStatus(id)
      setWarmupStatus(prev => ({ ...prev, [id]: data }))
    } catch { /* ignore */ }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data } = await outreachApi.syncDomains()
      const synced = data?.synced || []
      const errors = data?.errors || []
      const totalLocalDomains = data?.totalLocalDomains ?? 0

      if (totalLocalDomains === 0) {
        toast.message('No domains to sync', {
          description: 'Add a domain or use Link existing if it is already in Resend.',
        })
      } else {
        if (synced.length > 0) {
          toast.success(`${synced.length} domain(s) now verified (Resend)`)
        } else {
          toast.success('Refreshed DNS and status from Resend for your linked domains')
        }
        if (errors.length > 0) {
          toast.warning(`${errors.length} domain(s) need attention`, {
            description: errors.slice(0, 5).join('\n'),
          })
        }
      }
      fetchDomains()
    } catch (err) {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleShowCapacity = async () => {
    if (showCapacity) {
      setShowCapacity(false)
      return
    }
    await fetchCapacity()
    setShowCapacity(true)
  }

  const copyDnsRecord = (value) => {
    navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return <OutreachLoading />
  }

  const activeDomains = domains.filter(d => d.status === 'active')
  const totalSentToday = domains.reduce((s, d) => s + (d.sent_today || 0), 0)
  const totalCapacity = activeDomains.reduce((s, d) => s + (d.daily_limit || 0), 0)
  const avgHealth = domains.length > 0 ? Math.round(domains.reduce((s, d) => s + (d.health_score || 100), 0) / domains.length) : 100

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-secondary)]">
          Manage domains, warmup schedules, and deliverability health. Sonor uses one Resend account for many customers — use{' '}
          <span className="font-medium text-foreground">Link existing</span> when the hostname is already in Resend, or{' '}
          <span className="font-medium text-foreground">Add Domain</span> to register a new one.{' '}
          <span className="font-medium text-foreground">Sync Resend</span> only updates domains already linked to this organization (never imports the whole account).
        </p>
        <div className="flex gap-2 shrink-0 ml-4">
          <Button variant="outline" onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Resend
          </Button>
          <Button variant="outline" onClick={handleShowCapacity} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Capacity
          </Button>
          <Button variant="outline" onClick={() => setShowLink(true)} className="gap-2">
            <Link2 className="h-4 w-4" />
            Link existing
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Domain
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><Globe className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold">{activeDomains.length}</p>
                <p className="text-xs text-[var(--text-secondary)]">Active Domains</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Activity className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalSentToday}</p>
                <p className="text-xs text-[var(--text-secondary)]">Sent Today</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalCapacity > 0 ? Math.round((totalSentToday / totalCapacity) * 100) : 0}%</p>
                <p className="text-xs text-[var(--text-secondary)]">Fleet Utilization</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{avgHealth}%</p>
                <p className="text-xs text-[var(--text-secondary)]">Avg Health</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Capacity report */}
      {showCapacity && capacity && (
        <GlassCard className="border-blue-500/20 bg-blue-500/5">
          <div className="p-6 pb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Fleet Capacity Report
            </h3>
          </div>
          <GlassCardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-secondary)]">Daily Capacity</p>
                <p className="text-xl font-bold">{capacity.summary?.totalDailyCapacity || 0} emails</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Monthly Capacity</p>
                <p className="text-xl font-bold">{(capacity.summary?.monthlyCapacity || 0).toLocaleString()} emails</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Active / Total</p>
                <p className="text-xl font-bold">{capacity.summary?.activeDomains || 0} / {capacity.summary?.totalDomains || 0}</p>
              </div>
            </div>

            {capacity.scaling && (
              <div className="text-xs text-[var(--text-secondary)] bg-[var(--glass-bg-inset)] rounded-lg p-3 space-y-1">
                <p>For 10K emails/month: need ~{capacity.scaling.domainsNeededFor10kMonth} domains</p>
                <p>For 50K emails/month: need ~{capacity.scaling.domainsNeededFor50kMonth} domains</p>
                <p>Safe daily limit per warmed domain: {capacity.scaling.safePerDomainDailyLimit}</p>
              </div>
            )}

            {capacity.recommendations?.length > 0 && (
              <div className="space-y-1">
                {capacity.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {domains.length === 0 ? (
        <OutreachEmptyState
          icon={Globe}
          title="No domains configured"
          description="Add your first sending domain to start cold outreach"
          action={<Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Domain</Button>}
        />
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => {
            const StatusIcon = STATUS_ICONS[domain.status]
            const healthColor = domain.health_score >= 80 ? 'text-[var(--brand-primary)]' : domain.health_score >= 50 ? 'text-amber-500' : 'text-red-500'
            const utilization = domain.daily_limit > 0 ? (domain.sent_today / domain.daily_limit) * 100 : 0
            const hasDns = domain.dns_records?.length > 0
            const isExpanded = expandedDns === domain.id

            return (
              <GlassCard key={domain.id} className={domain.status === 'killed' ? 'border-red-500/20 bg-red-500/5' : ''}>
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
                        <h3 className="font-semibold">{domain.domain}</h3>
                        <OutreachStatusBadge status={domain.status} />
                        {StatusIcon && domain.status === 'verifying' && <StatusIcon className="h-3 w-3 animate-spin text-amber-500" />}
                        {domain.status === 'killed' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-xs text-[var(--text-secondary)]">
                        <span>From: {domain.from_email || `outreach@${domain.domain}`}</span>
                        <span className={healthColor}>Health: {domain.health_score}%</span>
                        <span>Bounce: {(domain.bounce_rate || 0).toFixed(1)}%</span>
                        <span>Spam: {(domain.spam_rate || 0).toFixed(3)}%</span>
                        <span>Total sent: {(domain.total_sent || 0).toLocaleString()}</span>
                      </div>
                      {domain.status === 'active' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={utilization} className="h-1.5 flex-1 max-w-[200px]" />
                          <span className="text-xs text-[var(--text-secondary)]">{domain.sent_today}/{domain.daily_limit} today</span>
                        </div>
                      )}

                      {/* Blacklist warning */}
                      {blacklistStatus[domain.id]?.listed?.length > 0 && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Listed on {blacklistStatus[domain.id].listed.length} blacklist(s): {blacklistStatus[domain.id].listed.join(', ')}
                        </div>
                      )}
                      {blacklistStatus[domain.id] && !blacklistStatus[domain.id].checking && blacklistStatus[domain.id].listed?.length === 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                          <Shield className="h-3 w-3" /> Clean — no blacklist listings
                        </div>
                      )}

                      {/* Warmup progress */}
                      {warmupStatus[domain.id]?.schedule?.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                          <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <Flame className="h-3.5 w-3.5" />
                            Warmup Day {warmupStatus[domain.id].current_day || 1} of {warmupStatus[domain.id].schedule.length}
                          </div>
                          <Progress value={((warmupStatus[domain.id].current_day || 1) / warmupStatus[domain.id].schedule.length) * 100} className="h-1.5" />
                          <div className="flex justify-between mt-1 text-amber-600">
                            <span>Today's limit: {warmupStatus[domain.id].schedule[warmupStatus[domain.id].current_day - 1]?.daily_limit || '—'}</span>
                            <span>Target: {warmupStatus[domain.id].schedule[warmupStatus[domain.id].schedule.length - 1]?.daily_limit || '—'}/day</span>
                          </div>
                        </div>
                      )}

                      {/* DNS Records section for verifying domains */}
                      {(domain.status === 'verifying' || domain.status === 'pending') && hasDns && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedDns(isExpanded ? null : domain.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExpanded ? 'Hide' : 'Show'} DNS Records ({domain.dns_records.length})
                          </button>
                          {isExpanded && (
                            <div className="mt-2 space-y-2 bg-[var(--glass-bg-inset)] rounded-lg p-3 text-xs font-mono">
                              {domain.dns_records.map((rec, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px] h-5">{rec.type || rec.record_type}</Badge>
                                      <span className="text-[var(--text-secondary)]">{rec.name || rec.host}</span>
                                    </div>
                                    <p className="text-foreground break-all">{rec.value || rec.data}</p>
                                    {rec.priority && <p className="text-[var(--text-secondary)]">Priority: {rec.priority}</p>}
                                    {rec.ttl && <p className="text-[var(--text-secondary)]">TTL: {rec.ttl}</p>}
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyDnsRecord(rec.value || rec.data)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <p className="text-[var(--text-secondary)] pt-2 font-sans">
                                Add these records to your DNS provider, then click "Check Verification."
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inbound routing setup guide */}
                      {expandedDns === `inbound-${domain.id}` && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs space-y-2">
                          <div className="flex items-center gap-2 text-blue-600 font-medium">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reply Tracking Setup
                          </div>
                          <p className="text-blue-600">To track replies from outreach emails, configure Resend inbound routing:</p>
                          <ol className="list-decimal list-inside space-y-1 text-blue-600">
                            <li>Go to <a href="https://resend.com/domains" target="_blank" rel="noopener" className="underline">Resend Dashboard &rarr; Domains</a></li>
                            <li>Click on <strong>{domain.domain}</strong></li>
                            <li>Go to the <strong>Inbound</strong> tab</li>
                            <li>Add an MX record: <code className="bg-blue-500/10 px-1 rounded">10 inbound-smtp.resend.com</code></li>
                            <li>Set the webhook URL to:</li>
                          </ol>
                          <div className="flex items-center gap-2 bg-blue-500/10 rounded p-2 font-mono">
                            <span className="truncate flex-1">https://api.sonor.io/api/public/outreach/webhooks/inbound</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText('https://api.sonor.io/api/public/outreach/webhooks/inbound'); toast.success('Copied webhook URL') }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {domain.status === 'verifying' && (
                          <DropdownMenuItem onClick={() => handleVerify(domain.id)}><CheckCircle2 className="h-4 w-4 mr-2" />Check Verification</DropdownMenuItem>
                        )}
                        {domain.status === 'verified' && (
                          <>
                            <DropdownMenuItem onClick={() => handleActivate(domain.id)}><Play className="h-4 w-4 mr-2" />Activate + Warmup</DropdownMenuItem>
                          </>
                        )}
                        {(domain.status === 'verified' || domain.status === 'active') && (
                          <DropdownMenuItem onClick={() => setExpandedDns(expandedDns === `inbound-${domain.id}` ? null : `inbound-${domain.id}`)}>
                            <RefreshCw className="h-4 w-4 mr-2" />Reply Tracking Setup
                          </DropdownMenuItem>
                        )}
                        {domain.status === 'active' && (
                          <>
                            <DropdownMenuItem onClick={() => handleStartWarmup(domain.id)}><Flame className="h-4 w-4 mr-2" />Restart Warmup</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFetchWarmup(domain.id)}><Activity className="h-4 w-4 mr-2" />Warmup Progress</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePause(domain.id)}><Pause className="h-4 w-4 mr-2" />Pause</DropdownMenuItem>
                          </>
                        )}
                        {(domain.status === 'active' || domain.status === 'verified' || domain.status === 'paused') && (
                          <DropdownMenuItem onClick={() => handleCheckBlacklist(domain.id)} disabled={blacklistStatus[domain.id]?.checking}>
                            <Shield className="h-4 w-4 mr-2" />{blacklistStatus[domain.id]?.checking ? 'Checking...' : 'Check Blacklists'}
                          </DropdownMenuItem>
                        )}
                        {domain.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleActivate(domain.id)}><Play className="h-4 w-4 mr-2" />Resume</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(domain.id)}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )
          })}
        </div>
      )}

      <AddDomainDialog open={showAdd} onOpenChange={setShowAdd} onSave={handleAdd} />
      <LinkDomainDialog open={showLink} onOpenChange={setShowLink} onSave={handleLink} />
    </div>
  )
}

function LinkDomainDialog({ open, onOpenChange, onSave }) {
  const [domain, setDomain] = useState('')
  const [fromName, setFromName] = useState('')
  const [dailyLimit, setDailyLimit] = useState('50')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!domain.trim()) return
    setSaving(true)
    try {
      await onSave({
        domain: domain.trim(),
        from_name: fromName.trim() || undefined,
        daily_limit: parseInt(dailyLimit) || 50,
      })
      setDomain('')
      setFromName('')
      setDailyLimit('50')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link existing Resend domain</DialogTitle>
          <DialogDescription>
            Enter the exact hostname already configured in Resend (e.g. mail.client.com). Sonor will attach it to this organization only — it does not browse or import other domains from the shared account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Domain</Label>
            <Input placeholder="mail.clientdomain.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <p className="text-xs text-[var(--text-secondary)] mt-1">Must match the domain name in Resend exactly</p>
          </div>
          <div>
            <Label>From Name</Label>
            <Input placeholder="John from Acme" value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>
          <div>
            <Label>Daily Send Limit (post-warmup)</Label>
            <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!domain.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Link domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddDomainDialog({ open, onOpenChange, onSave }) {
  const [domain, setDomain] = useState('')
  const [fromName, setFromName] = useState('')
  const [dailyLimit, setDailyLimit] = useState('50')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!domain.trim()) return
    setSaving(true)
    try {
      await onSave({
        domain: domain.trim(),
        from_name: fromName.trim() || undefined,
        daily_limit: parseInt(dailyLimit) || 50,
      })
      setDomain('')
      setFromName('')
      setDailyLimit('50')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Sending Domain</DialogTitle>
          <DialogDescription>
            Register a domain with Resend for cold outreach. After adding, you'll receive DNS records to configure with your domain registrar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Domain</Label>
            <Input placeholder="outreach.yourdomain.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <p className="text-xs text-[var(--text-secondary)] mt-1">Use a subdomain (e.g. mail.yourdomain.com) to protect your primary domain reputation</p>
          </div>
          <div>
            <Label>From Name</Label>
            <Input placeholder="John from Acme" value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>
          <div>
            <Label>Daily Send Limit (post-warmup)</Label>
            <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
            <p className="text-xs text-[var(--text-secondary)] mt-1">Warmup starts at 5/day and ramps up to this limit over 30 days</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!domain.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
