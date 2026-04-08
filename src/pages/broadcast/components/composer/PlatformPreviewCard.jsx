// Platform-native preview card — shows how the post will look on each platform
import React from 'react'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { PlatformIcon } from '../PlatformIcon'

const PLATFORM_STYLES = {
  facebook:  { bg: 'bg-[#1877F2]/5',  border: 'border-[#1877F2]/20',  label: 'Facebook',         maxChars: 63206 },
  instagram: { bg: 'bg-[#E4405F]/5',  border: 'border-[#E4405F]/20',  label: 'Instagram',        maxChars: 2200 },
  linkedin:  { bg: 'bg-[#0A66C2]/5',  border: 'border-[#0A66C2]/20',  label: 'LinkedIn',         maxChars: 3000 },
  gbp:       { bg: 'bg-[#4285F4]/5',  border: 'border-[#4285F4]/20',  label: 'Google Business',  maxChars: 1500 },
  tiktok:    { bg: 'bg-[#000000]/5',  border: 'border-[#000000]/20',  label: 'TikTok',           maxChars: 2200 },
  reddit:    { bg: 'bg-[#FF4500]/5',  border: 'border-[#FF4500]/20',  label: 'Reddit',           maxChars: 40000 },
  x:         { bg: 'bg-[#000000]/5',  border: 'border-[#000000]/20',  label: 'X',                maxChars: 280 },
}

export function PlatformPreviewCard({
  platform, content, media, hashtags, redditTitle, isEnabled, onToggle,
}) {
  const style = PLATFORM_STYLES[platform] || PLATFORM_STYLES.facebook
  const charCount = (content || '').length
  const isOverLimit = charCount > style.maxChars

  // Build display content with hashtags
  const displayContent = content + (
    hashtags?.length && ['instagram', 'x', 'tiktok', 'linkedin'].includes(platform)
      ? '\n\n' + hashtags.map(h => `#${h}`).join(' ')
      : ''
  )

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      style.border,
      isEnabled ? 'opacity-100' : 'opacity-40',
    )}>
      {/* Platform header */}
      <div className={cn('flex items-center justify-between px-4 py-2', style.bg)}>
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} size={16} />
          <span className="text-sm font-medium text-[var(--text-primary)]">{style.label}</span>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'w-8 h-5 rounded-full transition-colors relative',
            isEnabled ? 'bg-[var(--brand-primary)]' : 'bg-[var(--glass-border)]'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            isEnabled ? 'left-3.5' : 'left-0.5'
          )} />
        </button>
      </div>

      {/* Content preview */}
      <div className="p-4">
        {/* Reddit title */}
        {platform === 'reddit' && redditTitle && (
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{redditTitle}</p>
        )}

        {/* Media */}
        {media?.length > 0 && (
          <div className="mb-3 rounded-lg overflow-hidden border border-[var(--glass-border)]">
            <img src={media[0]} alt="" className="w-full h-32 object-cover" />
          </div>
        )}

        {/* Text */}
        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap line-clamp-6">
          {displayContent}
        </p>

        {/* Char count */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--glass-border)]">
          <span className={cn(
            'text-[10px]',
            isOverLimit ? 'text-red-500 font-medium' : 'text-[var(--text-tertiary)]'
          )}>
            {charCount.toLocaleString()}/{style.maxChars.toLocaleString()} chars
            {isOverLimit && ' (over limit!)'}
          </span>
        </div>
      </div>
    </div>
  )
}
