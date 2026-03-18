// src/components/seo/SEOPageDetail.tsx
// Detailed view for a single page
// MIGRATED TO REACT QUERY - Jan 29, 2026
// CONVERTED TO TYPESCRIPT - Feb 12, 2026
import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Target,
  Zap,
  Copy,
  Edit,
  Save,
  Search,
  Code,
  Send,
  Sparkles,
  Eye,
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Rocket,
  Smartphone,
  Monitor,
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { useSeoPage, useSeoProject, useUpdateSeoPage, useInspectUrl, useGenerateSchema, usePageImages, useUpdatePageImage } from '@/hooks/seo'
import { useOptimizePage, useAnalyzeContent } from '@/hooks/seo/useSeoSignal'
import { useSiteImages, useUpdateSiteImage } from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import { seoApi } from '@/lib/portal-api'
import { useSEOAIGeneration } from '@/lib/use-seo-ai-generation'
import { toast } from 'sonner'
import { AIPreviewModal, AIGenerateButton, ImpactPredictor, SEOPipelineModal } from './signal'
import SEOSerpPreview from './SEOSerpPreview'
import SignalIcon from '@/components/ui/SignalIcon'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Type Definitions ────────────────────────────────────────────────

interface SEOPageDetailProps {
  projectId: string
}

interface HeadingItem {
  level: number
  text: string
}

interface FaqItem {
  question: string
  answer: string
}

interface ContentTopic {
  name: string
  relevance_score: number
}

interface ContentKeyword {
  keyword: string
  prominence: string
  frequency: number
}

interface ContentEntity {
  name: string
  type: string
  mentions_count: number
}

interface SeoOpportunity {
  opportunity: string
  impact: string
  effort: string
  description: string
}

interface SchemaValidationError {
  message?: string
}

interface ContentAnalysisResult {
  topics?: ContentTopic[]
  keywords?: ContentKeyword[]
  entities?: ContentEntity[]
  recommendations?: string[]
  seo_opportunities?: SeoOpportunity[]
}

interface SeoPage {
  id: string
  url: string
  path: string
  title: string | null
  managed_title: string | null
  meta_description: string | null
  managed_meta_description: string | null
  h1: string | null
  h1_count: number | null
  title_length: number | null
  meta_description_length: number | null
  seo_health_score: number | null
  index_status: string | null
  clicks_28d: number | null
  impressions_28d: number | null
  avg_position_28d: number | null
  ctr_28d: number | null
  clicks_prev_28d: number | null
  impressions_prev_28d: number | null
  avg_position_prev_28d: number | null
  word_count: number | null
  internal_links_out: number | null
  internal_links_in: number | null
  external_links: number | null
  images_count: number | null
  images_without_alt: number | null
  has_schema: boolean | null
  canonical_url: string | null
  performance_score: number | null
  seo_score: number | null
  accessibility_score: number | null
  best_practices_score: number | null
  pagespeed_last_checked_at: string | null
  content_text: string | null
  content_hash: string | null
  content_analyzed_at: string | null
  content_analysis_result: unknown
  content_depth_score: number | null
  reading_time_minutes: number | null
  heading_structure: HeadingItem[] | null
  faq_detected: FaqItem[] | null
  content_topics: ContentTopic[] | null
  content_keywords: ContentKeyword[] | null
  content_entities: ContentEntity[] | null
  content_recommendations: string[] | null
  managed_schema: Record<string, unknown> | null
  managed_llm_schema: Record<string, unknown> | null
  schema_types: Record<string, unknown> | string[] | null
  schema_validation_errors: (SchemaValidationError | string)[] | null
  schema_validated_at: string | null
  llm_schema_generated_at: string | null
  target_keyword: string | null
}

interface SeoProject {
  id: string
  domain: string
  [key: string]: unknown
}

interface PageImage {
  id: string
  src?: string
  url?: string
  resolved_url?: string
  slot_id?: string
  current_alt?: string | null
  alt_text?: string | null
  has_alt?: boolean
  managed_alt?: string | null
  position_in_page?: string | null
  surrounding_text?: string | null
  page_path?: string
  file?: { name?: string; filename?: string }
}

interface AltSuggestion {
  id: string
  text: string
}

interface BatchAltResult {
  suggestions?: AltSuggestion[]
  error?: string
}

interface ActionMessage {
  type: 'success' | 'error'
  text: string
}

interface OptimizeOptions {
  optimize_alt: boolean
  optimize_meta: boolean
  optimize_schema: boolean
  optimize_llm: boolean
}

interface OptimizeMetaResult {
  title: string
  description: string
}

interface OptimizeAltTextResult {
  optimized_alt: string
}

interface OptimizeSchemaResult {
  type: string
}

interface OptimizeResults {
  applied?: boolean
  results?: {
    meta?: OptimizeMetaResult
    alt_text?: OptimizeAltTextResult[]
    schema?: OptimizeSchemaResult
  }
}

interface LengthStatus {
  color: string
  message: string
}

interface SEOPageDetailInnerProps {
  page: SeoPage
  site: SeoProject | undefined
  projectId: string
}

// ─── Main Component ──────────────────────────────────────────────────

// Main component - fetches page from route params
export default function SEOPageDetail({ projectId }: SEOPageDetailProps) {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const { currentProject: authProject } = useAuthStore()
  const orgId = authProject?.org_id
  
  // React Query hooks - auto-fetch when IDs are available
  const { data: currentProject } = useSeoProject(orgId, projectId)
  const { data: page, isLoading } = useSeoPage(projectId, pageId)

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <UptradeSpinner size="md" label="Loading page details..." className="[&_svg]:text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  // Handle null page
  if (!page) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Page not found</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/seo/pages')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pages
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Render the inner component only when page exists
  return <SEOPageDetailInner page={page} site={currentProject} projectId={projectId} />
}

