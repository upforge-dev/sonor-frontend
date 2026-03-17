import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertCircle, Upload,
  RefreshCw, Search, CheckCircle, XCircle, MinusCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { outreachApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

const RISK_CONFIG = {
  valid: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Valid' },
  risky: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle, label: 'Risky' },
  invalid: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Invalid' },
  unknown: { color: 'bg-gray-100 text-gray-700', icon: MinusCircle, label: 'Unknown' },
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
        <div>
          <h2 className="text-xl font-semibold">Email Verification</h2>
          <p className="text-sm text-muted-foreground">
            Verify email addresses before sending to protect domain reputation
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Verified', value: stats.total, icon: ShieldCheck, color: 'text-blue-600' },
            { label: 'Valid', value: stats.valid, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'Risky', value: stats.risky, icon: AlertCircle, color: 'text-amber-600' },
            { label: 'Invalid', value: stats.invalid, icon: XCircle, color: 'text-red-600' },
            { label: 'Unknown', value: stats.unknown, icon: MinusCircle, color: 'text-gray-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-4 w-4', color)} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <div className="text-xl font-bold">{value?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Verify + Bulk Verify */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  <Badge className={cn('text-xs', RISK_CONFIG[singleResult.risk_level]?.color)}>
                    {RISK_CONFIG[singleResult.risk_level]?.label || singleResult.risk_level}
                  </Badge>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bulk Verify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><div className="text-lg font-bold">{bulkResults.stats.total}</div>Total</div>
                  <div><div className="text-lg font-bold text-emerald-600">{bulkResults.stats.valid}</div>Valid</div>
                  <div><div className="text-lg font-bold text-amber-600">{bulkResults.stats.risky}</div>Risky</div>
                  <div><div className="text-lg font-bold text-red-600">{bulkResults.stats.invalid}</div>Invalid</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Verification History ({totalCount})</CardTitle>
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
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No verification results yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
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
                    const cfg = RISK_CONFIG[v.risk_level] || RISK_CONFIG.unknown
                    return (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{v.email}</td>
                        <td className="py-2 px-2 text-muted-foreground">{v.domain}</td>
                        <td className="py-2 px-2 text-center font-medium">{v.risk_score}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge className={cn('text-xs', cfg.color)}>{cfg.label}</Badge>
                        </td>
                        <td className="py-2 px-2 text-center">{v.mx_valid ? '✓' : '✗'}</td>
                        <td className="py-2 px-2 text-center">{v.smtp_valid === null ? '—' : v.smtp_valid ? '✓' : '✗'}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {new Date(v.verified_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
