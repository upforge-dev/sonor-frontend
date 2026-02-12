// src/components/TopHeader.jsx
// Supabase-style top header bar with org/project switchers, search, help, and user menu
import { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { 
  Search, 
  HelpCircle, 
  ChevronDown, 
  Check, 
  LogOut, 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  User,
  Building2,
  FolderOpen,
  Sparkles,
  Plus,
  Bug,
  BookOpen,
  MessageSquare,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import ContactAvatar from '@/components/ui/ContactAvatar'
import AccountSettingsModal from '@/components/settings/AccountSettingsModal'
import useAuthStore from '@/lib/auth-store'
import useThemeStore from '@/lib/theme-store'
import { useAccountSettingsStore } from '@/lib/account-settings-store'
import { authApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

// Detect if user is on Windows
const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)
const modKey = isWindows ? 'Ctrl' : '⌘'

// ============================================================================
// ORG SWITCHER DROPDOWN
// ============================================================================
function OrgSwitcherDropdown() {
  const { 
    currentOrg, 
    availableOrgs, 
    isSuperAdmin, 
    switchOrganization,
    fetchAllOrganizations,
    exitProjectView,
    currentProject,
    isLoading 
  } = useAuthStore()
  
  const [allOrgs, setAllOrgs] = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  const loadAllOrgs = async () => {
    if (loadingOrgs || allOrgs.length > 0) return
    setLoadingOrgs(true)
    const orgsWithProjects = await fetchAllOrganizations()
    setAllOrgs(orgsWithProjects || [])
    setLoadingOrgs(false)
  }

  const handleSwitchOrg = async (org) => {
    await switchOrganization(org.id)
  }
  
  // Handle clicking org name to go back to org dashboard
  const handleOrgClick = async () => {
    if (currentProject) {
      await exitProjectView()
    }
  }

  // Use available orgs or fetched orgs
  const orgsToShow = isSuperAdmin ? allOrgs : (availableOrgs || [])

  return (
    <div className="flex items-center gap-1">
      {/* Org name - clickable to go to org dashboard */}
      <button 
        onClick={handleOrgClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
        disabled={isLoading}
        aria-label="Go to organization dashboard"
      >
        <span className="text-sm max-w-[150px] truncate">{currentOrg?.name || 'Select Org'}</span>
        {isSuperAdmin && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            PRO
          </Badge>
        )}
      </button>
      
      {/* Dropdown toggle */}
      <DropdownMenu onOpenChange={(open) => open && isSuperAdmin && loadAllOrgs()}>
        <DropdownMenuTrigger asChild>
          <button 
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors border border-border/50"
            disabled={isLoading}
            aria-label="Switch organization"
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5">
            <Input 
              placeholder="Find organization..." 
              className="h-8 text-sm"
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
          {orgsToShow.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              {loadingOrgs ? 'Loading...' : 'No organizations'}
            </div>
          )}
          {orgsToShow.map((org) => (
            <DropdownMenuItem 
              key={org.id}
              onClick={() => handleSwitchOrg(org)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{org.name}</span>
              {currentOrg?.id === org.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                <Plus className="h-4 w-4 mr-2" />
                New organization
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ============================================================================
// PROJECT SWITCHER DROPDOWN
// ============================================================================
function ProjectSwitcherDropdown({ onNavigateToProjects }) {
  const { 
    currentProject, 
    availableProjects,
    switchProject,
    isLoading 
  } = useAuthStore()

  const handleSwitchProject = async (project) => {
    await switchProject(project.id)
  }

  // Environment badge based on project status
  const getEnvironmentBadge = (project) => {
    if (project.status === 'active') return 'PRODUCTION'
    if (project.status === 'in_progress') return 'IN PROGRESS'
    return null
  }
  
  // Don't show project switcher if no project is selected (at org level)
  if (!currentProject) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          disabled={isLoading}
          aria-label="Switch project"
        >
          <span className="text-sm max-w-[150px] truncate">{currentProject?.name || currentProject?.title || 'Project'}</span>
          {currentProject && getEnvironmentBadge(currentProject) && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-muted">
              {getEnvironmentBadge(currentProject)}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
        {(!availableProjects || availableProjects.length === 0) && (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No projects available
          </div>
        )}
        {availableProjects?.map((project) => (
          <DropdownMenuItem 
            key={project.id}
            onClick={() => handleSwitchProject(project)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{project.name || project.title}</span>
            {currentProject?.id === project.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onNavigateToProjects} className="text-muted-foreground">
          <FolderOpen className="h-4 w-4 mr-2" />
          View all projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// USER MENU DROPDOWN
// ============================================================================
function UserMenuDropdown({ onNavigate, onOpenSearch }) {
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const handleLogout = async () => {
    await logout()
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 rounded-full overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all" aria-label="User menu">
          <ContactAvatar 
            contact={user}
            size="sm"
            className="w-8 h-8"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info */}
        <div className="px-2 py-2 border-b border-border/50">
          <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        {onOpenSearch && (
          <DropdownMenuItem onClick={onOpenSearch}>
            <Search className="h-4 w-4 mr-2" />
            Quick search ({modKey}K)
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => useAccountSettingsStore.getState().openModal()}>
          <Settings className="h-4 w-4 mr-2" />
          Account Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Sparkles className="h-4 w-4 mr-2" />
          Feature previews
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme selection */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="pl-8">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// PROJECT SECTION (separator + switcher)
// ============================================================================
function ProjectSection({ onNavigateToProjects }) {
  const { currentProject } = useAuthStore()
  
  // Don't show anything if no project is selected (at org level)
  if (!currentProject) {
    return null
  }
  
  return (
    <>
      {/* Separator */}
      <span className="text-muted-foreground/30 mx-1">/</span>
      {/* Project Switcher */}
      <ProjectSwitcherDropdown onNavigateToProjects={onNavigateToProjects} />
    </>
  )
}

// ============================================================================
// BUG REPORT DIALOG
// ============================================================================
function BugReportDialog({ open, onOpenChange }) {
  const { user, currentOrg, currentProject } = useAuthStore()
  const location = useLocation()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const currentPage = location.pathname

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!description.trim()) return

    setSending(true)
    try {
      // Try API first
      await authApi.submitSupport({
        type: 'bug_report',
        subject: subject || `Bug Report: ${currentPage}`,
        description,
        page: currentPage,
        userEmail: user?.email,
        userName: user?.name,
        orgName: currentOrg?.name,
        projectName: currentProject?.name || currentProject?.title,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      })
      setSent(true)
    } catch (err) {
      // Fallback: open mailto with pre-filled content
      console.warn('[BugReport] API failed, falling back to mailto:', err)
      const body = [
        `Bug Report`,
        ``,
        `Page: ${window.location.origin}${currentPage}`,
        `User: ${user?.name || 'Unknown'} (${user?.email || 'Unknown'})`,
        `Org: ${currentOrg?.name || 'N/A'}`,
        `Project: ${currentProject?.name || currentProject?.title || 'N/A'}`,
        `Time: ${new Date().toLocaleString()}`,
        `Browser: ${navigator.userAgent}`,
        ``,
        `---`,
        ``,
        subject ? `Subject: ${subject}` : '',
        ``,
        description,
      ].filter(Boolean).join('\n')

      const mailtoUrl = `mailto:ramsey@uptrademedia.com?subject=${encodeURIComponent(subject || `Bug Report: ${currentPage}`)}&body=${encodeURIComponent(body)}`
      window.open(mailtoUrl, '_blank')
      setSent(true)
    } finally {
      setSending(false)
    }
  }, [subject, description, currentPage, user, currentOrg, currentProject])

  const handleClose = useCallback((open) => {
    onOpenChange(open)
    if (!open) {
      // Reset after close animation
      setTimeout(() => {
        setSubject('')
        setDescription('')
        setSent(false)
      }, 200)
    }
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        {sent ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Report Sent</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Thanks for reporting this. We'll look into it right away.
            </p>
            <Button onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-destructive" />
                Report a Bug
              </DialogTitle>
              <DialogDescription>
                Describe the issue you encountered and we'll get it fixed.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Auto-detected page */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Page</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border text-sm">
                  <span className="truncate text-muted-foreground">{currentPage}</span>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="bug-subject">Subject</Label>
                <Input
                  id="bug-subject"
                  placeholder="Brief summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="bug-description">
                  What happened? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="bug-description"
                  placeholder="Describe the bug, what you expected to happen, and what actually happened..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              {/* User context (read-only) */}
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 space-y-0.5">
                <p>Reported by: {user?.name || user?.email || 'Unknown'}</p>
                {currentOrg?.name && <p>Organization: {currentOrg.name}</p>}
                {(currentProject?.name || currentProject?.title) && (
                  <p>Project: {currentProject.name || currentProject.title}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!description.trim() || sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Report'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN TOP HEADER COMPONENT
// ============================================================================
export default function TopHeader({ onNavigate, onOpenSearch }) {
  const [bugReportOpen, setBugReportOpen] = useState(false)

  return (
    <TooltipProvider>
      <header className="h-12 flex items-center justify-between border-b border-border/50 bg-card backdrop-blur-sm" role="banner" aria-label="Top navigation">
        {/* Left section: Logo + Org + Project */}
        <div className="flex items-center">
          {/* Uptrade Logo - aligned with sidebar icons (56px = w-14) */}
          <a href="/" className="w-14 flex items-center justify-center hover:bg-muted/50 transition-colors h-12">
            <img 
              src="/favicon.svg" 
              alt="Uptrade" 
              className="w-5 h-5"
            />
          </a>

          {/* Separator */}
          <span className="text-muted-foreground/30">/</span>

          {/* Org Switcher */}
          <OrgSwitcherDropdown />

          {/* Project Section (separator + switcher) - only shown when project is selected */}
          <ProjectSection onNavigateToProjects={() => onNavigate?.('projects')} />
        </div>

        {/* Right section: Search + Help + User */}
        <div className="flex items-center gap-2 pr-4">
          {/* Search Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground min-w-[200px]"
                onClick={onOpenSearch}
                aria-label="Open search (Command+K)"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline flex-1 text-left">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {modKey}K
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search ({modKey}K)</TooltipContent>
          </Tooltip>

          {/* Help & Support Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 text-muted-foreground hover:text-foreground" aria-label="Help and support">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Help & support</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Help & Support</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setBugReportOpen(true)}>
                <Bug className="h-4 w-4 mr-2" />
                Report a Bug
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open('mailto:ramsey@uptrademedia.com?subject=Portal Support Request', '_blank')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <BookOpen className="h-4 w-4 mr-2" />
                Documentation
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <UserMenuDropdown onNavigate={onNavigate} onOpenSearch={onOpenSearch} />
        </div>
      </header>
      <AccountSettingsModal />
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </TooltipProvider>
  )
}
