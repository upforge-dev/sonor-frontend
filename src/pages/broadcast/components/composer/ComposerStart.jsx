// Step 1: Start — Signal suggestions + Your Idea + Trending Topics
import React, { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, Image, Wand2, Check } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBroadcastStore } from '@/stores/broadcastStore'
import useAuthStore from '@/lib/auth-store'
import { PlatformIcon } from '../PlatformIcon'
import SonorSpinner from '@/components/SonorLoading'

const ALL_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'gbp', 'tiktok', 'reddit', 'x']

const SUGGESTION_ICONS = {
  review: '⭐',
  blog: '📝',
  seo_win: '📈',
  trending: '🔥',
  crm: '🤝',
  mention: '💬',
  stale: '⏰',
  seasonal: '🗓️',
}

export function ComposerStart({
  idea, setIdea, selectedPlatforms, setSelectedPlatforms,
  media, setMedia, connections, format,
}) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id
  const [suggestions, setSuggestions] = useState([])
  const [trendingTopics, setTrendingTopics] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [showTrends, setShowTrends] = useState(false)

  // Fetch Signal suggestions
  useEffect(() => {
    if (!projectId) return
    setLoadingSuggestions(true)
    fetch(`/api/broadcast/projects/${projectId}/suggested-posts`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false))
  }, [projectId])

  // Fetch trending topics (lazy — only when expanded)
  useEffect(() => {
    if (!showTrends || !projectId || trendingTopics.length > 0) return
    setLoadingTrends(true)
    fetch(`/api/broadcast/projects/${projectId}/trending-topics`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
    })
      .then(r => r.ok ? r.json() : { topics: [] })
      .then(data => setTrendingTopics(data?.topics || data || []))
      .catch(() => setTrendingTopics([]))
      .finally(() => setLoadingTrends(false))
  }, [showTrends, projectId])

  const connectedPlatforms = (connections || [])
    .filter(c => c.status === 'active')
    .map(c => c.platform)

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const useSuggestion = (suggestion) => {
    setIdea(suggestion.prefilled_idea || suggestion.title)
    if (suggestion.suggested_platforms?.length) {
      setSelectedPlatforms(suggestion.suggested_platforms.filter(p => connectedPlatforms.includes(p)))
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Signal Suggestions */}
      {(loadingSuggestions || suggestions.length > 0) && (
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
            Signal Suggestions
          </h3>
          {loadingSuggestions ? (
            <div className="flex justify-center py-6">
              <SonorSpinner size="sm" />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {suggestions.map(s => (
                <GlassCard
                  key={s.id}
                  className="flex-shrink-0 w-64 p-4 cursor-pointer hover:border-[var(--brand-primary)]/40 transition-colors"
                  onClick={() => useSuggestion(s)}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">{SUGGESTION_ICONS[s.type] || '💡'}</span>
                    <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{s.title}</p>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{s.rationale}</p>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Your Idea */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Your Idea</h3>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="What do you want to tell your audience?"
          className="w-full h-32 bg-transparent border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--brand-primary)]/50"
        />
        <div className="flex items-center gap-2 mt-3">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Image className="w-3.5 h-3.5" />
            Upload Image
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Wand2 className="w-3.5 h-3.5" />
            AI Generate Image
          </Button>
        </div>
      </GlassCard>

      {/* Platform Selector */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Platforms</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_PLATFORMS.map(platform => {
            const isConnected = connectedPlatforms.includes(platform)
            const isSelected = selectedPlatforms.includes(platform)
            return (
              <button
                key={platform}
                onClick={() => isConnected && togglePlatform(platform)}
                disabled={!isConnected}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  isSelected && isConnected
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                    : isConnected
                      ? 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30'
                      : 'border-[var(--glass-border)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                )}
              >
                <PlatformIcon platform={platform} size={16} />
                <span className="capitalize">{platform === 'gbp' ? 'Google' : platform}</span>
                {isSelected && isConnected && <Check className="w-3 h-3" />}
                {!isConnected && <span className="text-[10px]">connect</span>}
              </button>
            )
          })}
        </div>
      </GlassCard>

      {/* Trending Topics (collapsible) */}
      <div>
        <button
          onClick={() => setShowTrends(!showTrends)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Trending Topics
          <span className="text-xs">{showTrends ? '▲' : '▼'}</span>
        </button>
        {showTrends && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {loadingTrends ? (
              <div className="col-span-full flex justify-center py-4">
                <SonorSpinner size="sm" />
              </div>
            ) : trendingTopics.length > 0 ? (
              trendingTopics.slice(0, 12).map((topic, i) => (
                <GlassCard
                  key={i}
                  className="p-3 cursor-pointer hover:border-[var(--brand-primary)]/40 transition-colors"
                  onClick={() => setIdea(typeof topic === 'string' ? topic : topic.title || topic.query || '')}
                >
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                    {typeof topic === 'string' ? topic : topic.title || topic.query || ''}
                  </p>
                  {topic.source && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{topic.source}</span>
                  )}
                </GlassCard>
              ))
            ) : (
              <p className="col-span-full text-sm text-[var(--text-tertiary)] py-2">
                No trending topics available right now.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
