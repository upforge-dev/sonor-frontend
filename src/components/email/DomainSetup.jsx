/**
 * DomainSetup — Self-serve Resend domain management for the Sonor Outreach module
 *
 * Two sections:
 * 1. Primary Sending Domain (single per project) — newsletters, campaigns, automations
 * 2. Cold Outreach Domains (multiple per project) — sequences, prospecting, rotation
 */
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Plus, Globe, CheckCircle2, XCircle, Trash2, Loader2,
  Copy, ChevronDown, ChevronUp, Mail, Shield, RefreshCw, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import SonorSpinner from '@/components/SonorLoading'

// ─────────────────────────────────────────────────────────────────────────────
// Status badge component
// ─────────────────────────────────────────────────────────────────────────────

function DomainStatusBadge({ verified, status }) {
  if (verified) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </Badge>
    )
  }
  if (status === 'not_started' || status === 'pending') {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
        <AlertCircle className="h-3 w-3" />
        Pending DNS
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
      <RefreshCw className="h-3 w-3" />
      {status || 'Checking'}
    </Badge>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DNS Records table
// ─────────────────────────────────────────────────────────────────────────────

function DnsRecordsTable({ records }) {
  if (!records || records.length === 0) return null

  const copyValue = (value) => {
    navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  // Label records by purpose
  const getRecordLabel = (rec) => {
    const name = (rec.name || rec.host || '').toLowerCase()
    const value = (rec.value || rec.data || '').toLowerCase()
    if (name.includes('domainkey') || name.includes('dkim')) return 'DKIM'
    if (value.includes('v=spf1') || value.includes('spf')) return 'SPF'
    if ((rec.type || rec.record_type) === 'MX') return 'Bounce'
    if (value.includes('dmarc')) return 'DMARC'
    return null
  }

  return (
    <div className="mt-3 space-y-2 bg-[var(--glass-bg-inset)] rounded-lg p-3 text-xs font-mono">
      <div className="grid grid-cols-[70px_60px_1fr_1fr_auto] gap-2 text-[var(--text-tertiary)] font-sans text-[10px] uppercase tracking-wider pb-1 border-b border-[var(--glass-border)]">
        <span>Type</span>
        <span>Purpose</span>
        <span>Name</span>
        <span>Value</span>
        <span>Status</span>
      </div>
      {records.map((rec, i) => {
        const recStatus = rec.status || 'pending'
        const isVerified = recStatus === 'verified' || recStatus === 'valid'
        const label = getRecordLabel(rec)
        return (
          <div key={i} className="grid grid-cols-[70px_60px_1fr_1fr_auto] gap-2 items-start">
            <Badge variant="outline" className="text-[10px] h-5 w-fit">{rec.type || rec.record_type}</Badge>
            {label ? (
              <span className="text-[10px] font-sans font-medium text-[var(--brand-primary)]">{label}</span>
            ) : (
              <span />
            )}
            <span className="text-[var(--text-secondary)] break-all">{rec.name || rec.host}</span>
            <div className="flex items-start gap-1">
              <span className="text-[var(--text-primary)] break-all flex-1">{rec.value || rec.data}</span>
              <button
                onClick={() => copyValue(rec.value || rec.data)}
                className="p-0.5 hover:bg-[var(--glass-bg-hover)] rounded shrink-0 mt-0.5"
              >
                <Copy className="h-3 w-3 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div>
              {isVerified ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
          </div>
        )
      })}
      <p className="text-[var(--text-secondary)] pt-2 font-sans text-xs">
        Add these records to your DNS provider, then click "Verify" to check propagation.
      </p>
      <p className="text-[var(--text-tertiary)] font-sans text-[11px]">
        Tip: Also add a DMARC record (<code className="text-[var(--text-secondary)]">_dmarc.yourdomain.com</code> → <code className="text-[var(--text-secondary)]">v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com</code>) for maximum deliverability.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary Domain Section
// ─────────────────────────────────────────────────────────────────────────────

function PrimaryDomainSection() {
  const { currentProject } = useAuthStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showDns, setShowDns] = useState(false)

  const projectId = currentProject?.id

  const fetchDomain = useCallback(async () => {
    if (!projectId) return
    try {
      const { data: result } = await emailApi.getPrimaryDomain(projectId)
      setData(result)
    } catch (err) {
      console.error('Failed to load primary domain:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchDomain() }, [fetchDomain])

  const handleAdd = async () => {
    if (!domain.trim()) return
    setSaving(true)
    try {
      await emailApi.setupPrimaryDomain(domain.trim(), projectId)
      toast.success('Domain registered -- configure DNS records to verify')
      setShowAdd(false)
      setDomain('')
      fetchDomain()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add domain')
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const { data: result } = await emailApi.verifyPrimaryDomain(projectId)
      if (result?.verified || result?.status === 'verified') {
        toast.success('Domain verified and ready to send!')
      } else {
        toast.warning('DNS records not yet propagated. Try again in a few minutes.', {
          description: 'Make sure all DNS records are added to your domain provider.',
        })
      }
      fetchDomain()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await emailApi.removePrimaryDomain(projectId)
      toast.success('Primary domain removed')
      setData(null)
      fetchDomain()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove domain')
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-[var(--text-secondary)]" />
            <h3 className="text-base font-semibold">Primary Sending Domain</h3>
          </div>
          <div className="flex justify-center py-8">
            <SonorSpinner size="sm" />
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Not configured
  if (!data?.configured) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--brand-primary)]/10">
                <Mail className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Primary Sending Domain</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  For newsletters, campaigns, and automations
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[var(--glass-bg-inset)] border border-dashed border-[var(--glass-border)]">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              No sending domain configured. Add a domain to send branded emails from your own address.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Domain
            </Button>
          </div>

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Primary Sending Domain</DialogTitle>
                <DialogDescription>
                  Enter the domain you want to send marketing emails from. Use a subdomain like mail.yourdomain.com to protect your primary domain reputation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Domain</Label>
                  <Input
                    placeholder="mail.yourdomain.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    This will be registered with Resend. You will need to add DNS records to verify ownership.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!domain.trim() || saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Domain
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Configured
  return (
    <GlassCard className={data.verified ? 'border-emerald-500/20' : 'border-amber-500/20'}>
      <GlassCardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${data.verified ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
              <Mail className={`h-5 w-5 ${data.verified ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className="text-base font-semibold">Primary Sending Domain</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                For newsletters, campaigns, and automations
              </p>
            </div>
          </div>
          <DomainStatusBadge verified={data.verified} status={data.status} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="font-medium">{data.domain}</span>
            {data.verified && (
              <span className="text-xs text-[var(--text-secondary)]">noreply@{data.domain}</span>
            )}
          </div>
          <div className="flex gap-2">
            {!data.verified && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDns(!showDns)}
                  className="gap-1"
                >
                  {showDns ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  DNS Records
                </Button>
                <Button
                  size="sm"
                  onClick={handleVerify}
                  disabled={verifying}
                  className="gap-1"
                >
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                  Verify
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="text-destructive hover:text-destructive gap-1"
            >
              {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Remove
            </Button>
          </div>
        </div>

        {showDns && data.records?.length > 0 && (
          <DnsRecordsTable records={data.records} />
        )}
        {showDns && (!data.records || data.records.length === 0) && (
          <div className="mt-3 text-xs text-[var(--text-secondary)] bg-[var(--glass-bg)] rounded-lg p-3">
            No DNS records available yet. Click &quot;Verify&quot; to fetch records from Resend.
          </div>
        )}

        {data.verified && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/5 rounded-lg p-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Domain is verified and ready to send emails
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Outreach Domains Section
// ─────────────────────────────────────────────────────────────────────────────

function OutreachDomainsSection() {
  const { currentProject } = useAuthStore()
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedDns, setExpandedDns] = useState(null)
  const [verifyingId, setVerifyingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  const projectId = currentProject?.id

  const fetchDomains = useCallback(async () => {
    if (!projectId) return
    try {
      const { data } = await emailApi.getOutreachDomains(projectId)
      setDomains(data || [])
    } catch (err) {
      console.error('Failed to load outreach domains:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchDomains() }, [fetchDomains])

  const handleAdd = async () => {
    if (!newDomain.trim()) return
    setSaving(true)
    try {
      await emailApi.addOutreachDomain(newDomain.trim(), projectId)
      toast.success('Outreach domain registered -- configure DNS records to verify')
      setShowAdd(false)
      setNewDomain('')
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add outreach domain')
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async (resendId) => {
    setVerifyingId(resendId)
    try {
      const { data: result } = await emailApi.verifyOutreachDomain(resendId, projectId)
      if (result?.verified) {
        toast.success('Outreach domain verified!')
      } else {
        toast.info('DNS records not yet propagated. Try again in a few minutes.')
      }
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleRemove = async (resendId) => {
    setRemovingId(resendId)
    try {
      await emailApi.removeOutreachDomain(resendId, projectId)
      toast.success('Outreach domain removed')
      fetchDomains()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove domain')
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-[var(--text-secondary)]" />
            <h3 className="text-base font-semibold">Cold Outreach Domains</h3>
          </div>
          <div className="flex justify-center py-8">
            <SonorSpinner size="sm" />
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <GlassCardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Cold Outreach Domains</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Multiple domains for sequences and prospecting. Rotated for deliverability.
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Domain
          </Button>
        </div>

        {domains.length === 0 ? (
          <div className="p-4 rounded-lg bg-[var(--glass-bg-inset)] border border-dashed border-[var(--glass-border)] text-center">
            <Globe className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)] mb-1">No outreach domains configured</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Add dedicated domains for cold outreach to protect your primary domain reputation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => {
              const isExpanded = expandedDns === d.resend_id
              return (
                <div
                  key={d.resend_id}
                  className="p-3 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="font-medium flex-1">{d.domain}</span>
                    <DomainStatusBadge verified={d.verified} status={d.status} />

                    {!d.verified && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedDns(isExpanded ? null : d.resend_id)}
                          className="gap-1 h-7 text-xs"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          DNS
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerify(d.resend_id)}
                          disabled={verifyingId === d.resend_id}
                          className="gap-1 h-7 text-xs"
                        >
                          {verifyingId === d.resend_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          Verify
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(d.resend_id)}
                      disabled={removingId === d.resend_id}
                      className="text-destructive hover:text-destructive h-7 text-xs gap-1"
                    >
                      {removingId === d.resend_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Created date */}
                  <div className="mt-1 text-[10px] text-[var(--text-tertiary)] pl-7">
                    Added {new Date(d.created_at).toLocaleDateString()}
                  </div>

                  {isExpanded && <DnsRecordsTable records={d.records} />}
                </div>
              )
            })}
          </div>
        )}

        {/* Add dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Cold Outreach Domain</DialogTitle>
              <DialogDescription>
                Use a dedicated subdomain for cold outreach (e.g. outreach.yourdomain.com) to keep your primary domain reputation separate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Domain</Label>
                <Input
                  placeholder="outreach.yourdomain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newDomain.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </GlassCardContent>
    </GlassCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

export default function DomainSetup() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Domain Management</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure sending domains for marketing emails and cold outreach. Each domain must be verified with DNS records before sending.
        </p>
      </div>
      <PrimaryDomainSection />
      <OutreachDomainsSection />
    </div>
  )
}
