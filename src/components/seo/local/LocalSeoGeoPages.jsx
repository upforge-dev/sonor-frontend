// src/components/seo/local/LocalSeoGeoPages.jsx
// Geo Page Coverage - Track location/service area landing pages
// MIGRATED TO REACT QUERY - Jan 29, 2026
import { useState, useEffect } from 'react'
import { useSeoGeoPages, seoLocalKeys } from '@/hooks/seo'
import { locationPagesApi } from '@/lib/portal-api'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  RefreshCw, 
  MapPin,
  FileText,
  Search,
  Plus,
  ExternalLink,
  Eye,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  Filter,
  BarChart3,
  Globe,
  Sparkles
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import LocationPageGenerator from './LocationPageGenerator'
import LocationIntelligenceWizard from './LocationIntelligenceWizard'

// Status colors and labels
const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-[var(--brand-primary)]', icon: CheckCircle },
  thin: { label: 'Thin Content', color: 'bg-[var(--accent-orange)]', icon: AlertTriangle },
  missing: { label: 'Missing', color: 'bg-[var(--accent-red)]', icon: XCircle },
  draft: { label: 'Draft', color: 'bg-[var(--text-tertiary)]', icon: FileText }
}

export default function LocalSeoGeoPages({ projectId }) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('location')
  const [sortDir, setSortDir] = useState('asc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showGenerator, setShowGenerator] = useState(false)
  const [showIntelligenceWizard, setShowIntelligenceWizard] = useState(false)
  
  // Services for the project (would come from project settings or SEO knowledge base)
  const [services, setServices] = useState([])

  // React Query hook for geo pages
  const { data: geoPages = [], isLoading: geoPagesLoading, refetch: refetchGeoPages } = useSeoGeoPages(projectId)

  useEffect(() => {
    if (projectId) {
      loadServices()
    }
  }, [projectId])

  const loadServices = async () => {
    // Load services from project settings or SEO knowledge base
    // For now, these are the typical services for a law firm
    // TODO: Pull from seo_knowledge_base or project_services table
    setServices([
      { slug: 'adoption', name: 'Adoption', description: 'Adoption services' },
      { slug: 'divorce', name: 'Divorce', description: 'Divorce and separation' },
      { slug: 'custody', name: 'Child Custody', description: 'Child custody and visitation' },
      { slug: 'personal-injury', name: 'Personal Injury', description: 'Personal injury cases' },
      { slug: 'child-protection', name: 'Child Protection', description: 'CPS defense' },
      { slug: 'family-law', name: 'Family Law', description: 'General family law' }
    ])
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      await refetchGeoPages()
    } catch (error) {
      console.error('Failed to fetch geo pages:', error)
    }
    setIsLoading(false)
  }

  const handleGenerationSuccess = async (result) => {
    console.log('Generation complete:', result)
    // Refresh the geo pages list to show newly generated pages
    await refetchGeoPages()
  }

  // Filter and sort pages
  const filteredPages = (geoPages || [])
    .filter(page => {
      const matchesSearch = !searchTerm || 
        page.target_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.page_path?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || page.page_status === filterStatus
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'location':
          aVal = a.target_location || ''
          bVal = b.target_location || ''
          break
        case 'impressions':
          aVal = a.impressions_30d || 0
          bVal = b.impressions_30d || 0
          break
        case 'clicks':
          aVal = a.clicks_30d || 0
          bVal = b.clicks_30d || 0
          break
        case 'rank':
          aVal = a.avg_local_rank || 999
          bVal = b.avg_local_rank || 999
          break
        case 'score':
          aVal = a.content_score || 0
          bVal = b.content_score || 0
          break
        default:
          aVal = a.target_location || ''
          bVal = b.target_location || ''
      }
      
      if (typeof aVal === 'string') {
        return sortDir === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

  // Stats
  const stats = {
    total: geoPages?.length || 0,
    active: geoPages?.filter(p => p.page_status === 'active').length || 0,
    thin: geoPages?.filter(p => p.page_status === 'thin').length || 0,
    missing: geoPages?.filter(p => p.page_status === 'missing').length || 0,
    avgScore: geoPages?.length > 0 
      ? Math.round(geoPages.reduce((sum, p) => sum + (p.content_score || 0), 0) / geoPages.length)
      : 0
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Geo Page Coverage</h2>
          <p className="text-[var(--text-secondary)]">
            Track your location and service area landing pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowGenerator(true)}
            className="border-[var(--glass-border)] hover:border-[var(--brand-primary)]"
          >
            <Sparkles className="h-4 w-4 mr-2" style={{ color: 'var(--brand-primary)' }} />
            Quick Generate
          </Button>
          <Button 
            onClick={() => setShowIntelligenceWizard(true)}
            className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90"
          >
            <SignalIcon className="h-4 w-4 mr-2" />
            Location Intelligence
          </Button>
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || geoPagesLoading}
            className="border-[var(--glass-border)]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Analyze
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <Globe className="h-5 w-5 mx-auto mb-2 text-[var(--text-secondary)]" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            <p className="text-sm text-[var(--text-secondary)]">Total Locations</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-2 text-[var(--brand-primary)]" />
            <p className="text-2xl font-bold text-[var(--brand-primary)]">{stats.active}</p>
            <p className="text-sm text-[var(--text-secondary)]">Active Pages</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-[var(--accent-orange)]" />
            <p className="text-2xl font-bold text-[var(--accent-orange)]">{stats.thin}</p>
            <p className="text-sm text-[var(--text-secondary)]">Thin Content</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <XCircle className="h-5 w-5 mx-auto mb-2 text-[var(--accent-red)]" />
            <p className="text-2xl font-bold text-[var(--accent-red)]">{stats.missing}</p>
            <p className="text-sm text-[var(--text-secondary)]">Missing Pages</p>
          </CardContent>
        </Card>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-2 text-[var(--text-secondary)]" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.avgScore}</p>
            <p className="text-sm text-[var(--text-secondary)]">Avg. Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--text-secondary)]" />
              <div className="flex gap-1">
                {['all', 'active', 'thin', 'missing'].map(status => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className={filterStatus === status 
                      ? 'bg-[var(--brand-primary)]' 
                      : 'border-[var(--glass-border)]'
                    }
                  >
                    {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                <TableHead 
                  className="cursor-pointer hover:text-[var(--text-primary)]"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center gap-1">
                    Location
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-[var(--text-primary)] text-right"
                  onClick={() => handleSort('impressions')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Impressions
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-[var(--text-primary)] text-right"
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Clicks
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-[var(--text-primary)] text-right"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Avg. Rank
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-[var(--text-primary)] text-right"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Score
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPages.length > 0 ? (
                filteredPages.map((page) => {
                  const statusConfig = STATUS_CONFIG[page.page_status] || STATUS_CONFIG.active
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow 
                      key={page.id} 
                      className="border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-[var(--brand-primary)]" />
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {page.target_location}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {page.page_path}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${statusConfig.color} text-white border-0`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-[var(--text-primary)]">
                          {(page.impressions_30d || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-[var(--text-primary)]">
                          {(page.clicks_30d || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {page.avg_local_rank ? (
                          <span className={
                            page.avg_local_rank <= 3 ? 'text-[var(--brand-primary)] font-medium' :
                            page.avg_local_rank <= 10 ? 'text-[var(--accent-orange)]' :
                            'text-[var(--accent-red)]'
                          }>
                            {page.avg_local_rank.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress 
                            value={page.content_score || 0} 
                            className="w-16 h-1.5"
                          />
                          <span className="text-sm text-[var(--text-primary)] w-8">
                            {page.content_score || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {page.page_url && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={page.page_url} target="_blank" rel="noopener">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <MapPin className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                    <p className="text-[var(--text-secondary)]">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No pages match your filters'
                        : 'No geo pages found'
                      }
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {filteredPages.some(p => p.recommendations?.length > 0) && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle>Page Recommendations</CardTitle>
            <CardDescription>
              Signal-powered suggestions to improve your geo pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPages
                .filter(p => p.recommendations?.length > 0)
                .slice(0, 5)
                .map(page => (
                  <div 
                    key={page.id}
                    className="p-4 bg-[var(--glass-bg-inset)] rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-[var(--brand-primary)]" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {page.target_location}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {page.recommendations.slice(0, 2).map((rec, i) => (
                        <div 
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Badge 
                            variant="outline" 
                            className={
                              rec.priority === 'high' 
                                ? 'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]' 
                                : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-[var(--accent-orange)]'
                            }
                          >
                            {rec.priority}
                          </Badge>
                          <span className="text-[var(--text-secondary)]">
                            {rec.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Page Generator Modal */}
      <LocationPageGenerator
        open={showGenerator}
        onOpenChange={setShowGenerator}
        projectId={projectId}
        services={services}
        onSuccess={handleGenerationSuccess}
      />

      {/* Location Intelligence Wizard - Premium Experience */}
      <LocationIntelligenceWizard
        open={showIntelligenceWizard}
        onOpenChange={setShowIntelligenceWizard}
        projectId={projectId}
        services={services}
        existingLocations={geoPages}
        onSuccess={handleGenerationSuccess}
      />
    </div>
  )
}
