import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GlassCard } from '@/components/ui/glass-card'
import { SonorSpinner } from '@/components/SonorLoading'
import { portfolioApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'
import {
  Globe, Search, ChevronRight, ChevronLeft, Sparkles, Check,
  BarChart3, TrendingUp, Activity, Database, Zap, Target,
  CheckCircle2, XCircle, AlertCircle, Loader2
} from 'lucide-react'

// ===== Constants =====

const STEPS = [
  { id: 1, label: 'Select Project', icon: Database },
  { id: 2, label: 'Configure', icon: Target },
  { id: 3, label: 'Generate', icon: Sparkles },
]

const CATEGORY_OPTIONS = [
  { value: 'web-design', label: 'Web Design' },
  { value: 'web-development', label: 'Web Development' },
  { value: 'application-development', label: 'Application Development' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'branding', label: 'Branding' },
  { value: 'full-service', label: 'Full Service' },
  { value: 'other', label: 'Other' },
]

const ALWAYS_INCLUDED_SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'results', label: 'Results' },
  { id: 'cta', label: 'CTA' },
]

const OPTIONAL_SECTIONS = [
  { id: 'performance', label: 'Performance (Lighthouse)' },
  { id: 'speed_comparison', label: 'Speed Comparison' },
  { id: 'site_architecture', label: 'Site Architecture' },
  { id: 'tech_stack', label: 'Tech Stack' },
  { id: 'design_system', label: 'Design System' },
  { id: 'services', label: 'Services' },
  { id: 'testimonial', label: 'Testimonial' },
  { id: 'details', label: 'Details' },
]

const GENERATION_STAGES = [
  { label: 'Analyzing project data...', delay: 0 },
  { label: 'Scraping live site...', delay: 4000 },
  { label: 'Running Lighthouse audit...', delay: 8000 },
  { label: 'Generating sections...', delay: 15000 },
  { label: 'Building portfolio...', delay: 30000 },
]

const POLL_INTERVAL_MS = 4000

// ===== Sub-Components =====

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--glass-bg)] rounded-full border border-[var(--glass-border)]">
      {STEPS.map((step) => {
        const isActive = currentStep === step.id
        const isComplete = currentStep > step.id
        const Icon = step.icon

        return (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap shrink-0',
              isActive && 'bg-[var(--brand-primary)] text-white shadow-md',
              isComplete && 'text-[var(--brand-primary)]',
              !isActive && !isComplete && 'text-[var(--text-tertiary)]'
            )}
          >
            {isComplete ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Icon className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-medium">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DataIndicator({ available, label, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          available ? color : 'bg-[var(--text-tertiary)]/30'
        )}
      />
      <span
        className={cn(
          'text-xs',
          available ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function ProjectCard({ project, selected, onSelect }) {
  const hasPortfolio = project.has_portfolio
  return (
    <GlassCard
      hover
      onClick={() => onSelect(project)}
      className={cn(
        'relative cursor-pointer transition-all duration-200 p-4',
        selected
          ? 'ring-2 ring-[var(--brand-primary)] shadow-md'
          : 'hover:shadow-sm',
        hasPortfolio && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            selected
              ? 'bg-[var(--brand-primary)] text-white'
              : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'
          )}>
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={cn(
              'font-semibold text-sm truncate',
              selected ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'
            )}>
              {project.domain || project.name}
            </p>
            {project.industry && (
              <Badge
                variant="secondary"
                className="mt-1 text-[10px] bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"
              >
                {project.industry}
              </Badge>
            )}
          </div>
        </div>
        {selected && (
          <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--glass-border)]">
        <DataIndicator available={project.has_seo} label="SEO" color="bg-emerald-500" />
        <DataIndicator available={project.has_analytics} label="Analytics" color="bg-blue-500" />
        <DataIndicator available={project.has_gsc} label="GSC" color="bg-purple-500" />
      </div>

      {hasPortfolio && (
        <div className="flex items-center gap-1.5 mt-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-500">Already has portfolio</span>
        </div>
      )}
    </GlassCard>
  )
}

function SectionToggle({ section, checked, disabled, onToggle }) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-[var(--glass-bg-hover)]'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => !disabled && onToggle(section.id)}
        className="sr-only"
      />
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
          checked
            ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]'
            : 'border-[var(--glass-border-strong)] bg-transparent'
        )}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className={cn(
        'text-sm',
        disabled ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
      )}>
        {section.label}
      </span>
      {disabled && (
        <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">Required</span>
      )}
    </label>
  )
}

function GenerationStage({ label, status }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {status === 'complete' && (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        )}
        {status === 'active' && (
          <Loader2 className="w-4 h-4 text-[var(--brand-primary)] animate-spin" />
        )}
        {status === 'pending' && (
          <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]/30" />
        )}
      </div>
      <span
        className={cn(
          'text-sm transition-colors duration-300',
          status === 'complete' && 'text-[var(--text-secondary)]',
          status === 'active' && 'text-[var(--text-primary)] font-medium',
          status === 'pending' && 'text-[var(--text-tertiary)]'
        )}
      >
        {label}
      </span>
    </div>
  )
}

