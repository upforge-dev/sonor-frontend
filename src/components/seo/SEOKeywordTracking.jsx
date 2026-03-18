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
  AlertTriangle
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
    const change = (keyword.previous_position || keyword.current_position) - keyword.current_position
    return change
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
  
  const filteredKeywords = keywordsArray.filter(kw => {
    if (filter === 'all') return true
    if (filter === 'top10') return kw.current_position && kw.current_position <= 10
    if (filter === 'striking') return kw.current_position > 10 && kw.current_position <= 20
    if (filter === 'improving') return getPositionChange(kw) > 0
    if (filter === 'declining') return getPositionChange(kw) < 0
    return true
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

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <Star className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {keywordsSummary.top10 || 0}
              </p>
              <p className="text-sm text-green-600">Top 10</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">
                {keywordsSummary.strikingDistance || 0}
              </p>
              <p className="text-sm text-yellow-600">Striking Distance</p>
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
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-3 py-2 bg-muted rounded-lg text-sm font-medium">
                <div className="col-span-5">Keyword</div>
                <div className="col-span-2 text-center">Position</div>
                <div className="col-span-2 text-center">Change</div>
                <div className="col-span-3 text-center">Metrics</div>
              </div>

              {/* Rows */}
              {filteredKeywords.map((keyword, i) => {
                const change = getPositionChange(keyword)
                return (
                  <div 
                    key={keyword.id || i}
                    className="grid grid-cols-12 gap-4 px-3 py-3 border rounded-lg hover:bg-muted/50 transition-colors items-center"
                  >
                    <div className="col-span-5">
                      <p className="font-medium truncate">{keyword.keyword}</p>
                      {keyword.ranking_url && (
                        <p className="text-xs text-muted-foreground truncate">
                          {keyword.ranking_url?.replace('https://', '')}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      {getPositionBadge(keyword.current_position)}
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getTrendIcon(change)}
                        <span className={`text-sm font-medium ${
                          change > 0 ? 'text-green-600' : 
                          change < 0 ? 'text-red-600' : 
                          'text-gray-500'
                        }`}>
                          {change > 0 ? '+' : ''}{change || 0}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-3 text-center text-sm text-muted-foreground">
                      <div className="flex justify-center gap-4">
                        <span>{keyword.clicks_28d || 0} clicks</span>
                        <span>{keyword.impressions_28d || 0} imp</span>
                      </div>
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
