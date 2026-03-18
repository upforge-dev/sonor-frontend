// src/components/seo/SEODashboard.tsx
// SEO Dashboard - Clean, focused answer to "Are my rankings improving?"
// REWRITTEN: Jan 31, 2026
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Globe, TrendingUp, AlertTriangle, FileText, Target, RefreshCw,
  ExternalLink, Settings, Search, MousePointerClick, Eye, BarChart3,
  ChevronRight, Zap, ArrowUp, ArrowDown, Minus, Link2, Unlink, RotateCcw,
  ShieldCheck, CircleAlert, CheckCircle2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { 
  useSeoProject, useSeoPages, useSeoOpportunities,
  useSeoGSCOverview, useSeoGSCQueries, seoProjectKeys, seoGSCKeys,
  useSeoGscHealth,
} from '@/hooks/seo'
import { seoApi, oauthApi } from '@/lib/portal-api'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import GscPropertySelector from './GscPropertySelector'
import GscConnectModal from './GscConnectModal'
import { SignalSuggestsPanel } from '@/components/ai/SignalSuggestsPanel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  change?: number | null
  loading?: boolean
  inverseChange?: boolean
  iconColor?: string
}

function MetricCard({ icon: Icon, label, value, change, loading = false, inverseChange = false, iconColor = 'text-primary' }: MetricCardProps) {
  const isPositive = inverseChange ? change < 0 : change > 0
  const isNegative = inverseChange ? change > 0 : change < 0
  const showChange = change !== null && change !== undefined && !isNaN(change)
  
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-2 rounded-lg", iconColor === 'text-primary' ? 'bg-primary/10' : 'bg-muted')}>
                <Icon className={cn("h-4 w-4", iconColor)} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">{value}</span>
                {showChange && (
                  <div className={cn("flex items-center gap-1 text-sm font-medium",
                    isPositive && "text-green-500", isNegative && "text-red-500",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}>
                    {isPositive ? <ArrowUp className="h-3 w-3" /> : isNegative ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(change).toFixed(1)}%
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TrendDataPoint {
  date?: string
  clicks?: number
}

interface TrendChartProps {
  data?: TrendDataPoint[]
  loading?: boolean
  height?: number
}

function TrendChart({ data = [], loading = false, height = 80 }: TrendChartProps) {
  if (loading) return <Skeleton className="w-full" style={{ height }} />
  if (!data.length) return <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>No trend data</div>
  const maxClicks = Math.max(...data.map(d => d.clicks || 0), 1)
  return (
    <div className="w-full" style={{ height }}>
      <div className="h-full flex items-end gap-[2px]">
        {data.map((day, i) => (
          <div key={day.date || i} className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors"
            style={{ height: `${Math.max(((day.clicks || 0) / maxClicks) * 100, 2)}%` }}
            title={`${day.date}: ${day.clicks || 0} clicks`} />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{data[0]?.date || ''}</span><span>{data[data.length - 1]?.date || ''}</span>
      </div>
    </div>
  )
}

interface QueryData {
  query?: string
  clicks?: number
  ctr?: number
  position?: number
}

interface RankingDistributionProps {
  queries?: QueryData[]
  loading?: boolean
}

function RankingDistribution({ queries = [], loading = false }: RankingDistributionProps) {
  const distribution = useMemo(() => {
    if (!queries?.length) return null
    const buckets = {
      top3: queries.filter(q => q.position <= 3).length,
      top10: queries.filter(q => q.position > 3 && q.position <= 10).length,
      top20: queries.filter(q => q.position > 10 && q.position <= 20).length,
      beyond: queries.filter(q => q.position > 20).length,
    }
    return { ...buckets, total: Object.values(buckets).reduce((a, b) => a + b, 0) }
  }, [queries])
  
  if (loading) return <Skeleton className="h-24 w-full" />
  if (!distribution) return <div className="text-center py-6 text-muted-foreground text-sm">No keyword data</div>
  
  return (
    <div className="space-y-3">
      <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
        {distribution.top3 > 0 && <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{ flex: distribution.top3 }}>{distribution.top3 > 2 && distribution.top3}</div>}
        {distribution.top10 > 0 && <div className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium" style={{ flex: distribution.top10 }}>{distribution.top10 > 2 && distribution.top10}</div>}
        {distribution.top20 > 0 && <div className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium" style={{ flex: distribution.top20 }}>{distribution.top20 > 2 && distribution.top20}</div>}
        {distribution.beyond > 0 && <div className="bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium" style={{ flex: distribution.beyond }}>{distribution.beyond > 2 && distribution.beyond}</div>}
      </div>
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-muted-foreground">Top 3: {distribution.top3}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-muted-foreground">4-10: {distribution.top10}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-muted-foreground">11-20: {distribution.top20}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted" /><span className="text-muted-foreground">20+: {distribution.beyond}</span></div>
      </div>
    </div>
  )
}

interface TopKeywordsListProps {
  queries?: QueryData[]
  loading?: boolean
  onViewAll?: () => void
}

function TopKeywordsList({ queries = [], loading = false, onViewAll }: TopKeywordsListProps) {
  if (loading) return <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
  if (!queries?.length) return <div className="text-center py-8 text-muted-foreground"><Search className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No keyword data</p></div>
  
  return (
    <div className="space-y-2">
      {queries.slice(0, 5).map((query, i) => (
        <div key={query.query || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{query.query}</p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{query.clicks || 0} clicks</span><span>•</span><span>{((query.ctr || 0) * 100).toFixed(1)}% CTR</span>
            </div>
          </div>
          <Badge variant="outline" className={cn("font-mono text-xs",
            query.position <= 3 && "border-green-500/30 text-green-500 bg-green-500/10",
            query.position > 3 && query.position <= 10 && "border-blue-500/30 text-blue-500 bg-blue-500/10",
            query.position > 10 && query.position <= 20 && "border-amber-500/30 text-amber-500 bg-amber-500/10",
            query.position > 20 && "border-muted text-muted-foreground"
          )}>#{query.position?.toFixed(1) || '-'}</Badge>
        </div>
      ))}
      {queries.length > 5 && onViewAll && <Button variant="ghost" size="sm" className="w-full mt-2" onClick={onViewAll}>View all {queries.length} keywords<ChevronRight className="h-4 w-4 ml-1" /></Button>}
    </div>
  )
}

interface SEODashboardProps {
  onNavigate?: (path: string) => void
}

export default function SEODashboard({ onNavigate }: SEODashboardProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { currentOrg, currentProject: authProject } = useAuthStore()
  const currentProject = authProject
  const projectId = currentProject?.id
  const orgId = currentProject?.org_id
  const domain = currentProject?.domain || currentOrg?.domain

  const { data: seoProjectData, isLoading: projectLoading } = useSeoProject(orgId, projectId)
  const { data: pagesData, isLoading: pagesLoading } = useSeoPages(projectId, { limit: 100 })
  const { data: opportunitiesData } = useSeoOpportunities(projectId, { status: 'open' })
  const { data: gscOverviewData, isLoading: gscLoading } = useSeoGSCOverview(projectId)
  const { data: gscQueriesData, isLoading: queriesLoading } = useSeoGSCQueries(projectId, { limit: 100 })
  const { data: gscHealthData } = useSeoGscHealth(projectId)

  const pages = useMemo(() => { const p = pagesData?.pages ?? pagesData?.data; return Array.isArray(p) ? p : (p?.pages ?? []) }, [pagesData])
  const opportunities = useMemo(() => { const o = opportunitiesData?.opportunities ?? opportunitiesData?.data ?? opportunitiesData; return Array.isArray(o) ? o : [] }, [opportunitiesData])
  
  const gscOverview = gscOverviewData
  const gscConnected = gscOverview?.connected === true
  const gscConnectionId = gscOverview?.connectionId
  const gscPropertyUrl = gscOverview?.propertyUrl
  const gscAccountName = gscOverview?.accountName
  const gscMetrics = gscOverview?.metrics || {}
  const gscTrend = gscOverview?.trend || []
  const gscQueries = gscQueriesData?.queries || gscQueriesData || []

  const [syncing, setSyncing] = useState<boolean>(false)
  const [disconnecting, setDisconnecting] = useState<boolean>(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState<boolean>(false)
  const [showGscConnectModal, setShowGscConnectModal] = useState<boolean>(false)
  const [gscPropertyConnectionId, setGscPropertyConnectionId] = useState<string | null>(null)

  // Handle OAuth callback when returning from full-page redirect (legacy) or from URL params
  useEffect(() => {
    if (!projectId) return
    const params = new URLSearchParams(window.location.search)
    const selectProperty = params.get('selectProperty')
    const connId = params.get('connectionId')
    const connected = params.get('connected')
    if (connId && connected === 'google') {
      const url = new URL(window.location.href)
      url.searchParams.delete('connectionId')
      url.searchParams.delete('connected')
      url.searchParams.delete('selectProperty')
      url.searchParams.delete('gscSiteCount')
      url.searchParams.delete('modules')
      window.history.replaceState({}, '', url.toString())
      if (selectProperty === 'true') setGscPropertyConnectionId(connId)
      else {
        queryClient.invalidateQueries({ queryKey: seoProjectKeys.detail(projectId) })
        queryClient.invalidateQueries({ queryKey: seoGSCKeys.overview(projectId) })
      }
    }
  }, [projectId, queryClient])

  const handleGscPropertySelected = useCallback(() => {
    setGscPropertyConnectionId(null)
    queryClient.invalidateQueries({ queryKey: seoProjectKeys.detail(projectId) })
    queryClient.invalidateQueries({ queryKey: seoGSCKeys.overview(projectId) })
    queryClient.invalidateQueries({ queryKey: seoGSCKeys.queries(projectId) })
  }, [projectId, queryClient])

  const handleSyncGsc = useCallback(async () => {
    if (!projectId) return
    setSyncing(true)
    try {
      await seoApi.syncGsc(projectId)
      toast.success('GSC data synced')
      queryClient.invalidateQueries({ queryKey: ['seo', 'gsc'] })
    } catch (err) {
      console.error('Sync GSC failed:', err)
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Sync failed'
      toast.error(msg === 'Authentication required' ? 'Session expired. Please log in again.' : msg)
    } finally {
      setSyncing(false)
    }
  }, [projectId, queryClient])

  const handleConnectGsc = useCallback(() => {
    if (!projectId) return
    setShowGscConnectModal(true)
  }, [projectId])

  const handleGscConnectSuccess = useCallback(({ connectionId, selectProperty }: { connectionId: string; selectProperty?: boolean }) => {
    queryClient.invalidateQueries({ queryKey: seoProjectKeys.detail(projectId) })
    queryClient.invalidateQueries({ queryKey: seoGSCKeys.overview(projectId) })
    queryClient.invalidateQueries({ queryKey: seoGSCKeys.queries(projectId) })
    if (selectProperty) setGscPropertyConnectionId(connectionId)
  }, [projectId, queryClient])

  const handleDisconnectGsc = useCallback(async () => {
    if (!projectId) return
    setDisconnecting(true)
    try {
      await seoApi.disconnectGsc(projectId)
      toast.success('Google Search Console disconnected')
      queryClient.invalidateQueries({ queryKey: seoProjectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.overview(projectId) })
      queryClient.invalidateQueries({ queryKey: seoGSCKeys.queries(projectId) })
    } catch (err) {
      console.error('Disconnect GSC failed:', err)
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
      setShowDisconnectDialog(false)
    }
  }, [projectId, queryClient])

  const handleChangeProperty = useCallback(() => {
    if (gscConnectionId) {
      setGscPropertyConnectionId(gscConnectionId)
    }
  }, [gscConnectionId])

  const handleNavigate = useCallback((path: string) => { onNavigate ? onNavigate(path) : navigate(path) }, [navigate, onNavigate])
  const formatNumber = (num: number | null | undefined): string => { if (num === null || num === undefined) return '-'; if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`; if (num >= 1000) return `${(num / 1000).toFixed(1)}K`; return num.toString() }

  if (projectLoading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><UptradeSpinner size="md" label="Loading SEO data..." /></div>
  if (!projectId) return <div className="p-6"><Card className="border-blue-500/30 bg-blue-500/5"><CardContent className="py-12 text-center"><Search className="h-12 w-12 mx-auto mb-4 text-blue-400" /><h3 className="text-lg font-semibold mb-2">Select a Project</h3><p className="text-muted-foreground">Select a project from the sidebar</p></CardContent></Card></div>
  if (!domain) return <div className="p-6"><Card className="border-yellow-500/30 bg-yellow-500/5"><CardContent className="py-12 text-center"><AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-400" /><h3 className="text-lg font-semibold mb-2">No Domain Configured</h3><p className="text-muted-foreground mb-4">Configure a domain in project settings</p><Button variant="outline" onClick={() => handleNavigate('/settings')}><Settings className="h-4 w-4 mr-2" />Configure Domain</Button></CardContent></Card></div>

  const openOpportunities = opportunities.filter((o: any) => o.status === 'open')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO Dashboard</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm">
              <Globe className="h-4 w-4 text-primary" />{domain}<ExternalLink className="h-3 w-3" />
            </a>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border/50">
              <div className={cn("w-2 h-2 rounded-full", syncing ? 'bg-yellow-400 animate-pulse' : gscConnected ? 'bg-green-400' : 'bg-gray-400')} />
              <span className="text-xs text-muted-foreground">
                {syncing ? 'Syncing...' : gscConnected ? (
                  gscPropertyUrl ? `GSC: ${gscPropertyUrl.replace(/^(https?:\/\/|sc-domain:)/, '')}` : 'GSC Connected'
                ) : 'GSC Not Connected'}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSyncGsc} disabled={syncing || !gscConnected}>
          <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />{syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      <SignalSuggestsPanel module="seo" className="mb-4" />

      {!gscConnected && !gscLoading && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Link2 className="h-5 w-5 text-amber-500" /></div>
                <div><p className="font-medium text-foreground">Connect Google Search Console</p><p className="text-sm text-muted-foreground">Get real ranking data, click trends, and keyword insights</p></div>
              </div>
              <Button onClick={handleConnectGsc} size="sm">Connect GSC</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={MousePointerClick} label="Clicks (28d)" value={formatNumber(gscMetrics.clicks?.value || currentProject?.total_clicks_28d || 0)} change={gscMetrics.clicks?.change} loading={gscLoading} iconColor="text-blue-500" />
        <MetricCard icon={Eye} label="Impressions (28d)" value={formatNumber(gscMetrics.impressions?.value || currentProject?.total_impressions_28d || 0)} change={gscMetrics.impressions?.change} loading={gscLoading} iconColor="text-teal-500" />
        <MetricCard icon={BarChart3} label="Avg Position" value={(gscMetrics.position?.value || currentProject?.avg_position_28d)?.toFixed(1) || '-'} change={gscMetrics.position?.change} loading={gscLoading} inverseChange iconColor="text-orange-500" />
        <MetricCard icon={Target} label="CTR" value={`${((gscMetrics.ctr?.value || currentProject?.avg_ctr_28d || 0) * 100).toFixed(1)}%`} change={gscMetrics.ctr?.change} loading={gscLoading} iconColor="text-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Click Trend (28 Days)</CardTitle></CardHeader><CardContent><TrendChart data={gscTrend} loading={gscLoading} height={100} /></CardContent></Card>
          <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Ranking Distribution</CardTitle><Badge variant="outline" className="text-xs">{gscQueries?.length || 0} keywords</Badge></div></CardHeader><CardContent><RankingDistribution queries={gscQueries} loading={queriesLoading} /></CardContent></Card>
          <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Top Keywords</CardTitle><Button variant="ghost" size="sm" onClick={() => handleNavigate('/seo/keywords')}>View All</Button></div></CardHeader><CardContent><TopKeywordsList queries={gscQueries} loading={queriesLoading} onViewAll={() => handleNavigate('/seo/keywords')} /></CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!gscConnected ? (
                <Button variant="outline" className="w-full justify-start border-amber-500/30 hover:bg-amber-500/10" onClick={handleConnectGsc}>
                  <Link2 className="h-4 w-4 mr-2 text-amber-500" />Connect GSC<Badge variant="secondary" className="ml-auto text-xs">Required</Badge>
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="w-full justify-start" onClick={handleSyncGsc} disabled={syncing}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />{syncing ? 'Syncing...' : 'Sync GSC Data'}
                  </Button>
                  {gscConnectionId && (
                    <Button variant="outline" className="w-full justify-start" onClick={handleChangeProperty}>
                      <RotateCcw className="h-4 w-4 mr-2" />Change Property
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30" onClick={() => setShowDisconnectDialog(true)}>
                    <Unlink className="h-4 w-4 mr-2" />Disconnect GSC
                  </Button>
                </>
              )}
              <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigate('/seo/pages')}><FileText className="h-4 w-4 mr-2" />View All Pages<Badge variant="secondary" className="ml-auto text-xs">{pages.length}</Badge></Button>
              {openOpportunities.length > 0 && <Button variant="outline" className="w-full justify-start border-primary/30 hover:bg-primary/10" onClick={() => handleNavigate('/seo/pages')}><Target className="h-4 w-4 mr-2 text-primary" />Review Opportunities<Badge className="ml-auto bg-primary/20 text-primary text-xs">{openOpportunities.length}</Badge></Button>}
            </CardContent>
          </Card>
          <Card className={gscHealthData?.issues?.length > 0 ? 'border-amber-500/20' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                  Indexing Health
                </CardTitle>
                {gscHealthData && (
                  <Badge variant="outline" className={cn("text-xs",
                    (gscHealthData.coveragePercent ?? 0) >= 90 ? "border-green-500/30 text-green-500" :
                    (gscHealthData.coveragePercent ?? 0) >= 70 ? "border-amber-500/30 text-amber-500" :
                    "border-red-500/30 text-red-500"
                  )}>
                    {Math.round(gscHealthData.coveragePercent ?? 0)}% indexed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pagesLoading ? <Skeleton className="h-20 w-full" /> : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Pages</span>
                    <span className="text-lg font-semibold">{gscHealthData?.totalPages ?? pages.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-sm text-muted-foreground">Indexed</span>
                    </div>
                    <span className="text-sm font-medium text-green-500">
                      {gscHealthData?.indexedPages ?? currentProject?.pages_indexed ?? pages.filter((p: any) => p.index_status === 'indexed' || p.indexing_verdict === 'PASS' || p.is_indexed).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CircleAlert className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-sm text-muted-foreground">Not Indexed</span>
                    </div>
                    <span className="text-sm font-medium text-red-500">
                      {gscHealthData?.notIndexedPages ?? currentProject?.pages_not_indexed ?? pages.filter((p: any) => !(p.index_status === 'indexed' || p.indexing_verdict === 'PASS' || p.is_indexed)).length}
                    </span>
                  </div>
                  {gscHealthData?.issues?.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {gscHealthData.issues.length} issue{gscHealthData.issues.length !== 1 ? 's' : ''} detected
                        </span>
                      </div>
                    </div>
                  )}
                  {gscHealthData?.coveragePercent != null && (
                    <div className="pt-1">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, gscHealthData.coveragePercent)}%`,
                            backgroundColor: gscHealthData.coveragePercent >= 90 ? '#22c55e' : gscHealthData.coveragePercent >= 70 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => handleNavigate('/seo/search-console')}>
                    View Search Console<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {openOpportunities.length > 0 && (
            <Card className="border-primary/20"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Opportunities</CardTitle></CardHeader>
              <CardContent><div className="space-y-2">
                {openOpportunities.slice(0, 3).map((opp: any) => <div key={opp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"><span className="truncate flex-1">{opp.title}</span><Badge variant="outline" className={cn("ml-2 text-xs", opp.priority === 'critical' && "border-red-500/30 text-red-500", opp.priority === 'high' && "border-orange-500/30 text-orange-500", opp.priority === 'medium' && "border-yellow-500/30 text-yellow-500")}>{opp.priority}</Badge></div>)}
                {openOpportunities.length > 3 && <Button variant="ghost" size="sm" className="w-full" onClick={() => handleNavigate('/seo/pages')}>+{openOpportunities.length - 3} more<ChevronRight className="h-4 w-4 ml-1" /></Button>}
              </div></CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* GSC Connect Modal (popup OAuth, no full-page redirect) */}
      <GscConnectModal
        open={showGscConnectModal}
        onOpenChange={setShowGscConnectModal}
        projectId={projectId}
        onSuccess={handleGscConnectSuccess}
      />

      {/* GSC Property Selector Dialog */}
      <GscPropertySelector isOpen={!!gscPropertyConnectionId} onClose={() => setGscPropertyConnectionId(null)} connectionId={gscPropertyConnectionId} onPropertySelected={handleGscPropertySelected} />

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Search Console?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to {gscAccountName ? `"${gscAccountName}"` : 'Google Search Console'}.
              Your historical data will be preserved, but live syncing will stop.
              You can reconnect anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectGsc}
              disabled={disconnecting}
              className="bg-red-500 hover:bg-red-600"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
