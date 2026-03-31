/**
 * SEO Signal AI React Query Hooks
 * 
 * Manages Signal AI operations for SEO: brain analysis, site training,
 * quick wins, page analysis, schema generation, etc.
 * 
 * Uses the Signal API directly via signalSeoApi.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { signalSeoApi } from '../../lib/signal-api'
import { seoApi } from '../../lib/sonor-api'

// ============================================
// Query Keys
// ============================================

export const seoSignalKeys = {
  all: ['seo', 'signal'] as const,
  knowledge: (projectId: string) => [...seoSignalKeys.all, 'knowledge', projectId] as const,
  learning: (projectId: string) => [...seoSignalKeys.all, 'learning', projectId] as const,
  suggestions: (projectId: string, pageId?: string) => 
    [...seoSignalKeys.all, 'suggestions', projectId, pageId] as const,
  recommendations: (projectId: string) => [...seoSignalKeys.all, 'recommendations', projectId] as const,
  jobs: (projectId: string) => [...seoSignalKeys.all, 'jobs', projectId] as const,
}

// ============================================
// Site Knowledge & Training Status
// ============================================

/**
 * Get the current project's AI knowledge/training status
 */
export function useSiteKnowledge(projectId: string) {
  return useQuery({
    queryKey: seoSignalKeys.knowledge(projectId),
    queryFn: async () => {
      // First try Portal API for persisted knowledge status
      try {
        const response = await seoApi.getProjectKnowledge(projectId)
        return response.data
      } catch {
        // Fallback to Signal API quick analysis
        const data = await signalSeoApi.getProjectKnowledge(projectId)
        return data
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Train the site's AI knowledge base
 * This syncs content from the site to Signal's knowledge base
 */
export function useTrainSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Use Portal API which triggers Signal internally
      const response = await seoApi.trainSite(projectId)
      return response.data
    },
    onSuccess: (data, projectId) => {
      // Invalidate knowledge queries to refetch updated status
      queryClient.invalidateQueries({ 
        queryKey: seoSignalKeys.knowledge(projectId) 
      })
    },
  })
}

// ============================================
// AI Brain Analysis
// ============================================

/**
 * Run comprehensive AI analysis on the project
 * Returns detailed SEO insights, recommendations, and opportunities
 */
export function useRunAiBrain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      options = {} 
    }: { 
      projectId: string
      options?: {
        analysisType?: 'quick' | 'full' | 'deep'
        focusAreas?: string[]
      }
    }) => {
      const data = await signalSeoApi.runAiBrain(projectId, options)
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: seoSignalKeys.recommendations(variables.projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoSignalKeys.learning(variables.projectId) 
      })
    },
  })
}

// ============================================
// Signal Learning & Suggestions
// ============================================

/**
 * Get Signal's learned patterns and insights for the project
 */
export function useSignalLearning(projectId: string) {
  return useQuery({
    queryKey: seoSignalKeys.learning(projectId),
    queryFn: async () => {
      const response = await seoApi.getSignalLearning(projectId)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get AI-powered suggestions for a specific page
 */
export function useSignalSuggestions(projectId: string, pageUrl?: string) {
  return useQuery({
    queryKey: seoSignalKeys.suggestions(projectId, pageUrl),
    queryFn: async () => {
      if (pageUrl) {
        const data = await signalSeoApi.getSignalSuggestions(projectId, pageUrl)
        return data
      }
      const response = await seoApi.getSignalSuggestions(projectId, undefined)
      return response.data
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Apply Signal's auto-fix suggestions
 */
export function useApplySignalAutoFixes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await seoApi.applySignalAutoFixes(projectId)
      return response.data
    },
    onSuccess: (data, projectId) => {
      // Invalidate all SEO data as auto-fixes may change many things
      queryClient.invalidateQueries({ 
        queryKey: ['seo'] 
      })
    },
  })
}

// ============================================
// AI Page Analysis
// ============================================

/**
 * Analyze a specific page with AI
 */
export function useAnalyzePageWithAi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      url,
      options = {}
    }: { 
      projectId: string
      url: string
      options?: Record<string, unknown>
    }) => {
      const data = await signalSeoApi.analyzePageWithAi(projectId, url, options)
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate page-specific suggestions
      queryClient.invalidateQueries({ 
        queryKey: seoSignalKeys.suggestions(variables.projectId, variables.url) 
      })
    },
  })
}

