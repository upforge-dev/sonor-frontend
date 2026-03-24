import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, AlertCircle, Upload,
  RefreshCw, Search, CheckCircle, XCircle, MinusCircle
} from 'lucide-react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { StatTileGrid } from '@/components/ui/stat-tile'
import { OutreachStatusBadge } from '@/components/outreach/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { outreachApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

const RISK_LABELS = {
  valid: 'Valid',
  risky: 'Risky',
  invalid: 'Invalid',
  unknown: 'Unknown',
}

export default function OutreachVerificationTab() {
  const [stats, setStats] = useState(null)
  const [verifications, setVerifications] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [singleEmail, setSingleEmail] = useState('')
  const [singleResult, setSingleResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [bulkEmails, setBulkEmails] = useState('')
  const [bulkResults, setBulkResults] = useState(null)
  const [bulkVerifying, setBulkVerifying] = useState(false)
  const [filterLevel, setFilterLevel] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, listRes] = await Promise.all([
        outreachApi.getVerificationStats(),
        outreachApi.listVerifications({ risk_level: filterLevel || undefined, limit: 50 }),
      ])
      setStats(statsRes?.data || statsRes)
      const listData = listRes?.data || listRes
      setVerifications(listData.data || [])
      setTotalCount(listData.count || 0)
    } catch (err) {
      console.error('Failed to load verification data', err)
    } finally {
      setLoading(false)
    }
  }, [filterLevel])

  useEffect(() => { loadData() }, [loadData])

  const handleSingleVerify = async () => {
    if (!singleEmail) return
    setVerifying(true)
    setSingleResult(null)
    try {
      const res = await outreachApi.verifyEmail(singleEmail)
      setSingleResult(res?.data || res)
      loadData()
    } catch (err) {
      console.error('Verification failed', err)
    } finally {
      setVerifying(false)
    }
  }

  const handleBulkVerify = async () => {
    const emails = bulkEmails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (!emails.length) return
    setBulkVerifying(true)
    setBulkResults(null)
    try {
      const res = await outreachApi.verifyBulk(emails)
      setBulkResults(res?.data || res)
      loadData()
    } catch (err) {
      console.error('Bulk verification failed', err)
    } finally {
      setBulkVerifying(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Verify email addresses before sending to protect domain reputation
        </p>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <StatTileGrid
          columns={5}
          metrics={[
            { label: 'Total Verified', value: stats.total?.toLocaleString() || '0', icon: ShieldCheck, color: 'blue' },
            { label: 'Valid', value: stats.valid?.toLocaleString() || '0', icon: CheckCircle, color: 'green' },
            { label: 'Risky', value: stats.risky?.toLocaleString() || '0', icon: AlertCircle, color: 'orange' },
            { label: 'Invalid', value: stats.invalid?.toLocaleString() || '0', icon: XCircle, color: 'red' },
            { label: 'Unknown', value: stats.unknown?.toLocaleString() || '0', icon: MinusCircle, color: 'brand' },
          ]}
        />
      )}

      {/* Quick Verify + Bulk Verify */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Quick Verify</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={singleEmail}
                onChange={e => setSingleEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSingleVerify()}
              />
              <Button onClick={handleSingleVerify} disabled={verifying || !singleEmail}>
                {verifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {singleResult && (
              <div className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{singleResult.email}</span>
                  <OutreachStatusBadge
                    status={singleResult.risk_level}
                    label={RISK_LABELS[singleResult.risk_level] || singleResult.risk_level}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Score: <span className="font-medium">{singleResult.risk_score}/100</span></div>
                  <div>MX Valid: <span className="font-medium">{singleResult.mx_valid ? 'Yes' : 'No'}</span></div>
                  <div>SMTP: <span className="font-medium">{singleResult.smtp_valid === null ? 'N/A' : singleResult.smtp_valid ? 'Valid' : 'Invalid'}</span></div>
                  <div>Catch-all: <span className="font-medium">{singleResult.is_catch_all ? 'Yes' : 'No'}</span></div>
                  {singleResult.is_disposable && <div className="text-red-600 font-medium col-span-2">Disposable email domain</div>}
                  {singleResult.is_role_based && <div className="text-amber-600 font-medium col-span-2">Role-based address</div>}
                  {singleResult.failure_reason && <div className="text-red-600 col-span-2">{singleResult.failure_reason}</div>}
                </div>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Bulk Verify</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <Textarea
              placeholder="Paste emails (one per line, or comma/semicolon separated)"
              value={bulkEmails}
              onChange={e => setBulkEmails(e.target.value)}
              rows={3}
            />
            <Button onClick={handleBulkVerify} disabled={bulkVerifying || !bulkEmails.trim()} className="w-full">
              {bulkVerifying ? (
                <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Verify All</>
              )}
            </Button>
            {bulkResults && (
              <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><div className="text-lg font-bold">{bulkResults.stats.total}</div>Total</div>
                  <div><div className="text-lg font-bold text-emerald-500">{bulkResults.stats.valid}</div>Valid</div>
                  <div><div className="text-lg font-bold text-orange-500">{bulkResults.stats.risky}</div>Risky</div>
                  <div><div className="text-lg font-bold text-red-500">{bulkResults.stats.invalid}</div>Invalid</div>
                </div>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Verification History */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base">Verification History ({totalCount})</GlassCardTitle>
            <div className="flex gap-1">
              {['', 'valid', 'risky', 'invalid'].map(level => (
                <Button
                  key={level || 'all'}
                  variant={filterLevel === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterLevel(level)}
                  className="text-xs h-7"
                >
                  {level || 'All'}
                </Button>
              ))}
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {verifications.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-8 text-center">No verification results yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[var(--text-secondary)] text-xs">
                    <th className="text-left py-2 pr-4">Email</th>
                    <th className="text-left py-2 px-2">Domain</th>
                    <th className="text-center py-2 px-2">Score</th>
                    <th className="text-center py-2 px-2">Risk</th>
                    <th className="text-center py-2 px-2">MX</th>
                    <th className="text-center py-2 px-2">SMTP</th>
                    <th className="text-right py-2">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map(v => {
                    return (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{v.email}</td>
                        <td className="py-2 px-2 text-[var(--text-secondary)]">{v.domain}</td>
                        <td className="py-2 px-2 text-center font-medium">{v.risk_score}</td>
                        <td className="py-2 px-2 text-center">
                          <OutreachStatusBadge status={v.risk_level} label={RISK_LABELS[v.risk_level] || v.risk_level} />
                        </td>
                        <td className="py-2 px-2 text-center">{v.mx_valid ? '✓' : '✗'}</td>
                        <td className="py-2 px-2 text-center">{v.smtp_valid === null ? '—' : v.smtp_valid ? '✓' : '✗'}</td>
                        <td className="py-2 text-right text-xs text-[var(--text-secondary)]">
                          {new Date(v.verified_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
