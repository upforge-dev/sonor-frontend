// UnifiedComposer — 3-step wizard: Start → Generate → Review
// Replaces PostComposerPage (1,997 lines), ReelComposer (1,329 lines), StoryComposer (1,296 lines)
import React, { useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Sparkles, Send, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBroadcastStore } from '@/stores/broadcastStore'
import { ComposerStart } from './composer/ComposerStart'
import { ComposerGenerate } from './composer/ComposerGenerate'
import { ComposerReview } from './composer/ComposerReview'
import { toast } from 'sonner'

const STEPS = [
  { id: 'start', label: 'Start', icon: Sparkles },
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'review', label: 'Review & Send', icon: Send },
]

export function UnifiedComposer({ editPost, defaults, onComplete, onCancel, connections }) {
  const [step, setStep] = useState(0)
  const [format, setFormat] = useState('post') // 'post' | 'reel' | 'story'

  // Shared state across steps
  const [idea, setIdea] = useState(defaults?.topic || defaults?.idea || '')
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    editPost?.platforms || ['facebook', 'instagram', 'linkedin']
  )
  const [variants, setVariants] = useState(editPost?.content_variants || {})
  const [masterContent, setMasterContent] = useState(editPost?.content || '')
  const [media, setMedia] = useState(editPost?.media_urls || [])
  const [hashtags, setHashtags] = useState(editPost?.hashtags || [])
  const [redditTitle, setRedditTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState(editPost?.scheduled_at || null)

  const handleNext = useCallback(() => {
    if (step === 0 && !idea.trim()) {
      toast.error('Enter an idea or select a trending topic')
      return
    }
    if (step === 0 && selectedPlatforms.length === 0) {
      toast.error('Select at least one platform')
      return
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }, [step, idea, selectedPlatforms])

  const handleBack = useCallback(() => {
    setStep(s => Math.max(s - 1, 0))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {editPost ? 'Edit Post' : 'Compose'}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => i <= step ? setStep(i) : null}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
                  i === step
                    ? 'bg-[var(--brand-primary)] text-white font-medium'
                    : i < step
                      ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] cursor-pointer'
                      : 'text-[var(--text-tertiary)]'
                )}
              >
                <span>{i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'w-8 h-0.5 mx-1',
                  i < step ? 'bg-[var(--brand-primary)]' : 'bg-[var(--glass-border)]'
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Format toggle */}
        <div className="flex items-center gap-1 bg-[var(--glass-bg)] rounded-lg p-0.5">
          {['post', 'reel', 'story'].map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                f === format
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 0 && (
          <ComposerStart
            idea={idea}
            setIdea={setIdea}
            selectedPlatforms={selectedPlatforms}
            setSelectedPlatforms={setSelectedPlatforms}
            media={media}
            setMedia={setMedia}
            connections={connections}
            format={format}
          />
        )}
        {step === 1 && (
          <ComposerGenerate
            idea={idea}
            selectedPlatforms={selectedPlatforms}
            format={format}
            masterContent={masterContent}
            setMasterContent={setMasterContent}
            variants={variants}
            setVariants={setVariants}
            hashtags={hashtags}
            setHashtags={setHashtags}
            media={media}
            setMedia={setMedia}
            redditTitle={redditTitle}
            setRedditTitle={setRedditTitle}
          />
        )}
        {step === 2 && (
          <ComposerReview
            masterContent={masterContent}
            variants={variants}
            selectedPlatforms={selectedPlatforms}
            setSelectedPlatforms={setSelectedPlatforms}
            media={media}
            hashtags={hashtags}
            redditTitle={redditTitle}
            scheduledAt={scheduledAt}
            setScheduledAt={setScheduledAt}
            format={format}
            editPost={editPost}
            onComplete={onComplete}
          />
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--glass-border)]">
        <Button
          variant="ghost"
          onClick={step === 0 ? onCancel : handleBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-2" style={{ backgroundColor: 'var(--brand-primary)' }}>
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
