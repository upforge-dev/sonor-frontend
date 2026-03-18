import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Wand2, Maximize2, Minimize2, Check, Languages, AlignLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSignalTier } from '@/hooks/useSignalTier'
import { echoApi } from '@/lib/signal-api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType = 'rewrite' | 'expand' | 'simplify' | 'fix_grammar' | 'translate' | 'summarize'

interface SelectionRect {
  top: number
  left: number
  bottom: number
  width: number
}

interface SelectionRange {
  start: number
  end: number
  text: string
  rect: SelectionRect
}

interface EchoTextActionsProps {
  /** Container element to monitor for text selection */
  containerRef: React.RefObject<HTMLElement>
  /** Entity context for AI generation */
  entityType?: string
  entityId?: string
  /** Callback when AI generates replacement text */
  onReplace?: (newText: string, selection: { start: number; end: number }) => void
  /** Which actions to show */
  actions?: ActionType[]
}

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

const ACTION_META: Record<ActionType, { label: string; icon: React.ElementType; prompt: string }> = {
  rewrite: {
    label: 'Rewrite',
    icon: Wand2,
    prompt: 'Rewrite the following text, preserving meaning but improving clarity, flow, and style. Return ONLY the rewritten text with no preamble.',
  },
  expand: {
    label: 'Expand',
    icon: Maximize2,
    prompt: 'Expand the following text with more detail and depth while keeping the same tone. Return ONLY the expanded text with no preamble.',
  },
  simplify: {
    label: 'Simplify',
    icon: Minimize2,
    prompt: 'Simplify the following text, making it shorter and easier to understand while preserving the core meaning. Return ONLY the simplified text with no preamble.',
  },
  fix_grammar: {
    label: 'Fix Grammar',
    icon: Check,
    prompt: 'Fix any grammar, spelling, and punctuation errors in the following text. Preserve the original meaning and tone. Return ONLY the corrected text with no preamble.',
  },
  translate: {
    label: 'Translate',
    icon: Languages,
    prompt: 'Translate the following text to English (if not English) or to Spanish (if already English). Return ONLY the translated text with no preamble.',
  },
  summarize: {
    label: 'Summarize',
    icon: AlignLeft,
    prompt: 'Summarize the following text into a concise version that captures the key points. Return ONLY the summary with no preamble.',
  },
}

const DEFAULT_ACTIONS: ActionType[] = ['rewrite', 'expand', 'simplify', 'fix_grammar']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate offset of a text node within the container, counting characters
 * from the start of textContent.
 */
function getTextOffset(container: HTMLElement, targetNode: Node, targetOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let offset = 0
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node === targetNode) {
      return offset + targetOffset
    }
    offset += (node.textContent?.length ?? 0)
    node = walker.nextNode()
  }
  return offset
}

