/**
 * FeedbackButtons Component
 * 
 * Thumbs up/down for AI message feedback.
 * Only shown on assistant messages in Echo.
 * Negative feedback optionally shows a text input for correction details.
 */

import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackButtonsProps {
  messageId: string
  onFeedback?: (messageId: string, type: 'positive' | 'negative', correction?: string) => void
  className?: string
}

export function FeedbackButtons({ messageId, onFeedback, className }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [showCorrectionInput, setShowCorrectionInput] = useState(false)
  const [correction, setCorrection] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    if (showCorrectionInput) inputRef.current?.focus()
  }, [showCorrectionInput])

  const handleFeedback = (type: 'positive' | 'negative') => {
    const newFeedback = feedback === type ? null : type
    setFeedback(newFeedback)
    
    if (newFeedback === 'negative') {
      setShowCorrectionInput(true)
      return
    }
    setShowCorrectionInput(false)
    
    if (newFeedback && onFeedback) {
      onFeedback(messageId, newFeedback)
    }
  }

  const submitCorrection = () => {
    onFeedback?.(messageId, 'negative', correction.trim() || undefined)
    setShowCorrectionInput(false)
    setCorrection('')
  }
  
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback('positive')}
          className={cn(
            'p-1 rounded transition-colors',
            feedback === 'positive'
              ? 'text-green-500 bg-green-500/10'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
          )}
          aria-label="Good response"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          className={cn(
            'p-1 rounded transition-colors',
            feedback === 'negative'
              ? 'text-red-500 bg-red-500/10'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
          )}
          aria-label="Poor response"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {showCorrectionInput && (
        <div className="flex items-center gap-1 mt-1">
          <input
            ref={inputRef}
            type="text"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCorrection()}
            placeholder="What went wrong? (optional)"
            className="flex-1 text-xs px-2 py-1 rounded bg-[var(--surface-secondary)] border border-[var(--glass-border)]/30 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          <button
            onClick={submitCorrection}
            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors"
            aria-label="Submit feedback"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
