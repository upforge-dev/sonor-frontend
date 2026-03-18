/**
 * useContextHelp — Hook for the "What's this?" contextual help system.
 *
 * Manages the global right-click context menu, hover hint overlays,
 * and keyboard shortcut for Sonor's contextual help layer.
 *
 * How it works:
 * 1. Listens for `contextmenu` events on elements with `data-sonor-help` attributes
 * 2. Shows a custom context menu with "What's this?" option
 * 3. Dispatches `open-echo` CustomEvent with the help key as context
 * 4. Echo receives the context and routes to the `sonor` skill → `explain_element` tool
 *
 * The `data-sonor-help` attribute format: `{module}/{element-id}`
 * Example: `data-sonor-help="crm/pipeline-kanban"`
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ContextHelpState {
  /** Whether the custom context menu is currently visible */
  isMenuOpen: boolean
  /** Screen position of the context menu */
  menuPosition: { x: number; y: number }
  /** The help key from the `data-sonor-help` attribute */
  helpKey: string | null
  /** Human-readable label derived from the help key */
  helpLabel: string
  /** The current page path */
  pagePath: string
}

/**
 * Walk up the DOM tree from a target element to find the nearest
 * ancestor (or self) with a `data-sonor-help` attribute.
 */
function findHelpKey(target: EventTarget | null): string | null {
  let el = target as HTMLElement | null
  // Walk up max 15 levels to avoid infinite loops on deep DOMs
  let depth = 0
  while (el && depth < 15) {
    const key = el.getAttribute?.('data-sonor-help')
    if (key) return key
    el = el.parentElement
    depth++
  }
  return null
}

/**
 * Convert a help key like "crm/pipeline-kanban" into a readable label
 * like "CRM Pipeline Kanban"
 */
function helpKeyToLabel(key: string): string {
  return key
    .replace(/\//g, ' › ')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function useContextHelp() {
  const [state, setState] = useState<ContextHelpState>({
    isMenuOpen: false,
    menuPosition: { x: 0, y: 0 },
    helpKey: null,
    helpLabel: '',
    pagePath: '',
  })

  const menuRef = useRef<HTMLDivElement | null>(null)

  // Close the menu
  const closeMenu = useCallback(() => {
    setState((prev) => ({ ...prev, isMenuOpen: false, helpKey: null }))
  }, [])

  // Open Echo with the "What's this?" context
  const openWhatsThis = useCallback(() => {
    if (!state.helpKey) return

    window.dispatchEvent(
      new CustomEvent('open-echo', {
        detail: {
          context: `whats-this:${state.helpKey}`,
          path: window.location.pathname,
        },
      }),
    )

    closeMenu()
  }, [state.helpKey, closeMenu])

  // Handle right-click globally
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const helpKey = findHelpKey(e.target)
      if (!helpKey) return // No help attribute found — let browser handle it

      e.preventDefault()

      // Position the menu at the cursor, but clamp to viewport
      const x = Math.min(e.clientX, window.innerWidth - 220)
      const y = Math.min(e.clientY, window.innerHeight - 200)

      setState({
        isMenuOpen: true,
        menuPosition: { x, y },
        helpKey,
        helpLabel: helpKeyToLabel(helpKey),
        pagePath: window.location.pathname,
      })
    }

    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!state.isMenuOpen) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }

    // Close on scroll
    const handleScroll = () => closeMenu()

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [state.isMenuOpen, closeMenu])

  // Global `?` keyboard shortcut — opens Echo with page context
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()

        // Get the current module from the URL path
        const pathSegment = window.location.pathname.split('/')[1] || 'dashboard'

        window.dispatchEvent(
          new CustomEvent('open-echo', {
            detail: {
              context: `page-help:${pathSegment}`,
              path: window.location.pathname,
            },
          }),
        )
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    ...state,
    menuRef,
    closeMenu,
    openWhatsThis,
  }
}