// ============================================
// Schema Generation
// ============================================

/**
 * Generate schema markup for a page using AI
 */
export function useGenerateSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      pageUrl,
      schemaType 
    }: { 
      projectId: string
      pageUrl: string
      schemaType: string
    }) => {
      const data = await signalSeoApi.generateSchema(projectId, pageUrl, schemaType)
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate schemas for the project
      queryClient.invalidateQueries({ 
        queryKey: ['seo', 'technical', 'schemas', variables.projectId] 
      })
    },
  })
}

// ============================================
// Unified Page Optimization
// ============================================

export interface PageOptimizationOptions {
  optimize_alt?: boolean
  optimize_meta?: boolean
  optimize_schema?: boolean
  optimize_llm?: boolean
  analyze_content?: boolean  // Include content analysis
  target_keywords?: string[]
  force_regenerate?: boolean
}

export interface PageOptimizationResult {
  success: boolean
  page_id: string
  page_path?: string
  page_title?: string
  has_content?: boolean
  image_count?: number
  optimized?: {
    alt_text: boolean
    meta: boolean
    schema: boolean
    llm_schema: boolean
  }
  // Unified results - what Signal returns
  metadata?: {
    title: string
    meta_description: string
    og_title?: string
    og_description?: string
  }
  content_analysis?: {
    topics?: Array<{ name: string; relevance: number }>
    keywords?: Array<{ keyword: string; frequency: number; prominence: string }>
    reading_level?: string
    content_type?: string
    strengths?: string[]
    weaknesses?: string[]
    depth_score?: number
  }
  images?: Array<{
    src: string
    optimized_alt: string
    quality_score?: number
  }>
  schema?: object
  opportunities?: Array<{
    title: string
    impact: 'high' | 'medium' | 'low'
    effort?: 'easy' | 'medium' | 'hard'
    description: string
  }>
  quick_wins?: Array<{
    action: string
    current?: string
    recommended?: string
  }>
  applied: boolean
  timestamp?: string
}

/**
 * Unified page optimization - optimize alt text, metadata, schema, and LLM schema
 * in a single Signal AI call with full page context.
 * 
 * @example
 * ```tsx
 * const { mutateAsync: optimizePage, isPending } = useOptimizePage()
 * 
 * const handleOptimize = async () => {
 *   const result = await optimizePage({
 *     projectId,
 *     pageIdOrPath: '/about-us',
 *     options: {
 *       optimize_alt: true,
 *       optimize_meta: true,
 *       optimize_schema: true,
 *       target_keywords: ['personal injury lawyer', 'Cincinnati attorney']
 *     },
 *     apply: true  // Apply changes directly
 *   })
 *   console.log('Optimized:', result.optimized)
 * }
 * ```
 */
export function useOptimizePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      pageIdOrPath,
      options = {},
      apply = false
    }: {
      projectId: string
      pageIdOrPath: string
      options?: PageOptimizationOptions
      apply?: boolean
    }): Promise<PageOptimizationResult> => {
      const result = await signalSeoApi.optimizePage(projectId, pageIdOrPath, options, apply)
      return result as PageOptimizationResult
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: ['seo', 'pages', variables.projectId]
      })
      
      // Invalidate page images if alt text was optimized
      if (data.optimized?.alt_text) {
        queryClient.invalidateQueries({
          queryKey: ['seo', 'page-images', variables.projectId]
        })
      }
      
      // Invalidate schemas if schema was optimized
      if (data.optimized?.schema || data.optimized?.llm_schema) {
        queryClient.invalidateQueries({
          queryKey: ['seo', 'technical', 'schemas', variables.projectId]
        })
      }
    }
  })
}

