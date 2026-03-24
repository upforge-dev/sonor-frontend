/**
 * SEO React Query Hooks - Index
 * 
 * Centralized exports for all SEO data fetching and mutations.
 * Uses React Query for server state management instead of Zustand.
 * 
 * Benefits over Zustand:
 * - Automatic background refetching
 * - Built-in cache management
 * - Request deduplication
 * - Optimistic updates
 * - Better TypeScript support
 * - Suspense support
 * - DevTools integration
 */

// Projects
export * from './useSeoProjects'
export { seoProjectKeys } from './useSeoProjects'

// Pages
export * from './useSeoPages'
export { seoPageKeys, pageImageKeys } from './useSeoPages'

// Opportunities
export * from './useSeoOpportunities'
export { seoOpportunityKeys } from './useSeoOpportunities'

// Google Search Console
export * from './useSeoGSC'
export { seoGSCKeys } from './useSeoGSC'

// Keywords & Rankings
export * from './useSeoKeywords'
export { seoKeywordKeys } from './useSeoKeywords'

// Alerts
export * from './useSeoAlerts'
export { seoAlertKeys } from './useSeoAlerts'

// Technical SEO (schemas, links, indexing, CWV, backlinks, competitors)
export * from './useSeoTechnical'
export { seoTechnicalKeys } from './useSeoTechnical'

// Content (decay, briefs, FAQs, AI insights, A/B tests)
export * from './useSeoContent'
export { seoContentKeys } from './useSeoContent'

// Local SEO (geo pages, citations, heatmap, entity health, grids, GBP)
export * from './useSeoLocal'
export { seoLocalKeys } from './useSeoLocal'

// Signal AI (brain, training, suggestions, schema generation, quick wins)
export * from './useSeoSignal'
export { seoSignalKeys } from './useSeoSignal'

/**
 * Combined hook for dashboard data
 * Fetches all necessary data for the SEO dashboard in parallel
 */
import { useSeoPages } from './useSeoPages'
import { useSeoOpportunities, useSeoOpportunitySummary } from './useSeoOpportunities'
import { useSeoGSCOverview } from './useSeoGSC'

export function useSeoData(projectId: string) {
  const pages = useSeoPages(projectId, { limit: 10 })
  const opportunities = useSeoOpportunities(projectId, { limit: 10 })
  const summary = useSeoOpportunitySummary(projectId)
  const gscOverview = useSeoGSCOverview(projectId)

  return {
    pages,
    opportunities,
    summary,
    gscOverview,
    isLoading: 
      pages.isLoading || 
      opportunities.isLoading || 
      summary.isLoading || 
      gscOverview.isLoading,
    isError: 
      pages.isError || 
      opportunities.isError || 
      summary.isError || 
      gscOverview.isError,
    error: 
      pages.error || 
      opportunities.error || 
      summary.error || 
      gscOverview.error,
  }
}

/**
 * Hook for page-specific data
 */
import { useSeoPage } from './useSeoPages'

export function useSeoPageData(projectId: string, pageId: string) {
  const page = useSeoPage(projectId, pageId)
  const pageOpportunities = useSeoOpportunities(projectId, { pageId } as any)

  return {
    page,
    opportunities: pageOpportunities,
    isLoading: page.isLoading || pageOpportunities.isLoading,
    isError: page.isError || pageOpportunities.isError,
    error: page.error || pageOpportunities.error,
  }
}

/**
 * Utility: Prefetch dashboard data
 * Useful for preloading data on hover or route transition
 */
import { useQueryClient } from '@tanstack/react-query'
import { seoApi } from '../../lib/sonor-api'

export function usePrefetchSeoDashboard() {
  const queryClient = useQueryClient()

  return (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: seoPageKeys.list(projectId, { limit: 10 }),
      queryFn: () => seoApi.getPages(projectId, { limit: 10 }),
    })

    queryClient.prefetchQuery({
      queryKey: seoOpportunityKeys.list(projectId, { limit: 10 }),
      queryFn: () => seoApi.getOpportunities(projectId, { limit: 10 }),
    })

    queryClient.prefetchQuery({
      queryKey: seoOpportunityKeys.summary(projectId),
      queryFn: () => seoApi.getOpportunitySummary(projectId),
    })

    queryClient.prefetchQuery({
      queryKey: seoGSCKeys.overview(projectId, {}),
      queryFn: () => seoApi.getGscOverview(projectId, {}),
    })
  }
}

// Re-export query keys for cache invalidation
import { seoProjectKeys } from './useSeoProjects'
import { seoPageKeys } from './useSeoPages'
import { seoOpportunityKeys } from './useSeoOpportunities'
import { seoGSCKeys } from './useSeoGSC'

export const seoQueryKeys = {
  projects: seoProjectKeys,
  pages: seoPageKeys,
  opportunities: seoOpportunityKeys,
  gsc: seoGSCKeys,
}
