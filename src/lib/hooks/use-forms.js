/**
 * Forms Query Hooks
 * 
 * TanStack Query hooks for Forms module.
 * Replaces forms-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { formsApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const formsKeys = {
  all: ['forms'],
  list: (params) => [...formsKeys.all, 'list', params],
  detail: (id) => [...formsKeys.all, 'detail', id],
  submissions: () => [...formsKeys.all, 'submissions'],
  submissionsList: (params) => [...formsKeys.submissions(), 'list', params],
  submissionDetail: (id) => [...formsKeys.submissions(), 'detail', id],
  analytics: (formId) => [...formsKeys.all, 'analytics', formId],
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch forms list
 */
export function useForms(params = {}, options = {}) {
  return useQuery({
    queryKey: formsKeys.list(params),
    queryFn: async () => {
      const response = await formsApi.list(params)
      const data = response.data || response
      return data.forms || data
    },
    ...options,
  })
}

/**
 * Fetch single form
 */
export function useForm(formId, options = {}) {
  return useQuery({
    queryKey: formsKeys.detail(formId),
    queryFn: async () => {
      const response = await formsApi.get(formId)
      const data = response.data || response
      return data.form || data
    },
    enabled: !!formId,
    ...options,
  })
}

/**
 * Create form
 */
export function useCreateForm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formData) => {
      const response = await formsApi.create(formData)
      const data = response.data || response
      return data.form || data
    },
    onSuccess: (newForm) => {
      queryClient.setQueryData(formsKeys.detail(newForm.id), newForm)
      queryClient.invalidateQueries({ queryKey: formsKeys.all })
    },
  })
}

/**
 * Update form
 */
export function useUpdateForm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ formId, formData }) => {
      const response = await formsApi.update(formId, formData)
      const data = response.data || response
      return data.form || data
    },
    onSuccess: (updated, { formId }) => {
      queryClient.setQueryData(formsKeys.detail(formId), updated)
      queryClient.invalidateQueries({ queryKey: formsKeys.all })
    },
  })
}

/**
 * Delete form
 */
export function useDeleteForm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formId) => {
      await formsApi.delete(formId)
      return formId
    },
    onSuccess: (formId) => {
      queryClient.removeQueries({ queryKey: formsKeys.detail(formId) })
      queryClient.invalidateQueries({ queryKey: formsKeys.all })
    },
  })
}

/**
 * Duplicate form
 */
export function useDuplicateForm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (formId) => {
      const response = await formsApi.duplicate(formId)
      const data = response.data || response
      return data.form || data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formsKeys.all })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch submissions with pagination
 */
export function useSubmissions(params = {}, options = {}) {
  return useQuery({
    queryKey: formsKeys.submissionsList(params),
    queryFn: async () => {
      const requestParams = {
        formId: params.formId,
        status: params.status !== 'all' ? params.status : undefined,
        search: params.search || undefined,
        page: params.page || 1,
        limit: params.limit || 50,
        sortBy: params.sortBy || 'created_at',
        sortOrder: params.sortOrder || 'desc',
        projectId: params.projectId,
        tenantId: params.tenantId,
      }
      const response = await formsApi.listSubmissions(requestParams)
      const data = response.data || response
      return {
        submissions: data.submissions || [],
        pagination: data.pagination,
      }
    },
    ...options,
  })
}

/**
 * Fetch submissions with infinite scroll
 */
export function useInfiniteSubmissions(params = {}, options = {}) {
  return useInfiniteQuery({
    queryKey: [...formsKeys.submissionsList(params), 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const requestParams = {
        ...params,
        page: pageParam,
        limit: params.limit || 50,
      }
      const response = await formsApi.listSubmissions(requestParams)
      const data = response.data || response
      return {
        submissions: data.submissions || [],
        pagination: data.pagination,
        nextPage: data.pagination?.hasMore ? pageParam + 1 : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    ...options,
  })
}

/**
 * Fetch single submission
 */
export function useSubmission(submissionId, options = {}) {
  return useQuery({
    queryKey: formsKeys.submissionDetail(submissionId),
    queryFn: async () => {
      const response = await formsApi.getSubmission(submissionId)
      const data = response.data || response
      return data.submission || data
    },
    enabled: !!submissionId,
    ...options,
  })
}

/**
 * Update submission status
 */
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ submissionId, status }) => {
      const response = await formsApi.updateSubmissionStatus(submissionId, status)
      const data = response.data || response
      return data.submission || data
    },
    onSuccess: (updated, { submissionId }) => {
      queryClient.setQueryData(formsKeys.submissionDetail(submissionId), updated)
      queryClient.invalidateQueries({ queryKey: formsKeys.submissions() })
    },
  })
}

/**
 * Delete submission
 */
export function useDeleteSubmission() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (submissionId) => {
      await formsApi.deleteSubmission(submissionId)
      return submissionId
    },
    onSuccess: (submissionId) => {
      queryClient.removeQueries({ queryKey: formsKeys.submissionDetail(submissionId) })
      queryClient.invalidateQueries({ queryKey: formsKeys.submissions() })
    },
  })
}

/**
 * Bulk update submissions
 */
export function useBulkUpdateSubmissions() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ submissionIds, updates }) => {
      const response = await formsApi.bulkUpdateSubmissions(submissionIds, updates)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formsKeys.submissions() })
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch form analytics
 */
export function useFormAnalytics(formId, options = {}) {
  return useQuery({
    queryKey: formsKeys.analytics(formId),
    queryFn: async () => {
      const response = await formsApi.getAnalytics(formId)
      return response.data || response
    },
    enabled: !!formId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}
