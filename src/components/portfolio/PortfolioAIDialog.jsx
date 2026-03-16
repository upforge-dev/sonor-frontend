// src/components/PortfolioAIDialog.jsx
// Redesigned with Liquid Glass design system
import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles, Loader2, Check, ChevronLeft, ChevronRight, X, Send, Bot, User, Wand2,
  Building2, Globe, MapPin, Briefcase, Target, TrendingUp, BarChart3, Award,
  Palette, Code, Search, Rocket, Zap, Shield, Smartphone, Camera, Video,
  Users, Quote, Image, Layers, Settings, Eye, Edit2, GripVertical, Plus,
  RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Save, Trash2, Copy,
  MessageSquare, ArrowRight, Clock, FileText, Star, ChevronDown
} from 'lucide-react'
import { portfolioApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

// ===== Constants =====
const STEPS = [
  { id: 1, title: 'Company', icon: Building2, description: 'Basic details' },
  { id: 2, title: 'Services', icon: BarChart3, description: 'What you delivered' },
  { id: 3, title: 'Generate', icon: Sparkles, description: 'AI magic' },
  { id: 4, title: 'Review', icon: Eye, description: 'Edit & refine' },
  { id: 5, title: 'Publish', icon: Rocket, description: 'Go live' }
]

const SERVICE_OPTIONS = [
  { id: 'web-design', label: 'Web Design', icon: Palette },
  { id: 'website-redesign', label: 'Website Redesign', icon: RefreshCw },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'local-seo', label: 'Local SEO', icon: MapPin },
  { id: 'paid-ads', label: 'Paid Ads', icon: Target },
  { id: 'content-marketing', label: 'Content Marketing', icon: FileText },
  { id: 'email-social', label: 'Email & Social', icon: MessageSquare },
  { id: 'video', label: 'Video Production', icon: Video },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'branding', label: 'Branding', icon: Star },
  { id: 'ux-ui', label: 'UX/UI Design', icon: Layers },
  { id: 'ecommerce', label: 'E-commerce', icon: Globe }
]

const INDUSTRY_OPTIONS = [
  'Restaurant & Hospitality',
  'Healthcare & Medical',
  'Legal Services',
  'Financial Services',
  'Technology',
  'Manufacturing',
  'Retail & E-commerce',
  'Real Estate',
  'Education',
  'Automotive',
  'Construction',
  'Professional Services',
  'Non-Profit',
  'Other'
]

const CATEGORY_OPTIONS = [
  { id: 'web-design', label: 'Web Design', color: 'bg-blue-500' },
  { id: 'branding', label: 'Branding', color: 'bg-purple-500' },
  { id: 'marketing', label: 'Marketing', color: 'bg-emerald-500' },
  { id: 'video', label: 'Video', color: 'bg-red-500' },
  { id: 'full-service', label: 'Full Service', color: 'bg-amber-500' }
]

const BLOCK_TYPES = [
  { id: 'kpis', label: 'KPIs', icon: TrendingUp, description: 'Key metrics' },
  { id: 'services_showcase', label: 'Services', icon: Briefcase, description: 'What we delivered' },
  { id: 'strategic_approach', label: 'Strategy', icon: Target, description: 'Our approach' },
  { id: 'technical_innovations', label: 'Tech', icon: Code, description: 'Technical highlights' },
  { id: 'comprehensive_results', label: 'Results', icon: Award, description: 'Outcomes' },
  { id: 'challenges', label: 'Challenges', icon: AlertCircle, description: 'Problems solved' },
  { id: 'tech_stack', label: 'Tech Stack', icon: Layers, description: 'Technologies used' },
  { id: 'testimonial', label: 'Testimonial', icon: Quote, description: 'Client quote' }
]

// ===== Sub-Components =====

