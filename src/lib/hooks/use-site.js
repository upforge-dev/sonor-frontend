/**
 * Site Management Query Hooks
 * 
 * TanStack Query hooks for Website/Site Management module.
 * Replaces site-management-store.js with automatic caching.
 * Handles pages, images, redirects, FAQs, content, links, scripts, and schema.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '../sonor-api'

// View types (exported for components)
export const SITE_VIEWS = {
  PAGES: 'pages',
  IMAGES: 'images',
  REDIRECTS: 'redirects',
  FAQS: 'faqs',
  CONTENT: 'content',
  LINKS: 'links',
  SCRIPTS: 'scripts',
  SCHEMA: 'schema',
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const siteKeys = {
  all: ['site'],
  stats: (projectId) => [...siteKeys.all, 'stats', projectId],
  pages: (projectId) => [...siteKeys.all, 'pages', projectId],
  pageDetail: (id) => [...siteKeys.all, 'pageDetail', id],
  images: (projectId, pagePath) => [...siteKeys.all, 'images', projectId, pagePath ?? 'all'],
  redirects: (projectId) => [...siteKeys.all, 'redirects', projectId],
  faqs: (projectId) => [...siteKeys.all, 'faqs', projectId],
  content: (projectId) => [...siteKeys.all, 'content', projectId],
  links: (projectId) => [...siteKeys.all, 'links', projectId],
  scripts: (projectId) => [...siteKeys.all, 'scripts', projectId],
  schema: (projectId) => [...siteKeys.all, 'schema', projectId],
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch site stats
 */
export function useSiteStats(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.stats(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/stats`)
      return response.data?.stats || response.data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch pages
 */
export function useSitePages(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.pages(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/pages`)
      return response.data?.pages || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch single page
 */
export function useSitePage(projectId, id, options = {}) {
  return useQuery({
    queryKey: siteKeys.pageDetail(id),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/pages/${id}`)
      return response.data?.page || response.data
    },
    enabled: !!id && !!projectId,
    ...options,
  })
}

/**
 * Create page
 */
export function useCreateSitePage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/pages`, data)
      return response.data?.page || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.pages(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update page
 */
export function useUpdateSitePage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/projects/${projectId}/site/pages/${id}`, data)
      return { ...(response.data?.page || response.data), projectId }
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(siteKeys.pageDetail(id), data)
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.pages(data.projectId) })
      }
    },
  })
}

/**
 * Delete page
 */
export function useDeleteSitePage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/projects/${projectId}/site/pages/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.removeQueries({ queryKey: siteKeys.pageDetail(id) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.pages(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch images (optionally filtered by page_path for SEO page detail)
 */
export function useSiteImages(projectId, options = {}) {
  const pagePath = options?.page_path ?? options?.pagePath
  return useQuery({
    queryKey: siteKeys.images(projectId, pagePath),
    queryFn: async () => {
      const params = pagePath != null && pagePath !== '' ? { page_path: pagePath } : {}
      const response = await portalApi.get(`/projects/${projectId}/site/images`, { params })
      return response.data?.images || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Update image
 */
export function useUpdateSiteImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/projects/${projectId}/site/images/${id}`, data)
      return { ...(response.data?.image || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'site' &&
            query.queryKey[1] === 'images' &&
            query.queryKey[2] === data.projectId,
        })
      }
    },
  })
}

/**
 * Create image slot
 */
export function useCreateSiteImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/images`, data)
      return response.data?.image || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.images(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Delete image
 */
export function useDeleteSiteImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/projects/${projectId}/site/images/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.images(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// REDIRECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch redirects
 */
export function useSiteRedirects(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.redirects(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/redirects`)
      return response.data?.redirects || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create redirect
 */
export function useCreateSiteRedirect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/redirects`, data)
      return response.data?.redirect || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.redirects(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update redirect
 */
export function useUpdateSiteRedirect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/projects/${projectId}/site/redirects/${id}`, data)
      return { ...(response.data?.redirect || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.redirects(data.projectId) })
      }
    },
  })
}

