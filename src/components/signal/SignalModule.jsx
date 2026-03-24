// src/components/signal/SignalModule.jsx
// Main Signal Module - The living AI brain dashboard
// Signal = AI framework/brain, Echo = conversational interface/voice
// MIGRATED TO REACT QUERY HOOKS - Jan 29, 2026 (CRUD via hooks, UI state via signal-store)

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Activity,
  Lightbulb,
  Sparkles,
  Settings,
  Loader2,
  AlertCircle,
  Zap,
  Database,
  Mic,
  FlaskConical,
  GraduationCap,
  Rocket,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { projectsApi } from '@/lib/sonor-api'
import { useSignalStore } from '@/lib/signal-store' // Keep for streaming UI state
import { useSignalConfig, useKnowledge, signalKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'

// Sub-components
import SignalPulse from './pulse/SignalPulse'
import SignalMind from './mind/SignalMind'
import SignalInsights from './insights/SignalInsights'
import SignalConfig from './config/SignalConfig'
import SignalPlayground from './playground/SignalPlayground'
import SignalVoiceLab from './voice/SignalVoiceLab'
import SignalTraining from './training/SignalTraining'
import SignalSetupWizard from './SignalSetupWizard'
import SignalAILogo from './SignalAILogo'

const TABS = [
  { id: 'pulse', label: 'Pulse', icon: Activity, description: 'Live dashboard' },
  { id: 'mind', label: 'Mind', icon: Brain, description: 'Knowledge center' },
  { id: 'insights', label: 'Insights', icon: Lightbulb, description: 'Analytics & gaps' },
  { id: 'playground', label: 'Playground', icon: FlaskConical, description: 'Test responses' },
  { id: 'voice', label: 'Voice Lab', icon: Mic, description: 'Echo personality' },
  { id: 'training', label: 'Training', icon: GraduationCap, description: 'Teach Echo' },
  { id: 'config', label: 'Config', icon: Settings, description: 'Settings' },
]

export default function SignalModule({ projectId: propProjectId, onNavigate }) {
  const { currentProject, currentOrg } = useAuthStore()
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [activeTab, setActiveTab] = useState('pulse')
  const [showWizard, setShowWizard] = useState(false)
  
  // Get project ID from props, current context, or selected
  const projectId = propProjectId || currentProject?.id || selectedProjectId
  const orgId = currentOrg?.id
  
  const {
    moduleConfig,
    moduleConfigLoading,
    moduleConfigError,
    fetchModuleConfig,
    knowledgeStats,
    faqsStats,
    knowledgeGapsStats,
    fetchKnowledgeGapsStats
  } = useSignalStore()
  
  // Fetch projects if no project context
  useEffect(() => {
    if (!propProjectId && !currentProject?.id && orgId) {
      fetchProjects()
    }
  }, [propProjectId, currentProject?.id, orgId])
  
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const { data } = await projectsApi.list({ organizationId: orgId })
      const orgProjects = data.projects || []
      setProjects(orgProjects)
      if (orgProjects.length > 0) {
        setSelectedProjectId(orgProjects[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }
  
  // Fetch config when project changes
  useEffect(() => {
    if (projectId) {
      fetchModuleConfig(projectId)
      fetchKnowledgeGapsStats(projectId)
    }
  }, [projectId, fetchModuleConfig, fetchKnowledgeGapsStats])
  
  // Loading state
  if (moduleConfigLoading && !moduleConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Connecting to Signal...</p>
        </div>
      </div>
    )
  }
  
  // No project selected
  if (!projectId) {
    return (
      <div className="p-6">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-[var(--text-primary)]">Select a Project</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Choose a project to view its Signal AI configuration.
                </p>
                {loadingProjects ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-3" />
                ) : projects.length > 0 ? (
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-64 mt-3">
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] mt-3">No projects found.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Handle wizard completion
  const handleWizardComplete = () => {
    setShowWizard(false)
    fetchModuleConfig(projectId)
  }
  
  // If showing the wizard, render it full-screen
  if (showWizard) {
    return (
      <div className="relative min-h-screen">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWizard(false)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Signal
          </Button>
        </div>
        
        <SignalSetupWizard
          projectId={projectId}
          domain={currentProject?.domain}
          onComplete={handleWizardComplete}
          onSkip={() => setShowWizard(false)}
        />
      </div>
    )
  }
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pulse':
        return <div data-tour="signal-pulse"><SignalPulse projectId={projectId} onNavigate={setActiveTab} /></div>
      case 'mind':
        return <div data-tour="signal-mind"><SignalMind projectId={projectId} onNavigate={setActiveTab} /></div>
      case 'insights':
        return <SignalInsights projectId={projectId} onNavigate={setActiveTab} />
      case 'config':
        return <SignalConfig projectId={projectId} onNavigateToWizard={() => setShowWizard(true)} />
      case 'playground':
        return <div data-tour="signal-playground"><SignalPlayground projectId={projectId} /></div>
      case 'voice':
        return <div data-tour="signal-voice"><SignalVoiceLab projectId={projectId} /></div>
      case 'training':
        return <SignalTraining projectId={projectId} />
      default:
        return <SignalPulse projectId={projectId} onNavigate={setActiveTab} />
    }
  }

  return (
    <div data-sonor-help="signal/dashboard" className="relative h-full min-h-0 flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[120px]"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>
      
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between" data-tour="signal-header">
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {/* Glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-40" />
              <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                <SignalAILogo size={36} white className="" />
              </div>
            </motion.div>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <span className="text-[var(--text-primary)]">Signal</span>
                <span className="px-1.5 rounded bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-semibold">AI</span>
              </h1>
              <p className="text-sm text-[var(--text-muted)]">Powered by <span className="font-semibold text-[var(--text-secondary)]">Sonor</span></p>
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
              animate={{ boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0)', '0 0 0 4px rgba(16, 185, 129, 0.1)', '0 0 0 0 rgba(16, 185, 129, 0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-lg shadow-emerald-500/50" />
              </span>
              <span className="text-xs font-medium text-emerald-400">Online</span>
            </motion.div>
            
            {knowledgeStats?.totalChunks > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                <Database className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-xs font-medium text-teal-400">{knowledgeStats.totalChunks} chunks</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Tabs - Redesigned */}
        <div className="relative" data-tour="signal-tabs">
          <div className="flex gap-1 p-1.5 bg-gradient-to-r from-white/[0.03] to-white/[0.01] backdrop-blur-sm rounded-xl border border-white/[0.05] overflow-x-auto">
            {TABS.map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]"
                )}
              >
                {/* Active background */}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                
                <tab.icon className={cn("relative h-4 w-4", activeTab === tab.id && "text-white")} />
                <span className="relative">{tab.label}</span>
                
                {tab.badge && (
                  <span className={cn(
                    "relative text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide",
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : tab.badge === 'New' 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-amber-500/20 text-amber-400"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Coming Soon placeholder component - Redesigned
function ComingSoonPlaceholder({ title, description, icon: Icon }) {
  return (
    <motion.div 
      className="relative rounded-2xl overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
      <div className="absolute inset-0 border border-dashed border-white/10 rounded-2xl" />
      
      {/* Ambient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full bg-teal-500/10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      />
      
      <div className="relative py-20 px-6">
        <div className="text-center max-w-md mx-auto">
          {/* Icon */}
          <motion.div 
            className="relative inline-block mb-6"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-full blur-xl" />
            <div className="relative p-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <Icon className="h-10 w-10 text-emerald-400" />
            </div>
          </motion.div>
          
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{title}</h3>
          <p className="text-[var(--text-secondary)] leading-relaxed">{description}</p>
          
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Coming Soon</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
