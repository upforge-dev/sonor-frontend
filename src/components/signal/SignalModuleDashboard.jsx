// src/components/signal/SignalModuleDashboard.jsx
// Main Signal Module dashboard - Central AI brain management for the portal
import { useState, useEffect } from 'react'
import {
  Brain,
  Settings,
  BookOpen,
  HelpCircle,
  Lightbulb,
  BarChart3,
  Loader2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Wand2,
  Building2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSignalStore } from '@/lib/signal-store' // Keep for streaming UI state
import { useSignalConfig, signalKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '@/lib/auth-store'
import { projectsApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'

// Sub-components
import SignalSetupWizard from './SignalSetupWizard'
import SignalProfileEditor from './SignalProfileEditor'
import SignalKnowledgeManager from './SignalKnowledgeManager'
import SignalFAQManager from './SignalFAQManager'
import SignalKnowledgeGaps from './SignalKnowledgeGaps'
import SignalLearningDashboard from './SignalLearningDashboard'
import SignalAnalytics from './SignalAnalytics'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Brain },
  { id: 'setup', label: 'Setup Wizard', icon: Wand2 },
  { id: 'profile', label: 'Profile', icon: Settings },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  { id: 'gaps', label: 'Gaps', icon: AlertCircle },
  { id: 'learning', label: 'Learning', icon: Lightbulb },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
]

