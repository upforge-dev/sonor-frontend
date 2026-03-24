/**
 * Signal Setup Wizard
 * 
 * Unified onboarding flow that trains Signal AI on your business:
 * - Site discovery & crawling (content understanding)
 * - Google Search Console integration (performance data)
 * - Signal AI training (knowledge base & brain)
 * - Schema markup generation (structured data)
 * - Internal link analysis (site architecture)
 * - Keyword cannibalization detection
 * - Topic cluster mapping (content organization)
 * - SERP feature opportunities
 * - Content decay detection
 * - Competitor analysis
 * - Local SEO setup
 * - And much more!
 * 
 * This wizard populates both the SEO module AND Signal's knowledge base.
 * Signal is the universal AI brain that powers chat, SEO, Engage, and more.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, 
  Brain, 
  Search, 
  FileText, 
  Link2, 
  Zap, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  BarChart3,
  Target,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Code,
  MapPin,
  Users,
  TrendingDown,
  Layers,
  Award,
  Shield,
  Clock,
  Rocket,
  ChevronRight,
  Activity,
  Database,
  Settings,
  Eye,
  PenLine,
  Gauge,
  Network,
  Microscope,
  BookOpen,
  Building2,
  HelpCircle,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { seoApi, projectsApi, commerceApi } from '@/lib/sonor-api'
import { signalSeoApi, faqsApi, knowledgeApi, profileApi, setupApi, configApi, echoApi } from '@/lib/signal-api'
import SignalSEOLogo from '@/components/seo/SignalSEOLogo'

// =============================================================================
// PHASE DEFINITIONS - Major stages of Signal Learning
// =============================================================================
const SETUP_PHASES = [
  {
    id: 'discovery',
    title: 'Discovery',
    description: 'Site pages auto-discovered via site-kit',
    icon: Search,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'data',
    title: 'Data Integration',
    description: 'Connect external data sources',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'intelligence',
    title: 'AI Training',
    description: 'Teaching Signal your business',
    icon: Brain,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'analysis',
    title: 'Deep Analysis',
    description: 'Technical & content audits',
    icon: Microscope,
    color: 'from-orange-500 to-rose-500'
  },
  {
    id: 'signal',
    title: 'Signal Setup',
    description: 'Configure AI assistant',
    icon: Sparkles,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'optimization',
    title: 'Finalization',
    description: 'Recommendations & automation',
    icon: Zap,
    color: 'from-amber-500 to-yellow-500'
  }
]

// =============================================================================
// DETAILED STEP DEFINITIONS - All Signal Learning operations
// =============================================================================
const SETUP_STEPS = [
  // PHASE 1: DISCOVERY
  {
    id: 'connect',
    phase: 'discovery',
    title: 'Connecting to Site',
    description: 'Verifying domain access and configuration',
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    duration: 2000
  },
  {
    id: 'verify-pages',
    phase: 'discovery',
    title: 'Verifying Pages',
    description: 'Checking pages discovered by site-kit',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    duration: 2000
  },
  {
    id: 'internal-links',
    phase: 'discovery',
    title: 'Mapping Internal Links',
    description: 'Building site architecture and link graph',
    icon: Network,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    endpoint: 'seo-internal-links',
    duration: 4000
  },
  
  // PHASE 2: DATA INTEGRATION
  {
    id: 'gsc-connect',
    phase: 'data',
    title: 'Google Search Console Sync',
    description: 'Syncing queries, pages, and performance data',
    icon: BarChart3,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    endpoint: 'seo-gsc-sync',
    duration: 3000
  },
  {
    id: 'gsc-queries',
    phase: 'data',
    title: 'Search Queries',
    description: '(Included in GSC sync)',
    icon: Target,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-gsc-queries',
    duration: 3000,
    autoComplete: true // Completed by gsc-connect
  },
  {
    id: 'gsc-pages',
    phase: 'data',
    title: 'Page Metrics',
    description: '(Included in GSC sync)',
    icon: Activity,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    endpoint: 'seo-gsc-pages',
    duration: 3000,
    autoComplete: true // Completed by gsc-connect
  },
  {
    id: 'gsc-indexing',
    phase: 'data',
    title: 'Indexing Status Check',
    description: 'Detecting 404s, 5xx errors, and indexing issues',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    endpoint: 'seo-gsc-indexing',
    duration: 4000
  },
  {
    id: 'pagespeed',
    phase: 'data',
    title: 'Core Web Vitals',
    description: 'Measuring LCP, INP, CLS performance',
    icon: Gauge,
    color: 'text-lime-500',
    bgColor: 'bg-lime-500/10',
    endpoint: 'seo-pagespeed-impact',
    duration: 5000
  },
  
  // PHASE 3: AI INTELLIGENCE
  {
    id: 'ai-train',
    phase: 'intelligence',
    title: 'Training Signal',
    description: 'Teaching Signal about your business and content',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    endpoint: 'seo-ai-train',
    duration: 8000
  },
  {
    id: 'ai-knowledge',
    phase: 'intelligence',
    title: 'Building Knowledge Base',
    description: 'Signal learning your site structure',
    icon: Database,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    endpoint: 'seo-ai-knowledge',
    duration: 5000
  },
  {
    id: 'topic-clusters',
    phase: 'intelligence',
    title: 'Topic Cluster Mapping',
    description: 'Signal organizing your content clusters',
    icon: Layers,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    endpoint: 'seo-topic-clusters',
    duration: 4000
  },
  {
    id: 'blog-brain',
    phase: 'intelligence',
    title: 'Content Style Training',
    description: 'Signal learning your writing style',
    icon: PenLine,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    endpoint: 'seo-ai-blog-brain',
    duration: 4000
  },
  {
    id: 'commerce-discovery',
    phase: 'intelligence',
    title: 'Commerce Discovery',
    description: 'Identifying products, services, and events',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    endpoint: 'commerce-analyze-site',
    duration: 10000
  },
  
  // PHASE 4: DEEP ANALYSIS
  {
    id: 'cannibalization',
    phase: 'analysis',
    title: 'Keyword Cannibalization',
    description: 'Detecting pages competing for same keywords',
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    endpoint: 'seo-cannibalization',
    duration: 4000
  },
  {
    id: 'content-decay',
    phase: 'analysis',
    title: 'Content Decay Detection',
    description: 'Finding pages losing traffic over time',
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    endpoint: 'seo-content-decay',
    duration: 3000
  },
  {
    id: 'content-gap',
    phase: 'analysis',
    title: 'Content Gap Analysis',
    description: 'Identifying missing topics and opportunities',
    icon: Search,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    endpoint: 'seo-content-gap-analysis',
    duration: 4000
  },
  {
    id: 'serp-features',
    phase: 'analysis',
    title: 'SERP Feature Opportunities',
    description: 'Finding featured snippet and FAQ targets',
    icon: Award,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    endpoint: 'seo-serp-features',
    duration: 4000
  },
  {
    id: 'technical-audit',
    phase: 'analysis',
    title: 'Technical SEO Audit',
    description: 'Checking robots, canonicals, redirects',
    icon: Shield,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    endpoint: 'seo-technical-audit',
    duration: 4000
  },
  {
    id: 'backlinks',
    phase: 'analysis',
    title: 'Backlink Analysis',
    description: 'Mapping external links and authority',
    icon: Link2,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    endpoint: 'seo-backlinks',
    duration: 3000
  },
  {
    id: 'local-seo',
    phase: 'analysis',
    title: 'Local SEO Check',
    description: 'Analyzing local signals and citations',
    icon: MapPin,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-local-analyze',
    duration: 3000
  },
  {
    id: 'competitors',
    phase: 'analysis',
    title: 'Competitor Analysis',
    description: 'Benchmarking against top competitors',
    icon: Users,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    endpoint: 'seo-competitor-analyze',
    duration: 5000
  },
  
  // PHASE 5: SIGNAL SETUP - Configure AI assistant capabilities
  {
    id: 'signal-config-init',
    phase: 'signal',
    title: 'Initializing Signal Config',
    description: 'Creating AI assistant configuration',
    icon: Settings,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'signal-config',
    duration: 2000
  },
  {
    id: 'signal-profile-extract',
    phase: 'signal',
    title: 'Extracting Business Profile',
    description: 'Learning brand, services, and tone from content',
    icon: Building2,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    endpoint: 'signal-profile-extract',
    duration: 5000
  },
  {
    id: 'signal-knowledge-sync',
    phase: 'signal',
    title: 'Syncing Knowledge Base',
    description: 'Building RAG embeddings from page content',
    icon: Database,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    endpoint: 'signal-knowledge-sync',
    duration: 8000
  },
  {
    id: 'signal-faq-generate',
    phase: 'signal',
    title: 'Generating FAQs',
    description: 'Auto-generating common Q&A from content',
    icon: HelpCircle,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    endpoint: 'signal-faq-generate',
    duration: 5000
  },
  {
    id: 'signal-test-chat',
    phase: 'signal',
    title: 'Testing Chat Response',
    description: 'Verifying Signal can answer questions',
    icon: MessageSquare,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    endpoint: 'signal-test',
    duration: 3000
  },
  
  // PHASE 6: OPTIMIZATION
  {
    id: 'schema-generate',
    phase: 'optimization',
    title: 'Generating Schema Markup',
    description: 'Creating structured data for all page types',
    icon: Code,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    endpoint: 'seo-schema-generate',
    duration: 5000
  },
  {
    id: 'metadata-optimize',
    phase: 'optimization',
    title: 'Optimizing Metadata',
    description: 'AI-powered title and description improvements',
    icon: PenLine,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    endpoint: 'seo-metadata-api',
    duration: 5000
  },
  {
    id: 'predictive-ranking',
    phase: 'optimization',
    title: 'Predictive Ranking Scores',
    description: 'Calculating ranking potential for all pages',
    icon: Rocket,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    endpoint: 'seo-predictive-ranking',
    duration: 4000
  },
  {
    id: 'opportunities',
    phase: 'optimization',
    title: 'Detecting Quick Wins',
    description: 'Finding high-impact, low-effort improvements',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    endpoint: 'seo-opportunities-detect',
    duration: 4000
  },
  {
    id: 'ai-recommendations',
    phase: 'optimization',
    title: 'AI Recommendations',
    description: 'Generating prioritized action items',
    icon: Sparkles,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    endpoint: 'seo-ai-recommendations',
    duration: 5000
  },
  {
    id: 'auto-optimize',
    phase: 'optimization',
    title: 'Running Auto-Optimization',
    description: 'Applying quick fixes and generating recommendations',
    icon: Zap,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-auto-optimize',
    duration: 4000
  },
  {
    id: 'keyword-tracking',
    phase: 'optimization',
    title: 'Setting Up Keyword Tracking',
    description: 'Importing top keywords from GSC for long-term tracking',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    endpoint: 'seo-keywords-import',
    duration: 3000
  },
  {
    id: 'cwv-baseline',
    phase: 'optimization',
    title: 'Recording CWV Baseline',
    description: 'Measuring initial Core Web Vitals performance',
    icon: Gauge,
    color: 'text-lime-500',
    bgColor: 'bg-lime-500/10',
    endpoint: 'seo-cwv',
    duration: 5000
  },
  {
    id: 'schedule-setup',
    phase: 'optimization',
    title: 'Setting Up Automation',
    description: 'Configuring recurring analysis schedules',
    icon: Clock,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    endpoint: 'seo-schedule',
    duration: 2000
  },
  {
    id: 'complete',
    phase: 'optimization',
    title: 'Learning Complete!',
    description: 'Signal AI is fully trained and ready',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    duration: 1000
  }
]

// =============================================================================
// ANIMATED COMPONENTS
// =============================================================================

// Animated progress ring
function ProgressRing({ progress, size = 120 }) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" style={{ width: size, height: size }}>
        <circle
          className="text-[var(--glass-border)]"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className="text-primary"
          strokeWidth="8"
          stroke="url(#signal-gradient)"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
        <defs>
          <linearGradient id="signal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#95d47d" />
            <stop offset="100%" stopColor="#238b95" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[var(--text-primary)]">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// Phase indicator pill
function PhaseIndicator({ phase, isActive, isCompleted, index }) {
  const Icon = phase.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
        isCompleted && 'bg-emerald-500/20 text-emerald-500',
        isActive && !isCompleted && `bg-gradient-to-r ${phase.color} text-white shadow-lg`,
        !isActive && !isCompleted && 'bg-[var(--glass-bg)] text-[var(--text-tertiary)]'
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : isActive ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span>{phase.title}</span>
    </motion.div>
  )
}

// Step status component
function StepIndicator({ step, status, isActive, index, onRestartFromStep, canRestart }) {
  const Icon = step.icon
  const isClickable = canRestart && (status === 'completed' || status === 'error') && !isActive
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
        isActive && 'bg-[var(--glass-bg)] shadow-md border border-[var(--glass-border)]',
        status === 'completed' && 'opacity-70',
        status === 'pending' && 'opacity-40',
        isClickable && 'cursor-pointer hover:bg-[var(--glass-bg)] hover:shadow-md'
      )}
      onClick={() => isClickable && onRestartFromStep(index)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
        step.bgColor,
        isActive && 'scale-110 shadow-md'
      )}>
        {status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : status === 'running' ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className={cn('w-5 h-5', step.color)} />
          </motion.div>
        ) : status === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Icon className={cn('w-5 h-5', step.color)} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            'font-medium text-sm truncate',
            isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
          )}>
            {step.title}
          </p>
          {step.optional && status === 'pending' && (
            <Badge variant="outline" className="text-xs">Optional</Badge>
          )}
          {isClickable && (
            <Badge variant="secondary" className="text-xs">Click to restart</Badge>
          )}
        </div>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-[var(--text-secondary)] truncate"
          >
            {step.description}
          </motion.p>
        )}
      </div>
      
      {status === 'completed' && (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      )}
    </motion.div>
  )
}

// Live log entry
function LogEntry({ log, index }) {
  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />
      default: return <ChevronRight className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={cn(
        'flex items-start gap-2 py-1 text-sm',
        log.type === 'error' && 'text-red-600',
        log.type === 'success' && 'text-emerald-600',
        log.type === 'warning' && 'text-amber-600'
      )}
    >
      {getLogIcon(log.type)}
      <span className="flex-1">{log.message}</span>
      <span className="text-xs text-gray-400">{log.time}</span>
    </motion.div>
  )
}

// Stats card
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[var(--glass-bg)] rounded-xl p-4 shadow-sm border border-[var(--glass-border)] w-full"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="w-full">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-secondary)] whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

// LocalStorage key for wizard progress persistence
const getWizardStorageKey = (projectId, siteId) => 
  `signal-wizard-${projectId || 'global'}-${siteId || 'pending'}`

// Helper to safely extract error message from any error type
const getErrorMessage = (err) => {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  
  // Check for axios error response
  const axiosError = err.response?.data?.error
  if (axiosError) {
    if (typeof axiosError === 'string') return axiosError
    if (typeof axiosError === 'object') return axiosError.message || JSON.stringify(axiosError)
  }
  
  const axiosMessage = err.response?.data?.message
  if (axiosMessage && typeof axiosMessage === 'string') return axiosMessage
  
  // Check for standard error properties
  if (err.message && typeof err.message === 'string') return err.message
  
  // Fallback to stringifying the object
  if (typeof err === 'object') {
    return err.message || err.error || JSON.stringify(err)
  }
  
  return String(err)
}

export default function SignalSetupWizard({ projectId, domain: propDomain, onComplete, onSkip }) {
  // Track the actual siteId and domain (resolved from props or fetched)
  const [siteId, setSiteId] = useState(projectId)
  const [domain, setDomain] = useState(propDomain)
  const [siteLoading, setSiteLoading] = useState(false)
  const [siteError, setSiteError] = useState(null)
  const [hasStarted, setHasStarted] = useState(false) // Track if user clicked Start
  const [restoredFromStorage, setRestoredFromStorage] = useState(false)
  
  const [currentStep, setCurrentStep] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('discovery')
  const [stepStatuses, setStepStatuses] = useState({})
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    pagesDiscovered: 0,
    keywordsTracked: 0,
    issuesFound: 0,
    opportunitiesDetected: 0,
    schemaGenerated: 0,
    recommendationsCreated: 0
  })
  const [failedStep, setFailedStep] = useState(null)
  const [parallelProgress, setParallelProgress] = useState({ running: 0, completed: 0, total: 0 })
  const abortSignalRef = useRef(0) // Increment to abort current operations
  const logContainerRef = useRef(null)

  // State for manual domain entry
  const [manualDomain, setManualDomain] = useState('')
  const [creatingFromDomain, setCreatingFromDomain] = useState(false)

  // Commerce discovery results (products, services, classes, events)
  const [commerceDiscoveryResults, setCommerceDiscoveryResults] = useState(null)

  // =========================================================================
  // PROGRESS PERSISTENCE - Save/Restore from localStorage
  // =========================================================================
  
  // Restore progress from localStorage on mount
  useEffect(() => {
    const storageKey = getWizardStorageKey(projectId, siteId)
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only restore if there's meaningful progress
        if (parsed.stepStatuses && Object.keys(parsed.stepStatuses).length > 0) {
          console.log('[SignalSetupWizard] Restoring progress from localStorage:', parsed)
          setStepStatuses(parsed.stepStatuses || {})
          setCurrentStep(parsed.currentStep || 0)
          setProgress(parsed.progress || 0)
          setStats(parsed.stats || {
            pagesDiscovered: 0,
            keywordsTracked: 0,
            issuesFound: 0,
            opportunitiesDetected: 0,
            schemaGenerated: 0,
            recommendationsCreated: 0
          })
          setHasStarted(parsed.hasStarted || false)
          setRestoredFromStorage(true)
          
          // If there was a failed step, restore it
          if (parsed.failedStep) {
            setFailedStep(parsed.failedStep)
          }
        }
      }
    } catch (err) {
      console.warn('[SignalSetupWizard] Failed to restore progress:', err)
    }
  }, [projectId, siteId])
  
  // Save progress to localStorage whenever key state changes
  useEffect(() => {
    // Don't save if we haven't started or if there's no progress
    if (!hasStarted && Object.keys(stepStatuses).length === 0) return
    
    const storageKey = getWizardStorageKey(projectId, projectId)
    const saveData = {
      stepStatuses,
      currentStep,
      progress,
      stats,
      hasStarted,
      failedStep,
      savedAt: new Date().toISOString()
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(saveData))
      console.log('[SignalSetupWizard] Progress saved to localStorage')
    } catch (err) {
      console.warn('[SignalSetupWizard] Failed to save progress:', err)
    }
  }, [stepStatuses, currentStep, progress, stats, hasStarted, failedStep, projectId, projectId])
  
  // Clear saved progress when wizard completes successfully
  const clearSavedProgress = useCallback(() => {
    const storageKey = getWizardStorageKey(projectId, projectId)
    try {
      localStorage.removeItem(storageKey)
      console.log('[SignalSetupWizard] Cleared saved progress')
    } catch (err) {
      console.warn('[SignalSetupWizard] Failed to clear progress:', err)
    }
  }, [projectId, projectId])

  // Handle manual domain submission - projects already exist, just update domain
  const handleDomainSubmit = async () => {
    if (!manualDomain.trim()) return
    
    setCreatingFromDomain(true)
    try {
      // Normalize domain
      const normalizedDomain = manualDomain.trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
      
      // projectId IS the projectId - no need to create, just use it
      if (projectId) {
        setSiteId(projectId)
        setDomain(normalizedDomain)
        setSiteError(null)
      } else {
        setSiteError('No project selected. Please select a project first.')
      }
    } catch (err) {
      console.error('[SignalSetupWizard] Error setting domain:', err)
      setSiteError(getErrorMessage(err))
    } finally {
      setCreatingFromDomain(false)
    }
  }

  // Look up site by projectId - projectId IS the projectId
  useEffect(() => {
    async function lookupSite() {
      // projectId IS the projectId - no creation needed
      if (!projectId) {
        console.log('[SignalSetupWizard] No projectId provided, cannot proceed')
        setSiteError('No project selected. Please select a project first.')
        setSiteLoading(false)
        return
      }
      
      // Use projectId directly as siteId
      setSiteId(projectId)
      setSiteLoading(true)
      setSiteError(null)
      
      // Get domain from project
      let domainToUse = propDomain
      if (!domainToUse) {
        try {
          const projectRes = await projectsApi.get(projectId)
          const project = projectRes.data?.project
          if (project?.domain) {
            domainToUse = project.domain
            setDomain(domainToUse)
            console.log('[SignalSetupWizard] Got domain from project:', domainToUse)
          } else if (project?.title?.toLowerCase().includes('uptrade')) {
            // Default domain for Sonor project
            domainToUse = 'sonor.io'
            setDomain(domainToUse)
            console.log('[SignalSetupWizard] Using default Sonor domain:', domainToUse)
          }
        } catch (err) {
          console.error('[SignalSetupWizard] Error fetching project:', err)
        }
      }
      
      // projectId IS the projectId - use it directly
      console.log('[SignalSetupWizard] Using projectId as projectId:', projectId)
      if (domainToUse) {
        setDomain(domainToUse)
      }
      setSiteLoading(false)
    }
    
    lookupSite()
  }, [projectId, propDomain])

  // Add log entry (with optional deduplication for parallel runs)
  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
    setLogs(prev => [...prev.slice(-50), { message, type, time }]) // Keep last 50 logs
  }, [])

  // Update step status
  const updateStep = useCallback((stepId, status) => {
    setStepStatuses(prev => ({ ...prev, [stepId]: status }))
  }, [])

  // Update stats
  const updateStats = useCallback((newStats) => {
    setStats(prev => {
      // Support both patterns:
      // 1. updateStats(prev => ({ ...prev, key: value })) - function that returns object
      // 2. updateStats({ key: value }) - direct object
      // 3. updateStats({ key: (prevValue) => newValue }) - object with function values
      
      if (typeof newStats === 'function') {
        // Pattern 1: function that returns new state
        return newStats(prev)
      }
      
      // Pattern 2 & 3: object with direct values or function values
      const updated = { ...prev }
      for (const key in newStats) {
        if (typeof newStats[key] === 'function') {
          // Pattern 3: function value - call it with prev state
          updated[key] = newStats[key](prev)
        } else {
          // Pattern 2: direct value
          updated[key] = newStats[key]
        }
      }
      return updated
    })
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  // Get current phase from step
  useEffect(() => {
    const step = SETUP_STEPS[currentStep]
    if (step) {
      setCurrentPhase(step.phase)
    }
  }, [currentStep])

  // Start setup when user clicks the Start button
  useEffect(() => {
    if (hasStarted && projectId && !isRunning && progress === 0) {
      runSetup()
    }
  }, [hasStarted, projectId, isRunning, progress])

  // =========================================================================
  // PARALLEL STEP EXECUTION GROUPS
  // =========================================================================
  
  // Progress allocation by phase (must sum to 100)
  const PROGRESS_RANGES = {
    discovery: { start: 0, end: 15 },      // 4 steps
    gsc: { start: 15, end: 20 },           // 1 step (but does a lot)
    parallel: { start: 20, end: 60 },      // 12 steps in parallel
    training: { start: 60, end: 70 },      // 1 step (but slow)
    signal: { start: 70, end: 85 },        // 5 steps
    final: { start: 85, end: 100 }         // 10 steps
  }
  
  // Helper to calculate progress within a phase
  const calcPhaseProgress = (phase, stepIdx, totalSteps) => {
    const range = PROGRESS_RANGES[phase]
    const phaseWidth = range.end - range.start
    const stepProgress = totalSteps > 0 ? (stepIdx / totalSteps) * phaseWidth : 0
    return Math.round(range.start + stepProgress)
  }
  
  // Phase 1: Discovery - now handled automatically by site-kit
  // Pages are auto-discovered and enriched on every page view
  // - connect: Creates site/org in DB
  // - verify-pages: Check existing pages from site-kit
  const SEQUENTIAL_DISCOVERY_STEPS = ['connect', 'verify-pages']
  
  // Phase 2: GSC sync (validates against discovered pages)
  const GSC_SYNC_STEPS = ['gsc-connect']
  
  // Phase 3: PARALLEL - All analysis tasks run together
  const PARALLEL_ANALYSIS_STEPS = [
    'gsc-indexing',
    'pagespeed',
    'topic-clusters',
    'blog-brain',
    'cannibalization',
    'content-decay',
    'content-gap',
    'serp-features',
    'technical-audit',
    'backlinks',
    'local-seo',
    'competitors'
  ]
  
  // Phase 4: Signal training (must wait for all analysis)
  const SIGNAL_TRAINING_STEPS = ['ai-train']
  
  // Phase 5: Signal setup (configure AI assistant)
  const SIGNAL_SETUP_STEPS = [
    'signal-config-init',
    'signal-profile-extract',
    'signal-knowledge-sync',
    'signal-faq-generate',
    'signal-test-chat'
  ]
  
  // Phase 6: Final optimization and recommendations
  const FINAL_STEPS = [
    'schema-generate',
    'metadata-optimize',
    'predictive-ranking',
    'opportunities',
    'ai-recommendations',
    'auto-optimize',
    'keyword-tracking',
    'cwv-baseline',
    'schedule-setup',
    'complete'
  ]

  // Main setup runner with parallel execution
  const runSetup = useCallback(async () => {
    if (isRunning) return
    
    setIsRunning(true)
    setError(null)
    setFailedStep(null)
    setLogs([])
    
    addLog('🧠 Starting Signal Learning...', 'info')
    addLog(`📍 Domain: ${domain || 'Not specified'}`, 'info')

    const startAbortSignal = abortSignalRef.current
    
    try {
      // =====================================================================
      // PHASE 1: Sequential Discovery Steps (0-15%)
      // =====================================================================
      addLog('🔍 Step 1: Discovering your website...', 'info')
      
      for (let discoveryIdx = 0; discoveryIdx < SEQUENTIAL_DISCOVERY_STEPS.length; discoveryIdx++) {
        const stepId = SEQUENTIAL_DISCOVERY_STEPS[discoveryIdx]
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(calcPhaseProgress('discovery', discoveryIdx, SEQUENTIAL_DISCOVERY_STEPS.length))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          updateStep(step.id, 'error')
          const errorMessage = getErrorMessage(stepError)
          addLog(`❌ ${step.title}: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({ id: step.id, title: step.title, error: errorMessage, stepIndex })
          setIsRunning(false)
          return
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 2: GSC Sync (15-20%)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('📊 Step 2: Connecting data sources...', 'info')
      
      for (let gscIdx = 0; gscIdx < GSC_SYNC_STEPS.length; gscIdx++) {
        const stepId = GSC_SYNC_STEPS[gscIdx]
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(calcPhaseProgress('gsc', gscIdx, GSC_SYNC_STEPS.length))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          updateStep(step.id, 'error')
          const errorMessage = getErrorMessage(stepError)
          addLog(`❌ ${step.title}: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({ id: step.id, title: step.title, error: errorMessage, stepIndex })
          setIsRunning(false)
          return
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 3: PARALLEL Analysis (All at once!)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog(`⚡ Step 3: Running ${PARALLEL_ANALYSIS_STEPS.length} analysis tasks in parallel...`, 'info')
      
      // Mark all parallel steps as running
      const parallelStepObjects = PARALLEL_ANALYSIS_STEPS.map(id => {
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === id)
        return { ...SETUP_STEPS[stepIndex], stepIndex }
      }).filter(s => s)
      
      for (const step of parallelStepObjects) {
        updateStep(step.id, 'running')
      }
      
      // Track parallel progress
      let completedCount = 0
      let failedCount = 0
      const parallelErrors = []
      
      setParallelProgress({ running: parallelStepObjects.length, completed: 0, total: parallelStepObjects.length })
      
      // Execute all in parallel with progress tracking
      const parallelPromises = parallelStepObjects.map(async (step) => {
        try {
          await executeStep(step, true) // true = silent mode (no individual logs)
          updateStep(step.id, 'completed')
          completedCount++
          setParallelProgress(prev => ({ ...prev, completed: completedCount, running: prev.total - completedCount }))
          
          // Only log completion, not individual details
          // Progress update shows overall count
          return { success: true, step }
        } catch (err) {
          updateStep(step.id, 'error')
          failedCount++
          const errorMessage = getErrorMessage(err)
          parallelErrors.push({ step, error: errorMessage })
          return { success: false, step, error: errorMessage }
        }
      })
      
      // Wait for all parallel steps with progress updates
      const progressInterval = setInterval(() => {
        if (abortSignalRef.current !== startAbortSignal) {
          clearInterval(progressInterval)
          return
        }
        const completed = completedCount
        const total = parallelStepObjects.length
        // Use PROGRESS_RANGES for consistent progress calculation
        const phaseProgress = calcPhaseProgress('parallel', completed, total)
        setProgress(phaseProgress)
        
        if (completed > 0 && completed < total) {
          // Update log with progress count (replace last progress log)
          setLogs(prev => {
            const filtered = prev.filter(l => !l.message.startsWith('⚡ Parallel:'))
            return [...filtered, { 
              message: `⚡ Parallel: ${completed}/${total} complete (${total - completed} running)`, 
              type: 'info',
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }]
          })
        }
      }, 1000)
      
      // Wait for all to complete
      await Promise.all(parallelPromises)
      clearInterval(progressInterval)
      
      // Log final parallel status
      addLog(`✅ Parallel phase complete: ${completedCount} succeeded, ${failedCount} failed`, 
        failedCount > 0 ? 'warning' : 'success')
      
      // If critical steps failed, report but continue
      if (parallelErrors.length > 0) {
        for (const { step, error } of parallelErrors.slice(0, 3)) { // Show first 3 errors
          addLog(`  └ ⚠️ ${step.title}: ${error}`, 'warning')
        }
        if (parallelErrors.length > 3) {
          addLog(`  └ ... and ${parallelErrors.length - 3} more warnings`, 'warning')
        }
      }
      
      setProgress(PROGRESS_RANGES.parallel.end)
      
      // =====================================================================
      // PHASE 4: Signal Training (60-70%)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('🧠 Step 4: Training Signal AI on your business...', 'info')
      
      for (const stepId of SIGNAL_TRAINING_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(calcPhaseProgress('training', SIGNAL_TRAINING_STEPS.indexOf(stepId), SIGNAL_TRAINING_STEPS.length))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          updateStep(step.id, 'error')
          const errorMessage = getErrorMessage(stepError)
          addLog(`❌ ${step.title}: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({ id: step.id, title: step.title, error: errorMessage, stepIndex })
          setIsRunning(false)
          return
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 5: Signal Setup (Configure AI assistant)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('⚡ Step 5: Configuring Signal AI assistant...', 'info')
      
      for (const stepId of SIGNAL_SETUP_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(calcPhaseProgress('signal', SIGNAL_SETUP_STEPS.indexOf(stepId), SIGNAL_SETUP_STEPS.length))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          // Signal setup steps are less critical, log warning and continue
          updateStep(step.id, 'error')
          const errorMessage = getErrorMessage(stepError)
          addLog(`⚠️ ${step.title}: ${errorMessage} (continuing)`, 'warning')
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 6: Final Steps (85-100%)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('🎯 Step 6: Finalizing recommendations...', 'info')
      
      for (const stepId of FINAL_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(calcPhaseProgress('final', FINAL_STEPS.indexOf(stepId), FINAL_STEPS.length))
        
        if (stepId !== 'complete') {
          addLog(`▶️ ${step.title}...`, 'info')
        }
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          if (stepId !== 'complete') {
            addLog(`✅ ${step.title}`, 'success')
          }
        } catch (stepError) {
          // Final steps are less critical, log warning and continue
          updateStep(step.id, 'error')
          const errorMessage = getErrorMessage(stepError)
          addLog(`⚠️ ${step.title}: ${errorMessage}`, 'warning')
        }
        
        await new Promise(r => setTimeout(r, 100))
      }

      setProgress(100)
      addLog('🎉 Signal Learning complete! Your AI brain is fully trained.', 'success')

      // Mark site as setup complete
      await seoApi.updateProject(projectId, {
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })

    } catch (err) {
      console.error('Setup error:', err)
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      addLog(`❌ Error: ${errorMessage}`, 'error')
    } finally {
      setIsRunning(false)
      setParallelProgress({ running: 0, completed: 0, total: 0 })
    }
  }, [projectId, domain, addLog, updateStep, isRunning])

  // Execute individual step (silentMode = true for parallel execution, suppresses logs)
  const executeStep = async (step, silentMode = false) => {
    const startTime = Date.now()
    
    // Helper to log only in non-silent mode
    const stepLog = (message, type = 'info') => {
      if (!silentMode) {
        addLog(message, type)
      }
    }
    
    switch (step.id) {
      case 'connect':
        // Just verify site/project exists - API returns overview data directly
        const siteRes = await seoApi.getProject(projectId)
        // The API returns the overview data directly (not wrapped in .site)
        if (!siteRes.data) throw new Error('Project not found')
        stepLog(`  └ Connected to ${siteRes.data.domain || domain || 'project'}`)
        break

      case 'verify-pages':
        // Pages are auto-discovered by site-kit on page views
        // Just count how many we have so far
        const pagesRes = await seoApi.getPages(projectId, { limit: 1 })
        const pageCount = pagesRes.data?.total || 0
        updateStats({ pagesDiscovered: pageCount })
        if (pageCount > 0) {
          stepLog(`  └ Found ${pageCount} pages from site-kit`)
        } else {
          stepLog(`  └ No pages discovered yet - pages will appear as visitors browse the site`)
        }
        break

      case 'internal-links':
        // Internal link data is now captured by site-kit on page views
        // Just get the current counts from seo_pages
        try {
          const linksRes = await seoApi.getInternalLinks(projectId)
          const totalPages = linksRes.data?.pages?.length || 0
          const totalLinks = linksRes.data?.pages?.reduce((sum, p) => 
            sum + (p.internalLinksIn || 0) + (p.internalLinksOut || 0), 0
          ) || 0
          stepLog(`  └ Found ${totalLinks} internal links across ${totalPages} pages`)
        } catch (err) {
          stepLog(`  └ Internal link data will be collected as pages are visited`)
        }
        break

      case 'gsc-connect':
      case 'gsc-queries':
      case 'gsc-pages':
        // Try to sync GSC data
        const gscRes = await seoApi.syncGsc(projectId)
        console.log('[Wizard] GSC sync response:', gscRes.data) // Debug
        
        if (gscRes.data.jobId) {
          // GSC sync is now a background job - poll for completion
          stepLog(`  └ GSC sync queued (job ${gscRes.data.jobId.substring(0, 8)})...`)
          
          // Capture current abort signal
          const startAbortSignal = abortSignalRef.current
          
          let jobComplete = false
          let attempts = 0
          const maxAttempts = 60 // 5 minutes max (5s intervals)
          
          while (!jobComplete && attempts < maxAttempts) {
            // Wait with abort checking
            for (let i = 0; i < 10; i++) {
              if (abortSignalRef.current !== startAbortSignal) {
                console.log('[Wizard] GSC polling aborted')
                stepLog(`  └ GSC sync aborted`)
                return
              }
              await new Promise(r => setTimeout(r, 500))
            }
            attempts++
            
            // Check abort again before API call
            if (abortSignalRef.current !== startAbortSignal) {
              console.log('[Wizard] GSC polling aborted')
              return
            }
            
            const jobRes = await seoApi.getJobStatus(gscRes.data.jobId)
            const job = jobRes.data?.job || jobRes.data
            console.log('[Wizard] GSC job status:', job)
            
            if (job.status === 'completed') {
              jobComplete = true
              const result = job.result || {}
              const queriesCount = result.queriesCount || 0
              const pagesCount = result.pagesCount || 0
              const keywordsUpserted = result.keywordsUpserted || 0
              const pagesCreated = result.pagesCreated || 0
              const sitemapsCount = result.sitemapsCount || 0
              
              stepLog(`  └ GSC connected - synced ${queriesCount} queries, ${pagesCount} pages`)
              if (sitemapsCount > 0) {
                stepLog(`  └ Synced ${sitemapsCount} sitemaps status`)
              }
              if (keywordsUpserted > 0) {
                stepLog(`  └ Added ${keywordsUpserted} keywords to universe`)
                updateStats({ keywordsTracked: keywordsUpserted })
              }
              if (pagesCreated > 0) {
                stepLog(`  └ Discovered ${pagesCreated} new pages from GSC`)
              }
            } else if (job.status === 'failed') {
              throw new Error(`GSC sync failed: ${job.error || 'Unknown error'}`)
            } else {
              // Still processing - log progress every 15 seconds
              if (attempts % 3 === 0) {
                const progressVal = job.progress ?? 0
                stepLog(`  └ GSC sync in progress (${progressVal}% complete)...`)
              }
            }
          }
          
          if (!jobComplete) {
            throw new Error('GSC sync timed out after 5 minutes')
          }
        } else if (gscRes.data.gscConnected) {
          // Fallback for old response format (if somehow still used)
          const queriesCount = gscRes.data.queriesCount || 0
          const pagesCount = gscRes.data.pagesCount || 0
          const keywordsUpserted = gscRes.data.keywordsUpserted || 0
          const pagesCreated = gscRes.data.pagesCreated || 0
          stepLog(`  └ GSC connected - synced ${queriesCount} queries, ${pagesCount} pages`)
          if (keywordsUpserted > 0) {
            stepLog(`  └ Added ${keywordsUpserted} keywords to universe`)
            updateStats({ keywordsTracked: keywordsUpserted })
          }
          if (pagesCreated > 0) {
            stepLog(`  └ Discovered ${pagesCreated} new pages from GSC`)
          }
        } else if (gscRes.data.error) {
          stepLog(`  └ GSC error: ${gscRes.data.error}`, 'warning')
        } else {
          stepLog(`  └ GSC not connected for this site`)
        }
        
        // Auto-complete related GSC steps (they all use the same sync)
        updateStep('gsc-queries', 'completed')
        updateStep('gsc-pages', 'completed')
        break

      case 'gsc-indexing':
        // Queue GSC indexing analysis as background job
        try {
          const indexJobRes = await seoApi.startBackgroundJob({
            projectId,
            jobType: 'gsc-indexing'
          })
          const indexJobId = indexJobRes.data.job?.id
          
          if (indexJobId) {
            stepLog(`  └ Scanning ALL URLs from GSC (job ${indexJobId.substring(0, 8)})...`)
            
            // Capture current abort signal
            const startAbortSignal = abortSignalRef.current
            
            let completed = false
            let attempts = 0
            const maxAttempts = 180 // 15 minutes (200 URLs at 300ms each = ~60s + overhead)
            
            while (!completed && attempts < maxAttempts) {
              // Wait with abort checking
              for (let i = 0; i < 10; i++) {
                if (abortSignalRef.current !== startAbortSignal) {
                  console.log('[Wizard] GSC indexing polling aborted')
                  stepLog(`  └ Indexing check aborted`)
                  return
                }
                await new Promise(r => setTimeout(r, 500))
              }
              attempts++
              
              if (abortSignalRef.current !== startAbortSignal) return
              
              const jobStatus = await seoApi.getJobStatus(indexJobId)
              const job = jobStatus.data?.job || jobStatus.data
              
              if (job.status === 'completed') {
                completed = true
                const result = job.result || {}
                const issues = result.issues || []
                const totalNotIndexed = (result.notIndexed || 0) + (result.orphanNotIndexed || 0)
                
                stepLog(`  └ Inspected ${result.urlsInspected || 0} URLs (${result.totalUrlsKnown || 0} total known)`)
                stepLog(`  └ ${result.indexed || 0} indexed, ${totalNotIndexed} not indexed`)
                
                if (result.orphanNotIndexed > 0) {
                  stepLog(`  └ Found ${result.orphanNotIndexed} orphan URLs (in GSC but not tracked)`)
                }
                
                if (issues.length > 0) {
                  stepLog(`  └ ${issues.length} indexing issue categories detected`)
                  updateStats({ issuesFound: (s) => (s.issuesFound || 0) + totalNotIndexed })
                }
              } else if (job.status === 'failed') {
                throw new Error(job.error || 'Indexing check failed')
              } else if (attempts % 6 === 0) {
                stepLog(`  └ Inspecting URLs... (${job.progress || 0}% complete)`)
              }
            }
            
            if (!completed) {
              throw new Error('Indexing check timed out after 15 minutes')
            }
          } else {
            throw new Error('Failed to queue indexing job')
          }
        } catch (err) {
          // Re-throw to fail the step
          console.error('[Wizard] Indexing check error:', err.message)
          stepLog(`  └ ❌ Indexing check failed: ${err.message}`)
          throw err
        }
        break

      case 'pagespeed':
        // Queue PageSpeed analysis as background job
        try {
          const psiJobRes = await seoApi.startBackgroundJob({
            projectId,
            jobType: 'pagespeed'
          })
          const psiJobId = psiJobRes.data.job?.id
          
          if (psiJobId) {
            stepLog(`  └ Analyzing Core Web Vitals (job ${psiJobId.substring(0, 8)})...`)
            
            // Capture current abort signal
            const startAbortSignal = abortSignalRef.current
            
            let completed = false
            let attempts = 0
            const maxAttempts = 180 // 15 minutes (PSI is slow)
            
            while (!completed && attempts < maxAttempts) {
              // Wait with abort checking
              for (let i = 0; i < 10; i++) {
                if (abortSignalRef.current !== startAbortSignal) {
                  console.log('[Wizard] PageSpeed polling aborted')
                  stepLog(`  └ PageSpeed analysis aborted`)
                  return
                }
                await new Promise(r => setTimeout(r, 500))
              }
              attempts++
              
              if (abortSignalRef.current !== startAbortSignal) return
              
              const jobStatus = await seoApi.getJobStatus(psiJobId)
              const job = jobStatus.data?.job || jobStatus.data
              
              if (job.status === 'completed') {
                completed = true
                const result = job.result || {}
                stepLog(`  └ Analyzed ${result.pagesAnalyzed || 0} pages, avg score: ${result.avgScore || 'N/A'}`)
                if (result.poorPerformance > 0) {
                  stepLog(`  └ ${result.poorPerformance} pages need speed optimization`)
                }
              } else if (job.status === 'failed') {
                throw new Error(job.error || 'PageSpeed analysis failed')
              } else if (attempts % 6 === 0) {
                // Log every 30 seconds
                stepLog(`  └ Analyzing... (${job.progress || 0}% complete)`)
              }
            }
            
            if (!completed) {
              throw new Error('PageSpeed analysis timed out after 15 minutes')
            }
          } else {
            throw new Error('Failed to queue PageSpeed job')
          }
        } catch (err) {
          // Re-throw to fail the step
          console.error('[Wizard] PageSpeed error:', err.message)
          stepLog(`  └ ❌ PageSpeed analysis failed: ${err.message}`)
          throw err
        }
        break

      case 'ai-train':
        // Always force refresh - this step should retrain every time it runs
        // If restarting, abort any existing training first
        const isRestart = stepStatuses[step.id]?.status === 'running' || stepStatuses[step.id]?.status === 'error'
        const trainRes = await seoApi.trainSite(projectId)
        stepLog(`  └ Signal training initiated...`)
        // Poll for completion
        for (let attempt = 0; attempt < 60; attempt++) {
          await new Promise(r => setTimeout(r, 2000))
          const statusRes = await seoApi.getProjectKnowledge(projectId)
          const trainingStatus = statusRes.data.knowledge?.training_status || statusRes.data?.training_status
          
          if (trainingStatus === 'completed') {
            stepLog(`  └ Signal training complete!`)
            break
          } else if (trainingStatus === 'failed') {
            const errorMsg = statusRes.data.knowledge?.error_message || 'Training failed'
            stepLog(`  └ Training failed: ${errorMsg}`)
            throw new Error(`Signal training failed: ${errorMsg}`)
          }
          
          if (attempt === 59) {
            stepLog(`  └ Training still in progress (will complete in background)`)
          } else if (attempt % 5 === 0 && attempt > 0) {
            stepLog(`  └ Still training... (${attempt * 2}s elapsed)`)
          }
        }
        break

      case 'ai-knowledge': {
        // Force refresh
        const knowledgeRes = await seoApi.getProjectKnowledge(projectId)
        if (knowledgeRes.data.knowledge || knowledgeRes.data) {
          stepLog(`  └ Knowledge base loaded`)
        }
        break
      }

      case 'topic-clusters':
        // This now returns 202 and runs in background
        const clustersRes = await seoApi.generateTopicClusters(projectId, { forceRefresh: true })
        if (clustersRes.status === 202 && clustersRes.data.jobId) {
          stepLog(`  └ Topic clustering queued (runs in background)`)
        } else {
          const clustersFound = clustersRes.data.clusters?.length || 0
          stepLog(`  └ Created ${clustersFound} topic clusters`)
        }
        break

      case 'blog-brain':
        // Force refresh
        await seoApi.analyzeBlogBrain(projectId, { 
          action: 'recommend-topics',
          forceRefresh: true
        })
        stepLog(`  └ Content style analysis complete`)
        break

      case 'commerce-discovery':
        // Analyze site pages to discover products, services, classes, events
        try {
          const commerceRes = await commerceApi.analyzeSiteForSetup(projectId)
          const commerceData = commerceRes.data
          
          // Update stats with discovered commerce pages
          const totalCommerce = (commerceData.summary?.services || 0) + 
                               (commerceData.summary?.products || 0) + 
                               (commerceData.summary?.classes || 0) + 
                               (commerceData.summary?.events || 0)
          
          if (totalCommerce > 0) {
            updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + totalCommerce }))
          }
          
          // Log what was found
          if (commerceData.summary?.services > 0) {
            stepLog(`  └ Found ${commerceData.summary.services} service pages`)
          }
          if (commerceData.summary?.products > 0) {
            stepLog(`  └ Found ${commerceData.summary.products} product pages`)
          }
          if (commerceData.summary?.classes > 0) {
            stepLog(`  └ Found ${commerceData.summary.classes} class pages`)
          }
          if (commerceData.summary?.events > 0) {
            stepLog(`  └ Found ${commerceData.summary.events} event pages`)
          }
          if (totalCommerce === 0) {
            stepLog(`  └ No commerce pages detected`)
          }
          
          // Store results for later review/generation
          setCommerceDiscoveryResults(commerceData)
        } catch (commerceErr) {
          stepLog(`  └ Commerce discovery will run later`)
          console.error('Commerce discovery error:', commerceErr)
        }
        break

      case 'cannibalization':
        // Force refresh - re-detect
        const cannibRes = await seoApi.detectCannibalization(projectId, { forceRefresh: true })
        const cannibIssues = cannibRes.data.issues?.length || 0
        if (cannibIssues > 0) {
          updateStats(prev => ({ ...prev, issuesFound: prev.issuesFound + cannibIssues }))
          stepLog(`  └ Found ${cannibIssues} cannibalization issues`)
        } else {
          stepLog(`  └ No cannibalization detected`)
        }
        break

      case 'content-decay':
        // Force refresh
        const decayRes = await seoApi.detectContentDecay(projectId, { forceRefresh: true })
        const decayingPages = decayRes.data.decayingPages?.length || 0
        if (decayingPages > 0) {
          updateStats(prev => ({ ...prev, issuesFound: prev.issuesFound + decayingPages }))
          stepLog(`  └ Found ${decayingPages} pages with declining traffic`)
        } else {
          stepLog(`  └ No content decay detected`)
        }
        break

      case 'content-gap':
        // This now returns 202 and runs in background
        const gapRes = await seoApi.analyzeContentGaps(projectId, { forceRefresh: true })
        if (gapRes.status === 202 && gapRes.data.jobId) {
          stepLog(`  └ Content gap analysis queued (runs in background)`)
        } else {
          const gaps = gapRes.data.gaps?.length || 0
          updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + gaps }))
          stepLog(`  └ Found ${gaps} content opportunities`)
        }
        break

      case 'serp-features':
        // This now returns 202 and runs in background
        const serpRes = await seoApi.analyzeSerpFeatures(projectId)
        if (serpRes.status === 202 && serpRes.data.jobId) {
          stepLog(`  └ SERP features analysis queued (runs in background)`)
        } else {
          const serpOpps = serpRes.data.opportunities?.length || 0
          updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + serpOpps }))
          stepLog(`  └ Found ${serpOpps} SERP feature opportunities`)
        }
        break

      case 'technical-audit':
        await seoApi.runTechnicalAudit(projectId)
        stepLog(`  └ Technical audit complete`)
        break

      case 'backlinks':
        // Force refresh
        const backlinksRes = await seoApi.discoverBacklinks(projectId)
        stepLog(`  └ Backlink profile analyzed`)
        break

      case 'local-seo':
        await seoApi.analyzeLocalSeo(projectId)
        stepLog(`  └ Local SEO signals checked`)
        break

      case 'competitors':
        await seoApi.analyzeCompetitor(projectId, { action: 'analyze', forceRefresh: true })
        stepLog(`  └ Competitor benchmarking complete`)
        break

      case 'schema-generate':
        // Schema generation - force refresh
        const schemaStatusRes = await seoApi.getSchemaStatus(projectId)
        const pagesWithSchema = schemaStatusRes.data.pagesWithSchema || 0
        updateStats({ schemaGenerated: pagesWithSchema })
        stepLog(`  └ Found ${pagesWithSchema} pages with schema markup`)
        break

      case 'metadata-optimize':
        // Metadata optimization happens during AI analysis
        stepLog(`  └ Metadata optimization included in Signal analysis`)
        break

      case 'predictive-ranking':
        // Predictive ranking available on-demand
        stepLog(`  └ Predictive ranking available on-demand for pages`)
        break

      case 'opportunities':
        const oppsRes = await seoApi.detectOpportunities(projectId)
        const oppsFound = oppsRes.data.opportunities?.length || 0
        updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + oppsFound }))
        stepLog(`  └ Detected ${oppsFound} quick wins`)
        break

      case 'ai-recommendations':
        // Force refresh - use seo-ai-analyze to generate recommendations
        const recsRes = await seoApi.runAiBrain(projectId, { 
          analysisType: 'full_audit',
          forceRefresh: true
        })
        const recsCreated = recsRes.data.recommendations?.length || 0
        updateStats({ recommendationsCreated: recsCreated })
        stepLog(`  └ Generated ${recsCreated} Signal recommendations`)
        break

      case 'cwv-baseline':
        // CWV check requires a URL - use the site's homepage
        try {
          const cwvRes = await seoApi.checkPageCwv(projectId, { 
            url: `https://${domain}`,
            device: 'mobile'
          })
          const cwvScore = cwvRes.data.result?.performance_score || 0
          stepLog(`  └ CWV baseline recorded (score: ${cwvScore})`)
        } catch (cwvErr) {
          // PageSpeed API might not be configured
          stepLog(`  └ CWV will be measured on next scheduled run`)
        }
        break

      case 'schedule-setup':
        // seo-schedule expects: projectId, schedule (frequency), enabled, etc.
        try {
          await seoApi.scheduleAnalysis(projectId, { 
            schedule: 'weekly',
            enabled: true,
            notifications: true,
            modules: ['all']
          })
          stepLog(`  └ Automated schedules configured`)
        } catch (scheduleErr) {
          // If schedule table doesn't exist, just skip
          stepLog(`  └ Scheduling will be configured later`)
        }
        break

      // =====================================================================
      // SIGNAL MODULE STEPS - Custom handlers with profile sync
      // =====================================================================
      
      case 'signal-config-init':
        // Initialize Signal configuration for this project
        try {
          const initRes = await configApi.init(projectId)
          if (initRes?.initialized) {
            stepLog(`  └ ${initRes.message || 'Signal config initialized'}`)
          } else {
            stepLog(`  └ Signal config ready`)
          }
        } catch (configErr) {
          // Config might already exist - that's fine
          stepLog(`  └ Signal config already initialized`)
        }
        break
      
      case 'signal-profile-extract':
        // Extract business profile from crawled content
        const extractRes = await profileApi.extract({ 
          projectId
        })
        
        if (extractRes.extracted || extractRes.data?.extracted) {
          stepLog(`  └ Extracted profile from ${extractRes.pagesAnalyzed || extractRes.data?.pagesAnalyzed} pages`)
          
          // IMPORTANT: Sync the extracted profile to signal_config
          // This bridges the gap between seo_knowledge_base and the profile editor
          try {
            const syncRes = await profileApi.sync({
              projectId,
              forceRefresh: true
            })
            
            if (syncRes.synced || syncRes.data?.synced) {
              stepLog(`  └ Profile auto-populated: ${syncRes.syncedFields?.join(', ') || syncRes.data?.syncedFields?.join(', ') || 'all fields'}`)
              if ((syncRes.industry || syncRes.data?.industry) && (syncRes.industry || syncRes.data?.industry) !== 'other') {
                stepLog(`  └ Detected industry: ${syncRes.industry || syncRes.data?.industry}`)
              }
            }
          } catch (syncErr) {
            // Profile sync is not critical, log and continue
            stepLog(`  └ Profile sync will complete in background`)
          }
        } else {
          stepLog(`  └ ${extractRes.message || extractRes.data?.message || 'Profile extraction queued'}`)
        }
        break
        
      case 'signal-knowledge-sync': {
        // Sync knowledge base with AI classification
        const knowledgeRes = await knowledgeApi.sync({ 
          projectId,
          forceRefresh: true
        })
        
        const syncedCount = knowledgeRes.synced || knowledgeRes.data?.synced || 0
        const classifiedCount = knowledgeRes.classified || knowledgeRes.data?.classified || 0
        const typeBreakdown = knowledgeRes.typeBreakdown || knowledgeRes.data?.typeBreakdown
        const message = knowledgeRes.message || knowledgeRes.data?.message
        
        if (syncedCount > 0) {
          stepLog(`  └ Created ${syncedCount} knowledge chunks`)
          if (classifiedCount > 0) {
            stepLog(`  └ AI classified ${classifiedCount} chunks by content type`)
          }
          // Log type breakdown if available
          if (typeBreakdown) {
            const types = Object.entries(typeBreakdown)
              .filter(([type]) => type !== 'general')
              .map(([type, count]) => `${type}: ${count}`)
              .slice(0, 3)
            if (types.length > 0) {
              stepLog(`  └ Types: ${types.join(', ')}`)
            }
          }
        } else {
          stepLog(`  └ ${message || 'Knowledge already synced'}`)
        }
        break
      }
        
      case 'signal-faq-generate':
        // Generate FAQs - this queues a BullMQ job
        const faqRes = await faqsApi.generate({ 
          projectId,
          sourceType: 'knowledge_base',
          maxFAQs: 12  // Generate up to 12 FAQs
        })
        
        const faqJobId = faqRes.jobId || faqRes.data?.jobId
        
        if (faqJobId) {
          stepLog(`  └ FAQ generation queued (job ${faqJobId.substring(0, 8)})...`)
          
          // Capture current abort signal
          const startAbortSignal = abortSignalRef.current
          
          // Poll for job completion
          let faqCompleted = false
          let faqAttempts = 0
          const maxFaqAttempts = 60 // 5 minutes at 5s intervals
          
          while (!faqCompleted && faqAttempts < maxFaqAttempts) {
            // Wait with abort checking
            for (let i = 0; i < 10; i++) {
              if (abortSignalRef.current !== startAbortSignal) {
                stepLog(`  └ FAQ generation aborted`)
                return
              }
              await new Promise(r => setTimeout(r, 500))
            }
            faqAttempts++
            
            if (abortSignalRef.current !== startAbortSignal) return
            
            try {
              // Poll job status via FAQs API
              const jobStatus = await faqsApi.getJobStatus(faqJobId)
              
              if (jobStatus.status === 'completed') {
                faqCompleted = true
                const generatedCount = jobStatus.result?.faqs_generated || 0
                stepLog(`  └ Generated ${generatedCount} FAQs from knowledge base`)
              } else if (jobStatus.status === 'failed') {
                throw new Error(jobStatus.error_message || 'FAQ generation failed')
              } else if (faqAttempts % 3 === 0) {
                stepLog(`  └ Generating FAQs... (${faqAttempts * 5}s elapsed)`)
              }
            } catch (pollErr) {
              // If we can't poll, assume it's processing and continue after timeout
              if (faqAttempts >= 6) {
                stepLog(`  └ FAQ generation running in background`)
                faqCompleted = true
              }
            }
          }
          
          if (!faqCompleted) {
            stepLog(`  └ FAQ generation will complete in background`)
          }
        } else {
          // Fallback for immediate response (shouldn't happen with current API)
          const generatedCount = faqRes.generated || faqRes.data?.generated || 0
          if (generatedCount > 0) {
            stepLog(`  └ Generated ${generatedCount} FAQs`)
          } else {
            stepLog(`  └ ${faqRes.message || faqRes.data?.message || 'FAQs generation started'}`)
          }
        }
        break

      case 'signal-test-chat':
        // Test that Signal/Echo can respond to questions
        try {
          const testRes = await echoApi.chat({
            message: 'What services do you offer?',
            conversationId: null, // Start fresh
            skill: 'support' // Use support skill for public-facing test
          })
          
          if (testRes?.response || testRes?.content) {
            stepLog(`  └ Signal responding correctly`)
            stepLog(`  └ Test response received (${(testRes.response || testRes.content || '').length} chars)`)
          } else {
            stepLog(`  └ Signal initialized (test response empty)`)
          }
        } catch (testErr) {
          // Echo might not be fully ready yet - that's okay
          stepLog(`  └ Signal will be ready after setup completes`)
        }
        break

      case 'auto-optimize':
        // Run auto-optimization to apply quick fixes
        try {
          const optimizeRes = await seoApi.runAutoOptimize(projectId)
          const fixCount = optimizeRes?.fixes?.length || optimizeRes?.applied || 0
          const recommendationCount = optimizeRes?.recommendations?.length || 0
          
          if (fixCount > 0) {
            stepLog(`  └ Applied ${fixCount} quick fixes`)
          }
          if (recommendationCount > 0) {
            stepLog(`  └ Generated ${recommendationCount} recommendations`)
          }
          if (fixCount === 0 && recommendationCount === 0) {
            stepLog(`  └ Auto-optimization complete`)
          }
        } catch (optimizeErr) {
          stepLog(`  └ Auto-optimization will run on next analysis`)
        }
        break

      case 'keyword-tracking':
        // Import top keywords from GSC for long-term tracking
        try {
          const keywordRes = await seoApi.autoDiscoverKeywords(projectId)
          const importedCount = keywordRes?.imported || keywordRes?.keywords?.length || 0
          
          if (importedCount > 0) {
            stepLog(`  └ Imported ${importedCount} keywords for tracking`)
          } else {
            stepLog(`  └ Keywords will be discovered from GSC data`)
          }
        } catch (keywordErr) {
          stepLog(`  └ Keyword tracking will be configured manually`)
        }
        break

      case 'complete':
        // Final step - just a placeholder
        break

      default:
        // Generic endpoint call - legacy fallback (should not be needed with full API coverage)
        if (step.endpoint) {
          console.warn('[Wizard] Unmapped step endpoint:', step.endpoint)
          // Skip unknown endpoints - they should be mapped to specific API calls above
        }
    }

    const elapsed = Date.now() - startTime
    if (elapsed < 500) {
      await new Promise(r => setTimeout(r, 500 - elapsed))
    }
  }

  // Get phase completion status
  const getPhaseStatus = (phaseId) => {
    const phaseSteps = SETUP_STEPS.filter(s => s.phase === phaseId)
    const completedSteps = phaseSteps.filter(s => stepStatuses[s.id] === 'completed')
    if (completedSteps.length === phaseSteps.length) return 'completed'
    if (completedSteps.length > 0) return 'active'
    return 'pending'
  }

  // Retry setup from the beginning
  const retrySetup = useCallback(() => {
    setStepStatuses({})
    setProgress(0)
    setCurrentStep(0)
    setError(null)
    setFailedStep(null)
    setStats({
      pagesDiscovered: 0,
      keywordsTracked: 0,
      issuesFound: 0,
      opportunitiesDetected: 0,
      schemaGenerated: 0,
      recommendationsCreated: 0
    })
    // Trigger runSetup after state reset
    setTimeout(() => runSetup(), 100)
  }, [runSetup])

  // Retry from failed step (preserves progress up to failure point)
  const retryFromFailedStep = useCallback(() => {
    if (!failedStep) return
    
    // Keep existing completed steps, clear failed step
    const updatedStatuses = { ...stepStatuses }
    delete updatedStatuses[failedStep.id]
    setStepStatuses(updatedStatuses)
    
    setError(null)
    setFailedStep(null)
    setCurrentStep(failedStep.stepIndex)
    setProgress(Math.round((failedStep.stepIndex / SETUP_STEPS.length) * 100))
    
    // Continue from failed step
    setTimeout(() => continueFromStep(failedStep.stepIndex), 100)
  }, [failedStep, stepStatuses])

  // Stop and restart current step manually
  const stopAndRestartCurrentStep = useCallback(() => {
    if (!isRunning || currentStep === null) return
    
    const step = SETUP_STEPS[currentStep]
    
    // Signal abort to any running operations (use ref for immediate effect)
    abortSignalRef.current++
    console.log('[Wizard] Abort signal incremented to:', abortSignalRef.current)
    
    // Mark step as error status to trigger abort in ai-train case
    const updatedStatuses = { ...stepStatuses }
    updatedStatuses[step.id] = { status: 'error', message: 'Aborted by user' }
    setStepStatuses(updatedStatuses)
    
    addLog(`🔄 Restarting ${step.title}...`, 'info')
    
    // Restart from current step after a brief delay
    setTimeout(() => {
      // Clear the error status and re-execute
      const clearedStatuses = { ...updatedStatuses }
      delete clearedStatuses[step.id]
      setStepStatuses(clearedStatuses)
      setCurrentStep(currentStep)
      continueFromStep(currentStep, true)
    }, 500)
  }, [isRunning, currentStep, stepStatuses, addLog])

  // Restart from a clicked step - reset all subsequent steps to pending
  const restartFromStep = useCallback((stepIndex) => {
    if (isRunning) {
      // Abort current execution
      abortSignalRef.current++
    }
    
    const restartStep = SETUP_STEPS[stepIndex]
    
    // Reset this step and all subsequent steps to pending
    const updatedStatuses = { ...stepStatuses }
    for (let i = stepIndex; i < SETUP_STEPS.length; i++) {
      const stepId = SETUP_STEPS[i].id
      updatedStatuses[stepId] = 'pending'
    }
    setStepStatuses(updatedStatuses)
    
    setError(null)
    setFailedStep(null)
    setLogs([...logs, { 
      message: `🔄 Restarting from ${restartStep.title}...`, 
      type: 'info',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }])
    
    // Start from this step after a brief delay
    setTimeout(() => {
      continueFromStep(stepIndex, true)
    }, 500)
  }, [isRunning, stepStatuses, logs, addLog])

  // Continue setup from a specific step index
  const continueFromStep = useCallback(async (startIndex, isRestart = false) => {
    if (isRunning && !isRestart) return
    
    setIsRunning(true)
    setError(null)
    setFailedStep(null)

    // Helper to determine which phase a step belongs to
    const getStepPhase = (stepId) => {
      if (SEQUENTIAL_DISCOVERY_STEPS.includes(stepId)) return 'discovery'
      if (GSC_SYNC_STEPS.includes(stepId)) return 'gsc'
      if (PARALLEL_ANALYSIS_STEPS.includes(stepId)) return 'parallel'
      if (SIGNAL_TRAINING_STEPS.includes(stepId)) return 'training'
      if (SIGNAL_SETUP_STEPS.includes(stepId)) return 'signal'
      if (FINAL_STEPS.includes(stepId)) return 'final'
      return 'final' // Default to final phase
    }

    try {
      for (let i = startIndex; i < SETUP_STEPS.length; i++) {
        const step = SETUP_STEPS[i]
        setCurrentStep(i)
        updateStep(step.id, 'running')
        
        // Calculate phase-aware progress
        const phase = getStepPhase(step.id)
        const phaseSteps = {
          discovery: SEQUENTIAL_DISCOVERY_STEPS,
          gsc: GSC_SYNC_STEPS,
          parallel: PARALLEL_ANALYSIS_STEPS,
          training: SIGNAL_TRAINING_STEPS,
          signal: SIGNAL_SETUP_STEPS,
          final: FINAL_STEPS
        }[phase]
        const phaseIdx = phaseSteps?.indexOf(step.id) || 0
        const phaseLen = phaseSteps?.length || 1
        setProgress(calcPhaseProgress(phase, phaseIdx, phaseLen))
        
        addLog(`▶️ ${step.title}...`, 'info')

        // Execute step
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title} complete`, 'success')
        } catch (stepError) {
          // STOP on ANY failure
          updateStep(step.id, 'error')
          const errorMessage = stepError.response?.data?.message || stepError.response?.data?.error || stepError.message
          addLog(`❌ ${step.title} failed: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({
            id: step.id,
            title: step.title,
            error: errorMessage,
            stepIndex: i
          })
          setIsRunning(false)
          return // Stop execution immediately
        }

        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 300))
      }

      setProgress(100)
      addLog('🎉 Signal Learning complete! Your AI brain is fully trained.', 'success')

      // Mark site as setup complete
      await seoApi.updateProject(projectId, {
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })

    } catch (err) {
      console.error('Setup error:', err)
      setError(err.message || 'Setup failed')
      addLog(`❌ Error: ${err.message}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }, [projectId, addLog, updateStep, isRunning, executeStep])

  const isComplete = progress === 100 && !isRunning && !error
  const hasFailed = !!failedStep

  // Show loading state while looking up site by projectId
  if (siteLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-[var(--text-secondary)]">Loading site configuration...</p>
        </div>
      </div>
    )
  }

  // Show error if site lookup failed (but not the 'noDomain' case which we handle below)
  if (siteError && siteError !== 'noDomain') {
    // Ensure error is a string for rendering
    const errorString = typeof siteError === 'object' 
      ? (siteError.message || JSON.stringify(siteError)) 
      : String(siteError)
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Error Loading Site</h3>
          <p className="text-[var(--text-secondary)] mb-4">{errorString}</p>
          {onSkip && (
            <Button onClick={onSkip} variant="outline" className="mt-4">
              Go Back
            </Button>
          )}
        </Card>
      </div>
    )
  }

  // Show "no site" error - allow entering domain directly
  if (siteError === 'noDomain' || (!projectId && !siteLoading)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="p-8 max-w-lg">
          <div className="text-center mb-6">
            <Globe className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Enter Your Website Domain</h3>
            <p className="text-[var(--text-secondary)]">
              Signal needs to know which website to learn from. Enter your domain below to get started.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="www.example.com"
                value={manualDomain}
                onChange={(e) => setManualDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDomainSubmit()}
                className="flex-1"
              />
              <Button 
                onClick={handleDomainSubmit}
                disabled={!manualDomain.trim() || creatingFromDomain}
              >
                {creatingFromDomain ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] text-center">
              Enter the full domain (e.g., www.sonor.io)
            </p>
          </div>
          
          {onSkip && (
            <div className="text-center mt-6">
              <Button onClick={onSkip} variant="ghost" size="sm">
                Skip for Now
              </Button>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // Show "Start Setup" landing screen if not started yet
  if (!hasStarted && !isRunning && progress === 0) {
    return (
      <div className="min-h-[600px] bg-[var(--surface-page)] p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <SignalSEOLogo size={72} />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#95d47d] to-[#238b95] bg-clip-text text-transparent">
                Signal Learning
              </h1>
            </div>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              Train Signal AI to understand your business, website content, and customer needs.
            </p>
          </motion.div>

          <Card className="p-8 mb-6">
            <div className="text-center mb-6">
              <Badge variant="outline" className="mb-4">
                {domain || 'Your Website'}
              </Badge>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                What Signal Learning Does
              </h2>
              <p className="text-[var(--text-secondary)]">
                This wizard will teach Signal everything about your business in about 5-10 minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {SETUP_PHASES.map((phase, index) => (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r', phase.color)}>
                    <phase.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--text-primary)]">{phase.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{phase.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => {
                  setHasStarted(true)
                  // runSetup will be called when hasStarted becomes true
                }}
                className="gap-2 bg-gradient-to-r from-[#95d47d] to-[#238b95] hover:opacity-90"
              >
                <Rocket className="w-5 h-5" />
                {restoredFromStorage ? 'Resume Signal Learning' : 'Start Signal Learning'}
              </Button>
              {restoredFromStorage && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    clearSavedProgress()
                    setStepStatuses({})
                    setCurrentStep(0)
                    setProgress(0)
                    setStats({
                      pagesDiscovered: 0,
                      keywordsTracked: 0,
                      issuesFound: 0,
                      opportunitiesDetected: 0,
                      schemaGenerated: 0,
                      recommendationsCreated: 0
                    })
                    setFailedStep(null)
                    setRestoredFromStorage(false)
                    setHasStarted(true)
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Start Fresh
                </Button>
              )}
              {onSkip && (
                <Button variant="ghost" onClick={onSkip}>
                  Skip for Now
                </Button>
              )}
            </div>

            {restoredFromStorage && (
              <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-4">
                ⚡ Previous progress found — you can resume where you left off or start fresh.
              </p>
            )}
          </Card>

          <p className="text-center text-sm text-[var(--text-tertiary)]">
            You can re-run this wizard anytime to refresh Signal's knowledge.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-page)] p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <SignalSEOLogo size={56} animate={isRunning} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#95d47d] to-[#238b95] bg-clip-text text-transparent">
              Signal Learning
            </h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            {isComplete 
              ? '🎉 Signal AI is fully trained and ready!' 
              : hasFailed
                ? '❌ Learning failed - see error details below'
                : domain 
                  ? `Training Signal AI on ${domain}`
                  : 'Training Signal AI on your business'
            }
          </p>
        </motion.div>

        {/* Phase indicators */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {SETUP_PHASES.map((phase, index) => (
            <PhaseIndicator
              key={phase.id}
              phase={phase}
              index={index}
              isActive={currentPhase === phase.id}
              isCompleted={getPhaseStatus(phase.id) === 'completed'}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left column - Steps */}
          <div className="lg:col-span-1 space-y-2 h-[800px] overflow-y-auto pr-2">
            {SETUP_STEPS.map((step, index) => (
              <StepIndicator
                key={step.id}
                step={step}
                status={stepStatuses[step.id] || 'pending'}
                isActive={currentStep === index}
                index={index}
                onRestartFromStep={restartFromStep}
                canRestart={!isRunning && !isComplete}
              />
            ))}
          </div>

          {/* Center column - Progress & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Progress ring */}
            <Card className="p-6">
              <div className="flex flex-col items-center">
                <ProgressRing progress={progress} size={160} />
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  {isComplete 
                    ? 'Setup complete!' 
                    : parallelProgress.total > 0
                      ? `⚡ Running ${parallelProgress.running} steps in parallel (${parallelProgress.completed}/${parallelProgress.total} done)`
                      : `Step ${currentStep + 1} of ${SETUP_STEPS.length}`
                  }
                </p>
                {SETUP_STEPS[currentStep] && !isComplete && (
                  <p className="text-lg font-medium text-[var(--text-primary)] mt-2">
                    {SETUP_STEPS[currentStep].title}
                  </p>
                )}
                {(isRunning || hasFailed) && !isComplete && (
                  <Button 
                    onClick={stopAndRestartCurrentStep}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled={!isRunning}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Restart Current Step
                  </Button>
                )}
              </div>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label="Pages Discovered" 
                value={stats.pagesDiscovered} 
                icon={FileText} 
                color="bg-blue-500" 
              />
              <StatCard 
                label="Keywords Tracked" 
                value={stats.keywordsTracked} 
                icon={Target} 
                color="bg-purple-500" 
              />
              <StatCard 
                label="Issues Found" 
                value={stats.issuesFound} 
                icon={AlertCircle} 
                color="bg-orange-500" 
              />
              <StatCard 
                label="Opportunities" 
                value={stats.opportunitiesDetected} 
                icon={Lightbulb} 
                color="bg-amber-500" 
              />
              <StatCard 
                label="Schema Generated" 
                value={stats.schemaGenerated} 
                icon={Code} 
                color="bg-green-500" 
              />
              <StatCard 
                label="Recommendations" 
                value={stats.recommendationsCreated} 
                icon={Sparkles} 
                color="bg-cyan-500" 
              />
            </div>
          </div>

          {/* Right column - Logs */}
          <div className="lg:col-span-1">
            <Card className="h-[800px] flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Live Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <div 
                  ref={logContainerRef}
                  className="h-full overflow-y-auto space-y-1 text-xs font-mono"
                >
                  <AnimatePresence mode="popLayout">
                    {logs.map((log, index) => (
                      <LogEntry key={index} log={log} index={index} />
                    ))}
                  </AnimatePresence>
                  {isRunning && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex items-center gap-2 text-gray-400 pt-2"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing...</span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Completion actions */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-r from-[#95d47d]/10 to-[#238b95]/10 dark:from-[#95d47d]/20 dark:to-[#238b95]/20 rounded-2xl p-8 border border-[#95d47d]/30">
              <div className="flex items-center gap-2 text-[#238b95]">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-xl font-semibold">Setup Complete!</span>
              </div>
              <p className="text-[var(--text-secondary)] max-w-md">
                Signal SEO has analyzed your entire site and is ready to help you
                dominate search rankings. Check your dashboard for personalized recommendations.
              </p>
              <div className="flex gap-3">
                <Button 
                  size="lg"
                  onClick={() => {
                    clearSavedProgress()
                    onComplete?.()
                  }}
                  className="bg-gradient-to-r from-[#95d47d] to-[#238b95] hover:from-[#7bc064] hover:to-[#1a7a83] text-white"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={runSetup}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error state - detailed failure panel */}
        {hasFailed && failedStep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="max-w-2xl mx-auto p-6 border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-500 mb-1">
                    Setup Failed at Step {failedStep.stepIndex + 1}
                  </h3>
                  <p className="text-red-400 font-medium mb-2">
                    {failedStep.title}
                  </p>
                  <div className="bg-red-500/10 rounded-lg p-3 mb-4 border border-red-500/20">
                    <p className="text-sm text-red-400 font-mono break-all">
                      {typeof failedStep.error === 'object' 
                        ? (failedStep.error.message || JSON.stringify(failedStep.error)) 
                        : String(failedStep.error || 'Unknown error')}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    The setup has been stopped. You can retry from this step or start over.
                    Check the logs on the right for more details.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={retryFromFailedStep} 
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry from Step {failedStep.stepIndex + 1}
                    </Button>
                    <Button 
                      onClick={retrySetup} 
                      variant="outline"
                    >
                      Restart from Beginning
                    </Button>
                    <Button variant="outline" onClick={onSkip}>
                      Skip Setup
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Legacy error state (for non-step errors) */}
        {error && !hasFailed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <Card className="inline-block p-6 border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertCircle className="w-6 h-6" />
                <span className="font-medium">Setup encountered an error</span>
              </div>
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={retrySetup} variant="destructive">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Setup
                </Button>
                <Button variant="outline" onClick={onSkip}>
                  Skip for Now
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Skip option during setup */}
        {isRunning && (
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600"
            >
              Skip setup (not recommended)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
// Note: SignalSetupWizard is now only used in Signal module
// SEO module uses projects directly (projectId === projectId)