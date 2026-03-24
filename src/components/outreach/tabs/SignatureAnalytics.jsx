import { useState, useEffect, useMemo } from 'react'
import {
  MousePointerClick, CalendarDays, TrendingUp, Percent,
  Globe, CalendarCheck, Linkedin, Twitter, Instagram, Facebook,
  Image, RefreshCw, ExternalLink, FlaskConical, Trophy,
  Users, BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatTileGrid, TILE_BASE } from '@/components/ui/stat-tile'
import { outreachApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

// ─── Mock data (used until backend endpoints exist) ────────────────────
const MOCK_TIMELINE = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    date: d.toISOString().slice(0, 10),
    clicks: Math.floor(Math.random() * 40) + 5,
  }
})

const LINK_TYPE_ICONS = {
  website: Globe,
  booking: CalendarCheck,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  promo_banner: Image,
}

const LINK_TYPE_COLORS = {
  website: 'var(--brand-primary, #6366f1)',
  booking: '#10b981',
  linkedin: '#0a66c2',
  twitter: '#1da1f2',
  instagram: '#e1306c',
  facebook: '#1877f2',
  promo_banner: '#f59e0b',
}

const MOCK_BY_TYPE = [
  { link_type: 'website', count: 312, pct: 38 },
  { link_type: 'booking', count: 187, pct: 23 },
  { link_type: 'linkedin', count: 124, pct: 15 },
  { link_type: 'promo_banner', count: 89, pct: 11 },
  { link_type: 'twitter', count: 56, pct: 7 },
  { link_type: 'instagram', count: 34, pct: 4 },
  { link_type: 'facebook', count: 18, pct: 2 },
]

const MOCK_TOP_SIGNATURES = [
  { id: '1', name: 'Primary Brand', template: 'Modern Dark', total_clicks: 284, booking_clicks: 92, last_click: '2026-03-22T14:32:00Z' },
  { id: '2', name: 'Sales Team', template: 'Minimal Light', total_clicks: 198, booking_clicks: 67, last_click: '2026-03-21T09:15:00Z' },
  { id: '3', name: 'Support', template: 'Compact', total_clicks: 142, booking_clicks: 28, last_click: '2026-03-20T16:45:00Z' },
  { id: '4', name: 'Executive', template: 'Professional', total_clicks: 96, booking_clicks: 41, last_click: '2026-03-19T11:20:00Z' },
]

const MOCK_TEAM = [
  { id: '1', name: 'Alex Rivera', avatar: null, total_clicks: 187, top_link_type: 'booking' },
  { id: '2', name: 'Jordan Chen', avatar: null, total_clicks: 142, top_link_type: 'website' },
  { id: '3', name: 'Sam Patel', avatar: null, total_clicks: 98, top_link_type: 'linkedin' },
  { id: '4', name: 'Taylor Kim', avatar: null, total_clicks: 73, top_link_type: 'website' },
]

const MOCK_OVERVIEW = {
  total_clicks: 820,
  clicks_this_month: 312,
  booking_conversions: 187,
  click_through_rate: 4.2,
  total_change: 12.4,
  month_change: 8.1,
  booking_change: 15.3,
  ctr_change: 1.8,
}

// ─── Helpers ───────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function humanizeType(type) {
  const map = {
    website: 'Website',
    booking: 'Booking',
    linkedin: 'LinkedIn',
    twitter: 'Twitter',
    instagram: 'Instagram',
    facebook: 'Facebook',
    promo_banner: 'Promo Banner',
  }
  return map[type] || type
}

// ─── Custom chart tooltip ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={cn(TILE_BASE, 'px-3 py-2 text-xs')}>
      <p className="font-medium text-[var(--text-primary)]">{formatDateShort(label)}</p>
      <p className="text-[var(--text-secondary)]">{payload[0].value} clicks</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────
