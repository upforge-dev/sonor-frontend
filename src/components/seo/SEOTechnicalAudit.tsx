// src/components/seo/SEOTechnicalAudit.tsx
// Technical SEO Hub - Core Web Vitals, Indexing, Schema, Internal Links
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useCwvSummary } from '@/lib/hooks'
import { useSignalAccess } from '@/lib/signal-access'
import { seoApi } from '@/lib/sonor-api'
import { useQueryClient } from '@tanstack/react-query'
import { seoPageKeys, useSeoPages } from '@/hooks/seo'
import SignalUpgradeCard from './signal/SignalUpgradeCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Shield,
  Zap,
  Smartphone,
  Globe,
  FileCode,
  Link2,
  Monitor,
  Search,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  EyeOff,
  FileX,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

// ================== TYPE DEFINITIONS ==================

interface SeoPage {
  id?: string
  path?: string
  url?: string
  title?: string
  meta_description?: string
  h1?: string
  word_count?: number
  index_status?: 'indexed' | 'not_indexed'
  is_indexed?: boolean
  has_noindex?: boolean
  robots_blocked?: boolean
  http_status?: number
  has_schema?: boolean
  schema_types?: string[]
  internal_links_in?: number
  [key: string]: any
}

interface CwvSummary {
  avgMobileScore?: number
  avgDesktopScore?: number
  mobileLCP?: number
  desktopLCP?: number
  mobileCLS?: number
  desktopCLS?: number
  mobileFID?: number
  desktopFID?: number
  mobileTTFB?: number
  desktopTTFB?: number
  [key: string]: any
}

interface PagesData {
  pages?: SeoPage[]
  data?: SeoPage[]
  [key: string]: any
}

interface SEOTechnicalAuditProps {
  projectId?: string
  pages?: SeoPage[] | PagesData
  cwvSummary?: CwvSummary | null
  domain?: string | null
  onRefresh?: () => void
}

interface AuditIssue {
  type: 'error' | 'indexing' | 'cwv' | 'title' | 'description' | 'orphan' | 'duplicate'
  message: string
  count: number
}

interface IndexingData {
  total: number
  indexed: number
  notIndexed: number
  noindex: number
  blocked: number
  errors: number
  redirects: number
  pages: {
    indexed: SeoPage[]
    notIndexed: SeoPage[]
    noindex: SeoPage[]
    errors: SeoPage[]
  }
}

interface ContentData {
  missingTitles: SeoPage[]
  missingDescriptions: SeoPage[]
  missingH1: SeoPage[]
  duplicateTitles: number
  thinContent: SeoPage[]
}

interface SchemaData {
  pagesWithSchema: number
  totalPages: number
  coverage: string
  types: string[]
}

interface InternalLinksData {
  orphanPages: SeoPage[]
  avgLinks: string
  wellLinked: number
}

interface AuditData {
  score: number
  issues: AuditIssue[]
  warnings: AuditIssue[]
  passed: string[]
  indexing: IndexingData
  content: ContentData
  schema: SchemaData
  internalLinks: InternalLinksData
  cwv: CwvSummary | null
}

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  status: 'good' | 'warning' | 'poor' | 'needs-improvement' | 'unknown'
}

interface CwvSectionProps {
  cwvSummary?: CwvSummary | null
  projectId?: string
}

interface CwvGaugeProps {
  score?: number
}

interface CwvMetric {
  key: string
  label: string
  unit: string
  good: number
  poor: number
  description: string
}

interface CwvMetricCardProps {
  metric: CwvMetric
  mobileValue?: number
  desktopValue?: number
}

interface IndexingSummaryCardProps {
  data?: IndexingData
}

interface InternalLinksSectionProps {
  data?: InternalLinksData
  pages?: SeoPage[]
}

type CwvStatus = 'good' | 'needs-improvement' | 'poor' | 'unknown'

// ================== MAIN COMPONENT ==================

/**
 * SEOTechnicalAudit - Technical SEO Hub
 * Uses existing data from pages & CWV instead of broken API
 */
