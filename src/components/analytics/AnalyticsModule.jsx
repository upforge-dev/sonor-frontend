// src/components/analytics/AnalyticsModuleWrapper.jsx
// Wrapper for embedding Analytics module in MainLayout
// Uses React Query hooks for data fetching

import { useEffect } from 'react'
import useAuthStore from '@/lib/auth-store'
import useAnalyticsStore from '@/lib/analytics-store'
import { useSiteTopPages } from '@/lib/hooks/use-site-analytics'
import { seoApi } from '@/lib/portal-api'
import AnalyticsDashboard from '@/pages/analytics/AnalyticsDashboard'

export default function AnalyticsModuleWrapper({ onNavigate }) {
  const { currentProject } = useAuthStore()
  const { reset, buildHierarchy, setHierarchyLoading } = useAnalyticsStore()
  
  // Use React Query hook for top pages as fallback data
  const { data: topPages } = useSiteTopPages(currentProject?.id, 30, 200)

  useEffect(() => {
    if (currentProject?.id) {
      // Fetch canonical pages from seo_pages (populated by SitemapSync)
      // This is the source of truth for what pages exist on the site
      setHierarchyLoading(true)
      seoApi.listPages(currentProject.id, { limit: 500 }).then(response => {
        // Unwrap: API body is { pages, total, ... }; Axios gives response.data = body
        const raw = response?.data ?? response
        const list = raw?.pages ?? raw?.data
        const seoPages = Array.isArray(list) ? list : (Array.isArray(raw) ? raw : [])
        
        if (seoPages.length > 0) {
          // Transform seo_pages to format expected by buildHierarchy
          // Filter out internal pages like /_uptrade/setup
          const pagesForHierarchy = seoPages
            .filter(page => {
              const path = page.path || page.url || '/'
              // Exclude internal uptrade pages
              return !path.includes('_uptrade') && !path.includes('%5Fuptrade')
            })
            .map(page => ({
              path: page.path || page.url || '/',
              name: page.title || page.path || '/',
              views: 0, // Will be enriched by analytics data
              sessions: 0,
            }))
          
          buildHierarchy(pagesForHierarchy)
        } else if (topPages && topPages.length > 0) {
          // Fallback: if no seo_pages, use analytics top pages from React Query
          buildHierarchy(topPages)
        }
        setHierarchyLoading(false)
      }).catch(err => {
        console.warn('[Analytics] Error fetching seo_pages:', err)
        // Fallback to topPages from React Query
        if (topPages && topPages.length > 0) {
          buildHierarchy(topPages)
        }
        setHierarchyLoading(false)
      })
    }
    
    // Cleanup on project change
    return () => {
      reset()
    }
  }, [currentProject?.id, buildHierarchy, reset, setHierarchyLoading, topPages])

  return (
    <div data-sonor-help="analytics/dashboard" className="h-full min-h-0">
      <AnalyticsDashboard onNavigate={onNavigate} />
    </div>
  )
}
