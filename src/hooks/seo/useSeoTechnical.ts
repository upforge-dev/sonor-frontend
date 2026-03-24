/**
 * SEO Technical React Query Hooks
 * 
 * Manages technical SEO: schemas, internal links, indexing, CWV, backlinks, etc.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

// ============================================
// Query Keys
// ============================================

export const seoTechnicalKeys = {
  all: ['seo', 'technical'] as const,
  schemas: (projectId: string) => [...seoTechnicalKeys.all, 'schemas', projectId] as const,
  links: (projectId: string) => [...seoTechnicalKeys.all, 'links', projectId] as const,
  indexing: (projectId: string) => [...seoTechnicalKeys.all, 'indexing', projectId] as const,
  cwv: (projectId: string) => [...seoTechnicalKeys.all, 'cwv', projectId] as const,
  backlinks: (projectId: string) => [...seoTechnicalKeys.all, 'backlinks', projectId] as const,
  audit: (projectId: string) => [...seoTechnicalKeys.all, 'audit', projectId] as const,
  competitors: (projectId: string) => [...seoTechnicalKeys.all, 'competitors', projectId] as const,
  redirects: (projectId: string) => [...seoTechnicalKeys.all, 'redirects', projectId] as const,
}

// ============================================
// Schema Markup
// ============================================

export function useSeoSchemas(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.schemas(projectId),
    queryFn: () => seoApi.getSchemaStatus(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateSeoSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pageId, data }: { projectId: string; pageId: string; data: any }) =>
      seoApi.createSchema(pageId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.schemas(variables.projectId) 
      })
    },
  })
}

export function useDeleteSeoSchema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, schemaId }: { projectId: string; schemaId: string }) =>
      seoApi.deleteSchema(schemaId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.schemas(variables.projectId) 
      })
    },
  })
}

// ============================================
// Internal Links
// ============================================

export function useSeoInternalLinks(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.links(projectId),
    queryFn: () => seoApi.getInternalLinks(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateSeoInternalLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createInternalLink(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.links(variables.projectId) 
      })
    },
  })
}

// ============================================
// Indexing Issues
// ============================================

export function useSeoIndexingIssues(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.indexing(projectId),
    queryFn: () => seoApi.getIndexingIssues(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRequestIndexing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, url }: { projectId: string; url: string }) =>
      seoApi.requestIndexing(projectId, url),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.indexing(variables.projectId) 
      })
    },
  })
}

// ============================================
// Core Web Vitals
// ============================================

export function useSeoCWV(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.cwv(projectId),
    queryFn: () => seoApi.getCwvSummary(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

// ============================================
// Backlinks
// ============================================

export function useSeoBacklinks(projectId: string, options?: { limit?: number }) {
  return useQuery({
    queryKey: seoTechnicalKeys.backlinks(projectId),
    queryFn: () => seoApi.getBacklinks(projectId, options),
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // Backlinks change slowly
  })
}

// ============================================
// Technical Audit
// ============================================

export function useSeoAudit(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.audit(projectId),
    queryFn: () => seoApi.getTechnicalAudit(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useRunSeoAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.runTechnicalAudit(projectId),
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.audit(projectId) 
      })
    },
  })
}

// ============================================
// Competitors
// ============================================

export function useSeoCompetitors(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.competitors(projectId),
    queryFn: () => seoApi.getCompetitors(projectId),
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useAddSeoCompetitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, domain }: { projectId: string; domain: string }) =>
      seoApi.addCompetitor(projectId, domain),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.competitors(variables.projectId) 
      })
    },
  })
}

export function useAnalyzeCompetitor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, competitorId }: { projectId: string; competitorId: string }) =>
      seoApi.analyzeCompetitor(projectId, { competitorId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.competitors(variables.projectId) 
      })
    },
  })
}

// ============================================
// Redirects
// ============================================

export function useSeoRedirects(projectId: string) {
  return useQuery({
    queryKey: seoTechnicalKeys.redirects(projectId),
    queryFn: () => seoApi.getRedirects(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateSeoRedirect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createRedirect(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.redirects(variables.projectId) 
      })
    },
  })
}

// ============================================
// URL Inspection (Google Search Console)
// ============================================

export function useInspectUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, url }: { projectId: string; url: string }) =>
      seoApi.inspectUrl(projectId, url),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.indexing(variables.projectId) 
      })
    },
  })
}

export function useBulkInspectUrls() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, urls }: { projectId: string; urls: string[] }) =>
      seoApi.bulkInspectUrls(projectId, urls),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.indexing(variables.projectId) 
      })
    },
  })
}

// ============================================
// Indexing Status & Sitemaps
// ============================================

export function useSeoIndexingStatus(projectId: string, params?: { limit?: number }) {
  return useQuery({
    queryKey: [...seoTechnicalKeys.indexing(projectId), params],
    queryFn: () => seoApi.getIndexingStatus(projectId, params),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSeoIndexingSummary(projectId: string) {
  return useQuery({
    queryKey: [...seoTechnicalKeys.indexing(projectId), 'summary'],
    queryFn: () => seoApi.getIndexingSummary(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSeoSitemapsStatus(projectId: string) {
  return useQuery({
    queryKey: [...seoTechnicalKeys.all, 'sitemaps', projectId],
    queryFn: () => seoApi.getSitemapsStatus(projectId),
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // Sitemaps don't change often
  })
}

export function useAnalyzeIndexingIssues() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.analyzeIndexingIssues(projectId),
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoTechnicalKeys.indexing(projectId) 
      })
    },
  })
}