// ============================================
// Content Analysis
// ============================================

export interface ContentAnalysisOptions {
  extract_topics?: boolean
  extract_entities?: boolean
  extract_keywords?: boolean
  analyze_depth?: boolean
  analyze_readability?: boolean
  compare_to_competitors?: boolean
  target_keywords?: string[]
}

export interface ContentAnalysisResult {
  page_id: string
  page_path: string
  topics?: Array<{
    name: string
    relevance_score: number
    keywords_related: string[]
  }>
  entities?: Array<{
    name: string
    type: 'person' | 'place' | 'org' | 'product'
    mentions_count: number
  }>
  keywords?: Array<{
    keyword: string
    frequency: number
    prominence: 'high' | 'medium' | 'low'
    optimization_opportunity: string
  }>
  depth_analysis?: {
    coverage_score: number
    missing_subtopics: string[]
    competitor_gaps: string[]
    suggested_additions: string[]
  }
  readability_analysis?: {
    grade_level: string
    sentence_complexity: string
    vocabulary_level: string
    suggestions: string[]
  }
  detected_content_type?: string
  content_depth_score?: number
  reading_level?: string
  seo_opportunities?: Array<{
    opportunity: string
    impact: 'high' | 'medium' | 'low'
    effort: 'easy' | 'medium' | 'hard'
    description: string
  }>
  recommendations?: string[]
}

/**
 * Analyze page content for SEO insights using Signal AI.
 * Extracts topics, entities, keywords and provides recommendations.
 * 
 * @example
 * ```tsx
 * const { mutateAsync: analyzeContent, isPending } = useAnalyzeContent()
 * 
 * const handleAnalyze = async () => {
 *   const result = await analyzeContent({
 *     projectId,
 *     pageIdOrPath: '/services/personal-injury',
 *     options: {
 *       extract_topics: true,
 *       extract_keywords: true,
 *       analyze_depth: true,
 *       target_keywords: ['personal injury lawyer']
 *     }
 *   })
 *   console.log('Topics:', result.topics)
 *   console.log('Recommendations:', result.recommendations)
 * }
 * ```
 */
export function useAnalyzeContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      pageIdOrPath,
      options = {}
    }: {
      projectId: string
      pageIdOrPath: string
      options?: ContentAnalysisOptions
    }): Promise<ContentAnalysisResult> => {
      const result = await signalSeoApi.analyzeContent(projectId, pageIdOrPath, options)
      return result as ContentAnalysisResult
    },
    onSuccess: (data, variables) => {
      // Invalidate page queries to reflect new analysis data
      queryClient.invalidateQueries({
        queryKey: ['seo', 'pages', variables.projectId]
      })
      queryClient.invalidateQueries({
        queryKey: ['seo', 'page', variables.projectId]
      })
    }
  })
}

// ============================================
// Content Brief Generation
// ============================================

/**
 * Generate a content brief for a target keyword using Signal AI
 * This is the AI-powered version that uses Signal's content analysis
 */
export function useGenerateAiContentBrief() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      data 
    }: { 
      projectId: string
      data: {
        targetKeyword: string
        contentType?: string
      }
    }) => {
      const result = await signalSeoApi.generateContentBrief(projectId, data)
      return result
    },
    onSuccess: (data, variables) => {
      // Invalidate content briefs
      queryClient.invalidateQueries({ 
        queryKey: ['seo', 'content', 'briefs', variables.projectId] 
      })
    },
  })
}

// ============================================
// Quick Wins
// ============================================

/**
 * Get quick win opportunities from Signal AI
 */
