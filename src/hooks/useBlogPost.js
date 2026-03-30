/**
 * React Query hooks for Blog Post detail view (Blog Command Center)
 *
 * Provides data fetching and mutations for the BlogPostDetail component.
 * Uses @tanstack/react-query for caching, deduplication, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blogApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const blogKeys = {
  all: ['blog'],
  posts: () => [...blogKeys.all, 'posts'],
  post: (id) => [...blogKeys.all, 'post', id],
  analytics: (id) => [...blogKeys.all, 'analytics', id],
  authors: (projectId) => [...blogKeys.all, 'authors', projectId],
  categories: (projectId) => [...blogKeys.all, 'categories', projectId],
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch a single blog post by ID
 */
export function useBlogPost(postId) {
  return useQuery({
    queryKey: blogKeys.post(postId),
    queryFn: async () => {
      const res = await blogApi.getPost(postId)
      return res.data
    },
    enabled: !!postId,
    staleTime: 30_000, // 30s — post data doesn't change frequently
  })
}

/**
 * Fetch post analytics (site-kit views + GSC metrics)
 */
export function useBlogPostAnalytics(postId) {
  return useQuery({
    queryKey: blogKeys.analytics(postId),
    queryFn: () => blogApi.getPostAnalytics(postId),
    enabled: !!postId,
    staleTime: 60_000, // 1 min — analytics data is less urgent
  })
}

/**
 * Fetch blog authors for a project
 */
export function useBlogAuthors(projectId) {
  return useQuery({
    queryKey: blogKeys.authors(projectId),
    queryFn: async () => {
      const result = await blogApi.listAuthors(projectId)
      // API returns { authors: [...], total: N } — unwrap to array
      return result?.authors || result || []
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000, // 5 min — authors rarely change
  })
}

/**
 * Fetch blog categories for a project
 */
export function useBlogCategories(projectId) {
  return useQuery({
    queryKey: blogKeys.categories(projectId),
    queryFn: async () => {
      const res = await blogApi.getCategories(projectId)
      const data = res.data || res
      // May return { categories: [...] } or plain array
      return Array.isArray(data) ? data : (data?.categories || data || [])
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  })
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update a blog post (partial update via PUT)
 * Invalidates post + posts list cache on success.
 */
export function useUpdateBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => blogApi.updatePost(id, data),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.post(id) })
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() })
      toast.success('Post saved')
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message || 'Unknown error'}`)
    },
  })
}

/**
 * Delete a blog post
 */
export function useDeleteBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => blogApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() })
      toast.success('Post deleted')
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message || 'Unknown error'}`)
    },
  })
}
