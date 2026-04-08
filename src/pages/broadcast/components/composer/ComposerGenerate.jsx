// Step 2: Generate — AI creates platform variants, user can edit
import React, { useEffect, useState, useCallback } from 'react'
import { Wand2, Hash, Image, RefreshCw } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { PlatformIcon } from '../PlatformIcon'
import SonorSpinner from '@/components/SonorLoading'

const PLATFORM_CHAR_LIMITS = {
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  gbp: 1500,
  tiktok: 2200,
  reddit: 40000,
  x: 280,
}

const PLATFORM_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  gbp: 'Google Business',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  x: 'X',
}

export function ComposerGenerate({
  idea, selectedPlatforms, format,
  masterContent, setMasterContent,
  variants, setVariants,
  hashtags, setHashtags,
  media, setMedia,
  redditTitle, setRedditTitle,
}) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('master')
  const [suggestedHashtags, setSuggestedHashtags] = useState([])

  // Auto-generate on mount if no content exists
  useEffect(() => {
    if (!masterContent && idea && projectId) {
      generateContent()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generateContent = useCallback(async () => {
    if (!projectId || !idea) return
    setIsGenerating(true)

    try {
      const response = await fetch(`/api/broadcast/projects/${projectId}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({
          idea,
          platforms: selectedPlatforms,
          format,
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const data = await response.json()
      setMasterContent(data.mainContent || data.content || idea)

      // Set platform variants
      const newVariants = {}
      for (const platform of selectedPlatforms) {
        newVariants[platform] = data.platformVariants?.[platform] || data.mainContent || idea
      }
      setVariants(newVariants)

      if (data.hashtags?.length) {
        setHashtags(data.hashtags)
      }

      // Set suggested hashtags for the sidebar
      setSuggestedHashtags(data.suggestedHashtags || data.hashtags || [])
    } catch (err) {
      // Fallback: use the idea as content for all platforms
      setMasterContent(idea)
      const fallbackVariants = {}
      for (const p of selectedPlatforms) {
        fallbackVariants[p] = idea
      }
      setVariants(fallbackVariants)
    } finally {
      setIsGenerating(false)
    }
  }, [projectId, idea, selectedPlatforms, format])

  const updateVariant = (platform, value) => {
    setVariants(prev => ({ ...prev, [platform]: value }))
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <SonorSpinner size="lg" />
        <p className="text-sm text-[var(--text-secondary)]">
          Signal is generating platform-optimized variants...
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      {/* Regenerate button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Content</h3>
        <Button variant="outline" size="sm" onClick={generateContent} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate
        </Button>
      </div>

      {/* Master content editor */}
      <GlassCard className="p-4">
        <label className="text-xs font-medium text-[var(--text-tertiary)] mb-2 block">Master Content</label>
        <textarea
          value={masterContent}
          onChange={(e) => {
            setMasterContent(e.target.value)
            // Propagate to variants that haven't been manually edited
            const newVariants = { ...variants }
            for (const p of selectedPlatforms) {
              if (newVariants[p] === masterContent || !newVariants[p]) {
                newVariants[p] = e.target.value
              }
            }
            setVariants(newVariants)
          }}
          className="w-full h-32 bg-transparent border border-[var(--glass-border)] rounded-lg px-4 py-3 text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--brand-primary)]/50"
        />
      </GlassCard>

      {/* Reddit title (only when Reddit is selected) */}
      {selectedPlatforms.includes('reddit') && (
        <GlassCard className="p-4">
          <label className="text-xs font-medium text-[var(--text-tertiary)] mb-2 block">Reddit Post Title (required)</label>
          <input
            value={redditTitle}
            onChange={(e) => setRedditTitle(e.target.value)}
            placeholder="Post title for Reddit"
            maxLength={300}
            className="w-full bg-transparent border border-[var(--glass-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-primary)]/50"
          />
          <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">{redditTitle.length}/300</span>
        </GlassCard>
      )}

      {/* Platform variant tabs */}
      <div>
        <div className="flex items-center gap-1 mb-3 overflow-x-auto">
          {selectedPlatforms.map(platform => (
            <button
              key={platform}
              onClick={() => setActiveTab(platform)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                activeTab === platform
                  ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]'
              )}
            >
              <PlatformIcon platform={platform} size={14} />
              {PLATFORM_LABELS[platform] || platform}
            </button>
          ))}
        </div>

        {selectedPlatforms.map(platform => (
          <div key={platform} className={activeTab === platform ? 'block' : 'hidden'}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--text-tertiary)]">
                  {PLATFORM_LABELS[platform]} variant
                </label>
                <span className={cn(
                  'text-[10px]',
                  (variants[platform] || '').length > PLATFORM_CHAR_LIMITS[platform]
                    ? 'text-red-500'
                    : 'text-[var(--text-tertiary)]'
                )}>
                  {(variants[platform] || '').length}/{PLATFORM_CHAR_LIMITS[platform]}
                </span>
              </div>
              <textarea
                value={variants[platform] || ''}
                onChange={(e) => updateVariant(platform, e.target.value)}
                className="w-full h-28 bg-transparent border border-[var(--glass-border)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--brand-primary)]/50"
              />
            </GlassCard>
          </div>
        ))}
      </div>

      {/* Hashtags */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <label className="text-xs font-medium text-[var(--text-tertiary)]">Hashtags</label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs rounded-full cursor-pointer hover:bg-[var(--brand-primary)]/20"
              onClick={() => setHashtags(prev => prev.filter((_, j) => j !== i))}
            >
              #{tag} ×
            </span>
          ))}
          {suggestedHashtags.filter(h => !hashtags.includes(h)).slice(0, 5).map((tag, i) => (
            <span
              key={`suggested-${i}`}
              className="px-2 py-0.5 bg-[var(--glass-bg)] text-[var(--text-tertiary)] text-xs rounded-full cursor-pointer hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] border border-dashed border-[var(--glass-border)]"
              onClick={() => setHashtags(prev => [...prev, tag])}
            >
              #{tag} +
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Media */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Image className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <label className="text-xs font-medium text-[var(--text-tertiary)]">Media</label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Image className="w-3 h-3" /> Upload
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1">
              <Wand2 className="w-3 h-3" /> AI Generate
            </Button>
          </div>
        </div>
        {media.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto">
            {media.map((url, i) => (
              <div key={i} className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-[var(--glass-border)]">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setMedia(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
            No media attached. Upload an image or generate one with AI.
          </p>
        )}
      </GlassCard>
    </div>
  )
}
