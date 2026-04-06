/**
 * CampaignAnalytics — Real campaign analytics wired to Resend webhook data.
 * Glass design system: GlassCard, StatTile, CSS variables, SonorSpinner.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { StatTile, StatTileGrid } from '@/components/ui/stat-tile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import SonorSpinner from '@/components/SonorLoading'
import {
  ArrowLeft,
  TrendingUp,
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Link2,
} from 'lucide-react'
import { emailApi } from '@/lib/sonor-api'

// ─── Sparkline (SVG) ─────────────────────────────────────────────────────────

function Sparkline({ data, color = 'var(--brand-primary)', height = 40 }) {
  if (!data?.length) return <div style={{ height }} />

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const h = height
  const padding = 2

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - padding - ((val - min) / range) * (h - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRate(value) {
  return `${(value || 0).toFixed(1)}%`
}

function truncateUrl(url) {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    return `${u.hostname}${path}`.slice(0, 50)
  } catch {
    return url?.slice(0, 50) || ''
  }
}

// ─── Industry benchmarks (configurable, later from Signal) ───────────────────

const INDUSTRY_AVG = {
  open_rate: 21.5,
  click_rate: 2.6,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignAnalytics({ campaign, onBack }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientSort, setRecipientSort] = useState({ field: 'sent_at', dir: 'desc' })
  const [showAllRecipients, setShowAllRecipients] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    if (!campaign?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await emailApi.getCampaignAnalytics(campaign.id)
      setAnalytics(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [campaign?.id])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  // CSV export
  const handleExport = useCallback(() => {
    if (!analytics?.recipients?.length) return
    const headers = ['Email', 'Name', 'Status', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Opens', 'Clicks']
    const rows = analytics.recipients.map(r => [
      r.email, r.name || '', r.status, r.sent_at || '', r.delivered_at || '',
      r.opened_at || '', r.clicked_at || '', r.open_count || 0, r.click_count || 0,
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-${campaign?.name || 'export'}-analytics.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [analytics, campaign])

  const summary = analytics?.summary || {}

  // Filtered + sorted recipients
  const filteredRecipients = useMemo(() => {
    let list = analytics?.recipients || []
    if (recipientSearch) {
      const q = recipientSearch.toLowerCase()
      list = list.filter(r => r.email?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q))
    }
    list = [...list].sort((a, b) => {
      const aVal = a[recipientSort.field] || ''
      const bVal = b[recipientSort.field] || ''
      return recipientSort.dir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
    })
    return showAllRecipients ? list : list.slice(0, 25)
  }, [analytics?.recipients, recipientSearch, recipientSort, showAllRecipients])

  // Opens/clicks timeline data for sparklines
  const opensSparkData = useMemo(() => (analytics?.opens_timeline || []).map(t => t.count), [analytics])
  const clicksSparkData = useMemo(() => (analytics?.clicks_timeline || []).map(t => t.count), [analytics])

  // Rate comparison to industry
  const openRateDelta = (summary.open_rate || 0) - INDUSTRY_AVG.open_rate
  const clickRateDelta = (summary.click_rate || 0) - INDUSTRY_AVG.click_rate

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading && !analytics) {
    return (
      <div className="flex flex-col h-full">
        <Header campaign={campaign} onBack={onBack} onRefresh={fetchAnalytics} onExport={handleExport} loading />
        <div className="flex-1 flex items-center justify-center">
          <SonorSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <div className="flex flex-col h-full">
        <Header campaign={campaign} onBack={onBack} onRefresh={fetchAnalytics} onExport={handleExport} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p className="text-[var(--text-secondary)]">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchAnalytics}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[var(--glass-bg)]">
      <Header
        campaign={campaign}
        onBack={onBack}
        onRefresh={fetchAnalytics}
        onExport={handleExport}
        loading={loading}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Metric Tiles ──────────────────────────────────────── */}
          <StatTileGrid columns={5}>
            <StatTile
              icon={Mail}
              iconColor="brand"
              label="Delivered"
              value={summary.emails_delivered?.toLocaleString() || '0'}
              subtext={`${summary.emails_sent?.toLocaleString() || 0} sent`}
            />
            <StatTile
              icon={Eye}
              iconColor="blue"
              label="Opens"
              value={summary.unique_opens?.toLocaleString() || '0'}
              subtext={formatRate(summary.open_rate)}
              trend={opensSparkData.length > 1 ? <Sparkline data={opensSparkData} color="var(--color-blue-500, #3b82f6)" height={32} /> : null}
            />
            <StatTile
              icon={MousePointerClick}
              iconColor="purple"
              label="Clicks"
              value={summary.unique_clicks?.toLocaleString() || '0'}
              subtext={formatRate(summary.click_rate)}
              trend={clicksSparkData.length > 1 ? <Sparkline data={clicksSparkData} color="var(--color-purple-500, #8b5cf6)" height={32} /> : null}
            />
            <StatTile
              icon={AlertTriangle}
              iconColor="orange"
              label="Bounced"
              value={summary.bounced?.toLocaleString() || '0'}
              subtext={formatRate(summary.bounce_rate)}
            />
            <StatTile
              icon={ShieldAlert}
              iconColor="green"
              label="Complaints"
              value={summary.complained?.toLocaleString() || '0'}
              subtext={formatRate(summary.complaint_rate)}
            />
          </StatTileGrid>

          {/* ── Performance vs Industry ────────────────────────────── */}
          <GlassCard>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Performance vs Industry</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">How you compare to industry averages</p>
                </div>
                <Badge variant="outline" className={openRateDelta >= 0 && clickRateDelta >= 0 ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}>
                  {openRateDelta >= 0 && clickRateDelta >= 0 ? 'Outperforming' : 'Needs Attention'}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Open Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[var(--text-primary)]">Open Rate</span>
                    <span className="text-[var(--text-tertiary)]">Industry: {INDUSTRY_AVG.open_rate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--glass-bg-inset)] overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((summary.open_rate || 0), 100)}%`,
                        background: `linear-gradient(90deg, var(--brand-primary), var(--color-blue-500, #3b82f6))`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>{formatRate(summary.open_rate)}</span>
                    {openRateDelta !== 0 && (
                      <span className={`text-xs font-medium ${openRateDelta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {openRateDelta > 0 ? '+' : ''}{openRateDelta.toFixed(1)}% vs avg
                      </span>
                    )}
                  </div>
                </div>

                {/* Click Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[var(--text-primary)]">Click Rate</span>
                    <span className="text-[var(--text-tertiary)]">Industry: {INDUSTRY_AVG.click_rate}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--glass-bg-inset)] overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((summary.click_rate || 0) * 4, 100)}%`,
                        background: `linear-gradient(90deg, var(--brand-primary), var(--color-purple-500, #8b5cf6))`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>{formatRate(summary.click_rate)}</span>
                    {clickRateDelta !== 0 && (
                      <span className={`text-xs font-medium ${clickRateDelta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {clickRateDelta > 0 ? '+' : ''}{clickRateDelta.toFixed(1)}% vs avg
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* ── Link Click Heatmap ────────────────────────────────── */}
          {analytics?.top_links?.length > 0 && (
            <GlassCard>
              <GlassCardContent className="p-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Link Click Heatmap</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">Which links got the most engagement</p>

                <div className="space-y-3">
                  {analytics.top_links.map((link, i) => {
                    const maxClicks = analytics.top_links[0]?.clicks || 1
                    const pct = (link.clicks / maxClicks) * 100
                    // Color gradient from brand red (hot) to blue (cool)
                    const hue = 240 - (pct / 100) * 120

                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-primary)] truncate">{truncateUrl(link.url)}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate">{link.url}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-20 h-1.5 rounded-full bg-[var(--glass-bg-inset)] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 70%, 55%)` }} />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)] w-10 text-right">{link.clicks}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">clicks</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          {/* ── Recipients Table ───────────────────────────────────── */}
          <GlassCard>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Recipients</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{analytics?.recipients?.length || 0} total</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  <Input
                    placeholder="Search recipients..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-9 h-8 text-sm glass-inset"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--glass-border)]">
                      {[
                        { key: 'email', label: 'Email' },
                        { key: 'status', label: 'Status' },
                        { key: 'opened_at', label: 'Opened' },
                        { key: 'clicked_at', label: 'Clicked' },
                        { key: 'open_count', label: 'Opens' },
                        { key: 'click_count', label: 'Clicks' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="text-left py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]"
                          onClick={() => setRecipientSort(prev => ({
                            field: col.key,
                            dir: prev.field === col.key && prev.dir === 'desc' ? 'asc' : 'desc',
                          }))}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {recipientSort.field === col.key && (
                              recipientSort.dir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipients.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--glass-border)] last:border-0 hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{r.email}</p>
                            {r.name && <p className="text-[11px] text-[var(--text-tertiary)]">{r.name}</p>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <RecipientStatus status={r.status} bounced={!!r.bounced_at} complained={!!r.complained_at} />
                        </td>
                        <td className="py-2.5 px-3">
                          {r.opened_at ? (
                            <span className="text-emerald-500 text-xs">{new Date(r.opened_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          ) : (
                            <span className="text-[var(--text-tertiary)] text-xs">--</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.clicked_at ? (
                            <span className="text-blue-400 text-xs">{new Date(r.clicked_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          ) : (
                            <span className="text-[var(--text-tertiary)] text-xs">--</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[var(--text-secondary)]">{r.open_count || 0}</td>
                        <td className="py-2.5 px-3 text-center text-[var(--text-secondary)]">{r.click_count || 0}</td>
                      </tr>
                    ))}
                    {filteredRecipients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[var(--text-tertiary)]">
                          {recipientSearch ? 'No matching recipients' : 'No recipient data yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(analytics?.recipients?.length || 0) > 25 && !showAllRecipients && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs text-[var(--text-tertiary)]"
                  onClick={() => setShowAllRecipients(true)}
                >
                  Show all {analytics.recipients.length} recipients
                </Button>
              )}
            </GlassCardContent>
          </GlassCard>

        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Header({ campaign, onBack, onRefresh, onExport, loading }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">{campaign?.name || 'Campaign Analytics'}</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            {campaign?.sent_at ? `Sent ${formatDate(campaign.sent_at)}` : 'Draft'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  )
}

function RecipientStatus({ status, bounced, complained }) {
  if (complained) {
    return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Complained</Badge>
  }
  if (bounced) {
    return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">Bounced</Badge>
  }
  if (status === 'delivered' || status === 'sent') {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Delivered</Badge>
  }
  if (status === 'failed') {
    return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Failed</Badge>
  }
  if (status === 'queued') {
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Queued</Badge>
  }
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>
}