// Inner component - safe to use hooks since page is guaranteed to exist
function SEOPageDetailInner({ page, site, projectId }: SEOPageDetailInnerProps) {
  const queryClient = useQueryClient()
  // Use React Query mutations instead of Zustand store
  const inspectUrlMutation = useInspectUrl()
  const updatePageMutation = useUpdateSeoPage()
  const generateSchemaMutation = useGenerateSchema()
  
  const { 
    isGenerating: isAIGenerating, 
    suggestions: aiSuggestions, 
    generateTitles, 
    generateMetaDescriptions,
    generateMore,
    clearSuggestions,
    hasAccess: hasSignalAccess,
    fetchAltTextSuggestions
  } = useSEOAIGeneration()
  const pagePath = page.path ?? (() => { try { return page.url ? new URL(page.url).pathname : '' } catch { return '' } })()
  
  // Site-managed images (explicit slots) - only fetch if we have a valid page path
  // Skip fetching if pagePath is empty to avoid returning ALL images
  const { data: managedImagesRaw = [] } = useSiteImages(projectId, { 
    page_path: pagePath,
    enabled: !!pagePath // Don't fetch if no valid path
  })
  // Filter to only show images that explicitly match this page path
  const managedImages: PageImage[] = pagePath ? managedImagesRaw.filter((img: PageImage) => img.page_path === pagePath) : []
  const updateManagedImageMutation = useUpdateSiteImage()
  
  // Discovered page images (from site-kit analytics)
  const { data: discoveredImagesData, isLoading: discoveredImagesLoading } = usePageImages(projectId, page.id)
  const discoveredImages: PageImage[] = discoveredImagesData?.images || []
  const updatePageImageMutation = useUpdatePageImage()
  
  // Unified page optimization with Signal
  const optimizePageMutation = useOptimizePage()
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false)
  const [optimizeOptions, setOptimizeOptions] = useState<OptimizeOptions>({
    optimize_alt: true,
    optimize_meta: true,
    optimize_schema: true,
    optimize_llm: true
  })
  const [optimizeResults, setOptimizeResults] = useState<OptimizeResults | null>(null)
  
  // Deep Pipeline optimization (Ashbound-style 8-phase)
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false)
  
  // Content analysis with Signal
  const analyzeContentMutation = useAnalyzeContent()
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysisResult | null>(null)
  
  // Check if page has content available
  const hasContent = page.content_text || page.content_hash
  const hasExistingAnalysis = page.content_analyzed_at && page.content_analysis_result
  
  const handleAnalyzeContent = async () => {
    try {
      const result = await analyzeContentMutation.mutateAsync({
        projectId,
        pageIdOrPath: page.id,
        options: {
          extract_topics: true,
          extract_entities: true,
          extract_keywords: true,
          analyze_depth: true,
          analyze_readability: true,
        }
      })
      setContentAnalysis(result)
      toast.success('Content analysis complete!')
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to analyze content')
    }
  }
  
  const [batchAltResults, setBatchAltResults] = useState<Record<string, BatchAltResult>>({})
  const [batchAltLoading, setBatchAltLoading] = useState(false)
  
  const [crawling, setCrawling] = useState(false)
  const [requestingIndexing, setRequestingIndexing] = useState(false)
  const [generatingSchema, setGeneratingSchema] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  
  // AI Preview Modal state
  const [aiModalOpen, setAIModalOpen] = useState(false)
  const [aiModalType, setAIModalType] = useState<'title' | 'meta_description'>('title')
  const [newTitle, setNewTitle] = useState(page.managed_title || page.title || '')
  const [newMeta, setNewMeta] = useState(page.managed_meta_description || page.meta_description || '')

  // Handle unified page optimization
  const handleOptimizePage = async (apply: boolean = false) => {
    try {
      const result = await optimizePageMutation.mutateAsync({
        projectId,
        pageIdOrPath: page.id,
        options: optimizeOptions,
        apply
      })
      
      setOptimizeResults(result)
      
      if (apply) {
        toast.success('Page optimized successfully!')
        setOptimizeDialogOpen(false)
        queryClient.invalidateQueries({ queryKey: ['seo', 'page', projectId, page.id] })
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || 'Failed to optimize page')
    }
  }

  // Save managed metadata
  const handleSaveMetadata = async () => {
    setSaving(true)
    setActionMessage(null)
    try {
      await updatePageMutation.mutateAsync({
        projectId,
        pageId: page.id,
        updates: {
          managed_title: newTitle,
          managed_meta_description: newMeta,
        }
      })
      setActionMessage({ type: 'success', text: 'Metadata saved successfully' })
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err as Error).message || 'Failed to save metadata' })
    } finally {
      setSaving(false)
    }
  }

  const handleCrawl = async () => {
    setCrawling(true)
    setActionMessage(null)
    try {
      // Use URL inspection to refresh page data from Google
      await inspectUrlMutation.mutateAsync({ projectId, url: page.url })
      queryClient.invalidateQueries({ queryKey: ['seo', 'page', projectId, page.id] })
      setActionMessage({ type: 'success', text: 'Page inspected successfully' })
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err as Error).message || 'Failed to inspect page' })
    } finally {
      setCrawling(false)
    }
  }

  const handleRequestIndexing = async () => {
    setRequestingIndexing(true)
    setActionMessage(null)
    try {
      await seoApi.submitUrlForIndexing(projectId, page.url)
      setActionMessage({ type: 'success', text: 'Indexing requested - Google will process within 48 hours' })
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err as Error).message || 'Failed to request indexing' })
    } finally {
      setRequestingIndexing(false)
    }
  }

  const handleGenerateSchema = async () => {
    setGeneratingSchema(true)
    setActionMessage(null)
    try {
      await generateSchemaMutation.mutateAsync({ projectId, pageId: page.id })
      queryClient.invalidateQueries({ queryKey: ['seo', 'page', projectId, page.id] })
      setActionMessage({ type: 'success', text: 'Schema markup generated successfully' })
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err as Error).message || 'Failed to generate schema' })
    } finally {
      setGeneratingSchema(false)
    }
  }

  const handleInspectUrl = async () => {
    setInspecting(true)
    setActionMessage(null)
    try {
      await inspectUrlMutation.mutateAsync({ projectId, url: page.url })
      queryClient.invalidateQueries({ queryKey: ['seo', 'page', projectId, page.id] })
      setActionMessage({ type: 'success', text: 'URL inspection complete' })
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: (err as Error).message || 'Failed to inspect URL' })
    } finally {
      setInspecting(false)
    }
  }

  const getHealthBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline">Not analyzed</Badge>
    }
    if (score >= 80) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Good ({score})</Badge>
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Needs Work ({score})</Badge>
    }
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Poor ({score})</Badge>
  }

  const getIndexStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'indexed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Indexed
          </Badge>
        )
      case 'not-indexed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Not Indexed
          </Badge>
        )
      case 'blocked':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getChangeIndicator = (current: number | null | undefined, previous: number | null | undefined, inverse: boolean = false) => {
    if (!previous || current === previous) return null
    const isPositive = inverse ? current < previous : current > previous
    const change = Math.abs(((current - previous) / previous) * 100).toFixed(1)
    
    return (
      <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change}%
      </span>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Combine discovered images (from site-kit) with any that have managed slots
  const allPageImages: PageImage[] = discoveredImages.length > 0 ? discoveredImages : managedImages

  // Page health assessment — from simplified version
  const pageHealth = useMemo(() => {
    const issues: { type: string; label: string; severity: 'high' | 'medium' | 'low' }[] = []
    const good: { type: string; label: string }[] = []
    
    // Title
    if (!page.title || (page.title_length != null && (page.title_length < 30 || page.title_length > 60))) {
      issues.push({ type: 'title', label: 'Title needs optimization', severity: 'high' })
    } else {
      good.push({ type: 'title', label: 'Title is good' })
    }
    
    // Meta description
    if (!page.meta_description || (page.meta_description_length != null && (page.meta_description_length < 120 || page.meta_description_length > 160))) {
      issues.push({ type: 'meta', label: 'Meta description needs work', severity: 'high' })
    } else {
      good.push({ type: 'meta', label: 'Meta description is good' })
    }
    
    // H1
    if (!page.h1) {
      issues.push({ type: 'h1', label: 'Missing H1 tag', severity: 'high' })
    } else if ((page.h1_count ?? 0) > 1) {
      issues.push({ type: 'h1', label: `Multiple H1 tags (${page.h1_count})`, severity: 'medium' })
    } else {
      good.push({ type: 'h1', label: 'H1 is good' })
    }
    
    // Schema
    if (!page.schema_types || (Array.isArray(page.schema_types) && page.schema_types.length === 0)) {
      issues.push({ type: 'schema', label: 'No structured data', severity: 'medium' })
    } else {
      good.push({ type: 'schema', label: `Schema: ${Array.isArray(page.schema_types) ? page.schema_types.join(', ') : 'Present'}` })
    }
    
    // Images
    const imagesWithoutAlt = allPageImages.filter(img => !img.current_alt && !img.managed_alt)
    if (imagesWithoutAlt.length > 0) {
      issues.push({ type: 'images', label: `${imagesWithoutAlt.length} images missing alt text`, severity: 'medium' })
    } else if (allPageImages.length > 0) {
      good.push({ type: 'images', label: `${allPageImages.length} images with alt text` })
    }
    
    // Content
    if (!page.content_text && !page.content_hash) {
      issues.push({ type: 'content', label: 'No content analyzed yet', severity: 'low' })
    } else {
      good.push({ type: 'content', label: 'Content indexed' })
    }
    
    // Index status
    if (page.index_status === 'not-indexed' || page.index_status === 'not_indexed') {
      issues.push({ type: 'indexing', label: 'Page not indexed by Google', severity: 'high' })
    } else if (page.index_status === 'indexed') {
      good.push({ type: 'indexing', label: 'Page is indexed' })
    }
    
    const total = issues.length + good.length
    return { issues, good, score: total > 0 ? Math.round((good.length / total) * 100) : 0 }
  }, [page, allPageImages])

  const handleOptimizeAllAlt = async () => {
    if (!hasSignalAccess || allPageImages.length === 0) return
    setBatchAltLoading(true)
    setBatchAltResults({})
    try {
      const results: Record<string, BatchAltResult> = {}
      await Promise.all(
        allPageImages.map(async (img) => {
          try {
            const suggestions = await fetchAltTextSuggestions({
              pagePath: pagePath || '/',
              slotId: img.slot_id,
              currentAlt: img.current_alt ?? img.alt_text ?? undefined,
              pageTitle: page.title ?? undefined,
              filename: img.src?.split('/').pop() ?? img.file?.name ?? img.file?.filename ?? undefined,
              surroundingText: img.surrounding_text ?? undefined,
              count: 3,
            })
            results[img.id] = { suggestions }
          } catch (e: unknown) {
            results[img.id] = { error: (e as Error)?.message || 'Failed' }
          }
        })
      )
      setBatchAltResults(results)
      const failed = Object.values(results).filter((r) => r.error).length
      if (failed > 0) {
        toast.warning(`${allPageImages.length - failed} optimized, ${failed} failed`)
      } else {
        toast.success(`Alt text suggestions generated for ${allPageImages.length} image(s)`)
      }
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to optimize alt text')
    } finally {
      setBatchAltLoading(false)
    }
  }

  const handleApplyAlt = async (imageId: string, altText: string, isDiscovered: boolean = false) => {
    try {
      if (isDiscovered) {
        // Update discovered image via new API
        await updatePageImageMutation.mutateAsync({
          projectId,
          pageId: page.id,
          imageId,
          updates: { managed_alt: altText },
        })
      } else {
        // Update managed image slot
        await updateManagedImageMutation.mutateAsync({
          id: imageId,
          projectId,
          data: { alt_text: altText },
        })
      }
      setBatchAltResults((prev) => {
        const next = { ...prev }
        delete next[imageId]
        return next
      })
      toast.success('Alt text updated')
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to update')
    }
  }

  const getTitleLengthStatus = (length: number | null | undefined): LengthStatus => {
    if (!length) return { color: 'text-red-400', message: 'Missing' }
    if (length < 30) return { color: 'text-yellow-400', message: 'Too short' }
    if (length > 60) return { color: 'text-yellow-400', message: 'Too long' }
    return { color: 'text-green-400', message: 'Good' }
  }

  const getMetaLengthStatus = (length: number | null | undefined): LengthStatus => {
    if (!length) return { color: 'text-red-400', message: 'Missing' }
    if (length < 120) return { color: 'text-yellow-400', message: 'Too short' }
    if (length > 160) return { color: 'text-yellow-400', message: 'Too long' }
    return { color: 'text-green-400', message: 'Good' }
  }

  const titleStatus = getTitleLengthStatus(page.title_length)
  const metaStatus = getMetaLengthStatus(page.meta_description_length)

  return (
    <div className="space-y-6" data-sonor-help="seo/page-detail">
      {/* Action Message Toast */}
      {actionMessage && (
        <div 
          className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            actionMessage.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30' 
              : 'bg-red-500/20 border border-red-500/30'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <span className={`text-sm ${actionMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {actionMessage.text}
          </span>
          <button 
            onClick={() => setActionMessage(null)} 
            className="ml-auto text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-6 w-6 text-[var(--accent-primary)]" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
              {page.title || page.path}
            </h2>
            {getHealthBadge(page.seo_health_score)}
          </div>
          <a 
            href={page.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
          >
            {page.path}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Deep Optimize with Pipeline - Full world-state aware 8-phase optimization */}
          {hasSignalAccess && (
            <Button 
              variant="default"
              size="sm"
              onClick={() => setPipelineModalOpen(true)}
              title="Run comprehensive 8-phase optimization with full site context, GSC data, and impact prediction"
              style={{ 
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))'
              }}
              className="text-white shadow-lg"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deep Optimize
            </Button>
          )}
          
          {/* Smart One-Click Fix */}
          {hasSignalAccess && (
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const result = await optimizePageMutation.mutateAsync({
                    projectId,
                    pageIdOrPath: page.id,
                    options: { optimize_alt: true, optimize_meta: true, optimize_schema: true, optimize_llm: true },
                    apply: false
                  })
                  setOptimizeResults(result)
                  setActiveTab('results')
                  toast.success('Analysis complete — review results')
                } catch (err: unknown) {
                  toast.error((err as Error).message || 'Optimization failed')
                }
              }}
              disabled={optimizePageMutation.isPending}
              title={pageHealth.issues.length > 0 ? `Fix ${pageHealth.issues.length} issues` : 'Re-analyze page'}
            >
              {optimizePageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {pageHealth.issues.length === 0 ? 'Re-analyze' : pageHealth.issues.length >= 3 ? 'Fix All Issues' : `Fix ${pageHealth.issues.length} Issue${pageHealth.issues.length > 1 ? 's' : ''}`}
            </Button>
          )}
          
          {/* Request Indexing */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRequestIndexing}
            disabled={requestingIndexing}
            title="Request Google to index this page"
          >
            {requestingIndexing ? (
              <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Request Indexing
          </Button>
          
          {/* Generate Schema */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateSchema}
            disabled={generatingSchema}
            title="Generate Schema.org markup for this page"
          >
            {generatingSchema ? (
              <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <Code className="h-4 w-4 mr-2" />
            )}
            Generate Schema
          </Button>
          
          {/* Inspect URL */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleInspectUrl}
            disabled={inspecting}
            title="Inspect URL in Google Search Console"
          >
            {inspecting ? (
              <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Inspect URL
          </Button>
          
          {/* Re-crawl */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCrawl}
            disabled={crawling}
            title="Re-crawl this page for updated metadata"
          >
            {crawling ? (
              <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-crawl
          </Button>
          
          {/* View Page */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(page.url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Health Score</div>
            <div className="text-2xl font-bold" style={{ color: pageHealth.score >= 80 ? '#4ade80' : pageHealth.score >= 50 ? '#facc15' : '#f87171' }}>
              {pageHealth.score}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Clicks (28d)</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(page.clicks_28d)}
              </span>
              {getChangeIndicator(page.clicks_28d, page.clicks_prev_28d)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Impressions</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(page.impressions_28d)}
              </span>
              {getChangeIndicator(page.impressions_28d, page.impressions_prev_28d)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Position</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {page.avg_position_28d?.toFixed(1) || '-'}
              </span>
              {getChangeIndicator(page.avg_position_28d, page.avg_position_prev_28d, true)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">CTR</div>
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {page.ctr_28d ? `${page.ctr_28d.toFixed(1)}%` : '-'}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-[var(--text-tertiary)]">Index Status</div>
            <div className="mt-1">
              {getIndexStatusBadge(page.index_status)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {optimizeResults && (
            <TabsTrigger value="results">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Results
            </TabsTrigger>
          )}
          <TabsTrigger value="serp-preview">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            SERP Preview
          </TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="schema">
            <Code className="h-3.5 w-3.5 mr-1.5" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="opportunities">Issues</TabsTrigger>
          <TabsTrigger value="performance">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Page Health - Issues & What's Good */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  Needs Attention ({pageHealth.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pageHealth.issues.length === 0 ? (
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    All checks passed!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pageHealth.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          issue.severity === 'high'
                            ? 'bg-red-500/10 text-red-400'
                            : issue.severity === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        {issue.label}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  What&apos;s Good ({pageHealth.good.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pageHealth.good.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded bg-green-500/10 text-green-400 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Metadata</CardTitle>
                <CardDescription>What's live on the page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Title</span>
                    <span className={`text-xs ${titleStatus.color}`}>
                      {page.title_length || 0} chars - {titleStatus.message}
                    </span>
                  </div>
                  <div className="p-3 rounded bg-[var(--glass-bg)] text-sm text-[var(--text-primary)]">
                    {page.title || <span className="text-red-400 italic">Missing</span>}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Meta Description</span>
                    <span className={`text-xs ${metaStatus.color}`}>
                      {page.meta_description_length || 0} chars - {metaStatus.message}
                    </span>
                  </div>
                  <div className="p-3 rounded bg-[var(--glass-bg)] text-sm text-[var(--text-primary)]">
                    {page.meta_description || <span className="text-red-400 italic">Missing</span>}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">H1</span>
                  <div className="p-3 rounded bg-[var(--glass-bg)] text-sm text-[var(--text-primary)] mt-1">
                    {page.h1 || <span className="text-red-400 italic">Missing</span>}
                    {page.h1_count > 1 && (
                      <Badge className="ml-2 bg-yellow-500/20 text-yellow-400">
                        {page.h1_count} H1s found
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page Signals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Page Signals</CardTitle>
                <CardDescription>Content and technical health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Word Count</span>
                    <span className={`text-sm font-medium ${
                      page.word_count && page.word_count >= 300 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                    }`}>
                      {page.word_count || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Internal Links Out</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.internal_links_out || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Internal Links In</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.internal_links_in || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">External Links</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.external_links || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Images</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {page.images_count || 0}
                      {page.images_without_alt > 0 && (
                        <span className="text-yellow-400 ml-1">
                          ({page.images_without_alt} missing alt)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--glass-border)]">
                    <span className="text-sm text-[var(--text-secondary)]">Schema Markup</span>
                    <span className={`text-sm font-medium ${page.has_schema ? 'text-green-400' : 'text-[var(--text-tertiary)]'}`}>
                      {page.has_schema ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-[var(--text-secondary)]">Canonical</span>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                      {page.canonical_url || 'Self'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Image alt text – optimize all for this page */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Page Images
                      {!discoveredImagesLoading && allPageImages.filter(i => !i.has_alt && !i.alt_text).length > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {allPageImages.filter(i => !i.has_alt && !i.alt_text).length} missing alt
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {discoveredImages.length > 0 
                        ? 'All images discovered on this page via site-kit analytics.'
                        : 'Managed image slots for this page. Visit the live page to discover all images.'}
                    </CardDescription>
                  </div>
                  {hasSignalAccess && allPageImages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOptimizeAllAlt}
                      disabled={batchAltLoading}
                    >
                      {batchAltLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <SignalIcon className="h-4 w-4 mr-2" />
                      )}
                      Optimize All Alt Text
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {discoveredImagesLoading ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : allPageImages.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)]">
                    No images discovered yet. Visit the page with site-kit installed to auto-discover images.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allPageImages.map((img) => {
                      const isDiscovered = !!img.src // discovered images have src, managed have slot_id
                      const currentAlt = img.current_alt ?? img.alt_text
                      const hasAlt = img.has_alt ?? !!currentAlt
                      const imageUrl = img.resolved_url || img.src || img.url
                      const displayName = img.slot_id || img.src?.split('/').pop() || 'Unknown'
                      
                      return (
                        <div
                          key={img.id}
                          className={`rounded-lg border p-3 space-y-2 ${
                            hasAlt 
                              ? 'border-[var(--glass-border)]' 
                              : 'border-yellow-500/50 bg-yellow-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {imageUrl && (
                                <img
                                  src={imageUrl}
                                  alt=""
                                  className="h-10 w-10 rounded object-cover flex-shrink-0"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                              <div className="min-w-0">
                                <span className="font-mono text-sm text-[var(--text-primary)] truncate block">
                                  {displayName}
                                </span>
                                {img.position_in_page && (
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {img.position_in_page}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {img.slot_id && (
                                <Badge variant="outline" className="text-xs">
                                  Managed
                                </Badge>
                              )}
                              {hasAlt ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                          
                          <div className="text-sm text-[var(--text-secondary)]">
                            {hasAlt ? (
                              <span>Alt: "{currentAlt}"</span>
                            ) : (
                              <span className="text-yellow-500">Missing alt text</span>
                            )}
                            {img.managed_alt && img.managed_alt !== currentAlt && (
                              <div className="mt-1 text-xs text-green-500">
                                Signal suggestion: "{img.managed_alt}"
                              </div>
                            )}
                          </div>
                          
                          {batchAltResults[img.id]?.error && (
                            <p className="text-sm text-red-400">{batchAltResults[img.id].error}</p>
                          )}
                          {batchAltResults[img.id]?.suggestions?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {batchAltResults[img.id].suggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handleApplyAlt(img.id, s.text, isDiscovered)}
                                  className="rounded-md border border-border px-2 py-1 text-xs bg-muted/50 hover:bg-muted text-left"
                                >
                                  {s.text || '(empty)'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PageSpeed Scores */}
          {page.performance_score !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PageSpeed Insights</CardTitle>
                <CardDescription>
                  Last checked: {page.pagespeed_last_checked_at 
                    ? new Date(page.pagespeed_last_checked_at).toLocaleDateString()
                    : 'Never'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Performance', score: page.performance_score },
                    { label: 'SEO', score: page.seo_score },
                    { label: 'Accessibility', score: page.accessibility_score },
                    { label: 'Best Practices', score: page.best_practices_score }
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center">
                      <div className={`
                        inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold
                        ${score >= 90 ? 'bg-green-500/20 text-green-400' :
                          score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'}
                      `}>
                        {score || '-'}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab - Shows after Signal optimization */}
        {optimizeResults && (
          <TabsContent value="results" className="space-y-6 mt-6">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Signal Analysis Complete
                </CardTitle>
                <CardDescription>
                  Review the recommendations below and apply changes when ready
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Metadata Recommendations */}
                {optimizeResults.results?.meta && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Recommended Metadata</h4>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">TITLE</div>
                        <div className="text-sm font-medium">{optimizeResults.results.meta.title}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">META DESCRIPTION</div>
                        <div className="text-sm">{optimizeResults.results.meta.description}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Alt Text Suggestions */}
                {optimizeResults.results?.alt_text && optimizeResults.results.alt_text.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Image Alt Text ({optimizeResults.results.alt_text.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {optimizeResults.results.alt_text.map((img: OptimizeAltTextResult, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-muted/30 text-sm">
                          <div>{img.optimized_alt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply / Discard */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setOptimizeResults(null); setActiveTab('overview') }}>
                    Discard
                  </Button>
                  <Button
                    onClick={() => handleOptimizePage(true)}
                    disabled={optimizePageMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {optimizePageMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply All Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="serp-preview" className="mt-6">
          <SEOSerpPreview 
            page={page}
            domain={site?.domain}
            targetKeyword={page.target_keyword || ''}
            onSave={async (updates) => {
              try {
                await updatePageMutation.mutateAsync({
                  projectId,
                  pageId: page.id,
                  updates: {
                    managed_title: updates.managed_title ?? updates.managedTitle,
                    managed_meta_description: updates.managed_meta_description ?? updates.managedMetaDescription,
                  }
                })
                setNewTitle(updates.managed_title ?? updates.managedTitle ?? newTitle)
                setNewMeta(updates.managed_meta_description ?? updates.managedMetaDescription ?? newMeta)
                setActionMessage({ type: 'success', text: 'SERP preview saved' })
              } catch (err: unknown) {
                setActionMessage({ type: 'error', text: (err as Error).message || 'Failed to save' })
              }
            }}
          />
        </TabsContent>

        <TabsContent value="metadata" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manage Metadata</CardTitle>
              <CardDescription>
                Edit optimized metadata for this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Optimized Title</span>
                    <AIGenerateButton
                      type="title"
                      variant="icon"
                      isLoading={isAIGenerating && aiModalType === 'title'}
                      onClick={() => {
                        setAIModalType('title')
                        clearSuggestions()
                        generateTitles({
                          pageUrl: page.url,
                          currentTitle: page.title,
                          h1: page.h1,
                          metaDescription: page.meta_description
                        })
                        setAIModalOpen(true)
                      }}
                    />
                  </div>
                  <span className={`text-xs ${
                    newTitle.length === 0 ? 'text-red-400' :
                    newTitle.length < 30 || newTitle.length > 60 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {newTitle.length}/60 characters
                  </span>
                </div>
                <Textarea
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter optimized title..."
                  className="resize-none"
                  rows={2}
                />
              </div>
              
              {/* Meta Description Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Optimized Meta Description</span>
                    <AIGenerateButton
                      type="meta_description"
                      variant="icon"
                      isLoading={isAIGenerating && aiModalType === 'meta_description'}
                      onClick={() => {
                        setAIModalType('meta_description')
                        clearSuggestions()
                        generateMetaDescriptions({
                          pageUrl: page.url,
                          currentMeta: page.meta_description,
                          title: page.title,
                          h1: page.h1
                        })
                        setAIModalOpen(true)
                      }}
                    />
                  </div>
                  <span className={`text-xs ${
                    newMeta.length === 0 ? 'text-red-400' :
                    newMeta.length < 120 || newMeta.length > 160 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {newMeta.length}/160 characters
                  </span>
                </div>
                <Textarea
                  value={newMeta}
                  onChange={(e) => setNewMeta(e.target.value)}
                  placeholder="Enter optimized meta description..."
                  className="resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveMetadata} disabled={saving}>
                  {saving ? (
                    <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setAIModalType('title')
                    clearSuggestions()
                    generateTitles({
                      pageUrl: page.url,
                      currentTitle: page.title,
                      h1: page.h1,
                      metaDescription: page.meta_description
                    })
                    setAIModalOpen(true)
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with Signal
                </Button>
              </div>
              
              {/* Predicted impact before saving (Signal ML when available) */}
              {(newTitle !== (page.managed_title || page.title) || newMeta !== (page.managed_meta_description || page.meta_description)) && (
                <ImpactPredictor
                  projectId={site?.id}
                  pageUrl={page.url}
                  targetKeyword={page.target_keyword}
                  changeType="title"
                  oldValue={page.managed_title || page.title}
                  newValue={newTitle}
                  currentMetrics={{
                    clicks: page.clicks_28d,
                    impressions: page.impressions_28d,
                    ctr: page.ctr_28d,
                    position: page.avg_position_28d,
                  }}
                  useBackendPrediction={true}
                />
              )}
              {newMeta !== (page.managed_meta_description || page.meta_description) && newTitle === (page.managed_title || page.title) && (
                <ImpactPredictor
                  projectId={site?.id}
                  pageUrl={page.url}
                  targetKeyword={page.target_keyword}
                  changeType="meta_description"
                  oldValue={page.managed_meta_description || page.meta_description}
                  newValue={newMeta}
                  currentMetrics={{
                    clicks: page.clicks_28d,
                    impressions: page.impressions_28d,
                    ctr: page.ctr_28d,
                    position: page.avg_position_28d,
                  }}
                  useBackendPrediction={true}
                />
              )}
            </CardContent>
          </Card>
          
          {/* AI Preview Modal */}
          <AIPreviewModal
            open={aiModalOpen}
            onOpenChange={setAIModalOpen}
            type={aiModalType}
            currentValue={aiModalType === 'title' ? (page.title || '') : (page.meta_description || '')}
            suggestions={aiSuggestions}
            isLoading={isAIGenerating}
            onSelect={(value) => {
              if (aiModalType === 'title') {
                setNewTitle(value)
              } else {
                setNewMeta(value)
              }
              setActionMessage({ type: 'success', text: `AI ${aiModalType === 'title' ? 'title' : 'meta description'} applied` })
            }}
            onGenerateMore={() => {
              if (aiModalType === 'title') {
                generateMore('title', {
                  pageUrl: page.url,
                  currentTitle: page.title,
                  h1: page.h1,
                  metaDescription: page.meta_description
                })
              } else {
                generateMore('meta_description', {
                  pageUrl: page.url,
                  currentMeta: page.meta_description,
                  title: page.title,
                  h1: page.h1
                })
              }
            }}
            pageUrl={page.url}
          />
        </TabsContent>

        <TabsContent value="schema" className="mt-6 space-y-6">
          {/* Schema Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Schema Markup
                  </CardTitle>
                  <CardDescription>
                    Structured data for this page
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {page.has_schema ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Has Schema
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      No Schema
                    </Badge>
                  )}
                  {hasSignalAccess && (
                    <Button
                      size="sm"
                      onClick={handleGenerateSchema}
                      disabled={generatingSchema}
                    >
                      {generatingSchema ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {page.managed_schema ? 'Regenerate' : 'Generate'} Schema
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Detected Schema Types */}
              {page.schema_types && Object.keys(page.schema_types).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-[var(--text-secondary)]">
                    Detected on Page
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(page.schema_types) ? page.schema_types : Object.keys(page.schema_types)).map((type) => (
                      <Badge key={type} variant="outline">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Validation Errors */}
              {page.schema_validation_errors && page.schema_validation_errors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Validation Errors</h4>
                  <ul className="text-sm text-red-300 space-y-1">
                    {page.schema_validation_errors.map((err, i) => (
                      <li key={i}>• {typeof err === 'string' ? err : err.message || String(err)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Managed Schema (JSON-LD) */}
          {page.managed_schema && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Managed Schema (JSON-LD)</CardTitle>
                    <CardDescription>
                      Copy this to your page's &lt;head&gt; section or use site-kit's ManagedSchema component
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const script = `<script type="application/ld+json">\n${JSON.stringify(page.managed_schema, null, 2)}\n</script>`
                      navigator.clipboard.writeText(script)
                      toast.success('Schema copied to clipboard')
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy HTML
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{JSON.stringify(page.managed_schema, null, 2)}</code>
                </pre>
                {page.schema_validated_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last validated: {new Date(page.schema_validated_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* LLM Schema (for AI visibility) */}
          {page.managed_llm_schema && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <SignalIcon className="h-4 w-4" />
                      LLM Schema
                    </CardTitle>
                    <CardDescription>
                      Enhanced structured data optimized for AI/LLM understanding
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(page.managed_llm_schema, null, 2))
                      toast.success('LLM schema copied to clipboard')
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                  <code>{JSON.stringify(page.managed_llm_schema, null, 2)}</code>
                </pre>
                {page.llm_schema_generated_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Generated: {new Date(page.llm_schema_generated_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty state - no schema yet */}
          {!page.managed_schema && !page.managed_llm_schema && !page.has_schema && (
            <Card>
              <CardContent className="py-8 text-center">
                <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Schema Markup</h3>
                <p className="text-muted-foreground mb-4">
                  Add structured data to help search engines understand your content
                </p>
                {hasSignalAccess && (
                  <Button onClick={handleGenerateSchema} disabled={generatingSchema}>
                    {generatingSchema ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate Schema with Signal
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="mt-6 space-y-6">
          {/* Content Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                Content Analysis
              </CardTitle>
              <CardDescription>
                {hasContent 
                  ? 'Signal AI can analyze your page content for SEO insights'
                  : 'Visit this page with Site-Kit enabled to capture content for analysis'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasContent ? (
                <div className="text-center py-8 text-[var(--text-tertiary)]">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No content captured yet</p>
                  <p className="text-sm">When visitors browse this page with Site-Kit installed, content will be automatically captured for analysis.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Content Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{page.word_count || 0}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Words</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{page.reading_time_minutes || Math.ceil((page.word_count || 0) / 225)}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Min Read</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{page.heading_structure?.length || 0}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Headings</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[var(--bg-secondary)]">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{page.content_depth_score || '—'}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Depth Score</div>
                    </div>
                  </div>

                  {/* Heading Structure */}
                  {page.heading_structure && page.heading_structure.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Heading Structure</h4>
                      <div className="space-y-1 text-sm">
                        {page.heading_structure.slice(0, 10).map((h, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 py-1"
                            style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                          >
                            <Badge variant="outline" className="text-xs">H{h.level}</Badge>
                            <span className="text-[var(--text-primary)] truncate">{h.text}</span>
                          </div>
                        ))}
                        {page.heading_structure.length > 10 && (
                          <div className="text-xs text-[var(--text-tertiary)] pl-4">
                            +{page.heading_structure.length - 10} more headings
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detected FAQs */}
                  {page.faq_detected && page.faq_detected.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        Detected FAQs ({page.faq_detected.length})
                      </h4>
                      <div className="space-y-2">
                        {page.faq_detected.slice(0, 5).map((faq, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-[var(--bg-secondary)] text-sm">
                            <div className="font-medium text-[var(--text-primary)]">{faq.question}</div>
                            <div className="text-[var(--text-tertiary)] mt-1 line-clamp-2">{faq.answer}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analyze Button */}
                  <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-primary)]">
                    <Button
                      onClick={handleAnalyzeContent}
                      disabled={analyzeContentMutation.isPending}
                      style={{ 
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))'
                      }}
                      className="text-white"
                    >
                      {analyzeContentMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <SignalIcon className="h-4 w-4 mr-2" />
                          Analyze with Signal
                        </>
                      )}
                    </Button>
                    {hasExistingAnalysis && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        Last analyzed: {new Date(page.content_analyzed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {(contentAnalysis || page.content_analysis_result) && (
            <div className="space-y-6">
              {/* Topics */}
              {(contentAnalysis?.topics || page.content_topics) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Topics & Themes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(contentAnalysis?.topics || page.content_topics)?.map((topic, idx) => (
                        <div 
                          key={idx}
                          className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]"
                        >
                          <div className="font-medium text-sm">{topic.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={topic.relevance_score} className="h-1 w-16" />
                            <span className="text-xs text-[var(--text-tertiary)]">{topic.relevance_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Keywords */}
              {(contentAnalysis?.keywords || page.content_keywords) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(contentAnalysis?.keywords || page.content_keywords)?.slice(0, 10).map((kw, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border-secondary)] last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{kw.keyword}</span>
                            <Badge 
                              variant={kw.prominence === 'high' ? 'default' : 'outline'}
                              className={kw.prominence === 'high' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                            >
                              {kw.prominence}
                            </Badge>
                          </div>
                          <div className="text-sm text-[var(--text-tertiary)]">
                            {kw.frequency}x
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Entities */}
              {(contentAnalysis?.entities || page.content_entities) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Named Entities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(contentAnalysis?.entities || page.content_entities)?.map((entity, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-[var(--bg-secondary)]">
                          <div className="font-medium text-sm">{entity.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                            <span className="text-xs text-[var(--text-tertiary)]">{entity.mentions_count} mentions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {(contentAnalysis?.recommendations || page.content_recommendations) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(contentAnalysis?.recommendations || page.content_recommendations)?.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                          <div 
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)', color: 'var(--brand-primary)' }}
                          >
                            {idx + 1}
                          </div>
                          <div className="text-sm text-[var(--text-primary)]">{rec}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SEO Opportunities */}
              {(contentAnalysis?.seo_opportunities) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">SEO Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contentAnalysis.seo_opportunities.map((opp, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-[var(--border-primary)]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{opp.opportunity}</span>
                            <Badge 
                              className={
                                opp.impact === 'high' ? 'bg-green-500/20 text-green-400' :
                                opp.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }
                            >
                              {opp.impact} impact
                            </Badge>
                            <Badge variant="outline">{opp.effort} effort</Badge>
                          </div>
                          <p className="text-sm text-[var(--text-tertiary)]">{opp.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="queries" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-[var(--text-tertiary)]">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Connect Google Search Console to see queries</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-[var(--text-tertiary)]">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No issues detected for this page</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab - Core Web Vitals */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <PagePerformanceSection page={page} projectId={projectId} site={site} />
        </TabsContent>
      </Tabs>

      {/* Optimize with Signal Dialog */}
      <Dialog open={optimizeDialogOpen} onOpenChange={setOptimizeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
              Optimize Page with Signal
            </DialogTitle>
            <DialogDescription>
              Signal AI will analyze this page and generate optimized metadata, schema markup, 
              and alt text for images - all at once with full page context.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Optimization Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">What to optimize:</Label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <Checkbox
                    checked={optimizeOptions.optimize_meta}
                    onCheckedChange={(checked) => setOptimizeOptions(prev => ({ ...prev, optimize_meta: !!checked }))}
                  />
                  <div>
                    <div className="font-medium text-sm">Title & Description</div>
                    <div className="text-xs text-[var(--text-tertiary)]">SEO-optimized title and meta description</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <Checkbox
                    checked={optimizeOptions.optimize_alt}
                    onCheckedChange={(checked) => setOptimizeOptions(prev => ({ ...prev, optimize_alt: !!checked }))}
                  />
                  <div>
                    <div className="font-medium text-sm">Image Alt Text</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{discoveredImages.length + managedImages.length} images on this page</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <Checkbox
                    checked={optimizeOptions.optimize_schema}
                    onCheckedChange={(checked) => setOptimizeOptions(prev => ({ ...prev, optimize_schema: !!checked }))}
                  />
                  <div>
                    <div className="font-medium text-sm">Schema Markup</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Structured data for search engines</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
                  <Checkbox
                    checked={optimizeOptions.optimize_llm}
                    onCheckedChange={(checked) => setOptimizeOptions(prev => ({ ...prev, optimize_llm: !!checked }))}
                  />
                  <div>
                    <div className="font-medium text-sm">LLM Schema</div>
                    <div className="text-xs text-[var(--text-tertiary)]">AI-optimized llms.txt content</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Results Preview */}
            {optimizeResults && !optimizeResults.applied && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-sm font-medium text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Optimization Results
                </Label>
                
                {/* Meta Results */}
                {optimizeResults.results?.meta && (
                  <div className="space-y-2 p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <div className="text-xs font-medium text-[var(--text-tertiary)]">TITLE</div>
                    <div className="text-sm">{optimizeResults.results.meta.title}</div>
                    <div className="text-xs font-medium text-[var(--text-tertiary)] mt-2">DESCRIPTION</div>
                    <div className="text-sm">{optimizeResults.results.meta.description}</div>
                  </div>
                )}
                
                {/* Alt Text Results */}
                {optimizeResults.results?.alt_text?.length > 0 && (
                  <div className="space-y-2 p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <div className="text-xs font-medium text-[var(--text-tertiary)]">
                      ALT TEXT ({optimizeResults.results.alt_text.length} images)
                    </div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {optimizeResults.results.alt_text.slice(0, 5).map((img, idx) => (
                        <div key={idx} className="text-xs p-2 bg-[var(--bg-primary)] rounded">
                          <span className="text-[var(--text-tertiary)]">→</span> {img.optimized_alt}
                        </div>
                      ))}
                      {optimizeResults.results.alt_text.length > 5 && (
                        <div className="text-xs text-[var(--text-tertiary)]">
                          +{optimizeResults.results.alt_text.length - 5} more images
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Schema Results */}
                {optimizeResults.results?.schema && (
                  <div className="space-y-2 p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <div className="text-xs font-medium text-[var(--text-tertiary)]">
                      SCHEMA ({optimizeResults.results.schema.type})
                    </div>
                    <div className="text-xs text-green-400">✓ Schema generated</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOptimizeDialogOpen(false)}>
              Cancel
            </Button>
            
            {!optimizeResults ? (
              <Button
                onClick={() => handleOptimizePage(false)}
                disabled={optimizePageMutation.isPending || !Object.values(optimizeOptions).some(Boolean)}
                style={{ 
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))'
                }}
                className="text-white"
              >
                {optimizePageMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SignalIcon className="h-4 w-4 mr-2" />
                    Generate Optimizations
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setOptimizeResults(null)}
                >
                  Regenerate
                </Button>
                <Button
                  onClick={() => handleOptimizePage(true)}
                  disabled={optimizePageMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {optimizePageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deep Optimization Pipeline Modal */}
      <SEOPipelineModal
        open={pipelineModalOpen}
        onOpenChange={setPipelineModalOpen}
        projectId={projectId}
        pageIdOrPath={page.id}
        pagePath={page.path}
        onComplete={(result) => {
          // Refresh page data when pipeline completes
          queryClient.invalidateQueries({ queryKey: ['seo', 'page', projectId, page.id] })
          toast.success('Deep optimization complete!')
        }}
      />
    </div>
  )
}

// ─── Performance / Core Web Vitals section for a single page ─────────

interface PagePerformanceSectionProps {
  page: SeoPage
  projectId: string
  site: SeoProject | undefined
}

interface CwvDisplayData {
  mobileScore?: number | null
  desktopScore?: number | null
  mobileLCP?: number | null
  desktopLCP?: number | null
  mobileCLS?: number | null
  desktopCLS?: number | null
  mobileFID?: number | null
  desktopFID?: number | null
  mobileTTFB?: number | null
  desktopTTFB?: number | null
}

function PagePerformanceSection({ page, projectId, site }: PagePerformanceSectionProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [cwvData, setCwvData] = useState<CwvDisplayData | null>(null)
  const queryClient = useQueryClient()
  
  const getPageUrl = (): string | null => {
    if (!site?.domain) return null
    const protocol = site.domain.includes('localhost') ? 'http://' : 'https://'
    const domain = site.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const path = page.path?.startsWith('/') ? page.path : `/${page.path || ''}`
    return `${protocol}${domain}${path}`
  }
  
  const handleScanPage = async () => {
    const url = getPageUrl()
    if (!url || !projectId) return
    
    setIsScanning(true)
    try {
      const response = await seoApi.checkPageCwv(projectId, { url })
      setCwvData(response.data || response)
      queryClient.invalidateQueries({ queryKey: ['seo'] })
      toast.success('PageSpeed scan complete')
    } catch {
      toast.error('Failed to scan page')
    } finally {
      setIsScanning(false)
    }
  }
  
  const displayData: CwvDisplayData = cwvData || {
    mobileScore: (page as Record<string, unknown>).mobile_score as number | undefined,
    desktopScore: (page as Record<string, unknown>).desktop_score as number | undefined,
    mobileLCP: (page as Record<string, unknown>).mobile_lcp as number | undefined,
    desktopLCP: (page as Record<string, unknown>).desktop_lcp as number | undefined,
    mobileCLS: (page as Record<string, unknown>).mobile_cls as number | undefined,
    desktopCLS: (page as Record<string, unknown>).desktop_cls as number | undefined,
    mobileFID: (page as Record<string, unknown>).mobile_fid as number | undefined,
    desktopFID: (page as Record<string, unknown>).desktop_fid as number | undefined,
    mobileTTFB: (page as Record<string, unknown>).mobile_ttfb as number | undefined,
    desktopTTFB: (page as Record<string, unknown>).desktop_ttfb as number | undefined,
  }
  
  const hasData = displayData.mobileScore || displayData.desktopScore
  
  const getScoreColor = (score: number | null | undefined): string => {
    if (!score) return 'text-muted-foreground'
    if (score >= 90) return 'text-green-400'
    if (score >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }
  
  const getScoreBg = (score: number | null | undefined): string => {
    if (!score) return 'bg-muted/30'
    if (score >= 90) return 'bg-green-500/10'
    if (score >= 50) return 'bg-yellow-500/10'
    return 'bg-red-500/10'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Core Web Vitals</h3>
          <p className="text-sm text-muted-foreground">Performance metrics from Google PageSpeed Insights</p>
        </div>
        <Button onClick={handleScanPage} disabled={isScanning || !getPageUrl()}>
          {isScanning ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Scanning...</>
          ) : (
            <><Zap className="mr-2 h-4 w-4" />{hasData ? 'Re-scan Page' : 'Scan Page'}</>
          )}
        </Button>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
            <p className="text-muted-foreground mb-4">Click &quot;Scan Page&quot; to run a PageSpeed Insights analysis</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className={getScoreBg(displayData.mobileScore)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />Mobile Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${getScoreColor(displayData.mobileScore)}`}>
                  {displayData.mobileScore || '-'}
                </div>
              </CardContent>
            </Card>
            <Card className={getScoreBg(displayData.desktopScore)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" />Desktop Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${getScoreColor(displayData.desktopScore)}`}>
                  {displayData.desktopScore || '-'}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Core Web Vitals Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CwvMetricRow label="Largest Contentful Paint (LCP)" mobileValue={displayData.mobileLCP} desktopValue={displayData.desktopLCP} unit="s" good={2.5} poor={4} />
                <CwvMetricRow label="Cumulative Layout Shift (CLS)" mobileValue={displayData.mobileCLS} desktopValue={displayData.desktopCLS} unit="" good={0.1} poor={0.25} />
                <CwvMetricRow label="First Input Delay (FID)" mobileValue={displayData.mobileFID} desktopValue={displayData.desktopFID} unit="ms" good={100} poor={300} />
                <CwvMetricRow label="Time to First Byte (TTFB)" mobileValue={displayData.mobileTTFB} desktopValue={displayData.desktopTTFB} unit="ms" good={800} poor={1800} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

interface CwvMetricRowProps {
  label: string
  mobileValue: number | null | undefined
  desktopValue: number | null | undefined
  unit: string
  good: number
  poor: number
}

function CwvMetricRow({ label, mobileValue, desktopValue, unit, good, poor }: CwvMetricRowProps) {
  const getStatus = (value: number | null | undefined): string => {
    if (value === undefined || value === null) return 'unknown'
    if (value <= good) return 'good'
    if (value <= poor) return 'warning'
    return 'poor'
  }
  
  const statusColors: Record<string, string> = {
    good: 'text-green-400', warning: 'text-yellow-400', poor: 'text-red-400', unknown: 'text-muted-foreground'
  }
  
  const formatValue = (val: number | null | undefined): string => {
    if (val === undefined || val === null) return '-'
    return `${val}${unit}`
  }

  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="text-sm font-medium text-foreground mb-2">{label}</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={`text-sm font-medium ${statusColors[getStatus(mobileValue)]}`}>{formatValue(mobileValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={`text-sm font-medium ${statusColors[getStatus(desktopValue)]}`}>{formatValue(desktopValue)}</span>
        </div>
      </div>
    </div>
  )
}
