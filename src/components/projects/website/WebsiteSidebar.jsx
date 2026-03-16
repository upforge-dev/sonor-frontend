/**
 * WebsiteSidebar - Left sidebar for Website module.
 * Collapsible "Pages" section (page list) + site-wide sections: Images, Metadata, Schema, Links, Scripts.
 */
import { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, FileText, Image, Braces, Link2, Code, HelpCircle, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import WebsitePageSelector from './WebsitePageSelector'

export const WEBSITE_SECTIONS = {
  IMAGES: 'images',
  METADATA: 'metadata',
  FAQS: 'faqs',
  SCHEMA: 'schema',
  LINKS: 'links',
  SCRIPTS: 'scripts',
  CMS: 'cms',
}

const SECTION_ITEMS = [
  { id: WEBSITE_SECTIONS.IMAGES, label: 'Images', icon: Image, description: 'All managed images' },
  { id: WEBSITE_SECTIONS.METADATA, label: 'Metadata', icon: FileText, description: 'All managed metadata' },
  { id: WEBSITE_SECTIONS.FAQS, label: 'FAQs', icon: HelpCircle, description: 'All managed FAQs' },
  { id: WEBSITE_SECTIONS.SCHEMA, label: 'Schema', icon: Braces, description: 'All managed schema' },
  { id: WEBSITE_SECTIONS.LINKS, label: 'Links', icon: Link2, description: 'All managed links' },
  { id: WEBSITE_SECTIONS.SCRIPTS, label: 'Scripts', icon: Code, description: 'All managed scripts' },
  { id: WEBSITE_SECTIONS.CMS, label: 'CMS', icon: Database, description: 'Content Management System settings' },
]

export default function WebsiteSidebar({
  projectId,
  pages = [],
  selectedPage,
  activeSection,
  onSelectPage,
  onSelectSection,
  isLoading = false,
  cmsConnected = false,
}) {
  const [pagesOpen, setPagesOpen] = useState(true)

  const handleSelectPage = (page) => {
    onSelectSection?.(null)
    onSelectPage?.(page)
  }

  const handleSelectSection = (sectionId) => {
    onSelectPage?.(null)
    onSelectSection?.(sectionId)
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Collapsible "Pages" - contains the full page list */}
          <Collapsible open={pagesOpen} onOpenChange={setPagesOpen}>
            <CollapsibleTrigger
              className={cn(
                'flex items-center gap-2 w-full py-2 px-2 rounded-md text-sm font-medium',
                'hover:bg-muted transition-colors',
                selectedPage && !activeSection && 'bg-primary/10 text-primary'
              )}
            >
              {pagesOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <FileText className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Pages</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-1 pb-2 h-[min(60vh,400px)] min-h-0 flex flex-col overflow-hidden">
                <WebsitePageSelector
                  projectId={projectId}
                  pages={pages}
                  selectedPage={selectedPage}
                  onSelectPage={handleSelectPage}
                  isLoading={isLoading}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Site-wide sections */}
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
              Site-wide
            </p>
            {SECTION_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSection(item.id)}
                  className={cn(
                    'flex items-center gap-2 w-full py-2 px-2 rounded-md text-sm transition-colors',
                    'hover:bg-muted',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                  title={item.description}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
