// src/components/seo/SEOReportingPage.tsx
// SEO Reporting hub - Generate reports, view history, conversion attribution
// Uses existing SEOClientReport functionality

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Target,
  BarChart3,
  Clock,
  Plus,
  ExternalLink,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  CircleAlert,
  Globe,
  ChevronRight,
} from 'lucide-react'
import { 
  useSeoGSCOverview, useSeoGscHealth, useSeoPages, useSeoOpportunities
} from '@/hooks/seo'
import { useSignalAccess } from '@/lib/signal-access'
import SignalIcon from '@/components/ui/SignalIcon'
import { SEOClientReportModal } from './SEOClientReport'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface SEOReportingPageProps {
  projectId: string
}

interface Page {
  id?: string
  title?: string
  path?: string
  clicks?: number
  position?: number
}

interface Opportunity {
  id?: string
  [key: string]: unknown
}

interface Report {
  id: string
  title: string
  createdAt: string
}

export default function SEOReportingPage({ projectId }: SEOReportingPageProps) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const navigate = useNavigate()
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('overview')
  
  // Data for stats — use the new structured hooks with change data
  const { data: gscOverview } = useSeoGSCOverview(projectId)
  const { data: gscHealthData } = useSeoGscHealth(projectId)
  const { data: pagesData } = useSeoPages(projectId, { limit: 50 })
  const { data: opportunitiesData } = useSeoOpportunities(projectId, { status: 'open' })
  
  const pages = useMemo<Page[]>(() => {
    const p = pagesData?.pages ?? pagesData?.data
    return Array.isArray(p) ? p : (p?.pages ?? [])
  }, [pagesData])
  const opportunities = useMemo<Opportunity[]>(() => {
    const o = opportunitiesData?.opportunities ?? opportunitiesData?.data ?? opportunitiesData
    return Array.isArray(o) ? o : []
  }, [opportunitiesData])
  
  // Extract metrics with change data from GSC overview
  const gscMetrics = gscOverview?.metrics || {}
  const totalClicks = gscMetrics.clicks?.value || gscOverview?.clicks || 0
  const clicksChange = gscMetrics.clicks?.change
  const totalImpressions = gscMetrics.impressions?.value || gscOverview?.impressions || 0
  const impressionsChange = gscMetrics.impressions?.change
  const avgPosition = gscMetrics.position?.value || gscOverview?.avgPosition || 0
  const positionChange = gscMetrics.position?.change
  const avgCtr = gscMetrics.ctr?.value || gscOverview?.ctr || 0
  const ctrChange = gscMetrics.ctr?.change
  
  // Report history — still needs API integration
  const reportHistory: Report[] = []
  
  // Helper to render change indicators with real data
  const formatChange = (
    change: number | null | undefined,
    suffix: string = '%',
    inversePositive: boolean = false
  ): JSX.Element => {
    if (change === null || change === undefined || isNaN(change)) {
      return <span className="text-xs text-muted-foreground">No prior data</span>
    }
    const isPositive = inversePositive ? change < 0 : change > 0
    const isNegative = inversePositive ? change > 0 : change < 0
    const absChange = Math.abs(change)
    const formatted = suffix === '%' ? `${absChange.toFixed(1)}${suffix}` : absChange.toFixed(1)
    if (isPositive) {
      return (
        <div className="flex items-center text-green-500 text-sm">
          <ArrowUpRight className="h-4 w-4" />
          <span>+{formatted} vs prev</span>
        </div>
      )
    }
    if (isNegative) {
      return (
        <div className="flex items-center text-red-500 text-sm">
          <ArrowDownRight className="h-4 w-4" />
          <span>-{formatted} vs prev</span>
        </div>
      )
    }
    return (
      <div className="flex items-center text-muted-foreground text-sm">
        <Minus className="h-4 w-4" />
        <span>No change</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">SEO Reporting</h2>
          <p className="text-muted-foreground mt-1">
            Generate client reports and track SEO ROI
          </p>
        </div>
        <Button onClick={() => setReportModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Clicks (28d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgPosition.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Position</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <BarChart3 className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(avgCtr * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">CTR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{opportunities.length}</p>
                <p className="text-xs text-muted-foreground">Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Report History
          </TabsTrigger>
          {hasSignalAccess && (
            <TabsTrigger value="attribution" className="gap-2">
              <DollarSign className="h-4 w-4" />
              ROI Attribution
              <Badge variant="outline" className="ml-1 text-[10px]">Signal</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>
                Last 28 days vs previous period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-3xl font-bold">{totalClicks.toLocaleString()}</p>
                  {formatChange(clicksChange)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Impressions</p>
                  <p className="text-3xl font-bold">{totalImpressions.toLocaleString()}</p>
                  {formatChange(impressionsChange)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avg Position</p>
                  <p className="text-3xl font-bold">{avgPosition.toFixed(1)}</p>
                  {formatChange(positionChange, '', true)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Click-Through Rate</p>
                  <p className="text-3xl font-bold">{(avgCtr * 100).toFixed(1)}%</p>
                  {formatChange(ctrChange ? ctrChange * 100 : ctrChange)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indexing Health Summary */}
          {gscHealthData && (
            <Card className={gscHealthData.issues?.length > 0 ? 'border-amber-500/20' : 'border-green-500/20'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                    Indexing Health
                  </CardTitle>
                  <Badge variant="outline" className={cn("text-xs",
                    (gscHealthData.coveragePercent ?? 0) >= 90 ? "border-green-500/30 text-green-500" :
                    (gscHealthData.coveragePercent ?? 0) >= 70 ? "border-amber-500/30 text-amber-500" :
                    "border-red-500/30 text-red-500"
                  )}>
                    {Math.round(gscHealthData.coveragePercent ?? 0)}% coverage
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold">{gscHealthData.totalPages ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total Pages</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-2xl font-bold text-green-500">{gscHealthData.indexedPages ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Indexed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <p className="text-2xl font-bold text-red-500">{gscHealthData.notIndexedPages ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Not Indexed</p>
                  </div>
                </div>
                {gscHealthData.issues?.length > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-amber-500 flex items-center gap-1">
                      <CircleAlert className="h-3.5 w-3.5" />
                      {gscHealthData.issues.length} issue{gscHealthData.issues.length !== 1 ? 's' : ''} detected
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/seo/search-console')}>
                      View Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>
                Pages driving the most organic traffic
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pages.length > 0 ? (
                <div className="space-y-3">
                  {pages
                    .slice()
                    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
                    .slice(0, 5)
                    .map((page, idx) => (
                    <div key={page.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{page.title || page.path}</p>
                          <p className="text-sm text-muted-foreground truncate">{page.path}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{page.clicks?.toLocaleString() || '--'}</p>
                          <p className="text-muted-foreground">clicks</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{page.position?.toFixed(1) || '--'}</p>
                          <p className="text-muted-foreground">position</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No page data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                Previously generated SEO reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportHistory.length > 0 ? (
                <div className="space-y-3">
                  {reportHistory.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{report.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Generated {report.createdAt}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first SEO performance report
                  </p>
                  <Button onClick={() => setReportModalOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {hasSignalAccess && (
          <TabsContent value="attribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SignalIcon className="h-5 w-5" />
                  SEO → Conversion Attribution
                </CardTitle>
                <CardDescription>
                  Track which SEO improvements drive actual conversions and revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Connect Analytics</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Link your Analytics module to see conversion attribution. 
                    Track which ranking improvements led to form submissions, calls, and sales.
                  </p>
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Go to Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Report Modal */}
      <SEOClientReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        projectId={projectId}
      />
    </div>
  )
}
