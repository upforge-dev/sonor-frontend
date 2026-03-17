import { useState, useEffect, useMemo } from 'react'
import LogoSvg from '@/assets/logo.svg?react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import ContactAvatar from '@/components/ui/ContactAvatar'
import { 
  Home, 
  FileText, 
  MessageSquare, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  FolderOpen,
  Shield,
  Mail,
  LineChart,
  BookOpen,
  Briefcase,
  Send,
  Trophy,
  ClipboardList,
  ShoppingCart,
  Search,
  Brain,
  Zap,
  Star,
  Radio,
  Calendar,
  Box,
  ChevronDown,
  Building2,
  PanelLeft,
  PanelLeftClose,
  Columns2,
  Link2,
  Globe2
} from 'lucide-react'
import useAuthStore, { useOrgFeatures } from '@/lib/auth-store'
import { useOverdueInvoices, useProposals, useNewLeadsCount, useAllAudits, useUnreadMessagesCount } from '@/lib/hooks'
import { useBrandColors } from '@/hooks/useBrandColors'
import { getStaggerListVariants } from '@/lib/animation-variants'

// Custom Signal icon based on signalicon.svg design - uses currentColor like lucide icons
const SignalIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Outer arcs representing signal waves */}
    <path d="M13.21,7.3c2.12.54,3.68,2.46,3.68,4.74,0,1.86-1.03,3.47-2.56,4.3" />
    <path d="M14.32,19.33c3.1-.98,5.34-3.88,5.34-7.3,0-.98-.18-1.92-.52-2.78" />
    <path d="M17.97,7.23c-1.4-1.75-3.56-2.87-5.97-2.87s-4.54,1.1-5.95,2.83" />
    <path d="M4.88,9.21c-.35.87-.54,1.82-.54,2.82,0,3.42,2.24,6.32,5.34,7.3" />
    {/* Inner arrows */}
    <path d="M9.44,13.01l2.61-2.35" />
    <path d="M14.56,13.05l-2.52-2.39" />
    {/* Outer circle with vertical stem */}
    <path d="M13.63,22.56c5.1-.78,9-5.19,9-10.5,0-5.87-4.76-10.62-10.62-10.62S1.38,6.19,1.38,12.06c0,4.93,3.35,9.07,7.9,10.27,0,0,0,0,0,0,1.92.4,2.76-1.11,2.76-2.33v-9.35" />
    <path d="M10.89,7.28c-2.17.5-3.78,2.45-3.78,4.77,0,1.86,1.03,3.47,2.56,4.3" />
  </svg>
)

