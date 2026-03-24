/**
 * SEO Query Hooks
 * 
 * TanStack Query hooks for SEO module.
 * Replaces seo-store.js + seo/*.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../sonor-api'
import { signalSeoApi } from '../signal-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const seoKeys = {
  all: ['seo'],
  // Projects/Sites
  projects: () => [...seoKeys.all, 'projects'],
  projectDetail: (projectId) => [...seoKeys.projects(), 'detail', projectId],
  projectOverview: (projectId) => [...seoKeys.projects(), 'overview', projectId],
  // Pages
  pages: (projectId) => [...seoKeys.all, 'pages', projectId],
  pagesList: (projectId, filters) => [...seoKeys.pages(projectId), 'list', filters],
  pageDetail: (pageId) => [...seoKeys.all, 'page', pageId],
  // Opportunities
  opportunities: (projectId) => [...seoKeys.all, 'opportunities', projectId],
  opportunitiesList: (projectId, filters) => [...seoKeys.opportunities(projectId), 'list', filters],
  opportunitiesSummary: (projectId) => [...seoKeys.opportunities(projectId), 'summary'],
  // GSC (Google Search Console)
  gsc: (projectId) => [...seoKeys.all, 'gsc', projectId],
  gscOverview: (projectId) => [...seoKeys.gsc(projectId), 'overview'],
  gscQueries: (projectId, filters) => [...seoKeys.gsc(projectId), 'queries', filters],
  gscPages: (projectId, filters) => [...seoKeys.gsc(projectId), 'pages', filters],
  // Keywords
  keywords: (projectId) => [...seoKeys.all, 'keywords', projectId],
  strikingQueries: (projectId) => [...seoKeys.all, 'strikingQueries', projectId],
  // Schema
  schema: (projectId) => [...seoKeys.all, 'schema', projectId],
  // FAQs
  faqs: (projectId) => [...seoKeys.all, 'faqs', projectId],
  // Redirects
  redirects: (projectId) => [...seoKeys.all, 'redirects', projectId],
  // Internal Links
  links: (projectId) => [...seoKeys.all, 'links', projectId],
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS / SITES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch SEO project overview for an org/project
 */
export function useSeoProject(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.projectOverview(projectId),
    queryFn: async () => {
      const response = await seoApi.getProjectForOrg(projectId)
      const data = response.data || response
      // Normalize to site-like object
      return {
        id: data.projectId || projectId,
        domain: data.domain,
        healthScore: data.healthScore,
        metrics: data.metrics,
        indexing: data.indexing,
        ...data,
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Create SEO site/project
 */
export function useCreateSeoProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, domain }) => {
      const response = await seoApi.createProject({ projectId, domain })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.projects() })
      queryClient.invalidateQueries({ queryKey: seoKeys.projectOverview(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch SEO pages list
 */
export function useSeoPages(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: seoKeys.pagesList(projectId, filters),
    queryFn: async () => {
      const { page = 1, limit = 50, status, search } = filters
      const res = await seoApi.getPages(projectId, { page, limit, status, search })
      // Axios: res.data is the backend body { pages, total, page, limit, totalPages }
      const body = res.data ?? res
      const list = Array.isArray(body.pages) ? body.pages : (body.data ?? [])
      return {
        pages: list,
        pagination: {
          page: body.page ?? page,
          limit: body.limit ?? limit,
          total: body.total ?? 0,
          totalPages: body.totalPages ?? Math.ceil((body.total ?? 0) / (body.limit ?? limit)),
        },
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  })
}

/**
 * Fetch single SEO page (backend route is GET /seo/pages/:pageId)
 */
export function useSeoPage(projectId, pageId, options = {}) {
  return useQuery({
    queryKey: seoKeys.pageDetail(pageId),
    queryFn: async () => {
      const response = await seoApi.getPage(pageId)
      return response.data || response
    },
    enabled: !!pageId,
    ...options,
  })
}

/**
 * Update SEO page
 */
export function useUpdateSeoPage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ pageId, projectId, data }) => {
      const response = await seoApi.updatePage(pageId, data)
      return { ...(response.data || response), projectId }
    },
    onMutate: async ({ pageId, projectId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: seoKeys.pageDetail(pageId) })
      
      // Snapshot previous value
      const previousPage = queryClient.getQueryData(seoKeys.pageDetail(pageId))
      
      // Optimistically update
      queryClient.setQueryData(seoKeys.pageDetail(pageId), (old) => ({
        ...old,
        ...data,
        _optimistic: true,
      }))
      
      return { previousPage }
    },
    onError: (err, { pageId }, context) => {
      // Rollback on error
      if (context?.previousPage) {
        queryClient.setQueryData(seoKeys.pageDetail(pageId), context.previousPage)
      }
    },
    onSettled: (_, __, { pageId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.pageDetail(pageId) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: seoKeys.pages(projectId) })
      }
    },
  })
}

