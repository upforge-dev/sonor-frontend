// src/components/affiliates/AffiliatesModule.jsx
// Affiliates Module - uses ModuleLayout for consistent shell
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Link2,
  Plus,
  Search,
  RefreshCw,
  Users,
  Play,
  Pause,
  ChevronDown,
  MousePointerClick,
  CheckCircle,
  DollarSign,
  Globe,
  ExternalLink,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  TrendingUp,
  LayoutGrid,
  List,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { QueryErrorFallback } from '@/components/QueryErrorFallback'
import { CardSkeleton } from '@/components/skeletons'
import useAuthStore from '@/lib/auth-store'
import { useAffiliates, useOffers, affiliatesKeys } from '@/lib/hooks/use-affiliates'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useBrandColors } from '@/hooks/useBrandColors'
import { toast } from 'sonner'

// Sub-components
import AffiliateDetailPanel from './AffiliateDetailPanel'
import CreateAffiliateDialog from './CreateAffiliateDialog'
import CreateAffiliateForm from './CreateAffiliateForm'
import CreateOfferDialog from './CreateOfferDialog'

// ============================================================================
// AFFILIATE TILE CARD
// ============================================================================

function AffiliateTile({ affiliate, isSelected, onSelect, offers }) {
  const affiliateOffers = offers?.filter(o => o.affiliate_id === affiliate.id) || []
  
  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num?.toString() || '0'
  }

  const formatCurrency = (amount) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <motion.button
      onClick={() => onSelect(affiliate.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "bg-card hover:bg-card/80 hover:shadow-md",
        isSelected
          ? "ring-2 ring-primary border-primary shadow-md"
          : "border-border hover:border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {affiliate.logo_url ? (
            <img 
              src={affiliate.logo_url} 
              alt={affiliate.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <Globe className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{affiliate.name}</span>
          </div>
          {affiliate.website_url && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {affiliate.website_url.replace(/^https?:\/\//, '')}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
            <MousePointerClick className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold">{formatNumber(affiliate.total_clicks)}</div>
          <div className="text-[10px] text-muted-foreground">Clicks</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5">
            <CheckCircle className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold">{formatNumber(affiliate.total_conversions)}</div>
          <div className="text-[10px] text-muted-foreground">Conversions</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold">{formatCurrency(affiliate.total_payout)}</div>
          <div className="text-[10px] text-muted-foreground">Payout</div>
        </div>
      </div>

      {/* Offers count */}
      {affiliateOffers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          {affiliateOffers.length} active offer{affiliateOffers.length !== 1 ? 's' : ''}
        </div>
      )}
    </motion.button>
  )
}

// ============================================================================
// MAIN MODULE
// ============================================================================

export default function AffiliatesModule({ className }) {
  const { currentProject } = useAuthStore()
  const { primary, primaryLight, toRgba } = useBrandColors()
  const queryClient = useQueryClient()
  
  // UI state (previously in store)
  const [selectedAffiliateId, setSelectedAffiliateId] = useState(null)
  const [selectedView, setSelectedView] = useState('all')
  
  // React Query hooks - auto-fetch when projectId is available
  const { data: affiliates = [], isLoading, isError, refetch } = useAffiliates(currentProject?.id, selectedView)
  const { data: offers = [] } = useOffers(currentProject?.id)

  const [searchQuery, setSearchQuery] = useState('')
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Filter affiliates by search query
  const filteredAffiliates = affiliates.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.website_url && a.website_url.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedAffiliate = affiliates.find(a => a.id === selectedAffiliateId)
  
  const handleRefresh = () => {
    if (currentProject?.id) {
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.list(currentProject.id) })
      queryClient.invalidateQueries({ queryKey: affiliatesKeys.offers(currentProject.id) })
    }
  }

  // Stats for header
  const stats = {
    total: affiliates.length,
    active: affiliates.filter(a => a.status === 'active').length,
    totalClicks: affiliates.reduce((sum, a) => sum + (a.total_clicks || 0), 0),
    totalConversions: affiliates.reduce((sum, a) => sum + (a.total_conversions || 0), 0),
  }

  const subtitle = `${stats.total} partners · ${stats.totalClicks.toLocaleString()} clicks · ${stats.totalConversions.toLocaleString()} conversions`
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="gap-1.5"
        style={{ backgroundColor: primary }}
        onClick={() => setShowCreateForm(true)}
        data-tour="affiliates-create"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Affiliate</span>
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
      <div className="flex border rounded-md overflow-hidden">
        {[
          { id: 'grid', icon: LayoutGrid },
          { id: 'list', icon: List },
        ].map((mode) => (
          <Tooltip key={mode.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "h-8 px-2.5 transition-colors flex items-center",
                  viewMode === mode.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <mode.icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{mode.id === 'grid' ? 'Grid view' : 'List view'}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
  const leftSidebarContent = (
    <div className="p-4 space-y-6" data-tour="affiliates-sidebar">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search affiliates..."
          className="pl-8 h-9 text-sm bg-background"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <p className="uppercase tracking-wider text-muted-foreground mb-2">Views</p>
        {[
          { id: 'all', icon: Users, label: 'All Affiliates', count: stats.total },
          { id: 'active', icon: Play, label: 'Active', count: stats.active },
          { id: 'paused', icon: Pause, label: 'Paused', count: stats.total - stats.active },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
              selectedView === view.id ? "" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            style={selectedView === view.id ? { backgroundColor: toRgba(primary, 0.1), color: primary } : undefined}
          >
            <view.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{view.label}</span>
            <Badge variant="secondary" className="h-5 px-1.5">{view.count}</Badge>
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <p className="uppercase tracking-wider text-muted-foreground mb-2">Performance</p>
        <div className="bg-background rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> Total Clicks
            </span>
            <span>{stats.totalClicks.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Conversions
            </span>
            <span>{stats.totalConversions.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Conv. Rate
            </span>
            <span>
              {stats.totalClicks > 0 ? `${((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
  const rightSidebarContent = selectedAffiliate ? (
    <div data-tour="affiliates-detail"><AffiliateDetailPanel affiliate={selectedAffiliate} offers={offers} /></div>
  ) : (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <div className="text-center p-6">
        <Link2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Select an affiliate</p>
        <p className="text-muted-foreground mt-1">Click on a tile to view details</p>
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <ModuleLayout
        data-sonor-help="affiliates/dashboard"
        ariaLabel="Affiliates"
        className={className}
        leftSidebar={leftSidebarContent}
        rightSidebar={rightSidebarContent}
        leftSidebarOpen={showLeftSidebar}
        rightSidebarOpen={showRightSidebar}
        onLeftSidebarOpenChange={setShowLeftSidebar}
        onRightSidebarOpenChange={setShowRightSidebar}
        leftSidebarTitle="Views"
        rightSidebarTitle="Details"
        leftSidebarWidth={220}
        rightSidebarWidth={480}
      >
        <ModuleLayout.Header
          title="Affiliates"
          icon={MODULE_ICONS.affiliates}
          subtitle={subtitle}
          actions={headerActions}
          data-tour="affiliates-header"
        />
        <ModuleLayout.Content data-tour="affiliates-grid">
          {isError ? (
            <div className="p-4 flex items-center justify-center min-h-[200px]">
              <QueryErrorFallback
                message="Couldn't load affiliates."
                onRetry={() => refetch()}
              />
            </div>
          ) : showCreateForm ? (
            <CreateAffiliateForm
              onCancel={() => setShowCreateForm(false)}
              onSuccess={() => setShowCreateForm(false)}
            />
          ) : (
            <div className="p-4">
              {isLoading ? (
                <div className={cn(
                  viewMode === 'grid'
                    ? showRightSidebar
                      ? "grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
                      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                    : "flex flex-col gap-3"
                )}>
                  {Array.from({ length: viewMode === 'grid' ? 6 : 5 }).map((_, i) => (
                    <CardSkeleton key={i} showHeader={true} contentLines={2} />
                  ))}
                </div>
              ) : filteredAffiliates.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No affiliates found"
                  description={
                    affiliates.length === 0
                      ? 'Create your first affiliate partner to get started'
                      : 'Try adjusting your search or filter'
                  }
                  actionLabel={affiliates.length === 0 ? 'Add First Affiliate' : undefined}
                  onAction={affiliates.length === 0 ? () => setShowCreateForm(true) : undefined}
                />
              ) : (
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? showRightSidebar
                        ? "grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
                        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                      : "flex flex-col gap-3"
                  )}
                >
                  {filteredAffiliates.map((affiliate) => (
                    <AffiliateTile
                      key={affiliate.id}
                      affiliate={affiliate}
                      isSelected={selectedAffiliateId === affiliate.id}
                      onSelect={setSelectedAffiliateId}
                      offers={offers}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ModuleLayout.Content>
      </ModuleLayout>
    </TooltipProvider>
  )
}
