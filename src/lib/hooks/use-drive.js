/**
 * Drive Query Hooks
 * 
 * TanStack Query hooks for Google Drive integration.
 * Replaces drive-store.js with automatic caching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { driveApi } from '../sonor-api'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const driveKeys = {
  all: ['drive'],
  files: () => [...driveKeys.all, 'files'],
  filesList: (folderId, pageToken) => [...driveKeys.files(), 'list', folderId, pageToken],
  file: (id) => [...driveKeys.files(), 'detail', id],
  rootFolder: () => [...driveKeys.all, 'rootFolder'],
}

// ═══════════════════════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch files in a folder
 */
export function useDriveFiles(folderId = null, options = {}) {
  return useQuery({
    queryKey: driveKeys.filesList(folderId, null),
    queryFn: async () => {
      const params = { 
        folderId: folderId ?? undefined, 
        pageSize: options.pageSize ?? 50,
      }
      const response = await driveApi.listFiles(params)
      const data = response.data || response
      return {
        files: data.files || [],
        nextPageToken: data.nextPageToken,
        rootFolderId: data.rootFolderId,
        currentFolder: data.currentFolder ?? folderId,
      }
    },
    ...options,
  })
}

/**
 * Create folder
 */
export function useCreateDriveFolder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, parentId }) => {
      const response = await driveApi.createFolder({ name, parentId })
      return response.data || response
    },
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: driveKeys.filesList(parentId, null) })
    },
  })
}

/**
 * Upload file to Drive
 */
export function useUploadDriveFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ file, folderId, onProgress }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (folderId) formData.append('folderId', folderId)
      
      const response = await driveApi.uploadFile(formData, {
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      })
      return response.data || response
    },
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: driveKeys.filesList(folderId, null) })
    },
  })
}

/**
 * Delete file
 */
export function useDeleteDriveFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, folderId }) => {
      await driveApi.deleteFile(fileId)
      return { fileId, folderId }
    },
    onSuccess: ({ folderId }) => {
      queryClient.invalidateQueries({ queryKey: driveKeys.filesList(folderId, null) })
    },
  })
}

/**
 * Rename file
 */
export function useRenameDriveFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, newName, folderId }) => {
      const response = await driveApi.renameFile(fileId, newName)
      return { ...(response.data || response), folderId }
    },
    onSuccess: ({ folderId }) => {
      queryClient.invalidateQueries({ queryKey: driveKeys.filesList(folderId, null) })
    },
  })
}

/**
 * Move file to another folder
 */
export function useMoveDriveFile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ fileId, fromFolderId, toFolderId }) => {
      const response = await driveApi.moveFile(fileId, toFolderId)
      return { ...(response.data || response), fromFolderId, toFolderId }
    },
    onSuccess: ({ fromFolderId, toFolderId }) => {
      queryClient.invalidateQueries({ queryKey: driveKeys.filesList(fromFolderId, null) })
      queryClient.invalidateQueries({ queryKey: driveKeys.filesList(toFolderId, null) })
    },
  })
}

/**
 * Get file download URL
 */
export function useDriveFileUrl(fileId, options = {}) {
  return useQuery({
    queryKey: driveKeys.file(fileId),
    queryFn: async () => {
      const response = await driveApi.getFileUrl(fileId)
      return response.data?.url || response.url
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  })
}