export default function SignalModuleDashboard({ projectId: propProjectId, siteUrl, className, onNavigate }) {
  // Get project ID from props or current context
  const { currentProject, currentOrg } = useAuthStore()
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  
  // Get project ID from props, current context, or selected
  const projectId = propProjectId || currentProject?.id || selectedProjectId
  
  const {
    moduleConfig,
    moduleConfigLoading,
    moduleConfigError,
    fetchModuleConfig,
    knowledgeStats,
    faqsStats,
    suggestionsStats,
    knowledgeGapsStats,
    fetchKnowledgeGapsStats
  } = useSignalStore()

  const [activeTab, setActiveTab] = useState('overview')
  
  // Fetch projects if no project context
  useEffect(() => {
    if (!propProjectId && !currentProject?.id && currentOrg?.id) {
      fetchProjects()
    }
  }, [propProjectId, currentProject?.id, currentOrg?.id])
  
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      // Filter by current org to only show projects for this organization
      const { data } = await projectsApi.list({ organizationId: currentOrg?.id })
      const orgProjects = data.projects || []
      setProjects(orgProjects)
      // Auto-select first project belonging to this org
      if (orgProjects.length > 0) {
        setSelectedProjectId(orgProjects[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Fetch config on mount
  useEffect(() => {
    if (projectId) {
      fetchModuleConfig(projectId)
      fetchKnowledgeGapsStats(projectId)
    }
  }, [projectId])
  
  // Loading projects state
  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (moduleConfigLoading && !moduleConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (moduleConfigError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load Signal configuration: {moduleConfigError}
        </AlertDescription>
      </Alert>
    )
  }

  const isEnabled = moduleConfig?.is_enabled

  // Check project plan for Signal access
  const currentPlan = currentProject?.plan || 'standard'
  const hasSignalPlan = currentPlan === 'limited_ai' || currentPlan === 'full_signal'
  const effectivelyEnabled = isEnabled || hasSignalPlan
  
  // Get current project name for display
  const currentProjectName = currentProject?.title || 
    projects.find(p => p.id === selectedProjectId)?.title ||
    currentOrg?.name || 
    'your site'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl',
            effectivelyEnabled ? 'bg-emerald-500/20' : 'bg-muted'
          )}>
            <Brain className={cn(
              'h-6 w-6',
              effectivelyEnabled ? 'text-emerald-400' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Signal AI
              <Badge variant={effectivelyEnabled ? 'default' : 'secondary'} className={cn(
                effectivelyEnabled && 'bg-emerald-500/20 text-emerald-400'
              )}>
                {effectivelyEnabled ? 'Active' : 'Inactive'}
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Central AI brain for {currentProjectName} — powers chat widget, SEO insights, and smart responses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Selector - show when no current project context */}
          {!currentProject?.id && projects.length > 0 && (
            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Signal status notices */}
      {!effectivelyEnabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Signal AI is not enabled for this project. Upgrade the project plan to <strong>Limited AI</strong> or <strong>Full Signal</strong> to enable AI features.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          {TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab 
              projectId={projectId}
              config={moduleConfig}
              knowledgeStats={knowledgeStats}
              faqsStats={faqsStats}
              suggestionsStats={suggestionsStats}
              knowledgeGapsStats={knowledgeGapsStats}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="setup" className="mt-0">
            <SignalSetupWizard 
              projectId={moduleConfig?.seoIntegration?.projectId}
              projectId={projectId}
              domain={siteUrl || currentProject?.domain || moduleConfig?.seoIntegration?.domain}
              onComplete={() => {
                fetchModuleConfig(projectId)
                setActiveTab('overview')
              }}
              onSkip={() => setActiveTab('overview')}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <SignalProfileEditor projectId={projectId} />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0">
            <SignalKnowledgeManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="faqs" className="mt-0">
            <SignalFAQManager projectId={projectId} />
          </TabsContent>

          <TabsContent value="gaps" className="mt-0">
            <SignalKnowledgeGaps projectId={projectId} />
          </TabsContent>

          <TabsContent value="learning" className="mt-0">
            <SignalLearningDashboard projectId={projectId} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <SignalAnalytics projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Embed code is now handled by Engage module */}
    </div>
  )
}

// Overview tab component
function OverviewTab({ projectId, config, knowledgeStats, faqsStats, suggestionsStats, knowledgeGapsStats, onNavigate }) {
  const stats = [
    {
      label: 'Knowledge Chunks',
      value: knowledgeStats?.total || 0,
      icon: BookOpen,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      tab: 'knowledge'
    },
    {
      label: 'FAQs',
      value: (faqsStats?.approved || 0) + (faqsStats?.pending || 0),
      subtitle: faqsStats?.pending > 0 ? `${faqsStats.pending} pending` : undefined,
      icon: HelpCircle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/20',
      tab: 'faqs'
    },
    {
      label: 'Knowledge Gaps',
      value: knowledgeGapsStats?.openGaps || 0,
      subtitle: 'questions Signal can\'t answer',
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      tab: 'gaps'
    },
    {
      label: 'Suggestions',
      value: suggestionsStats?.byStatus?.pending || 0,
      subtitle: 'pending review',
      icon: Lightbulb,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      tab: 'learning'
    },
    {
      label: 'Conversations',
      value: config?.stats?.conversations || 0,
      subtitle: 'this month',
      icon: BarChart3,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      tab: 'analytics'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(stat => (
          <Card 
            key={stat.label}
            className="cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => onNavigate(stat.tab)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full',
                  stat.bg
                )}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEO Integration Status */}
      {config?.seoIntegration && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              SEO Integration Active
            </CardTitle>
            <CardDescription>
              Signal is using knowledge from your SEO module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Site</p>
                <p className="font-medium">{config.seoIntegration.domain}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pages Indexed</p>
                <p className="font-medium">{config.seoIntegration.pagesCount || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Knowledge Items</p>
                <p className="font-medium">{config.seoIntegration.knowledgeCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Button variant="default" className="h-auto py-4 flex-col gap-2 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" onClick={() => onNavigate('setup')}>
              <Wand2 className="h-5 w-5" />
              <span className="text-sm">Run Setup Wizard</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('profile')}>
              <Settings className="h-5 w-5" />
              <span className="text-sm">Edit Profile</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('knowledge')}>
              <BookOpen className="h-5 w-5" />
              <span className="text-sm">Add Knowledge</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('faqs')}>
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm">Manage FAQs</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => onNavigate('learning')}>
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm">Review Suggestions</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
