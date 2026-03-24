// src/components/seo/SEOBacklinks.jsx
// Backlink Opportunities - discover and track link building opportunities
// MIGRATED TO REACT QUERY - Jan 29, 2026
import { useState } from 'react'
import { useSeoBacklinks, seoTechnicalKeys } from '@/hooks/seo'
import { seoApi } from '@/lib/sonor-api'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Link2, 
  RefreshCw, 
  ExternalLink,
  Target,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp
} from 'lucide-react'

export default function SEOBacklinks({ projectId }) {
  const queryClient = useQueryClient()
  
  // React Query hooks
  const { data: backlinksData, isLoading: backlinksLoading } = useSeoBacklinks(projectId)
  
  // Extract data
  const backlinkOpportunities = backlinksData?.opportunities || backlinksData || []
  const backlinksSummary = backlinksData?.summary || {}
  
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [filter, setFilter] = useState('all')

  const handleDiscover = async () => {
    setIsDiscovering(true)
    try {
      await seoApi.discoverBacklinks(projectId)
      queryClient.invalidateQueries({ queryKey: seoTechnicalKeys.backlinks(projectId) })
    } catch (error) {
      console.error('Discovery error:', error)
    }
    setIsDiscovering(false)
  }

  const handleStatusChange = async (opportunityId, status) => {
    try {
      await seoApi.updateBacklinkOpportunity(projectId, opportunityId, { status })
      queryClient.invalidateQueries({ queryKey: seoTechnicalKeys.backlinks(projectId) })
    } catch (error) {
      console.error('Status update error:', error)
    }
  }

  const getTypeColor = (type) => {
    const colors = {
      resource: 'bg-blue-100 text-blue-800',
      guest_post: 'bg-purple-100 text-purple-800',
      directory: 'bg-green-100 text-green-800',
      digital_pr: 'bg-pink-100 text-pink-800',
      competitor_gap: 'bg-orange-100 text-orange-800',
      partnership: 'bg-teal-100 text-teal-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'contacted': return <Mail className="h-4 w-4 text-blue-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'acquired': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Target className="h-4 w-4 text-gray-400" />
    }
  }

  // Ensure backlinkOpportunities is always an array
  const opportunitiesArray = Array.isArray(backlinkOpportunities) ? backlinkOpportunities : []
  
  const filteredOpportunities = opportunitiesArray.filter(opp => {
    if (filter === 'all') return true
    return opp.status === filter || opp.opportunity_type === filter
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backlink Opportunities</h2>
          <p className="text-muted-foreground">
            Discover and track link building prospects
          </p>
        </div>
        <Button 
          onClick={handleDiscover} 
          disabled={isDiscovering || backlinksLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isDiscovering ? 'animate-spin' : ''}`} />
          {isDiscovering ? 'Discovering...' : 'Discover Opportunities'}
        </Button>
      </div>

      {/* Summary Stats */}
      {backlinksSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{backlinksSummary.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          
          {Object.entries(backlinksSummary.byType || {}).slice(0, 4).map(([type, count]) => (
            <Card key={type}>
              <CardContent className="pt-6 text-center">
                <Badge className={getTypeColor(type)}>{type.replace('_', ' ')}</Badge>
                <p className="text-2xl font-bold mt-2">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <Tabs defaultValue="all" onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="discovered">New</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="acquired">Acquired</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {filteredOpportunities.length > 0 ? (
            <div className="space-y-4">
              {filteredOpportunities.map((opp, i) => (
                <Card key={opp.id || i}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="pt-1">
                        {getStatusIcon(opp.status)}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getTypeColor(opp.opportunity_type)}>
                                {opp.opportunity_type?.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                DA: {opp.estimated_da || '?'}
                              </span>
                            </div>
                            <h4 className="font-semibold">
                              {opp.target_domain}
                            </h4>
                            {opp.target_page_title && (
                              <p className="text-sm text-muted-foreground">
                                {opp.target_page_title}
                              </p>
                            )}
                          </div>
                          
                          {/* Priority Score */}
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                Priority: {opp.priority_score}/10
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Difficulty: {opp.difficulty_score}/10
                            </p>
                          </div>
                        </div>

                        {/* Reason */}
                        {opp.reason && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {opp.reason}
                          </p>
                        )}

                        {/* Target URL */}
                        {opp.target_url && (
                          <a 
                            href={opp.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-3"
                          >
                            {opp.target_url.substring(0, 60)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {/* Suggested Anchor & Target */}
                        <div className="flex flex-wrap gap-4 text-sm mb-3">
                          {opp.suggested_anchor && (
                            <div>
                              <span className="text-muted-foreground">Anchor: </span>
                              <span className="font-medium">{opp.suggested_anchor}</span>
                            </div>
                          )}
                          {opp.target_page && (
                            <div>
                              <span className="text-muted-foreground">Link to: </span>
                              <span className="font-medium">{opp.target_page}</span>
                            </div>
                          )}
                        </div>

                        {/* Outreach Template */}
                        {opp.outreach_template && (
                          <div className="bg-muted p-3 rounded text-sm mb-3">
                            <strong className="block mb-1">Outreach Approach:</strong>
                            {opp.outreach_template}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {opp.status === 'discovered' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStatusChange(opp.id, 'contacted')}
                              >
                                <Mail className="mr-1 h-3 w-3" />
                                Mark Contacted
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleStatusChange(opp.id, 'rejected')}
                              >
                                Skip
                              </Button>
                            </>
                          )}
                          {opp.status === 'contacted' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStatusChange(opp.id, 'in_progress')}
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                In Progress
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleStatusChange(opp.id, 'acquired')}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Link Acquired!
                              </Button>
                            </>
                          )}
                          {opp.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleStatusChange(opp.id, 'acquired')}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Link Acquired!
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Opportunities Found</h3>
                <p className="text-muted-foreground mb-4">
                  Discover link building opportunities based on your content and industry
                </p>
                <Button onClick={handleDiscover}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Discover Opportunities
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
