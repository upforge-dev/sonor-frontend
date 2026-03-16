/**
 * SalesModule - Main dashboard for sales prospecting feature
 * Shows target companies analyzed by the Chrome extension
 * Features: Score-based sorting, claim/unclaim, call prep generation
 */
import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Target,
  Flame,
  Clock,
  User,
  X,
  ChevronDown,
  Plus,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTargetCompanies, useClaimTargetCompany } from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'
import TargetCompanyCard from './TargetCompanyCard'
import TargetCompanyModal from './TargetCompanyModal'
import { toast } from 'sonner'

// Score filter presets
const SCORE_FILTERS = [
  { id: 'all', label: 'All Scores', min: 0, max: 100 },
  { id: 'hot', label: 'Hot Leads (80+)', min: 80, max: 100 },
  { id: 'warm', label: 'Warm (60+)', min: 60, max: 100 },
  { id: 'potential', label: 'Potential (40+)', min: 40, max: 100 },
]

// Sort options
const SORT_OPTIONS = [
  { id: 'score_desc', label: 'Highest Score', field: 'score', direction: 'desc' },
  { id: 'score_asc', label: 'Lowest Score', field: 'score', direction: 'asc' },
  { id: 'recent', label: 'Most Recent', field: 'analyzed_at', direction: 'desc' },
  { id: 'oldest', label: 'Oldest', field: 'analyzed_at', direction: 'asc' },
]

// Status filter options
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'claimed', label: 'Claimed' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'not_qualified', label: 'Not Qualified' },
]

export default function SalesModule({ title = 'Sales', fetchParams }) {
  const { user } = useAuthStore()
  
  // Fetch target companies
  const normalizedFetchParams = useMemo(() => fetchParams ?? {}, [fetchParams])
  const { 
    data: companiesData, 
    isLoading: targetCompaniesLoading, 
    error: targetCompaniesError,
    refetch: refetchTargetCompanies
  } = useTargetCompanies(normalizedFetchParams)
  
  const targetCompanies = companiesData?.companies || []
  const targetCompaniesTotal = companiesData?.total || 0
  
  // Claim mutation
  const claimMutation = useClaimTargetCompany()
  
  // Selected company state
  const [selectedTargetCompany, setSelectedTargetCompany] = useState(null)

  // Filters & sorting state
  const [searchQuery, setSearchQuery] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('score_desc')
  const [showOnlyMine, setShowOnlyMine] = useState(false)

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = [...targetCompanies]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c => 
        c.domain?.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query) ||
        c.ai_summary?.toLowerCase().includes(query)
      )
    }

    // Score filter
    const scorePreset = SCORE_FILTERS.find(f => f.id === scoreFilter)
    if (scorePreset && scoreFilter !== 'all') {
      result = result.filter(c => 
        (c.score || 0) >= scorePreset.min && (c.score || 0) <= scorePreset.max
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // Show only mine
    if (showOnlyMine && user?.id) {
      result = result.filter(c => c.claimed_by === user.id)
    }

    // Sort
    const sortOption = SORT_OPTIONS.find(s => s.id === sortBy) || SORT_OPTIONS[0]
    result.sort((a, b) => {
      const aVal = a[sortOption.field] ?? 0
      const bVal = b[sortOption.field] ?? 0
      
      if (sortOption.direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    })

    return result
  }, [targetCompanies, searchQuery, scoreFilter, statusFilter, sortBy, showOnlyMine, user?.id])

  // Stats for header
  const stats = useMemo(() => {
    const total = targetCompanies.length
    const hot = targetCompanies.filter(c => (c.score || 0) >= 80).length
    const claimed = targetCompanies.filter(c => c.claimed_by).length
    const mine = targetCompanies.filter(c => c.claimed_by === user?.id).length
    return { total, hot, claimed, mine }
  }, [targetCompanies, user?.id])

  const handleClaim = async (companyId) => {
    try {
      await claimTargetCompany(companyId)
      toast.success('Company claimed!')
    } catch (err) {
      toast.error('Failed to claim company')
    }
  }

  const handleCallPrep = async (companyId) => {
    try {
      await getCallPrep(companyId)
      toast.success('Call prep generated!')
    } catch (err) {
      toast.error('Failed to generate call prep')
    }
  }

  const handleRefresh = () => {
    fetchTargetCompanies(normalizedFetchParams)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setScoreFilter('all')
    setStatusFilter('all')
    setShowOnlyMine(false)
  }

  const hasActiveFilters = searchQuery || scoreFilter !== 'all' || statusFilter !== 'all' || showOnlyMine

  return (
    <div className="h-full flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats + Filters Row */}
        <div className="flex-shrink-0 p-4 border-b border-[var(--glass-border)]">
          {/* Stats Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <Target className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{stats.total}</span>
                <span className="text-xs text-[var(--text-muted)]">Total</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <Flame className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{stats.hot}</span>
                <span className="text-xs text-red-400/70">Hot</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <User className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">{stats.mine}</span>
                <span className="text-xs text-[var(--text-muted)]">Mine</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={targetCompaniesLoading}>
                <RefreshCw className={cn('w-4 h-4', targetCompaniesLoading && 'animate-spin')} />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Search domains, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[var(--glass-bg)]"
              />
            </div>

            {/* Score Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {SCORE_FILTERS.find(f => f.id === scoreFilter)?.label || 'All Scores'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SCORE_FILTERS.map(filter => (
                  <DropdownMenuItem 
                    key={filter.id}
                    onClick={() => setScoreFilter(filter.id)}
                  >
                    {filter.label}
                    {scoreFilter === filter.id && <Badge variant="secondary" className="ml-2 text-[10px]">Active</Badge>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Status: {STATUS_FILTERS.find(f => f.id === statusFilter)?.label}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_FILTERS.map(filter => (
                  <DropdownMenuItem 
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {SORT_OPTIONS.map(option => (
                  <DropdownMenuItem 
                    key={option.id}
                    onClick={() => setSortBy(option.id)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Show Only Mine */}
            <Button
              variant={showOnlyMine ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyMine(!showOnlyMine)}
            >
              <User className="w-4 h-4 mr-2" />
              My Claims
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Companies Grid */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {targetCompaniesLoading && targetCompanies.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : targetCompaniesError ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">Failed to load companies</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-12">
                {hasActiveFilters ? (
                  <>
                    <p className="text-[var(--text-muted)]">No companies match your filters</p>
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <Target className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      No prospects yet
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                      Install the Sonor Sales Extension and start analyzing websites to see AI-scored prospects here.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCompanies.map(company => (
                  <TargetCompanyCard
                    key={company.id}
                    company={company}
                    onClick={(c) => setSelectedTargetCompany(c)}
                    onClaim={handleClaim}
                    onCallPrep={handleCallPrep}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Full-Featured Modal */}
      <TargetCompanyModal
        company={selectedTargetCompany}
        open={!!selectedTargetCompany}
        onClose={() => setSelectedTargetCompany(null)}
      />
    </div>
  )
}
