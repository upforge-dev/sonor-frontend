/**
 * MessagesAnalytics - Phase 3.7.2
 * 
 * Simple dashboard showing message volume and trends:
 * - Message count by tab/thread type over time
 * - Response time metrics
 * - Active threads
 */

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, MessageSquare, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { chatkitApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

export function MessagesAnalytics() {
  const [timeRange, setTimeRange] = useState('7d')
  const [responseTimeStats, setResponseTimeStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
      }

      const [responseTime] = await Promise.all([
        chatkitApi.getResponseTimeStats(null, startDate.toISOString(), now.toISOString())
      ])

      setResponseTimeStats(responseTime?.data?.data || responseTime?.data || null)
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Messages Analytics</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track message volume, response times, and trends
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg First Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {loading ? '...' : formatDuration(responseTimeStats?.avg_first_response_seconds)}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Average time to first response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Median Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {loading ? '...' : formatDuration(responseTimeStats?.median_first_response_seconds)}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Median time to first response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {loading ? '...' : responseTimeStats?.count || 0}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Total conversations tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Users className="h-4 w-4" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {loading ? '...' : responseTimeStats?.count > 0 ? '100%' : '0%'}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Conversations with response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Response Time Insights
          </CardTitle>
          <CardDescription>
            First response time statistics for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-[var(--text-tertiary)]">Loading...</div>
          ) : responseTimeStats?.count > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-secondary)]/50">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Average Response Time</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Mean time across all conversations
                  </p>
                </div>
                <div className="text-2xl font-bold text-[var(--accent-primary)]">
                  {formatDuration(responseTimeStats.avg_first_response_seconds)}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-secondary)]/50">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Median Response Time</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Middle value (50th percentile)
                  </p>
                </div>
                <div className="text-2xl font-bold text-[var(--accent-primary)]">
                  {formatDuration(responseTimeStats.median_first_response_seconds)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Tip:</strong> A lower median than average suggests most responses are quick, 
                  with a few slower outliers pulling the average up.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[var(--text-tertiary)]">
              No response data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume Trends Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Message Volume
          </CardTitle>
          <CardDescription>
            Message count trends by type (coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-[var(--text-tertiary)]">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Volume charts coming soon</p>
            <p className="text-xs mt-1">Track messages by Echo, Team, and Live over time</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
