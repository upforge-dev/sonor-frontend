// src/components/blog/BlogPostDetail.jsx
// Blog Command Center — three-column ModuleLayout for viewing and editing a single blog post.
// Design tokens only: var(--brand-primary), var(--glass-bg), var(--glass-border),
// var(--text-primary), var(--text-secondary), var(--text-tertiary).

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import {
  useBlogPost,
  useBlogPostAnalytics,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useBlogAuthors,
  useBlogCategories,
} from '@/hooks/useBlogPost'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/glass-card'
import { StatTile, StatTileGrid } from '@/components/ui/stat-tile'
import { SonorSpinner } from '@/components/SonorLoading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import MarkdownEditor from '@/components/ui/MarkdownEditor'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { skillsApi } from '@/lib/signal-api'
import { filesApi } from '@/lib/sonor-api'
import {
  ArrowLeft,
  Save,
  Eye,
  Edit3,
  FileText,
  Search,
  BarChart3,
  Settings,
  Trash2,
  ImageIcon,
  ExternalLink,
  Clock,
  BookOpen,
  Target,
  Globe,
  Hash,
  Star,
  ChevronDown,
  Plus,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import TurndownService from 'turndown'

// ============================================================================
// CONSTANTS
// ============================================================================

const statusColors = {
  published: 'border-[var(--brand-primary)]/30 text-[var(--brand-primary)] bg-[var(--brand-primary)]/10',
  draft: 'border-amber-500/30 text-amber-500 bg-amber-500/10',
  scheduled: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  archived: 'border-[var(--text-tertiary)]/30 text-[var(--text-tertiary)] bg-[var(--glass-bg)]',
}

const NAV_SECTIONS = [
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'seo', label: 'SEO & Schema', icon: Search },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'publishing', label: 'Publishing', icon: Settings },
]

function estimateReadingTime(wordCount) {
  if (!wordCount) return '0 min'
  const minutes = Math.max(1, Math.round(wordCount / 250))
  return `${minutes} min`
}

function countWords(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Match category Select values (UUID) to API post.category (slug or legacy UUID). */
function resolveCategoryIdForForm(post, categories = []) {
  if (!post) return ''
  const list = Array.isArray(categories) ? categories : []
  if (post.categoryId) return String(post.categoryId)
  if (post.category_id) return String(post.category_id)
  const c = post.category
  if (c && typeof c === 'object' && c.id) return String(c.id)
  if (typeof c === 'string' && c) {
    const byId = list.find((cat) => String(cat.id) === c)
    if (byId) return String(byId.id)
    const bySlug = list.find((cat) => cat.slug === c)
    if (bySlug) return String(bySlug.id)
  }
  return ''
}

function categoryLabelForSidebar(post, categories = []) {
  const list = Array.isArray(categories) ? categories : []
  const id = resolveCategoryIdForForm(post, list)
  if (id) {
    const found = list.find((cat) => String(cat.id) === id)
    if (found) return found.name
  }
  if (post?.category && typeof post.category === 'object' && post.category.name) {
    return post.category.name
  }
  if (typeof post?.category === 'string' && post.category) {
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.category.trim(),
    )
    if (!looksLikeUuid) return post.category
    const found = list.find((cat) => String(cat.id) === post.category)
    if (found) return found.name
  }
  return 'Uncategorized'
}

/**
 * Extract markdown from content that may be JSON-wrapped (pipeline artifact).
 * Some posts have content stored as JSON objects like {"heading":"## ...", "content":"..."}
 * instead of assembled markdown.
 */
function extractMarkdownContent(raw) {
  if (!raw) return ''
  const trimmed = raw.trim()

  // If it starts with { it might be a JSON-wrapped section
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.content) {
        const heading = parsed.heading || ''
        const body = parsed.content
        return body.startsWith('#') ? body : `${heading}\n\n${body}`
      }
    } catch {
      // Multiple JSON objects: {...}\n\n{...} (AI pipeline sections)
      try {
        const parts = trimmed.split(/(?<=\})\s*\n+\s*(?=\{)/)
        if (parts.length > 1) {
          const sections = parts.map((p) => JSON.parse(p.trim()))
          return sections
            .map((s) => {
              if (typeof s === 'string') return s
              const heading = s.heading || ''
              const body = s.content || ''
              return body.startsWith('#') ? body : `${heading}\n\n${body}`
            })
            .join('\n\n')
        }
      } catch {
        // fall through
      }
    }
  }

  // If it starts with [ it might be an array of sections
  if (trimmed.startsWith('[')) {
    try {
      const sections = JSON.parse(trimmed)
      if (Array.isArray(sections)) {
        return sections.map(s => {
          if (typeof s === 'string') return s
          const heading = s.heading || ''
          const body = s.content || ''
          return body.startsWith('#') ? body : `${heading}\n\n${body}`
        }).join('\n\n')
      }
    } catch {
      // Not JSON array
    }
  }

  return raw
}

let _htmlToMdTurndown
function htmlToMarkdown(html) {
  if (!html || typeof html !== 'string') return ''
  const t = html.trim()
  if (!t.startsWith('<')) return ''
  try {
    if (!_htmlToMdTurndown) {
      _htmlToMdTurndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '*',
        strongDelimiter: '**',
      })
    }
    return _htmlToMdTurndown.turndown(t)
  } catch {
    return ''
  }
}

