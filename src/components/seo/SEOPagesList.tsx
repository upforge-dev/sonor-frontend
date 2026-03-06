// src/components/seo/SEOPagesList.tsx
// List of all pages for a site with filtering and actions
// MIGRATED TO REACT QUERY - Jan 29, 2026
// UPDATED: Jan 29, 2026 - Added hierarchical parent/child grouping
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  RefreshCw,
  Filter,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wand2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from 'lucide-react'
import { useSeoPages, seoPageKeys } from '@/hooks/seo'
import { seoApi } from '@/lib/portal-api'
import SEOBulkEditModal from './SEOBulkEditModal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Types
interface Site {
  id?: string
  [key: string]: any
}

interface SEOPagesListProps {
  site?: Site
  projectId?: string
}

interface SeoPage {
  id: string
  path?: string
  url?: string
  title?: string
  clicks_28d?: number | null
  impressions_28d?: number | null
  avg_position_28d?: number | null
  seo_health_score?: number | null
  opportunities_count?: number
  index_status?: string | null
  has_noindex?: boolean
  robots_blocked?: boolean
  displayPath?: string
  slug?: string
  isRoot?: boolean
  isLeaf?: boolean
  parentPath?: string
  [key: string]: any
}

type StatusFilter = 'all' | 'indexed' | 'not-indexed' | 'blocked'
type HealthFilter = 'all' | 'good' | 'needs-work' | 'poor'
type SortBy = 'path' | 'clicks' | 'impressions' | 'position' | 'health' | 'opportunities'

interface PageGroup {
  parent: string
  children: SeoPage[]
  segment?: string
  isRoot?: boolean
}

interface GroupStats {
  clicks: number
  impressions: number
  position: number | null
  health: number | null
  issues: number
}

type DisplayRow = 
  | {
      type: 'group'
      groupKey: string
      segment?: string
      childCount: number
      isExpanded: boolean
      stats: GroupStats
    }
  | {
      type: 'page'
      page: SeoPage
      depth: number
      parentGroup?: string
    }

interface PagesPagination {
  page: number
  total: number
  totalPages: number
}