function getSelectionDetails(container: HTMLElement): SelectionRange | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

  const range = sel.getRangeAt(0)

  // Ensure the selection is inside our container
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null
  }

  const text = sel.toString().trim()
  if (!text) return null

  const rects = range.getClientRects()
  if (rects.length === 0) return null

  // Build a bounding rect from all client rects
  let top = Infinity
  let left = Infinity
  let bottom = -Infinity
  let right = -Infinity
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]
    if (r.top < top) top = r.top
    if (r.left < left) left = r.left
    if (r.bottom > bottom) bottom = r.bottom
    if (r.right > right) right = r.right
  }

  const start = getTextOffset(container, range.startContainer, range.startOffset)
  const end = getTextOffset(container, range.endContainer, range.endOffset)

  return {
    start,
    end,
    text,
    rect: {
      top,
      left,
      bottom,
      width: right - left,
    },
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EchoTextActions({
  containerRef,
  entityType,
  entityId,
  onReplace,
  actions = DEFAULT_ACTIONS,
}: EchoTextActionsProps) {
  const { canUseInlineGenerate } = useSignalTier()

  const [selection, setSelection] = useState<SelectionRange | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ------- Selection tracking -------

  const handleSelectionChange = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const details = getSelectionDetails(container)
    if (details) {
      setSelection(details)
      setVisible(true)
    } else if (!loading) {
      // Delay hiding slightly to avoid flicker when re-selecting
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = setTimeout(() => {
        setVisible(false)
        setSelection(null)
      }, 150)
    }
  }, [containerRef, loading])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      clearTimeout(dismissTimerRef.current)
    }
  }, [handleSelectionChange])

  // ------- Dismiss on click-outside / Escape -------

  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false)
        setSelection(null)
        setLoading(false)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Allow the selection itself to change without dismissing
        // The selectionchange handler will take care of re-evaluating
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [visible])

  // ------- Action handler -------

  const handleAction = useCallback(
    async (actionType: ActionType) => {
      if (!selection || loading) return

      const meta = ACTION_META[actionType]
      setLoading(true)

      try {
        const result = await echoApi.command(
          `${meta.prompt}\n\n---\n${selection.text}`,
          {
            path: window.location.pathname,
            module: 'text_actions',
            selection: {
              entityType,
              entityId,
              action: actionType,
              originalText: selection.text,
            },
          },
        )

        // The command response may be a string or an object with a `text`/`content`/`message` field
        let newText: string
        if (typeof result === 'string') {
          newText = result
        } else if (result?.text) {
          newText = result.text
        } else if (result?.content) {
          newText = result.content
        } else if (result?.message) {
          newText = result.message
        } else if (result?.result) {
          newText = typeof result.result === 'string' ? result.result : JSON.stringify(result.result)
        } else {
          newText = String(result)
        }

        onReplace?.(newText, { start: selection.start, end: selection.end })

        // Dismiss after successful replacement
        setVisible(false)
        setSelection(null)
      } catch (err) {
        // On error, keep the toolbar visible so the user can retry
        console.error('[EchoTextActions] Action failed:', err)
      } finally {
        setLoading(false)
      }
    },
    [selection, loading, entityType, entityId, onReplace],
  )

  // ------- Gate: don't render if plan doesn't support it -------

  if (!canUseInlineGenerate) return null
  if (!visible || !selection) return null

  // ------- Position calculation -------

  const TOOLBAR_HEIGHT = 40
  const GAP = 8
  const nearTop = selection.rect.top < TOOLBAR_HEIGHT + GAP + 20

  const posStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
    left: selection.rect.left + selection.rect.width / 2,
    transform: 'translateX(-50%)',
    ...(nearTop
      ? { top: selection.rect.bottom + GAP }
      : { top: selection.rect.top - TOOLBAR_HEIGHT - GAP }),
  }

  // ------- Render -------

  return createPortal(
    <div
      ref={toolbarRef}
      className={cn(
        'echo-text-actions',
        'flex items-center gap-0.5 px-1.5 py-1 rounded-xl',
        'shadow-xl pointer-events-auto',
        'animate-in fade-in zoom-in-95 duration-150',
      )}
      style={{
        ...posStyle,
        background: 'color-mix(in srgb, var(--bg-primary) 82%, transparent)',
        backdropFilter: 'blur(16px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.6)',
        border: '1px solid var(--glass-border, color-mix(in srgb, var(--text-primary) 10%, transparent))',
        boxShadow:
          '0 4px 24px color-mix(in srgb, var(--text-primary) 12%, transparent), 0 1px 4px color-mix(in srgb, var(--text-primary) 8%, transparent)',
      }}
      onMouseDown={(e) => {
        // Prevent toolbar clicks from clearing the text selection
        e.preventDefault()
      }}
    >
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-1">
          <Loader2
            size={14}
            className="animate-spin"
            style={{ color: 'var(--brand-primary)' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Generating...
          </span>
        </div>
      ) : (
        actions.map((actionType) => {
          const meta = ACTION_META[actionType]
          if (!meta) return null
          const Icon = meta.icon
          return (
            <button
              key={actionType}
              type="button"
              onClick={() => handleAction(actionType)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                'text-xs font-medium whitespace-nowrap',
                'transition-all duration-150 cursor-pointer',
                'hover:scale-[1.03] active:scale-[0.97]',
              )}
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--brand-primary)'
                e.currentTarget.style.background =
                  'color-mix(in srgb, var(--brand-primary) 10%, transparent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }}
              title={meta.label}
            >
              <Icon size={14} />
              <span>{meta.label}</span>
            </button>
          )
        })
      )}
    </div>,
    document.body,
  )
}
