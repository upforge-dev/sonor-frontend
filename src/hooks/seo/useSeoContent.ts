/**
 * SEO Content React Query Hooks
 * 
 * Manages content-related SEO: content decay, briefs, FAQs, AI insights.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

export const seoContentKeys = {
  all: ['seo', 'content'] as const,
  decay: (projectId: string) => [...seoContentKeys.all, 'decay', projectId] as const,
  briefs: (projectId: string) => [...seoContentKeys.all, 'briefs', projectId] as const,
  faqs: (projectId: string) => [...seoContentKeys.all, 'faqs', projectId] as const,
  aiInsights: (projectId: string) => [...seoContentKeys.all, 'ai-insights', projectId] as const,
  aiRecommendations: (projectId: string) => [...seoContentKeys.all, 'ai-recommendations', projectId] as const,
  abTests: (projectId: string) => [...seoContentKeys.all, 'ab-tests', projectId] as const,
}

// ============================================
// Content Decay
// ============================================

export function useSeoContentDecay(projectId: string) {
  return useQuery({
    queryKey: seoContentKeys.decay(projectId),
    queryFn: () => seoApi.getContentDecay(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useDetectContentDecay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.detectContentDecay(projectId),
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.decay(projectId) 
      })
    },
  })
}

// ============================================
// Content Briefs
// ============================================

export function useSeoContentBriefs(projectId: string) {
  return useQuery({
    queryKey: seoContentKeys.briefs(projectId),
    queryFn: () => seoApi.getContentBriefs(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateContentBrief() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createContentBrief(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.briefs(variables.projectId) 
      })
    },
  })
}

export function useGenerateContentBrief() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, keyword }: { projectId: string; keyword: string }) =>
      seoApi.generateContentBrief(projectId, keyword),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.briefs(variables.projectId) 
      })
    },
  })
}

// ============================================
// FAQs
// ============================================

export function useSeoFaqs(projectId: string) {
  return useQuery({
    queryKey: seoContentKeys.faqs(projectId),
    queryFn: () => seoApi.getFaqs(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateSeoFaq() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createFaq(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.faqs(variables.projectId) 
      })
    },
  })
}

export function useGenerateFaqs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, pagePath }: { projectId: string; pagePath: string }) =>
      seoApi.generateFaqs(projectId, pagePath),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.faqs(variables.projectId) 
      })
    },
  })
}

// ============================================
// AI Insights
// ============================================

export function useSeoAiInsights(projectId: string) {
  return useQuery({
    queryKey: seoContentKeys.aiInsights(projectId),
    queryFn: () => seoApi.getAiInsights(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSeoAiRecommendations(projectId: string) {
  return useQuery({
    queryKey: seoContentKeys.aiRecommendations(projectId),
    queryFn: () => seoApi.getAiRecommendations(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGenerateAiInsights() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectId: string) => seoApi.generateAiInsights(projectId),
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.aiInsights(projectId) 
      })
    },
  })
}

// ============================================
// A/B Testing
// ============================================

export function useSeoAbTests(projectId: string) {
  return useQuery({
    queryKey: seoContentKeys.abTests(projectId),
    queryFn: () => seoApi.getAbTests(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateAbTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      seoApi.createAbTest(projectId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.abTests(variables.projectId) 
      })
    },
  })
}

export function useUpdateAbTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, testId, data }: { projectId: string; testId: string; data: any }) =>
      seoApi.updateAbTest(testId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: seoContentKeys.abTests(variables.projectId) 
      })
    },
  })
}