/**
 * Bulk update SEO pages
 */
export function useBulkUpdateSeoPages() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, pageIds, updates }) => {
      const response = await seoApi.bulkUpdatePages(projectId, { pageIds, ...updates })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.pages(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch SEO opportunities
 */
export function useSeoOpportunities(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: seoKeys.opportunitiesList(projectId, filters),
    queryFn: async () => {
      const { page = 1, limit = 50, status, category, priority } = filters
      const response = await seoApi.getOpportunities(projectId, { page, limit, status, category, priority })
      return {
        opportunities: response.opportunities || response.data || [],
        pagination: {
          page: response.page || page,
          limit: response.limit || limit,
          total: response.total || 0,
          totalPages: response.totalPages || Math.ceil((response.total || 0) / limit),
        },
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Fetch opportunities summary
 */
export function useSeoOpportunitiesSummary(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.opportunitiesSummary(projectId),
    queryFn: async () => {
      const response = await seoApi.getOpportunitiesSummary(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Update opportunity status
 */
export function useUpdateSeoOpportunity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ opportunityId, projectId, data }) => {
      const response = await seoApi.updateOpportunity(opportunityId, data)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.opportunities(projectId) })
    },
  })
}

/**
 * Apply opportunity (execute the fix)
 */
export function useApplySeoOpportunity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ opportunityId, projectId }) => {
      const response = await seoApi.applyOpportunity(opportunityId)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.opportunities(projectId) })
      queryClient.invalidateQueries({ queryKey: seoKeys.pages(projectId) })
    },
  })
}

/**
 * Dismiss opportunity
 */
export function useDismissSeoOpportunity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ opportunityId, projectId, reason }) => {
      const response = await seoApi.dismissOpportunity(opportunityId, reason)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.opportunities(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SEARCH CONSOLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch GSC overview
 */
export function useGscOverview(projectId, dateRange = '28d', options = {}) {
  return useQuery({
    queryKey: seoKeys.gscOverview(projectId),
    queryFn: async () => {
      const response = await seoApi.getGscOverview(projectId, { dateRange })
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  })
}

/**
 * Fetch GSC queries
 */
export function useGscQueries(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: seoKeys.gscQueries(projectId, filters),
    queryFn: async () => {
      const { page = 1, limit = 100, dateRange = '28d' } = filters
      const response = await seoApi.getGscQueries(projectId, { page, limit, dateRange })
      return {
        queries: response.queries || response.data || [],
        pagination: {
          page: response.page || page,
          limit: response.limit || limit,
          total: response.total || 0,
        },
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  })
}

/**
 * Fetch striking distance queries (positions 11-30)
 */
export function useStrikingQueries(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.strikingQueries(projectId),
    queryFn: async () => {
      const response = await seoApi.getStrikingQueries(projectId)
      return response.queries || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA MARKUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch schema markup for project
 */
export function useSeoSchema(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.schema(projectId),
    queryFn: async () => {
      const response = await seoApi.getSchema(projectId)
      return response.schemas || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Create/update schema markup
 */
export function useUpsertSeoSchema() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, pageId, schemaType, schema }) => {
      const response = await seoApi.upsertSchema(projectId, { pageId, schemaType, schema })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.schema(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch managed FAQs
 */
export function useSeoFaqs(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.faqs(projectId),
    queryFn: async () => {
      const response = await seoApi.getFaqs(projectId)
      return response.faqs || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Create FAQ
 */
export function useCreateSeoFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, question, answer, pageId }) => {
      const response = await seoApi.createFaq(projectId, { question, answer, pageId })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.faqs(projectId) })
    },
  })
}

/**
 * Update FAQ
 */
export function useUpdateSeoFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ faqId, projectId, data }) => {
      const response = await seoApi.updateFaq(faqId, data)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.faqs(projectId) })
    },
  })
}

/**
 * Delete FAQ
 */
export function useDeleteSeoFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ faqId, projectId }) => {
      await seoApi.deleteFaq(faqId)
      return { faqId, projectId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.faqs(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// REDIRECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch redirects
 */
export function useSeoRedirects(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.redirects(projectId),
    queryFn: async () => {
      const response = await seoApi.getRedirects(projectId)
      return response.redirects || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Create redirect
 */
export function useCreateSeoRedirect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, fromPath, toPath, type = 301 }) => {
      const response = await seoApi.createRedirect(projectId, { fromPath, toPath, type })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.redirects(projectId) })
    },
  })
}

/**
 * Delete redirect
 */