// Step indicator - cleaner, pill-based design
function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--glass-bg)] rounded-full border border-[var(--glass-border)] overflow-x-auto">
      {steps.map((step) => {
        const isActive = currentStep === step.id
        const isComplete = currentStep > step.id
        const Icon = step.icon
        
        return (
          <button
            key={step.id}
            onClick={() => isComplete && onStepClick(step.id)}
            disabled={!isComplete && !isActive}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap shrink-0',
              isActive && 'bg-[var(--brand-primary)] text-white shadow-md',
              isComplete && 'text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 cursor-pointer',
              !isActive && !isComplete && 'text-[var(--text-tertiary)] cursor-not-allowed'
            )}
          >
            {isComplete ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Icon className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-medium">{step.title}</span>
          </button>
        )
      })}
    </div>
  )
}

// Service selection card - visual and clickable
function ServiceCard({ service, selected, onToggle }) {
  const Icon = service.icon
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
        selected
          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-md'
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/50 hover:shadow-sm'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
          selected
            ? 'bg-[var(--brand-primary)] text-white'
            : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] group-hover:bg-[var(--brand-primary)]/20'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={cn(
          'font-medium text-sm transition-colors',
          selected ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'
        )}>
          {service.label}
        </span>
      </div>
      {selected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)]" />
        </div>
      )}
    </button>
  )
}