export function useSeoQuickWins(projectId: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: [...seoSignalKeys.all, 'quick-wins', projectId, options],
    queryFn: async () => {
      const data = await signalSeoApi.getAiRecommendations(projectId, options)
      return data
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ============================================
// Keyword Recommendations
// ============================================

/**
 * Get AI-powered keyword recommendations
 */
export function useKeywordRecommendations(projectId: string, pageUrl?: string) {
  return useQuery({
    queryKey: [...seoSignalKeys.all, 'keywords', projectId, pageUrl],
    queryFn: async () => {
      const data = await signalSeoApi.getKeywordRecommendations(projectId, pageUrl || null)
      return data
    },
    enabled: !!projectId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// ============================================
// Topic Clusters
// ============================================

/**
 * Generate topic clusters for content planning
 */
export function useGenerateTopicClusters() {
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      seedKeyword 
    }: { 
      projectId: string
      seedKeyword?: string
    }) => {
      const data = await signalSeoApi.generateTopicClusters(projectId, seedKeyword || null)
      return data
    },
  })
}

// ============================================
// Internal Links Analysis
// ============================================

/**
 * Analyze internal linking with AI suggestions
 */
export function useAnalyzeInternalLinks() {
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      pageUrl 
    }: { 
      projectId: string
      pageUrl?: string
    }) => {
      const data = await signalSeoApi.analyzeInternalLinks(projectId, pageUrl || null)
      return data
    },
  })
}

// ============================================
// Technical Audit (AI-powered)
// ============================================

/**
 * Run AI-powered technical SEO audit
 */
export function useRunSignalTechnicalAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const data = await signalSeoApi.runTechnicalAudit(projectId)
      return data
    },
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['seo', 'technical', 'audit', projectId] 
      })
    },
  })
}

// ============================================
// Blog AI Brain
// ============================================

/**
 * Get AI-powered blog topic suggestions
 */
export function useBlogAiSuggestions(
  projectId: string,
  params?: { topic?: string; count?: number; ideasMode?: 'default' | 'answer_engine_listicles' },
) {
  return useQuery({
    queryKey: [...seoSignalKeys.all, 'blog', 'suggestions', projectId, params],
    queryFn: async () => {
      const data = await signalSeoApi.getBlogAiSuggestions(projectId, params || {})
      return data
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // 30 minutes (blog ideas don't change often)
  })
}

// ============================================
// Competitor Analysis (AI-powered)
// ============================================

/**
 * Analyze a competitor with AI
 */
export function useAnalyzeCompetitorWithAi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      competitorUrl 
    }: { 
      projectId: string
      competitorUrl: string
    }) => {
      const data = await signalSeoApi.analyzeCompetitorWithAi(projectId, competitorUrl)
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['seo', 'technical', 'competitors', variables.projectId] 
      })
    },
  })
}

// ============================================
// Background Jobs
// ============================================

/**
 * Get status of SEO background jobs
 */
export function useSeoBackgroundJobs(projectId: string) {
  return useQuery({
    queryKey: seoSignalKeys.jobs(projectId),
    queryFn: async () => {
      const response = await seoApi.listBackgroundJobs()
      // Filter to this project's jobs
      const jobs = response.data?.jobs || response.data || []
      return jobs.filter((job: { project_id: string }) => job.project_id === projectId)
    },
    enabled: !!projectId,
    staleTime: 10 * 1000, // 10 seconds - jobs change frequently
    refetchInterval: (query) => {
      // Poll every 5s if there are active jobs
      const jobs = query.state.data as Array<{ status: string }> | undefined
      const hasActiveJobs = jobs?.some((job) => 
        ['pending', 'running', 'processing'].includes(job.status)
      )
      return hasActiveJobs ? 5000 : false
    },
  })
}

/**
 * Start a background SEO job
 */
export function useStartSeoBackgroundJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      project_id: string
      job_type: string
      params?: Record<string, unknown>
    }) => {
      const response = await seoApi.startBackgroundJob(data)
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoSignalKeys.jobs(variables.project_id) 
      })
    },
  })
}

/**
 * Get status of a specific job
 */
