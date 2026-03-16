/**
 * WebsiteModuleView - Page-centric Website tab content.
 * Subheader tabs: Analytics, Metadata, Images, FAQ, Schema, Content, Forms, Links, Scripts.
 * Every tab is full CRUD except Analytics (read-only).
 */
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  FileText,
  Image,
  HelpCircle,
  Braces,
  FileEdit,
  ClipboardList,
  Link2,
  Code,
  Globe2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

import PageAnalyticsView from '@/pages/analytics/views/PageAnalyticsView'
import WebsitePageMetadata from './panels/WebsitePageMetadata'
import WebsitePageImages from './panels/WebsitePageImages'
import WebsitePageFaq from './panels/WebsitePageFaq'
import WebsitePageSchema from './panels/WebsitePageSchema'
import WebsitePageContent from './panels/WebsitePageContent'
import WebsitePageCmsContent from './panels/WebsitePageCmsContent'
import WebsitePageForms from './panels/WebsitePageForms'
import WebsitePageLinks from './panels/WebsitePageLinks'
import WebsitePageScripts from './panels/WebsitePageScripts'

const TAB_IDS = [
  'analytics',
  'metadata',
  'images',
  'faq',
  'schema',
  'content',
  'forms',
  'links',
  'scripts',
]

const TAB_CONFIG = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'metadata', label: 'Metadata', icon: FileText },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'schema', label: 'Schema', icon: Braces },
  { id: 'content', label: 'Content', icon: FileEdit },
  { id: 'forms', label: 'Forms', icon: ClipboardList },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'scripts', label: 'Scripts', icon: Code },
]

export default function WebsiteModuleView({
  projectId,
  project,
  selectedPage,
  activeTab: controlledTab,
  onTabChange,
  cmsConnected = false,
}) {
  const [internalTab, setInternalTab] = useState('analytics')
  const activeTab = controlledTab ?? internalTab
  const setActiveTab = onTabChange ?? setInternalTab

  const pagePath = selectedPage?.path ?? (selectedPage?.url ? new URL(selectedPage.url, 'https://x').pathname : '') ?? ''
  // Same title as Analytics per-page view and sidebar: path-based (last segment or Home)
  const pageTitle = !pagePath || pagePath === '/' ? 'Home' : pagePath.split('/').filter(Boolean).pop() || pagePath

  useEffect(() => {
    if (selectedPage && !TAB_IDS.includes(activeTab)) setActiveTab('analytics')
  }, [selectedPage, activeTab, setActiveTab])

  if (!projectId || !project) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Globe2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a project to manage its website</p>
        </div>
      </div>
    )
  }

  if (!selectedPage) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center max-w-sm">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium text-foreground">Select a page</p>
          <p className="text-sm mt-1">
            Choose a page from the left sidebar to view and edit its metadata, images, FAQ, schema, and more.
          </p>
          <p className="text-xs mt-3 text-muted-foreground">
            Pages are pulled from the sitemap at build time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Subheader: selected page + tabs */}
      <div className="border-b bg-background/50 shrink-0">
        <div className="px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Globe2 className="h-4 w-4" />
          <span className="truncate capitalize" title={pagePath}>
            {pageTitle}
          </span>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10 px-2 bg-transparent gap-0.5 rounded-none border-0">
            {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="gap-1.5 rounded-md data-[state=active]:bg-muted"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="analytics" className="m-0">
              <PageAnalyticsView path={pagePath} />
            </TabsContent>
            <TabsContent value="metadata" className="m-0">
              <WebsitePageMetadata projectId={projectId} selectedPage={selectedPage} />
            </TabsContent>
            <TabsContent value="images" className="m-0">
              <WebsitePageImages projectId={projectId} project={project} selectedPage={selectedPage} />
            </TabsContent>
            <TabsContent value="faq" className="m-0">
              <WebsitePageFaq projectId={projectId} selectedPage={selectedPage} />
            </TabsContent>
            <TabsContent value="schema" className="m-0">
              <WebsitePageSchema projectId={projectId} selectedPage={selectedPage} />
            </TabsContent>
            <TabsContent value="content" className="m-0">
              {selectedPage?._cmsPage ? (
                <WebsitePageCmsContent
                  projectId={projectId}
                  project={project}
                  selectedPage={selectedPage}
                  cmsPage={selectedPage._cmsPage}
                />
              ) : (
                <WebsitePageContent
                  projectId={projectId}
                  selectedPage={selectedPage}
                  cmsConnected={cmsConnected}
                />
              )}
            </TabsContent>
            <TabsContent value="forms" className="m-0">
              <WebsitePageForms projectId={projectId} selectedPage={selectedPage} />
            </TabsContent>
            <TabsContent value="links" className="m-0">
              <WebsitePageLinks projectId={projectId} selectedPage={selectedPage} />
            </TabsContent>
            <TabsContent value="scripts" className="m-0">
              <WebsitePageScripts projectId={projectId} selectedPage={selectedPage} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
