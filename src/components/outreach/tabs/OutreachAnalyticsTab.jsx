import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Send, Eye, Reply, AlertTriangle,
  ArrowDown, ArrowUp, Minus, RefreshCw, Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { outreachApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

function MetricCard({ label, value, format = 'number', change, icon: Icon }) {
  const formatted = format === 'percent' ? `${value}%` : value?.toLocaleString() || '0'
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="text-2xl font-bold">{formatted}</div>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs mt-1',
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {change > 0 ? <ArrowUp className="h-3 w-3" /> : change < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(change)}% vs prior period
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FunnelBar({ label, value, maxValue, color = 'bg-primary' }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
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
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ov, dom, seq] = await Promise.all([
        outreachApi.getAnalyticsOverview(parseInt(days)),
        outreachApi.getDomainAnalytics(),
        outreachApi.listSequences(),
      ])
      setOverview(ov?.data || ov)
      setDomainData(dom?.data || dom || [])
      const seqList = seq?.data || seq || []
      setSequences(seqList)
      if (seqList.length > 0 && !selectedSequence) setSelectedSequence(seqList[0].id)
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
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Outreach Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance metrics across all sequences and domains</p>
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

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Sent" value={overview.total_sent} icon={Send} />
        <MetricCard label="Delivered" value={overview.delivery_rate} format="percent" icon={TrendingUp} />
        <MetricCard label="Open Rate" value={overview.open_rate} format="percent" icon={Eye} />
        <MetricCard label="Reply Rate" value={overview.reply_rate} format="percent" icon={Reply} />
        <MetricCard label="Bounce Rate" value={overview.bounce_rate} format="percent" icon={AlertTriangle} />
        <MetricCard label="Click Rate" value={overview.click_rate} format="percent" icon={BarChart3} />
      </div>

      {/* Funnel + Domain Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delivery Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunnelBar label="Sent" value={overview.total_sent} maxValue={overview.total_sent} color="bg-blue-500" />
            <FunnelBar label="Delivered" value={overview.total_delivered} maxValue={overview.total_sent} color="bg-green-500" />
            <FunnelBar label="Opened" value={overview.total_opened} maxValue={overview.total_sent} color="bg-amber-500" />
            <FunnelBar label="Clicked" value={overview.total_clicked} maxValue={overview.total_sent} color="bg-purple-500" />
            <FunnelBar label="Replied" value={overview.total_replied} maxValue={overview.total_sent} color="bg-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Domain Health</CardTitle>
          </CardHeader>
          <CardContent>
            {domainData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No domains configured</p>
            ) : (
              <div className="space-y-3">
                {domainData.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{d.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.sent_today}/{d.daily_limit} today &middot; {d.total_sent} total
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={d.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {d.status}
                      </Badge>
                      <div className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded',
                        d.health_score >= 80 ? 'bg-green-100 text-green-700' :
                        d.health_score >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {d.health_score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sequence Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sequence Performance</CardTitle>
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
        </CardHeader>
        <CardContent>
          {!sequenceAnalytics ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Select a sequence to view analytics</p>
          ) : (
            <div className="space-y-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_enrolled}</div>
                  <div className="text-xs text-muted-foreground">Enrolled</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_active}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_replied}</div>
                  <div className="text-xs text-muted-foreground">Replied</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{sequenceAnalytics.total_completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-emerald-600">{sequenceAnalytics.reply_rate}%</div>
                  <div className="text-xs text-muted-foreground">Reply Rate</div>
                </div>
              </div>

              {/* Per-step metrics */}
              {sequenceAnalytics.steps?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Per-Step Metrics</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
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
                          <tr key={s.step} className="border-b last:border-0">
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
                      <p className="text-xs text-muted-foreground mb-2">Step {s.step + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {s.variants.map(v => {
                          const isWinner = s.variants.length > 1 &&
                            v.open_rate >= Math.max(...s.variants.map(x => x.open_rate))
                          return (
                            <div key={v.variant_id} className={cn(
                              'p-3 rounded-lg border',
                              isWinner ? 'border-emerald-300 bg-emerald-50/50' : 'border-muted'
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Variant {v.variant_id}</span>
                                {isWinner && <Badge variant="default" className="text-xs bg-emerald-600">Winner</Badge>}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <div className="text-sm font-bold">{v.open_rate}%</div>
                                  <div className="text-xs text-muted-foreground">Open</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{v.reply_rate}%</div>
                                  <div className="text-xs text-muted-foreground">Reply</div>
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{v.sent}</div>
                                  <div className="text-xs text-muted-foreground">Sent</div>
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
        </CardContent>
      </Card>
    </div>
  )
}