const Sidebar = ({ 
  activeSection, 
  onSectionChange, 
  isMobile = false,
  isCollapsed: propIsCollapsed,
  onToggleCollapse,
  isHovered: propIsHovered,
  onHoverChange,
  minimal = false, // New prop: removes header/user info when TopHeader handles it
  onExpandedChange, // Callback to notify parent of expansion state
}) => {
  // Sidebar mode: 'expanded' | 'collapsed' | 'hover' (default)
  const [sidebarMode, setSidebarMode] = useState('hover')
  
  // Notify parent when sidebar mode changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(sidebarMode === 'expanded', sidebarMode)
    }
  }, [sidebarMode, onExpandedChange])
  
  // Hover state for expand animation (Supabase-style)
  const [internalHovered, setInternalHovered] = useState(false)
  const isHovered = propIsHovered !== undefined ? propIsHovered : internalHovered
  const handleHoverChange = onHoverChange || setInternalHovered
  
  // Use prop-controlled state if provided, otherwise internal state
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [uptradeDropdownOpen, setUptradeDropdownOpen] = useState(false) // Collapsible Uptrade section
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed))
  
  // Derived state: expanded based on mode
  // - 'expanded': always expanded
  // - 'collapsed': always collapsed  
  // - 'hover': expanded when hovered
  const isExpanded = sidebarMode === 'expanded' || (sidebarMode === 'hover' && isHovered)
  const reducedMotion = useReducedMotion()
  const staggerVariants = getStaggerListVariants(!!reducedMotion)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isSuperAdmin, currentOrg, currentProject, accessLevel } = useAuthStore()
  const { hasFeatureRaw } = useOrgFeatures()
  const { primary: brandPrimary, rgba } = useBrandColors()
  const { data: audits = [] } = useAllAudits()
  const { data: unreadMessages = 0 } = useUnreadMessagesCount()
  const { data: invoicesData } = useOverdueInvoices(currentOrg?.id)
  const invoices = invoicesData?.invoices || []
  const { data: newLeadsData } = useNewLeadsCount({ enabled: user?.role === 'admin' })
  const newLeadsCount = newLeadsData?.count || 0
  const { data: proposalsData } = useProposals()
  const proposals = proposalsData?.proposals || []
  
  // Check user roles - super admins get full access to everything
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isSalesRep = user?.teamRole === 'sales_rep' && !isSuperAdmin
  const isManager = user?.teamRole === 'manager' || isSuperAdmin
  
  // Check access level for organization features (billing, proposals)
  // Organization-level users have full access, project-level users have limited access
  const hasOrgLevelAccess = isAdmin || isSuperAdmin || accessLevel === 'organization'
  
  // Current context - project and org info
  const projectName = currentProject?.name || currentProject?.title || 'Project'
  const projectFeatures = currentProject?.features || []
  const orgName = currentOrg?.name || 'Organization'
  
  // ============================================================================
  // ORG TYPE DETECTION (Agency vs Client)
  // ============================================================================
  
  // Is this an agency org? Show admin view
  const isAgencyOrg = currentOrg?.org_type === 'agency'
  
  // Is this a client org? Show client view with their project features
  const isClientOrg = currentOrg && !isAgencyOrg
  
  // Feature check helper - for admin portal, show unless explicitly disabled
  const hasFeature = (featureKey) => {
    const rawValue = hasFeatureRaw(featureKey)
    const adminTools = ['seo', 'ecommerce', 'commerce', 'blog', 'portfolio', 'email', 'email_manager', 'outreach', 'forms', 'engage', 'signal', 'prospecting', 'reputation', 'analytics']
    
    // For agency admins, show admin tools unless explicitly disabled
    if (isAdmin && (isAgencyOrg || !currentOrg) && adminTools.includes(featureKey)) {
      return rawValue !== false
    }
    
    // For client orgs, use strict feature checking
    return rawValue === true
  }

  // Calculate unread audits
  const unreadAudits = audits.filter(audit => 
    audit.status === 'completed' && !audit.viewedAt
  ).length
  
  // Calculate unpaid invoices count (pending or overdue)
  const unpaidInvoicesCount = invoices.filter(inv => 
    inv.status === 'pending' || inv.status === 'overdue'
  ).length

  // Calculate pending proposals count (sent but not signed/declined)
  const pendingProposalsCount = proposals.filter(p => 
    p.status === 'sent' || p.status === 'viewed'
  ).length
  
  // Total Sonor notifications (proposals + invoices requiring attention)
  const uptradeNotificationCount = pendingProposalsCount + unpaidInvoicesCount

  // ============================================================================
  // NAVIGATION STRUCTURE (Simplified: org/project based, no "tenant" terminology)
  // ============================================================================
  
  // ARCHITECTURE:
  // - Agency org (Sonor) = Admin view with all tools
  // - Client orgs = Client view with their project features
  // - Org-level users auto-step into first project on login
  // - Project modules are scoped to currentProject.id
  // - Org modules (billing, proposals) stay constant across project switches
  
  // Helper to check if current project has a specific feature
  const projectHasFeature = (feature) => {
    if (!projectFeatures) return false
    if (Array.isArray(projectFeatures)) return projectFeatures.includes(feature)
    return projectFeatures?.[feature] === true
  }
  
  // Build navigation based on context - MUTUALLY EXCLUSIVE paths
  let allNavigationItems = []
  
  // --- SALES REP VIEW (simplified) ---
  if (isSalesRep) {
    allNavigationItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'crm', label: 'My Prospects', icon: Users },
    ]
  }
  // --- MANAGER VIEW (non-admin managers) ---
  else if (isManager && !isAdmin) {
    allNavigationItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'crm', label: 'CRM', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null },
    ]
  }
  // --- AGENCY ADMIN VIEW (Sonor org = admin portal) ---
  else if (isAgencyOrg) {
    // Core admin portal items - Proposals and Billing are now managed within Commerce
    allNavigationItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'audits', label: 'Audits', icon: LineChart, badge: unreadAudits > 0 ? unreadAudits.toString() : null },
      { id: 'projects', label: 'Projects', icon: FileText },
      { id: 'files', label: 'Files', icon: FolderOpen },
      { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages.toString() : null },
      { id: 'sync', label: 'Sync', icon: Calendar },
      { id: 'crm', label: 'CRM', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null },
    ]

    // Clients - managed client orgs (agency view)
    allNavigationItems.push({ id: 'clients-managed', label: 'Clients', icon: Building2 })

    // Platform module - only for platform admins
    if (isSuperAdmin) {
      allNavigationItems.push({ id: 'platform', label: 'Platform', icon: Shield })
    }

    // Feature-gated admin tools (show unless explicitly disabled)
    if (hasFeature('seo')) allNavigationItems.push({ id: 'seo', label: 'SEO', icon: Search })
    if (hasFeature('seo')) allNavigationItems.push({ id: 'website', label: 'Website', icon: Globe2 })
    // Commerce is an admin tool - contains Proposals (Contracts) and Invoices for Sonor
    allNavigationItems.push({ id: 'commerce', label: 'Commerce', icon: Box })
    if (hasFeature('engage')) allNavigationItems.push({ id: 'engage', label: 'Engage', icon: Zap })
    // Always show reputation for admins (it's an admin-only feature)
    allNavigationItems.push({ id: 'reputation', label: 'Reputation', icon: Star })
    // Broadcast - social media management
    allNavigationItems.push({ id: 'broadcast', label: 'Broadcast', icon: Radio })
    // Affiliates - affiliate tracking
    if (hasFeature('affiliates')) allNavigationItems.push({ id: 'affiliates', label: 'Affiliates', icon: Link2 })
    if (hasFeature('signal')) allNavigationItems.push({ id: 'signal', label: 'Signal AI', icon: SignalIcon })
    if (hasFeature('forms')) allNavigationItems.push({ id: 'forms', label: 'Forms', icon: ClipboardList })
    if (hasFeature('blog')) allNavigationItems.push({ id: 'blog', label: 'Blog', icon: BookOpen })
    if (hasFeature('portfolio')) allNavigationItems.push({ id: 'portfolio', label: 'Portfolio', icon: Briefcase })
    if (hasFeature('outreach') || hasFeature('email') || hasFeature('email_manager')) {
      allNavigationItems.push({ id: 'outreach', label: 'Outreach', icon: Mail })
    }
    if (hasFeature('analytics')) allNavigationItems.push({ id: 'analytics', label: 'Analytics', icon: BarChart3 })
  }
  // --- CLIENT ORG VIEW (viewing a client organization/project) ---
  else if (isClientOrg) {
    // Check if this project org should see Sonor services
    const isUptradeClient = currentProject?.is_uptrade_client !== false
    
    // Check if we have a project selected
    const hasProjectSelected = !!currentProject
    
    // ORG-LEVEL VIEW (no project selected) - Show org overview items
    if (!hasProjectSelected) {
      allNavigationItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'projects', label: 'Projects', icon: FileText },
        { id: 'sync', label: 'Sync', icon: Calendar },
        { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages.toString() : null },
      ]
      
      // Sonor services - collapsible dropdown for Sonor clients
      if (hasOrgLevelAccess) {
        allNavigationItems.push({ 
          id: 'uptrade-collapsible', 
          label: 'Sonor', 
          isCollapsibleSection: true,
          icon: Building2,
          badge: uptradeNotificationCount > 0 ? uptradeNotificationCount.toString() : null,
          items: [
            { id: 'billing', label: 'Billing', icon: DollarSign, badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount.toString() : null },
            { id: 'proposals', label: 'Proposals', icon: Send, badge: pendingProposalsCount > 0 ? pendingProposalsCount.toString() : null },
          ]
        })
      }
    }
    // PROJECT-LEVEL VIEW (project selected) - Show project-specific modules
    else {
      // Project modules section (scoped to currentProject)
      allNavigationItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
      ]
      
      // Project feature-gated modules in specified order
      if (projectHasFeature('signal')) allNavigationItems.push({ id: 'signal', label: 'Signal AI', icon: SignalIcon })
      if (projectHasFeature('analytics')) allNavigationItems.push({ id: 'analytics', label: 'Analytics', icon: BarChart3 })
      if (projectHasFeature('ecommerce') || projectHasFeature('commerce')) allNavigationItems.push({ id: 'commerce', label: 'Commerce', icon: Box })
      // CRM - unified module for all org types (isAgency layer handles capability filtering)
      allNavigationItems.push({ id: 'crm', label: 'CRM', icon: Users })
      if (projectHasFeature('forms')) allNavigationItems.push({ id: 'forms', label: 'Forms', icon: ClipboardList })
      if (projectHasFeature('outreach') || projectHasFeature('email') || projectHasFeature('email_manager')) {
        allNavigationItems.push({ id: 'outreach', label: 'Outreach', icon: Mail })
      }
      if (projectHasFeature('engage')) allNavigationItems.push({ id: 'engage', label: 'Engage', icon: Zap })
      if (projectHasFeature('blog')) allNavigationItems.push({ id: 'blog', label: 'Blog', icon: BookOpen })
      if (projectHasFeature('seo')) allNavigationItems.push({ id: 'seo', label: 'SEO', icon: Search })
      if (projectHasFeature('seo')) allNavigationItems.push({ id: 'website', label: 'Website', icon: Globe2 })
      if (projectHasFeature('reputation')) allNavigationItems.push({ id: 'reputation', label: 'Reputation', icon: Star })
      if (projectHasFeature('broadcast')) allNavigationItems.push({ id: 'broadcast', label: 'Broadcast', icon: Radio })
      if (projectHasFeature('affiliates')) allNavigationItems.push({ id: 'affiliates', label: 'Affiliates', icon: Link2 })
      
      // Organization services section (stays constant across project switches)
      allNavigationItems.push({ id: 'org-divider', label: '', isDivider: true })
      allNavigationItems.push({ id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages.toString() : null })
      allNavigationItems.push({ id: 'projects', label: 'Projects', icon: FileText })
      allNavigationItems.push({ id: 'sync', label: 'Sync', icon: Calendar })
      allNavigationItems.push({ id: 'files', label: 'Files', icon: FolderOpen })
      
      // Sonor services - collapsible dropdown for Sonor clients (not Sonor white-label)
      // Uses a special marker that will be rendered as a collapsible section
      if (isUptradeClient && hasOrgLevelAccess) {
        allNavigationItems.push({ 
          id: 'uptrade-collapsible', 
          label: 'Sonor', 
          isCollapsibleSection: true,
          icon: Building2,
          badge: uptradeNotificationCount > 0 ? uptradeNotificationCount.toString() : null,
          items: [
            { id: 'billing', label: 'Billing', icon: DollarSign, badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount.toString() : null },
            { id: 'proposals', label: 'Proposals', icon: Send, badge: pendingProposalsCount > 0 ? pendingProposalsCount.toString() : null },
          ]
        })
      }
    }
  }

  const handleNavigation = (item) => {
    // Always navigate using URL routes for consistent routing
    const route = item.route || `/${item.id === 'dashboard' ? '' : item.id}`
    navigate(route)
    // Also call onSectionChange for any component that needs it
    onSectionChange?.(item.id)
  }

  const handleLogout = async () => {
    await logout()
    // Auth store handles redirect to /login
  }

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-x-hidden">
      {/* Header - Only show if not minimal mode (TopHeader handles org/project switching) */}
      {!minimal && (
        <div className="p-4 border-b border-border/50 bg-card/50">
          <div className="flex items-center justify-between">
            {isExpanded && (
              <div className="flex items-center space-x-3">
                <LogoSvg className="w-8 h-8 text-black dark:text-white" fill="currentColor" />
                <div>
                  <h2 className="font-semibold text-sm text-foreground">
                    {currentOrg?.name || 'Sonor'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Client Portal</p>
                </div>
              </div>
            )}
            {!isExpanded && (
              <LogoSvg className="w-6 h-6 mx-auto text-black dark:text-white" fill="currentColor" />
            )}
            {!isMobile && !minimal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {!isExpanded ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* User Info - Only show if not minimal mode */}
      {!minimal && isExpanded && (
        <div className="p-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center space-x-3">
            <ContactAvatar 
              contact={user}
              size="md"
              showBadge
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-foreground">
                {user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.role === 'admin' && (
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                  Admin
                </Badge>
              )}
              {user?.teamRole && user?.role !== 'admin' && (
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 capitalize border-border/50 text-muted-foreground">
                  {user.teamRole === 'sales_rep' ? 'Sales Rep' : user.teamRole}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation - Scrollable */}
      <nav className="flex-1 min-h-0 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <motion.div
          className="flex flex-col"
          variants={staggerVariants.container}
          initial="hidden"
          animate="visible"
        >
          {allNavigationItems.map((item) => {
            // Handle divider items (tenant module separator)
            if (item.isDivider) {
              if (!isExpanded) {
                return (
                  <motion.div key={item.id} variants={staggerVariants.item}>
                    <div className="py-2">
                      <Separator className="bg-border" />
                    </div>
                  </motion.div>
                )
              }
              return (
                <motion.div key={item.id} variants={staggerVariants.item}>
                  <div className={item.label ? "pt-4 pb-2" : "py-3"}>
                    <Separator className="bg-border/50" />
                    {item.label && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 block mt-2">
                        {item.label}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            }
          
            // Handle collapsible sections (Sonor dropdown)
            if (item.isCollapsibleSection) {
            const SectionIcon = item.icon
            const hasActiveChild = item.items?.some(child => activeSection === child.id)
            
            // In collapsed mode, just show the icon
            if (!isExpanded) {
              return (
                <motion.div key={item.id} variants={staggerVariants.item}>
                  <div className="py-2">
                    <Separator className="bg-border/50" />
                    {item.badge && (
                      <div className="flex justify-center mt-1">
                        <Badge 
                          variant="default" 
                          className="border-0 text-[10px] px-1.5"
                          style={{ backgroundColor: brandPrimary, color: 'white' }}
                        >
                          {item.badge}
                        </Badge>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            }
            
            return (
              <motion.div key={item.id} variants={staggerVariants.item}>
              <Collapsible
                open={uptradeDropdownOpen}
                onOpenChange={setUptradeDropdownOpen}
                className="py-3"
              >
                <Separator className="bg-border/50 mb-3" />
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 ${hasActiveChild ? 'text-primary' : ''}`}
                  >
                    <SectionIcon className="h-4 w-4 mr-3" />
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant="default" 
                        className="ml-2 border-0"
                        style={{ backgroundColor: brandPrimary, color: 'white' }}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${uptradeDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pt-1 space-y-1">
                  {item.items?.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = activeSection === child.id
                    return (
                      <Button
                        key={child.id}
                        variant={isChildActive ? "secondary" : "ghost"}
                        className={`w-full justify-start px-3 ${
                          isChildActive 
                            ? '' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                        style={isChildActive ? {
                          backgroundColor: rgba.primary10,
                          color: brandPrimary,
                        } : {}}
                        onClick={() => handleNavigation(child)}
                      >
                        <ChildIcon className="h-4 w-4 mr-3" />
                        <span className="flex-1 text-left">{child.label}</span>
                        {child.badge && (
                          <Badge 
                            variant="default" 
                            className="ml-auto border-0"
                            style={{ backgroundColor: brandPrimary, color: 'white' }}
                          >
                            {child.badge}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
              </motion.div>
            )
          }
          
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <motion.div key={item.id} variants={staggerVariants.item}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full h-10 min-h-[44px] justify-start px-0 ${
                isActive 
                  ? '' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              style={isActive ? {
                backgroundColor: rgba.primary10,
                color: brandPrimary,
              } : {}}
              onClick={() => handleNavigation(item)}
              aria-label={item.label || item.id}
            >
              {/* Icon container - fixed 56px width to keep icons in place */}
              <span className="flex items-center justify-center w-14 flex-shrink-0">
                {item.customIcon ? (
                  <img src={item.customIcon} alt="" className={`h-[18px] w-[18px] ${isActive ? 'brightness-0 invert sepia saturate-[10] hue-rotate-[85deg]' : 'brightness-0 invert-[0.6]'}`} />
                ) : (
                  <Icon className="h-[18px] w-[18px]" />
                )}
              </span>
              {/* Text appears to the right when expanded */}
              {isExpanded && (
                <>
                  <span className="flex-1 text-left text-sm pr-3">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="default" 
                      className="mr-3 border-0 text-[10px] h-5 min-w-5 flex items-center justify-center"
                      style={{ backgroundColor: brandPrimary, color: 'white' }}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Button>
            </motion.div>
          )
        })}
        </motion.div>
      </nav>

      {/* Organization Settings - org-level users in client orgs, or agency (to manage our team) */}
      {hasOrgLevelAccess && currentOrg && (isClientOrg || isAgencyOrg) && (
        <div className="py-2 border-t border-border/50">
          <Button
            variant="ghost"
            className={`w-full h-10 justify-start px-0 ${
              location.pathname === '/organization'
                ? 'text-foreground bg-muted/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={() => navigate('/organization')}
            aria-label="Organization settings"
          >
            <span className="flex items-center justify-center w-14 flex-shrink-0">
              <Settings className="h-[18px] w-[18px]" />
            </span>
            {isExpanded && <span className="text-sm pr-3">{isAgencyOrg ? 'Our team' : 'Organization'}</span>}
          </Button>
        </div>
      )}

      {/* Footer - Sidebar control dropdown */}
      <div className="py-2 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-10 justify-start px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              aria-label="Sidebar control"
            >
              <span className="flex items-center justify-center w-14 flex-shrink-0">
                <PanelLeft className="h-[18px] w-[18px]" />
              </span>
              {isExpanded && <span className="text-sm pr-3">Sidebar control</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Sidebar control</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sidebarMode} onValueChange={setSidebarMode}>
              <DropdownMenuRadioItem value="expanded" className="pl-8">
                Expanded
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="collapsed" className="pl-8">
                Collapsed
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="hover" className="pl-8">
                Expand on hover
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
        <div className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border/50 shadow-2xl">
          {sidebarContent}
        </div>
      </div>
    )
  }

  // Sidebar expands from 56px to 240px, icons stay in fixed left column
  // In expanded mode, takes up space; in hover mode, overlays
  return (
    <motion.div 
      className="h-full bg-card border-r border-border/50"
      initial={false}
      animate={{ 
        width: isExpanded ? 240 : 56,
      }}
      transition={{ 
        duration: reducedMotion ? 0 : 0.15, 
        ease: [0.25, 0.1, 0.25, 1.0] 
      }}
      onMouseEnter={() => sidebarMode === 'hover' && handleHoverChange(true)}
      onMouseLeave={() => sidebarMode === 'hover' && handleHoverChange(false)}
      style={{
        boxShadow: isExpanded && sidebarMode === 'hover' ? '4px 0 24px rgba(0,0,0,0.15)' : undefined,
      }}
    >
      {sidebarContent}
    </motion.div>
  )
}

export default Sidebar
