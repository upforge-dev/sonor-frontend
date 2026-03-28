// ═══════════════════════════════════════════════════════════════════════════════
// Portfolio List View
// Grid of portfolio items with left sidebar for filters, stats, and navigation.
// Uses ModuleLayout with leftSidebar — mirrors CRM/Commerce/Forms pattern.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ModuleLayout from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SonorSpinner } from '@/components/SonorLoading'
import { portfolioApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import PortfolioAIDialog from './PortfolioAIDialog'
import GenerateFromProjectDialog from './GenerateFromProjectDialog'
import PortfolioSettings from './PortfolioSettings'
import {
  Search,
  MoreVertical,
  Edit2,
  Eye,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Star,
  Briefcase,
  MapPin,
  Globe,
  TrendingUp,
  BarChart3,
  Sparkles,
  Zap,
  Settings,
  AlertTriangle,
  LayoutGrid,
  ArrowUpDown,
  Filter,
  FolderOpen,
  Archive,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  published: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  draft: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  archived:
    'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--glass-border)]',
}

const INDUSTRY_GRADIENTS = {
  restaurant: 'from-orange-500 to-red-500',
  hospitality: 'from-orange-500 to-red-500',
  healthcare: 'from-blue-500 to-cyan-500',
  medical: 'from-blue-500 to-cyan-500',
  technology: 'from-indigo-500 to-blue-500',
  legal: 'from-slate-600 to-slate-800',
  finance: 'from-emerald-500 to-teal-500',
  retail: 'from-purple-500 to-pink-500',
  education: 'from-yellow-500 to-orange-500',
  'real estate': 'from-teal-500 to-emerald-500',
  construction: 'from-amber-600 to-orange-600',
}

const DEFAULT_GRADIENT = 'from-[var(--brand-primary)] to-[color-mix(in_oklch,var(--brand-primary),#000_30%)]'

function getIndustryGradient(industry) {
  if (!industry) return DEFAULT_GRADIENT
  const key = industry.toLowerCase()
  // Check partial match
  for (const [k, v] of Object.entries(INDUSTRY_GRADIENTS)) {
    if (key.includes(k)) return v
  }
  return DEFAULT_GRADIENT
}

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'featured', label: 'Featured First' },
]

// ─── Sidebar Quick Stat ──────────────────────────────────────────────────────

function SidebarStat({ label, value, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150',
        active
          ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'
      )}
    >
      <div
        className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          active
            ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
            : 'bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span
        className={cn(
          'text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full',
          active
            ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
            : 'bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]'
        )}
      >
        {value}
      </span>
    </button>
  )
}

// ─── Portfolio Item Card ─────────────────────────────────────────────────────