/**
 * Delete redirect
 */
export function useDeleteSiteRedirect() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/projects/${projectId}/site/redirects/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.redirects(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch FAQs
 */
export function useSiteFaqs(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.faqs(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/faqs`)
      return response.data?.faqs || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create FAQ
 */
export function useCreateSiteFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/faqs`, data)
      return response.data?.faq || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.faqs(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update FAQ
 */
export function useUpdateSiteFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/projects/${projectId}/site/faqs/${id}`, data)
      return { ...(response.data?.faq || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.faqs(data.projectId) })
      }
    },
  })
}

/**
 * Delete FAQ
 */
export function useDeleteSiteFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/projects/${projectId}/site/faqs/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.faqs(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch content
 */
export function useSiteContent(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.content(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/content`)
      return response.data?.content || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create content
 */
export function useCreateSiteContent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/content`, data)
      return response.data?.content || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.content(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update content
 */
export function useUpdateSiteContent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/sites/content/${id}`, data)
      return { ...(response.data?.content || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.content(data.projectId) })
      }
    },
  })
}

/**
 * Delete content
 */
export function useDeleteSiteContent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/sites/content/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.content(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// LINKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch links
 */
export function useSiteLinks(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.links(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/links`)
      return response.data?.links || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create link
 */
export function useCreateSiteLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/links`, data)
      return response.data?.link || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.links(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update link
 */
export function useUpdateSiteLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/sites/links/${id}`, data)
      return { ...(response.data?.link || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.links(data.projectId) })
      }
    },
  })
}

/**
 * Delete link
 */
export function useDeleteSiteLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/sites/links/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.links(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

/**
 * Approve link (for AI-suggested links)
 */
export function useApproveSiteLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      const response = await portalApi.put(`/sites/links/${id}`, { approved_at: new Date().toISOString() })
      return { ...(response.data?.link || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.links(data.projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch scripts
 */
export function useSiteScripts(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.scripts(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/scripts`)
      return response.data?.scripts || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create script
 */
export function useCreateSiteScript() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/scripts`, data)
      return response.data?.script || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.scripts(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update script
 */
export function useUpdateSiteScript() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/sites/scripts/${id}`, data)
      return { ...(response.data?.script || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.scripts(data.projectId) })
      }
    },
  })
}

/**
 * Delete script
 */
export function useDeleteSiteScript() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/sites/scripts/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.scripts(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch schema
 */
export function useSiteSchema(projectId, options = {}) {
  return useQuery({
    queryKey: siteKeys.schema(projectId),
    queryFn: async () => {
      const response = await portalApi.get(`/projects/${projectId}/site/schema`)
      return response.data?.schema || response.data || []
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Create schema
 */
export function useCreateSiteSchema() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, data }) => {
      const response = await portalApi.post(`/projects/${projectId}/site/schema`, data)
      return response.data?.schema || response.data
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.schema(projectId) })
      queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
    },
  })
}

/**
 * Update schema (bulk)
 */
export function useUpdateSiteSchema() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, schema }) => {
      const response = await portalApi.put(`/projects/${projectId}/site/schema`, { schema })
      return response.data?.schema || response.data
    },
    onSuccess: (data, { projectId }) => {
      queryClient.setQueryData(siteKeys.schema(projectId), data)
    },
  })
}

/**
 * Update single schema item
 */
export function useUpdateSiteSchemaItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId, data }) => {
      const response = await portalApi.put(`/sites/schema/${id}`, data)
      return { ...(response.data?.schema || response.data), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.schema(data.projectId) })
      }
    },
  })
}

/**
 * Delete schema
 */
export function useDeleteSiteSchema() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, projectId }) => {
      await portalApi.delete(`/sites/schema/${id}`)
      return { id, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.schema(projectId) })
        queryClient.invalidateQueries({ queryKey: siteKeys.stats(projectId) })
      }
    },
  })
}
