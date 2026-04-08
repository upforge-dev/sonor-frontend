// BrandMentions — monitors brand mentions across social platforms and web
import React, { useEffect, useState } from 'react'
import { Globe, MessageSquare, TrendingUp, RefreshCw, ExternalLink } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { StatTile, StatTileGrid } from '@/components/ui/stat-tile'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import SonorSpinner from '@/components/SonorLoading'
import { PlatformIcon } from './PlatformIcon'
import { toast } from 'sonner'

const SENTIMENT_STYLES = {
  positive: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  negative: 'bg-red-500/10 text-red-600 border-red-500/20',
  neutral:  'bg-gray-500/10 text-gray-600 border-gray-500/20',
  mixed:    'bg-amber-500/10 text-amber-600 border-amber-500/20',
}

const SOURCE_ICONS = {
  reddit: 'reddit',
  x: 'x',
  web: null,
  google: 'gbp',
  linkedin: 'linkedin',
}

export function BrandMentions() {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id
  const [mentions, setMentions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [period, setPeriod] = useState(7)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/broadcast/projects/${projectId}/brand-mentions?period=${period}`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      }).then(r => r.ok ? r.json() : []),
      fetch(`/api/broadcast/projects/${projectId}/brand-mentions/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      }).then(r => r.ok ? r.json() : null),
    ])
      .then(([mentionsData, statsData]) => {
        setMentions(Array.isArray(mentionsData) ? mentionsData : [])
        setStats(statsData)
      })
      .finally(() => setLoading(false))
  }, [projectId, period])

  const handleScan = async () => {
    if (!projectId) return
    setScanning(true)
    try {
      const response = await fetch(`/api/broadcast/projects/${projectId}/brand-mentions/scan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      })
      if (response.ok) {
        const result = await response.json()
        toast.success(`Found ${result.found} new mention${result.found !== 1 ? 's' : ''}`)
        // Refresh
        setPeriod(p => p) // trigger re-fetch
      }
    } catch {
      toast.error('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <SonorSpinner size="md" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Brand Mentions</h3>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="bg-transparent border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning} className="gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', scanning && 'animate-spin')} />
            {scanning ? 'Scanning...' : 'Scan Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <StatTileGrid>
          <StatTile
            label="Total Mentions"
            value={stats.total}
            icon={<Globe className="w-4 h-4" />}
            iconColor="brand"
          />
          <StatTile
            label="Positive"
            value={stats.by_sentiment?.positive || 0}
            icon={<TrendingUp className="w-4 h-4" />}
            iconColor="green"
          />
          <StatTile
            label="Neutral"
            value={stats.by_sentiment?.neutral || 0}
            icon={<MessageSquare className="w-4 h-4" />}
            iconColor="blue"
          />
          <StatTile
            label="Negative"
            value={stats.by_sentiment?.negative || 0}
            icon={<MessageSquare className="w-4 h-4" />}
            iconColor="orange"
          />
        </StatTileGrid>
      )}

      {/* Mentions list */}
      {mentions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Globe className="w-8 h-8 mx-auto mb-3 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)] mb-1">No brand mentions found</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Set brand keywords in project settings, then run a scan.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {mentions.map(mention => (
            <GlassCard key={mention.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Source icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {SOURCE_ICONS[mention.source] ? (
                    <PlatformIcon platform={SOURCE_ICONS[mention.source]} size={20} />
                  ) : (
                    <Globe className="w-5 h-5 text-[var(--text-tertiary)]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)] capitalize">{mention.source}</span>
                    {mention.authorName && (
                      <span className="text-xs text-[var(--text-tertiary)]">by {mention.authorName}</span>
                    )}
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium border',
                      SENTIMENT_STYLES[mention.sentiment] || SENTIMENT_STYLES.neutral
                    )}>
                      {mention.sentiment}
                    </span>
                  </div>

                  {mention.sourceTitle && (
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1 line-clamp-1">
                      {mention.sourceTitle}
                    </p>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3">
                    {mention.contentSnippet}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {new Date(mention.discoveredAt).toLocaleDateString()}
                    </span>
                    {mention.sourceUrl && (
                      <a
                        href={mention.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[var(--brand-primary)] flex items-center gap-0.5 hover:underline"
                      >
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
