// src/components/seo/SEOKeywordTracking.jsx
// Keyword Ranking Tracker - monitor keyword positions over time
// MIGRATED TO REACT QUERY - Jan 29, 2026
import { useState } from 'react'
import { 
  useSeoTrackedKeywords,
  useSeoKeywordsSummary,
  useTrackKeywords,
  useAutoDiscoverKeywords,
  useRefreshKeywordRankings
} from '@/hooks/seo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  RefreshCw, 
  Plus,
  Search,
  Target,
  Star,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

export default function SEOKeywordTracking({ projectId }) {
  // React Query hooks
  const { data: keywordsData, isLoading: keywordsLoading } = useSeoTrackedKeywords(projectId)
  const { data: keywordsSummary } = useSeoKeywordsSummary(projectId)
  
  // Mutations
  const trackKeywordsMutation = useTrackKeywords()
  const autoDiscoverMutation = useAutoDiscoverKeywords()
  const refreshRankingsMutation = useRefreshKeywordRankings()
  
  // Extract data
  const trackedKeywords = keywordsData?.keywords || keywordsData || []
  
  const [newKeyword, setNewKeyword] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('impressions') // impressions | position | clicks | change | keyword
  const [sortDir, setSortDir] = useState('desc') // asc | desc

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      // Smart defaults: keyword asc, everything else desc
      setSortDir(col === 'keyword' ? 'asc' : 'desc')
    }
  }

  const handleRefresh = () => {
    refreshRankingsMutation.mutate(projectId)
  }

  const handleAutoDiscover = () => {
    autoDiscoverMutation.mutate(projectId)
  }

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return
    trackKeywordsMutation.mutate(
      { projectId, keywords: [newKeyword.trim()] },
      { onSuccess: () => setNewKeyword('') }
    )
  }

  const getPositionChange = (keyword) => {
    const current = keyword.avg_position_28d || keyword.current_position
    const previous = keyword.avg_position_prev_28d || keyword.previous_position || current
    // Lower position number = better, so positive change = improvement
    return previous - current
  }

  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getPositionBadge = (position) => {
    if (!position) return <Badge variant="outline">N/A</Badge>
    if (position <= 3) return <Badge className="bg-green-600">{position}</Badge>
    if (position <= 10) return <Badge className="bg-blue-600">{position}</Badge>
    if (position <= 20) return <Badge className="bg-yellow-600">{Math.round(position)}</Badge>
    return <Badge variant="outline">{Math.round(position)}</Badge>
  }

  // Ensure trackedKeywords is always an array
  const keywordsArray = Array.isArray(trackedKeywords) ? trackedKeywords : []
  
  const filteredKeywords = keywordsArray
    .filter(kw => {
      const pos = kw.avg_position_28d || kw.current_position
      if (filter === 'all') return true
      if (filter === 'top10') return pos && pos <= 10
      if (filter === 'striking') return pos > 10 && pos <= 20
      if (filter === 'improving') return getPositionChange(kw) > 0
      if (filter === 'declining') return getPositionChange(kw) < 0
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'keyword': return dir * (a.query || '').localeCompare(b.query || '')
        case 'position': return dir * ((a.avg_position_28d || 999) - (b.avg_position_28d || 999))
        case 'change': return dir * (getPositionChange(a) - getPositionChange(b))
        case 'clicks': return dir * ((a.clicks_28d || 0) - (b.clicks_28d || 0))
        case 'impressions': return dir * ((a.impressions_28d || 0) - (b.impressions_28d || 0))
        default: return 0
      }
    })

  return (
    <div className="space-y-6" data-sonor-help="seo/keywords">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Keyword Tracking</h2>
          <p className="text-muted-foreground">
            Monitor ranking positions and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleAutoDiscover} 
            disabled={autoDiscoverMutation.isLoading}
          >
            <Search className={`mr-2 h-4 w-4 ${autoDiscoverMutation.isLoading ? 'animate-pulse' : ''}`} />
            {autoDiscoverMutation.isLoading ? 'Discovering...' : 'Auto-Discover'}
          </Button>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshRankingsMutation.isLoading || keywordsLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshRankingsMutation.isLoading ? 'animate-spin' : ''}`} />
            Refresh Rankings
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {keywordsSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{keywordsSummary.total || 0}</p>
              <p className="text-sm text-muted-foreground">Tracked</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardContent className="pt-6 text-center">
              <Star className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-500">
                {keywordsSummary.top10 || 0}
              </p>
              <p className="text-sm text-muted-foreground">Top 10</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-500">
                {keywordsSummary.strikingDistance || 0}
              </p>
              <p className="text-sm text-muted-foreground">Striking Distance</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {keywordsSummary.improving || 0}
              </p>
              <p className="text-sm text-muted-foreground">Improving</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">
                {keywordsSummary.declining || 0}
              </p>
              <p className="text-sm text-muted-foreground">Declining</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Keyword */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword to track..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              className="flex-1"
            />
            <Button onClick={handleAddKeyword} disabled={!newKeyword.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Keyword
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'top10', 'striking', 'improving', 'declining'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' && 'All'}
            {f === 'top10' && 'Top 10'}
            {f === 'striking' && 'Striking Distance'}
            {f === 'improving' && 'Improving'}
            {f === 'declining' && 'Declining'}
          </Button>
        ))}
      </div>

      {/* Keywords Table */}
      {filteredKeywords.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tracked Keywords</CardTitle>
            <CardDescription>
              {filteredKeywords.length} keywords • Last updated: {
                trackedKeywords[0]?.last_checked 
                  ? new Date(trackedKeywords[0].last_checked).toLocaleDateString()
                  : 'Never'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Header — clickable for sorting */}
              <div className="grid grid-cols-12 gap-4 px-3 py-2 bg-muted rounded-lg text-sm font-medium">
                <button className="col-span-4 flex items-center gap-1 hover:text-foreground transition-colors text-left" onClick={() => toggleSort('keyword')}>
                  Keyword {sortBy === 'keyword' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
                <button className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('position')}>
                  Position {sortBy === 'position' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
                <button className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('change')}>
                  Change {sortBy === 'change' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
                <button className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('clicks')}>
                  Clicks {sortBy === 'clicks' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
                <button className="col-span-2 flex items-center justify-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('impressions')}>
                  Impr. {sortBy === 'impressions' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </button>
              </div>

              {/* Rows */}
              {filteredKeywords.map((keyword, i) => {
                const change = getPositionChange(keyword)
                return (
                  <div
                    key={keyword.id || i}
                    className="grid grid-cols-12 gap-4 px-3 py-3 border rounded-lg hover:bg-muted/50 transition-colors items-center"
                  >
                    <div className="col-span-4">
                      <p className="font-medium truncate">{keyword.query || keyword.keyword}</p>
                      {(keyword.primary_page?.url || keyword.ranking_url) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {(keyword.primary_page?.url || keyword.ranking_url)?.replace('https://', '')}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      {getPositionBadge(keyword.avg_position_28d || keyword.current_position)}
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(change)}
                        <span className={`text-sm font-medium ${
                          change > 0 ? 'text-green-500' :
                          change < 0 ? 'text-red-500' :
                          'text-zinc-500'
                        }`}>
                          {change > 0 ? '+' : ''}{change ? change.toFixed(1) : '0'}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 text-center text-sm text-muted-foreground">
                      {keyword.clicks_28d || 0}
                    </div>
                    <div className="col-span-2 text-center text-sm text-muted-foreground">
                      {(keyword.impressions_28d || 0).toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Keywords Tracked</h3>
            <p className="text-muted-foreground mb-4">
              Add keywords to track or auto-discover from GSC data
            </p>
            <Button onClick={handleAutoDiscover}>
              <Search className="mr-2 h-4 w-4" />
              Auto-Discover Keywords
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
