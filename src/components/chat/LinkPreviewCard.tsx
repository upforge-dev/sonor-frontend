/**
 * LinkPreviewCard (Phase 3.2.2)
 * Fetches OG metadata for a URL and displays title, description, image.
 */
import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { chatkitApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

const URL_REGEX = /https?:\/\/[^\s"'<>)\]]+/gi

export function extractFirstUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null
  const m = text.match(URL_REGEX)
  return m?.[0] ?? null
}

interface LinkPreviewData {
  url: string
  title: string | null
  description: string | null
  image: string | null
}

interface LinkPreviewCardProps {
  url: string
  className?: string
}

export function LinkPreviewCard({ url, className }: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    chatkitApi
      .getLinkPreview(url)
      .then((res) => {
        if (cancelled) return
        const d = res?.data?.data ?? res?.data ?? res
        if (d?.url) setData({ url: d.url, title: d.title ?? null, description: d.description ?? null, image: d.image ?? null })
        else setError(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [url])

  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'mt-2 flex items-center gap-2 rounded-lg border border-[var(--glass-border)]/50 bg-[var(--surface-secondary)]/50 px-3 py-2 text-sm text-[var(--text-tertiary)] hover:bg-[var(--surface-secondary)]',
          className
        )}
      >
        <ExternalLink className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1">{url}</span>
      </a>
    )
  }

  if (error || !data) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--glass-border)]/50 bg-[var(--surface-secondary)]/50 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]',
          className
        )}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate max-w-[200px]">{url}</span>
      </a>
    )
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'mt-2 flex overflow-hidden rounded-lg border border-[var(--glass-border)]/50 bg-[var(--surface-secondary)]/80 transition-colors hover:bg-[var(--surface-secondary)]',
        className
      )}
    >
      {data.image && (
        <div className="h-20 w-24 shrink-0 overflow-hidden bg-[var(--surface-tertiary)]">
          <img
            src={data.image}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 px-3 py-2">
        {data.title && (
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-tertiary)]">
            {data.description}
          </p>
        )}
        {!data.title && !data.description && (
          <p className="truncate text-xs text-[var(--text-tertiary)]">{data.url}</p>
        )}
      </div>
      <ExternalLink className="mx-2 h-4 w-4 shrink-0 self-center text-[var(--text-tertiary)]" />
    </a>
  )
}
