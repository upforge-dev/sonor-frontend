import { useState, useEffect, lazy, Suspense } from 'react'
import { useSearchParams, useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import GlobalCommandPalette from './GlobalCommandPalette'
import SonorLoading, { SonorSpinner } from './SonorLoading'
import SonorBootSequence from './SonorBootSequence'
import { ModuleErrorBoundary } from './ModuleErrorBoundary'
import useAuthStore from '@/lib/auth-store'
import { MessagesProvider } from '@/lib/MessagesProvider'
import usePageContextStore from '@/lib/page-context-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTour } from '@/hooks/useTour'

const TourOverlay = lazy(() => import('./tour/TourOverlay'))
const EchoPill = lazy(() => import('./tour/EchoPill'))
const SonorContextMenu = lazy(() => import('./SonorContextMenu'))

// Lazy load all section components for better code splitting
const DashboardModule = lazy(() => import('./dashboard/DashboardModule'))
const RepDashboardModule = lazy(() => import('./dashboard/RepDashboardModule'))
const AnalyticsModule = lazy(() => import('./analytics/AnalyticsModule'))
const ProposalsModule = lazy(() => import('./proposals/ProposalsModule'))
const FilesModule = lazy(() => import('./files/FilesModule'))
const MessagesModule = lazy(() => import('./messages/MessagesModuleV2'))
const BillingModule = lazy(() => import('./billing/BillingModule'))
const CRMModule = lazy(() => import('./crm/CRMModule'))
const OutreachModule = lazy(() => import('./outreach/OutreachModule'))
const BlogModule = lazy(() => import('./blog/BlogModule'))
const PortfolioModule = lazy(() => import('./portfolio/PortfolioModule'))
const AuditsModule = lazy(() => import('./audits/AuditsModule'))
const ProposalEditorModule = lazy(() => import('./proposals/ProposalEditorModule'))
import MessagesWidget from './MessagesWidget'
const FormsModule = lazy(() => import('./forms/FormsModule'))
const SEOModule = lazy(() => import('./seo/SEOModule'))
// Commerce: wrap lazy import so chunk load failures show a fallback with retry
function CommerceLoadError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] p-6 text-center">
      <p className="text-[var(--text-primary)] font-medium mb-1">Commerce failed to load</p>
      <p className="text-sm text-[var(--text-secondary)] mb-4">Check the console for details, or try again.</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
const CommerceModule = lazy(() =>
  import('./commerce/CommerceModule').catch((err) => {
    console.error('[Commerce] Failed to load module:', err)
    return {
      default: function CommerceModuleFallback() {
        return <CommerceLoadError onRetry={() => window.location.reload()} />
      },
    }
  })
)
const EngageModule = lazy(() => import('./engage/EngageModule'))
const ReputationModule = lazy(() => import('./reputation/ReputationModule'))
const BroadcastModule = lazy(() => import('./broadcast/BroadcastModule'))
const AffiliatesModule = lazy(() => import('./affiliates/AffiliatesModule'))
const SyncModule = lazy(() => import('./sync/SyncModule'))
const SignalModule = lazy(() => import('./signal/SignalModule'))
const ProjectsModule = lazy(() => import('./projects/ProjectsModule'))
const WebsiteModule = lazy(() => import('./website/WebsiteModule'))
const SettingsModule = lazy(() => import('./settings/SettingsModule'))
const OrgSettingsModule = lazy(() => import('./settings/OrgSettingsModule'))
const PlatformModule = lazy(() => import('./platform/PlatformModule'))
const AgencyModule = lazy(() => import('./agency/AgencyModule'))
// Tenants management moved to Projects.jsx

const MainLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Determine section from URL path for sidebar highlighting
  const getSectionFromPath = () => {
    const path = location.pathname
    if (path === '/') return 'dashboard'
    // Extract first segment after /
    const segment = path.split('/')[1]
    return segment || 'dashboard'
  }
  
  const [activeSection, setActiveSection] = useState(() => getSectionFromPath())
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(56)
  const [sidebarMode, setSidebarMode] = useState('hover')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { user, isLoading } = useAuthStore()
  const hideMessengerWidget = usePageContextStore((s) => s.hideMessengerWidget)

  // Module tour system — detects ?tour=1 from Echo's start_walkthrough tool
  const tour = useTour()

  // Boot sequence: plays once per login session
  const [showBootSequence, setShowBootSequence] = useState(() => {
    if (sessionStorage.getItem('sonor_has_booted')) return false
    // Only show boot on fresh login — check if we just came from login/auth
    const referrer = document.referrer || ''
    const justLoggedIn = sessionStorage.getItem('sonor_just_logged_in')
    if (justLoggedIn) {
      sessionStorage.removeItem('sonor_just_logged_in')
      return true
    }
    return false
  })

  const handleBootComplete = () => {
    sessionStorage.setItem('sonor_has_booted', '1')
    setShowBootSequence(false)
    // Check if user needs onboarding redirect
    checkOnboardingRedirect()
  }

  // Onboarding redirect: check if user's project needs onboarding
  const checkOnboardingRedirect = async () => {
    try {
      const currentProject = useAuthStore.getState().currentProject
      if (!currentProject?.id) return

      const portalApiUrl = import.meta.env.VITE_PORTAL_API_URL || ''
      const res = await fetch(`${portalApiUrl}/onboarding/${currentProject.id}`, {
        credentials: 'include',
      })
      if (!res.ok) return

      const data = await res.json()
      if (data?.current_phase && data.current_phase !== 'complete' && !data.dismissed_at) {
        navigate(`/onboarding/${currentProject.id}`)
      }
    } catch {
      // Silently fail — onboarding check is non-critical
    }
  }

  // On first load (no boot sequence), still check onboarding
  useEffect(() => {
    if (!showBootSequence && !sessionStorage.getItem('sonor_onboarding_checked')) {
      sessionStorage.setItem('sonor_onboarding_checked', '1')
      checkOnboardingRedirect()
    }
  }, [])

  // Sync activeSection with URL path for sidebar highlighting
  useEffect(() => {
    const pathSection = getSectionFromPath()
    if (pathSection !== activeSection) {
      setActiveSection(pathSection)
    }
  }, [location.pathname])

  // Echo deep-link navigation: listen for portal:navigate custom events
  useEffect(() => {
    const handler = (e) => {
      const path = e.detail?.path
      if (path && typeof path === 'string') navigate(path)
    }
    window.addEventListener('portal:navigate', handler)
    return () => window.removeEventListener('portal:navigate', handler)
  }, [navigate])

  // Global open-echo event: handled by MessagesWidget (floating chat bubble).
  // The widget opens in-place without navigating away from the current page.

  // Handle sidebar section change - navigates to the route
  const handleSectionChange = (section) => {
    setActiveSection(section)
    navigate(`/${section === 'dashboard' ? '' : section}`)
  }

  // Handle sidebar expansion state changes
  const handleSidebarExpandedChange = (isExpanded, mode) => {
    setSidebarMode(mode)
    setSidebarWidth(mode === 'expanded' ? 240 : 56)
  }

  // Update page context when section changes (for Echo awareness)
  useEffect(() => {
    if (activeSection) {
      const moduleMap = {
        'dashboard': 'dashboard',
        'analytics': 'analytics',
        'seo': 'seo',
        'engage': 'engage',
        'outreach': 'outreach',
        'email': 'outreach',
        'messages': 'messages',
        'proposals': 'proposals',
        'billing': 'billing',
        'clients': 'crm',
        'prospects': 'crm',
        'crm': 'crm',
        'team': 'team',
        'settings': 'settings',
        'files': 'files',
        'blog': 'blog',
        'portfolio': 'portfolio',
        'signal': 'signal',
        'broadcast': 'broadcast',
        'affiliates': 'affiliates',
        'reputation': 'reputation',
        'ecommerce': 'commerce',
        'commerce': 'commerce',
        'forms': 'forms',
        'sync': 'sync',
        'projects': 'projects',
        'website': 'website',
        'platform': 'platform',
        'clients-managed': 'agency',
      }
      const module = moduleMap[activeSection] || activeSection
      usePageContextStore.getState().setModule(module)
    }
  }, [activeSection])

  // Messaging: MessagesProvider (below) handles socket connect/disconnect and query invalidation

  // Navigation function for child components
  const navigateTo = (section, data = null) => {
    handleSectionChange(section)
  }

  // Check if user is a sales rep
  const isSalesRep = user?.teamRole === 'sales_rep'
  const reducedMotion = useReducedMotion()

  // Only block on loading if there's no boot sequence covering the screen.
  // When boot IS playing, let the full layout mount behind it so the dashboard,
  // sidebar, and all API calls resolve while the animation runs. By the time
  // boot dissolves, everything is ready.
  if (isLoading && !showBootSequence) {
    return <SonorLoading />
  }

  return (
    <MessagesProvider>
    <div className="flex flex-col h-screen relative">
      {/* Boot sequence overlay — fixed z-[100], dashboard loads underneath */}
      {showBootSequence && (
        <SonorBootSequence onComplete={handleBootComplete} />
      )}
      {/* Skip to main content - for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      {/* Portal background: custom image (if set) or default background.avif + theme-aware overlay (80% light / 80% dark) */}
      {user?.background_image_url ? (
        <>
          <div
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${user.background_image_url})` }}
          />
          <div className="fixed inset-0 z-0 bg-white/80 dark:bg-black/80" />
        </>
      ) : (
        <>
          <div
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/background.avif)' }}
          />
          <div className="fixed inset-0 z-0 bg-white/80 dark:bg-black/80" />
        </>
      )}
      
      {/* Top Header - Always persistent */}
      <TopHeader 
        onNavigate={navigateTo}
        onOpenSearch={() => setCommandPaletteOpen(true)}
        className="relative z-10"
      />

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-14 left-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="shadow-md bg-card min-h-[44px] min-w-[44px]"
            aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Desktop Sidebar - Always persistent */}
        <div className="hidden lg:block relative">
          <div className="h-full flex-shrink-0 transition-all duration-150" style={{ width: sidebarWidth }} />
          <aside className="absolute inset-y-0 left-0 z-20" role="navigation" aria-label="Main navigation">
            <Sidebar
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              isCollapsed={true}
              minimal={true}
              onExpandedChange={handleSidebarExpandedChange}
            />
          </aside>
        </div>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-card border-r border-border/50 shadow-xl z-[101] overflow-y-auto" role="navigation" aria-label="Main navigation">
              <Sidebar
                activeSection={activeSection}
                onSectionChange={(section) => {
                  handleSectionChange(section)
                  setIsMobileSidebarOpen(false)
                }}
                isMobile={true}
              />
            </aside>
          </>
        )}

        {/* Main Content - Uses React Router for nested routes */}
        <main id="main-content" className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0" role="main" aria-label="Page content">
          <div className="flex-1 min-h-0 flex flex-col">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <SonorSpinner size="lg" />
              </div>
            }>
              <ModuleErrorBoundary>
                <div className="flex-1 min-h-0 flex flex-col h-full">
                  <Routes>
                {/* Dashboard */}
                <Route index element={isSalesRep ? <RepDashboardModule onNavigate={navigateTo} /> : <DashboardModule onNavigate={navigateTo} />} />
                <Route path="dashboard" element={isSalesRep ? <RepDashboardModule onNavigate={navigateTo} /> : <DashboardModule onNavigate={navigateTo} />} />
                
                {/* SEO Module - supports nested routes like /seo/dashboard, /seo/keywords, etc */}
                <Route path="seo/*" element={<SEOModule />} />
                
                {/* Analytics Module */}
                <Route path="analytics/*" element={<AnalyticsModule onNavigate={navigateTo} />} />
                
                {/* Projects */}
                <Route path="projects/*" element={<ProjectsModule onNavigate={navigateTo} />} />
                
                {/* Website - page-centric content management */}
                <Route path="website/*" element={<WebsiteModule />} />
                
                {/* CRM - all variations route to same component */}
                <Route path="crm/*" element={<CRMModule />} />
                <Route path="clients/*" element={<CRMModule />} />
                <Route path="prospects/*" element={<CRMModule />} />
                
                {/* Commerce Module */}
                <Route path="commerce/*" element={<CommerceModule onNavigate={navigateTo} />} />
                
                {/* Engage Module */}
                <Route path="engage/*" element={<EngageModule onNavigate={navigateTo} />} />
                
                {/* Sync Module */}
                <Route path="sync/*" element={<SyncModule onNavigate={navigateTo} />} />
                
                {/* Signal AI */}
                <Route path="signal/*" element={<SignalModule onNavigate={navigateTo} />} />
                
                {/* Reputation */}
                <Route path="reputation/*" element={<ReputationModule onNavigate={navigateTo} />} />
                
                {/* Broadcast */}
                <Route path="broadcast/*" element={<BroadcastModule onNavigate={navigateTo} />} />
                
                {/* Affiliates */}
                <Route path="affiliates/*" element={<AffiliatesModule onNavigate={navigateTo} />} />
                
                {/* Forms */}
                <Route path="forms/*" element={<FormsModule />} />
                
                {/* Simple pages */}
                <Route path="audits/*" element={<AuditsModule />} />
                <Route path="proposals" element={<ProposalsModule onNavigate={navigateTo} />} />
                <Route path="files/*" element={<FilesModule />} />
                <Route path="messages/*" element={<MessagesModule />} />
                <Route path="billing" element={<BillingModule />} />
                <Route path="outreach/*" element={<OutreachModule />} />
                <Route path="email/*" element={<Navigate to="/outreach" replace />} />
                <Route path="blog" element={<BlogModule />} />
                <Route path="portfolio" element={<PortfolioModule />} />
                <Route path="settings" element={<SettingsModule />} />
                <Route path="organization" element={<OrgSettingsModule />} />
                <Route path="platform/*" element={<PlatformModule />} />
                <Route path="clients-managed/*" element={<AgencyModule />} />
                
                {/* Proposal Editor (special case) */}
                <Route path="proposal-editor/:proposalId?" element={<ProposalEditorModule onBack={() => navigateTo('proposals')} />} />
                
                {/* Catch-all - redirect to dashboard instead of rendering it */}
                <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </ModuleErrorBoundary>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Floating Chat Bubble - hidden on messages page and proposal edit page */}
      <Suspense fallback={null}>
        <MessagesWidget hidden={activeSection === 'messages' || hideMessengerWidget} />
      </Suspense>

      {/* Global Command Palette */}
      <GlobalCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={navigateTo}
      />

      {/* Module Tour Overlay — spotlight + tooltip walkthrough system */}
      {tour.isActive && tour.tour && (
        <Suspense fallback={null}>
          <TourOverlay
            steps={tour.tour.steps}
            currentStep={tour.currentStep}
            onNext={tour.next}
            onPrev={tour.prev}
            onClose={tour.close}
            moduleName={tour.moduleName}
          />
        </Suspense>
      )}

      {/* Sonor Contextual Help — right-click "What's this?" + hover hints */}
      <Suspense fallback={null}>
        <SonorContextMenu />
      </Suspense>

      {/* Echo floating pill — only visible during active tours as contextual guide */}
      {tour.isActive && (
        <Suspense fallback={null}>
          <EchoPill
            showTip
            message={
              tour.tour
                ? `Exploring ${tour.moduleName} — step ${tour.currentStep + 1} of ${tour.tour.steps.length}`
                : undefined
            }
            onOpenChat={() => navigateTo('signal')}
          />
        </Suspense>
      )}
    </div>
    </MessagesProvider>
  )
}

export default MainLayout
