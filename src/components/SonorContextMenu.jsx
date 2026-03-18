/**
 * SonorContextMenu — Global "What's this?" context menu overlay.
 *
 * Renders a floating context menu when the user right-clicks on any element
 * tagged with `data-sonor-help`. The menu provides:
 *   - "What's this?" — opens Echo with contextual help
 *   - Element label derived from the help key
 *
 * Also renders subtle hover hint `?` icons on tagged elements.
 *
 * This component should be rendered once, at the top level of the app
 * (inside MainLayout), not per-module.
 *
 * @see useContextHelp for the hook that powers this
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, Search, ExternalLink, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContextHelp } from '@/hooks/useContextHelp'

// ─── Context Menu (right-click) ────────────────────────────────────────────

function ContextMenuOverlay() {
  const {
    isMenuOpen,
    menuPosition,
    helpKey,
    helpLabel,
    menuRef,
    closeMenu,
    openWhatsThis,
  } = useContextHelp()

  if (!isMenuOpen || !helpKey) return null

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[9999] min-w-[200px] max-w-[280px]',
        'bg-[var(--surface-primary)] border border-[var(--glass-border)]/60',
        'rounded-xl shadow-2xl overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-150',
      )}
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
      }}
      role="menu"
      aria-label="Sonor context menu"
    >
      {/* Element label */}
      <div className="px-3 py-2 border-b border-[var(--glass-border)]/30">
        <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          {helpLabel}
        </p>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {/* What's this? — primary action */}
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 text-left',
            'text-sm text-[var(--text-primary)] font-medium',
            'hover:bg-[var(--brand-primary)]/10 transition-colors',
          )}
          onClick={openWhatsThis}
          role="menuitem"
        >
          <HelpCircle className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
          <span>What's this?</span>
          <kbd className="ml-auto text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--surface-tertiary)] px-1.5 py-0.5 rounded">
            ?
          </kbd>
        </button>

        {/* Search docs */}
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 text-left',
            'text-sm text-[var(--text-secondary)]',
            'hover:bg-[var(--surface-tertiary)] transition-colors',
          )}
          onClick={() => {
            // Open Echo with a search query about this element
            window.dispatchEvent(
              new CustomEvent('open-echo', {
                detail: {
                  context: `search-help:${helpKey}`,
                  path: window.location.pathname,
                },
              }),
            )
            closeMenu()
          }}
          role="menuitem"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Search help docs</span>
        </button>
      </div>

      {/* Separator + keyboard hint */}
      <div className="border-t border-[var(--glass-border)]/30 px-3 py-1.5">
        <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
          <Keyboard className="h-3 w-3" />
          Press <kbd className="font-mono bg-[var(--surface-tertiary)] px-1 rounded">?</kbd> anywhere for help
        </p>
      </div>
    </div>,
    document.body,
  )
}

// ─── Hover Hint (subtle ? icon) ────────────────────────────────────────────

/**
 * Tracks which element the user is hovering over (if it has data-sonor-help)
 * and renders a subtle `?` icon in the top-right corner.
 */
function HoverHintOverlay() {
  const [hint, setHint] = useState(null) // { rect, helpKey }
  const timeoutRef = useRef(null)
  const currentElRef = useRef(null)

  const handleMouseOver = useCallback((e) => {
    // Walk up from target to find data-sonor-help
    let el = e.target
    let depth = 0
    while (el && depth < 15) {
      if (el.getAttribute?.('data-sonor-help')) {
        // Debounce slightly to avoid flicker
        if (currentElRef.current === el) return
        currentElRef.current = el

        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          const rect = el.getBoundingClientRect()
          // Only show if element is reasonably sized (not a tiny inline span)
          if (rect.width > 60 && rect.height > 30) {
            setHint({
              rect: {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
              },
              helpKey: el.getAttribute('data-sonor-help'),
            })
          }
        }, 300) // 300ms debounce
        return
      }
      el = el.parentElement
      depth++
    }

    // Not over a help element — clear
    if (currentElRef.current) {
      currentElRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setHint(null), 150)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    currentElRef.current = null
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHint(null)
  }, [])

  useEffect(() => {
    document.addEventListener('mouseover', handleMouseOver, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true })
    // Clear on scroll (positions become stale)
    const handleScroll = () => setHint(null)
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })

    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('scroll', handleScroll, true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [handleMouseOver, handleMouseLeave])

  if (!hint) return null

  return createPortal(
    <button
      type="button"
      className={cn(
        'fixed z-[9990] p-1 rounded-full',
        'bg-[var(--surface-primary)]/90 border border-[var(--glass-border)]/40',
        'text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]',
        'shadow-sm hover:shadow-md',
        'opacity-0 animate-in fade-in-0 duration-300',
        'hover:scale-110 transition-all',
        'pointer-events-auto cursor-help',
      )}
      style={{
        // Position in top-right corner of the element, slightly inset
        top: hint.rect.top + 4,
        left: hint.rect.right - 24,
        opacity: 1,
      }}
      onClick={(e) => {
        e.stopPropagation()
        window.dispatchEvent(
          new CustomEvent('open-echo', {
            detail: {
              context: `whats-this:${hint.helpKey}`,
              path: window.location.pathname,
            },
          }),
        )
      }}
      title="What's this? Click for help"
      aria-label={`Help: ${hint.helpKey}`}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>,
    document.body,
  )
}

// ─── Combined Provider ─────────────────────────────────────────────────────

/**
 * SonorContextMenu — renders both the right-click context menu and
 * the hover hint overlay. Drop this once in MainLayout.
 */
export default function SonorContextMenu() {
  return (
    <>
      <ContextMenuOverlay />
      <HoverHintOverlay />
    </>
  )
}
