/**
 * SEO Pages React Query Hooks
 * 
 * Provides optimistic updates, automatic refetching, and cache management
 * for SEO pages using React Query.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { seoApi } from '../../lib/portal-api'

// Query keys
export const seoPageKeys = {
  all: ['seo', 'pages'] as const,
  lists: () => [...seoPageKeys.all, 'list'] as const,
  list: (projectId: string, filters?: any) => 
    [...seoPageKeys.lists(), { projectId, ...filters }] as const,
  details: () => [...seoPageKeys.all, 'detail'] as const,
  detail: (id: string) => [...seoPageKeys.details(), id] as const,
}

interface UseSeoPageOptions {
  page?: number
  limit?: number
  status?: string
  search?: string
}

/** Normalize API response so .pages is always an array (handles Axios response.data wrapper). */
function normalizePagesResponse(raw: any) {
  const body = raw?.data ?? raw
  const pages = body?.pages ?? body?.data
  return {
    pages: Array.isArray(pages) ? pages : (Array.isArray(body) ? body : []),
    page: body?.page ?? 1,
    total: body?.total ?? 0,
    limit: body?.limit ?? 50,
    totalPages: body?.totalPages ?? 1,
  }
}

/** Coerce cache value to pages array (handles both normalized shape and legacy raw response). */
function toPagesArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (val && Array.isArray(val.pages)) return val.pages
  return []
}

/**
 * Fetch SEO pages for a project with pagination
 */
export function useSeoPages(projectId: string, options: UseSeoPageOptions = {}) {
  const { page = 1, limit = 50, status, search } = options

  return useQuery({
    queryKey: seoPageKeys.list(projectId, { page, limit, status, search }),
    queryFn: async () => {
      const res = await seoApi.getPages(projectId, { page, limit, status, search })
      return normalizePagesResponse(res)
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true, // Keep old data while fetching new page
  })
}

/**
 * Infinite scroll/pagination for SEO pages
 */
export function useSeoInfinitePages(projectId: string, options: Omit<UseSeoPageOptions, 'page'> = {}) {
  const { limit = 50, status, search } = options

  return useInfiniteQuery({
    queryKey: seoPageKeys.list(projectId, { limit, status, search }),
    queryFn: async ({ pageParam = 1 }) => {
      const res = await seoApi.getPages(projectId, { page: pageParam, limit, status, search })
      return normalizePagesResponse(res)
    },
    enabled: !!projectId,
    getNextPageParam: (lastPage: any) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch a single SEO page by ID (backend route is GET /seo/pages/:pageId)
 */
export function useSeoPage(projectId: string, pageId: string) {
  return useQuery({
    queryKey: seoPageKeys.detail(pageId),
    queryFn: async () => {
      const res = await seoApi.getPage(pageId)
      return (res as any)?.data ?? res
    },
    enabled: !!pageId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Create a new SEO page
 */
export function useCreateSeoPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pageData }: { projectId: string; pageData: any }) =>
      seoApi.createPage(projectId, pageData),
    onSuccess: (newPage, variables) => {
      // Invalidate and refetch pages list
      queryClient.invalidateQueries({ 
        queryKey: seoPageKeys.lists() 
      })
      // Add to cache
      queryClient.setQueryData(seoPageKeys.detail(newPage.id), newPage)
    },
  })
}

/**
 * Update an SEO page with optimistic updates
 */
export function useUpdateSeoPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, updates }: { pageId: string; updates: any }) =>
      seoApi.updatePage(pageId, updates),
    onMutate: async ({ pageId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: seoPageKeys.detail(pageId) })

      // Snapshot previous value
      const previous = queryClient.getQueryData(seoPageKeys.detail(pageId))

      // Optimistically update detail
      queryClient.setQueryData(seoPageKeys.detail(pageId), (old: any) => ({
        ...old,
        ...updates,
      }))

      // Optimistically update in lists
      queryClient.setQueriesData(
        { queryKey: seoPageKeys.lists() },
        (old: any) => {
          const pages = toPagesArray(old?.pages ?? old?.data)
          if (pages.length === 0 && !old?.pages && !old?.data) return old
          const updated = pages.map((p: any) =>
            p.id === pageId ? { ...p, ...updates } : p
          )
          return { ...old, pages: updated, data: updated }
        }
      )

      return { previous, pageId }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          seoPageKeys.detail(context.pageId),
          context.previous
        )
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: seoPageKeys.detail(variables.pageId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoPageKeys.lists() 
      })
    },
  })
}