// ===== Main Component =====

export default function GenerateFromProjectDialog({ open, onOpenChange }) {
  const navigate = useNavigate()

  // Step state
  const [step, setStep] = useState(1)

  // Step 1 state
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)

  // Step 2 state
  const [category, setCategory] = useState('')
  const [migratedFrom, setMigratedFrom] = useState('')
  const [directive, setDirective] = useState('')
  const [testimonialQuote, setTestimonialQuote] = useState('')
  const [testimonialAuthor, setTestimonialAuthor] = useState('')
  const [optionalSections, setOptionalSections] = useState({
    performance: true,
    speed_comparison: true,
    site_architecture: true,
    tech_stack: true,
    design_system: true,
    services: true,
    testimonial: false,
    details: false,
  })

  // Step 3 state
  const [generating, setGenerating] = useState(false)
  const [stageIndex, setStageIndex] = useState(-1)
  const [error, setError] = useState(null)
  const stageTimers = useRef([])

  // Load eligible projects on mount
  useEffect(() => {
    if (!open) return
    setLoading(true)
    portfolioApi.getEligibleProjects()
      .then((res) => {
        setProjects(res.data || res)
      })
      .catch(() => {
        setProjects([])
      })
      .finally(() => setLoading(false))
  }, [open])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setSearchQuery('')
      setSelectedProject(null)
      setCategory('')
      setDirective('')
      setOptionalSections({ tech_stack: true, services: true, testimonial: false, details: false })
      setTestimonialQuote('')
      setTestimonialAuthor('')
      setGenerating(false)
      setStageIndex(-1)
      setError(null)
      stageTimers.current.forEach(clearTimeout)
      stageTimers.current = []
    }
  }, [open])

  // Filtered projects — hide projects that already have a portfolio item
  const filteredProjects = projects.filter((p) => {
    if (p.hasPortfolioItem) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (p.domain || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.industry || '').toLowerCase().includes(q)
    )
  })

  const toggleSection = useCallback((sectionId) => {
    setOptionalSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  const pollRef = useRef(null)
  const portfolioIdRef = useRef(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const startGeneration = useCallback(async () => {
    setStep(3)
    setGenerating(true)
    setError(null)
    setStageIndex(0)

    // Animate stage progression with realistic timings
    stageTimers.current.forEach(clearTimeout)
    stageTimers.current = []
    GENERATION_STAGES.forEach((stage, i) => {
      if (i > 0) {
        const timer = setTimeout(() => setStageIndex(i), stage.delay)
        stageTimers.current.push(timer)
      }
    })

    try {
      const includedSections = [
        ...ALWAYS_INCLUDED_SECTIONS.map((s) => s.id),
        ...Object.entries(optionalSections)
          .filter(([, v]) => v)
          .map(([k]) => k),
      ]

      // Step 1: Dispatch generation (returns immediately with draft portfolio item)
      console.log('[Portfolio] Generate payload:', { projectId: selectedProject.id, category, migratedFrom, sections: includedSections })

      // Build directive with testimonial data if provided
      let fullDirective = directive || ''
      if (optionalSections.testimonial && testimonialQuote) {
        fullDirective += `\n\nCLIENT TESTIMONIAL (use verbatim, do not modify):\nQuote: "${testimonialQuote}"\nAuthor: ${testimonialAuthor || 'Client'}`
      }

      const result = await portfolioApi.generateFromProject({
        projectId: selectedProject.id,
        category,
        migratedFrom: migratedFrom && migratedFrom !== 'none' ? migratedFrom : undefined,
        directive: fullDirective.trim() || undefined,
        sections: includedSections,
      })

      const portfolioItemId = result.data?.id || result.data?.portfolioItemId || result.id || result.portfolioItemId
      if (!portfolioItemId) {
        setError('Generation started but no portfolio ID was returned.')
        setGenerating(false)
        return
      }

      portfolioIdRef.current = portfolioItemId

      // Step 2: Poll for completion
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await portfolioApi.getItem(portfolioItemId)
          const data = pollRes.data?.data || pollRes.data
          const status = data?.generation_status || data?.generationStatus

          if (status === 'complete') {
            clearInterval(pollRef.current)
            pollRef.current = null
            stageTimers.current.forEach(clearTimeout)
            stageTimers.current = []
            setStageIndex(GENERATION_STAGES.length - 1)
            setGenerating(false)

            // Brief pause so user sees final "complete" state
            setTimeout(() => {
              onOpenChange(false)
              navigate(`/portfolio/${portfolioItemId}`)
            }, 800)
          } else if (status === 'failed') {
            clearInterval(pollRef.current)
            pollRef.current = null
            stageTimers.current.forEach(clearTimeout)
            stageTimers.current = []
            setGenerating(false)
            setError(data?.generation_error || 'Generation failed. Please try again.')
          }
        } catch {
          // Poll failed — keep trying, don't abort
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Generation failed. Please try again.')
      setGenerating(false)
      stageTimers.current.forEach(clearTimeout)
      stageTimers.current = []
    }
  }, [selectedProject, category, migratedFrom, directive, optionalSections, testimonialQuote, testimonialAuthor, navigate, onOpenChange])

  const getStageStatus = (index) => {
    if (index < stageIndex) return 'complete'
    if (index === stageIndex) return generating ? 'active' : 'complete'
    return 'pending'
  }

  // ===== Render =====

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!generating) onOpenChange(v) }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden bg-[var(--glass-bg-elevated)] border-[var(--glass-border)] backdrop-blur-xl p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-[var(--text-primary)]">
                Generate from Project
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--text-secondary)] mt-1">
                Use Signal AI to build a portfolio from real project data
              </DialogDescription>
            </div>
          </div>
          <StepIndicator currentStep={step} />
        </DialogHeader>

        <div className="border-t border-[var(--glass-border)]" />

        {/* Step Content */}
        <div className="px-6 py-5 flex-1 overflow-y-auto min-h-0">

          {/* Step 1: Select Project */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="Search by domain, name, or industry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              {/* Project Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <SonorSpinner size="md" label="Loading projects..." />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Database className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    {searchQuery
                      ? 'No projects match your search'
                      : 'No eligible projects found'}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Managed projects with active data will appear here'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      selected={selectedProject?.id === project.id}
                      onSelect={setSelectedProject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Selected project summary */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20">
                <Globe className="w-4 h-4 text-[var(--brand-primary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {selectedProject?.domain || selectedProject?.name}
                </span>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)]">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Migrated From — shown for web categories */}
              {['web-design', 'web-development', 'e-commerce'].includes(category) && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[var(--text-primary)]">
                    Previous Platform
                    <span className="text-[var(--text-tertiary)] font-normal ml-1">(optional)</span>
                  </Label>
                  <Select value={migratedFrom} onValueChange={setMigratedFrom}>
                    <SelectTrigger className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)]">
                      <SelectValue placeholder="Was the site migrated from another platform?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="wix">Wix</SelectItem>
                      <SelectItem value="squarespace">Squarespace</SelectItem>
                      <SelectItem value="shopify">Shopify</SelectItem>
                      <SelectItem value="webflow">Webflow</SelectItem>
                      <SelectItem value="godaddy">GoDaddy</SelectItem>
                      <SelectItem value="custom">Custom / Other CMS</SelectItem>
                      <SelectItem value="none">New site (no migration)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Directive */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  AI Directive
                  <span className="text-[var(--text-tertiary)] font-normal ml-1">(optional)</span>
                </Label>
                <Textarea
                  placeholder="Any specific focus or instructions for the AI? (e.g., 'Focus on the SEO results and conversion improvements')"
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  rows={3}
                  className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
                />
              </div>

              {/* Sections */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  Sections to Generate
                </Label>
                <GlassCard className="p-1">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] px-3 pt-2 pb-1">
                      Always included
                    </p>
                    {ALWAYS_INCLUDED_SECTIONS.map((section) => (
                      <SectionToggle
                        key={section.id}
                        section={section}
                        checked
                        disabled
                        onToggle={() => {}}
                      />
                    ))}
                    <div className="border-t border-[var(--glass-border)] my-1" />
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] px-3 pt-2 pb-1">
                      Optional
                    </p>
                    {OPTIONAL_SECTIONS.map((section) => (
                      <SectionToggle
                        key={section.id}
                        section={section}
                        checked={optionalSections[section.id]}
                        disabled={false}
                        onToggle={toggleSection}
                      />
                    ))}
                  </div>
                </GlassCard>

                {/* Testimonial input — shown when testimonial section is enabled */}
                {optionalSections.testimonial && (
                  <GlassCard className="p-4 space-y-3 mt-2">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                      Provide a real testimonial from the client
                    </p>
                    <Textarea
                      placeholder="e.g., 'Since launching our new site, we've seen a huge increase in calls and estimate requests...'"
                      value={testimonialQuote}
                      onChange={(e) => setTestimonialQuote(e.target.value)}
                      rows={3}
                      className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none text-sm"
                    />
                    <Input
                      placeholder="Author name and title (e.g., John Smith, Owner)"
                      value={testimonialAuthor}
                      onChange={(e) => setTestimonialAuthor(e.target.value)}
                      className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm"
                    />
                  </GlassCard>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              {error ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Generation Failed
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                      {error}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep(2)
                        setError(null)
                      }}
                      className="border-[var(--glass-border)] text-[var(--text-primary)]"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      onClick={startGeneration}
                      className="bg-[var(--brand-primary)] text-white hover:opacity-90"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Retry
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <SonorSpinner size="lg" />
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Signal AI is generating your portfolio...
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      This usually takes 60-90 seconds
                    </p>
                  </div>
                  <div className="w-full max-w-xs space-y-2">
                    {GENERATION_STAGES.map((stage, i) => (
                      <GenerationStage
                        key={i}
                        label={stage.label}
                        status={getStageStatus(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 3 && (
          <div className="shrink-0">
            <div className="border-t border-[var(--glass-border)]" />
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                {step > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() => setStep(step - 1)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>
              <div>
                {step === 1 && (
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedProject}
                    className="bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    onClick={startGeneration}
                    disabled={!category}
                    className="bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
