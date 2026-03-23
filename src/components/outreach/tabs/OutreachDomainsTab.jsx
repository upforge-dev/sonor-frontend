import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { outreachApi } from '@/lib/portal-api'

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'outline', icon: null },
  verifying: { label: 'Verifying DNS', variant: 'secondary', icon: Loader2 },
  verified: { label: 'Verified', variant: 'default', icon: CheckCircle2 },
  active: { label: 'Active', variant: 'default', icon: Play },
  paused: { label: 'Paused', variant: 'secondary', icon: Pause },
  killed: { label: 'Killed', variant: 'destructive', icon: XCircle },
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
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  const activeDomains = domains.filter(d => d.status === 'active')
  const totalSentToday = domains.reduce((s, d) => s + (d.sent_today || 0), 0)
  const totalCapacity = activeDomains.reduce((s, d) => s + (d.daily_limit || 0), 0)
  const avgHealth = domains.length > 0 ? Math.round(domains.reduce((s, d) => s + (d.health_score || 100), 0) / domains.length) : 100

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sending Domains</h2>
          <p className="text-muted-foreground">
            Manage domains, warmup schedules, and deliverability health. Sonor uses one Resend account for many customers — use{' '}
            <span className="font-medium text-foreground">Link existing</span> when the hostname is already in Resend, or{' '}
            <span className="font-medium text-foreground">Add Domain</span> to register a new one.{' '}
            <span className="font-medium text-foreground">Sync Resend</span> only updates domains already linked to this organization (never imports the whole account).
          </p>
        </div>
        <div className="flex gap-2">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Globe className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{activeDomains.length}</p>
                <p className="text-xs text-muted-foreground">Active Domains</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><Activity className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalSentToday}</p>
                <p className="text-xs text-muted-foreground">Sent Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalCapacity > 0 ? Math.round((totalSentToday / totalCapacity) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground">Fleet Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Shield className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{avgHealth}%</p>
                <p className="text-xs text-muted-foreground">Avg Health</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity report */}
      {showCapacity && capacity && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Fleet Capacity Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Daily Capacity</p>
                <p className="text-xl font-bold">{capacity.summary?.totalDailyCapacity || 0} emails</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Capacity</p>
                <p className="text-xl font-bold">{(capacity.summary?.monthlyCapacity || 0).toLocaleString()} emails</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active / Total</p>
                <p className="text-xl font-bold">{capacity.summary?.activeDomains || 0} / {capacity.summary?.totalDomains || 0}</p>
              </div>
            </div>

            {capacity.scaling && (
              <div className="text-xs text-muted-foreground bg-white/80 rounded-lg p-3 space-y-1">
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
          </CardContent>
        </Card>
      )}

      {domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No domains configured</h3>
            <p className="text-muted-foreground mb-4">Add your first sending domain to start cold outreach</p>
            <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" />Add Domain</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => {
            const statusConfig = STATUS_CONFIG[domain.status] || STATUS_CONFIG.pending
            const StatusIcon = statusConfig.icon
            const healthColor = domain.health_score >= 80 ? 'text-green-600' : domain.health_score >= 50 ? 'text-amber-600' : 'text-red-600'
            const utilization = domain.daily_limit > 0 ? (domain.sent_today / domain.daily_limit) * 100 : 0
            const hasDns = domain.dns_records?.length > 0
            const isExpanded = expandedDns === domain.id

            return (
              <Card key={domain.id} className={domain.status === 'killed' ? 'border-red-200 bg-red-50/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">{domain.domain}</h3>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          {StatusIcon && <StatusIcon className={`h-3 w-3 ${domain.status === 'verifying' ? 'animate-spin' : ''}`} />}
                          {statusConfig.label}
                        </Badge>
                        {domain.status === 'killed' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground">
                        <span>From: {domain.from_email || `outreach@${domain.domain}`}</span>
                        <span className={healthColor}>Health: {domain.health_score}%</span>
                        <span>Bounce: {(domain.bounce_rate || 0).toFixed(1)}%</span>
                        <span>Spam: {(domain.spam_rate || 0).toFixed(3)}%</span>
                        <span>Total sent: {(domain.total_sent || 0).toLocaleString()}</span>
                      </div>
                      {domain.status === 'active' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={utilization} className="h-1.5 flex-1 max-w-[200px]" />
                          <span className="text-xs text-muted-foreground">{domain.sent_today}/{domain.daily_limit} today</span>
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
                            <div className="mt-2 space-y-2 bg-muted/40 rounded-lg p-3 text-xs font-mono">
                              {domain.dns_records.map((rec, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-[10px] h-5">{rec.type || rec.record_type}</Badge>
                                      <span className="text-muted-foreground">{rec.name || rec.host}</span>
                                    </div>
                                    <p className="text-foreground break-all">{rec.value || rec.data}</p>
                                    {rec.priority && <p className="text-muted-foreground">Priority: {rec.priority}</p>}
                                    {rec.ttl && <p className="text-muted-foreground">TTL: {rec.ttl}</p>}
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyDnsRecord(rec.value || rec.data)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <p className="text-muted-foreground pt-2 font-sans">
                                Add these records to your DNS provider, then click "Check Verification."
                              </p>
                            </div>
                          )}
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
                        {domain.status === 'active' && (
                          <>
                            <DropdownMenuItem onClick={() => handleStartWarmup(domain.id)}><Flame className="h-4 w-4 mr-2" />Restart Warmup</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePause(domain.id)}><Pause className="h-4 w-4 mr-2" />Pause</DropdownMenuItem>
                          </>
                        )}
                        {domain.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleActivate(domain.id)}><Play className="h-4 w-4 mr-2" />Resume</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(domain.id)}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
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
            <p className="text-xs text-muted-foreground mt-1">Must match the domain name in Resend exactly</p>
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
            <p className="text-xs text-muted-foreground mt-1">Use a subdomain (e.g. mail.yourdomain.com) to protect your primary domain reputation</p>
          </div>
          <div>
            <Label>From Name</Label>
            <Input placeholder="John from Acme" value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>
          <div>
            <Label>Daily Send Limit (post-warmup)</Label>
            <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Warmup starts at 5/day and ramps up to this limit over 30 days</p>
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