/**
 * Bulk update multiple SEO pages
 */
export function useBulkUpdateSeoPages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pageIds, updates }: { projectId: string; pageIds: string[]; updates: any }) =>
      seoApi.bulkUpdatePages(projectId, { pageIds, ...updates }),
    onMutate: async ({ pageIds, updates }) => {
      // Cancel outgoing refetches
      await Promise.all(
        pageIds.map(id => 
          queryClient.cancelQueries({ queryKey: seoPageKeys.detail(id) })
        )
      )

      // Snapshot previous values
      const previousPages = pageIds.map(id => ({
        id,
        data: queryClient.getQueryData(seoPageKeys.detail(id)),
      }))

      // Optimistically update all pages
      pageIds.forEach(id => {
        queryClient.setQueryData(seoPageKeys.detail(id), (old: any) => ({
          ...old,
          ...updates,
        }))
      })

      // Optimistically update in lists
      queryClient.setQueriesData(
        { queryKey: seoPageKeys.lists() },
        (old: any) => {
          const pages = toPagesArray(old?.pages ?? old?.data)
          if (pages.length === 0 && !old?.pages && !old?.data) return old
          const updated = pages.map((p: any) =>
            pageIds.includes(p.id) ? { ...p, ...updates } : p
          )
          return { ...old, pages: updated, data: updated }
        }
      )

      return { previousPages, pageIds }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPages) {
        context.previousPages.forEach(({ id, data }) => {
          if (data) {
            queryClient.setQueryData(seoPageKeys.detail(id), data)
          }
        })
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      variables.pageIds.forEach(id => {
        queryClient.invalidateQueries({ 
          queryKey: seoPageKeys.detail(id) 
        })
      })
      queryClient.invalidateQueries({ 
        queryKey: seoPageKeys.lists() 
      })
    },
  })
}

/**
 * Delete an SEO page
 */
export function useDeleteSeoPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pageId: string) => seoApi.deletePage(pageId),
    onMutate: async (pageId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: seoPageKeys.detail(pageId) })

      // Snapshot previous value
      const previous = queryClient.getQueryData(seoPageKeys.detail(pageId))

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: seoPageKeys.detail(pageId) })

      // Optimistically remove from lists
      queryClient.setQueriesData(
        { queryKey: seoPageKeys.lists() },
        (old: any) => {
          const pages = toPagesArray(old?.pages ?? old?.data)
          if (pages.length === 0 && !old?.pages && !old?.data) return old
          const filtered = pages.filter((p: any) => p.id !== pageId)
          return {
            ...old,
            pages: filtered,
            data: filtered,
            total: (old.total || 0) - 1,
          }
        }
      )

      return { previous, pageId }
    },
    onError: (err, variables, context) => {
      // Restore on error
      if (context?.previous) {
        queryClient.setQueryData(
          seoPageKeys.detail(context.pageId),
          context.previous
        )
      }
    },
    onSettled: () => {
      // Refetch lists to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: seoPageKeys.lists() 
      })
    },
  })
}

// ============================================================================
// PAGE IMAGES HOOKS
// ============================================================================

export const pageImageKeys = {
  all: ['seo', 'page-images'] as const,
  byPage: (pageId: string) => [...pageImageKeys.all, 'page', pageId] as const,
  byPath: (projectId: string, pagePath: string) => [...pageImageKeys.all, 'path', projectId, pagePath] as const,
}

/**
 * Fetch all images discovered on a specific page
 */
export function usePageImages(projectId: string, pageId: string) {
  return useQuery({
    queryKey: pageImageKeys.byPage(pageId),
    queryFn: async () => {
      const res = await seoApi.getPageImages(projectId, pageId)
      return (res as any)?.data ?? res
    },
    enabled: !!projectId && !!pageId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Update a page image (e.g., apply optimized alt text)
 */
export function useUpdatePageImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pageId, imageId, updates }: { 
      projectId: string
      pageId: string
      imageId: string
      updates: {
        managed_alt?: string
        alt_quality_score?: number
        alt_applied_at?: string
      }
    }) => seoApi.updatePageImage(projectId, pageId, imageId, updates),
    onSuccess: (_, variables) => {
      // Invalidate page images
      queryClient.invalidateQueries({ 
        queryKey: pageImageKeys.byPage(variables.pageId) 
      })
      // Also invalidate the page itself (image counts may change)
      queryClient.invalidateQueries({ 
        queryKey: seoPageKeys.detail(variables.pageId) 
      })
    },
  })
}
