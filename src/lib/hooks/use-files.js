/**
 * Files Query Hooks
 * 
 * TanStack Query hooks for Files module.
 * Replaces files-store.js with automatic caching, deduplication, and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi } from '../sonor-api'
import { supabase } from '../supabase'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const filesKeys = {
  all: ['files'],
  list: (projectId, filters) => [...filesKeys.all, 'list', projectId, filters],
  folders: (projectId) => [...filesKeys.all, 'folders', projectId],
  categories: () => [...filesKeys.all, 'categories'],
  detail: (fileId) => [...filesKeys.all, 'detail', fileId],
}

// ═══════════════════════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch files list
 */
export function useFiles(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: filesKeys.list(projectId, filters),
    queryFn: async () => {
      const response = await filesApi.listFiles({ projectId, ...filters })
      const data = response.data || response
      return {
        files: data.files || data || [],
        pagination: data.pagination,
      }
    },
    enabled: !!projectId,
    ...options,
  })
}

/**
 * Fetch folders for a project
 */
export function useFolders(projectId, options = {}) {
  return useQuery({
    queryKey: filesKeys.folders(projectId),
    queryFn: async () => {
      const response = await filesApi.listFolders(projectId)
      const data = response.data || response
      return data.folders || []
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}

/**
 * Fetch file categories
 */
export function useFileCategories(options = {}) {
  return useQuery({
    queryKey: filesKeys.categories(),
    queryFn: async () => {
      const response = await filesApi.getCategories()
      const data = response.data || response
      return data.categories || data
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - categories don't change often
    ...options,
  })
}

/**
 * Upload file
 */
export function useUploadFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, file, category = 'general', isPublic = false, folderPath = null }) => {
      // Generate unique file ID and path
      const fileId = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const storagePath = `${category}/${fileId}.${ext}`
      
      // Upload directly to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(storagePath)
      
      // Register the file with the API
      const response = await filesApi.registerFile({
        fileId,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        storagePath,
        publicUrl: urlData.publicUrl,
        projectId,
        folderPath,
        category,
        isPublic
      })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.list(projectId, {}) })
      queryClient.invalidateQueries({ queryKey: filesKeys.folders(projectId) })
    },
  })
}

/**
 * Upload multiple files
 */
export function useUploadMultipleFiles() {
  const queryClient = useQueryClient()
  const uploadFile = useUploadFile()
  
  return useMutation({
    mutationFn: async ({ projectId, files, category = 'general', isPublic = false }) => {
      const results = await Promise.allSettled(
        files.map(file => 
          uploadFile.mutateAsync({ projectId, file, category, isPublic })
        )
      )
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value)
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason)
      
      return { successful, failed, total: files.length }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.list(projectId, {}) })
      queryClient.invalidateQueries({ queryKey: filesKeys.folders(projectId) })
    },
  })
}

/**
 * Update file metadata
 */
export function useUpdateFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, updates, projectId }) => {
      const response = await filesApi.updateFile(fileId, updates)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: filesKeys.list(data.projectId, {}) })
      }
    },
  })
}

/**
 * Delete file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, projectId }) => {
      await filesApi.deleteFile(fileId)
      return { fileId, projectId }
    },
    onSuccess: ({ projectId }) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: filesKeys.list(projectId, {}) })
        queryClient.invalidateQueries({ queryKey: filesKeys.folders(projectId) })
      }
    },
  })
}

/**
 * Move file to folder
 */
export function useMoveFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, targetFolder, projectId }) => {
      const response = await filesApi.moveFile(fileId, targetFolder)
      return { ...(response.data || response), projectId }
    },
    onSuccess: (data) => {
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: filesKeys.list(data.projectId, {}) })
      }
    },
  })
}

/**
 * Create folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, folderPath, folderName }) => {
      const response = await filesApi.createFolder(projectId, { folderPath, folderName })
      return response.data || response
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.folders(projectId) })
    },
  })
}

/**
 * Delete folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ projectId, folderPath }) => {
      await filesApi.deleteFolder(projectId, folderPath)
      return { projectId }
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.folders(projectId) })
      queryClient.invalidateQueries({ queryKey: filesKeys.list(projectId, {}) })
    },
  })
}
