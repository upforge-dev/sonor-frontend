// src/components/seo/SEOSidebar.tsx
// Vertical sidebar navigation for SEO module with collapsible sections
// Uses ModuleLayout predefined sidebar typography (no inline font/weight overrides)
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MODULE_SIDEBAR_TYPOGRAPHY } from '@/components/ModuleLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSignalAccess } from '@/lib/signal-access'
import SignalIcon from '@/components/ui/SignalIcon'
import type { LucideIcon } from 'lucide-react'
import { 
  LayoutDashboard,
  Search,
  FileText,
  Link2,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Bell,
  Settings,
  Sparkles,
  Shield,
  MapPin,
  Code,
  ChevronDown,
  ChevronRight,
  Menu,
  Zap,
  Clock,
  CheckSquare,
  BarChart3,
  GitBranch,
  Layers,
  AlertCircle,
  Lock,
  Rocket,
  Users2,
  FileCheck,
  History,
  FileSearch,
  HelpCircle,
  Globe,
} from 'lucide-react'

// Navigation item interface
interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  description: string
  signal?: boolean
  badge?: string
}

// Navigation section interface
interface NavSection {
  id: string
  label: string
  items: NavItem[]
  signal?: boolean
}

// Navigation configuration
// CONSOLIDATED: No dropdowns - each section is a single page
// See docs/SEO-MODULE-ROADMAP.md for full feature roadmap
const NAV_ITEMS: NavItem[] = [
  // Core SEO
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Rankings & performance overview' },
  { id: 'pages', label: 'Pages', icon: FileText, description: 'On-page optimization' },
  { id: 'keywords', label: 'Keywords', icon: Target, description: 'Keyword intelligence & tracking' },
  { id: 'content', label: 'Content', icon: Layers, description: 'Content strategy & decay detection', signal: true },
  
  // Specialized
  { id: 'local-seo', label: 'Local SEO', icon: MapPin, description: 'GBP, citations & local rankings' },
  { id: 'technical', label: 'Technical', icon: Shield, description: 'Site audit, indexing & health' },
  { id: 'search-console', label: 'Search Console', icon: Globe, description: 'GSC coverage & indexing health' },
  
  // Intelligence (Signal features)
  { id: 'backlinks', label: 'Backlinks', icon: Link2, description: 'Link monitoring & authority', signal: true },
  { id: 'competitors', label: 'Competitors', icon: Users, description: 'Competitor gap analysis', signal: true },
  { id: 'reporting', label: 'Reporting', icon: BarChart3, description: 'ROI reports & summaries', signal: true },
]

// Legacy NAV_SECTIONS for backwards compatibility during transition
const NAV_SECTIONS: NavSection[] = [
]

interface NavItemProps {
  item: NavItem
  isActive: boolean
  onClick: (id: string) => void
  isCollapsed: boolean
  hasSignal: boolean
  alertCount: number
}

