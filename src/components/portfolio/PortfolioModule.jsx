// src/components/PortfolioManagement.jsx
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import { 
  Plus, Loader2, Eye, CheckCircle2, ExternalLink, 
  Briefcase, MapPin, TrendingUp, Star, Search,
  MoreVertical, Trash2, Edit2, Globe, ArrowUpDown, Filter, X,
  Sparkles, BarChart3
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { portfolioApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'
import PortfolioAIDialog from './PortfolioAIDialog'

// Status colors
const statusColors = {
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-100 text-amber-700 border-amber-200',
  archived: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
}

// Industry colors for visual variety
const industryColors = {
  restaurant: 'from-orange-500 to-red-500',
  healthcare: 'from-blue-500 to-cyan-500',
  retail: 'from-purple-500 to-pink-500',
  technology: 'from-indigo-500 to-blue-500',
  legal: 'from-slate-600 to-slate-800',
  finance: 'from-emerald-500 to-teal-500',
  education: 'from-yellow-500 to-orange-500',
  default: 'from-slate-400 to-slate-600'
}

// Service badge colors
const serviceColors = {
  'Web Design': 'bg-blue-50 text-blue-700',
  'Website Redesign': 'bg-indigo-50 text-indigo-700',
  'SEO': 'bg-emerald-50 text-emerald-700',
  'Local SEO': 'bg-green-50 text-green-700',
  'Paid Ads Management': 'bg-purple-50 text-purple-700',
  'Content Marketing': 'bg-pink-50 text-pink-700',
  'Email & Social Marketing': 'bg-orange-50 text-orange-700',
  'Video Production': 'bg-red-50 text-red-700',
  'Photography': 'bg-amber-50 text-amber-700',
  'Branding': 'bg-violet-50 text-violet-700',
  'UX/UI Design': 'bg-cyan-50 text-cyan-700',
  'E-commerce Development': 'bg-teal-50 text-teal-700'
}

// Stats Card
function StatsCard({ icon: Icon, label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className="bg-[var(--glass-bg)] rounded-xl p-4 border border-[var(--glass-border)] shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        </div>
      </div>
    </div>
  )
}

// Portfolio Card Component
function PortfolioCard({ item, onPublish, onView, onEdit, onDelete }) {
  const getIndustryGradient = (industry) => {
    const key = industry?.toLowerCase() || 'default'
    return industryColors[key] || industryColors.default
  }

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden border border-[var(--glass-border)] shadow-md bg-[var(--glass-bg)] backdrop-blur-sm">
      {/* Header with hero image or gradient fallback */}
      <div className="h-40 relative overflow-hidden">
        {item.hero_image ? (
          <img 
            src={item.hero_image} 
            alt={item.hero_image_alt || item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Fallback to gradient if image fails to load
              e.target.style.display = 'none'
              e.target.parentElement.classList.add('bg-gradient-to-br', getIndustryGradient(item.category))
            }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getIndustryGradient(item.category)}`}>
            {/* Decorative pattern for gradient fallback */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/20" />
              <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
            </div>
          </div>
        )}
        
        {/* Dark overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <Badge className={`${statusColors[item.status]} border text-xs font-medium backdrop-blur-sm`}>
            {item.status}
          </Badge>
        </div>

        {/* Featured badge */}
        {item.featured && (
          <div className="absolute top-3 left-24">
            <Badge className="bg-yellow-400/90 text-yellow-900 border-0 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Featured
            </Badge>
          </div>
        )}

        {/* Actions dropdown */}
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit?.(item)}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="w-4 h-4 mr-2" /> View Live
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(`https://sonor.io/portfolio/${item.slug}/trifolio/`, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" /> View Trifolio
              </DropdownMenuItem>
              {item.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onPublish(item.id)} className="text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Publish
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(item.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Title overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-white text-lg line-clamp-1 drop-shadow-lg">
            {item.title}
          </h3>
          <p className="text-sm text-white/80 line-clamp-1">{item.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <CardContent className="pt-4 pb-4 px-4">
        <div className="space-y-3">
          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              {item.category || 'Uncategorized'}
            </span>
            {item.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {item.location}
              </span>
            )}
            {item.live_url && (
              <a 
                href={item.live_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
              >
                <Globe className="w-3.5 h-3.5" />
                Website
              </a>
            )}
          </div>

          {/* Services */}
          {item.services && item.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.services.slice(0, 3).map(service => (
                <Badge 
                  key={service} 
                  variant="secondary" 
                  className={`text-xs ${serviceColors[service] || 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'} border-0`}
                >
                  {service}
                </Badge>
              ))}
              {item.services.length > 3 && (
                <Badge variant="secondary" className="text-xs bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-0">
                  +{item.services.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* KPIs from database */}
          {item.kpis && Object.keys(item.kpis).length > 0 && (
            <div className="flex items-center gap-4 pt-2 border-t border-[var(--glass-border)]">
              {item.kpis.traffic_increase && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">+{item.kpis.traffic_increase}% Traffic</span>
                </div>
              )}
              {item.kpis.ranking_improvements && (
                <div className="flex items-center gap-1 text-blue-600">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">#{item.kpis.ranking_improvements} Ranking</span>
                </div>
              )}
              {item.kpis.conversion_increase && (
                <div className="flex items-center gap-1 text-purple-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">+{item.kpis.conversion_increase}% Conversions</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function PortfolioManagement() {
  const { user, currentProject } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  // Allow access if user is admin OR if they have a current project context
  const hasAccess = isAdmin || !!currentProject
  
  const [portfolioItems, setPortfolioItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Access check - admins or org members with project context
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">Access denied. Please select a project first.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchPortfolioItems()
  }, [])

  const fetchPortfolioItems = async () => {
    setIsLoading(true)
    try {
      const response = await portfolioApi.listItems()
      setPortfolioItems(response.data.portfolioItems || response.data || [])
    } catch (err) {
      console.error('Failed to fetch portfolio items:', err)
      setPortfolioItems([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort
  const filteredItems = portfolioItems
    .filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return item.title?.toLowerCase().includes(query) || 
               item.subtitle?.toLowerCase().includes(query) ||
               item.category?.toLowerCase().includes(query) ||
               item.location?.toLowerCase().includes(query)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
      return 0
    })

  const stats = {
    total: portfolioItems.length,
    published: portfolioItems.filter(p => p.status === 'published').length,
    draft: portfolioItems.filter(p => p.status === 'draft').length,
    featured: portfolioItems.filter(p => p.featured).length
  }

  const handleCreateSuccess = (result) => {
    setSuccess('Portfolio item created successfully!')
    fetchPortfolioItems()
    setTimeout(() => setSuccess(''), 3000)
  }

  const handlePublish = async (portfolioId) => {
    try {
      await portfolioApi.publishItem(portfolioId)
      setSuccess('Portfolio item published!')
      fetchPortfolioItems()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish')
    }
  }

  const handleView = (item) => {
    window.open(`https://sonor.io/portfolio/${item.slug}/`, '_blank')
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[var(--surface-primary)]">
        {/* Header */}
        <div className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                  Portfolio Management
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Create AI-powered portfolio items with automated screenshots
                </p>
              </div>
              <Button 
                variant="glass-primary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create with AI
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatsCard icon={Briefcase} label="Total Projects" value={stats.total} color="purple" />
            <StatsCard icon={CheckCircle2} label="Published" value={stats.published} color="emerald" />
            <StatsCard icon={Edit2} label="Drafts" value={stats.draft} color="amber" />
            <StatsCard icon={Star} label="Featured" value={stats.featured} color="blue" />
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <X className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button size="sm" variant="ghost" onClick={() => setError('')} className="ml-auto">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-[var(--text-tertiary)]" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">By Title</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-sm text-[var(--text-secondary)] ml-auto">
                {filteredItems.length} project{filteredItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Portfolio Grid */}
          {isLoading && !portfolioItems.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
              <p className="text-[var(--text-secondary)] mt-4">Loading projects...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">No portfolio items yet</h3>
              <p className="text-[var(--text-secondary)] mt-1 mb-6">Create your first portfolio item to showcase your work</p>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Portfolio Item
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  onPublish={handlePublish}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </div>

        {/* AI Portfolio Creator Dialog */}
        <PortfolioAIDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </TooltipProvider>
  )
}