export default function SEOTechnicalAudit({ 
  projectId, 
  pages = [], 
  cwvSummary = null,
  domain = null,
  onRefresh 
}: SEOTechnicalAuditProps) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()

  // Show upgrade prompt if no Signal access
  if (!hasSignalAccess) {
    return (
      <div className="p-6">
        <SignalUpgradeCard feature="default" variant="default" />
      </div>
    )
  }

  const queryClient = useQueryClient()
  const { refetch: refetchCwv } = useCwvSummary(projectId, { enabled: false })

  // Pull seo_pages from API when parent didn't pass any (e.g. site-kit already posted pages)
  const { data: pagesFromApi, isLoading: pagesLoading } = useSeoPages(projectId, { limit: 2000 })

  const [activeTab, setActiveTab] = useState<string>('overview')
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isCrawling, setIsCrawling] = useState<boolean>(false)

  const handleCrawlSitemap = async (): Promise<void> => {
    if (!projectId) return
    setIsCrawling(true)
    try {
      await seoApi.crawlSitemap(projectId)
      queryClient.invalidateQueries({ queryKey: seoPageKeys.list(projectId) })
      await refetchCwv()
      onRefresh?.()
    } finally {
      setIsCrawling(false)
    }
  }

  // Use pages prop if provided and non-empty; otherwise use seo_pages from API (e.g. from site-kit)
  const propList: SeoPage[] = Array.isArray(pages) ? pages : (pages?.pages ?? [])
  const apiList: SeoPage[] = Array.isArray(pagesFromApi?.pages) ? pagesFromApi.pages : (pagesFromApi?.data ?? [])
  const pageList: SeoPage[] = (propList.length > 0 ? propList : apiList) || []

  // Calculate technical audit data from existing page data
  const auditData = useMemo<AuditData | null>(() => {
    if (!pageList.length) {
      return null
    }

    // Indexing Analysis
    const indexedPages = pageList.filter(p => p.index_status === 'indexed' || p.is_indexed)
    const notIndexedPages = pageList.filter(p => p.index_status === 'not_indexed' || (!p.is_indexed && !p.has_noindex))
    const noindexPages = pageList.filter(p => p.has_noindex)
    const blockedPages = pageList.filter(p => p.robots_blocked)
    const errorPages = pageList.filter(p => p.http_status && p.http_status >= 400)
    const redirectPages = pageList.filter(p => p.http_status && p.http_status >= 300 && p.http_status < 400)

    // Content Analysis — only flag pages that have been crawled (last_crawled_at set).
    // Pages with no crawl data have NULL for meta_description/h1/word_count — that's
    // "not yet scraped," not "missing." Flagging uncrawled pages as missing is a false positive.
    const crawledPages = pageList.filter(p => p.last_crawled_at || p.word_count || p.h1 || p.meta_description)
    const uncrawledCount = pageList.length - crawledPages.length
    const missingTitles = pageList.filter(p => !p.title || p.title.trim() === '')
    const missingDescriptions = crawledPages.filter(p => !p.meta_description || p.meta_description.trim() === '')
    const missingH1 = crawledPages.filter(p => !p.h1)
    const duplicateTitles = findDuplicates(pageList.map(p => p.title).filter(Boolean) as string[])
    const thinContent = crawledPages.filter(p => p.word_count != null && p.word_count < 300)

    // Schema Analysis
    const pagesWithSchema = pageList.filter(p => p.has_schema || p.schema_types?.length > 0)
    const schemaTypes = [...new Set(pageList.flatMap(p => p.schema_types || []))]

    // Internal Linking Analysis — only flag as orphans if we have link graph data
    // (internal_links_in stays 0 until the link graph is populated via analytics page views)
    const hasLinkData = pageList.some(p => (p.internal_links_in || 0) > 0)
    const orphanPages = hasLinkData ? pageList.filter(p => (p.internal_links_in || 0) === 0) : []
    const avgInternalLinks = pageList.length > 0
      ? pageList.reduce((sum, p) => sum + (p.internal_links_in || 0), 0) / pageList.length
      : 0
    const wellLinkedPages = pageList.filter(p => (p.internal_links_in || 0) >= 5)

    // CWV Analysis
    const cwvStatus = getCwvStatus(cwvSummary)

    // Calculate overall score
    let score = 100
    const issues: AuditIssue[] = []
    const warnings: AuditIssue[] = []
    const passed: string[] = []

    // Critical issues (high impact)
    if (errorPages.length > 0) {
      score -= Math.min(25, errorPages.length * 5)
      issues.push({ type: 'error', message: `${errorPages.length} pages returning errors (4xx/5xx)`, count: errorPages.length })
    }
    if (notIndexedPages.length > pageList.length * 0.3) {
      score -= 15
      issues.push({ type: 'indexing', message: `${notIndexedPages.length} pages not indexed`, count: notIndexedPages.length })
    }
    if (cwvStatus === 'poor') {
      score -= 15
      issues.push({ type: 'cwv', message: 'Poor Core Web Vitals scores', count: 1 })
    }

    // Warnings (medium impact)
    if (missingTitles.length > 0) {
      score -= Math.min(10, missingTitles.length * 2)
      warnings.push({ type: 'title', message: `${missingTitles.length} pages missing titles`, count: missingTitles.length })
    }
    if (missingDescriptions.length > 0) {
      score -= Math.min(10, missingDescriptions.length)
      warnings.push({ type: 'description', message: `${missingDescriptions.length} pages missing meta descriptions`, count: missingDescriptions.length })
    }
    if (orphanPages.length > 0) {
      score -= Math.min(10, orphanPages.length)
      warnings.push({ type: 'orphan', message: `${orphanPages.length} orphan pages (no internal links)`, count: orphanPages.length })
    }
    if (uncrawledCount > pageList.length * 0.5) {
      warnings.push({ type: 'description' as any, message: `${uncrawledCount} pages not yet analyzed — visit them or run a build-time sync to populate SEO data`, count: uncrawledCount })
    }
    if (duplicateTitles > 0) {
      score -= duplicateTitles * 2
      warnings.push({ type: 'duplicate', message: `${duplicateTitles} duplicate page titles`, count: duplicateTitles })
    }
    if (cwvStatus === 'needs-improvement') {
      score -= 5
      warnings.push({ type: 'cwv', message: 'Core Web Vitals need improvement', count: 1 })
    }

    // Passed checks
    if (errorPages.length === 0) passed.push('No broken pages detected')
    if (missingTitles.length === 0) passed.push('All pages have titles')
    if (missingDescriptions.length === 0) passed.push('All pages have meta descriptions')
    if (pagesWithSchema.length >= pageList.length * 0.5) passed.push('Good schema coverage')
    if (cwvStatus === 'good') passed.push('Core Web Vitals passing')
    if (orphanPages.length === 0) passed.push('No orphan pages')
    if (indexedPages.length >= pageList.length * 0.8) passed.push('Good indexing coverage')

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      warnings,
      passed,
      indexing: {
        total: pageList.length,
        indexed: indexedPages.length,
        notIndexed: notIndexedPages.length,
        noindex: noindexPages.length,
        blocked: blockedPages.length,
        errors: errorPages.length,
        redirects: redirectPages.length,
        pages: { indexed: indexedPages, notIndexed: notIndexedPages, noindex: noindexPages, errors: errorPages }
      },
      content: {
        missingTitles,
        missingDescriptions,
        missingH1,
        duplicateTitles,
        thinContent,
        crawledCount: crawledPages.length,
        uncrawledCount,
      },
      schema: {
        pagesWithSchema: pagesWithSchema.length,
        totalPages: pageList.length,
        coverage: pageList.length > 0 ? (pagesWithSchema.length / pageList.length * 100).toFixed(0) : '0',
        types: schemaTypes
      },
      internalLinks: {
        orphanPages,
        avgLinks: avgInternalLinks.toFixed(1),
        wellLinked: wellLinkedPages.length
      },
      cwv: cwvSummary
    }
  }, [pageList, cwvSummary])

  const handleRefresh = async (): Promise<void> => {
    if (!projectId) return
    setIsRefreshing(true)
    try {
      await refetchCwv()
      onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number): string => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30'
    if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30'
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  const getGrade = (score: number): string => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  // Empty state: only show "Crawl sitemap" when we have no pages and we're not still loading seo_pages from API
  if (!pageList.length && !isRefreshing && !pagesLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Pages Analyzed</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Crawl your sitemap to analyze technical SEO factors like Core Web Vitals, indexing, and internal linking.
          </p>
          <Button onClick={handleCrawlSitemap} disabled={isCrawling}>
            {isCrawling ? (
              <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            {isCrawling ? 'Crawling…' : 'Crawl Sitemap'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Loading existing pages from API (e.g. site-kit already posted)
  if (!pageList.length && pagesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <UptradeSpinner size="lg" message="Loading pages…" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-sonor-help="seo/technical-audit">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Technical SEO</h2>
          <p className="text-muted-foreground">
            Core Web Vitals, indexing status, schema, and internal linking
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {/* Score Overview */}
      {auditData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Overall Score */}
          <Card className={cn('border-2', getScoreBg(auditData.score))}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold',
                  getScoreBg(auditData.score), getScoreColor(auditData.score)
                )}>
                  {getGrade(auditData.score)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Technical Score</p>
                  <p className={cn('text-3xl font-bold', getScoreColor(auditData.score))}>
                    {auditData.score}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{auditData.issues.length}</p>
                  <p className="text-sm text-muted-foreground">Critical Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{auditData.warnings.length}</p>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{auditData.passed.length}</p>
                  <p className="text-sm text-muted-foreground">Passed Checks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/50">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cwv" className="gap-2">
            <Zap className="h-4 w-4" />
            Core Web Vitals
          </TabsTrigger>
          <TabsTrigger value="indexing" className="gap-2" data-tour="seo-redirects">
            <Search className="h-4 w-4" />
            Indexing
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2" data-tour="seo-internal-links">
            <Link2 className="h-4 w-4" />
            Internal Links
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileCode className="h-4 w-4" />
            Content
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Issues & Warnings */}
          {auditData?.issues.length > 0 && (
            <Card className="border-red-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-400">
                  <XCircle className="h-5 w-5" />
                  Critical Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditData.issues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                      <span className="text-foreground">{issue.message}</span>
                      <Badge variant="destructive">{issue.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {auditData?.warnings.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditData.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                      <span className="text-foreground">{warning.message}</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400">{warning.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {auditData?.passed.length > 0 && (
            <Card className="border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Passed Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {auditData.passed.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-foreground">{check}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={Search}
              label="Indexed"
              value={`${auditData?.indexing.indexed || 0}/${auditData?.indexing.total || 0}`}
              status={auditData?.indexing.indexed >= auditData?.indexing.total * 0.8 ? 'good' : 'warning'}
            />
            <div data-tour="seo-schemas">
              <MetricCard
                icon={FileCode}
                label="Schema Coverage"
                value={`${auditData?.schema.coverage || 0}%`}
                status={auditData && parseFloat(auditData.schema.coverage) >= 50 ? 'good' : 'warning'}
              />
            </div>
            <MetricCard
              icon={Link2}
              label="Avg Internal Links"
              value={auditData?.internalLinks.avgLinks || '0'}
              status={parseFloat(auditData?.internalLinks.avgLinks) >= 3 ? 'good' : 'warning'}
            />
            <MetricCard
              icon={Zap}
              label="CWV Status"
              value={getCwvStatus(auditData?.cwv)}
              status={getCwvStatus(auditData?.cwv)}
            />
          </div>
        </TabsContent>

        {/* Core Web Vitals Tab */}
        <TabsContent value="cwv" className="space-y-4">
          <CwvSection cwvSummary={auditData?.cwv} projectId={projectId} />
        </TabsContent>

        {/* Indexing Tab — lightweight summary, links to full Search Console view */}
        <TabsContent value="indexing" className="space-y-4">
          <IndexingSummaryCard data={auditData?.indexing} />
        </TabsContent>

        {/* Internal Links Tab */}
        <TabsContent value="links" className="space-y-4">
          <InternalLinksSection data={auditData?.internalLinks} pages={pageList} />
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <ContentAnalysisSection data={auditData?.content} totalPages={pageList.length} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ================== SUB-COMPONENTS ==================

function MetricCard({ icon: Icon, label, value, status }: MetricCardProps) {
  const statusStyles: Record<string, string> = {
    good: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    poor: 'bg-red-500/10 border-red-500/30',
    'needs-improvement': 'bg-yellow-500/10 border-yellow-500/30',
    unknown: 'bg-muted/30 border-border/50'
  }

  return (
    <Card className={cn('border', statusStyles[status] || statusStyles.unknown)}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold text-foreground capitalize">{value}</p>
      </CardContent>
    </Card>
  )
}

function CwvSection({ cwvSummary, projectId }: CwvSectionProps) {
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const queryClient = useQueryClient()
  
  const handleRunSweep = async (): Promise<void> => {
    if (!projectId) return
    setIsRunning(true)
    try {
      await seoApi.checkAllPagesCwv(projectId)
      queryClient.invalidateQueries({ queryKey: ['seo'] })
    } finally {
      setIsRunning(false)
    }
  }
  
  if (!cwvSummary) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Core Web Vitals data not yet available. 
            <br />
            <span className="text-sm">Run a PageSpeed sweep to collect performance data.</span>
          </p>
          <Button onClick={handleRunSweep} disabled={isRunning || !projectId}>
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running Sweep...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Run PageSpeed Sweep
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const metrics: CwvMetric[] = [
    { 
      key: 'lcp', 
      label: 'Largest Contentful Paint', 
      unit: 's',
      good: 2.5, 
      poor: 4,
      description: 'Loading performance - measures when the largest content element becomes visible'
    },
    { 
      key: 'cls', 
      label: 'Cumulative Layout Shift', 
      unit: '',
      good: 0.1, 
      poor: 0.25,
      description: 'Visual stability - measures how much the page layout shifts'
    },
    { 
      key: 'fid', 
      label: 'First Input Delay', 
      unit: 'ms',
      good: 100, 
      poor: 300,
      description: 'Interactivity - measures time from first interaction to response'
    },
    { 
      key: 'ttfb', 
      label: 'Time to First Byte', 
      unit: 'ms',
      good: 800, 
      poor: 1800,
      description: 'Server response time - measures how fast the server responds'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header with Re-run Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Core Web Vitals</h3>
          <p className="text-sm text-muted-foreground">Performance metrics from Google PageSpeed Insights</p>
        </div>
        <Button variant="outline" onClick={handleRunSweep} disabled={isRunning}>
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-run Sweep
            </>
          )}
        </Button>
      </div>
      
      {/* Mobile vs Desktop Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <CwvGauge score={cwvSummary.avgMobileScore} />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {cwvSummary.avgMobileScore || '-'}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Desktop Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <CwvGauge score={cwvSummary.avgDesktopScore} />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {cwvSummary.avgDesktopScore || '-'}
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core Web Vitals Breakdown</CardTitle>
          <CardDescription>Performance metrics that affect user experience and SEO</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map(metric => {
              const mobileValue = cwvSummary[`mobile${metric.key.toUpperCase()}` as keyof CwvSummary] as number | undefined
              const desktopValue = cwvSummary[`desktop${metric.key.toUpperCase()}` as keyof CwvSummary] as number | undefined
              
              return (
                <CwvMetricCard 
                  key={metric.key}
                  metric={metric}
                  mobileValue={mobileValue}
                  desktopValue={desktopValue}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CwvGauge({ score }: CwvGaugeProps) {
  const getColor = (s?: number): string => {
    if (!s) return 'text-muted-foreground'
    if (s >= 90) return 'text-green-400'
    if (s >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getBgColor = (s?: number): string => {
    if (!s) return 'stroke-border/50'
    if (s >= 90) return 'stroke-green-500'
    if (s >= 50) return 'stroke-yellow-500'
    return 'stroke-red-500'
  }

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - ((score || 0) / 100) * circumference

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="6"
          className="fill-none stroke-border/50"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('fill-none transition-all duration-500', getBgColor(score))}
        />
      </svg>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center text-sm font-bold',
        getColor(score)
      )}>
        {score || '-'}
      </span>
    </div>
  )
}

function CwvMetricCard({ metric, mobileValue, desktopValue }: CwvMetricCardProps) {
  const getStatus = (value?: number): 'good' | 'warning' | 'poor' | 'unknown' => {
    if (value === undefined || value === null) return 'unknown'
    if (value <= metric.good) return 'good'
    if (value <= metric.poor) return 'warning'
    return 'poor'
  }

  const statusColors: Record<string, string> = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    poor: 'text-red-400',
    unknown: 'text-muted-foreground'
  }

  const formatValue = (val?: number): string => {
    if (val === undefined || val === null) return '-'
    if (metric.unit === 's') return `${val.toFixed(2)}s`
    if (metric.unit === 'ms') return `${Math.round(val)}ms`
    return val.toFixed(3)
  }

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-foreground">{metric.label}</p>
          <p className="text-xs text-muted-foreground">{metric.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className={cn('font-mono font-bold', statusColors[getStatus(mobileValue)])}>
            {formatValue(mobileValue)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className={cn('font-mono font-bold', statusColors[getStatus(desktopValue)])}>
            {formatValue(desktopValue)}
          </span>
        </div>
      </div>
      <div className="flex gap-2 mt-2 text-xs">
        <span className="text-green-400">Good: ≤{metric.good}{metric.unit}</span>
        <span className="text-red-400">Poor: &gt;{metric.poor}{metric.unit}</span>
      </div>
    </div>
  )
}

function IndexingSummaryCard({ data }: IndexingSummaryCardProps) {
  const navigate = useNavigate()

  if (!data) return null

  const coveragePercent = data.total > 0 ? Math.round(data.indexed / data.total * 100) : 0

  return (
    <div className="space-y-4">
      {/* Coverage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
            Indexing Coverage
          </CardTitle>
          <CardDescription>Quick overview — full details, inspections, and auto-fix tools are in Search Console</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">
                {data.indexed} of {data.total} pages indexed
              </span>
              <span className="text-foreground font-medium">{coveragePercent}%</span>
            </div>
            <Progress value={coveragePercent} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Indexed</span>
              </div>
              <p className="text-xl font-bold text-foreground">{data.indexed || 0}</p>
            </div>
            <div className="p-3 rounded-lg border bg-yellow-500/10 border-yellow-500/30">
              <div className="flex items-center gap-2 mb-1">
                <EyeOff className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-muted-foreground">Not Indexed</span>
              </div>
              <p className="text-xl font-bold text-foreground">{data.notIndexed || 0}</p>
            </div>
            <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-muted-foreground">Noindex</span>
              </div>
              <p className="text-xl font-bold text-foreground">{data.noindex || 0}</p>
            </div>
            <div className="p-3 rounded-lg border bg-red-500/10 border-red-500/30">
              <div className="flex items-center gap-2 mb-1">
                <FileX className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">Errors</span>
              </div>
              <p className="text-xl font-bold text-foreground">{data.errors || 0}</p>
            </div>
          </div>

          <Button
            className="w-full"
            style={{ backgroundColor: 'var(--brand-primary)' }}
            onClick={() => navigate('/seo/search-console')}
          >
            <Globe className="h-4 w-4 mr-2" />
            Open Search Console
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ContentAnalysisSection({ data, totalPages }: { data: AuditData['content'] | undefined; totalPages: number }) {
  if (!data) return null

  const crawledCount = (data as any).crawledCount || totalPages
  const uncrawledCount = (data as any).uncrawledCount || 0

  const sections = [
    { label: 'Missing Titles', items: data.missingTitles, icon: AlertTriangle, color: 'red', denominator: totalPages },
    { label: 'Missing Meta Descriptions', items: data.missingDescriptions, icon: AlertTriangle, color: 'amber', denominator: crawledCount },
    { label: 'Missing H1 Tags', items: data.missingH1, icon: AlertCircle, color: 'amber', denominator: crawledCount },
    { label: 'Thin Content (< 300 words)', items: data.thinContent, icon: FileX, color: 'amber', denominator: crawledCount },
  ]

  return (
    <div className="space-y-4">
      {/* Info: uncrawled pages */}
      {uncrawledCount > 0 && (
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <span className="text-zinc-300">
            {uncrawledCount} of {totalPages} pages haven't been analyzed yet. Content checks below only cover the {crawledCount} pages with data. Pages are analyzed automatically when visitors browse the site.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sections.map(({ label, items, icon: Icon, color }) => (
          <Card key={label} className={items.length > 0 ? `border-${color}-500/30` : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${items.length > 0 ? `bg-${color}-500/20` : 'bg-green-500/20'}`}>
                  {items.length > 0
                    ? <Icon className={`h-5 w-5 text-${color}-400`} />
                    : <CheckCircle className="h-5 w-5 text-green-400" />}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{items.length}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Duplicate titles */}
      {data.duplicateTitles > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-5 w-5" />
              {data.duplicateTitles} Duplicate Title{data.duplicateTitles !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>Pages sharing the same title tag reduce SEO distinctiveness</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Issue lists */}
      {sections.filter(s => s.items.length > 0).map(({ label, items, denominator }) => (
        <Card key={label}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>{items.length} of {denominator} {denominator < totalPages ? 'analyzed' : ''} pages affected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.slice(0, 20).map((page: any, i: number) => (
                <div key={page.id || i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{page.title || page.path || page.url}</p>
                    <p className="text-xs text-muted-foreground truncate">{page.path || page.url}</p>
                  </div>
                </div>
              ))}
              {items.length > 20 && (
                <p className="text-sm text-muted-foreground text-center pt-2">+{items.length - 20} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* All passed */}
      {sections.every(s => s.items.length === 0) && data.duplicateTitles === 0 && (
        <Card className="border-green-500/30">
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">Content Health: Excellent</h3>
            <p className="text-muted-foreground mt-1">All pages have titles, descriptions, H1 tags, and sufficient content.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InternalLinksSection({ data, pages = [] }: InternalLinksSectionProps) {
  if (!data) return null

  const hasLinkData = data.orphanPages.length > 0 || Number(data.avgLinks) > 0 || data.wellLinked > 0

  return (
    <div className="space-y-4">
      {/* No link data warning */}
      {!hasLinkData && pages.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <span className="text-zinc-300">
            Internal link data hasn't been collected yet. Links are tracked automatically as visitors browse the site. Check back after the site has received some traffic.
          </span>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Link2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.avgLinks}</p>
                <p className="text-sm text-muted-foreground">Avg Links Per Page</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data.wellLinked}</p>
                <p className="text-sm text-muted-foreground">Well-Linked Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={data.orphanPages?.length > 0 ? 'border-yellow-500/30' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                data.orphanPages?.length > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'
              )}>
                <AlertCircle className={cn(
                  'h-5 w-5',
                  data.orphanPages?.length > 0 ? 'text-yellow-400' : 'text-green-400'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {data.orphanPages?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Orphan Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orphan Pages List */}
      {data.orphanPages?.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              Orphan Pages
            </CardTitle>
            <CardDescription>
              Pages with no internal links pointing to them - harder for users and search engines to discover
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.orphanPages.slice(0, 10).map((page, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {page.title || page.path || page.url}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {page.path || page.url}
                    </p>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 ml-2">
                    {page.internal_links_in || 0} links
                  </Badge>
                </div>
              ))}
              {data.orphanPages.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{data.orphanPages.length - 10} more orphan pages
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Linked Pages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Most Linked Pages</CardTitle>
          <CardDescription>Pages with the most internal links pointing to them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pages
              .filter(p => (p.internal_links_in || 0) > 0)
              .sort((a, b) => (b.internal_links_in || 0) - (a.internal_links_in || 0))
              .slice(0, 5)
              .map((page, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {page.title || page.path || page.url}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {page.path}
                    </p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 ml-2">
                    {page.internal_links_in} links
                  </Badge>
                </div>
              ))}
            {pages.filter(p => (p.internal_links_in || 0) > 0).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No internal link data available. Crawl your sitemap to analyze internal linking.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ================== HELPERS ==================

function findDuplicates(arr: (string | undefined)[]): number {
  const counts: Record<string, number> = {}
  arr.forEach(item => {
    if (item) counts[item] = (counts[item] || 0) + 1
  })
  return Object.values(counts).filter(c => c > 1).length
}

function getCwvStatus(cwv?: CwvSummary | null): CwvStatus {
  if (!cwv) return 'unknown'
  const score = cwv.avgMobileScore || cwv.avgDesktopScore
  if (!score) return 'unknown'
  if (score >= 90) return 'good'
  if (score >= 50) return 'needs-improvement'
  return 'poor'
}
