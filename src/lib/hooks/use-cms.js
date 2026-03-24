/**
 * CMS Query Hooks
 *
 * TanStack Query hooks for the CMS module (Sanity Content Lake).
 * Handles CMS enablement, pages, sections, publish/unpublish, and assets.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsApi } from '../sonor-api'
import { siteKeys } from './use-site'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const cmsKeys = {
  all: ['cms'],
  status: (projectId) => [...cmsKeys.all, 'status', projectId],
  pages: (projectId) => [...cmsKeys.all, 'pages', projectId],
  page: (id) => [...cmsKeys.all, 'page', id],
  templates: (projectId) => [...cmsKeys.all, 'templates', projectId],
  template: (id) => [...cmsKeys.all, 'template', id],
  revisions: (pageId) => [...cmsKeys.all, 'revisions', pageId],
}

// ═══════════════════════════════════════════════════════════════════════════
// CMS STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch CMS connection status for a project
 */
export function useCmsStatus(projectId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.status(projectId),
    queryFn: () => cmsApi.getStatus(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// ENABLEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enable CMS for the current organization
 */
export function useEnableCms() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => cmsApi.enable(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.all })
    },
  })
}

/**
 * Link an external Sanity project
 */
export function useLinkCms() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => cmsApi.link(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List CMS pages for a project
 */
export function useCmsPages(projectId, params = {}, options = {}) {
  return useQuery({
    queryKey: [...cmsKeys.pages(projectId), params],
    queryFn: () => cmsApi.listPages(projectId, params),
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Get a single CMS page with full Sanity content
 */
export function useCmsPage(id, options = {}) {
  return useQuery({
    queryKey: cmsKeys.page(id),
    queryFn: () => cmsApi.getPage(id),
    enabled: !!id,
    ...options,
  })
}

/**
 * Create a new CMS page
 */
export function useCreateCmsPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => cmsApi.createPage(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.pages(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: cmsKeys.status(variables.projectId) })
    },
  })
}

/**
 * Update a CMS page
 */
export function useUpdateCmsPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => cmsApi.updatePage(id, data),
    onSuccess: (result, { id, projectId }) => {
      queryClient.setQueryData(cmsKeys.page(id), result)
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.pages(projectId) })
      }
    },
  })
}

/**
 * Delete a CMS page and its sections
 */
export function useDeleteCmsPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }) => cmsApi.deletePage(id),
    onSuccess: (_, { id, projectId }) => {
      queryClient.removeQueries({ queryKey: cmsKeys.page(id) })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.pages(projectId) })
        queryClient.invalidateQueries({ queryKey: cmsKeys.status(projectId) })
      }
      // Also invalidate site pages since CMS pages show in the Website sidebar
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: siteKeys.pages(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLISH / UNPUBLISH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Publish a CMS page
 */
export function usePublishCmsPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }) => cmsApi.publishPage(id),
    onSuccess: (result, { id, projectId }) => {
      queryClient.setQueryData(cmsKeys.page(id), result)
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.pages(projectId) })
      }
    },
  })
}

/**
 * Unpublish a CMS page
 */
export function useUnpublishCmsPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }) => cmsApi.unpublishPage(id),
    onSuccess: (result, { id, projectId }) => {
      queryClient.setQueryData(cmsKeys.page(id), result)
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.pages(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add a section to a CMS page
 */
export function useAddCmsSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, data }) => cmsApi.addSection(pageId, data),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.page(pageId) })
    },
  })
}

/**
 * Update a section on a CMS page
 */
export function useUpdateCmsSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, sectionId, data }) =>
      cmsApi.updateSection(pageId, sectionId, data),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.page(pageId) })
    },
  })
}

/**
 * Delete a section from a CMS page
 */
export function useDeleteCmsSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, sectionId }) =>
      cmsApi.deleteSection(pageId, sectionId),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.page(pageId) })
    },
  })
}

/**
 * Reorder sections on a CMS page
 */
export function useReorderCmsSections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, sectionIds }) =>
      cmsApi.reorderSections(pageId, sectionIds),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.page(pageId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upload an asset to Sanity
 */
export function useUploadCmsAsset() {
  return useMutation({
    mutationFn: (file) => cmsApi.uploadAsset(file),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List templates for a project
 */
export function useCmsTemplates(projectId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.templates(projectId),
    queryFn: () => cmsApi.listTemplates(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    ...options,
  })
}

/**
 * Get a single template with resolved sections
 */
export function useCmsTemplate(templateId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.template(templateId),
    queryFn: () => cmsApi.getTemplate(templateId),
    enabled: !!templateId,
    ...options,
  })
}

/**
 * Save a CMS page as a template
 */
export function useSaveAsTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, name }) => cmsApi.saveAsTemplate(pageId, name),
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.templates(projectId) })
      }
    },
  })
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId }) => cmsApi.deleteTemplate(templateId),
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.templates(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// REVISION HISTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get revision history for a CMS page
 */
export function useCmsPageRevisions(pageId, options = {}) {
  return useQuery({
    queryKey: cmsKeys.revisions(pageId),
    queryFn: () => cmsApi.getPageRevisions(pageId),
    enabled: !!pageId,
    ...options,
  })
}

/**
 * Restore a page to a previous revision
 */
export function useRestoreRevision() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, rev }) => cmsApi.restoreRevision(pageId, rev),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: cmsKeys.page(pageId) })
      queryClient.invalidateQueries({ queryKey: cmsKeys.revisions(pageId) })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT IMPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Import a page from a URL into CMS
 */
export function useImportFromUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, url }) => cmsApi.importFromUrl(projectId, url),
    onSuccess: (_, { projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: cmsKeys.pages(projectId) })
        queryClient.invalidateQueries({ queryKey: cmsKeys.status(projectId) })
      }
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register Sanity schemas for Content Lake validation
 */
export function useRegisterCmsSchemas() {
  return useMutation({
    mutationFn: () => cmsApi.registerSchemas(),
  })
}
