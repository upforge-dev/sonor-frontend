import { useState, useEffect, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Send,
  Zap,
  Bell,
  FileText,
  Users,
  Target,
  Settings,
  Inbox,
  Globe,
  ShieldCheck,
  SearchCode,
  ListOrdered,
  Lock,
  PenLine,
  Mail,
  MessageSquareText,
} from 'lucide-react'
import { ModuleLayout } from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { cn } from '@/lib/utils'
import { useSignalAccess } from '@/hooks/useSignalAccess'
import EmailPlatform from '@/components/email/EmailPlatform'
import AudienceTab from './AudienceTab'
import { TAB_HEADERS, OutreachLoading } from './ui'

const OutreachSequencesTab = lazy(() => import('./tabs/OutreachSequencesTab'))
const OutreachInboxTab = lazy(() => import('./tabs/OutreachInboxTab'))
const OutreachDiscoveryTab = lazy(() => import('./tabs/OutreachDiscoveryTab'))
const OutreachDomainsTab = lazy(() => import('./tabs/OutreachDomainsTab'))
const OutreachComplianceTab = lazy(() => import('./tabs/OutreachComplianceTab'))
const OutreachAnalyticsTab = lazy(() => import('./tabs/OutreachAnalyticsTab'))
const OutreachVerificationTab = lazy(() => import('./tabs/OutreachVerificationTab'))
const SignaturesTab = lazy(() => import('./tabs/SignaturesTab'))
const SignatureAnalytics = lazy(() => import('./tabs/SignatureAnalytics'))
const OutreachLandingPagesTab = lazy(() => import('./tabs/OutreachLandingPagesTab'))
const NarrativesTab = lazy(() => import('./tabs/NarrativesTab'))
const DomainSetup = lazy(() => import('@/components/email/DomainSetup'))

const SIDEBAR_SECTIONS = [
  {
    id: 'marketing',
    label: 'Email Marketing',
    items: [
      { value: 'overview', label: 'Overview', icon: BarChart3 },
      { value: 'campaigns', label: 'Campaigns', icon: Send },
      { value: 'automations', label: 'Automations', icon: Zap },
      { value: 'transactional', label: 'Transactional', icon: Bell },
    ],
  },
  {
    id: 'cold-outreach',
    label: 'Cold Outreach',
    requiresSignal: true,
    items: [
      { value: 'narratives', label: 'Narratives', icon: MessageSquareText },
      { value: 'sequences', label: 'Sequences', icon: ListOrdered },
      { value: 'inbox', label: 'Inbox', icon: Inbox, badge: true },
      { value: 'discovery', label: 'Lead Discovery', icon: SearchCode },
      { value: 'outreach-analytics', label: 'Analytics', icon: BarChart3 },
      { value: 'verification', label: 'Verification', icon: ShieldCheck },
      { value: 'landing-pages', label: 'Landing Pages', icon: FileText },
    ],
  },
  {
    id: 'tools',
    label: 'Shared Tools',
    items: [
      { value: 'templates', label: 'Templates', icon: FileText },
      { value: 'signatures', label: 'Signatures', icon: PenLine },
      { value: 'signature-analytics', label: 'Sig Analytics', icon: BarChart3 },
      { value: 'testing', label: 'A/B Tests', icon: Target },
      { value: 'audience', label: 'Audience', icon: Users },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    items: [
      { value: 'domain-setup', label: 'Domain Setup', icon: Mail },
      { value: 'domains', label: 'Outreach Fleet', icon: Globe },
      { value: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { value: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

const EMAIL_PLATFORM_TABS = new Set([
  'overview', 'campaigns', 'automations', 'transactional',
  'templates', 'testing', 'settings',
])

export default function OutreachModule() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const { hasCurrentProjectSignal } = useSignalAccess()

  // Sync tab from URL params on mount and when params change
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // Update URL without navigation
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true })
  }

  const leftSidebarContent = (
    <div className="p-3 space-y-4" data-tour="outreach-sidebar">
      {SIDEBAR_SECTIONS.map((section) => {
        if (section.requiresSignal && !hasCurrentProjectSignal) return null

        return (
          <div key={section.id}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5 px-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.value
                return (
                  <button
                    key={item.value}
                    onClick={() => handleTabChange(item.value)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-all duration-150 text-sm',
                      isActive
                        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium'
                        : 'hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                    {...(item.value === 'campaigns' ? { 'data-tour': 'outreach-campaigns' } : {})}
                    {...(item.value === 'sequences' ? { 'data-tour': 'outreach-sequences' } : {})}
                    {...(item.value === 'audience' ? { 'data-tour': 'outreach-audience' } : {})}
                  >
                    <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {!hasCurrentProjectSignal && (
        <div className="px-2 py-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Cold Outreach</span>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
            Upgrade to a Signal AI plan to unlock cold outreach sequences, unified inbox, and lead discovery.
          </p>
        </div>
      )}
    </div>
  )

  const lazyFallback = <OutreachLoading />

  const renderContent = () => {
    if (activeTab === 'audience') {
      return <AudienceTab />
    }

    if (EMAIL_PLATFORM_TABS.has(activeTab)) {
      return (
        <EmailPlatform
          embedded
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )
    }

    if (activeTab === 'narratives') return <Suspense fallback={lazyFallback}><NarrativesTab /></Suspense>
    if (activeTab === 'sequences') return <Suspense fallback={lazyFallback}><OutreachSequencesTab /></Suspense>
    if (activeTab === 'inbox') return <Suspense fallback={lazyFallback}><OutreachInboxTab /></Suspense>
    if (activeTab === 'discovery') return <Suspense fallback={lazyFallback}><OutreachDiscoveryTab /></Suspense>
    if (activeTab === 'domain-setup') return <Suspense fallback={lazyFallback}><DomainSetup /></Suspense>
    if (activeTab === 'domains') return <Suspense fallback={lazyFallback}><OutreachDomainsTab /></Suspense>
    if (activeTab === 'compliance') return <Suspense fallback={lazyFallback}><OutreachComplianceTab /></Suspense>
    if (activeTab === 'outreach-analytics') return <Suspense fallback={lazyFallback}><OutreachAnalyticsTab /></Suspense>
    if (activeTab === 'verification') return <Suspense fallback={lazyFallback}><OutreachVerificationTab /></Suspense>
    if (activeTab === 'signatures') return <Suspense fallback={lazyFallback}><SignaturesTab /></Suspense>
    if (activeTab === 'signature-analytics') return <Suspense fallback={lazyFallback}><SignatureAnalytics onViewSignature={() => setActiveTab('signatures')} /></Suspense>
    if (activeTab === 'landing-pages') return <Suspense fallback={lazyFallback}><OutreachLandingPagesTab /></Suspense>

    return (
      <EmailPlatform
        embedded
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    )
  }

  return (
    <ModuleLayout
      data-sonor-help="outreach/dashboard"
      ariaLabel="Outreach"
      leftSidebar={leftSidebarContent}
      leftSidebarOpen={showLeftSidebar}
      onLeftSidebarOpenChange={setShowLeftSidebar}
      leftSidebarTitle="Outreach"
      leftSidebarWidth={200}
      defaultLeftSidebarOpen
    >
      <ModuleLayout.Header
        title={TAB_HEADERS[activeTab]?.title || 'Outreach'}
        subtitle={TAB_HEADERS[activeTab]?.subtitle}
        icon={MODULE_ICONS.outreach}
        data-tour="outreach-header"
      />
      <ModuleLayout.Content noPadding>
        {renderContent()}
      </ModuleLayout.Content>
    </ModuleLayout>
  )
}