// Helper to format segment names for display
function formatSegmentName(segment?: string): string {
  if (!segment) return 'Home'
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function SEOPagesList({ site, projectId }: SEOPagesListProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Local UI state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [pageStatusFilter, setPageStatusFilter] = useState<'active' | 'all'>('active')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('clicks')
  const [page, setPage] = useState<number>(1)
  const [crawlingPages, setCrawlingPages] = useState<Set<string>>(new Set())
  const [crawlingSitemap, setCrawlingSitemap] = useState<boolean>(false)
  const [bulkEditOpen, setBulkEditOpen] = useState<boolean>(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Use projectId directly (new architecture) or fallback to site.id (legacy)
  const siteId: string | undefined = projectId || site?.id

  // React Query: Fetch pages with filters
  // Automatically refetches when filters change!
  const { 
    data: pagesData, 
    isLoading: pagesLoading,
    refetch: refetchPages
  } = useSeoPages(siteId || '', {
    page,
    limit: 50,
    search: searchQuery || undefined,
    status: pageStatusFilter,
    indexingStatus: statusFilter !== 'all' ? (statusFilter === 'not-indexed' ? 'not_indexed' : statusFilter) : undefined,
    sortBy,
  })

  // Extract pages and pagination from response (ensure array; handles raw API shape)
  const pages: SeoPage[] = (() => {
    const p = pagesData?.pages ?? pagesData?.data
    return Array.isArray(p) ? p : (p?.pages ?? [])
  })()
  const pagesPagination: PagesPagination = useMemo(() => ({
    page: pagesData?.page || 1,
    total: pagesData?.total || 0,
    totalPages: pagesData?.totalPages || 1,
  }), [pagesData])

  // Direct API calls for actions (not cached data)
  const handleCrawlSitemap = async (): Promise<void> => {
    if (!siteId) return
    setCrawlingSitemap(true)
    try {
      const res = await seoApi.crawlSitemap(siteId)
      const data = (res as any)?.data ?? res
      if (data?.success === false && data?.error) {
        toast.error(data.error)
      } else {
        const { created = 0, updated = 0, removed = 0 } = data ?? {}
        const parts = []
        if (created) parts.push(`${created} new`)
        if (updated) parts.push(`${updated} updated`)
        if (removed) parts.push(`${removed} removed`)
        toast.success(parts.length ? `Pages synced: ${parts.join(', ')}` : 'Pages synced from sitemap')
      }
      queryClient.invalidateQueries({ queryKey: seoPageKeys.list(siteId) })
    } catch (err) {
      console.error('Crawl sitemap failed:', err)
      const msg = (err as any)?.response?.data?.message || (err as any)?.message || 'Sync failed'
      toast.error(msg === 'Authentication required' ? 'Session expired. Please log in again.' : msg)
    } finally {
      setCrawlingSitemap(false)
    }
  }

  const handleCrawlPage = async (pageId: string): Promise<void> => {
    if (!siteId) return
    setCrawlingPages(prev => new Set([...prev, pageId]))
    try {
      await seoApi.crawlPage(pageId)
      // Invalidate both the specific page and the list
      queryClient.invalidateQueries({ queryKey: seoPageKeys.detail(pageId) })
      queryClient.invalidateQueries({ queryKey: seoPageKeys.list(siteId) })
    } finally {
      setCrawlingPages(prev => {
        const next = new Set(prev)
        next.delete(pageId)
        return next
      })
    }
  }

  const getHealthBadge = (score: number | null | undefined): JSX.Element => {
    if (score === null || score === undefined) {
      return <Badge variant="outline" className="text-xs">-</Badge>
    }
    if (score >= 80) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{score}</Badge>
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">{score}</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{score}</Badge>
  }

  const getIndexStatusBadge = (page: SeoPage): JSX.Element => {
    const status = page.index_status
    const hasNoindex = page.has_noindex
    const isBlocked = page.robots_blocked
    
    if (isBlocked) {
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Blocked
        </Badge>
      )
    }
    if (hasNoindex) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1">
          <XCircle className="h-3 w-3" />
          Noindex
        </Badge>
      )
    }
    if (status === 'indexed') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
          <CheckCircle className="h-3 w-3" />
          Indexed
        </Badge>
      )
    }
    if (status === 'not_indexed' || status === 'not-indexed') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs gap-1">
          <AlertTriangle className="h-3 w-3" />
          Not Indexed
        </Badge>
      )
    }
    if (status === 'removal_requested') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs gap-1">
          <XCircle className="h-3 w-3" />
          Removal
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Unknown
      </Badge>
    )
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Helper to get path from page object
  const getPagePath = (page: SeoPage): string => {
    if (page.path) {
      try {
        const url = new URL(page.path)
        return url.pathname
      } catch {
        return page.path
      }
    }
    if (page.url) {
      try {
        return new URL(page.url, 'https://x').pathname
      } catch {
        return page.url
      }
    }
    return '/'
  }

  // Filter pages based on health filter
  const filteredPages: SeoPage[] = pages.filter((page: SeoPage) => {
    if (healthFilter === 'all') return true
    if (healthFilter === 'good') return (page.seo_health_score ?? 0) >= 80
    if (healthFilter === 'needs-work') return (page.seo_health_score ?? 0) >= 60 && (page.seo_health_score ?? 0) < 80
    if (healthFilter === 'poor') return (page.seo_health_score ?? 0) < 60
    return true
  })

  // Build hierarchical page structure grouped by parent path
  const { groupedPages, displayRows } = useMemo<{ groupedPages: Map<string, PageGroup>, displayRows: DisplayRow[] }>(() => {
    // Group pages by their parent path (first segment)
    const groups = new Map<string, PageGroup>()
    
    for (const page of filteredPages) {
      const path = getPagePath(page)
      const segments = path.split('/').filter(Boolean)
      
      // Root page goes into special "/" group
      if (segments.length === 0) {
        const rootGroup = groups.get('/') || { parent: '/', children: [], isRoot: true }
        rootGroup.children.push({ ...page, displayPath: 'Home', isRoot: true })
        groups.set('/', rootGroup)
        continue
      }
      
      // Single segment pages (e.g., /about) go into their own group
      if (segments.length === 1) {
        const groupKey = `/${segments[0]}`
        const group = groups.get(groupKey) || { parent: groupKey, children: [], segment: segments[0] }
        group.children.push({ ...page, displayPath: `/${segments[0]}`, slug: segments[0], isLeaf: true })
        groups.set(groupKey, group)
        continue
      }
      
      // Multi-segment pages (e.g., /blog/post-1) go under their parent
      const parentKey = `/${segments[0]}`
      const group = groups.get(parentKey) || { parent: parentKey, children: [], segment: segments[0] }
      const remainingPath = '/' + segments.slice(1).join('/')
      group.children.push({ ...page, displayPath: remainingPath, slug: segments.slice(1).join('/'), parentPath: parentKey })
      groups.set(parentKey, group)
    }
    
    // Sort groups alphabetically, but root first
    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === '/') return -1
      if (b === '/') return 1
      return a.localeCompare(b)
    })
    
    // Sort children within each group
    for (const [, group] of sortedGroups) {
      group.children.sort((a, b) => {
        // Sort by clicks (descending) if sortBy is clicks, otherwise by path
        if (sortBy === 'clicks') {
          return (b.clicks_28d || 0) - (a.clicks_28d || 0)
        }
        if (sortBy === 'impressions') {
          return (b.impressions_28d || 0) - (a.impressions_28d || 0)
        }
        if (sortBy === 'position') {
          return (a.avg_position_28d || 100) - (b.avg_position_28d || 100)
        }
        if (sortBy === 'health') {
          return (b.seo_health_score || 0) - (a.seo_health_score || 0)
        }
        return (a.displayPath || '').localeCompare(b.displayPath || '')
      })
    }
    
    // Build flat display rows with expand/collapse logic
    const rows: DisplayRow[] = []
    for (const [groupKey, group] of sortedGroups) {
      const isExpanded = expandedGroups.has(groupKey)
      const hasMultipleChildren = group.children.length > 1
      const hasNestedChildren = group.children.some(c => !c.isLeaf && !c.isRoot)
      
      // If group only has one page and it's a leaf (like /about), show it directly
      if (group.children.length === 1 && group.children[0].isLeaf) {
        rows.push({ type: 'page', page: group.children[0], depth: 0 })
        continue
      }
      
      // If this is the root group with just the home page, show it directly
      if (group.isRoot && group.children.length === 1) {
        rows.push({ type: 'page', page: group.children[0], depth: 0 })
        continue
      }
      
      // Otherwise show a collapsible group header
      if (hasMultipleChildren || hasNestedChildren) {
        // Aggregate stats for the group header
        const totalClicks = group.children.reduce((sum, c) => sum + (c.clicks_28d || 0), 0)
        const totalImpressions = group.children.reduce((sum, c) => sum + (c.impressions_28d || 0), 0)
        const avgPosition = group.children.length > 0 
          ? group.children.reduce((sum, c) => sum + (c.avg_position_28d || 0), 0) / group.children.length 
          : null
        const avgHealth = group.children.length > 0 
          ? group.children.reduce((sum, c) => sum + (c.seo_health_score || 0), 0) / group.children.length 
          : null
        const totalIssues = group.children.reduce((sum, c) => sum + (c.opportunities_count || 0), 0)
        
        rows.push({ 
          type: 'group', 
          groupKey, 
          segment: group.segment,
          childCount: group.children.length,
          isExpanded,
          stats: {
            clicks: totalClicks,
            impressions: totalImpressions,
            position: avgPosition,
            health: avgHealth,
            issues: totalIssues,
          }
        })
        
        // Add children if expanded
        if (isExpanded) {
          for (const child of group.children) {
            rows.push({ type: 'page', page: child, depth: 1, parentGroup: groupKey })
          }
        }
      } else {
        // Single child that's not a leaf, show it directly
        for (const child of group.children) {
          rows.push({ type: 'page', page: child, depth: 0 })
        }
      }
    }
    
    return { groupedPages: groups, displayRows: rows }
  }, [filteredPages, sortBy, expandedGroups])

  // Toggle group expansion
  const toggleGroup = (groupKey: string): void => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={pageStatusFilter} onValueChange={(v: 'active' | 'all') => setPageStatusFilter(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Pages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All (incl. removed)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Index Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="indexed">Indexed</SelectItem>
              <SelectItem value="not-indexed">Not Indexed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={healthFilter} onValueChange={(value: HealthFilter) => setHealthFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              <SelectItem value="good">Good (80+)</SelectItem>
              <SelectItem value="needs-work">Needs Work (60-79)</SelectItem>
              <SelectItem value="poor">Poor (&lt;60)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="path">Path (parent/child)</SelectItem>
              <SelectItem value="clicks">Most Clicks</SelectItem>
              <SelectItem value="impressions">Most Impressions</SelectItem>
              <SelectItem value="position">Best Position</SelectItem>
              <SelectItem value="health">Health Score</SelectItem>
              <SelectItem value="opportunities">Most Issues</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline"
            onClick={handleCrawlSitemap}
            disabled={crawlingSitemap}
            title="Manually sync pages from sitemap.xml (auto-syncs at build time)"
          >
            {crawlingSitemap ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Pages
          </Button>
          
          <Button 
            onClick={() => setBulkEditOpen(true)}
            disabled={pages.length === 0}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Bulk Signal Edit
          </Button>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      <SEOBulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        projectId={siteId}
        pages={filteredPages}
        field="both"
        onComplete={() => {
          // Invalidate cache to refetch fresh data
          if (siteId) {
            queryClient.invalidateQueries({ queryKey: seoPageKeys.list(siteId) })
          }
        }}
      />

      {/* Pages Table */}
      <Card>
        <CardContent className="p-0">
          {pagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No pages found</p>
              {pages.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm max-w-md mx-auto">
                    Pages are automatically synced from your site's <code className="bg-muted px-1 py-0.5 rounded text-xs">sitemap.xml</code> at build time 
                    when Site-Kit is installed.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleCrawlSitemap} 
                      disabled={crawlingSitemap}
                    >
                      {crawlingSitemap ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    Or wait for the next build to sync automatically
                  </p>
                </div>
              ) : (
                <p className="text-sm">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium text-center">Index</th>
                    <th className="px-4 py-3 font-medium text-right">Clicks</th>
                    <th className="px-4 py-3 font-medium text-right">Impr.</th>
                    <th className="px-4 py-3 font-medium text-right">Position</th>
                    <th className="px-4 py-3 font-medium text-center">Health</th>
                    <th className="px-4 py-3 font-medium text-center">Issues</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {displayRows.map((row, idx) => {
                    if (row.type === 'group') {
                      // Render group header row (collapsible)
                      return (
                        <tr 
                          key={`group-${row.groupKey}`}
                          className="hover:bg-muted/50 cursor-pointer transition-colors bg-muted/20"
                          onClick={() => toggleGroup(row.groupKey)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="p-0.5 hover:bg-muted rounded transition-colors">
                                {row.isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              {row.isExpanded ? (
                                <FolderOpen className="h-4 w-4 text-primary" />
                              ) : (
                                <Folder className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {formatSegmentName(row.segment)}
                              </span>
                              <Badge variant="outline" className="text-xs ml-1">
                                {row.childCount} {row.childCount === 1 ? 'page' : 'pages'}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-muted-foreground">-</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {formatNumber(row.stats.clicks)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {formatNumber(row.stats.impressions)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {row.stats.position?.toFixed(1) || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getHealthBadge(Math.round(row.stats.health || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.stats.issues > 0 ? (
                              <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                                {row.stats.issues}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-[72px]" /> {/* Spacer for actions column */}
                          </td>
                        </tr>
                      )
                    }
                    
                    // Render regular page row
                    const page = row.page
                    const isChild = row.depth > 0
                    
                    return (
                      <tr 
                        key={page.id}
                        className={cn(
                          "hover:bg-muted/50 cursor-pointer transition-colors",
                          isChild && "bg-background"
                        )}
                        onClick={() => navigate(`/seo/pages/${page.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className={cn("max-w-xs", isChild && "ml-8")}>
                            <div className="flex items-center gap-2">
                              {isChild && (
                                <span className="text-muted-foreground text-xs">└</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {page.title || page.displayPath || page.path}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {isChild ? page.displayPath : (() => {
                                    try {
                                      const url = new URL(page.path || '')
                                      return url.pathname
                                    } catch {
                                      return page.path
                                    }
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getIndexStatusBadge(page)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          {formatNumber(page.clicks_28d)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          {formatNumber(page.impressions_28d)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-foreground">
                          {page.avg_position_28d?.toFixed(1) || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getHealthBadge(page.seo_health_score)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {page.opportunities_count && page.opportunities_count > 0 ? (
                            <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                              {page.opportunities_count}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCrawlPage(page.id)
                              }}
                              disabled={crawlingPages.has(page.id)}
                            >
                              {crawlingPages.has(page.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(page.url || page.path, '_blank')
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Pagination */}
      {pagesPagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {filteredPages.length} of {pagesPagination.total} pages
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || pagesLoading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {pagesPagination.page} of {pagesPagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagesPagination.totalPages || pagesLoading}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
