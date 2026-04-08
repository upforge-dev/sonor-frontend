// Step 3: Review & Send — Platform previews + publish/schedule
import React, { useState, useCallback } from 'react'
import { Send, Clock, Calendar, Check, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBroadcastStore } from '@/stores/broadcastStore'
import useAuthStore from '@/lib/auth-store'
import { PlatformPreviewCard } from './PlatformPreviewCard'
import SonorSpinner from '@/components/SonorLoading'
import { toast } from 'sonner'

export function ComposerReview({
  masterContent, variants, selectedPlatforms, setSelectedPlatforms,
  media, hashtags, redditTitle, scheduledAt, setScheduledAt,
  format, editPost, onComplete,
}) {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.id
  const { createPost, updatePost, publishPost } = useBroadcastStore()
  const [isPublishing, setIsPublishing] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(!!scheduledAt)

  const handlePublish = useCallback(async (immediate = true) => {
    if (!projectId) return
    setIsPublishing(true)

    try {
      const postData = {
        content: masterContent,
        content_variants: {
          ...variants,
          ...(redditTitle ? { reddit_title: redditTitle } : {}),
        },
        platforms: selectedPlatforms,
        media_urls: media,
        hashtags,
        post_type: format,
        status: immediate ? 'publishing' : 'scheduled',
        scheduled_at: immediate ? null : scheduledAt,
      }

      let post
      if (editPost?.id) {
        post = await updatePost(editPost.id, postData)
      } else {
        post = await createPost(projectId, postData)
      }

      if (immediate && post?.id) {
        await publishPost(post.id)
        toast.success('Published to all platforms!')
      } else if (!immediate) {
        toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`)
      }

      onComplete?.()
    } catch (err) {
      toast.error(`Failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsPublishing(false)
    }
  }, [projectId, masterContent, variants, selectedPlatforms, media, hashtags, format, scheduledAt, editPost, redditTitle])

  if (isPublishing) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <SonorSpinner size="lg" />
        <p className="text-sm text-[var(--text-secondary)]">
          Publishing to {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}...
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Platform previews grid */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Platform Previews</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {selectedPlatforms.map(platform => (
            <PlatformPreviewCard
              key={platform}
              platform={platform}
              content={variants[platform] || masterContent}
              media={media}
              hashtags={hashtags}
              redditTitle={platform === 'reddit' ? redditTitle : undefined}
              isEnabled={true}
              onToggle={() => {
                setSelectedPlatforms(prev =>
                  prev.includes(platform)
                    ? prev.filter(p => p !== platform)
                    : [...prev, platform]
                )
              }}
            />
          ))}
        </div>
      </div>

      {/* Publish controls */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setScheduleMode(false)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              !scheduleMode
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]'
            )}
          >
            <Send className="w-4 h-4" />
            Publish Now
          </button>
          <button
            onClick={() => setScheduleMode(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              scheduleMode
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]'
            )}
          >
            <Clock className="w-4 h-4" />
            Schedule
          </button>
        </div>

        {scheduleMode && (
          <div className="mb-4">
            <input
              type="datetime-local"
              value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : null)}
              min={new Date().toISOString().slice(0, 16)}
              className="bg-transparent border border-[var(--glass-border)] rounded-lg px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]/50"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <Check className="w-4 h-4 text-emerald-500" />
            {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''} selected
          </div>

          <Button
            onClick={() => handlePublish(!scheduleMode)}
            disabled={selectedPlatforms.length === 0 || (scheduleMode && !scheduledAt)}
            className="gap-2 px-6"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {scheduleMode ? (
              <>
                <Calendar className="w-4 h-4" />
                Schedule Post
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Publish to {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