/** Body for the editor: markdown from content, multi-section JSON, or HTML fallback when content is empty. */
function bodyFromPost(post) {
  if (!post) return ''
  const fromRaw = extractMarkdownContent(post.content || post.body || '')
  if (fromRaw && String(fromRaw).trim()) return fromRaw
  return htmlToMarkdown(post.contentHtml || post.content_html || '')
}

// ============================================================================
// LEFT SIDEBAR
// ============================================================================

function LeftSidebar({ activeSection, setActiveSection, post, onBack }) {
  const seoScore = post?.seoScore ?? post?.seo_score ?? null
  const readabilityScore = post?.readabilityScore ?? post?.readability_score ?? null
  const eeatScore = post?.eeatScore ?? post?.eeat_score ?? null

  // Count links from stored data + content analysis
  const internalLinksRaw = post?.internalLinks || post?.internal_links
  const internalLinksArr = Array.isArray(internalLinksRaw)
    ? internalLinksRaw
    : (typeof internalLinksRaw === 'string' ? (() => { try { return JSON.parse(internalLinksRaw) } catch { return [] } })() : [])

  // Also count links from the actual markdown content
  const content = post?.content || ''
  const internalLinkMatches = content.match(/\[([^\]]+)\]\(\/[^)]+\)/g)
  const externalLinkMatches = content.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g)
  const internalLinksOut = Math.max(internalLinksArr.length, internalLinkMatches?.length || 0)
  const externalLinksOut = (post?.externalCitations || post?.external_citations || []).length
    || externalLinkMatches?.length || 0

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Back link */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] -ml-2 gap-1.5"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Button>

        {/* Section navigation */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Sections
          </p>
          {NAV_SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {section.label}
              </button>
            )
          })}
        </div>

        {/* Quality scores */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Quality Scores
          </p>
          <QualityScore label="SEO Score" value={seoScore} />
          <QualityScore label="Readability" value={readabilityScore} />
          <QualityScore label="E-E-A-T" value={eeatScore} />
        </div>

        {/* Links */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Links
          </p>
          <div className="flex items-center justify-between px-3 py-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">Internal</span>
            <span className="text-[var(--text-primary)] font-medium">{internalLinksOut}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 text-sm">
            <span className="text-[var(--text-secondary)]">External</span>
            <span className="text-[var(--text-primary)] font-medium">{externalLinksOut}</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

function QualityScore({ label, value }) {
  const score = value ?? 0
  const percentage = Math.min(100, Math.max(0, score))
  const color =
    percentage >= 80
      ? 'bg-emerald-500'
      : percentage >= 50
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="px-3 py-1.5 space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-primary)] font-medium">
          {value !== null && value !== undefined ? `${score}%` : '--'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// RIGHT SIDEBAR
// ============================================================================

function RightSidebar({ post, form, categories, onPublishToggle, onDelete, isDeleting, onGenerateImage, isGeneratingImage }) {
  if (!post) return null

  const wordCount = post.wordCount || countWords(form.body)
  const readingTime = post.readingTime || estimateReadingTime(wordCount)
  // author can be a string or an object { name, expertise, ... }
  const authorObj = typeof post.author === 'object' && post.author !== null ? post.author : null
  const authorName = authorObj?.name || (typeof post.author === 'string' ? post.author : null) || post.authorProfile?.name || 'Unknown'
  const authorAvatar = authorObj?.avatar_url || authorObj?.image || post.authorProfile?.image || null

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-5">
        {/* Post metadata */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Post Details
          </p>

          {/* Status */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Status</span>
            <Badge
              variant="outline"
              className={cn('text-xs capitalize', statusColors[post.status] || statusColors.draft)}
            >
              {post.status || 'draft'}
            </Badge>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Category</span>
            <span className="text-[var(--text-primary)] text-sm font-medium">
              {categoryLabelForSidebar(post, categories)}
            </span>
          </div>

          {/* Author */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Author</span>
            <div className="flex items-center gap-2">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-[var(--brand-primary)]">
                    {authorName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-[var(--text-primary)] text-sm font-medium">{authorName}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Tags</span>
            <div className="flex flex-wrap gap-1 max-w-[180px] justify-end">
              {(post.tags && post.tags.length > 0) ? (
                post.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] border-[var(--glass-border)] text-[var(--text-secondary)]"
                  >
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-[var(--text-tertiary)] text-xs">None</span>
              )}
              {post.tags && post.tags.length > 3 && (
                <span className="text-[var(--text-tertiary)] text-[10px]">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Featured</span>
            <Star
              className={cn(
                'h-4 w-4',
                post.is_featured
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-[var(--text-tertiary)]'
              )}
            />
          </div>

          {/* Word count */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Word Count</span>
            <span className="text-[var(--text-primary)] text-sm font-medium">
              {wordCount.toLocaleString()}
            </span>
          </div>

          {/* Reading time */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[var(--text-secondary)] text-sm">Reading Time</span>
            <span className="text-[var(--text-primary)] text-sm font-medium">{readingTime}</span>
          </div>
        </div>

        {/* SEO score bars */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            SEO Health
          </p>
          <QualityScore label="Meta Title" value={(post.metaTitle || post.meta_title) ? Math.min(100, Math.round(((post.metaTitle || post.meta_title).length / 60) * 100)) : 0} />
          <QualityScore label="Meta Desc" value={(post.metaDescription || post.meta_description) ? Math.min(100, Math.round(((post.metaDescription || post.meta_description).length / 155) * 100)) : 0} />
          <QualityScore label="Overall" value={post.seoScore ?? post.seo_score ?? null} />
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Quick Actions
          </p>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onGenerateImage}
            disabled={isGeneratingImage}
          >
            {isGeneratingImage ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-full justify-start gap-2',
              post.status === 'published'
                ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10'
                : 'border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
            )}
            onClick={onPublishToggle}
          >
            {post.status === 'published' ? (
              <>
                <Clock className="h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Publish
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete Post
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The post and all associated data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </ScrollArea>
  )
}

// ============================================================================
// CONTENT SECTION
// ============================================================================

function ContentSection({ form, setField, post, formReady, onGenerateImage, isGeneratingImage, imagePrompt, setImagePrompt, showImagePrompt, setShowImagePrompt }) {
  const [previewMode, setPreviewMode] = useState(false)
  const wordCount = post?.wordCount || countWords(form.body)

  return (
    <div className="space-y-6">
      {/* Preview / Edit toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={previewMode ? 'ghost' : 'default'}
          size="sm"
          className={cn(
            'gap-1.5',
            !previewMode && 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90'
          )}
          onClick={() => setPreviewMode(false)}
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant={previewMode ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            'gap-1.5',
            previewMode && 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90'
          )}
          onClick={() => setPreviewMode(true)}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
        <span className="ml-auto text-xs text-[var(--text-tertiary)]">
          {wordCount.toLocaleString()} words
        </span>
      </div>

      {previewMode ? (
        <ContentPreview form={form} post={post} />
      ) : (
        <ContentEditor form={form} setField={setField} post={post} formReady={formReady} onGenerateImage={onGenerateImage} isGeneratingImage={isGeneratingImage} imagePrompt={imagePrompt} setImagePrompt={setImagePrompt} showImagePrompt={showImagePrompt} setShowImagePrompt={setShowImagePrompt} />
      )}
    </div>
  )
}

function ContentPreview({ form, post }) {
  const authorObj = typeof post?.author === 'object' && post?.author !== null ? post.author : null
  const authorName = authorObj?.name || (typeof post?.author === 'string' ? post.author : null) || post?.authorProfile?.name || 'Unknown'
  const authorAvatar = authorObj?.avatar_url || authorObj?.image || post?.authorProfile?.image || null
  const publishedDate = (post?.publishedAt || post?.published_at) ? format(new Date(post.publishedAt || post.published_at), 'MMMM d, yyyy') : null

  return (
    <div className="space-y-6">
      {/* Featured image */}
      {form.featured_image_url && (
        <div className="rounded-xl overflow-hidden border border-[var(--glass-border)]">
          <img
            src={form.featured_image_url}
            alt={form.featured_image_alt || form.title}
            className="w-full h-auto max-h-[360px] object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold text-[var(--text-primary)] leading-tight">
        {form.title || 'Untitled Post'}
      </h1>

      {/* Author byline */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--glass-border)]">
        {authorAvatar ? (
          <img src={authorAvatar} alt={authorName} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-[var(--brand-primary)]">
              {authorName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{authorName}</p>
          {publishedDate && (
            <p className="text-xs text-[var(--text-tertiary)]">{publishedDate}</p>
          )}
        </div>
      </div>

      {/* Table of contents */}
      {form.body && <TableOfContents markdown={form.body} />}

      {/* Rendered content */}
      <GlassCard className="p-6">
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-a:text-[var(--brand-primary)] prose-li:text-[var(--text-secondary)] prose-blockquote:border-[var(--brand-primary)] prose-blockquote:text-[var(--text-tertiary)] prose-code:text-[var(--brand-primary)] prose-code:bg-[var(--glass-bg)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-hr:border-[var(--glass-border)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {form.body || ''}
          </ReactMarkdown>
        </div>
      </GlassCard>
    </div>
  )
}

function TableOfContents({ markdown }) {
  const headings = useMemo(() => {
    if (!markdown) return []
    const lines = markdown.split('\n')
    const result = []
    for (const line of lines) {
      const match = line.match(/^(#{2,4})\s+(.+)/)
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2].replace(/[*_`]/g, ''),
          id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        })
      }
    }
    return result
  }, [markdown])

  if (headings.length < 2) return null

  return (
    <GlassCard className="p-4">
      <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
        Table of Contents
      </p>
      <nav className="space-y-1">
        {headings.map((h, i) => (
          <div
            key={i}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand-primary)] cursor-pointer transition-colors"
            style={{ paddingLeft: `${(h.level - 2) * 12}px` }}
          >
            {h.text}
          </div>
        ))}
      </nav>
    </GlassCard>
  )
}

function ContentEditor({ form, setField, post, formReady, onGenerateImage, isGeneratingImage, imagePrompt, setImagePrompt, showImagePrompt, setShowImagePrompt }) {
  const [showImageLightbox, setShowImageLightbox] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageUpload = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB')
      return
    }
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'blog')
      const { data } = await filesApi.uploadFileForm(formData)
      const url = data?.data?.url || data?.url
      if (url) {
        setField('featured_image_url', url)
        toast.success('Image uploaded')
      } else {
        throw new Error('No URL returned')
      }
    } catch (err) {
      console.error('Image upload failed:', err)
      toast.error('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
    }
  }, [setField])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleImageUpload(file)
  }, [handleImageUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <div className="space-y-6">
      {/* Title */}
      <Input
        value={form.title}
        onChange={(e) => setField('title', e.target.value)}
        placeholder="Post title..."
        className="text-2xl font-bold border-none bg-transparent px-0 h-auto py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:ring-offset-0"
      />

      {/* Excerpt */}
      <div className="space-y-2">
        <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Excerpt</Label>
        <Textarea
          value={form.excerpt}
          onChange={(e) => setField('excerpt', e.target.value)}
          placeholder="Brief summary of this post..."
          className="min-h-[72px] resize-none border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {/* Body — only mount editor after form.body has been populated from the post to avoid blank-overwrite race */}
      <div className="space-y-2">
        <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Content</Label>
        {formReady ? (
          <MarkdownEditor
            value={form.body}
            onChange={(val) => setField('body', val)}
          />
        ) : (
          <div
            className="border border-[var(--glass-border)] rounded-lg p-4 text-[var(--text-tertiary)] text-sm"
            style={{ minHeight: '300px' }}
          >
            Loading content...
          </div>
        )}
      </div>

      {/* Featured image */}
      <GlassCard className="p-4 space-y-4">
        <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          Featured Image
        </p>
        {form.featured_image_url ? (
          <>
            <div className="relative group rounded-lg overflow-hidden border border-[var(--glass-border)]">
              <img
                src={form.featured_image_url}
                alt={form.featured_image_alt || 'Featured'}
                className="w-full h-40 object-cover cursor-pointer transition-opacity hover:opacity-90"
                onClick={() => setShowImageLightbox(true)}
              />
              <button
                onClick={() => setField('featured_image_url', '')}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Dialog open={showImageLightbox} onOpenChange={setShowImageLightbox}>
              <DialogContent className="max-w-4xl p-2 bg-black/95 border-[var(--glass-border)]">
                <img
                  src={form.featured_image_url}
                  alt={form.featured_image_alt || 'Featured'}
                  className="w-full h-auto rounded-lg"
                />
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            <div
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'flex items-center justify-center h-32 rounded-lg border border-dashed cursor-pointer transition-colors',
                isDragging
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--text-tertiary)] hover:bg-[var(--glass-bg)]/80'
              )}
            >
              <div className="text-center">
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-6 w-6 mx-auto text-[var(--brand-primary)] mb-1 animate-spin" />
                    <p className="text-xs text-[var(--text-tertiary)]">Uploading...</p>
                  </>
                ) : isDragging ? (
                  <>
                    <ImageIcon className="h-6 w-6 mx-auto text-[var(--brand-primary)] mb-1" />
                    <p className="text-xs text-[var(--brand-primary)]">Drop image here</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 mx-auto text-[var(--text-tertiary)] mb-1" />
                    <p className="text-xs text-[var(--text-tertiary)]">Click or drag to upload</p>
                  </>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
                e.target.value = ''
              }}
            />
          </>
        )}
        <div className="space-y-2">
          {showImagePrompt && (
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--text-tertiary)]">Image Instructions (optional)</Label>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder='e.g. "feature a red sports car" or "use a modern office setting"'
                rows={2}
                className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-[var(--brand-primary)]/30 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
              onClick={() => {
                if (!showImagePrompt) {
                  setShowImagePrompt(true)
                } else {
                  onGenerateImage(imagePrompt || undefined)
                }
              }}
              disabled={isGeneratingImage}
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Star className="h-3.5 w-3.5" />
                  {showImagePrompt ? 'Generate' : 'Generate with Signal'}
                </>
              )}
            </Button>
            {showImagePrompt && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    onGenerateImage()
                  }}
                  disabled={isGeneratingImage}
                >
                  Skip prompt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    setShowImagePrompt(false)
                    setImagePrompt('')
                  }}
                  disabled={isGeneratingImage}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-[var(--text-tertiary)]">Alt Text</Label>
          <Input
            value={form.featured_image_alt}
            onChange={(e) => setField('featured_image_alt', e.target.value)}
            placeholder="Describe the image for accessibility..."
            className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </GlassCard>
    </div>
  )
}

// ============================================================================
// SEO & SCHEMA SECTION
// ============================================================================

function SEOSection({ form, setField, authors, post }) {
  return (
    <div className="space-y-6">
      {/* Meta fields */}
      <GlassCard className="p-5 space-y-5">
        <GlassCardTitle className="text-base">Meta Information</GlassCardTitle>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Meta Title</Label>
            <CharCounter value={form.meta_title} min={50} max={60} />
          </div>
          <Input
            value={form.meta_title}
            onChange={(e) => setField('meta_title', e.target.value)}
            placeholder="SEO title for search engines..."
            className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Meta Description</Label>
            <CharCounter value={form.meta_description} min={150} max={160} />
          </div>
          <Textarea
            value={form.meta_description}
            onChange={(e) => setField('meta_description', e.target.value)}
            placeholder="Concise description for search results..."
            className="min-h-[80px] resize-none border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Focus Keyphrase</Label>
          <Input
            value={form.focus_keyphrase}
            onChange={(e) => setField('focus_keyphrase', e.target.value)}
            placeholder="Primary keyword or phrase..."
            className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Canonical URL</Label>
          <Input
            value={form.canonical_url}
            onChange={(e) => setField('canonical_url', e.target.value)}
            placeholder="https://..."
            className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </GlassCard>

      {/* Author & FAQ */}
      <GlassCard className="p-5 space-y-5">
        <GlassCardTitle className="text-base">Author & FAQ</GlassCardTitle>

        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Author</Label>
          <Select
            value={form.author_id || ''}
            onValueChange={(val) => setField('author_id', val)}
          >
            <SelectTrigger className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
              <SelectValue placeholder="Select an author" />
            </SelectTrigger>
            <SelectContent>
              {(authors || []).map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">FAQ Items</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[var(--brand-primary)]"
              onClick={() => {
                const newFaqs = [...(form.faqs || []), { question: '', answer: '' }]
                setField('faqs', newFaqs)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          {(form.faqs || []).length === 0 && (
            <p className="text-xs text-[var(--text-tertiary)] py-2">No FAQ items yet. Add one to improve rich snippets.</p>
          )}
          {(form.faqs || []).map((faq, i) => (
            <FAQItem
              key={i}
              index={i}
              faq={faq}
              onChange={(updated) => {
                const newFaqs = [...(form.faqs || [])]
                newFaqs[i] = updated
                setField('faqs', newFaqs)
              }}
              onRemove={() => {
                const newFaqs = (form.faqs || []).filter((_, idx) => idx !== i)
                setField('faqs', newFaqs)
              }}
            />
          ))}
        </div>
      </GlassCard>

      {/* Schema JSON */}
      <GlassCard className="p-5 space-y-3">
        <GlassCardTitle className="text-base">Schema JSON</GlassCardTitle>
        <div className="rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4 overflow-x-auto">
          <pre className="text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-all">
            {(post?.schema || post?.schema_json)
              ? JSON.stringify(post.schema || post.schema_json, null, 2)
              : '// Schema will be generated from post data'}
          </pre>
        </div>
      </GlassCard>
    </div>
  )
}

function CharCounter({ value, min, max }) {
  const len = (value || '').length
  const isGood = len >= min && len <= max
  const isTooLong = len > max
  return (
    <span
      className={cn(
        'text-xs font-mono',
        isGood
          ? 'text-emerald-500'
          : isTooLong
            ? 'text-red-500'
            : 'text-[var(--text-tertiary)]'
      )}
    >
      {len}/{max}
    </span>
  )
}

function FAQItem({ index, faq, onChange, onRemove }) {
  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase shrink-0 pt-2">
          Q{index + 1}
        </span>
        <Input
          value={faq.question}
          onChange={(e) => onChange({ ...faq, question: e.target.value })}
          placeholder="Question..."
          className="flex-1 border-[var(--glass-border)] bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <button
          onClick={onRemove}
          className="shrink-0 p-1 rounded text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Textarea
        value={faq.answer}
        onChange={(e) => onChange({ ...faq, answer: e.target.value })}
        placeholder="Answer..."
        className="min-h-[56px] resize-none border-[var(--glass-border)] bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
      />
    </div>
  )
}

// ============================================================================
// ANALYTICS SECTION
// ============================================================================

function AnalyticsSection({ post, analytics }) {
  const isDraft = post?.status === 'draft'

  if (isDraft) {
    return (
      <GlassCard className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 mb-3">
          <BarChart3 className="h-6 w-6 text-[var(--brand-primary)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          No Analytics Yet
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          Analytics data will appear here once this post is published and starts receiving traffic.
        </p>
      </GlassCard>
    )
  }

  const raw = analytics?.data || analytics || {}
  const gsc = raw.gsc || {}

  return (
    <div className="space-y-6">
      {/* Traffic metrics */}
      <StatTileGrid columns={4}>
        <StatTile
          label="Views (30d)"
          value={raw.views ?? '--'}
          icon={Eye}
          color="brand"
        />
        <StatTile
          label="GSC Clicks"
          value={gsc.clicks_28d ?? '--'}
          icon={Target}
          color="blue"
        />
        <StatTile
          label="GSC Impressions"
          value={gsc.impressions_28d ?? '--'}
          icon={Globe}
          color="purple"
        />
        <StatTile
          label="Avg Position"
          value={gsc.avg_position_28d != null ? Number(gsc.avg_position_28d).toFixed(1) : '--'}
          icon={Hash}
          color="green"
        />
      </StatTileGrid>

      {/* Engagement metrics */}
      <StatTileGrid columns={4}>
        <StatTile
          label="Avg Scroll Depth"
          value={raw.avgScrollDepth != null ? `${raw.avgScrollDepth}%` : '--'}
          icon={BookOpen}
          color="orange"
        />
        <StatTile
          label="Avg Time on Page"
          value={raw.avgTimeOnPage != null ? `${raw.avgTimeOnPage}s` : '--'}
          icon={Clock}
          color="brand"
        />
        <StatTile
          label="CTR"
          value={gsc.ctr_28d != null ? `${(Number(gsc.ctr_28d) * 100).toFixed(1)}%` : '--'}
          icon={ExternalLink}
          color="blue"
        />
        <StatTile
          label="Word Count"
          value={(post?.wordCount ?? countWords(bodyFromPost(post))).toLocaleString()}
          icon={FileText}
          color="purple"
        />
      </StatTileGrid>
    </div>
  )
}

// ============================================================================
// PUBLISHING SECTION
// ============================================================================

function PublishingSection({ form, setField, categories, post, onDelete, isDeleting }) {
  return (
    <div className="space-y-6">
      <GlassCard className="p-5 space-y-5">
        <GlassCardTitle className="text-base">Publishing Settings</GlassCardTitle>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) => setField('status', val)}
          >
            <SelectTrigger className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scheduled date */}
        {form.status === 'scheduled' && (
          <div className="space-y-2">
            <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Publish Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_at || ''}
              onChange={(e) => setField('scheduled_at', e.target.value)}
              className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]"
            />
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Category</Label>
          <Select
            value={form.category_id || ''}
            onValueChange={(val) => setField('category_id', val)}
          >
            <SelectTrigger className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {(categories || []).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Tags</Label>
          <Input
            value={form.tags_input}
            onChange={(e) => setField('tags_input', e.target.value)}
            placeholder="Separate tags with commas..."
            className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Comma-separated. E.g. seo, marketing, growth
          </p>
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => setField('slug', e.target.value)}
            placeholder="post-url-slug"
            className="border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          {form.slug && (
            <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
              <Globe className="h-3 w-3" />
              /blog/{form.slug}
            </p>
          )}
        </div>

        {/* Featured */}
        <div className="flex items-center justify-between py-2">
          <div>
            <Label className="text-sm text-[var(--text-primary)]">Featured Post</Label>
            <p className="text-xs text-[var(--text-tertiary)]">Show in featured section on blog listing</p>
          </div>
          <Switch
            checked={form.is_featured}
            onCheckedChange={(val) => setField('is_featured', val)}
          />
        </div>
      </GlassCard>

      {/* Danger zone */}
      <GlassCard className="p-5 space-y-3 border-red-500/20">
        <GlassCardTitle className="text-base text-red-500">Danger Zone</GlassCardTitle>
        <p className="text-sm text-[var(--text-secondary)]">
          Permanently delete this post and all of its associated data. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Post
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{form.title || 'this post'}" and all associated analytics,
                FAQ items, and schema data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete permanently'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </GlassCard>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BlogPostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { currentProject, currentOrg } = useAuthStore()
  const projectId = currentProject?.id

  // Data queries
  const { data: post, isLoading: postLoading, error: postError } = useBlogPost(postId)
  const { data: analytics } = useBlogPostAnalytics(postId)
  const { data: authorsData } = useBlogAuthors(projectId)
  const { data: categoriesData } = useBlogCategories(projectId)
  const updatePost = useUpdateBlogPost()
  const deletePost = useDeleteBlogPost()

  const authors = authorsData?.data || authorsData || []
  const categories = categoriesData?.data || categoriesData || []

  // Active section
  const [activeSection, setActiveSection] = useState('content')

  // Form state
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    body: '',
    meta_title: '',
    meta_description: '',
    focus_keyphrase: '',
    canonical_url: '',
    featured_image_url: '',
    featured_image_alt: '',
    author_id: '',
    category_id: '',
    tags_input: '',
    slug: '',
    status: 'draft',
    scheduled_at: '',
    is_featured: false,
    faqs: [],
  })
  const [formPostId, setFormPostId] = useState(null)

  // Initialize form when navigating to a post (category_id filled when categories are already cached).
  useEffect(() => {
    if (!post) return
    setFormPostId(post.id)
    setForm({
      title: post.title || '',
      excerpt: post.excerpt || '',
      body: bodyFromPost(post),
      meta_title: post.metaTitle || post.meta_title || '',
      meta_description: post.metaDescription || post.meta_description || '',
      focus_keyphrase: post.focusKeyphrase || post.focus_keyphrase || '',
      canonical_url: post.canonicalUrl || post.canonical_url || '',
      featured_image_url: post.featuredImage || post.featured_image || '',
      featured_image_alt: post.featuredImageAlt || post.featured_image_alt || '',
      author_id: post.authorId || post.author_id || '',
      category_id: resolveCategoryIdForForm(post, categories),
      tags_input: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
      slug: post.slug || '',
      status: post.status || 'draft',
      scheduled_at: (post.scheduledFor || post.scheduled_at)
        ? new Date(post.scheduledFor || post.scheduled_at).toISOString().slice(0, 16)
        : '',
      is_featured: post.featured ?? post.is_featured ?? false,
      faqs: post.faqItems || post.faq_items || [],
    })
  }, [post])

  // When categories load after the post, set Select value once (slug on post → category UUID).
  useEffect(() => {
    if (!post || !categories?.length) return
    const id = resolveCategoryIdForForm(post, categories)
    if (!id) return
    setForm((prev) => {
      if (prev.category_id) return prev
      return { ...prev, category_id: id }
    })
  }, [post?.id, categories])

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Dirty tracking — compare form state to API response (camelCase)
  const isDirty = useMemo(() => {
    if (!post) return false
    const savedCategoryId = resolveCategoryIdForForm(post, categories)
    return (
      form.title !== (post.title || '') ||
      form.excerpt !== (post.excerpt || '') ||
      form.body !== bodyFromPost(post) ||
      form.meta_title !== (post.metaTitle || '') ||
      form.meta_description !== (post.metaDescription || '') ||
      form.focus_keyphrase !== (post.focusKeyphrase || '') ||
      form.canonical_url !== (post.canonicalUrl || '') ||
      form.featured_image_url !== (post.featuredImage || '') ||
      form.featured_image_alt !== (post.featuredImageAlt || '') ||
      form.author_id !== (post.authorId || '') ||
      form.category_id !== savedCategoryId ||
      form.tags_input !== (Array.isArray(post.tags) ? post.tags.join(', ') : '') ||
      form.slug !== (post.slug || '') ||
      form.status !== (post.status || 'draft') ||
      form.is_featured !== (post.featured ?? false) ||
      JSON.stringify(form.faqs) !== JSON.stringify(post.faqs || post.faq_items || [])
    )
  }, [form, post, categories])

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef(null)

  // Intercept in-app navigation when dirty
  const navigateWithGuard = useCallback((to) => {
    if (isDirty) {
      pendingNavigationRef.current = to
      setShowUnsavedDialog(true)
    } else {
      navigate(to)
    }
  }, [isDirty, navigate])

  const handleUnsavedDiscard = useCallback(() => {
    setShowUnsavedDialog(false)
    const to = pendingNavigationRef.current
    pendingNavigationRef.current = null
    if (to) navigate(to)
  }, [navigate])


  // Save handler — builds diff and submits. Optional onSuccessCallback for save-then-navigate.
  function buildAndSave(onSuccessCallback) {
    if (!postId || !isDirty) return

    const data = {}
    const o = post || {}

    // Compare form state to API response (camelCase) and build update payload
    if (form.title !== (o.title || '')) data.title = form.title
    if (form.excerpt !== (o.excerpt || '')) data.excerpt = form.excerpt
    if (form.body !== bodyFromPost(o)) {
      if (!form.body.trim() && bodyFromPost(o).trim()) {
        console.warn('[BlogPostDetail] Blocked saving empty body over existing content')
      } else {
        data.content = form.body
      }
    }
    if (form.meta_title !== (o.metaTitle || '')) data.metaTitle = form.meta_title
    if (form.meta_description !== (o.metaDescription || '')) data.metaDescription = form.meta_description
    if (form.focus_keyphrase !== (o.focusKeyphrase || '')) data.focusKeyphrase = form.focus_keyphrase
    if (form.canonical_url !== (o.canonicalUrl || '')) data.canonicalUrl = form.canonical_url
    if (form.featured_image_url !== (o.featuredImage || '')) data.featuredImage = form.featured_image_url
    if (form.featured_image_alt !== (o.featuredImageAlt || '')) data.featuredImageAlt = form.featured_image_alt
    if (form.author_id !== (o.authorId || '')) data.authorId = form.author_id
    if (form.category_id !== resolveCategoryIdForForm(o, categories)) {
      data.category = form.category_id
    }
    if (form.slug !== (o.slug || '')) data.slug = form.slug
    if (form.status !== (o.status || 'draft')) data.status = form.status
    if (form.is_featured !== (o.featured ?? false)) data.featured = form.is_featured
    if (form.status === 'scheduled' && form.scheduled_at) data.scheduledFor = form.scheduled_at

    // Tags
    const newTags = form.tags_input.split(',').map((t) => t.trim()).filter(Boolean)
    const oldTags = o.tags || []
    if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) data.tags = newTags

    // FAQs
    if (JSON.stringify(form.faqs) !== JSON.stringify(o.faqItems || [])) data.faqItems = form.faqs

    if (Object.keys(data).length === 0) {
      toast.info('No changes to save')
      return
    }

    updatePost.mutate({ id: postId, data }, onSuccessCallback ? { onSuccess: onSuccessCallback } : undefined)
  }

  const handleSave = useCallback(() => {
    buildAndSave()
  }, [postId, isDirty, form, post, categories, updatePost])

  const handleSaveAndThen = useCallback((cb) => {
    buildAndSave(cb)
  }, [postId, isDirty, form, post, categories, updatePost])

  // Featured image generation via Signal
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [showImagePrompt, setShowImagePrompt] = useState(false)

  const handleGenerateImage = useCallback(async (customInstructions) => {
    if (!projectId) return
    setIsGeneratingImage(true)
    try {
      const result = await skillsApi.invoke('content', 'generate_blog_image', {
        params: {
          title: form.title,
          topic: form.title,
          category: form.category_id,
          content: form.body,
          excerpt: form.excerpt,
          style: 'photorealistic',
          aspectRatio: '16:9',
          ...(customInstructions ? { customInstructions } : {}),
        },
        context: {
          project_id: projectId,
          org_id: currentOrg?.id,
        },
      })

      const imageResult = result?.result || result
      if (imageResult?.success && imageResult?.imageUrl) {
        setField('featured_image_url', imageResult.imageUrl)
        if (imageResult.altText) {
          setField('featured_image_alt', imageResult.altText)
        }
        toast.success('Featured image generated')
      } else {
        throw new Error(imageResult?.error || 'Image generation failed')
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
      toast.error(error?.message || 'Failed to generate featured image')
    } finally {
      setIsGeneratingImage(false)
    }
  }, [projectId, currentOrg?.id, form.title, form.body, form.excerpt, form.category_id, setField])

  // Delete handler
  const handleDelete = useCallback(() => {
    if (!postId) return
    deletePost.mutate(postId, {
      onSuccess: () => navigate('/blog'),
    })
  }, [postId, deletePost, navigate])

  // Publish toggle
  const handlePublishToggle = useCallback(() => {
    if (!postId) return
    const newStatus = post?.status === 'published' ? 'draft' : 'published'
    updatePost.mutate(
      { id: postId, data: { status: newStatus } },
      {
        onSuccess: () => {
          setField('status', newStatus)
        },
      }
    )
  }, [postId, post, updatePost, setField])

  // Loading state
  if (postLoading) {
    return (
      <ModuleLayout ariaLabel="Blog Post Detail">
        <ModuleLayout.Header
          icon={MODULE_ICONS.blog}
          breadcrumbs={[
            { label: 'Blog', href: '/blog' },
            { label: 'Loading...' },
          ]}
        />
        <ModuleLayout.Content>
          <div className="flex items-center justify-center h-64">
            <SonorSpinner />
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>
    )
  }

  // Error state
  if (postError || !post) {
    return (
      <ModuleLayout ariaLabel="Blog Post Detail">
        <ModuleLayout.Header
          icon={MODULE_ICONS.blog}
          breadcrumbs={[
            { label: 'Blog', href: '/blog' },
            { label: 'Error' },
          ]}
        />
        <ModuleLayout.Content>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10">
              <FileText className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Post Not Found</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {postError?.message || 'The post you are looking for does not exist or has been deleted.'}
            </p>
            <Button
              variant="outline"
              className="gap-2 border-[var(--glass-border)]"
              onClick={() => navigate('/blog')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>
    )
  }

  // Render the active section
  const renderSection = () => {
    switch (activeSection) {
      case 'content':
        return <ContentSection form={form} setField={setField} post={post} formReady={formPostId === post?.id} onGenerateImage={handleGenerateImage} isGeneratingImage={isGeneratingImage} imagePrompt={imagePrompt} setImagePrompt={setImagePrompt} showImagePrompt={showImagePrompt} setShowImagePrompt={setShowImagePrompt} />
      case 'seo':
        return <SEOSection form={form} setField={setField} authors={authors} post={post} />
      case 'analytics':
        return <AnalyticsSection post={post} analytics={analytics} />
      case 'publishing':
        return (
          <PublishingSection
            form={form}
            setField={setField}
            categories={categories}
            post={post}
            onDelete={handleDelete}
            isDeleting={deletePost.isPending}
          />
        )
      default:
        return null
    }
  }

  return (
    <ModuleLayout
      ariaLabel="Blog Post Detail"
      leftSidebar={
        <LeftSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          post={post}
          onBack={() => navigateWithGuard('/blog')}
        />
      }
      rightSidebar={
        <RightSidebar
          post={post}
          form={form}
          categories={categories}
          onPublishToggle={handlePublishToggle}
          onDelete={handleDelete}
          isDeleting={deletePost.isPending}
          onGenerateImage={handleGenerateImage}
          isGeneratingImage={isGeneratingImage}
        />
      }
      defaultLeftSidebarOpen={true}
      defaultRightSidebarOpen={true}
      leftSidebarTitle="Navigation"
      rightSidebarTitle="Post Details"
    >
      <ModuleLayout.Header
        icon={MODULE_ICONS.blog}
        breadcrumbs={[
          { label: 'Blog', href: '/blog' },
          { label: form.title || 'Untitled Post' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/10"
              >
                Unsaved
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'gap-1.5 border-[var(--glass-border)]',
                isDirty
                  ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/10'
                  : 'text-[var(--text-tertiary)]'
              )}
              disabled={!isDirty || updatePost.isPending}
              onClick={handleSave}
            >
              {updatePost.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              className={cn(
                'gap-1.5',
                post.status === 'published'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white'
              )}
              onClick={handlePublishToggle}
              disabled={updatePost.isPending}
            >
              {post.status === 'published' ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  Unpublish
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  Publish
                </>
              )}
            </Button>
          </div>
        }
      />

      <ModuleLayout.Content className="p-6">
        {renderSection()}
      </ModuleLayout.Content>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)]">Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              You have unsaved edits to this post. Would you like to save before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={() => { setShowUnsavedDialog(false); pendingNavigationRef.current = null }}
              className="border-[var(--glass-border)] text-[var(--text-secondary)]"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              onClick={handleUnsavedDiscard}
            >
              Discard
            </Button>
            <Button
              style={{ backgroundColor: 'var(--brand-primary)' }}
              className="text-white"
              onClick={() => {
                setShowUnsavedDialog(false)
                const to = pendingNavigationRef.current
                pendingNavigationRef.current = null
                buildAndSave(() => { if (to) navigate(to) })
              }}
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save & Leave
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  )
}