export default function SignatureAnalytics({ onViewSignature }) {
  const [overview, setOverview] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [byType, setByType] = useState([])
  const [topSignatures, setTopSignatures] = useState([])
  const [teamStats, setTeamStats] = useState([])
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, timelineRes, byTypeRes] = await Promise.all([
        outreachApi.getSignatureAnalytics({ days: parseInt(days) }).catch(() => null),
        outreachApi.getSignatureClicksTimeline({ days: parseInt(days) }).catch(() => null),
        outreachApi.getSignatureClicksByType({ days: parseInt(days) }).catch(() => null),
      ])

      const analytics = analyticsRes?.data || analyticsRes
      const tl = timelineRes?.data || timelineRes
      const bt = byTypeRes?.data || byTypeRes

      // Use real data if available, otherwise fall back to mocks
      setOverview(analytics || MOCK_OVERVIEW)
      setTimeline(tl?.length ? tl : MOCK_TIMELINE)
      setByType(bt?.length ? bt : MOCK_BY_TYPE)
      setTopSignatures(analytics?.top_signatures || MOCK_TOP_SIGNATURES)
      setTeamStats(analytics?.team_stats || MOCK_TEAM)
    } catch {
      // Graceful fallback to mock data
      setOverview(MOCK_OVERVIEW)
      setTimeline(MOCK_TIMELINE)
      setByType(MOCK_BY_TYPE)
      setTopSignatures(MOCK_TOP_SIGNATURES)
      setTeamStats(MOCK_TEAM)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [days])

  const statMetrics = useMemo(() => {
    if (!overview) return []
    return [
      {
        key: 'total',
        label: 'Total Clicks',
        value: overview.total_clicks?.toLocaleString() || '0',
        icon: MousePointerClick,
        color: 'brand',
        change: overview.total_change,
        trend: overview.total_change > 0 ? 'up' : overview.total_change < 0 ? 'down' : 'neutral',
      },
      {
        key: 'month',
        label: 'Clicks This Month',
        value: overview.clicks_this_month?.toLocaleString() || '0',
        icon: CalendarDays,
        color: 'blue',
        change: overview.month_change,
        trend: overview.month_change > 0 ? 'up' : overview.month_change < 0 ? 'down' : 'neutral',
      },
      {
        key: 'booking',
        label: 'Booking Conversions',
        value: overview.booking_conversions?.toLocaleString() || '0',
        icon: CalendarCheck,
        color: 'green',
        change: overview.booking_change,
        trend: overview.booking_change > 0 ? 'up' : overview.booking_change < 0 ? 'down' : 'neutral',
      },
      {
        key: 'ctr',
        label: 'Click-Through Rate',
        value: `${overview.click_through_rate || 0}%`,
        icon: Percent,
        color: 'purple',
        change: overview.ctr_change,
        trend: overview.ctr_change > 0 ? 'up' : overview.ctr_change < 0 ? 'down' : 'neutral',
      },
    ]
  }, [overview])

  const maxTypeCount = useMemo(
    () => Math.max(...byType.map(t => t.count), 1),
    [byType]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Signature Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track click performance across your email signatures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stat Tiles */}
      <StatTileGrid metrics={statMetrics} columns={4} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clicks Over Time */}
        <Card className={cn(TILE_BASE, 'lg:col-span-2 border-0')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Clicks Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="var(--brand-primary, #6366f1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--brand-primary, #6366f1)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Click Breakdown by Type */}
        <Card className={cn(TILE_BASE, 'border-0')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Clicks by Link Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byType.map(item => {
              const TypeIcon = LINK_TYPE_ICONS[item.link_type] || Globe
              const barColor = LINK_TYPE_COLORS[item.link_type] || 'var(--brand-primary)'
              const widthPct = (item.count / maxTypeCount) * 100
              return (
                <div key={item.link_type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-3.5 w-3.5" style={{ color: barColor }} />
                      <span className="text-[var(--text-secondary)]">{humanizeType(item.link_type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{item.count}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(widthPct, 2)}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Signatures */}
      <Card className={cn(TILE_BASE, 'border-0')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Top Performing Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSignatures.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No signature click data yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Signature</th>
                    <th className="text-left py-2 px-2 font-medium">Template</th>
                    <th className="text-right py-2 px-2 font-medium">Total Clicks</th>
                    <th className="text-right py-2 px-2 font-medium">Booking Clicks</th>
                    <th className="text-right py-2 px-2 font-medium">Last Click</th>
                    <th className="text-right py-2 pl-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {topSignatures.map((sig, i) => (
                    <tr
                      key={sig.id}
                      className={cn(
                        'border-b last:border-0 transition-colors',
                        onViewSignature && 'hover:bg-muted/50 cursor-pointer'
                      )}
                      onClick={() => onViewSignature?.(sig.id)}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {i === 0 && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-500">
                              #1
                            </Badge>
                          )}
                          <span className="font-medium text-[var(--text-primary)]">{sig.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{sig.template}</td>
                      <td className="text-right py-3 px-2 font-medium">{sig.total_clicks.toLocaleString()}</td>
                      <td className="text-right py-3 px-2">
                        <span className="text-emerald-600 font-medium">{sig.booking_clicks.toLocaleString()}</span>
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{formatDate(sig.last_click)}</td>
                      <td className="text-right py-3 pl-2">
                        {onViewSignature && (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground inline-block" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Member Stats */}
      {teamStats.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team Member Stats
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {teamStats.map(member => {
              const TopIcon = LINK_TYPE_ICONS[member.top_link_type] || Globe
              const topColor = LINK_TYPE_COLORS[member.top_link_type] || 'var(--brand-primary)'
              return (
                <div key={member.id} className={cn(TILE_BASE, 'p-4')}>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-9 w-9">
                      {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                      <AvatarFallback className="text-xs bg-muted">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.total_clicks} clicks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TopIcon className="h-3 w-3" style={{ color: topColor }} />
                    <span>Top: {humanizeType(member.top_link_type)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* A/B Test Results (placeholder) */}
      <Card className={cn(TILE_BASE, 'border-0')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            A/B Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">No A/B tests running</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Create signature variants to test which layouts and CTAs drive the most clicks.
              Results will appear here once an A/B test is active.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
