/**
 * EchoGenerateButton — Reusable "Generate with Echo" button for content fields.
 *
 * Place next to any textarea, title input, or content field. Invokes the
 * Signal AI generate_content skill and returns the result via `onGenerate`.
 *
 * Plan-gated: renders a SignalUpgradePrompt inline badge when the project
 * lacks inline-generation access (Standard plan).
 */
import { useState, useCallback } from 'react'
import { Wand2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { skillsApi } from '@/lib/signal-api'
import { useSignalTier } from '@/hooks/useSignalTier'
import { SignalUpgradePrompt } from '@/components/ai/SignalUpgradePrompt'

interface EchoGenerateButtonProps {
  /** What kind of entity (blog_post, seo_page, email, contact, proposal, etc.) */
  entityType: string
  /** Entity ID for context */
  entityId?: string
  /** Which field to generate for (title, description, body, meta_title, etc.) */
  field: string
  /** Additional context/instructions */
  context?: string
  /** Callback with generated content */
  onGenerate: (content: string) => void
  /** Optional custom instructions */
  instructions?: string
  /** Size variant */
  size?: 'sm' | 'md'
  className?: string
}

export function EchoGenerateButton({
  entityType,
  entityId,
  field,
  context,
  onGenerate,
  instructions,
  size = 'md',
  className,
}: EchoGenerateButtonProps) {
  const { canUseInlineGenerate } = useSignalTier()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleGenerate = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const result = await skillsApi.invoke('sonor', 'generate_content', {
        entity_type: entityType,
        entity_id: entityId,
        field,
        context,
        instructions,
      })

      // The skill should return the generated content in result.content or result.text
      const content = result?.content ?? result?.text ?? result?.generated ?? ''

      if (!content) {
        throw new Error('No content returned from generation')
      }

      setStatus('idle')
      onGenerate(content)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Generation failed. Try again.'
      setErrorMessage(message)
      setStatus('error')

      // Auto-clear error after 4 seconds
      setTimeout(() => {
        setStatus((prev) => (prev === 'error' ? 'idle' : prev))
        setErrorMessage('')
      }, 4000)
    }
  }, [entityType, entityId, field, context, instructions, onGenerate])

  // Plan-gated: show inline upgrade badge for Standard plan users
  if (!canUseInlineGenerate) {
    return (
      <SignalUpgradePrompt
        feature="AI Content Generation"
        variant="inline"
        requiredTier="limited_ai"
        className={className}
      />
    )
  }

  const isSmall = size === 'sm'

  // Error state
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={handleGenerate}
        title={errorMessage}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200',
          'cursor-pointer hover:opacity-80 active:scale-[0.97]',
          isSmall ? 'p-1.5 text-xs' : 'px-3 py-1.5 text-sm',
          className
        )}
        style={{
          background: 'color-mix(in srgb, var(--destructive, #ef4444) 10%, transparent)',
          color: 'var(--destructive, #ef4444)',
          border: '1px solid color-mix(in srgb, var(--destructive, #ef4444) 25%, transparent)',
        }}
      >
        <AlertCircle className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {!isSmall && <span>Retry</span>}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={status === 'loading'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200',
        'cursor-pointer hover:brightness-110 active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-60',
        'backdrop-blur-sm',
        isSmall ? 'p-1.5 text-xs' : 'px-3 py-1.5 text-sm',
        className
      )}
      style={{
        background: 'color-mix(in srgb, var(--brand-primary) 10%, var(--glass-bg))',
        color: 'var(--brand-primary)',
        border: '1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)',
      }}
    >
      {status === 'loading' ? (
        <Loader2 className={cn('animate-spin', isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      ) : (
        <Wand2 className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      {!isSmall && (
        <span>{status === 'loading' ? 'Generating...' : 'Generate'}</span>
      )}
    </button>
  )
}