// KPI Input with visual indicator
function KPIInput({ label, value, onChange, placeholder, suffix, icon: Icon, color = 'purple' }) {
  const colors = {
    purple: 'from-purple-500 to-indigo-500',
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    pink: 'from-pink-500 to-rose-500'
  }
  
  return (
    <div className="relative">
      <div className={cn(
        'absolute -top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white',
        `bg-gradient-to-r ${colors[color]}`
      )}>
        {label}
      </div>
      <div className={cn(
        'pt-4 pb-3 px-4 rounded-xl border-2 transition-all',
        value 
          ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5' 
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
      )}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-0 outline-none text-xl font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
          />
          {suffix && (
            <span className="text-[var(--text-secondary)] font-medium">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// AI Chat Message - more modern bubble design
function ChatMessage({ message, isUser }) {
  return (
    <div className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm',
        isUser 
          ? 'bg-[var(--surface-tertiary)]' 
          : 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser 
          ? 'bg-[var(--brand-primary)] text-white rounded-br-md' 
          : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-bl-md'
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

// Block card with inline editing
function BlockCard({ block, data, onUpdate, onRegenerate, isGenerating }) {
  const Icon = block.icon
  const hasData = data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const renderPreview = () => {
    if (!data) return null
    
    if (block.id === 'kpis' && data) {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(data).slice(0, 4).map(([key, val]) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {key}: <span className="text-[var(--brand-primary)] font-semibold">{val}</span>
            </Badge>
          ))}
        </div>
      )
    }
    
    if (Array.isArray(data)) {
      return (
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          {data.length} items configured
        </p>
      )
    }
    
    if (typeof data === 'object' && data.quote) {
      return (
        <p className="text-xs text-[var(--text-secondary)] mt-2 italic line-clamp-2">
          "{data.quote}"
        </p>
      )
    }
    
    return null
  }
  
  return (
    <div className={cn(
      'rounded-xl border-2 transition-all duration-200',
      hasData 
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10' 
        : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
    )}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            hasData 
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/30 dark:text-emerald-400' 
              : 'bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]'
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)]">{block.label}</h4>
              {hasData && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">{block.description}</p>
            {!isExpanded && renderPreview()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onRegenerate(block.id) }}
              disabled={isGenerating}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
            </Button>
          )}
          <ChevronDown className={cn(
            'w-5 h-5 text-[var(--text-tertiary)] transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </div>
      
      {isExpanded && hasData && (
        <div className="px-4 pb-4">
          <div className="bg-[var(--surface-primary)] rounded-lg border border-[var(--glass-border)] p-3">
            <Textarea
              value={JSON.stringify(data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  onUpdate(block.id, parsed)
                } catch {}
              }}
              className="font-mono text-xs min-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Main Component =====
export default function PortfolioAIDialog({ open, onOpenChange, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef(null)
  const chatInputRef = useRef(null)

  // Form data
  const [formData, setFormData] = useState({
    companyName: '',
    websiteUrl: '',
    industry: '',
    location: '',
    category: 'web-design',
    servicesProvided: [],
    projectGoals: '',
    challengesSolved: '',
    targetAudience: '',
    projectTimeline: '',
    teamSize: '',
    uniqueFeatures: '',
    clientTestimonial: '',
    trafficIncrease: '',
    conversionIncrease: '',
    revenueIncrease: '',
    rankingPosition: '',
    performanceScore: ''
  })

  // AI Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // Generated blocks
  const [generatedBlocks, setGeneratedBlocks] = useState({
    title: '',
    subtitle: '',
    description: '',
    slug: '',
    kpis: null,
    services_showcase: null,
    strategic_approach: null,
    technical_innovations: null,
    comprehensive_results: null,
    challenges: null,
    testimonial: null,
    gallery: null,
    video: null,
    team: null,
    tech_stack: null,
    content: '',
    seo: null,
    details: null
  })

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      setError('')
      setFormData({
        companyName: '',
        websiteUrl: '',
        industry: '',
        location: '',
        category: 'web-design',
        servicesProvided: [],
        projectGoals: '',
        challengesSolved: '',
        targetAudience: '',
        projectTimeline: '',
        teamSize: '',
        uniqueFeatures: '',
        clientTestimonial: '',
        trafficIncrease: '',
        conversionIncrease: '',
        revenueIncrease: '',
        rankingPosition: '',
        performanceScore: ''
      })
      setChatMessages([])
      setChatInput('')
      setGeneratedBlocks({
        title: '',
        subtitle: '',
        description: '',
        slug: '',
        kpis: null,
        services_showcase: null,
        strategic_approach: null,
        technical_innovations: null,
        comprehensive_results: null,
        challenges: null,
        testimonial: null,
        gallery: null,
        video: null,
        team: null,
        tech_stack: null,
        content: '',
        seo: null,
        details: null
      })
    }
  }, [open])

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Toggle service
  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      servicesProvided: prev.servicesProvided.includes(serviceId)
        ? prev.servicesProvided.filter(s => s !== serviceId)
        : [...prev.servicesProvided, serviceId]
    }))
  }

  // Validation
  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.companyName && formData.websiteUrl && formData.industry && formData.location
      case 2: return formData.servicesProvided.length > 0 && formData.projectGoals
      case 3: return generatedBlocks.title && generatedBlocks.subtitle
      case 4: return true
      default: return false
    }
  }

  // Navigation
  const goToNextStep = () => {
    if (currentStep < STEPS.length && canProceed()) {
      setCurrentStep(prev => prev + 1)
      if (currentStep === 2) initiateAIGeneration()
    }
  }

  const goToPrevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1)
  }

  // AI Generation
  const initiateAIGeneration = async () => {
    setIsGenerating(true)
    
    setChatMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `✨ Let me create a compelling portfolio case study for ${formData.companyName}...\n\nI'll analyze your project details and generate professional content for each section.`
    }])

    try {
      // Map service IDs to labels for the API
      const serviceLabels = formData.servicesProvided.map(id => 
        SERVICE_OPTIONS.find(s => s.id === id)?.label || id
      )
      
      const response = await portfolioApi.generateAI({
        ...formData,
        servicesProvided: serviceLabels,
        generateAll: true
      })

      if (response.data.success) {
        const generated = response.data.content
        
        setGeneratedBlocks(prev => ({
          ...prev,
          title: formData.companyName,
          slug: formData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          subtitle: generated.subtitle || '',
          description: generated.description || '',
          kpis: generated.kpis || null,
          services_showcase: generated.services_showcase || null,
          strategic_approach: generated.strategic_approach || null,
          technical_innovations: generated.technical_innovations || null,
          comprehensive_results: generated.comprehensive_results || null,
          challenges: generated.challenges || null,
          tech_stack: generated.tech_stack || null,
          testimonial: formData.clientTestimonial ? {
            quote: formData.clientTestimonial,
            author: 'Client',
            company: formData.companyName
          } : null,
          content: generated.content || '',
          seo: generated.seo || null,
          details: {
            industry: formData.industry,
            location: formData.location,
            website: formData.websiteUrl,
            timeline: formData.projectTimeline,
            teamSize: formData.teamSize
          }
        }))

        const blockCount = Object.values(generated).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length

        setChatMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: `🎉 Done! I've generated ${blockCount} content blocks:\n\n• "${generated.subtitle}"\n• ${generated.services_showcase?.length || 0} services highlighted\n• ${generated.comprehensive_results?.length || 0} measurable results\n• ${generated.strategic_approach?.length || 0} strategy phases\n• ${generated.challenges?.length || 0} challenges solved\n• ${generated.tech_stack?.length || 0} technologies\n\nYou can review and edit everything in the next step, or ask me to tweak any section!`
        }])
      }
    } catch (err) {
      console.error('AI generation failed:', err)
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `😅 Oops! Something went wrong: ${err.response?.data?.error || err.message}\n\nYou can try again or proceed to manually edit the blocks.`
      }])
    } finally {
      setIsGenerating(false)
    }
  }

  // Chat send
  const handleChatSend = async () => {
    if (!chatInput.trim() || isGenerating) return

    const userMessage = chatInput.trim()
    setChatInput('')
    
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage
    }])

    setIsGenerating(true)

    try {
      const response = await portfolioApi.generateAI({
        ...formData,
        existingContent: generatedBlocks,
        chatMessage: userMessage
      })

      if (response.data.success) {
        const updates = response.data.content
        setGeneratedBlocks(prev => ({ ...prev, ...updates }))

        setChatMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: response.data.message || '✅ Done! I\'ve updated the content based on your feedback.'
        }])
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Error: ${err.response?.data?.error || err.message}`
      }])
    } finally {
      setIsGenerating(false)
    }
  }

  // Block regeneration
  const handleRegenerateBlock = async (blockId) => {
    setIsGenerating(true)
    try {
      const response = await portfolioApi.generateAI({
        ...formData,
        regenerateBlock: blockId
      })

      if (response.data.success && response.data.content) {
        setGeneratedBlocks(prev => ({
          ...prev,
          [blockId]: response.data.content[blockId]
        }))
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate')
    } finally {
      setIsGenerating(false)
    }
  }

  // Update block
  const handleUpdateBlock = (blockId, data) => {
    setGeneratedBlocks(prev => ({ ...prev, [blockId]: data }))
  }

  // Save
  const handleSave = async (publish = false) => {
    setIsSaving(true)
    setError('')

    try {
      const payload = {
        ...formData,
        ...generatedBlocks,
        status: publish ? 'published' : 'draft'
      }

      const response = await portfolioApi.createItem(payload)

      if (response.data.success) {
        onSuccess?.(response.data)
        onOpenChange(false)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-h-[90vh] p-0 overflow-hidden bg-[var(--surface-primary)] border-[var(--glass-border)] flex flex-col",
        // Much wider modal for Generate and Review steps
        currentStep >= 3 ? "w-[95vw] max-w-[1600px]" : "w-[95vw] max-w-4xl"
      )}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center shadow-lg shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold text-[var(--text-primary)]">
                  AI Portfolio Creator
                </DialogTitle>
                <DialogDescription className="text-sm text-[var(--text-secondary)]">
                  Create stunning case studies in minutes
                </DialogDescription>
              </div>
            </div>
            <StepIndicator 
              steps={STEPS} 
              currentStep={currentStep} 
              onStepClick={setCurrentStep}
            />
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          
          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Company Information</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Let's start with the basics about this project</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-[var(--text-primary)] font-medium">
                        Company Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Corporation"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="h-10 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="websiteUrl" className="text-[var(--text-primary)] font-medium">
                        Website URL <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="websiteUrl"
                        type="url"
                        placeholder="https://example.com"
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        className="h-10 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-[var(--text-primary)] font-medium">
                        Industry <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={formData.industry} 
                        onValueChange={(value) => setFormData({ ...formData, industry: value })}
                      >
                        <SelectTrigger className="h-10 bg-[var(--glass-bg)] border-[var(--glass-border)]">
                          <SelectValue placeholder="Select industry..." />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRY_OPTIONS.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-[var(--text-primary)] font-medium">
                        Location <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="Cincinnati, OH"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="h-10 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[var(--text-primary)] font-medium">Project Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={cn(
                            'px-4 py-2 rounded-full text-sm font-medium transition-all',
                            formData.category === cat.id
                              ? 'bg-[var(--brand-primary)] text-white shadow-md'
                              : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:border-[var(--brand-primary)]'
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          )}

          {/* Step 2: Services & Results */}
          {currentStep === 2 && (
            <div className="p-6">
              {/* Services */}
              <div className="mb-8">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Services Provided</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Select all services delivered for this project</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SERVICE_OPTIONS.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={formData.servicesProvided.includes(service.id)}
                      onToggle={() => toggleService(service.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Project Details */}
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[var(--brand-primary)]" />
                    Project Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)]">
                        Project Goals <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        placeholder="What did the client want to achieve? What were their main objectives?"
                        value={formData.projectGoals}
                        onChange={(e) => setFormData({ ...formData, projectGoals: e.target.value })}
                        className="min-h-[100px] bg-[var(--glass-bg)] border-[var(--glass-border)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[var(--text-primary)]">Challenges Solved</Label>
                      <Textarea
                        placeholder="What problems or pain points did you address?"
                        value={formData.challengesSolved}
                        onChange={(e) => setFormData({ ...formData, challengesSolved: e.target.value })}
                        className="min-h-[80px] bg-[var(--glass-bg)] border-[var(--glass-border)]"
                      />
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[var(--brand-primary)]" />
                    Results & KPIs
                    <span className="text-xs font-normal text-[var(--text-tertiary)]">(optional but impactful!)</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <KPIInput
                      label="Traffic"
                      value={formData.trafficIncrease}
                      onChange={(e) => setFormData({ ...formData, trafficIncrease: e.target.value })}
                      placeholder="150"
                      suffix="%"
                      icon={TrendingUp}
                      color="emerald"
                    />
                    <KPIInput
                      label="Conversions"
                      value={formData.conversionIncrease}
                      onChange={(e) => setFormData({ ...formData, conversionIncrease: e.target.value })}
                      placeholder="200"
                      suffix="%"
                      icon={Target}
                      color="blue"
                    />
                    <KPIInput
                      label="Revenue"
                      value={formData.revenueIncrease}
                      onChange={(e) => setFormData({ ...formData, revenueIncrease: e.target.value })}
                      placeholder="50K"
                      suffix="$"
                      icon={BarChart3}
                      color="amber"
                    />
                  </div>
                </div>

                {/* Testimonial */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Quote className="w-5 h-5 text-[var(--brand-primary)]" />
                    Client Testimonial
                    <span className="text-xs font-normal text-[var(--text-tertiary)]">(optional)</span>
                  </h3>
                  <Textarea
                    placeholder='"Working with Sonor was incredible. They transformed our online presence..."'
                    value={formData.clientTestimonial}
                    onChange={(e) => setFormData({ ...formData, clientTestimonial: e.target.value })}
                    className="min-h-[80px] bg-[var(--glass-bg)] border-[var(--glass-border)]"
                  />
                </div>
            </div>
          )}

          {/* Step 3: AI Generation */}
          {currentStep === 3 && (
            <div className="flex h-full">
              {/* Chat Panel */}
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium text-sm text-[var(--text-primary)]">AI Content Generator</span>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {chatMessages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} isUser={msg.role === 'user'} />
                    ))}
                    {isGenerating && (
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl rounded-bl-md px-4 py-3 text-sm text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1">
                            Generating
                            <span className="animate-pulse">...</span>
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <div className="flex gap-3 max-w-4xl mx-auto">
                    <Input
                      ref={chatInputRef}
                      placeholder="Ask AI to modify content... (e.g., 'Make results more impressive')"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                      disabled={isGenerating}
                      className="bg-[var(--surface-primary)] border-[var(--glass-border)]"
                    />
                    <Button 
                      onClick={handleChatSend} 
                      disabled={isGenerating || !chatInput.trim()}
                      className="px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Generated Blocks Panel */}
              <div className="w-80 border-l border-[var(--glass-border)] bg-[var(--surface-secondary)] flex flex-col">
                <div className="px-4 py-3 border-b border-[var(--glass-border)]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span className="font-medium text-sm text-[var(--text-primary)]">Generated Blocks</span>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-2">
                    {/* Title/Subtitle Preview */}
                    <Card className={cn(
                      'border-2',
                      generatedBlocks.subtitle ? 'border-emerald-200 bg-emerald-50/50' : 'border-[var(--glass-border)]'
                    )}>
                      <CardContent className="p-4">
                        <h4 className="font-bold text-[var(--text-primary)]">
                          {generatedBlocks.title || 'Title...'}
                        </h4>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {generatedBlocks.subtitle || 'Generating subtitle...'}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Block status indicators */}
                    {BLOCK_TYPES.map(block => {
                      const hasData = generatedBlocks[block.id]
                      const Icon = block.icon
                      return (
                        <div 
                          key={block.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg',
                            hasData ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-[var(--glass-bg)]'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            hasData ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]'
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{block.label}</p>
                          </div>
                          {hasData && <Check className="w-4 h-4 text-emerald-500" />}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 4: Review & Edit */}
          {currentStep === 4 && (
            <ScrollArea className="h-full">
              <div className="p-8 max-w-5xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Review & Edit</h2>
                  <p className="text-[var(--text-secondary)] mt-2">Fine-tune the generated content before publishing</p>
                </div>

                {/* Title & Subtitle */}
                <Card className="mb-6 border-2 border-[var(--glass-border)]">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[var(--text-primary)]">Title</Label>
                        <Input
                          value={generatedBlocks.title}
                          onChange={(e) => setGeneratedBlocks({ ...generatedBlocks, title: e.target.value })}
                          className="text-lg font-bold h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[var(--text-primary)]">Subtitle</Label>
                        <Textarea
                          value={generatedBlocks.subtitle}
                          onChange={(e) => setGeneratedBlocks({ ...generatedBlocks, subtitle: e.target.value })}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[var(--text-primary)]">URL Slug</Label>
                        <Input
                          value={generatedBlocks.slug}
                          onChange={(e) => setGeneratedBlocks({ ...generatedBlocks, slug: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Blocks */}
                <div className="space-y-4">
                  {BLOCK_TYPES.map(block => (
                    <BlockCard
                      key={block.id}
                      block={block}
                      data={generatedBlocks[block.id]}
                      onUpdate={handleUpdateBlock}
                      onRegenerate={handleRegenerateBlock}
                      isGenerating={isGenerating}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 5: Publish */}
          {currentStep === 5 && (
            <ScrollArea className="h-full">
              <div className="p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4 shadow-xl">
                    <Rocket className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-[var(--text-primary)]">Ready to Launch!</h2>
                  <p className="text-[var(--text-secondary)] mt-2 text-lg">Your portfolio case study is ready</p>
                </div>

                {/* Summary Card */}
                <Card className="border-2 border-[var(--glass-border)] mb-6">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[var(--text-secondary)]">Company</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formData.companyName}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[var(--text-secondary)]">URL</span>
                      <code className="text-sm bg-[var(--surface-tertiary)] px-3 py-1 rounded-full">
                        /portfolio/{generatedBlocks.slug}
                      </code>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[var(--text-secondary)]">Services</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {formData.servicesProvided.slice(0, 3).map(id => {
                          const service = SERVICE_OPTIONS.find(s => s.id === id)
                          return service ? (
                            <Badge key={id} variant="secondary">{service.label}</Badge>
                          ) : null
                        })}
                        {formData.servicesProvided.length > 3 && (
                          <Badge variant="secondary">+{formData.servicesProvided.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2">
                      <span className="text-[var(--text-secondary)]">Content Blocks</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {BLOCK_TYPES.filter(b => generatedBlocks[b.id]).length} / {BLOCK_TYPES.length}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14"
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Save className="w-5 h-5 mr-2" />
                    )}
                    Save Draft
                  </Button>
                  <Button
                    size="lg"
                    className="h-14 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90"
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Rocket className="w-5 h-5 mr-2" />
                    )}
                    Publish Now
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            onClick={goToPrevStep}
            disabled={currentStep === 1}
            className="text-[var(--text-secondary)]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {currentStep < 5 && (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed() || isGenerating}
              className="px-6"
            >
              {currentStep === 2 ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
