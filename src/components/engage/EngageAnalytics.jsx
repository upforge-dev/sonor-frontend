// src/components/engage/EngageAnalytics.jsx
// Analytics dashboard for Engage module

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/lib/toast'
import api from '@/lib/api'
import { AreaChart, BarChart } from '@tremor/react'
import {
  Eye,
  MousePointerClick,
  Target,
  MessageCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  Users,
  Zap,
  ArrowUpRight
} from 'lucide-react'

// API base URL - use Portal API for analytics
const PORTAL_API_URL = (import.meta.env.VITE_SONOR_API_URL || import.meta.env.VITE_PORTAL_API_URL) || ''

export default function EngageAnalytics({ projectId }) {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [overview, setOverview] = useState(null)
  const [elementsPerf, setElementsPerf] = useState([])
  const [trends, setTrends] = useState(null)

  useEffect(() => {
    if (projectId) {
      fetchAnalytics()
    }
  }, [projectId, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ days: period })
      if (projectId) params.append('projectId', projectId)

      const baseUrl = PORTAL_API_URL
      const isPortalAPI = !!PORTAL_API_URL

      const [overviewRes, elementsRes, trendsRes] = await Promise.all([
        isPortalAPI 
          ? api.get(`${baseUrl}/engage/analytics/overview?${params}`)
          : api.get(`${baseUrl}/engage-analytics?${params}&report=overview`),
        isPortalAPI
          ? api.get(`${baseUrl}/engage/analytics/elements?${params}`)
          : api.get(`${baseUrl}/engage-analytics?${params}&report=elements`),
        isPortalAPI
          ? api.get(`${baseUrl}/engage/analytics/trends?${params}`)
          : api.get(`${baseUrl}/engage-analytics?${params}&report=trends`)
      ])

      setOverview(isPortalAPI ? overviewRes.data.data : overviewRes.data)
      setElementsPerf(isPortalAPI ? elementsRes.data.data?.elements || [] : elementsRes.data.elements || [])
      setTrends(isPortalAPI ? trendsRes.data.data : trendsRes.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num?.toString() || '0'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Performance Overview</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
                <p className="text-2xl font-bold">
                  {formatNumber(overview?.elements?.impressions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MousePointerClick className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">
                  {overview?.elements?.ctr || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversions</p>
                <p className="text-2xl font-bold">
                  {formatNumber(overview?.elements?.conversions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chat Sessions</p>
                <p className="text-2xl font-bold">
                  {formatNumber(overview?.chat?.totalSessions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-xl font-semibold">{overview?.chat?.totalSessions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">AI Sessions</p>
              <p className="text-xl font-semibold">{overview?.chat?.aiSessions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Live Sessions</p>
              <p className="text-xl font-semibold">{overview?.chat?.liveSessions || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Handoffs</p>
              <p className="text-xl font-semibold">{overview?.chat?.handoffs || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <p className="text-xl font-semibold">{overview?.chat?.avgResponseTime || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Element Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Element Performance
          </CardTitle>
          <CardDescription>
            How your popups, nudges, and banners are performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {elementsPerf.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No elements with performance data yet
            </div>
          ) : (
            <div className="space-y-4">
              {elementsPerf.slice(0, 10).map(el => {
                const ctr = parseFloat(el.ctr) || 0
                const convRate = parseFloat(el.conversionRate) || 0
                
                return (
                  <div key={el.id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{el.name}</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {el.element_type}
                        </Badge>
                        {el.status === 'active' && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatNumber(el.total_impressions)} views</span>
                        <span>{formatNumber(el.total_clicks)} clicks</span>
                        <span>{formatNumber(el.total_conversions)} conv</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{ctr}%</span>
                        <span className="text-xs text-muted-foreground">CTR</span>
                      </div>
                      <Progress value={Math.min(ctr * 10, 100)} className="w-24 h-1.5 mt-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trends Chart */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Element Performance</CardTitle>
            <CardDescription>Daily impressions and clicks</CardDescription>
          </CardHeader>
          <CardContent>
            {trends?.elements?.length > 0 ? (
              <AreaChart
                className="h-48"
                data={trends.elements.map(day => ({
                  date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  Impressions: day.impressions,
                  Clicks: day.clicks,
                }))}
                index="date"
                categories={['Impressions', 'Clicks']}
                colors={['blue', 'green']}
                showLegend={true}
                showGridLines={false}
                curveType="monotone"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat Activity</CardTitle>
            <CardDescription>Daily sessions and handoffs</CardDescription>
          </CardHeader>
          <CardContent>
            {trends?.chat?.length > 0 ? (
              <BarChart
                className="h-48"
                data={trends.chat.map(day => ({
                  date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  Sessions: day.sessions,
                  Handoffs: day.handoffs,
                }))}
                index="date"
                categories={['Sessions', 'Handoffs']}
                colors={['purple', 'orange']}
                showLegend={true}
                showGridLines={false}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No chat data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Elements Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Active Elements</p>
                <p className="text-sm text-muted-foreground">
                  {overview?.elements?.active || 0} elements currently running
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {overview?.elements?.active || 0}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