function NavItem({ item, isActive, onClick, isCollapsed, hasSignal, alertCount }: NavItemProps) {
  const isLocked = item.signal && !hasSignal

  const content = (
    <button
      onClick={() => !isLocked && onClick(item.id)}
      disabled={isLocked}
      data-tour={`seo-${item.id}`}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted text-foreground",
        isLocked && "opacity-50 cursor-not-allowed"
      )}
    >
      <item.icon className={cn(
        "h-4 w-4 flex-shrink-0",
        isActive && "text-primary"
      )} />
      
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          
          {/* Alert badge */}
          {item.badge === 'alerts' && alertCount > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
            >
              {alertCount > 99 ? '99+' : alertCount}
            </Badge>
          )}
          
          {/* Signal lock indicator */}
          {isLocked && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </>
      )}
    </button>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span>{item.label}</span>
            {isLocked && <Lock className="h-3 w-3" />}
            {item.badge === 'alerts' && alertCount > 0 && (
              <Badge variant="destructive" className="h-5">
                {alertCount}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

interface NavSectionProps {
  section: NavSection
  activeTab: string
  onTabChange: (id: string) => void
  isCollapsed: boolean
  hasSignal: boolean
  alertCount: number
  openSections: Record<string, boolean>
  onToggleSection: (id: string) => void
}

function NavSection({ section, activeTab, onTabChange, isCollapsed, hasSignal, alertCount, openSections, onToggleSection }: NavSectionProps) {
  const isOpen = openSections[section.id]
  const isLocked = section.signal && !hasSignal
  const hasActiveItem = section.items.some(item => item.id === activeTab)

  // In collapsed mode, show items directly without section headers
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {section.items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={onTabChange}
            isCollapsed={isCollapsed}
            hasSignal={hasSignal}
            alertCount={item.badge === 'alerts' ? alertCount : 0}
          />
        ))}
      </div>
    )
  }

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => onToggleSection(section.id)}
      className="space-y-1"
    >
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full flex items-center gap-2 px-3 py-2 uppercase tracking-wider",
          "text-muted-foreground hover:text-foreground transition-colors",
          hasActiveItem && "text-foreground"
        )}>
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="flex-1 text-left">{section.label}</span>
          {isLocked && (
            <div className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--brand-primary)', backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}>
              <Sparkles className="h-2.5 w-2.5" />
              Signal
            </div>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pl-2">
        {section.items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={onTabChange}
            isCollapsed={false}
            hasSignal={hasSignal}
            alertCount={item.badge === 'alerts' ? alertCount : 0}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface DesktopSidebarProps {
  activeTab: string
  onTabChange: (id: string) => void
  alertCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  embedded: boolean
}

// Desktop sidebar component - FLAT LIST (no collapsible sections)
function DesktopSidebar({ activeTab, onTabChange, alertCount, isCollapsed, onToggleCollapse, embedded }: DesktopSidebarProps) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()

  // Embedded mode - used inside SEOModule with motion animation
  if (embedded) {
    return (
      <ScrollArea className="h-full">
        <div className={cn('px-2 py-3', MODULE_SIDEBAR_TYPOGRAPHY)}>
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                onClick={onTabChange}
                isCollapsed={false}
                hasSignal={hasSignalAccess}
                alertCount={item.badge === 'alerts' ? alertCount : 0}
              />
            ))}
          </nav>
          
          {/* Signal upgrade prompt */}
          {!hasSignalAccess && (
            <div className="mt-6 p-3 rounded-lg border" style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 10%, transparent), color-mix(in srgb, var(--brand-primary) 10%, transparent))',
              borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)'
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <span style={{ color: 'var(--brand-primary)' }}>Upgrade to Signal</span>
              </div>
              <p className="text-muted-foreground mb-2">
                Unlock Signal-powered SEO automation
              </p>
              <Button size="sm" variant="outline" className="w-full h-7" style={{
                borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
                color: 'var(--brand-primary)'
              }}>
                Learn More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div 
      className={cn(
        "h-full flex flex-col border-r border-border/50",
        "bg-muted/30",
        "transition-all duration-300",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Collapse toggle */}
      <div className="p-2 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full justify-center"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className={cn('flex-1 px-2 py-3', MODULE_SIDEBAR_TYPOGRAPHY)}>
        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={onTabChange}
              isCollapsed={isCollapsed}
              hasSignal={hasSignalAccess}
              alertCount={item.badge === 'alerts' ? alertCount : 0}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Signal upgrade prompt (when not collapsed) */}
      {!hasSignalAccess && !isCollapsed && (
        <div className="p-3 border-t border-border/50">
          <div className="p-3 rounded-lg border" style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 10%, transparent), color-mix(in srgb, var(--brand-primary) 10%, transparent))',
            borderColor: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)'
          }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              <span style={{ color: 'var(--brand-primary)' }}>Upgrade to Signal</span>
            </div>
            <p className="text-muted-foreground mb-2">
              Unlock Signal-powered SEO automation
            </p>
            <Button size="sm" variant="outline" className="w-full h-7" style={{
              borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
              color: 'var(--brand-primary)'
            }}>
              Learn More
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface MobileSidebarProps {
  activeTab: string
  onTabChange: (id: string) => void
  alertCount: number
}

// Mobile sidebar (drawer) - FLAT LIST
function MobileSidebar({ activeTab, onTabChange, alertCount }: MobileSidebarProps) {
  const [open, setOpen] = useState<boolean>(false)
  const { hasAccess: hasSignalAccess } = useSignalAccess()

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className={cn('h-full flex flex-col', MODULE_SIDEBAR_TYPOGRAPHY)}>
          <div className="p-4 border-b border-border/50">
            <h2>SEO Navigation</h2>
          </div>
          <ScrollArea className="flex-1 px-2 py-3">
            <nav className="space-y-1">
              {NAV_ITEMS.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  onClick={handleTabChange}
                  isCollapsed={false}
                  hasSignal={hasSignalAccess}
                  alertCount={item.badge === 'alerts' ? alertCount : 0}
                />
              ))}
            </nav>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface SEOSidebarProps {
  activeTab: string
  onTabChange: (id: string) => void
  alertCount?: number
  isMobileOnly?: boolean
  embedded?: boolean
  className?: string
}

// Main exported component
export default function SEOSidebar({ 
  activeTab, 
  onTabChange, 
  alertCount = 0,
  isMobileOnly = false,
  embedded = false,
  className 
}: SEOSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)

  // If mobile-only mode, just return the mobile sidebar trigger
  if (isMobileOnly) {
    return (
      <MobileSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        alertCount={alertCount}
      />
    )
  }

  return (
    <DesktopSidebar
      activeTab={activeTab}
      onTabChange={onTabChange}
      alertCount={alertCount}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      embedded={embedded}
    />
  )
}

// Export config for use elsewhere
export { NAV_ITEMS, NAV_SECTIONS }
export type { NavItem, NavSection }