export function useDeleteSeoRedirect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ redirectId, projectId }) => {
      await seoApi.deleteRedirect(redirectId)
      return { redirectId, projectId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.redirects(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL LINKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch internal links
 */
export function useSeoLinks(projectId, options = {}) {
  return useQuery({
    queryKey: seoKeys.links(projectId),
    queryFn: async () => {
      const response = await seoApi.getLinks(projectId)
      return response.links || response.data || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Create internal link
 */
export function useCreateSeoLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, sourcePageId, targetPageId, anchorText }) => {
      const response = await seoApi.createLink(projectId, { sourcePageId, targetPageId, anchorText })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.links(projectId) })
    },
  })
}

/**
 * Approve/reject internal link
 */
export function useUpdateSeoLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ linkId, projectId, status }) => {
      const response = await seoApi.updateLink(linkId, { status })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.links(projectId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI / SIGNAL INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate AI SEO recommendations
 */
export function useGenerateSeoRecommendations() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, pageId }) => {
      const response = await signalSeoApi.generateRecommendations(projectId, pageId)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.opportunities(projectId) })
    },
  })
}

/**
 * Run SEO audit
 */
export function useRunSeoAudit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId }) => {
      const response = await seoApi.runAudit(projectId)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: seoKeys.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOG BRAIN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch blog topic recommendations from Signal
 */
export function useBlogTopicRecommendations(projectId, options = {}) {
  return useQuery({
    queryKey: [...seoKeys.all, 'blogTopics', projectId],
    queryFn: async () => {
      const response = await signalSeoApi.getBlogTopicRecommendations(projectId)
      const data = response.data || response
      return data.recommendations?.topics || data.topics || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  })
}

/**
 * Analyze a single blog post
 */
export function useAnalyzeBlogPost() {
  return useMutation({
    mutationFn: async ({ postId, projectId }) => {
      const response = await seoApi.analyzeBlogPost(postId, projectId)
      return response.data || response
    },
  })
}

/**
 * Analyze all blog posts for a project
 */
export function useAnalyzeAllBlogPosts() {
  return useMutation({
    mutationFn: async ({ projectId }) => {
      const response = await seoApi.analyzeAllBlogPosts(projectId)
      return response.data || response
    },
  })
}

/**
 * Fix em-dashes in all blog posts
 */
export function useFixBlogPostEmDashes() {
  return useMutation({
    mutationFn: async ({ projectId }) => {
      const response = await seoApi.fixAllBlogPostEmDashes(projectId)
      return response.data || response
    },
  })
}

/**
 * Optimize a blog post
 */
export function useOptimizeBlogPost() {
  return useMutation({
    mutationFn: async ({ postId, projectId, options = {} }) => {
      const response = await seoApi.optimizeBlogPost(postId, projectId, options)
      return response.data || response
    },
  })
}

/**
 * Add citations to a blog post
 */
export function useAddBlogPostCitations() {
  return useMutation({
    mutationFn: async ({ postId, applyChanges = false }) => {
      const response = await seoApi.addBlogPostCitations(postId, applyChanges)
      return response.data || response
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNICAL SEO / CORE WEB VITALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch Core Web Vitals summary
 */
export function useCwvSummary(projectId, options = {}) {
  return useQuery({
    queryKey: [...seoKeys.all, 'cwvSummary', projectId],
    queryFn: async () => {
      const response = await seoApi.getCwvSummary(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Fetch Core Web Vitals history
 */
export function useCwvHistory(projectId, options = {}) {
  return useQuery({
    queryKey: [...seoKeys.all, 'cwvHistory', projectId, options],
    queryFn: async () => {
      const response = await seoApi.getCwvHistory(projectId, options)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  })
}

/**
 * Run a CWV/Lighthouse audit
 */
export function useRunCwvAudit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, url }) => {
      const response = await seoApi.runCwvAudit(projectId, url)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...seoKeys.all, 'cwvSummary', projectId] })
      queryClient.invalidateQueries({ queryKey: [...seoKeys.all, 'cwvHistory', projectId] })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL SEO / ENTITY HEALTH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch GBP entity health scores
 */
export function useEntityHealth(projectId, options = {}) {
  return useQuery({
    queryKey: [...seoKeys.all, 'entityHealth', projectId],
    queryFn: async () => {
      const response = await seoApi.analyzeGbpEntityHealth(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    ...options,
  })
}

/**
 * Refresh entity health analysis
 */
export function useRefreshEntityHealth() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId }) => {
      const response = await seoApi.analyzeGbpEntityHealth(projectId, { refresh: true })
      return { ...(response.data || response), projectId }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...seoKeys.all, 'entityHealth', projectId] })
    },
  })
}