export function useSeoJobStatus(jobId: string) {
  return useQuery({
    queryKey: ['seo', 'job', jobId],
    queryFn: async () => {
      const response = await seoApi.getJobStatus(jobId)
      return response.data
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll while job is active
      const job = query.state.data as { status: string } | undefined
      const status = job?.status
      return status && ['pending', 'running', 'processing'].includes(status) ? 3000 : false
    },
  })
}
// ============================================
// SEO Pipeline (Ashbound-style optimization)
// ============================================

export interface PipelineOptions {
  siteId?: string
  skipPhases?: string[]
  maxRepairLoops?: number
}

export interface PipelinePhaseResult {
  phase: string
  ok: boolean
  error?: string
  data?: unknown
  durationMs?: number
}

export interface PipelineOptimizations {
  metadata?: {
    title?: { current?: string; suggested?: string; reason?: string }
    meta_description?: { current?: string; suggested?: string; reason?: string }
    h1?: { current?: string; suggested?: string; reason?: string }
  }
  images?: Array<{
    image_id?: string
    src?: string
    current_alt?: string
    suggested_alt?: string
    reason?: string
  }>
  schema?: {
    type?: string
    json?: Record<string, unknown>
    reason?: string
  }
  content?: {
    faq_suggestions?: Array<{ question?: string; answer?: string }>
  }
  internal_links?: Array<{
    target_path?: string
    anchor_text?: string
    reason?: string
  }>
}

export interface PipelineRunState {
  runId: string
  projectId: string
  pageIdOrPath: string
  currentPhase: string | null
  phaseResults: PipelinePhaseResult[]
  startTime: string
  plan?: {
    page_id?: string
    page_path?: string
    optimizations?: PipelineOptimizations
    validation?: { passed?: boolean; issues?: string[] }
    predicted_impact?: {
      confidence?: number
      estimated_traffic_change?: number
      estimated_ranking_change?: number
    }
  }
}

/**
 * Run the SEO optimization pipeline (Ashbound architecture).
 * This is the comprehensive, world-state-aware optimization:
 * - Loads full site context (pages, keywords, GSC, images, competitors)
 * - AI opportunity analysis + content generation
 * - Validation with repair loop
 * - Ranking impact prediction
 * - Automatic database updates + indexing request
 * 
 * @example
 * ```tsx
 * const { mutate: runPipeline, isPending } = useRunSeoPipeline()
 * 
 * const handleOptimize = async () => {
 *   const result = await runPipeline({
 *     projectId,
 *     pageIdOrPath: '/about-us',
 *   })
 *   console.log('Pipeline result:', result.state.plan)
 * }
 * ```
 */
export function useRunSeoPipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      pageIdOrPath,
      options = {},
    }: {
      projectId: string
      pageIdOrPath: string
      options?: PipelineOptions
    }): Promise<{ runId: string; state: PipelineRunState }> => {
      const result = await signalSeoApi.runPipeline(projectId, pageIdOrPath, options)
      return result
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries after pipeline completes
      queryClient.invalidateQueries({
        queryKey: ['seo', 'pages', variables.projectId]
      })
      queryClient.invalidateQueries({
        queryKey: ['seo', 'page-images', variables.projectId]
      })
      queryClient.invalidateQueries({
        queryKey: ['seo', 'technical', 'schemas', variables.projectId]
      })
      queryClient.invalidateQueries({
        queryKey: ['seo', 'faqs', variables.projectId]
      })
    }
  })
}

/**
 * Poll for pipeline run state
 * Use this to track progress of a running pipeline
 */
export function useSeoPipelineState(runId: string | null) {
  return useQuery({
    queryKey: ['seo', 'pipeline', 'run', runId],
    queryFn: async (): Promise<PipelineRunState> => {
      if (!runId) throw new Error('No runId provided')
      return await signalSeoApi.getPipelineRunState(runId)
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      // Poll every 2s while pipeline is running
      const state = query.state.data as PipelineRunState | undefined
      return state?.currentPhase ? 2000 : false
    },
  })
}