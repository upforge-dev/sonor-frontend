// src/components/seo/SEOModule.tsx
// Main SEO Module - CONSOLIDATED for simplicity
// Focus: "Are my rankings improving?" + Local SEO
// All page-level optimization happens in Page Detail view
// CONSOLIDATED - Jan 31, 2026

import { useState } from 'react'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { useSeoProject, useSeoPages, seoPageKeys } from '@/hooks/seo'
import { seoApi } from '@/lib/sonor-api'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import SignalIcon from '@/components/ui/SignalIcon'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { Settings, Rocket } from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { useSignalAccess } from '@/lib/signal-access'

// Import SEO Sidebar content (nav sections)
import SEOSidebar from '@/components/seo/SEOSidebar'

// Core views
import SEODashboard from '@/components/seo/SEODashboard'
import SEOPagesList from '@/components/seo/SEOPagesList'
import SEOPageDetail from '@/components/seo/SEOPageDetail'
import SEOKeywordTracking from '@/components/seo/SEOKeywordTracking'
import SEOLocalSeo from '@/components/seo/SEOLocalSeo'
import SEOSetupGate from '@/components/seo/SEOSetupGate'

// Technical SEO (consolidated single page with internal tabs)
import SEOTechnicalAudit from '@/components/seo/SEOTechnicalAudit'

// Search Console (GSC coverage & indexing health)
import SEOSearchConsole from '@/components/seo/SEOSearchConsole'

// Reconciliation (site health, orphans, redirect chains, 404s)
import SEOReconciliation from '@/components/seo/SEOReconciliation'

// Content strategy
import SEOContentDecay from '@/components/seo/SEOContentDecay'

// Intelligence views
import SEOBacklinks from '@/components/seo/SEOBacklinks'
import SEOCompetitorMonitor from '@/components/seo/SEOCompetitorMonitor'

// Client report
import { SEOClientReportButton, SEOClientReportModal } from '@/components/seo/SEOClientReport'
import SEOReportingPage from '@/components/seo/SEOReportingPage'

// Bulk pipeline modal for deep optimization
import SEOBulkPipelineModal from '@/components/seo/signal/SEOBulkPipelineModal'

interface SeoPage {
  id?: string
  path?: string
  url?: string
  [key: string]: any
}

export default function SEOModule() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const { currentProject: authCurrentProject } = useAuthStore()
  
  // Always use current project from auth store
  const projectId: string | undefined = authCurrentProject?.id
  const orgId: string | undefined = authCurrentProject?.org_id
  
  // React Query hooks - auto-fetch on mount
  const { data: currentProject } = useSeoProject(orgId, projectId)
  
  // Fetch all pages for bulk optimization (sorted parent/children by path)
  const { data: pagesData } = useSeoPages(projectId, { limit: 2000 })
  const rawPages = pagesData?.pages ?? pagesData?.data ?? []
  const allPages: SeoPage[] = (Array.isArray(rawPages) ? rawPages : []).slice().sort((a, b) => {
    const pathA = a.path || (a.url ? new URL(a.url, 'https://x').pathname : '') || ''
    const pathB = b.path || (b.url ? new URL(b.url, 'https://x').pathname : '') || ''
    return pathA.localeCompare(pathB, undefined, { sensitivity: 'base' })
  })
  
  // Get active tab from current route path
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const activeTab: string = pathSegments[1] || 'dashboard' // /seo/keywords -> 'keywords'
  
  const [bulkPipelineOpen, setBulkPipelineOpen] = useState<boolean>(false)

  const handleTabChange = (tab: string): void => {
    navigate(`/seo/${tab}`)
  }

  const subtitle: string = hasSignalAccess
    ? 'Signal-powered optimization'
    : 'Optimization & monitoring'

  return (
  <>
    <TooltipProvider>
      <ModuleLayout
        data-sonor-help="seo/dashboard"
        leftSidebar={
          <SEOSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            alertCount={0}
            embedded
          />
        }
        leftSidebarTitle="SEO"
        defaultLeftSidebarOpen
        ariaLabel="SEO module"
      >
        <ModuleLayout.Header
          data-tour="seo-overview"
          title="SEO"
          icon={MODULE_ICONS.seo}
          subtitle={subtitle}
          actions={
            <>
              {currentProject && hasSignalAccess && (
                <Button
                  onClick={() => setBulkPipelineOpen(true)}
                  disabled={allPages.length === 0}
                  style={{ 
                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary))'
                  }}
                  className="text-white shadow-lg"
                  title="Deep optimize all pages with comprehensive 8-phase Signal analysis"
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Optimize All Pages
                </Button>
              )}
              {projectId && (
                <SEOClientReportButton projectId={projectId} variant="outline" />
              )}
            </>
          }
        />
        <ModuleLayout.Content data-tour="seo-pages-table">
          <div className="space-y-6 p-6">
            {!projectId && !authCurrentProject?.domain && (
              <div className="rounded-lg border border-border/50 bg-muted/30 py-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Domain Configured
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add a domain to your project settings to start tracking SEO
                </p>
                <Button
                  onClick={() => navigate('/settings')}
                  className="text-white"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Configure Domain
                </Button>
              </div>
            )}
            {projectId && (
              <SEOSetupGate projectId={projectId}>
                <Routes>
                  {/* Core views */}
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SEODashboard projectId={projectId} />} />
                  <Route path="pages" element={<SEOPagesList projectId={projectId} />} />
                  <Route path="pages/:pageId" element={<SEOPageDetail projectId={projectId} />} />
                  <Route path="keywords" element={<SEOKeywordTracking projectId={projectId} />} />
                  
                  {/* Content strategy */}
                  <Route path="content" element={<SEOContentDecay projectId={projectId} />} />
                  
                  {/* Local SEO */}
                  <Route path="local-seo" element={<SEOLocalSeo projectId={projectId} />} />
                  
                  {/* Technical SEO (consolidated - has internal tabs for audit, indexing, etc) */}
                  <Route path="technical" element={<SEOTechnicalAudit projectId={projectId} pages={allPages} domain={currentProject?.domain} />} />
                  
                  {/* Search Console (GSC coverage & indexing health) */}
                  <Route path="search-console" element={<SEOSearchConsole projectId={projectId} />} />

                  {/* Reconciliation (site health, orphans, redirect chains, 404s) */}
                  <Route path="reconciliation" element={<SEOReconciliation projectId={projectId} />} />
                  
                  {/* Intelligence views */}
                  <Route path="backlinks" element={<SEOBacklinks projectId={projectId} />} />
                  <Route path="competitors" element={<SEOCompetitorMonitor projectId={projectId} />} />
                  
                  {/* Reporting - use modal triggered from header, but also allow direct route */}
                  <Route path="reporting" element={<SEOReportingPage projectId={projectId} />} />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </SEOSetupGate>
            )}
          </div>
        </ModuleLayout.Content>
      </ModuleLayout>

      {/* Bulk Pipeline Modal - Deep Optimize All Pages */}
      <SEOBulkPipelineModal
        open={bulkPipelineOpen}
        onOpenChange={setBulkPipelineOpen}
        projectId={projectId}
        pages={allPages}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['seo'] })
        }}
      />
    </TooltipProvider>

  </>
  )
}