function PortfolioItemCard({ item, onEdit, onPublish, onUnpublish, onDelete }) {
  const navigate = useNavigate()
  const isGenerating = item.generation_status === 'generating'
  const generationFailed = item.generation_status === 'failed'
  const generationComplete = item.generation_status === 'complete'

  const handleClick = () => {
    navigate(item.id)
  }

  const handleAction = (action, e) => {
    e?.stopPropagation()
    action(item)
  }

  // Don't show placeholder paths as hero images
  const rawHero = item.hero_image || item.thumbnail_url
  const heroImage = rawHero && !rawHero.includes('placeholder') ? rawHero : null
  const gradient = getIndustryGradient(item.industry || item.category)
  const services = item.services || []
  const visibleServices = services.slice(0, 3)
  const overflowCount = Math.max(0, services.length - 3)

  return (
    <GlassCard
      hover={!isGenerating}
      className={cn(
        'overflow-hidden group cursor-pointer',
        isGenerating && 'opacity-80'
      )}
      onClick={handleClick}
    >
      {/* Hero image area */}
      <div className="relative h-44 overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={item.title || 'Portfolio item'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              'w-full h-full bg-gradient-to-br',
              gradient,
              'flex items-center justify-center'
            )}
          >
            <Briefcase className="h-12 w-12 text-white/30" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Status + Featured badges — top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium capitalize border backdrop-blur-sm',
              STATUS_STYLES[item.status] || STATUS_STYLES.draft
            )}
          >
            {item.status || 'draft'}
          </Badge>
          {item.featured && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium border bg-amber-500/10 text-amber-500 border-amber-500/20 backdrop-blur-sm"
            >
              <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
              Featured
            </Badge>
          )}
        </div>

        {/* Generation status overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <SonorSpinner size="sm" />
            <span className="text-white text-xs font-medium animate-pulse">
              Generating...
            </span>
          </div>
        )}

        {/* Generation complete/failed indicators — top-right */}
        {generationComplete && (
          <div className="absolute top-3 right-3">
            <div className="h-6 w-6 rounded-full bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
        )}
        {generationFailed && (
          <div className="absolute top-3 right-3">
            <div className="rounded-full bg-red-500/20 backdrop-blur-sm flex items-center gap-1 px-2 py-1">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-red-400 text-[10px] font-medium">Failed</span>
            </div>
          </div>
        )}

        {/* Actions dropdown — appears on hover */}
        {!isGenerating && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={(e) => handleAction(onEdit, e)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {item.live_url && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(item.live_url, '_blank')
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Live
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {item.status === 'published' ? (
                  <DropdownMenuItem
                    onClick={(e) => handleAction(onUnpublish, e)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Unpublish
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => handleAction(onPublish, e)}
                    className="text-emerald-600 focus:text-emerald-600"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Publish
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => handleAction(onDelete, e)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">
            {item.title || 'Untitled'}
          </h3>
          {item.subtitle && (
            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">
              {item.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Content area */}
      <GlassCardContent className="p-4">
        {/* Category + Location meta */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-3">
          {(item.category || item.industry) && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {item.category || item.industry}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
          {(item.website_url || item.live_url) && (
            <span className="flex items-center gap-1 truncate">
              <Globe className="h-3 w-3" />
              <span className="truncate max-w-[100px]">
                {(item.website_url || item.live_url)
                  .replace(/^https?:\/\//, '')
                  .replace(/\/$/, '')}
              </span>
            </span>
          )}
        </div>

        {/* Service badges */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {visibleServices.map((service, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] px-2 py-0.5 border-[var(--glass-border)] text-[var(--text-secondary)] bg-[var(--glass-bg)]"
              >
                {typeof service === 'string' ? service : service.name}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 border-[var(--glass-border)] text-[var(--text-tertiary)] bg-[var(--glass-bg)]"
              >
                +{overflowCount} more
              </Badge>
            )}
          </div>
        )}

        {/* KPI indicators */}
        {item.kpis && Object.keys(item.kpis).length > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t border-[var(--glass-border)]">
            {item.kpis.traffic_increase && (
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="font-medium text-[var(--text-primary)]">
                  +{item.kpis.traffic_increase}%
                </span>
                <span className="text-[var(--text-tertiary)]">traffic</span>
              </div>
            )}
            {item.kpis.ranking_improvements && (
              <div className="flex items-center gap-1 text-xs">
                <BarChart3 className="h-3 w-3 text-blue-500" />
                <span className="font-medium text-[var(--text-primary)]">
                  #{item.kpis.ranking_improvements}
                </span>
                <span className="text-[var(--text-tertiary)]">ranking</span>
              </div>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}

// ─── Left Sidebar ────────────────────────────────────────────────────────────

function PortfolioSidebar({
  stats,
  statusFilter,
  onStatusFilter,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onNavigateSettings,
}) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input
              placeholder="Search portfolio..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 bg-[var(--surface-secondary)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm"
            />
          </div>

          {/* Status navigation */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-1">
              Filter by Status
            </p>
            <div className="space-y-0.5">
              <SidebarStat
                label="All Items"
                value={stats.total}
                icon={LayoutGrid}
                active={statusFilter === 'all'}
                onClick={() => onStatusFilter('all')}
              />
              <SidebarStat
                label="Published"
                value={stats.published}
                icon={CheckCircle2}
                active={statusFilter === 'published'}
                onClick={() => onStatusFilter('published')}
              />
              <SidebarStat
                label="Drafts"
                value={stats.draft}
                icon={Edit2}
                active={statusFilter === 'draft'}
                onClick={() => onStatusFilter('draft')}
              />
              <SidebarStat
                label="Featured"
                value={stats.featured}
                icon={Star}
                active={statusFilter === 'featured'}
                onClick={() => onStatusFilter('featured')}
              />
              <SidebarStat
                label="Archived"
                value={stats.archived}
                icon={Archive}
                active={statusFilter === 'archived'}
                onClick={() => onStatusFilter('archived')}
              />
            </div>
          </div>

          <Separator className="bg-[var(--glass-border)]" />

          {/* Sort */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-1">
              Sort
            </p>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-9 bg-[var(--surface-secondary)] border-[var(--glass-border)] text-[var(--text-primary)] text-sm">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-[var(--text-tertiary)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-[var(--glass-border)]" />

          {/* Categories quick filter (future enhancement) */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-1">
              Categories
            </p>
            <p className="text-xs text-[var(--text-tertiary)] px-1">
              Categories appear here as you create portfolio items.
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom settings link */}
      <div className="p-4 border-t border-[var(--glass-border)]">
        <button
          onClick={onNavigateSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Settings className="h-4 w-4" />
          Portfolio Settings
        </button>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function PortfolioList() {
  const navigate = useNavigate()

  // Data state
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter/sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated_at')

  // Dialog state
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [generateFromProjectOpen, setGenerateFromProjectOpen] = useState(false)

  // Left sidebar controlled state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState('list') // 'list' | 'settings'

  // ── Fetch items ──────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await portfolioApi.listItems({
        sort: sortBy,
        status:
          statusFilter !== 'all' && statusFilter !== 'featured'
            ? statusFilter
            : undefined,
        featured: statusFilter === 'featured' ? true : undefined,
        search: searchQuery || undefined,
      })
      setItems(data?.items || data?.portfolioItems || data || [])
    } catch (err) {
      console.error('Failed to fetch portfolio items:', err)
      setError('Failed to load portfolio items.')
    } finally {
      setLoading(false)
    }
  }, [sortBy, statusFilter, searchQuery])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleEdit = (item) => navigate(item.id)

  const handlePublish = async (item) => {
    try {
      await portfolioApi.publishItem(item.id)
      fetchItems()
    } catch (err) {
      console.error('Failed to publish item:', err)
    }
  }

  const handleUnpublish = async (item) => {
    try {
      await portfolioApi.unpublishItem(item.id)
      fetchItems()
    } catch (err) {
      console.error('Failed to unpublish item:', err)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    try {
      await portfolioApi.deleteItem(item.id)
      fetchItems()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  const handleAIGenerated = () => {
    setAiDialogOpen(false)
    fetchItems()
  }

  const handleProjectGenerated = () => {
    setGenerateFromProjectOpen(false)
    fetchItems()
  }

  // ── Computed stats ─────────────────────────────────────────────────────

  const allItems = items || []
  const stats = {
    total: allItems.length,
    published: allItems.filter((i) => i.status === 'published').length,
    draft: allItems.filter((i) => i.status === 'draft').length,
    featured: allItems.filter((i) => i.featured).length,
    archived: allItems.filter((i) => i.status === 'archived').length,
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const sidebarContent = (
    <PortfolioSidebar
      stats={stats}
      statusFilter={statusFilter}
      onStatusFilter={setStatusFilter}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sortBy={sortBy}
      onSortChange={setSortBy}
      onNavigateSettings={() => setActiveView(activeView === 'settings' ? 'list' : 'settings')}
    />
  )

  return (
    <>
      <ModuleLayout
        leftSidebar={sidebarContent}
        leftSidebarOpen={leftSidebarOpen}
        onLeftSidebarOpenChange={setLeftSidebarOpen}
        leftSidebarWidth={260}
      >
        <ModuleLayout.Header
          title={activeView === 'settings' ? 'Portfolio Settings' : 'Portfolio'}
          icon={MODULE_ICONS.portfolio}
          breadcrumbs={activeView === 'settings'
            ? [{ label: 'Portfolio', onClick: () => setActiveView('list') }, { label: 'Settings' }]
            : [{ label: 'Portfolio' }]
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGenerateFromProjectOpen(true)}
                className="border-[var(--glass-border)] text-[var(--text-primary)]"
              >
                <Zap className="h-4 w-4 mr-2" />
                From Project
              </Button>
              <Button
                size="sm"
                onClick={() => setAiDialogOpen(true)}
                className="bg-[var(--brand-primary)] hover:opacity-90 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create with AI
              </Button>
            </div>
          }
        />

        <ModuleLayout.Content>
          {activeView === 'settings' ? (
            <div className="p-6">
              <PortfolioSettings />
            </div>
          ) : (
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <SonorSpinner size="lg" label="Loading portfolio..." />
              </div>
            ) : error ? (
              <GlassCard className="p-8">
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchItems}
                    className="border-[var(--glass-border)] text-[var(--text-primary)]"
                  >
                    Try Again
                  </Button>
                </div>
              </GlassCard>
            ) : allItems.length === 0 ? (
              <GlassCard className="p-12">
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: 'var(--brand-primary)' }}
                  >
                    <Briefcase className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                      No portfolio items yet
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                      Showcase your best work. Generate portfolio case studies from
                      existing projects or create them with AI assistance.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => setGenerateFromProjectOpen(true)}
                      className="border-[var(--glass-border)] text-[var(--text-primary)]"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Generate from Project
                    </Button>
                    <Button
                      onClick={() => setAiDialogOpen(true)}
                      className="bg-[var(--brand-primary)] hover:opacity-90 text-white"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create with AI
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <>
                {/* Count display */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {allItems.length} {allItems.length === 1 ? 'item' : 'items'}
                    {statusFilter !== 'all' && (
                      <span className="text-[var(--text-tertiary)]">
                        {' '}
                        · {statusFilter}
                      </span>
                    )}
                  </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {allItems.map((item) => (
                    <PortfolioItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onPublish={handlePublish}
                      onUnpublish={handleUnpublish}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </ModuleLayout.Content>
      </ModuleLayout>

      {/* Dialogs — must be OUTSIDE ModuleLayout (it only renders Header + Content children) */}
      <PortfolioAIDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onSuccess={handleAIGenerated}
      />

      <GenerateFromProjectDialog
        open={generateFromProjectOpen}
        onOpenChange={setGenerateFromProjectOpen}
        onGenerated={handleProjectGenerated}
      />
    </>
  )
}
