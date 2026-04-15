import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Send, Eye, Reply, AlertTriangle,
  ArrowDown, ArrowUp, Minus, RefreshCw, Calendar
} from 'lucide-react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { StatTile, StatTileGrid } from '@/components/ui/stat-tile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OutreachStatusBadge, OutreachLoading } from '@/components/outreach/ui'
import { outreachApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

function FunnelBar({ label, value, maxValue, color = 'bg-[var(--brand-primary)]' }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  )
}

export default function OutreachAnalyticsTab() {
  const [overview, setOverview] = useState(null)
  const [domainData, setDomainData] = useState([])
  const [sequences, setSequences] = useState([])
  const [selectedSequence, setSelectedSequence] = useState(null)
  const [sequenceAnalytics, setSequenceAnalytics] = useState(null)
  const [narrativeBreakdown, setNarrativeBreakdown] = useState([])
  const [mailboxBreakdown, setMailboxBreakdown] = useState([])
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ov, dom, seq, narrBreak, mailBreak] = await Promise.all([
        outreachApi.getAnalyticsOverview(parseInt(days)),
        outreachApi.getDomainAnalytics(),
        outreachApi.listSequences(),
        outreachApi.getNarrativeBreakdown(parseInt(days)).catch(() => ({ data: [] })),
        outreachApi.getMailboxBreakdown(parseInt(days)).catch(() => ({ data: [] })),
      ])
      setOverview(ov?.data || ov)
      setDomainData(dom?.data || dom || [])
      const seqList = seq?.data || seq || []
      setSequences(seqList)
      if (seqList.length > 0 && !selectedSequence) setSelectedSequence(seqList[0].id)
      setNarrativeBreakdown(narrBreak?.data || narrBreak || [])
      setMailboxBreakdown(mailBreak?.data || mailBreak || [])
    } catch (err) {
      console.error('Failed to load analytics', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSequenceAnalytics = async (seqId) => {
    if (!seqId) return
    try {
      const res = await outreachApi.getSequenceAnalytics(seqId)
      setSequenceAnalytics(res?.data || res)
    } catch { setSequenceAnalytics(null) }
  }

  useEffect(() => { loadData() }, [days])
  useEffect(() => { if (selectedSequence) loadSequenceAnalytics(selectedSequence) }, [selectedSequence])

  if (loading || !overview) {
    return <OutreachLoading />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Performance metrics across all sequences and domains</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
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

      {/* Overview Stats */}
      <StatTileGrid>
        <StatTile label="Sent" value={overview.total_sent?.toLocaleString() || '0'} icon={Send} color="blue" />
        <StatTile label="Delivered" value={`${overview.delivery_rate}%`} icon={TrendingUp} color="teal" />
        <StatTile label="Open Rate" value={`${overview.open_rate}%`} icon={Eye} color="brand" />
        <StatTile label="Click Rate" value={`${overview.click_rate}%`} icon={BarChart3} color="purple" />
        <StatTile label="Bounce Rate" value={`${overview.bounce_rate}%`} icon={AlertTriangle} color="amber" />
        <StatTile label="Reply Rate" value={`${overview.reply_rate}%`} icon={Reply} color="teal" />
      </StatTileGrid>

      {/* Funnel + Domain Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Delivery Funnel</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <FunnelBar label="Sent" value={overview.total_sent} maxValue={overview.total_sent} color="bg-[var(--brand-primary)]" />
            <FunnelBar label="Delivered" value={overview.total_delivered} maxValue={overview.total_sent} color="bg-[var(--status-success)]" />
            <FunnelBar label="Opened" value={overview.total_opened} maxValue={overview.total_sent} color="bg-[var(--status-warning)]" />
            <FunnelBar label="Clicked" value={overview.total_clicked} maxValue={overview.total_sent} color="bg-purple-500" />
            <FunnelBar label="Replied" value={overview.total_replied} maxValue={overview.total_sent} color="bg-[var(--status-success)]" />
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Domain Health</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {domainData.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-6 text-center">No domains configured</p>
            ) : (
              <div className="space-y-3">
                {domainData.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium">{d.domain}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {d.sent_today}/{d.daily_limit} today &middot; {d.total_sent} total
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <OutreachStatusBadge status={d.status} />
                      <div className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded',
                        d.health_score >= 80 ? 'bg-[var(--status-success)]/15 text-[var(--status-success)]' :
                        d.health_score >= 50 ? 'bg-[var(--status-warning)]/15 text-[var(--status-warning)]' :
                        'bg-[var(--status-error)]/15 text-[var(--status-error)]'
                      )}>
                        {d.health_score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Sequence Analytics */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base">Sequence Performance</GlassCardTitle>
            <Select value={selectedSequence || ''} onValueChange={setSelectedSequence}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select a sequence" />
              </SelectTrigger>
              <SelectContent>
                {sequences.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {!sequenceAnalytics ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">Select a sequence to view analytics</p>
          ) : (
            <div className="space-y-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-[var(--glass-bg)] rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_enrolled}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Enrolled</div>
                </div>
                <div className="text-center p-3 bg-[var(--glass-bg)] rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_active}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Active</div>
                </div>
                <div className="text-center p-3 bg-[var(--glass-bg)] rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_replied}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Replied</div>
                </div>
                <div className="text-center p-3 bg-[var(--glass-bg)] rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_completed}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Completed</div>
                </div>
                <div className="text-center p-3 bg-[var(--glass-bg)] rounded-lg">
                  <div className="text-lg font-bold text-[var(--status-success)]">{sequenceAnalytics.reply_rate}%</div>
                  <div className="text-xs text-[var(--text-secondary)]">Reply Rate</div>
                </div>
              </div>

              {/* Per-step metrics */}
              {sequenceAnalytics.steps?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Per-Step Metrics</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--glass-border)] text-[var(--text-secondary)]">
                          <th className="text-left py-2 pr-4">Step</th>
                          <th className="text-right py-2 px-2">Sent</th>
                          <th className="text-right py-2 px-2">Delivered</th>
                          <th className="text-right py-2 px-2">Opened</th>
                          <th className="text-right py-2 px-2">Clicked</th>
                          <th className="text-right py-2 px-2">Open Rate</th>
                          <th className="text-right py-2 px-2">Click Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sequenceAnalytics.steps.map(s => (
                          <tr key={s.step} className="border-b border-[var(--glass-border)] last:border-0">
                            <td className="py-2 pr-4 font-medium">Step {s.step + 1}</td>
                            <td className="text-right py-2 px-2">{s.sent}</td>
                            <td className="text-right py-2 px-2">{s.delivered}</td>
                            <td className="text-right py-2 px-2">{s.opened}</td>
                            <td className="text-right py-2 px-2">{s.clicked}</td>
                            <td className="text-right py-2 px-2">{s.open_rate}%</td>
                            <td className="text-right py-2 px-2">{s.click_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* A/B Variant Comparison */}
              {sequenceAnalytics.steps?.some(s => s.variants?.length > 1) && (
                <div>
                  <h4 className="text-sm font-medium mb-3">A/B Variant Comparison</h4>
                  {sequenceAnalytics.steps.filter(s => s.variants?.length > 1).map(s => (
                    <div key={s.step} className="mb-4">
                      <p className="text-xs text-[var(--text-secondary)] mb-2">Step {s.step + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {s.variants.map(v => {
                          const isWinner = s.variants.length > 1 &&
                            v.open_rate >= Math.max(...s.variants.map(x => x.open_rate))
                          return (
                            <div key={v.variant_id} className={cn(
                              'p-3 rounded-lg border',
                              isWinner ? 'border-[var(--status-success)] bg-[var(--status-success)]/10' : 'border-[var(--glass-border)]'
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Variant {v.variant_id}</span>
                                {isWinner && <Badge variant="default" className="text-xs bg-[var(--status-success)]">Winner</Badge>}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <div className="text-sm font-bold">{v.open_rate}%</div>
                                  <div className="text-xs text-[var(--text-secondary)]">Open</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{v.reply_rate}%</div>
                                  <div className="text-xs text-[var(--text-secondary)]">Reply</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{v.sent}</div>
                                  <div className="text-xs text-[var(--text-secondary)]">Sent</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Narrative breakdown (M4) */}
      {narrativeBreakdown.length > 0 && (
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Narrative performance</GlassCardTitle>
            <p className="text-xs text-[var(--text-secondary)]">
              Leads and slots grouped by narrative — see which personas are converting
            </p>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)] text-[var(--text-secondary)] text-xs uppercase">
                    <th className="text-left py-2 pr-4">Narrative</th>
                    <th className="text-right py-2 px-2">Leads</th>
                    <th className="text-right py-2 px-2">Routed</th>
                    <th className="text-right py-2 px-2">Sent</th>
                    <th className="text-right py-2 px-2">Replied</th>
                    <th className="text-right py-2 px-2">Bounced</th>
                    <th className="text-right py-2 px-2">Reply %</th>
                    <th className="text-right py-2 px-2">Slots sent</th>
                    <th className="text-right py-2 px-2">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {narrativeBreakdown.map((row, i) => (
                    <tr
                      key={row.narrative_id || `unassigned-${i}`}
                      className="border-b border-[var(--glass-border)] last:border-0"
                    >
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)]">
                            {row.name}
                          </span>
                          {row.domain_hint && (
                            <span className="text-[11px] text-[var(--text-tertiary)]">
                              {row.domain_hint}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">{row.leads_total}</td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {row.leads_by_state?.routed || 0}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {row.leads_by_state?.sent || 0}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums text-[var(--status-success)]">
                        {row.leads_by_state?.replied || 0}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums text-[var(--status-error)]">
                        {row.leads_by_state?.bounced || 0}
                      </td>
                      <td className="text-right py-2 px-2 font-semibold text-[var(--brand-primary)]">
                        {row.reply_rate}%
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">{row.slots_sent}</td>
                      <td className="text-right py-2 px-2 font-semibold">
                        {row.send_success_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Mailbox breakdown (M4) */}
      {mailboxBreakdown.length > 0 && (
        <GlassCard>
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-base">Mailbox performance</GlassCardTitle>
            <p className="text-xs text-[var(--text-secondary)]">
              Slots fired per mailbox — high skipped counts indicate lead starvation
            </p>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--glass-border)] text-[var(--text-secondary)] text-xs uppercase">
                    <th className="text-left py-2 pr-4">Mailbox</th>
                    <th className="text-right py-2 px-2">Target/day</th>
                    <th className="text-right py-2 px-2">Sent today</th>
                    <th className="text-right py-2 px-2">Slots</th>
                    <th className="text-right py-2 px-2">Sent</th>
                    <th className="text-right py-2 px-2">Skipped</th>
                    <th className="text-right py-2 px-2">Failed</th>
                    <th className="text-right py-2 px-2">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {mailboxBreakdown.map((row) => (
                    <tr
                      key={row.mailbox_id}
                      className="border-b border-[var(--glass-border)] last:border-0"
                    >
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)]">
                            {row.display_name}
                          </span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">
                            {row.email_address}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">{row.daily_target}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{row.sent_today}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{row.slots_total}</td>
                      <td className="text-right py-2 px-2 tabular-nums text-[var(--status-success)]">
                        {row.slots_by_status?.sent || 0}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums text-[var(--status-warning)]">
                        {row.slots_by_status?.skipped || 0}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums text-[var(--status-error)]">
                        {row.slots_by_status?.failed || 0}
                      </td>
                      <td className="text-right py-2 px-2 font-semibold">
                        {row.send_success_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}
