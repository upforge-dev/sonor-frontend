/**
 * SEO Local React Query Hooks
 * 
 * Manages Local SEO: GBP, citations, geo pages, heatmaps, entity health.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

export const seoLocalKeys = {
  all: ['seo', 'local'] as const,
  geoPages: (projectId: string) => [...seoLocalKeys.all, 'geo-pages', projectId] as const,
  citations: (projectId: string) => [...seoLocalKeys.all, 'citations', projectId] as const,
  heatmap: (projectId: string) => [...seoLocalKeys.all, 'heatmap', projectId] as const,
  entityHealth: (projectId: string) => [...seoLocalKeys.all, 'entity-health', projectId] as const,
  gbpLocations: (projectId: string) => [...seoLocalKeys.all, 'gbp-locations', projectId] as const,
}

// ============================================
// Geo Pages
// ============================================

export function useSeoGeoPages(projectId: string) {
  return useQuery({
    queryKey: seoLocalKeys.geoPages(projectId),
    queryFn: async () => {
      const response = await seoApi.getGeoPages(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateGeoPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await seoApi.createGeoPage(projectId, data)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.geoPages(variables.projectId) 
      })
    },
  })
}

export function useGenerateGeoPages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, options }: { projectId: string; options?: any }) => {
      const response = await seoApi.generateGeoPages(projectId, options)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.geoPages(variables.projectId) 
      })
    },
  })
}

// ============================================
// Citations
// ============================================

export function useSeoCitations(projectId: string) {
  return useQuery({
    queryKey: seoLocalKeys.citations(projectId),
    queryFn: async () => {
      const response = await seoApi.getCitations(projectId)
      // Handle axios response - extract data array
      // API may return { citations: [...] } or { data: [...] } or just [...]
      const data = response?.data || response || []
      if (Array.isArray(data)) return data
      if (Array.isArray(data.citations)) return data.citations
      if (Array.isArray(data.data)) return data.data
      return []
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000, // Citations change slowly
  })
}

export function useScanCitations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await seoApi.scanCitations(projectId)
      return response.data || response
    },
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.citations(projectId) 
      })
    },
  })
}

// ============================================
// Ranking Heatmap
// ============================================

export function useSeoHeatmap(projectId: string, options?: { keyword?: string; location?: string }) {
  return useQuery({
    queryKey: seoLocalKeys.heatmap(projectId),
    queryFn: async () => {
      const response = await seoApi.getLocalHeatmap(projectId, options)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useRefreshHeatmap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, keyword }: { projectId: string; keyword: string }) => {
      const response = await seoApi.refreshLocalHeatmap(projectId, keyword)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.heatmap(variables.projectId) 
      })
    },
  })
}

// ============================================
// Entity Health
// ============================================

export function useSeoEntityHealth(projectId: string) {
  return useQuery({
    queryKey: seoLocalKeys.entityHealth(projectId),
    queryFn: async () => {
      const response = await seoApi.getEntityHealth(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

// ============================================
// GBP Locations
// ============================================

export function useSeoGbpLocations(projectId: string) {
  return useQuery({
    queryKey: seoLocalKeys.gbpLocations(projectId),
    queryFn: async () => {
      const response = await seoApi.getGbpLocations(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSyncGbpLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, locationId }: { projectId: string; locationId: string }) => {
      const response = await seoApi.syncGbpLocation(projectId, locationId)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.gbpLocations(variables.projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.entityHealth(variables.projectId) 
      })
    },
  })
}

// ============================================
// Local Grids (Heat Map Configuration)
// ============================================

export function useSeoLocalGrids(projectId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...seoLocalKeys.all, 'grids', projectId, params],
    queryFn: async () => {
      const response = await seoApi.getLocalGrids(projectId, params)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSeoLocalGrid(gridId: string) {
  return useQuery({
    queryKey: [...seoLocalKeys.all, 'grid', gridId],
    queryFn: async () => {
      const response = await seoApi.getLocalGrid(gridId)
      return response.data || response
    },
    enabled: !!gridId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLocalGrid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await seoApi.createLocalGrid(projectId, data)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'grids', variables.projectId] 
      })
    },
  })
}

export function useUpdateLocalGrid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gridId, data, projectId }: { gridId: string; data: any; projectId?: string }) => {
      const response = await seoApi.updateLocalGrid(gridId, data)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'grid', variables.gridId] 
      })
      if (variables.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: [...seoLocalKeys.all, 'grids', variables.projectId] 
        })
      }
    },
  })
}

export function useDeleteLocalGrid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gridId, projectId }: { gridId: string; projectId: string }) => {
      const response = await seoApi.deleteLocalGrid(gridId)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'grids', variables.projectId] 
      })
    },
  })
}

// ============================================
// Heat Map Data (Local Rankings)
// ============================================

export function useSeoHeatMapData(gridId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...seoLocalKeys.all, 'heat-map', gridId, params],
    queryFn: async () => {
      const response = await seoApi.getHeatMapData(gridId, params)
      return response.data || response
    },
    enabled: !!gridId,
    staleTime: 30 * 60 * 1000, // Rankings don't change quickly
  })
}

export function useSeoLocalRankings(gridId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...seoLocalKeys.all, 'rankings', gridId, params],
    queryFn: async () => {
      const response = await seoApi.getLocalRankings(gridId, params)
      return response.data || response
    },
    enabled: !!gridId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSaveLocalRankings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gridId, rankings }: { gridId: string; rankings: any[] }) => {
      const response = await seoApi.saveLocalRankings(gridId, rankings)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'rankings', variables.gridId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'heat-map', variables.gridId] 
      })
    },
  })
}

// ============================================
// Entity Scores (GBP Health)
// ============================================

export function useSeoEntityScore(projectId: string) {
  return useQuery({
    queryKey: [...seoLocalKeys.entityHealth(projectId), 'score'],
    queryFn: async () => {
      const response = await seoApi.getEntityScore(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSeoEntityScoreHistory(projectId: string, limit?: number) {
  return useQuery({
    queryKey: [...seoLocalKeys.entityHealth(projectId), 'history', limit],
    queryFn: async () => {
      const response = await seoApi.getEntityScoreHistory(projectId, limit)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useSaveEntityScore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await seoApi.saveEntityScore(projectId, data)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.entityHealth(variables.projectId) 
      })
    },
  })
}

// ============================================
// GBP Connection
// ============================================

export function useSeoGbpConnection(projectId: string) {
  return useQuery({
    queryKey: [...seoLocalKeys.all, 'gbp-connection', projectId],
    queryFn: async () => {
      const response = await seoApi.getGbpConnection(projectId)
      return response.data || response
    },
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreateGbpConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await seoApi.createGbpConnection(projectId, data)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'gbp-connection', variables.projectId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.gbpLocations(variables.projectId) 
      })
    },
  })
}

export function useUpdateGbpConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: any }) => {
      const response = await seoApi.updateGbpConnection(projectId, data)
      return response.data || response
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'gbp-connection', variables.projectId] 
      })
    },
  })
}

export function useDeleteGbpConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.deleteGbpConnection(projectId),
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'gbp-connection', projectId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.gbpLocations(projectId) 
      })
    },
  })
}

// ============================================
// Citations
// ============================================

export function useSeoLocalCitations(projectId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...seoLocalKeys.citations(projectId), params],
    queryFn: () => seoApi.getCitations(projectId, params),
    enabled: !!projectId,
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreateCitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createCitation(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.citations(variables.projectId) 
      })
    },
  })
}

export function useUpdateCitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ citationId, data, projectId }: { citationId: string; data: any; projectId: string }) =>
      seoApi.updateCitation(citationId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.citations(variables.projectId) 
      })
    },
  })
}

export function useDeleteCitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ citationId, projectId }: { citationId: string; projectId: string }) =>
      seoApi.deleteCitation(citationId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.citations(variables.projectId) 
      })
    },
  })
}

export function useCheckCitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ citationId, canonicalNap, projectId }: { 
      citationId: string
      canonicalNap: any
      projectId: string 
    }) =>
      seoApi.checkCitation(citationId, canonicalNap),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.citations(variables.projectId) 
      })
    },
  })
}

// ============================================
// Local Pages (Geo Pages)
// ============================================

export function useSeoLocalPages(projectId: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...seoLocalKeys.geoPages(projectId), params],
    queryFn: () => seoApi.getLocalPages(projectId, params),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useSeoLocalPage(pageId: string) {
  return useQuery({
    queryKey: [...seoLocalKeys.all, 'local-page', pageId],
    queryFn: () => seoApi.getLocalPage(pageId),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLocalPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createLocalPage(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.geoPages(variables.projectId) 
      })
    },
  })
}

export function useUpdateLocalPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, data, projectId }: { pageId: string; data: any; projectId: string }) =>
      seoApi.updateLocalPage(pageId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.geoPages(variables.projectId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: [...seoLocalKeys.all, 'local-page', variables.pageId] 
      })
    },
  })
}

export function useDeleteLocalPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pageId, projectId }: { pageId: string; projectId: string }) =>
      seoApi.deleteLocalPage(pageId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoLocalKeys.geoPages(variables.projectId) 
      })
    },
  })
}
