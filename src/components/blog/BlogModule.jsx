// src/components/blog/BlogModule.jsx
// Unified Blog Dashboard - uses ModuleLayout for consistent shell
// Dark theme compatible, brand colors only

import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { useSignalAccess } from '@/lib/signal-access'
import { blogApi, filesApi } from '@/lib/sonor-api'
import { skillsApi } from '@/lib/signal-api'
import SignalIcon from '@/components/ui/SignalIcon'
import { EchoGenerateButton } from '@/components/ai/EchoGenerateButton'
import { EchoTextActions } from '@/components/ai/EchoTextActions'
import { NaturalLanguageFilter } from '@/components/ai/NaturalLanguageFilter'
import { ModuleLayout } from '@/components/ModuleLayout'
import { EmptyState } from '@/components/EmptyState'
import { MODULE_ICONS } from '@/lib/module-icons'
import BlogBrain from '@/components/blog/BlogBrain'
import EchoBlogCreator from '@/components/blog/EchoBlogCreator'
const BlogPostDetail = lazy(() => import('@/components/blog/BlogPostDetail'))
import SEOEEATModule from '@/components/seo/SEOEEATModule'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import MarkdownEditor from '@/components/ui/MarkdownEditor'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  PenTool,
  Star,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  CheckCircle,
  Clock,
  Send,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  Wand2,
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Rss,
  Link2,
  Code,
  FileCode,
  Layers,
  Target,
  TrendingUp,
  Edit2,
  Eye,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Calendar,
  Image as ImageIcon,
  Globe,
  Tag,
  ArrowUpDown,
  X,
  Zap,
  Info,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { SignalSuggestsPanel } from '@/components/ai/SignalSuggestsPanel'

// ============================================================================
// SIDEBAR SECTIONS
// ============================================================================

const SIDEBAR_SECTIONS = {
  posts: {
    label: 'Posts',
    icon: FileText,
    views: [
      { id: 'all', label: 'All Posts', icon: FileText },
      { id: 'published', label: 'Published', icon: CheckCircle },
      { id: 'draft', label: 'Drafts', icon: Clock },
      { id: 'scheduled', label: 'Scheduled', icon: Calendar },
      { id: 'featured', label: 'Featured', icon: Star },
      { id: 'categories', label: 'Categories', icon: Tag },
    ],
  },
  signalBrain: {
    label: 'Signal Brain',
    icon: Sparkles,
    views: [
      { id: 'topic-ideas', label: 'Topic Ideas', icon: Lightbulb },
      { id: 'content-audit', label: 'Content Audit', icon: AlertTriangle },
      { id: 'optimize', label: 'Optimize', icon: Wand2 },
      { id: 'guidelines', label: 'Guidelines', icon: BookOpen },
      { id: 'eeat', label: 'E-E-A-T', icon: Shield },
    ],
  },
  seoTools: {
    label: 'SEO Tools',
    icon: Target,
    views: [
      { id: 'seo-validation', label: 'SEO Validation', icon: CheckCircle },
      { id: 'schema-markup', label: 'Schema Markup', icon: Code },
      { id: 'feeds', label: 'RSS / Atom Feeds', icon: Rss },
      { id: 'topic-clusters', label: 'Topic Clusters', icon: Layers },
    ],
  },
}

// Status colors
const statusColors = {
  published: 'border-[var(--brand-primary)]/30 text-[var(--brand-primary)] bg-[var(--brand-primary)]/10',
  draft: 'border-amber-500/30 text-amber-500 bg-amber-500/10',
  scheduled: 'border-blue-500/30 text-blue-500 bg-blue-500/10',
  archived: 'border-[var(--text-tertiary)]/30 text-[var(--text-tertiary)] bg-[var(--glass-bg)]'
}

// Category colors using brand
const getCategoryStyle = () => ({
  backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
  color: 'var(--brand-primary)',
})

// ============================================================================
// BLOG POST CARD
// ============================================================================

