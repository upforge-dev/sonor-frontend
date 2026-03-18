// src/components/engage/dashboard/EngageSidebar.jsx
// Left sidebar navigation for Engage module - Commerce-style design

import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ChevronDown, 
  Sparkles,
  MessageSquare,
  Megaphone,
  Bell,
  PanelBottom,
  Inbox,
  BarChart3,
  Target,
  LayoutTemplate,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EngageSidebar({
  currentView,
  onViewChange,
  elements = [],
  // Collapsible states
  popupsOpen,
  setPopupsOpen,
  bannersOpen,
  setBannersOpen,
  nudgesOpen,
  setNudgesOpen,
  toastsOpen,
  setToastsOpen,
  slideInsOpen,
  setSlideInsOpen,
  // Optional callbacks
  onOpenSettings
}) {
  // Count elements by type
  const countByType = elements.reduce((acc, el) => {
    const type = el.element_type || 'popup'
    acc[type] = (acc[type] || 0) + 1
    acc.all = (acc.all || 0) + 1
    return acc
  }, { all: 0 })

  // Count by status within type
  const countByTypeAndStatus = (type) => {
    const typeElements = type === 'all' ? elements : elements.filter(e => e.element_type === type)
    return {
      all: typeElements.length,
      active: typeElements.filter(e => e.is_active).length,
      inactive: typeElements.filter(e => !e.is_active).length
    }
  }

  const popupCounts = countByTypeAndStatus('popup')
  const bannerCounts = countByTypeAndStatus('banner')
  const nudgeCounts = countByTypeAndStatus('nudge')
  const toastCounts = countByTypeAndStatus('toast')
  const slideInCounts = countByTypeAndStatus('slide-in')

  return (
    <ScrollArea className="h-full py-4">
      <nav className="space-y-1 px-2" data-tour="engage-widgets">
        {/* Highlights Tab */}
        <button
          type="button"
          onClick={() => onViewChange('overview')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'overview'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <Sparkles className={cn("h-4 w-4", currentView === 'overview' && "text-[var(--brand-primary)]")} />
          Highlights
        </button>

        {/* Popups Dropdown */}
        <Collapsible open={popupsOpen} onOpenChange={setPopupsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                currentView?.startsWith('popup')
                  ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className={cn("h-4 w-4", currentView?.startsWith('popup') && "text-[var(--brand-primary)]")} />
                Popups
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">{popupCounts.all}</span>
                <ChevronDown className={cn(
                  "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                  popupsOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
            {[
              { id: 'popup-all', label: 'All Popups', count: popupCounts.all },
              { id: 'popup-active', label: 'Active', count: popupCounts.active },
              { id: 'popup-inactive', label: 'Inactive', count: popupCounts.inactive },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                  currentView === item.id 
                    ? "text-[var(--brand-primary)] font-medium" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {item.label}
                <span className="text-xs text-[var(--text-tertiary)]">{item.count}</span>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Banners Dropdown */}
        <Collapsible open={bannersOpen} onOpenChange={setBannersOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                currentView?.startsWith('banner')
                  ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="flex items-center gap-2">
                <Megaphone className={cn("h-4 w-4", currentView?.startsWith('banner') && "text-[var(--brand-primary)]")} />
                Banners
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">{bannerCounts.all}</span>
                <ChevronDown className={cn(
                  "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                  bannersOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
            {[
              { id: 'banner-all', label: 'All Banners', count: bannerCounts.all },
              { id: 'banner-active', label: 'Active', count: bannerCounts.active },
              { id: 'banner-inactive', label: 'Inactive', count: bannerCounts.inactive },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                  currentView === item.id 
                    ? "text-[var(--brand-primary)] font-medium" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {item.label}
                <span className="text-xs text-[var(--text-tertiary)]">{item.count}</span>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Page Nudges (standalone, not Engage Studio) */}
        <button
          type="button"
          onClick={() => onViewChange('page-nudges')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'page-nudges'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <Sparkles className={cn("h-4 w-4", currentView === 'page-nudges' && "text-[var(--brand-primary)]")} />
          Nudges
        </button>

        {/* Toasts Dropdown */}
        <Collapsible open={toastsOpen} onOpenChange={setToastsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                currentView?.startsWith('toast')
                  ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="flex items-center gap-2">
                <Bell className={cn("h-4 w-4", currentView?.startsWith('toast') && "text-[var(--brand-primary)]")} />
                Toasts
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">{toastCounts.all}</span>
                <ChevronDown className={cn(
                  "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                  toastsOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
            {[
              { id: 'toast-all', label: 'All Toasts', count: toastCounts.all },
              { id: 'toast-active', label: 'Active', count: toastCounts.active },
              { id: 'toast-inactive', label: 'Inactive', count: toastCounts.inactive },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                  currentView === item.id 
                    ? "text-[var(--brand-primary)] font-medium" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {item.label}
                <span className="text-xs text-[var(--text-tertiary)]">{item.count}</span>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Slide-ins Dropdown */}
        <Collapsible open={slideInsOpen} onOpenChange={setSlideInsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200",
                currentView?.startsWith('slide-in')
                  ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <div className="flex items-center gap-2">
                <PanelBottom className={cn("h-4 w-4", currentView?.startsWith('slide-in') && "text-[var(--brand-primary)]")} />
                Slide-ins
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">{slideInCounts.all}</span>
                <ChevronDown className={cn(
                  "h-3 w-3 text-[var(--text-tertiary)] transition-transform duration-200",
                  slideInsOpen && "rotate-180"
                )} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
            {[
              { id: 'slide-in-all', label: 'All Slide-ins', count: slideInCounts.all },
              { id: 'slide-in-active', label: 'Active', count: slideInCounts.active },
              { id: 'slide-in-inactive', label: 'Inactive', count: slideInCounts.inactive },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                  currentView === item.id 
                    ? "text-[var(--brand-primary)] font-medium" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {item.label}
                <span className="text-xs text-[var(--text-tertiary)]">{item.count}</span>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* Tools Section */}
      <div className="mt-6 px-2">
        <div className="px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
          Tools
        </div>
        
        <button
          type="button"
          onClick={() => onViewChange('chat')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'chat'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <Inbox className={cn("h-4 w-4", currentView === 'chat' && "text-[var(--brand-primary)]")} />
          Chat Inbox
        </button>

        <button
          type="button"
          onClick={() => onViewChange('chat-settings')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'chat-settings'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium" 
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <Settings className={cn("h-4 w-4", currentView === 'chat-settings' && "text-[var(--brand-primary)]")} />
          Chat Settings
        </button>
        
        <button
          type="button"
          data-tour="engage-targeting"
          onClick={() => onViewChange('targeting')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'targeting'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <Target className={cn("h-4 w-4", currentView === 'targeting' && "text-[var(--brand-primary)]")} />
          Targeting
        </button>
        
        <button
          type="button"
          data-tour="engage-analytics"
          onClick={() => onViewChange('analytics')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'analytics'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <BarChart3 className={cn("h-4 w-4", currentView === 'analytics' && "text-[var(--brand-primary)]")} />
          Analytics
        </button>
        
        <button
          type="button"
          data-tour="engage-builder"
          onClick={() => onViewChange('templates')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
            currentView === 'templates'
              ? "bg-[var(--brand-primary)]/10 text-[var(--text-primary)] font-medium"
              : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <LayoutTemplate className={cn("h-4 w-4", currentView === 'templates' && "text-[var(--brand-primary)]")} />
          Templates
        </button>
      </div>

      {/* Integrations Section */}
      <div className="mt-6 px-2">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
          Integrations
          {onOpenSettings && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 hover:bg-[var(--glass-bg-hover)]"
              onClick={onOpenSettings}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Site-Kit Connection Status */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-primary)]">Site-Kit</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
            >
              Connect
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
