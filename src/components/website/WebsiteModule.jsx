/**
 * Website Module - Standalone page-centric content management.
 * Left sidebar: collapsible "Pages" + site-wide sections (Images, Metadata, Schema, Links, Scripts).
 * Content: page detail (tabs) or site-wide view (all managed images/metadata/schema/links/scripts).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { useSeoPages, useProject, useSiteImages, useSiteLinks, useSiteScripts, useSiteSchema, useSiteFaqs, useCmsPages, useCmsStatus } from '@/lib/hooks'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { Button } from '@/components/ui/button'
import { Globe2, FileText, Database } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import WebsiteSidebar from '@/components/projects/website/WebsiteSidebar'
import WebsiteModuleView from '@/components/projects/website/WebsiteModuleView'
import SiteImagesPanel from '@/components/projects/site/SiteImagesPanel'
import SitePagesPanel from '@/components/projects/site/SitePagesPanel'
import SiteFAQsPanel from '@/components/projects/site/SiteFAQsPanel'
import SiteSchemaPanel from '@/components/projects/site/SiteSchemaPanel'
import SiteLinksPanel from '@/components/projects/site/SiteLinksPanel'
import SiteScriptsPanel from '@/components/projects/site/SiteScriptsPanel'
import { WEBSITE_SECTIONS } from '@/components/projects/website/WebsiteSidebar'
import WebsiteCmsSettings from '@/components/projects/website/panels/WebsiteCmsSettings'

export default function WebsiteModule() {
  const navigate = useNavigate()
  const { currentProject: authProject } = useAuthStore()
  const projectId = authProject?.id

  const { data: project } = useProject(projectId, { enabled: !!projectId })
  const { data: websitePagesData, isLoading: websitePagesLoading } = useSeoPages(
    projectId,
    { limit: 500 },
    { enabled: !!projectId }
  )
  const { data: siteImages = [] } = useSiteImages(projectId, { enabled: !!projectId })
  const { data: siteLinks = [] } = useSiteLinks(projectId, { enabled: !!projectId })
  const { data: siteScripts = [] } = useSiteScripts(projectId, { enabled: !!projectId })
  const { data: siteSchema = [] } = useSiteSchema(projectId, { enabled: !!projectId })
  const { data: siteFaqs = [] } = useSiteFaqs(projectId, { enabled: !!projectId })
  const { data: cmsStatus } = useCmsStatus(projectId, { enabled: !!projectId })
  const { data: cmsPagesData } = useCmsPages(projectId, {}, { enabled: !!projectId && !!cmsStatus?.connected })
  // Normalize: hook may return { pages: [...] } or { pages: { pages: [...] } } when API wraps in .data
  const rawPages = Array.isArray(websitePagesData?.pages)
    ? websitePagesData.pages
    : Array.isArray(websitePagesData?.pages?.pages)
      ? websitePagesData.pages.pages
      : Array.isArray(websitePagesData)
        ? websitePagesData
        : []

  // Build CMS page lookup by path
  const cmsPagesList = Array.isArray(cmsPagesData?.pages) ? cmsPagesData.pages : Array.isArray(cmsPagesData) ? cmsPagesData : []
  const cmsPagesByPath = new Map()
  for (const cp of cmsPagesList) {
    if (cp.path) cmsPagesByPath.set(cp.path.replace(/\/+$/, '') || '/', cp)
  }

  // Merge: annotate SEO pages that have CMS backing, add CMS-only pages
  const mergedPages = rawPages.map((p) => {
    const path = (p.path || (p.url ? new URL(p.url, 'https://x').pathname : '') || '/').replace(/\/+$/, '') || '/'
    const cmsPage = cmsPagesByPath.get(path)
    if (cmsPage) {
      cmsPagesByPath.delete(path) // consumed
      return { ...p, _cmsPage: cmsPage }
    }
    return p
  })
  // Add CMS pages that don't match any existing SEO page
  for (const [, cp] of cmsPagesByPath) {
    mergedPages.push({ path: cp.path, title: cp.title, _cmsPage: cp })
  }

  // Sort by path to match Analytics module "Site Pages" order (path-sorted hierarchy)
  const websitePages = [...mergedPages].sort((a, b) => {
    const pathA = a.path || (a.url ? new URL(a.url, 'https://x').pathname : '') || ''
    const pathB = b.path || (b.url ? new URL(b.url, 'https://x').pathname : '') || ''
    return pathA.localeCompare(pathB, undefined, { sensitivity: 'base' })
  })

  const [selectedPage, setSelectedPage] = useState(null)
  const [activeSection, setActiveSection] = useState(null)
  const [activeTab, setActiveTab] = useState('analytics')

  useEffect(() => {
    if (!projectId) setSelectedPage(null)
  }, [projectId])

  useEffect(() => {
    if (websitePages?.length && !selectedPage && !activeSection) setSelectedPage(websitePages[0])
  }, [websitePages, selectedPage, activeSection])

  const displayProject = project ?? authProject

  return (
    <ModuleLayout
      data-sonor-help="website/dashboard"
      leftSidebar={
        projectId ? (
          <WebsiteSidebar
            projectId={projectId}
            pages={websitePages}
            selectedPage={selectedPage}
            activeSection={activeSection}
            onSelectPage={setSelectedPage}
            onSelectSection={setActiveSection}
            isLoading={websitePagesLoading}
            cmsConnected={!!cmsStatus?.connected}
          />
        ) : (
          <div className="p-4 text-sm text-muted-foreground">
            Select a project to view pages.
          </div>
        )
      }
      leftSidebarTitle="Website"
      defaultLeftSidebarOpen
      ariaLabel="Website module"
    >
      <ModuleLayout.Header
        title="Website"
        icon={MODULE_ICONS.website}
        subtitle="Page-level content: metadata, images, FAQ, schema, and more"
        data-tour="website-header"
        actions={
          !projectId ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
              <FileText className="h-4 w-4 mr-2" />
              Select project
            </Button>
          ) : null
        }
      />
      <ModuleLayout.Content>
        {!projectId ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-sm">
              <Globe2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground">Select a project</p>
              <p className="text-sm mt-1">
                Choose a project from Projects to manage its website pages, metadata, images, FAQ, and more.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/projects')}>
                Go to Projects
              </Button>
            </div>
          </div>
        ) : activeSection ? (
          <ScrollArea className="h-full">
            <div className="p-6">
              {activeSection === WEBSITE_SECTIONS.IMAGES && (
                <SiteImagesPanel project={displayProject} images={siteImages} />
              )}
              {activeSection === WEBSITE_SECTIONS.METADATA && (
                <SitePagesPanel project={displayProject} pages={websitePages} />
              )}
              {activeSection === WEBSITE_SECTIONS.FAQS && (
                <SiteFAQsPanel project={displayProject} faqs={Array.isArray(siteFaqs) ? siteFaqs : (siteFaqs?.faqs ?? [])} />
              )}
              {activeSection === WEBSITE_SECTIONS.SCHEMA && (
                <SiteSchemaPanel project={displayProject} schema={Array.isArray(siteSchema) ? siteSchema : (siteSchema?.schema ?? [])} />
              )}
              {activeSection === WEBSITE_SECTIONS.LINKS && (
                <SiteLinksPanel project={displayProject} links={Array.isArray(siteLinks) ? siteLinks : (siteLinks?.links ?? [])} />
              )}
              {activeSection === WEBSITE_SECTIONS.SCRIPTS && (
                <SiteScriptsPanel project={displayProject} scripts={Array.isArray(siteScripts) ? siteScripts : (siteScripts?.scripts ?? [])} />
              )}
              {activeSection === WEBSITE_SECTIONS.CMS && (
                <WebsiteCmsSettings projectId={projectId} project={displayProject} cmsStatus={cmsStatus} />
              )}
            </div>
          </ScrollArea>
        ) : selectedPage ? (
          <WebsiteModuleView
            projectId={projectId}
            project={displayProject}
            selectedPage={selectedPage}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            cmsConnected={!!cmsStatus?.connected}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-sm">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground">Select a page or section</p>
              <p className="text-sm mt-1">
                Expand <strong>Pages</strong> in the sidebar to pick a page, or choose Images, Metadata, FAQs, Schema, Links, or Scripts for a site-wide view.
              </p>
            </div>
          </div>
        )}
      </ModuleLayout.Content>
    </ModuleLayout>
  )
}
