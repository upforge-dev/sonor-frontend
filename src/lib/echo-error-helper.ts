/**
 * Echo Error Helper
 *
 * Utilities for dispatching error context to Echo so it can provide
 * AI-assisted debugging and resolution suggestions.
 *
 * Usage with sonner toast:
 *   import { toast } from 'sonner'
 *   import { echoErrorAction } from '@/lib/echo-error-helper'
 *
 *   try { ... } catch (err) {
 *     toast.error('Failed to save', { action: echoErrorAction(err, { module: 'seo', action: 'saving page metadata' }) })
 *   }
 */

interface ErrorContext {
  /** Platform module where the error occurred (e.g. 'seo', 'crm', 'analytics') */
  module?: string
  /** Human-readable description of what was being attempted */
  action?: string
  /** API endpoint that failed, if applicable */
  endpoint?: string
}

/**
 * Dispatches an open-echo event with error context for AI-assisted debugging.
 *
 * The Echo chat panel listens for the 'open-echo' CustomEvent and pre-fills
 * the conversation with the error details so the user can immediately ask
 * follow-up questions.
 */
export function askEchoAboutError(error: Error | string, context?: ErrorContext): void {
  const errorMessage = typeof error === 'string' ? error : error.message
  const stack = typeof error === 'string' ? undefined : error.stack

  // Build a concise context string for Echo's initial prompt
  const parts: string[] = []
  if (context?.action) parts.push(`while ${context.action}`)
  if (context?.module) parts.push(`in ${context.module}`)
  if (context?.endpoint) parts.push(`(${context.endpoint})`)
  const contextStr = parts.length > 0 ? ` ${parts.join(' ')}` : ''

  // Build the prefill message that Echo will receive
  const prefill = `I got an error${contextStr}: "${errorMessage}"${stack ? `\n\nStack trace:\n${stack.split('\n').slice(0, 5).join('\n')}` : ''}`

  window.dispatchEvent(
    new CustomEvent('open-echo', {
      detail: {
        context: `error-help:${encodeURIComponent(errorMessage)}`,
        prefill,
        path: window.location.pathname,
        metadata: {
          type: 'error-help',
          module: context?.module,
          action: context?.action,
          endpoint: context?.endpoint,
          errorMessage,
        },
      },
    })
  )
}

/**
 * Creates a toast-compatible action object that opens Echo with error context.
 *
 * Designed for use with sonner's toast API:
 *   toast.error('Failed to load data', { action: echoErrorAction(err) })
 *
 * The returned object has `label` and `onClick` properties which sonner
 * renders as an action button within the toast notification.
 */
export function echoErrorAction(
  error: Error | string,
  context?: ErrorContext
): { label: string; onClick: () => void } {
  return {
    label: 'Ask Echo',
    onClick: () => askEchoAboutError(error, context),
  }
}

/**
 * Wraps a promise-returning function with automatic Echo error reporting.
 *
 * If the wrapped function throws, the error is both re-thrown (so the caller
 * can handle it normally) and dispatched to Echo for AI debugging context.
 *
 * Usage:
 *   const savePage = withEchoErrorReporting(
 *     () => seoApi.savePage(data),
 *     { module: 'seo', action: 'saving page metadata' }
 *   )
 *   await savePage() // throws original error, also notifies Echo
 */
export function withEchoErrorReporting<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): () => Promise<T> {
  return async () => {
    try {
      return await fn()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      askEchoAboutError(err, context)
      throw error
    }
  }
}
