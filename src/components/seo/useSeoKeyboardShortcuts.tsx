/**
 * SEO Keyboard Shortcuts Hook
 * 
 * Provides keyboard navigation for the SEO module.
 * Improves power user experience and accessibility.
 */

import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export interface SeoKeyboardShortcut {
  key: string
  description: string
  action: () => void
  modifier?: 'ctrl' | 'cmd' | 'alt' | 'shift'
  sequence?: string[] // For vim-style sequences like 'g' then 'p'
}

export interface UseSeoKeyboardShortcutsOptions {
  projectId: string
  onCommandPaletteOpen?: () => void
  onSearchFocus?: () => void
}

/**
 * Hook for SEO keyboard shortcuts
 */
export function useSeoKeyboardShortcuts(options: UseSeoKeyboardShortcutsOptions) {
  const navigate = useNavigate()
  const { projectId, onCommandPaletteOpen, onSearchFocus } = options

  // Sequence tracker for vim-style navigation
  let sequenceBuffer: string[] = []
  let sequenceTimeout: NodeJS.Timeout | null = null

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Check for modifier keys
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

    // Ignore if typing in input/textarea
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Exception: Allow '/' to focus search even in inputs
      if (event.key === '/' && !event.shiftKey && !cmdOrCtrl) {
        event.preventDefault()
        onSearchFocus?.()
      }
      return
    }

    // Command palette (Cmd/Ctrl + K)
    if (cmdOrCtrl && event.key === 'k') {
      event.preventDefault()
      onCommandPaletteOpen?.()
      return
    }

    // Focus search (/)
    if (event.key === '/' && !event.shiftKey) {
      event.preventDefault()
      onSearchFocus?.()
      return
    }

    // Escape (close modals/dialogs)
    if (event.key === 'Escape') {
      // Let components handle this naturally
      return
    }

    // Sequence-based navigation (vim-style)
    handleSequence(event)
  }, [projectId, navigate, onCommandPaletteOpen, onSearchFocus])

  const handleSequence = (event: KeyboardEvent) => {
    // Add key to sequence buffer
    sequenceBuffer.push(event.key.toLowerCase())

    // Clear sequence after 1 second
    if (sequenceTimeout) clearTimeout(sequenceTimeout)
    sequenceTimeout = setTimeout(() => {
      sequenceBuffer = []
    }, 1000)

    const sequence = sequenceBuffer.join('')

    // Check sequences
    switch (sequence) {
      case 'gd': // Go to Dashboard
        navigate(`/seo/${projectId}`)
        sequenceBuffer = []
        break

      case 'gp': // Go to Pages
        navigate(`/seo/${projectId}/pages`)
        sequenceBuffer = []
        break

      case 'go': // Go to Opportunities
        navigate(`/seo/${projectId}/opportunities`)
        sequenceBuffer = []
        break

      case 'gk': // Go to Keywords
        navigate(`/seo/${projectId}/keywords`)
        sequenceBuffer = []
        break

      case 'gt': // Go to Technical
        navigate(`/seo/${projectId}/technical`)
        sequenceBuffer = []
        break

      case 'gl': // Go to Local
        navigate(`/seo/${projectId}/local`)
        sequenceBuffer = []
        break

      case 'gc': // Go to Competitors
        navigate(`/seo/${projectId}/competitors`)
        sequenceBuffer = []
        break

      case 'ga': // Go to Analytics
        navigate(`/seo/${projectId}/analytics`)
        sequenceBuffer = []
        break

      default:
        // If sequence doesn't match and is getting long, clear it
        if (sequenceBuffer.length > 2) {
          sequenceBuffer = []
        }
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      if (sequenceTimeout) clearTimeout(sequenceTimeout)
    }
  }, [handleKeyPress])

  // Return available shortcuts for help modal
  return {
    shortcuts: [
      {
        key: 'Cmd/Ctrl + K',
        description: 'Open command palette',
      },
      {
        key: '/',
        description: 'Focus search',
      },
      {
        key: 'Esc',
        description: 'Close modals',
      },
      {
        key: 'g then d',
        description: 'Go to Dashboard',
      },
      {
        key: 'g then p',
        description: 'Go to Pages',
      },
      {
        key: 'g then o',
        description: 'Go to Opportunities',
      },
      {
        key: 'g then k',
        description: 'Go to Keywords',
      },
      {
        key: 'g then t',
        description: 'Go to Technical',
      },
      {
        key: 'g then l',
        description: 'Go to Local SEO',
      },
      {
        key: 'g then c',
        description: 'Go to Competitors',
      },
      {
        key: 'g then a',
        description: 'Go to Analytics',
      },
    ],
  }
}

/**
 * Keyboard shortcuts help modal
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { shortcuts } = useSeoKeyboardShortcuts({ projectId: '', onCommandPaletteOpen: () => {} })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Keyboard Shortcuts</h2>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-gray-700">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
