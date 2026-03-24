/**
 * EmailPlatform — Orchestrator for email marketing module.
 *
 * This is a thin shell that manages modal state (template editor, campaign composer,
 * automation builder) and routes to lazy-loaded tab components.
 *
 * Tab components live in ./tabs/ and handle their own data fetching, state, and UI.
 * This file should stay under ~250 lines — all business logic belongs in tabs.
 *
 * Modes:
 *   embedded + controlledTab + onTabChange → content-only (used by OutreachModule)
 *   standalone → full sidebar + tabs UI
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BarChart3, Send, Zap, Bell, FileText, Users, UserPlus,
  Tag, Target, Settings, PanelLeft, PanelLeftClose,
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/lib/auth-store'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { OutreachLoading } from '@/components/outreach/ui'

// Full-screen modal components (eager — they replace the entire view)
import EmailEditor from './EmailEditor'
import AutomationBuilder from './AutomationBuilder'
import CampaignComposer from './CampaignComposer'
import CampaignAnalytics from './CampaignAnalytics'
import SegmentBuilder from './SegmentBuilder'

// Lazy-loaded tab components
const EmailOverviewTab = lazy(() => import('./tabs/EmailOverviewTab'))
const EmailCampaignsTab = lazy(() => import('./tabs/EmailCampaignsTab'))
const EmailAutomationsTab = lazy(() => import('./tabs/EmailAutomationsTab'))
const EmailTransactionalTab = lazy(() => import('./tabs/EmailTransactionalTab'))
const EmailTemplatesTab = lazy(() => import('./tabs/EmailTemplatesTab'))
const EmailSubscribersTab = lazy(() => import('./tabs/EmailSubscribersTab'))
const EmailSettingsTab = lazy(() => import('./tabs/EmailSettingsTab'))

// Existing components (not code-split — they're already separate files)
const ImageLibrary = lazy(() => import('./ImageLibrary'))
import ListManagement from './ListManagement'
import ABTestingPanel from './ABTestingPanel'
import PeopleTab from './PeopleTab'

const lazyFallback = <OutreachLoading />

export default function EmailPlatform({
  embedded = false,
  activeTab: controlledTab,
  onTabChange: onControlledTabChange,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentOrg } = useAuthStore()
  const { createTemplate, updateTemplate, fetchTemplates, createAutomation, fetchAutomations, createCampaign, fetchCampaigns } = useEmailPlatformStore()

  const [internalTab, setInternalTab] = useState('overview')
  const activeTab = controlledTab ?? internalTab
  const setActiveTab = onControlledTabChange ?? setInternalTab
  const contentOnly = embedded && controlledTab != null && onControlledTabChange != null

  // Modal states
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showAutomationBuilder, setShowAutomationBuilder] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState(null)
  const [showCampaignComposer, setShowCampaignComposer] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [showCampaignAnalytics, setShowCampaignAnalytics] = useState(false)
  const [viewingCampaign, setViewingCampaign] = useState(null)
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Commerce module → campaign pre-population
  useEffect(() => {
    if (location.state?.offering) {
      const offering = location.state.offering
      const subjectSuggestions = {
        product: `Introducing ${offering.name}`,
        service: `Book Your ${offering.name} Today`,
        class: `Join Our ${offering.name}`,
        event: `You're Invited: ${offering.name}`,
      }
      setEditingCampaign({
        name: `${offering.name} Campaign`,
        subject: subjectSuggestions[offering.type] || `Check out ${offering.name}`,
        offering_id: offering.id,
        offering_snapshot: {
          id: offering.id, type: offering.type, name: offering.name,
          slug: offering.slug, price: offering.price, featured_image: offering.featured_image,
        },
      })
      setShowCampaignComposer(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  // ─── Modal handlers ────────────────────────────────────────────────────

  const handleCreateTemplate = () => { setEditingTemplate(null); setShowTemplateEditor(true) }
  const handleEditTemplate = (t) => { setEditingTemplate(t); setShowTemplateEditor(true) }
  const handleUseSystemTemplate = (t) => {
    setEditingTemplate({ ...t, id: null, name: `${t.name} (Copy)`, is_system: false, system_type: null })
    setShowTemplateEditor(true)
  }
  const handleSaveTemplate = async (data) => {
    if (editingTemplate?.id) await updateTemplate(editingTemplate.id, data)
    else await createTemplate(data)
    fetchTemplates()
    setShowTemplateEditor(false)
  }

  const handleCreateAutomation = () => { setEditingAutomation(null); setShowAutomationBuilder(true) }
  const handleEditAutomation = (a) => { setEditingAutomation(a); setShowAutomationBuilder(true) }
  const handleSaveAutomation = async (data) => {
    await createAutomation(data)
    fetchAutomations()
    setShowAutomationBuilder(false)
  }

  const handleCreateCampaign = () => { setEditingCampaign(null); setShowCampaignComposer(true) }
  const handleEditCampaign = (c) => { setEditingCampaign(c); setShowCampaignComposer(true) }
  const handleSaveCampaign = async (data) => {
    await createCampaign(data)
    fetchCampaigns()
    setShowCampaignComposer(false)
  }

  const handleViewCampaignAnalytics = (c) => { setViewingCampaign(c); setShowCampaignAnalytics(true) }

  // ─── Full-screen modals (replace entire view) ──────────────────────────

  if (showCampaignAnalytics) {
    return <CampaignAnalytics campaign={viewingCampaign} onBack={() => setShowCampaignAnalytics(false)} />
  }
  if (showCampaignComposer) {
    return <CampaignComposer campaign={editingCampaign} onSave={handleSaveCampaign} onBack={() => setShowCampaignComposer(false)} onEditTemplate={handleEditTemplate} />
  }
  if (showAutomationBuilder) {
    return <AutomationBuilder automation={editingAutomation} onSave={handleSaveAutomation} onBack={() => setShowAutomationBuilder(false)} />
  }
  if (showTemplateEditor) {
    return (
      <EmailEditor
        mode="template"
        templateName={editingTemplate?.name || ''}
        templateCategory={editingTemplate?.category || 'marketing'}
        initialSubject={editingTemplate?.subject || ''}
        initialHtml={editingTemplate?.html || ''}
        onSave={handleSaveTemplate}
        onBack={() => setShowTemplateEditor(false)}
        showGallery={false}
        showImageLibrary
        isNew={!editingTemplate}
        saveLabel={editingTemplate ? 'Save Template' : 'Create Template'}
        height="calc(100vh - 80px)"
      />
    )
  }

  // ─── Shared tab props ──────────────────────────────────────────────────

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <Suspense fallback={lazyFallback}><EmailOverviewTab onNavigate={setActiveTab} onNewCampaign={handleCreateCampaign} onViewCampaignAnalytics={handleViewCampaignAnalytics} /></Suspense>
      case 'campaigns':
        return <Suspense fallback={lazyFallback}><EmailCampaignsTab onCreateCampaign={handleCreateCampaign} onEditCampaign={handleEditCampaign} onViewAnalytics={handleViewCampaignAnalytics} /></Suspense>
      case 'automations':
        return <Suspense fallback={lazyFallback}><EmailAutomationsTab onEditAutomation={handleEditAutomation} onNewAutomation={handleCreateAutomation} /></Suspense>
      case 'transactional':
        return <Suspense fallback={lazyFallback}><EmailTransactionalTab onEditTemplate={handleEditTemplate} /></Suspense>
      case 'templates':
        return <Suspense fallback={lazyFallback}><EmailTemplatesTab onEditTemplate={handleEditTemplate} onCreateTemplate={handleCreateTemplate} onUseSystemTemplate={handleUseSystemTemplate} onOpenImageLibrary={() => setShowImageLibrary(true)} /></Suspense>
      case 'subscribers':
        return <Suspense fallback={lazyFallback}><EmailSubscribersTab onOpenSegmentBuilder={() => setShowSegmentBuilder(true)} /></Suspense>
      case 'settings':
        return <Suspense fallback={lazyFallback}><EmailSettingsTab /></Suspense>
      case 'lists':
        return <ListManagement />
      case 'people':
        return <PeopleTab />
      case 'testing':
        return <ABTestingPanel />
      default:
        return null
    }
  }

  // ─── Shared modals ─────────────────────────────────────────────────────

  const modals = (
    <>
      <SegmentBuilder open={showSegmentBuilder} onOpenChange={setShowSegmentBuilder} onSave={(d) => { toast.success(`Segment "${d.name}" created`); setShowSegmentBuilder(false) }} />
      <Suspense fallback={null}>
        <ImageLibrary open={showImageLibrary} onOpenChange={setShowImageLibrary} onSelect={(img) => { toast.success(`Image "${img.name}" selected`); setShowImageLibrary(false) }} />
      </Suspense>
    </>
  )

  // ─── Content-only mode (embedded in OutreachModule via ModuleLayout) ──

  if (contentOnly) {
    return (
      <div className="h-full p-6">
        {renderTab()}
        {modals}
      </div>
    )
  }

  // ─── Standalone mode (full sidebar + tabs) ─────────────────────────────

  const SIDEBAR_TABS = [
    { value: 'overview', icon: BarChart3, label: 'Overview' },
    { value: 'campaigns', icon: Send, label: 'Campaigns' },
    { value: 'automations', icon: Zap, label: 'Automations' },
    { value: 'transactional', icon: Bell, label: 'Transactional' },
    { value: 'templates', icon: FileText, label: 'Templates' },
    '---',
    { value: 'subscribers', icon: Users, label: 'Subscribers' },
    { value: 'lists', icon: Tag, label: 'Lists' },
    { value: 'people', icon: UserPlus, label: 'People' },
    { value: 'testing', icon: Target, label: 'A/B Tests' },
    '---',
    { value: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className={embedded ? 'h-full p-6' : 'space-y-6'}>
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Outreach</h1>
          <p className="text-[var(--text-secondary)] mt-1">Create newsletters, automate sequences, and grow your audience</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <div className="flex gap-6 h-full">
          <div className={`flex-shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-48'}`}>
            <div className="flex flex-col h-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`mb-2 ${isSidebarCollapsed ? 'w-full justify-center' : 'self-end'} text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
              >
                {isSidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>

              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-1 p-0">
                <TooltipProvider delayDuration={0}>
                  {SIDEBAR_TABS.map((item, i) =>
                    item === '---' ? (
                      <div key={`sep-${i}`} className="border-t border-[var(--glass-border)] my-2" />
                    ) : (
                      <Tooltip key={item.value}>
                        <TooltipTrigger asChild>
                          <TabsTrigger
                            value={item.value}
                            className={`w-full gap-2 py-2 data-[state=active]:bg-[var(--brand-primary)]/10 data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-sm ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {!isSidebarCollapsed && <span>{item.label}</span>}
                          </TabsTrigger>
                        </TooltipTrigger>
                        {isSidebarCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                      </Tooltip>
                    )
                  )}
                </TooltipProvider>
              </TabsList>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {SIDEBAR_TABS.filter(t => t !== '---').map((item) => (
              <TabsContent key={item.value} value={item.value} className="mt-0">
                {activeTab === item.value && renderTab()}
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>

      {modals}
    </div>
  )
}