function BlogPostCard({ post, isSelected, onClick, onEdit, onDelete, onPublish, onToggleFeatured }) {
  const formatDate = (date) => {
    if (!date) return 'Not published'
    return format(new Date(date), 'MMM d, yyyy')
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 border-b border-[var(--glass-border)] cursor-pointer transition-colors',
        isSelected 
          ? 'bg-[var(--brand-primary)]/5 border-l-2 border-l-[var(--brand-primary)]'
          : 'hover:bg-[var(--glass-bg-hover)]'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-lg bg-[var(--glass-bg)] overflow-hidden flex-shrink-0">
          {post.featuredImage ? (
            <img 
              src={post.featuredImage} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[var(--text-primary)] line-clamp-1">
                {post.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                {post.excerpt}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                className={cn('text-xs', statusColors[post.status])}
              >
                {post.status}
              </Badge>
              {post.featured && (
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
            <Badge 
              variant="outline" 
              className="text-xs"
              style={getCategoryStyle()}
            >
              {post.category}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readingTime || 5} min
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(post.publishedAt || post.createdAt)}
            </span>
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {post.viewCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(post) }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/blog/${post.slug}`, '_blank') }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Live
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {post.status === 'draft' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublish?.(post.id) }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFeatured?.(post.id, !post.featured) }}>
              <Star className={cn('h-4 w-4 mr-2', post.featured && 'fill-amber-500 text-amber-500')} />
              {post.featured ? 'Unfeature' : 'Feature'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete?.(post.id) }}
              className="text-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ============================================================================
// SEO VALIDATION VIEW
// ============================================================================

function SeoValidationView({ posts }) {
  const [selectedPost, setSelectedPost] = useState(null)
  const [validation, setValidation] = useState(null)

  const validatePost = (post) => {
    const issues = []
    const warnings = []
    const passed = []

    // Title validation (60 chars)
    const title = post.metaTitle || post.title
    if (!title) {
      issues.push({ type: 'error', message: 'Missing SEO title' })
    } else if (title.length > 60) {
      warnings.push({ type: 'warning', message: `Title too long (${title.length}/60 chars)` })
    } else {
      passed.push({ type: 'success', message: `Title length OK (${title.length}/60)` })
    }

    // Meta description (150-160 chars)
    const desc = post.metaDescription || post.excerpt
    if (!desc) {
      issues.push({ type: 'error', message: 'Missing meta description' })
    } else if (desc.length < 150) {
      warnings.push({ type: 'warning', message: `Meta description too short (${desc.length}/150 min)` })
    } else if (desc.length > 160) {
      warnings.push({ type: 'warning', message: `Meta description too long (${desc.length}/160 max)` })
    } else {
      passed.push({ type: 'success', message: `Meta description length OK (${desc.length}/160)` })
    }

    // Content length (1200-2500 words recommended)
    const wordCount = post.content?.split(/\s+/).length || 0
    if (wordCount < 1200) {
      warnings.push({ type: 'warning', message: `Content may be thin (${wordCount} words, 1200+ recommended)` })
    } else if (wordCount > 2500) {
      warnings.push({ type: 'warning', message: `Consider breaking up content (${wordCount} words)` })
    } else {
      passed.push({ type: 'success', message: `Content depth OK (${wordCount} words)` })
    }

    // Featured image
    if (!post.featuredImage) {
      warnings.push({ type: 'warning', message: 'Missing featured image' })
    } else {
      passed.push({ type: 'success', message: 'Featured image present' })
    }

    // Alt text
    if (post.featuredImage && !post.featuredImageAlt) {
      warnings.push({ type: 'warning', message: 'Missing featured image alt text' })
    }

    // Keywords
    if (!post.keywords?.length) {
      warnings.push({ type: 'warning', message: 'No keywords defined' })
    } else {
      passed.push({ type: 'success', message: `${post.keywords.length} keywords defined` })
    }

    // FAQ items for schema
    if (post.faqItems?.length > 0) {
      passed.push({ type: 'success', message: `${post.faqItems.length} FAQ items for schema` })
    }

    return { issues, warnings, passed, score: Math.round((passed.length / (issues.length + warnings.length + passed.length)) * 100) }
  }

  useEffect(() => {
    if (selectedPost) {
      setValidation(validatePost(selectedPost))
    }
  }, [selectedPost])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">SEO Validation</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Validate blog posts against SEO best practices (60 char title, 150-160 char description)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Post List */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select a Post</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {posts.map((post) => {
                  const v = validatePost(post)
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg transition-colors',
                        selectedPost?.id === post.id
                          ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30'
                          : 'bg-[var(--glass-bg-inset)] hover:bg-[var(--glass-bg-hover)]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-[var(--text-primary)] line-clamp-1">
                          {post.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            v.issues.length > 0 
                              ? 'border-red-500/30 text-red-500' 
                              : v.warnings.length > 0
                              ? 'border-amber-500/30 text-amber-500'
                              : 'border-[var(--brand-primary)]/30 text-[var(--brand-primary)]'
                          )}
                        >
                          {v.score}%
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Validation Results */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Validation Results
              {validation && (
                <Badge
                  className="text-sm"
                  style={{
                    backgroundColor: validation.score >= 80 
                      ? 'var(--brand-primary)' 
                      : validation.score >= 60 
                      ? '#eab308' 
                      : '#ef4444',
                    color: 'white'
                  }}
                >
                  {validation.score}% SEO Score
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPost && validation ? (
              <div className="space-y-4">
                {/* Issues */}
                {validation.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-2">Issues ({validation.issues.length})</p>
                    {validation.issues.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-red-500 py-1">
                        <X className="h-4 w-4" />
                        {item.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {validation.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-500 mb-2">Warnings ({validation.warnings.length})</p>
                    {validation.warnings.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-amber-500 py-1">
                        <AlertTriangle className="h-4 w-4" />
                        {item.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Passed */}
                {validation.passed.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--brand-primary)] mb-2">Passed ({validation.passed.length})</p>
                    {validation.passed.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-[var(--brand-primary)] py-1">
                        <CheckCircle className="h-4 w-4" />
                        {item.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a post to validate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// SCHEMA MARKUP VIEW
// ============================================================================

function SchemaMarkupView({ posts }) {
  const [selectedPost, setSelectedPost] = useState(null)
  const [schemaType, setSchemaType] = useState('article')
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter posts by search query
  const filteredPosts = posts.filter(post => 
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const schemaTypes = [
    { 
      id: 'article', 
      label: 'Article', 
      icon: FileText,
      description: 'BlogPosting schema for SEO-optimized articles',
      color: '#3b82f6',
      requirements: null
    },
    { 
      id: 'faq', 
      label: 'FAQ', 
      icon: Lightbulb,
      description: 'FAQPage schema for question/answer content',
      color: '#f59e0b',
      requirements: 'Requires FAQ items added to post'
    },
    { 
      id: 'breadcrumb', 
      label: 'Breadcrumb', 
      icon: Link2,
      description: 'BreadcrumbList for navigation trails',
      color: '#10b981',
      requirements: null
    },
    { 
      id: 'howto', 
      label: 'HowTo', 
      icon: BookOpen,
      description: 'HowTo schema for step-by-step guides',
      color: '#8b5cf6',
      requirements: 'Best for tutorial-style content'
    },
  ]

  const generateSchema = (post, type) => {
    if (!post) return null

    const baseUrl = window.location.origin

    switch (type) {
      case 'article':
        return {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.metaDescription || post.excerpt,
          "image": post.featuredImage,
          "datePublished": post.publishedAt,
          "dateModified": post.updatedAt || post.publishedAt,
          "author": {
            "@type": "Person",
            "name": post.author
          },
          "publisher": {
            "@type": "Organization",
            "name": "Your Company"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${baseUrl}/blog/${post.slug}`
          }
        }

      case 'faq':
        if (!post.faqItems?.length) return null
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": post.faqItems.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        }

      case 'breadcrumb':
        return {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
            { "@type": "ListItem", "position": 3, "name": post.title, "item": `${baseUrl}/blog/${post.slug}` }
          ]
        }

      case 'howto':
        // Parse content for steps if available, otherwise show placeholder
        const steps = post.howtoSteps || [
          { name: "Step 1", text: "Add step content..." },
          { name: "Step 2", text: "Add step content..." }
        ]
        return {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": post.title,
          "description": post.excerpt || post.metaDescription,
          "image": post.featuredImage,
          "step": steps.map((step, i) => ({
            "@type": "HowToStep",
            "position": i + 1,
            "name": step.name || `Step ${i + 1}`,
            "text": step.text || step.description
          }))
        }

      default:
        return null
    }
  }

  const schema = generateSchema(selectedPost, schemaType)
  const currentSchemaType = schemaTypes.find(s => s.id === schemaType)

  const copySchema = () => {
    if (schema) {
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
      setCopied(true)
      toast.success('Schema copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyScriptTag = () => {
    if (schema) {
      const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
      navigator.clipboard.writeText(scriptTag)
      toast.success('Script tag copied to clipboard')
    }
  }

  // No posts state
  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Code className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Posts Yet</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Create your first blog post to generate schema markup
          </p>
          <Button 
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with description */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Schema Markup Generator</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Generate structured data to enhance your posts in search results
          </p>
        </div>
        {schema && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyScriptTag}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Copy Script Tag
            </Button>
            <Button 
              size="sm" 
              onClick={copySchema}
              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
            >
              {copied ? <CheckCircle className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Post Selection */}
        <div className="col-span-3">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] h-full">
            <CardHeader className="pb-2 space-y-2">
              <CardTitle className="text-sm">Select Post</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input 
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm bg-[var(--glass-bg-inset)]"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[380px]">
                <div className="space-y-1 px-1">
                  {filteredPosts.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-tertiary)]">
                      <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No posts found</p>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={cn(
                          'w-full text-left p-2.5 rounded-lg transition-all group',
                          selectedPost?.id === post.id
                            ? 'ring-1'
                            : 'hover:bg-[var(--glass-bg-hover)]'
                        )}
                        style={selectedPost?.id === post.id ? {
                          backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                          ringColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)'
                        } : {}}
                      >
                        <div className="flex items-start gap-2">
                          {selectedPost?.id === post.id ? (
                            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                          ) : (
                            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'font-medium text-sm line-clamp-2',
                              selectedPost?.id === post.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                            )}>
                              {post.title}
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                              {post.status === 'published' ? 'Published' : 'Draft'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Schema Type & Output */}
        <div className="col-span-9 space-y-4">
          {/* Schema Type Cards */}
          <div className="grid grid-cols-4 gap-3">
            {schemaTypes.map((type) => {
              const Icon = type.icon
              const isActive = schemaType === type.id
              return (
                <button
                  key={type.id}
                  onClick={() => setSchemaType(type.id)}
                  className={cn(
                    'p-3 rounded-xl text-left transition-all border',
                    isActive 
                      ? 'border-transparent' 
                      : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'
                  )}
                  style={isActive ? {
                    backgroundColor: `${type.color}15`,
                    borderColor: `${type.color}30`,
                  } : {}}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="p-1.5 rounded-lg"
                      style={{ 
                        backgroundColor: isActive ? `${type.color}20` : 'var(--glass-bg-inset)',
                      }}
                    >
                      <Icon 
                        className="h-4 w-4" 
                        style={{ color: isActive ? type.color : 'var(--text-tertiary)' }}
                      />
                    </div>
                    <span className={cn(
                      'font-medium text-sm',
                      isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    )}>
                      {type.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] line-clamp-1">
                    {type.description}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Schema Output */}
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: `${currentSchemaType?.color || '#6b7280'}20` }}
                >
                  {currentSchemaType && <currentSchemaType.icon className="h-4 w-4" style={{ color: currentSchemaType.color }} />}
                </div>
                <div>
                  <CardTitle className="text-sm">
                    {currentSchemaType?.label} Schema
                  </CardTitle>
                  {currentSchemaType?.requirements && (
                    <p className="text-xs text-[var(--text-tertiary)]">{currentSchemaType.requirements}</p>
                  )}
                </div>
              </div>
              {selectedPost && schema && (
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ backgroundColor: '#10b98115', color: '#10b981', borderColor: '#10b98130' }}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid Schema
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {selectedPost && schema ? (
                <div className="relative">
                  <pre className="text-xs bg-[var(--glass-bg-inset)] p-4 rounded-lg overflow-auto max-h-[300px] text-[var(--text-secondary)] font-mono">
                    <code>{JSON.stringify(schema, null, 2)}</code>
                  </pre>
                  {/* Quick tips */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Add to your page's &lt;head&gt; section
                    </span>
                    <span className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <a 
                        href="https://search.google.com/test/rich-results" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        Test with Google
                      </a>
                    </span>
                  </div>
                </div>
              ) : selectedPost && !schema ? (
                <div className="text-center py-10 px-6 bg-[var(--glass-bg-inset)] rounded-lg">
                  <div 
                    className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                    style={{ backgroundColor: '#f59e0b15' }}
                  >
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <h4 className="font-medium text-[var(--text-primary)] mb-1">
                    Additional Data Required
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                    {schemaType === 'faq' && 'This post needs FAQ items to generate FAQPage schema. Add question/answer pairs in the post editor.'}
                    {schemaType === 'howto' && 'Add step-by-step instructions to generate HowTo schema. Edit the post to include numbered steps.'}
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Edit Post
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 bg-[var(--glass-bg-inset)] rounded-lg">
                  <div 
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
                  >
                    <Code className="h-8 w-8" style={{ color: 'var(--brand-primary)', opacity: 0.6 }} />
                  </div>
                  <h4 className="font-medium text-[var(--text-primary)] mb-1">Select a Post</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Choose a blog post from the list to generate schema markup
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FEEDS VIEW
// ============================================================================

function FeedsView({ projectDomain }) {
  const [copied, setCopied] = useState(null)

  const feeds = [
    { 
      type: 'RSS 2.0', 
      path: '/rss.xml', 
      description: 'Standard RSS feed with full content (content:encoded)',
      icon: Rss 
    },
    { 
      type: 'Atom', 
      path: '/feed.xml', 
      description: 'Atom feed format for alternative readers',
      icon: Rss 
    },
  ]

  const copyUrl = (path, type) => {
    const url = `https://${projectDomain}${path}`
    navigator.clipboard.writeText(url)
    setCopied(type)
    toast.success('Feed URL copied')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">RSS & Atom Feeds</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Feed endpoints for syndication and search engine discovery
        </p>
      </div>

      <div className="grid gap-4">
        {feeds.map((feed) => (
          <Card key={feed.type} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                  >
                    <feed.icon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">{feed.type}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{feed.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[var(--glass-bg-inset)] px-3 py-1.5 rounded text-[var(--text-secondary)]">
                    {feed.path}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyUrl(feed.path, feed.type)}
                  >
                    {copied === feed.type ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${projectDomain}${feed.path}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feed Best Practices */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
            RSS Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
              Full content included via content:encoded (not just excerpts)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
              lastBuildDate updates on every publish
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
              Categories included for filtering
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[var(--brand-primary)]" />
              Feed autodiscovery link in page metadata
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// TOPIC CLUSTERS VIEW
// ============================================================================

function TopicClustersView({ posts }) {
  const clusters = useMemo(() => {
    const categoryMap = {}
    posts.forEach(post => {
      const cat = post.category || 'uncategorized'
      if (!categoryMap[cat]) {
        categoryMap[cat] = { pillar: null, supporting: [] }
      }
      // Featured posts become pillars
      if (post.featured) {
        categoryMap[cat].pillar = post
      } else {
        categoryMap[cat].supporting.push(post)
      }
    })
    return categoryMap
  }, [posts])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Topic Clusters</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Organize content with pillar pages and supporting posts for better internal linking
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(clusters).map(([category, { pillar, supporting }]) => (
          <Card key={category} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </CardTitle>
                <Badge variant="outline">
                  {1 + supporting.length} posts
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Pillar Post */}
                {pillar ? (
                  <div className="p-3 rounded-lg border-2 border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                      <span className="text-xs font-medium text-[var(--brand-primary)]">Pillar Content</span>
                    </div>
                    <h4 className="font-medium text-[var(--text-primary)]">{pillar.title}</h4>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mt-1">{pillar.excerpt}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border-2 border-dashed border-[var(--glass-border)] text-center">
                    <p className="text-sm text-[var(--text-tertiary)]">No pillar content</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Feature a post to make it the pillar</p>
                  </div>
                )}

                {/* Supporting Posts */}
                {supporting.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-tertiary)]">Supporting Content ({supporting.length})</p>
                    {supporting.slice(0, 5).map(post => (
                      <div key={post.id} className="flex items-center gap-2 p-2 rounded bg-[var(--glass-bg-inset)]">
                        <Link2 className="h-3 w-3 text-[var(--text-tertiary)]" />
                        <span className="text-sm text-[var(--text-secondary)] line-clamp-1">{post.title}</span>
                      </div>
                    ))}
                    {supporting.length > 5 && (
                      <p className="text-xs text-[var(--text-tertiary)] text-center">
                        +{supporting.length - 5} more posts
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// CATEGORY MANAGER VIEW
// ============================================================================

function CategoryManagerView({ projectId, blogCategories = [], onCategoriesChange }) {
  const [categories, setCategories] = useState(blogCategories)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setCategories(blogCategories) }, [blogCategories])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      await blogApi.createCategory(projectId, { name: newName.trim(), slug })
      setNewName('')
      onCategoriesChange?.()
      toast.success('Category created')
    } catch (err) {
      toast.error(err?.message || 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (categoryId) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await blogApi.updateCategory(projectId, categoryId, { name: editName.trim() })
      setEditingId(null)
      setEditName('')
      onCategoriesChange?.()
      toast.success('Category updated')
    } catch (err) {
      toast.error(err?.message || 'Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (categoryId, name) => {
    if (!confirm(`Delete category "${name}"? Posts using this category will not be deleted.`)) return
    try {
      await blogApi.deleteCategory(projectId, categoryId)
      onCategoriesChange?.()
      toast.success('Category deleted')
    } catch (err) {
      toast.error(err?.message || 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)]">Categories</CardTitle>
          <CardDescription className="text-[var(--text-secondary)]">
            Manage blog categories for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              size="sm"
              style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Category list */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
                No categories yet. Add one above.
              </p>
            ) : (
              categories.map(cat => (
                <div
                  key={cat.id || cat.slug}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]/50 group"
                >
                  <Tag className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  {editingId === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                        className="flex-1 h-8 text-sm"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleUpdate(cat.id)} className="h-8">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-[var(--text-primary)]">{cat.name}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">{cat.slug}</span>
                      {cat.post_count != null && (
                        <Badge variant="secondary" className="text-xs">{cat.post_count} posts</Badge>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(cat.id, cat.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// STATS OVERVIEW
// ============================================================================

function StatsOverview({ posts }) {
  const stats = useMemo(() => ({
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
    featured: posts.filter(p => p.featured).length,
    thisMonth: posts.filter(p => {
      const date = new Date(p.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
  }), [posts])

  return (
    <div className="grid grid-cols-5 gap-4">
      {[
        { label: 'Total Posts', value: stats.total, icon: FileText },
        { label: 'Published', value: stats.published, icon: CheckCircle },
        { label: 'Drafts', value: stats.draft, icon: Clock },
        { label: 'Featured', value: stats.featured, icon: Star },
        { label: 'This Month', value: stats.thisMonth, icon: Calendar },
      ].map((stat) => (
        <Card key={stat.label} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
              >
                <stat.icon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ============================================================================
// EDIT POST DIALOG
// ============================================================================

function EditPostDialog({ open, onOpenChange, post, onSave, onRegenerateImage, blogCategories = [] }) {
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('draft')
  const [scheduledFor, setScheduledFor] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const excerptRef = useRef(null)
  const contentRef = useRef(null)

  // Use project-specific categories from props, with fallback
  const categoryOptions = blogCategories.length > 0 
    ? blogCategories.map(cat => ({ value: cat.slug, label: cat.name }))
    : [
        { value: 'guides', label: 'Guides' },
        { value: 'news', label: 'News' },
        { value: 'tips', label: 'Tips' },
      ]

  // Helper to extract text from potentially JSON-formatted content
  const extractTextContent = (value) => {
    if (!value) return ''
    if (typeof value !== 'string') {
      // If it's already an object/array, try to extract content
      if (Array.isArray(value)) {
        return value.map(s => s.content || s).join('\n\n')
      }
      if (value.content) return value.content
      return JSON.stringify(value, null, 2)
    }
    // Check if it's a JSON string
    const trimmed = value.trim()
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map(s => s.content || s).join('\n\n')
        }
        if (parsed.content) return parsed.content
        return value // Return original if structure not recognized
      } catch {
        return value // Not valid JSON, return as-is
      }
    }
    return value
  }

  // Reset form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title || '')
      setExcerpt(extractTextContent(post.excerpt) || '')
      // Use the first available category as fallback if post has no category
      const defaultCategory = categoryOptions[0]?.value || ''
      setCategory(post.category || defaultCategory)
      setStatus(post.status || 'draft')
      setScheduledFor(post.scheduledFor || post.scheduled_for || '')
      setContent(extractTextContent(post.content) || '')
      setFeaturedImage(post.featuredImage || '')
    }
  }, [post, categoryOptions])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        title,
        excerpt,
        category,
        status,
        content,
        featuredImage: featuredImage || undefined,
        ...(status === 'published' && !post?.publishedAt && { publishedAt: new Date().toISOString() }),
        ...(status === 'scheduled' && scheduledFor && { scheduledFor }),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerateImage = async () => {
    if (!onRegenerateImage) return
    setIsGeneratingImage(true)
    try {
      // Pass the edited post data with current title/content
      const imageUrl = await onRegenerateImage({
        ...post,
        title,
        content,
        excerpt
      })
      if (imageUrl) {
        setFeaturedImage(imageUrl)
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Blog Post</DialogTitle>
          <DialogDescription>
            Update your blog post details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Featured Image */}
          <div className="space-y-2">
            <Label>Featured Image</Label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-20 rounded-lg bg-[var(--glass-bg)] overflow-hidden flex-shrink-0 border border-[var(--glass-border)]">
                {featuredImage ? (
                  <img 
                    src={featuredImage} 
                    alt="Featured"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="Image URL"
                  className="text-sm"
                />
                {onRegenerateImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateImage}
                    disabled={isGeneratingImage}
                    className="gap-2"
                  >
                    {isGeneratingImage ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SignalIcon className="h-4 w-4" />
                        Generate with Signal
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="flex-1"
              />
              <EchoGenerateButton
                entityType="blog_post"
                entityId={post?.id}
                field="title"
                currentValue={title}
                onGenerate={(text) => setTitle(text)}
                size="sm"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="edit-excerpt">Excerpt / Meta Description</Label>
            <div className="flex items-start gap-2">
              <div ref={excerptRef} className="relative flex-1">
                <Textarea
                  id="edit-excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief description for SEO and previews"
                  rows={3}
                  className="w-full"
                />
                <EchoTextActions
                  containerRef={excerptRef}
                  onReplace={(newText, { start, end }) =>
                    setExcerpt((prev) => prev.slice(0, start) + newText + prev.slice(end))
                  }
                  entityType="blog_post"
                  entityId={post?.id}
                />
              </div>
              <EchoGenerateButton
                entityType="blog_post"
                entityId={post?.id}
                field="excerpt"
                currentValue={excerpt}
                onGenerate={(text) => setExcerpt(text)}
                size="sm"
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {excerpt?.length || 0}/160 characters (recommended)
            </p>
          </div>

          {/* Category & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2" data-tour="blog-categories">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
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
          </div>

          {/* Scheduled Date/Time Picker */}
          {status === 'scheduled' && (
            <div className="space-y-2">
              <Label htmlFor="scheduled-for">Publish Date & Time</Label>
              <Input
                id="scheduled-for"
                type="datetime-local"
                value={scheduledFor ? new Date(scheduledFor).toISOString().slice(0, 16) : ''}
                onChange={(e) => setScheduledFor(e.target.value ? new Date(e.target.value).toISOString() : '')}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full"
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                Post will auto-publish at this time
              </p>
            </div>
          )}

          {/* Content — Rich Markdown Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <div className="min-h-[300px] border border-[var(--glass-border)] rounded-lg overflow-hidden">
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="Start writing your blog post..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !title}
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

function BlogDashboard() {
  const { currentProject, currentOrg } = useAuthStore()
  const brandColors = useBrandColors()
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const navigate = useNavigate()

  const projectId = currentProject?.id
  const projectDomain = currentProject?.domain || currentOrg?.domain || 'example.com'

  // Posts data
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const [blogCategories, setBlogCategories] = useState([])

  // UI State
  const [currentView, setCurrentView] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [nlFilters, setNlFilters] = useState({})

  // Dialogs
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [prefillData, setPrefillData] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(null)

  // Sidebar sections open state
  const [postsOpen, setPostsOpen] = useState(true)
  const [signalBrainOpen, setSignalBrainOpen] = useState(false)
  const [seoToolsOpen, setSeoToolsOpen] = useState(false)

  // Load posts and categories
  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [projectId])

  const fetchCategories = async () => {
    if (!projectId) return
    try {
      const response = await blogApi.getCategories(projectId)
      setBlogCategories(response.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchPosts = async () => {
    setPostsLoading(true)
    try {
      const params = { limit: 100 }
      if (projectId) params.projectId = projectId
      else if (currentOrg?.id) params.orgId = currentOrg.id
      
      const res = await blogApi.listPosts(params)
      const postsData = res.data?.posts || res.data || []
      setPosts(postsData)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      toast.error('Failed to load blog posts')
    } finally {
      setPostsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPosts()
    setIsRefreshing(false)
  }

  const handlePublish = async (id) => {
    try {
      await blogApi.updatePost(id, { status: 'published', publishedAt: new Date().toISOString() })
      toast.success('Post published!')
      fetchPosts()
    } catch (error) {
      toast.error('Failed to publish post')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return
    try {
      await blogApi.deletePost(id)
      toast.success('Post deleted')
      fetchPosts()
    } catch (error) {
      toast.error('Failed to delete post')
    }
  }

  const handleToggleFeatured = async (id, featured) => {
    try {
      await blogApi.updatePost(id, { featured })
      toast.success(featured ? 'Post featured!' : 'Post unfeatured')
      setPosts(prev => prev.map(p => p.id === id ? { ...p, featured } : p))
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const handleEdit = (post) => {
    setEditingPost(post)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (updates) => {
    if (!editingPost) return
    try {
      await blogApi.updatePost(editingPost.id, updates)
      toast.success('Post updated!')
      setEditDialogOpen(false)
      // Note: fetchPosts() and setEditingPost(null) happen in onOpenChange
    } catch (error) {
      console.error('Failed to update post:', error)
      toast.error('Failed to update post')
    }
  }

  const handleRegenerateImage = async (post) => {
    try {
      const result = await skillsApi.invoke('content', 'generate_blog_image', {
        params: {
          title: post.title,
          topic: post.title, // Use title as topic
          category: post.category,
          content: post.content,
          excerpt: post.excerpt,
          style: 'photorealistic',
          aspectRatio: '16:9'
        },
        context: {
          project_id: projectId,
          org_id: currentOrg?.id
        }
      })

      // Signal wraps tool results: { result: { success, imageUrl, ... }, durationMs, skill, tool }
      const imageResult = result?.result || result
      if (imageResult?.success && imageResult?.imageUrl) {
        // Update post with new image and alt text
        const updateData = { 
          featuredImage: imageResult.imageUrl,
          ...(imageResult.altText && { featuredImageAlt: imageResult.altText })
        }
        await blogApi.updatePost(post.id, updateData)
        
        // Register file in Files module so it appears in the file browser
        // Extract storage path from URL: https://...supabase.co/storage/v1/object/public/files/{projectId}/Blog/Featured/{filename}
        try {
          const urlParts = new URL(imageResult.imageUrl)
          const pathMatch = urlParts.pathname.match(/\/files\/(.+)$/)
          if (pathMatch) {
            const storagePath = pathMatch[1]
            const filename = imageResult.filename || storagePath.split('/').pop()
            await filesApi.registerFile({
              fileId: crypto.randomUUID(),
              filename,
              mimeType: imageResult.mimeType || 'image/png',
              fileSize: 0, // Size unknown from URL
              storagePath,
              publicUrl: imageResult.imageUrl,
              projectId,
              folderPath: 'Blog/Featured',
              category: 'content',
              isPublic: true
            })
          }
        } catch (regError) {
          console.warn('Failed to register file in Files module:', regError)
          // Non-fatal - image still saved to storage and blog post
        }
        
        // Update editingPost so the dialog shows the new image immediately
        if (editingPost && editingPost.id === post.id) {
          setEditingPost(prev => ({
            ...prev,
            featuredImage: imageResult.imageUrl,
            featuredImageAlt: imageResult.altText || prev?.featuredImageAlt
          }))
        }
        
        toast.success('New image generated!')
        // Don't fetchPosts() here - it will happen when dialog closes
        return imageResult.imageUrl
      } else {
        throw new Error(imageResult?.error || 'Image generation failed')
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error)
      toast.error('Failed to generate image')
      throw error
    }
  }

  const handleCreateFromTopic = (topicData) => {
    setPrefillData(topicData)
    setAiDialogOpen(true)
  }

  // Filter posts based on view
  const filteredPosts = useMemo(() => {
    let result = [...posts]

    // Filter by view
    switch (currentView) {
      case 'published':
        result = result.filter(p => p.status === 'published')
        break
      case 'draft':
        result = result.filter(p => p.status === 'draft')
        break
      case 'scheduled':
        result = result.filter(p => p.status === 'scheduled')
        break
      case 'featured':
        result = result.filter(p => p.featured)
        break
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.excerpt?.toLowerCase().includes(query)
      )
    }

    // Natural-language resolved filters
    if (nlFilters?.search) {
      const q = nlFilters.search.toLowerCase()
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q)
      )
    }
    if (nlFilters?.status && nlFilters.status !== 'all') {
      result = result.filter(p => p.status === nlFilters.status)
    }
    if (nlFilters?.featured != null) {
      result = result.filter(p => Boolean(p.featured) === Boolean(nlFilters.featured))
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      default: // newest
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return result
  }, [posts, currentView, searchQuery, sortBy, nlFilters])

  // Stats for sidebar badges
  const postCounts = useMemo(() => ({
    all: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    featured: posts.filter(p => p.featured).length,
  }), [posts])

  // Render content based on view
  const renderContent = () => {
    // E-E-A-T view (Signal Brain section)
    if (currentView === 'eeat') {
      return <SEOEEATModule projectId={projectId} />
    }

    // Signal Brain views
    if (['topic-ideas', 'content-audit', 'optimize', 'guidelines'].includes(currentView)) {
      const tabMap = {
        'topic-ideas': 'topics',
        'content-audit': 'audit',
        'optimize': 'optimize',
        'guidelines': 'guidelines'
      }
      return (
        <BlogBrain 
          projectId={projectId}
          onCreateFromTopic={handleCreateFromTopic}
          activeTab={tabMap[currentView]}
          embedded={true}
          onTabChange={(tab) => {
            const viewMap = { topics: 'topic-ideas', audit: 'content-audit', optimize: 'optimize', guidelines: 'guidelines' }
            setCurrentView(viewMap[tab] || 'topic-ideas')
          }}
        />
      )
    }

    // SEO Tools views
    switch (currentView) {
      case 'seo-validation':
        return <SeoValidationView posts={posts} />
      case 'schema-markup':
        return <SchemaMarkupView posts={posts} />
      case 'feeds':
        return <FeedsView projectDomain={projectDomain} />
      case 'topic-clusters':
        return <TopicClustersView posts={posts} />
    }

    // Categories management view
    if (currentView === 'categories') {
      return <CategoryManagerView projectId={projectId} blogCategories={blogCategories} onCategoriesChange={fetchCategories} />
    }

    // Posts list views (all, published, draft, scheduled, featured)
    return (
      <div className="space-y-6">
        <StatsOverview posts={posts} />

        {/* Posts List */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] py-0 gap-0">
          {postsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
              {filteredPosts.map(post => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  isSelected={selectedPost?.id === post.id}
                  onClick={() => navigate(`posts/${post.id}`)}
                  onEdit={(post) => navigate(`posts/${post.id}`)}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                  onToggleFeatured={handleToggleFeatured}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No posts found"
              description={
                posts.length === 0
                  ? 'Create your first blog post to get started'
                  : 'Try adjusting your search or filter'
              }
              actionLabel={posts.length === 0 ? (hasSignalAccess ? 'Create with Signal' : 'New Post') : undefined}
              onAction={posts.length === 0 ? () => setAiDialogOpen(true) : undefined}
              echoPrompt="How do I create my first blog post?"
              echoActions={[
                { label: 'Draft a post', prompt: 'Help me write my first blog post' },
                { label: 'Content strategy', prompt: 'What should I blog about for my business?' },
                { label: 'SEO tips', prompt: 'How do I optimize my blog posts for SEO?' },
              ]}
            />
          )}
        </Card>
      </div>
    )
  }

  const headerActions = (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <Input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-64 h-8 bg-[var(--glass-bg)] border-[var(--glass-border)]"
        />
      </div>
      <NaturalLanguageFilter
        module="blog"
        onFiltersResolved={(filters) => setNlFilters(filters)}
        placeholder="e.g. published posts from this month"
      />
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-32 h-8">
          <ArrowUpDown className="h-3 w-3 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="title">Title</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8">
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>
      {hasSignalAccess && (
        <EchoBlogCreator
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          prefillTopic={prefillData?.topic || null}
          onSuccess={() => {
            setPrefillData(null)
            fetchPosts()
            setCurrentView('all')
          }}
        />
      )}
      <EditPostDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            // Refresh posts when dialog closes to pick up any regenerated images
            fetchPosts()
            setEditingPost(null)
          }
        }}
        post={editingPost}
        onSave={handleSaveEdit}
        onRegenerateImage={hasSignalAccess ? handleRegenerateImage : undefined}
        blogCategories={blogCategories}
      />
      <Button
        size="sm"
        className="h-8 gap-1.5"
        style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
        onClick={() => {
          if (hasSignalAccess) {
            setAiDialogOpen(true)
          } else {
            toast.info('Manual editor coming soon. Use AI Create with Signal.')
          }
        }}
      >
        {hasSignalAccess ? (
          <>
            <SignalIcon className="h-4 w-4" />
            Create with Signal
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            New Post
          </>
        )}
      </Button>
    </>
  )

  const leftSidebar = (
    <ScrollArea className="h-full py-4">
      <nav className="space-y-1 px-2">
        <Collapsible open={postsOpen} onOpenChange={setPostsOpen} data-tour="blog-posts">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] rounded-lg">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Posts
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-tertiary)]">{postCounts.all}</span>
              {postsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {SIDEBAR_SECTIONS.posts.views.map((view) => (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={cn(
                  'flex items-center justify-between w-full px-6 py-2 transition-colors rounded-lg',
                  currentView === view.id
                    ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                )}
              >
                <span className="flex items-center gap-2">
                  <view.icon className="h-4 w-4" />
                  {view.label}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">{postCounts[view.id] || 0}</span>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
        {hasSignalAccess && (
          <Collapsible open={signalBrainOpen} onOpenChange={setSignalBrainOpen} data-tour="blog-editor">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] rounded-lg">
              <span className="flex items-center gap-2">
                <SignalIcon className="h-4 w-4" />
                Signal Brain
              </span>
              {signalBrainOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              {SIDEBAR_SECTIONS.signalBrain.views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-6 py-2 transition-colors rounded-lg',
                    currentView === view.id
                      ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                  )}
                >
                  <view.icon className="h-4 w-4" />
                  {view.label}
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        <Collapsible open={seoToolsOpen} onOpenChange={setSeoToolsOpen} data-tour="blog-seo">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] rounded-lg">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              SEO Tools
            </span>
            {seoToolsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {SIDEBAR_SECTIONS.seoTools.views.map((view) => (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-6 py-2 transition-colors rounded-lg',
                  currentView === view.id
                    ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                )}
              >
                <view.icon className="h-4 w-4" />
                {view.label}
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>
    </ScrollArea>
  )

  return (
    <TooltipProvider>
      <ModuleLayout
        data-sonor-help="blog/dashboard"
        leftSidebar={leftSidebar}
        leftSidebarTitle="Blog"
        defaultLeftSidebarOpen
        ariaLabel="Blog module"
      >
        <ModuleLayout.Header
          data-tour="blog-overview"
          title="Blog"
          icon={MODULE_ICONS.blog}
          subtitle={hasSignalAccess ? 'Content & SEO with Signal' : 'Content & SEO'}
          actions={headerActions}
        />
        <ModuleLayout.Content noPadding={false}>
          <SignalSuggestsPanel module="blog" className="mb-4" />
          <div className="px-4 py-3 border-b border-[var(--glass-border)] bg-muted/5 mb-6 -mx-4 -mt-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">{postCounts.all}</strong> total posts
              </span>
              <span className="text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">{postCounts.published}</strong> published
              </span>
              {postCounts.draft > 0 && (
                <Badge
                  className="text-xs"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)', color: 'var(--brand-primary)' }}
                >
                  {postCounts.draft} drafts
                </Badge>
              )}
            </div>
          </div>
          {renderContent()}
        </ModuleLayout.Content>
      </ModuleLayout>
    </TooltipProvider>
  )
}

// ============================================================================
// ROUTES WRAPPER — dispatches between list and detail views
// ============================================================================

import { SonorSpinner } from '@/components/SonorLoading'

export default function BlogModule() {
  return (
    <Routes>
      <Route index element={<BlogDashboard />} />
      <Route
        path="posts/:postId"
        element={
          <Suspense fallback={<div className="flex items-center justify-center h-64"><SonorSpinner /></div>}>
            <BlogPostDetail />
          </Suspense>
        }
      />
    </Routes>
  )
}
