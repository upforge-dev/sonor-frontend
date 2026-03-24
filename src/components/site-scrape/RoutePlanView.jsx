import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Route,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Home,
  Info,
  ShoppingBag,
  Mail,
  Users,
  HelpCircle,
  FileText,
  FileQuestion,
  ArrowUp,
  ArrowDown,
  Map,
  Globe,
  Calendar,
} from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'

const PAGE_TYPE_ICONS = {
  home: Home,
  about: Info,
  services: ShoppingBag,
  'service-detail': ShoppingBag,
  products: ShoppingBag,
  'product-detail': ShoppingBag,
  contact: Mail,
  team: Users,
  faq: HelpCircle,
  blog: FileText,
  'blog-post': FileText,
  portfolio: FileText,
  'portfolio-item': FileText,
  pricing: ShoppingBag,
  legal: FileText,
  landing: Home,
  category: FileText,
  tag: FileText,
  search: Search,
  other: FileQuestion,
}

const PAGE_TYPE_COLORS = {
  home: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  about: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  services: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'service-detail': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  products: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'product-detail': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contact: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  team: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  blog: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'blog-post': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

const PAGE_TYPES = [
  'home', 'about', 'services', 'service-detail', 'products', 'product-detail',
  'blog', 'blog-post', 'portfolio', 'portfolio-item', 'contact', 'team',
  'pricing', 'faq', 'legal', 'landing', 'category', 'other',
]

export function RoutePlanView({ scrapeId, scrapeData, onRefresh }) {
  const [routes, setRoutes] = useState([])
  const [stats, setStats] = useState({ total: 0, included: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState(null)
  const [showOnlyIncluded, setShowOnlyIncluded] = useState(false)
  const [sitemapData, setSitemapData] = useState(null)

  useEffect(() => {
    fetchRoutes()
    fetchSitemap()
  }, [scrapeId])

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/site-scrape/${scrapeId}/routes`)
      if (response.routes) {
        setRoutes(response.routes)
        setStats(response.stats)
      }
    } catch (err) {
      toast.error('Failed to load routes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSitemap = async () => {
    try {
      const response = await portalApi.get(`/site-scrape/${scrapeId}/sitemap`)
      setSitemapData(response)
    } catch (err) {
      console.error('Failed to load sitemap:', err)
    }
  }

  const updateRoute = async (routeId, updates) => {
    try {
      await portalApi.post(`/site-scrape/${scrapeId}/routes/${routeId}`, updates)
      
      // Update local state
      setRoutes(prev => prev.map(r => 
        r.id === routeId ? { ...r, ...updates } : r
      ))
      
      // Update stats if include changed
      if (updates.includeInBuild !== undefined) {
        setStats(prev => ({
          ...prev,
          included: updates.includeInBuild 
            ? prev.included + 1 
            : prev.included - 1,
        }))
      }
    } catch (err) {
      toast.error('Failed to update route')
      console.error(err)
    }
  }

  const toggleInclude = (route) => {
    updateRoute(route.id, { includeInBuild: !route.include_in_build })
  }

  const updatePageType = (route, newType) => {
    updateRoute(route.id, { pageType: newType })
  }

  const selectAllVisible = () => {
    filteredRoutes.forEach(route => {
      if (!route.include_in_build) {
        updateRoute(route.id, { includeInBuild: true })
      }
    })
  }

  const deselectAllVisible = () => {
    filteredRoutes.forEach(route => {
      if (route.include_in_build) {
        updateRoute(route.id, { includeInBuild: false })
      }
    })
  }

  // Filter routes
  const filteredRoutes = routes.filter(route => {
    const matchesSearch = !search || 
      route.path?.toLowerCase().includes(search.toLowerCase()) ||
      route.title?.toLowerCase().includes(search.toLowerCase())
    const matchesType = !selectedType || route.page_type === selectedType
    const matchesInclude = !showOnlyIncluded || route.include_in_build
    return matchesSearch && matchesType && matchesInclude
  })

  // Sort by priority
  const sortedRoutes = [...filteredRoutes].sort((a, b) => (b.priority || 0) - (a.priority || 0))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Route className="h-5 w-5" />
            Route Plan ({stats.total} routes)
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {stats.included} routes will be created in the new site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            Include All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAllVisible}>
            Exclude All
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRoutes}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sitemap info */}
      {sitemapData && (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg',
          sitemapData.found 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
        )}>
          <Map className={cn(
            'h-5 w-5',
            sitemapData.found ? 'text-green-600' : 'text-yellow-600'
          )} />
          <div className="flex-1">
            <p className={cn(
              'font-medium text-sm',
              sitemapData.found ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
            )}>
              {sitemapData.found 
                ? `Sitemap found: ${sitemapData.entryCount} URLs`
                : 'No sitemap found - routes based on crawled pages'}
            </p>
            {sitemapData.url && (
              <p className="text-xs text-[var(--text-tertiary)]">{sitemapData.url}</p>
            )}
          </div>
          {sitemapData.found && (
            <Badge variant="outline" className="bg-white dark:bg-transparent">
              {sitemapData.type}
            </Badge>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="showIncluded"
            checked={showOnlyIncluded}
            onCheckedChange={setShowOnlyIncluded}
          />
          <label htmlFor="showIncluded" className="text-sm text-[var(--text-secondary)]">
            Included only
          </label>
        </div>
      </div>

      {/* Type filter badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedType === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedType(null)}
        >
          All
        </Badge>
        {Object.entries(stats.byType || {}).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <Badge
            key={type}
            variant={selectedType === type ? 'default' : 'outline'}
            className={cn('cursor-pointer', selectedType === type && PAGE_TYPE_COLORS[type])}
            onClick={() => setSelectedType(selectedType === type ? null : type)}
          >
            {type} ({count})
          </Badge>
        ))}
      </div>

      {/* Routes list */}
      <ScrollArea className="h-[400px] border border-[var(--glass-border)] rounded-lg">
        <div className="p-2 space-y-1">
          {sortedRoutes.map((route) => {
            const Icon = PAGE_TYPE_ICONS[route.page_type] || FileQuestion

            return (
              <div
                key={route.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  route.include_in_build
                    ? 'bg-[var(--brand-primary)]/5'
                    : 'bg-[var(--surface-secondary)] opacity-60'
                )}
              >
                <Checkbox
                  checked={route.include_in_build}
                  onCheckedChange={() => toggleInclude(route)}
                />

                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg',
                    PAGE_TYPE_COLORS[route.page_type] || PAGE_TYPE_COLORS.other
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate">
                    {route.path || '/'}
                  </p>
                  {route.title && (
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {route.title}
                    </p>
                  )}
                </div>

                <Select
                  value={route.page_type || 'other'}
                  onValueChange={(value) => updatePageType(route, value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                  {route.source_type === 'sitemap' && (
                    <Badge variant="outline" className="text-xs">
                      <Map className="h-3 w-3 mr-1" />
                      sitemap
                    </Badge>
                  )}
                  {route.sitemap_lastmod && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(route.sitemap_lastmod).toLocaleDateString()}
                    </span>
                  )}
                  {route.sitemap_priority && (
                    <span>P: {route.sitemap_priority}</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateRoute(route.id, { priority: (route.priority || 5) + 1 })}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-[var(--text-tertiary)] w-4 text-center">
                    {route.priority || 0}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateRoute(route.id, { priority: Math.max(0, (route.priority || 5) - 1) })}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}

          {sortedRoutes.length === 0 && (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              {search ? 'No routes match your search' : 'No routes found'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="bg-[var(--surface-secondary)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-2">Route Summary</h4>
        <p className="text-sm text-[var(--text-secondary)]">
          The new site will have <strong>{stats.included}</strong> routes based on this plan.
          {sitemapData?.found && (
            <span> Routes were derived from the existing sitemap to ensure all important pages are preserved.</span>
          )}
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          Tip: Adjust page types and priorities to match your new site structure. 
          Routes marked as "included" will be automatically generated.
        </p>
      </div>
    </div>
  )
}

export default RoutePlanView
