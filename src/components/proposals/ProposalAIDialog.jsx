// src/components/ProposalAIDialog.jsx
/**
 * AI-Powered Proposal Generator Dialog
 * 
 * Smart wizard that collects:
 * - Proposal type with specific fields
 * - Exact pricing (not ranges)
 * - Brand name and hero image upload
 * - Website URL for audits (website_rebuild type)
 * - AI clarification conversation
 * 
 * Uses GPT-5.1 for ultra-high-quality proposals
 */
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Loader2, 
  Users, 
  DollarSign, 
  Calendar, 
  FileText,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  MapPin,
  TrendingUp,
  Megaphone,
  Video,
  LayoutDashboard,
  MousePointerClick,
  AlertCircle,
  Check,
  Target,
  Lightbulb,
  Globe,
  Image as ImageIcon,
  Upload,
  Send,
  Bot,
  User,
  Zap,
  X,
  Plus
} from 'lucide-react'
import { 
  PROPOSAL_TYPES, 
  getProposalTypesList, 
  getProposalTypeColors
} from '@/proposals/types'
import { proposalsApi, auditsApi, filesApi, commerceApi } from '@/lib/portal-api'
import ProposalPreview from '@/components/ProposalPreview'
import SendProposalDialog from './SendProposalDialog'
import AddProspectDialog from '@/components/crm/AddProspectDialog'
import ProspectSelector from '@/components/ProspectSelector'
import { cn } from '@/lib/utils'

// Icon mapping for proposal types
const TYPE_ICONS = {
  Sparkles,
  RefreshCw,
  MapPin,
  TrendingUp,
  Megaphone,
  Video,
  LayoutDashboard,
  MousePointerClick
}

// Timeline options
const TIMELINE_OPTIONS = [
  { value: '1-week', label: '1 Week', description: 'Quick turnaround' },
  { value: '2-weeks', label: '2 Weeks', description: 'Rush project' },
  { value: '3-weeks', label: '3 Weeks', description: 'Fast project' },
  { value: '4-weeks', label: '4 Weeks', description: 'Quick turnaround' },
  { value: '5-weeks', label: '5 Weeks', description: 'Standard small' },
  { value: '6-weeks', label: '6 Weeks', description: 'Standard' },
  { value: '8-weeks', label: '8 Weeks', description: 'Medium project' },
  { value: '10-weeks', label: '10 Weeks', description: 'Complex project' },
  { value: '12-weeks', label: '12 Weeks', description: 'Large project' },
  { value: '16-weeks', label: '16 Weeks', description: 'Major project' },
  { value: '3-months', label: '3 Months', description: 'Quarter project' },
  { value: '6-months', label: '6 Months', description: 'Half-year project' },
  { value: 'ongoing', label: 'Ongoing', description: 'Monthly retainer' }
]

// Industry options
const INDUSTRIES = [
  'Legal / Law Firm',
  'Medical / Healthcare',
  'Home Services',
  'Professional Services',
  'E-commerce / Retail',
  'Real Estate',
  'Financial Services',
  'Technology / SaaS',
  'Restaurant / Hospitality',
  'Construction / Trades',
  'Other'
]

// Payment terms options
const PAYMENT_TERMS = [
  { value: '50-50', label: '50% upfront, 50% on completion' },
  { value: '100-upfront', label: '100% upfront (5% discount)' },
  { value: '25-25-25-25', label: '25% quarterly milestones' },
  { value: 'monthly', label: 'Monthly billing (retainers)' },
  { value: 'custom', label: 'Custom terms' }
]

// Map full audit object to shape expected by createAI (performance, seo, accessibility, bestPractices)
function mapAuditToResults(audit) {
  if (!audit) return null
  return {
    ...audit,
    performance: audit.performance ?? audit.performanceScore ?? audit.scorePerformance,
    seo: audit.seo ?? audit.seoScore ?? audit.scoreSeo,
    accessibility: audit.accessibility ?? audit.accessibilityScore ?? audit.scoreAccessibility,
    bestPractices: audit.bestPractices ?? audit.bestPracticesScore ?? audit.scoreBestPractices
  }
}

export default function ProposalAIDialog({ 
  onSuccess,
  onNavigate,
  clients = [], 
  preselectedClientId = null,
  preselectedType = null,
  initialFormData = null, // Pre-fill form with prospect data
  initialAuditId = null,  // Pre-fill from existing audit (fetch by id)
  initialAudit = null,    // Pre-fill from full audit object (e.g. from Audits module)
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  triggerButton = true
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setIsOpen = externalOnOpenChange || setInternalOpen
  
  const [step, setStep] = useState(1) // 1: Type, 2: Client+Pricing, 3: Details+Media, 4: AI Chat, 5: Review
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRunningAudit, setIsRunningAudit] = useState(false)
  const [auditResults, setAuditResults] = useState(null)
  const [isSearchingAudit, setIsSearchingAudit] = useState(false)
  const [existingAudit, setExistingAudit] = useState(null)
  
  // Generated proposal state
  const [generatedProposal, setGeneratedProposal] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Add prospect dialog state
  const [showAddProspectDialog, setShowAddProspectDialog] = useState(false)
  const [prospectRevalidateKey, setProspectRevalidateKey] = useState(0)
  
  // Commerce services state (for Phase 4 integration)
  const [commerceServices, setCommerceServices] = useState([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)
  const [selectedOffering, setSelectedOffering] = useState(null)
  
  // AI conversation state
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [aiClarificationsDone, setAiClarificationsDone] = useState(false)
  const [aiConversationId, setAiConversationId] = useState(null)
  
  // Form state
  const [selectedType, setSelectedType] = useState(preselectedType || '')
  const [formData, setFormData] = useState({
    contactId: preselectedClientId || '',
    contactType: '', // 'prospect' or 'client'
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientIndustry: '',
    brandName: '',
    websiteUrl: '',
    totalPrice: '',
    paymentTerms: '50-50',
    customTerms: '',
    addOns: [],
    timeline: '6-weeks',
    startDate: '',
    goals: '',
    challenges: '',
    context: '',
    notes: '',
    heroImage: null,
    heroImagePreview: '',
    validDays: '30'
  })

  // Get proposal types list
  const proposalTypes = useMemo(() => getProposalTypesList(), [])

  // Get selected type details
  const selectedTypeDetails = useMemo(() => 
    selectedType ? PROPOSAL_TYPES[selectedType] : null, 
    [selectedType]
  )

  // Load commerce services when dialog opens (Phase 4 integration)
  useEffect(() => {
    if (isOpen) {
      loadCommerceServices()
    }
  }, [isOpen])

  // Pre-fill from existing audit (initialAuditId or initialAudit from Audits module)
  useEffect(() => {
    if (!isOpen) return
    const id = initialAuditId
    const audit = initialAudit
    if (!id && !audit) return

    const applyAudit = (a) => {
      if (!a) return
      setAuditResults(mapAuditToResults(a))
      setFormData(prev => ({
        ...prev,
        websiteUrl: a.targetUrl || prev.websiteUrl,
        clientName: a.contact?.name || a.prospect?.name || prev.clientName,
        clientCompany: a.contact?.company || a.prospect?.company || prev.clientCompany,
        clientEmail: a.contact?.email || a.prospect?.email || prev.clientEmail
      }))
    }

    if (audit) {
      applyAudit(audit)
      return
    }
    if (id) {
      auditsApi.get(id)
        .then(res => {
          const a = res.data?.audit ?? res.data
          applyAudit(a)
        })
        .catch(err => console.error('[ProposalAI] Failed to load initial audit:', err))
    }
  }, [isOpen, initialAuditId, initialAudit])

  const loadCommerceServices = async () => {
    // Import auth store dynamically to get project ID
    try {
      const { default: useAuthStore } = await import('@/lib/auth-store')
      const projectId = useAuthStore.getState().currentProject?.id
      
      if (!projectId) {
        console.warn('[ProposalAI] No project ID - cannot load commerce services')
        return
      }

      setIsLoadingServices(true)
      const response = await commerceApi.getServices(projectId)
      setCommerceServices(response.data || [])
      console.log('[ProposalAI] Loaded commerce services:', response.data?.length)
    } catch (error) {
      console.error('[ProposalAI] Failed to load commerce services:', error)
      // Non-fatal - continue with hardcoded types
    } finally {
      setIsLoadingServices(false)
    }
  }

  // Suggested add-ons based on type
  const suggestedAddOns = useMemo(() => {
    const addOns = {
      brand_website: [
        { id: 'social-kit', name: 'Social Media Kit', price: 1500 },
        { id: 'photography', name: 'Brand Photography Session', price: 2500 },
        { id: 'video-intro', name: 'Brand Video Intro', price: 3500 }
      ],
      website_rebuild: [
        { id: 'copywriting', name: 'Professional Copywriting', price: 2000 },
        { id: 'photography', name: 'Professional Photography', price: 2500 },
        { id: 'seo-retainer', name: 'SEO Retainer (3 months)', price: 4500 }
      ],
      local_seo: [
        { id: 'gbp-management', name: 'Google Business Profile Management', price: 500 },
        { id: 'citations', name: 'Local Citation Building', price: 1500 },
        { id: 'review-management', name: 'Review Management', price: 750 }
      ],
      seo_retainer: [
        { id: 'premium-backlinks', name: 'Premium Backlink Outreach', price: 1500 },
        { id: 'video-content', name: 'Video Content Creation', price: 2000 },
        { id: 'analytics-setup', name: 'Advanced Analytics Setup', price: 1500 }
      ],
      paid_ads: [
        { id: 'landing-page', name: 'Additional Landing Page', price: 2000 },
        { id: 'video-ads', name: 'Video Ad Production', price: 3000 },
        { id: 'retargeting', name: 'Retargeting Sequences', price: 1500 }
      ],
      media_package: [
        { id: 'drone', name: 'Drone Footage', price: 1000 },
        { id: 'extra-day', name: 'Additional Shoot Day', price: 2500 },
        { id: 'rush-edit', name: 'Rush Editing (48hr)', price: 1000 }
      ],
      web_app: [
        { id: 'mobile-app', name: 'Mobile App Version', price: 15000 },
        { id: 'ai-features', name: 'AI-Powered Features', price: 8000 },
        { id: 'maintenance', name: '12-Month Maintenance', price: 6000 }
      ],
      landing_page: [
        { id: 'ab-testing', name: 'A/B Testing Setup', price: 1000 },
        { id: 'email-sequence', name: '5-Email Nurture Sequence', price: 1500 },
        { id: 'analytics', name: 'Conversion Tracking Setup', price: 500 }
      ]
    }
    return addOns[selectedType] || []
  }, [selectedType])

  // Auto-fill client info when contactId changes
  const handleContactChange = (contactId) => {
    const client = clients.find(c => c.id === contactId)
    setFormData(prev => ({
      ...prev,
      contactId,
      clientName: client?.name || '',
      clientCompany: client?.company || '',
      clientIndustry: client?.industry || '',
      brandName: client?.company || client?.name || ''
    }))
  }

  // Handle hero image upload
  const handleHeroImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        heroImage: file,
        heroImagePreview: URL.createObjectURL(file)
      }))
    }
  }

  // Toggle add-on selection
  const toggleAddOn = (addOn) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.find(a => a.id === addOn.id)
        ? prev.addOns.filter(a => a.id !== addOn.id)
        : [...prev.addOns, addOn]
    }))
  }

  // Custom add-on state
  const [customAddOn, setCustomAddOn] = useState({ name: '', price: '' })
  
  // Monthly retainer state (Default to Hosting & Maintenance $29/mo)
  const [monthlyRetainer, setMonthlyRetainer] = useState({ name: 'Standard Hosting & Maintenance', price: '29' })
  
  // Add custom add-on
  const addCustomAddOn = () => {
    if (!customAddOn.name.trim() || !customAddOn.price) return
    
    const newAddOn = {
      id: `custom-${Date.now()}`,
      name: customAddOn.name.trim(),
      price: parseFloat(customAddOn.price),
      isCustom: true,
      isRecurring: false
    }
    
    setFormData(prev => ({
      ...prev,
      addOns: [...prev.addOns, newAddOn]
    }))
    
    setCustomAddOn({ name: '', price: '' })
  }
  
  // Add monthly retainer
  const addMonthlyRetainer = () => {
    if (!monthlyRetainer.name.trim() || !monthlyRetainer.price) return
    
    // Remove any existing retainer first
    const filteredAddOns = formData.addOns.filter(a => !a.isRecurring)
    
    const newRetainer = {
      id: `retainer-${Date.now()}`,
      name: monthlyRetainer.name.trim(),
      price: parseFloat(monthlyRetainer.price),
      isCustom: true,
      isRecurring: true
    }
    
    setFormData(prev => ({
      ...prev,
      addOns: [...filteredAddOns, newRetainer]
    }))
    
    setMonthlyRetainer({ name: '', price: '' })
  }
  
  // Remove add-on
  const removeAddOn = (addOnId) => {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.filter(a => a.id !== addOnId)
    }))
  }

  // Search for existing audits when URL changes (Step 3 only)
  const normalizeUrl = (value) => {
    if (!value) return ''
    try {
      const normalized = value.startsWith('http') ? value : `https://${value}`
      const urlObj = new URL(normalized)
      const host = urlObj.hostname.replace(/^www\./i, '').toLowerCase()
      const path = urlObj.pathname.replace(/\/+$/, '')
      return `${host}${path}`.toLowerCase()
    } catch {
      return value
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/+$/, '')
        .toLowerCase()
    }
  }

  const normalizeUrlForApi = (value) => {
    if (!value) return null
    try {
      const normalized = value.startsWith('http') ? value : `https://${value}`
      const urlObj = new URL(normalized)
      if (!urlObj.hostname) return null
      return urlObj.toString()
    } catch {
      return null
    }
  }

  const searchExistingAudit = async (url) => {
    if (!url || url.length < 5) {
      setExistingAudit(null)
      return
    }

    const apiUrl = normalizeUrlForApi(url)
    const searchQuery = apiUrl ? null : normalizeUrl(url)

    setIsSearchingAudit(true)
    try {
      console.log('[ProposalAI] Calling audits-list with URL:', url)
      const response = await auditsApi.list({
        targetUrl: apiUrl || undefined,
        search: searchQuery || undefined,
        limit: 10,
        sortBy: 'completed_at',
        sortOrder: 'desc',
      })
      
      console.log('[ProposalAI] Audit search response:', response.data)
      const audits = response.data?.audits || []
      const normalizedInput = normalizeUrl(url)
      const matching = audits.find((audit) => {
        const isCompleted = ['complete', 'completed'].includes(audit.status)
        const targetUrl = audit.targetUrl || audit.target_url || ''
        if (!isCompleted) return false
        const normalizedTarget = normalizeUrl(targetUrl)
        return apiUrl
          ? normalizedTarget === normalizedInput
          : normalizedTarget.includes(normalizedInput)
      })

      if (matching) {
        console.log('[ProposalAI] Found existing audit:', matching.id, matching.targetUrl)
        let fullAuditJson
        try {
          const fullResponse = await auditsApi.getFull(matching.id)
          const fullAudit = fullResponse.data?.audit || fullResponse.data
          fullAuditJson = fullAudit?.fullAuditJson || fullAudit?.full_audit_json
        } catch (err) {
          console.warn('[ProposalAI] Failed to load full audit JSON:', err)
        }

        const payload = {
          id: matching.id,
          targetUrl: matching.targetUrl || matching.target_url,
          createdAt: matching.createdAt,
          performance: matching.performanceScore,
          seo: matching.seoScore,
          accessibility: matching.accessibilityScore,
          bestPractices: matching.bestPracticesScore,
          fullAuditJson
        }

        setExistingAudit(payload)
        setAuditResults({
          performance: payload.performance,
          seo: payload.seo,
          accessibility: payload.accessibility,
          bestPractices: payload.bestPractices,
          fullAuditJson: payload.fullAuditJson
        })
      } else {
        console.log('[ProposalAI] No existing audit found for URL:', url)
        setExistingAudit(null)
      }
    } catch (error) {
      console.error('Error searching for existing audit:', error)
      setExistingAudit(null)
    } finally {
      setIsSearchingAudit(false)
    }
  }

  // Use existing audit
  const useExistingAudit = () => {
    if (existingAudit) {
      setAuditResults({
        performance: existingAudit.performance,
        seo: existingAudit.seo,
        accessibility: existingAudit.accessibility,
        bestPractices: existingAudit.bestPractices,
        fullAuditJson: existingAudit.fullAuditJson // Include full audit data for AI
      })
    }
  }

  // Debounced URL search effect - only on step 3
  useEffect(() => {
    // Only search when on step 3 and have a valid URL
    if (step !== 3 || !formData.websiteUrl || formData.websiteUrl.length < 5) {
      return
    }
    
    const debounceTimer = setTimeout(() => {
      console.log('[ProposalAI] Searching for existing audit by URL:', formData.websiteUrl)
      searchExistingAudit(formData.websiteUrl)
    }, 500) // 500ms debounce
    
    return () => clearTimeout(debounceTimer)
  }, [formData.websiteUrl, step])

  // Run audit for website URL (internal admin-only audit with polling)
  const runAudit = async () => {
    if (!formData.websiteUrl) return
    
    setIsRunningAudit(true)
    try {
      // Start the audit - this returns immediately with an auditId
      const response = await auditsApi.createInternal({
        url: formData.websiteUrl
      })
      
      const { auditId } = response.data
      if (!auditId) {
        console.error('No auditId returned')
        setIsRunningAudit(false)
        return
      }
      
      // Poll for results every 10 seconds (max 1 minute)
      const maxAttempts = 6
      let attempts = 0
      
      const pollForResults = async () => {
        attempts++
        console.log(`[ProposalAI] Polling attempt ${attempts}/${maxAttempts} for audit ${auditId}`)
        try {
          const statusResponse = await auditsApi.getInternalStatus(auditId)
          console.log('[ProposalAI] Poll response:', statusResponse.data)
          const { status, audit } = statusResponse.data
          
          if ((status === 'complete' || status === 'completed') && audit) {
            console.log('[ProposalAI] Audit complete, fetching full details...')
            try {
              // Fetch full audit data including JSON
              const fullResponse = await auditsApi.getFull(auditId)
              const fullAudit = fullResponse.data?.audit || fullResponse.data
              console.log('[ProposalAI] Got full audit data:', fullAudit)
              setAuditResults(fullAudit)
            } catch (err) {
              console.warn('[ProposalAI] Failed to get full audit data, using status result:', err)
              setAuditResults(audit)
            }
            setIsRunningAudit(false)
            return
          }
          
          if (status === 'failed') {
            console.error('[ProposalAI] Audit failed with status:', status)
            setIsRunningAudit(false)
            return
          }
          
          // Still running, poll again
          console.log(`[ProposalAI] Status is ${status}, continuing to poll...`)
          if (attempts < maxAttempts) {
            setTimeout(pollForResults, 10000)
          } else {
            console.error('Audit timed out after 1 minute')
            setIsRunningAudit(false)
          }
        } catch (err) {
          console.error('Poll error:', err)
          if (attempts < maxAttempts) {
            setTimeout(pollForResults, 10000)
          } else {
            setIsRunningAudit(false)
          }
        }
      }
      
      // Start polling after a short delay
      setTimeout(pollForResults, 2000)
      
    } catch (error) {
      console.error('Audit failed:', error)
      setIsRunningAudit(false)
    }
  }

  // Start AI clarification
  const startAiClarification = async () => {
    setIsAiThinking(true)
    
    try {
      const response = await proposalsApi.clarifyAI({
        proposalType: selectedType,
        conversationId: aiConversationId || undefined,
        clientInfo: {
          name: formData.clientName,
          company: formData.clientCompany,
          industry: formData.clientIndustry
        },
        projectInfo: {
          brandName: formData.brandName,
          websiteUrl: formData.websiteUrl,
          totalPrice: formData.totalPrice,
          timeline: formData.timeline,
          goals: formData.goals,
          challenges: formData.challenges,
          context: formData.context
        },
        auditResults
      })
      
      if (response.data.message) {
        setAiMessages([{ role: 'assistant', content: response.data.message }])
        if (response.data.conversationId) {
          setAiConversationId(response.data.conversationId)
        }
        if (response.data.done) {
          setAiClarificationsDone(true)
        }
      } else {
        setAiClarificationsDone(true)
        setAiMessages([{
          role: 'assistant',
          content: "I have all the information I need! Your proposal looks comprehensive. Click 'Continue' to review and generate."
        }])
      }
    } catch (error) {
      console.error('AI clarification failed:', error)
      setAiClarificationsDone(true)
      setAiMessages([{
        role: 'assistant',
        content: "I'm ready to generate your proposal. Click 'Continue' to proceed."
      }])
    } finally {
      setIsAiThinking(false)
    }
  }

  // Send message to AI
  const sendAiMessage = async () => {
    if (!aiInput.trim() || isAiThinking) return
    
    const userMessage = aiInput.trim()
    setAiInput('')
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAiThinking(true)
    
    try {
      const response = await proposalsApi.clarifyAI({
        proposalType: selectedType,
        conversationId: aiConversationId || undefined,
        userMessage,
        clientInfo: {
          name: formData.clientName,
          company: formData.clientCompany,
          industry: formData.clientIndustry
        },
        projectInfo: {
          brandName: formData.brandName,
          websiteUrl: formData.websiteUrl,
          totalPrice: formData.totalPrice,
          timeline: formData.timeline,
          goals: formData.goals,
          challenges: formData.challenges,
          context: formData.context
        },
        auditResults
      })
      
      if (response.data.message) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: response.data.message }])
        if (response.data.conversationId) {
          setAiConversationId(response.data.conversationId)
        }
        if (response.data.done) {
          setAiClarificationsDone(true)
        }
      }
    } catch (error) {
      console.error('AI message failed:', error)
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm ready to proceed. Click 'Continue' to review and generate your proposal." 
      }])
      setAiClarificationsDone(true)
    } finally {
      setIsAiThinking(false)
    }
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSelectedType(preselectedType || '')
      setAiMessages([])
      setAiClarificationsDone(false)
      setAiConversationId(null)
      setAuditResults(null)
      setExistingAudit(null)
      setFormData({
        contactId: preselectedClientId || '',
        clientName: '',
        clientCompany: '',
        clientIndustry: '',
        brandName: '',
        websiteUrl: '',
        totalPrice: '',
        paymentTerms: '50-50',
        customTerms: '',
        addOns: [],
        timeline: '6-weeks',
        startDate: '',
        goals: '',
        challenges: '',
        context: '',
        notes: '',
        heroImage: null,
        heroImagePreview: '',
        validDays: '30',
        // Merge initial form data if provided
        ...initialFormData
      })
    }
  }, [isOpen, preselectedClientId, preselectedType, initialFormData])

  // When entering step 4, start AI clarification
  useEffect(() => {
    if (step === 4 && aiMessages.length === 0) {
      startAiClarification()
    }
  }, [step])

  // Check if current step is valid
  const isStepValid = () => {
    switch (step) {
      case 1: return !!selectedType
      case 2: return !!formData.contactId && !!formData.totalPrice && !!formData.brandName
      case 3: return !!formData.goals
      case 4: return aiClarificationsDone || aiMessages.length > 0
      case 5: return true
      default: return false
    }
  }

  // Calculate total with add-ons (excluding recurring/monthly retainers)
  const totalWithAddOns = useMemo(() => {
    const base = parseFloat(formData.totalPrice) || 0
    const oneTimeAddOns = formData.addOns.filter(a => !a.isRecurring)
    const addOnsTotal = oneTimeAddOns.reduce((sum, a) => sum + a.price, 0)
    return base + addOnsTotal
  }, [formData.totalPrice, formData.addOns])
  
  // Get recurring add-ons (monthly retainers)
  const recurringAddOns = useMemo(() => {
    return formData.addOns.filter(a => a.isRecurring)
  }, [formData.addOns])
  
  // One-time add-ons (for display)
  const oneTimeAddOns = useMemo(() => {
    return formData.addOns.filter(a => !a.isRecurring)
  }, [formData.addOns])

  // Handle form submission
  const handleSubmit = async () => {
    console.log('[ProposalAI] Submitting with auditResults:', auditResults)
    setIsGenerating(true)

    try {
      let heroImageUrl = null
      if (formData.heroImage) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', formData.heroImage)
        formDataUpload.append('category', 'proposal')
        // Store in Proposals folder with brand name subfolder
        const folderPath = `Proposals/${(formData.brandName || 'Unknown').replace(/[^a-zA-Z0-9\s-]/g, '').trim()}`
        formDataUpload.append('folderPath', folderPath)
        formDataUpload.append('isPublic', 'true')

        const uploadResponse = await filesApi.uploadFileForm(formDataUpload)
        heroImageUrl = uploadResponse.data.url
      }

      // Start background generation - returns immediately with proposalId
      const response = await proposalsApi.createAI({
        contactId: formData.contactId,
        contactType: formData.contactType || undefined,
        proposalType: selectedType,
        offeringId: selectedOffering?.id || undefined, // Phase 4: Link to commerce offering
        offeringData: selectedOffering ? { // Phase 4: Pass offering context to AI
          name: selectedOffering.name,
          description: selectedOffering.description,
          features: selectedOffering.features,
          pricing: selectedOffering.pricing,
          duration: selectedOffering.duration,
          deliverables: selectedOffering.deliverables
        } : undefined,
        pricing: {
          basePrice: parseFloat(formData.totalPrice),
          addOns: formData.addOns,
          totalPrice: totalWithAddOns,
          paymentTerms: formData.paymentTerms,
          customTerms: formData.customTerms
        },
        clientInfo: {
          name: formData.clientName,
          company: formData.clientCompany,
          industry: formData.clientIndustry,
          brandName: formData.brandName
        },
        projectInfo: {
          websiteUrl: formData.websiteUrl,
          timeline: formData.timeline,
          startDate: formData.startDate,
          goals: formData.goals,
          challenges: formData.challenges,
          context: formData.context,
          notes: formData.notes
        },
        heroImageUrl,
        auditResults,
        aiConversation: aiMessages,
        validUntil: (() => {
          const date = new Date()
          date.setDate(date.getDate() + parseInt(formData.validDays))
          return date.toISOString().split('T')[0]
        })()
      })

      const { proposalId, status } = response.data
      if (!proposalId) {
        throw new Error('No proposalId returned')
      }

      console.log('[ProposalAI] Background generation started:', proposalId)

      // Poll for completion (background function can take up to 15 min)
      const maxAttempts = 180 // 3 minutes max (180 * 1 second)
      let attempts = 0
      
      const pollForCompletion = async () => {
        while (attempts < maxAttempts) {
          attempts++
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second
          
          try {
            const statusResponse = await proposalsApi.getAIStatus(proposalId)
            const { status: currentStatus, proposal, error } = statusResponse.data
            
            if (currentStatus === 'complete' && proposal) {
              console.log('[ProposalAI] Proposal generated successfully:', proposalId)
              setGeneratedProposal(proposal)
              setIsGenerating(false)
              
              // Close dialog and navigate to editor
              setIsOpen(false)
              if (onSuccess) {
                onSuccess(proposal)
              }
              if (onNavigate) {
                onNavigate('proposal-editor', { proposalId: proposal.id })
              }
              return
            }
            
            if (currentStatus === 'failed') {
              throw new Error(error || 'Generation failed')
            }
            
            // Still generating, continue polling
            console.log(`[ProposalAI] Still generating... (attempt ${attempts})`)
          } catch (pollError) {
            if (pollError.response?.status === 404) {
              throw new Error('Proposal not found during generation')
            }
            // Other errors, keep trying
            console.log('[ProposalAI] Poll error, retrying...', pollError.message)
          }
        }
        
        throw new Error('Generation timed out. The proposal may still be generating in the background.')
      }
      
      await pollForCompletion()
      
    } catch (error) {
      console.error('[ProposalAI] Error:', error)
      alert('Failed to generate proposal: ' + (error.response?.data?.error || error.message))
      setIsGenerating(false)
    }
  }

  // Handle AI edit from preview
  const handleAIEdit = async (instruction, callback) => {
    try {
      // Call AI to regenerate proposal with edits
      const response = await proposalsApi.updateAI(generatedProposal.id, instruction)
      
      if (response.data.proposal) {
        setGeneratedProposal(response.data.proposal)
      }
      callback?.()
    } catch (error) {
      console.error('[ProposalAI] Edit error:', error)
      callback?.(error.message)
    }
  }

  // Handle send email
  const handleSendProposal = async ({ subjectLine, message, recipients }) => {
    setIsSending(true)
    try {
      // Support both single email and array of recipients
      const recipientList = recipients && recipients.length > 0 
        ? recipients 
        : [formData.clientEmail]
        
      const response = await proposalsApi.send(generatedProposal.id, {
        recipients: recipientList,
        subject: subjectLine,
        personalMessage: message
      })
      
      if (response.data.success) {
        // Update the generated proposal with sent status
        setGeneratedProposal(prev => ({
          ...prev,
          status: 'sent',
          sentAt: new Date().toISOString()
        }))
        
        // Close dialogs and notify parent
        setShowSendDialog(false)
        setShowPreview(false)
        setIsOpen(false)
        
        if (onSuccess) {
          onSuccess({
            ...generatedProposal,
            status: 'sent',
            magicLink: response.data.magicLink
          })
        }
      }
    } catch (error) {
      console.error('[ProposalAI] Send error:', error)
      throw error
    } finally {
      setIsSending(false)
    }
  }

  // Render type selection card
  const TypeCard = ({ type }) => {
    const Icon = TYPE_ICONS[type.icon] || FileText
    const colors = getProposalTypeColors(type.id)
    const isSelected = selectedType === type.id

    return (
      <button
        type="button"
        onClick={() => setSelectedType(type.id)}
        className={cn(
          'relative p-4 rounded-2xl border text-left transition-all duration-200',
          'hover:scale-[1.02] hover:shadow-lg',
          isSelected 
            ? 'glass-bg border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/30 shadow-lg' 
            : 'bg-[var(--surface-secondary)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50'
        )}
      >
        {isSelected && (
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', `bg-gradient-to-br ${colors.gradient}`)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{type.shortLabel || type.label}</h3>
        <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{type.description}</p>
      </button>
    )
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90">
            <Sparkles className="w-4 h-4" />
            New Proposal
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-none max-w-[95vw] w-[900px] max-h-[85vh] overflow-hidden flex flex-col glass-bg border-[var(--glass-border)]">
        <DialogHeader className="pb-2 border-b border-[var(--glass-border)]">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[var(--text-primary)]">Create AI Proposal</span>
              <DialogDescription className="font-normal text-sm mt-0.5">
                {step === 1 && 'Select the type of proposal'}
                {step === 2 && 'Set pricing and client details'}
                {step === 3 && 'Add project details and media'}
                {step === 4 && 'AI clarification'}
                {step === 5 && 'Review and generate'}
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 py-2 px-1">
          {[
            { num: 1, label: 'Type' },
            { num: 2, label: 'Pricing' },
            { num: 3, label: 'Details' },
            { num: 4, label: 'AI Chat' },
            { num: 5, label: 'Review' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => s.num < step && setStep(s.num)}
                disabled={s.num > step}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap',
                  step === s.num ? 'glass-bg text-[var(--brand-primary)] font-medium' 
                    : step > s.num ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer' 
                    : 'text-[var(--text-tertiary)] cursor-not-allowed'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  step === s.num ? 'bg-[var(--brand-primary)] text-white' 
                    : step > s.num ? 'bg-green-500/20 text-green-600' 
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-tertiary)]'
                )}>
                  {step > s.num ? <Check className="w-3 h-3" /> : s.num}
                </div>
                <span className="hidden sm:inline text-sm">{s.label}</span>
              </button>
              {i < 4 && <div className={cn('flex-1 h-0.5 min-w-4 rounded-full', step > s.num ? 'bg-green-500/30' : 'bg-[var(--glass-border)]')} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Step 1: Type Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">Choose the proposal type. Each type has specific AI prompts and sections.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {proposalTypes.map(type => <TypeCard key={type.id} type={type} />)}
              </div>
              {selectedTypeDetails && (
                <div className="mt-6 p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-2">{selectedTypeDetails.label}</h4>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{selectedTypeDetails.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTypeDetails.sections.slice(0, 6).map(section => (
                      <Badge key={section} variant="secondary" className="text-xs bg-[var(--surface-tertiary)] text-[var(--text-secondary)]">
                        {section.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Client & Pricing */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Users className="w-4 h-4 text-[var(--brand-primary)]" />
                  Select Prospect or Client
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Search and select *</Label>
                  <ProspectSelector
                    value={formData.contactId}
                    onChange={(selected) => {
                      setFormData(prev => ({
                        ...prev,
                        contactId: selected.id,
                        contactType: selected.type,
                        clientName: selected.name || '',
                        clientCompany: selected.company || '',
                        clientIndustry: selected.industry || '',
                        clientEmail: selected.email || '',
                        brandName: selected.company || selected.name || '',
                        websiteUrl: selected.website || ''
                      }))
                    }}
                    placeholder="Search by name, company, or email..."
                    showCreateNew={true}
                    onCreateNew={() => setShowAddProspectDialog(true)}
                    revalidateKey={prospectRevalidateKey}
                  />
                  {formData.contactType && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {formData.contactType === 'prospect' 
                        ? '💡 This is a prospect. After they sign, they\'ll become a full client.' 
                        : '✅ This is an existing client.'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Industry</Label>
                    <Select value={formData.clientIndustry} onValueChange={(v) => setFormData({ ...formData, clientIndustry: v })}>
                      <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                        <SelectValue placeholder="Select industry..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Brand/Company Name for Proposal *</Label>
                    <Input value={formData.brandName} onChange={(e) => setFormData({ ...formData, brandName: e.target.value })} placeholder="e.g., Smith & Associates Law Firm" className="glass-bg border-[var(--glass-border)]" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Pricing
                </div>
                <div className="grid grid-cols-[120px_1fr] lg:grid-cols-[140px_1fr] gap-6">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Base Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                      <Input type="number" value={formData.totalPrice} onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })} placeholder="15000" className="pl-9 glass-bg border-[var(--glass-border)]" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Payment Terms</Label>
                    <Select value={formData.paymentTerms} onValueChange={(v) => setFormData({ ...formData, paymentTerms: v })}>
                      <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.paymentTerms === 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Custom Payment Terms</Label>
                    <Input value={formData.customTerms} onChange={(e) => setFormData({ ...formData, customTerms: e.target.value })} placeholder="e.g., 30% upfront, 40% at design approval, 30% on launch" className="glass-bg border-[var(--glass-border)]" />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Optional Add-ons
                </div>
                
                {/* Suggested Add-ons */}
                {suggestedAddOns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Suggested</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {suggestedAddOns.map(addOn => {
                        const isSelected = formData.addOns.find(a => a.id === addOn.id)
                        return (
                          <button key={addOn.id} type="button" onClick={() => toggleAddOn(addOn)} className={cn('p-3 rounded-xl border text-left transition-all', isSelected ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10' : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50')}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-[var(--text-primary)]">{addOn.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-[var(--brand-primary)]" />}
                            </div>
                            <span className="text-sm text-green-600 font-medium">+${addOn.price.toLocaleString()}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Custom Add-on Input */}
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Add Custom</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add-on name (e.g., Extra revision round)" 
                      value={customAddOn.name}
                      onChange={(e) => setCustomAddOn(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 glass-bg border-[var(--glass-border)]"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">$</span>
                      <Input 
                        type="number"
                        placeholder="Price" 
                        value={customAddOn.price}
                        onChange={(e) => setCustomAddOn(prev => ({ ...prev, price: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAddOn())}
                        className="pl-7 glass-bg border-[var(--glass-border)]"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={addCustomAddOn}
                      disabled={!customAddOn.name.trim() || !customAddOn.price}
                      className="border-[var(--glass-border)] hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)]"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Monthly Retainer / Service Fee */}
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Monthly Retainer / Service Fee</p>
                  <p className="text-xs text-[var(--text-tertiary)]">This will be set up as a recurring invoice draft, not factored into the initial deposit.</p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g., Monthly SEO Retainer, Hosting & Maintenance" 
                      value={monthlyRetainer.name}
                      onChange={(e) => setMonthlyRetainer(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 glass-bg border-[var(--glass-border)]"
                    />
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">$</span>
                      <Input 
                        type="number"
                        placeholder="/month" 
                        value={monthlyRetainer.price}
                        onChange={(e) => setMonthlyRetainer(prev => ({ ...prev, price: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMonthlyRetainer())}
                        className="pl-7 glass-bg border-[var(--glass-border)]"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={addMonthlyRetainer}
                      disabled={!monthlyRetainer.name.trim() || !monthlyRetainer.price}
                      className="border-[var(--glass-border)] hover:bg-purple-600 hover:text-white hover:border-purple-600"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Selected Add-ons List */}
                {formData.addOns.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-[var(--glass-border)]">
                    <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Selected Add-ons</p>
                    <div className="space-y-2">
                      {formData.addOns.map(addOn => (
                        <div key={addOn.id} className={cn(
                          'flex items-center justify-between p-2 rounded-lg border',
                          addOn.isRecurring 
                            ? 'bg-purple-500/10 border-purple-500/30' 
                            : 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                        )}>
                          <div className="flex items-center gap-2">
                            <Check className={cn('w-4 h-4', addOn.isRecurring ? 'text-purple-500' : 'text-[var(--brand-primary)]')} />
                            <span className="text-sm font-medium text-[var(--text-primary)]">{addOn.name}</span>
                            {addOn.isRecurring && <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Monthly</Badge>}
                            {addOn.isCustom && !addOn.isRecurring && <Badge variant="secondary" className="text-[10px]">Custom</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-medium', addOn.isRecurring ? 'text-purple-600' : 'text-green-600')}>
                              {addOn.isRecurring ? `$${addOn.price.toLocaleString()}/mo` : `+$${addOn.price.toLocaleString()}`}
                            </span>
                            <button type="button" onClick={() => removeAddOn(addOn.id)} className="p-1 rounded hover:bg-red-500/20 text-[var(--text-tertiary)] hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {oneTimeAddOns.length > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm text-[var(--text-secondary)]">Total (one-time):</span>
                        <span className="text-lg font-semibold text-[var(--text-primary)]">${totalWithAddOns.toLocaleString()}</span>
                      </div>
                    )}
                    {recurringAddOns.length > 0 && (
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm text-[var(--text-secondary)]">Recurring (monthly):</span>
                        <span className="text-lg font-semibold text-purple-600">${recurringAddOns.reduce((sum, a) => sum + a.price, 0).toLocaleString()}/mo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Timeline & Schedule
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">
                      Project Timeline
                    </Label>
                    <Select value={formData.timeline} onValueChange={(v) => setFormData({ ...formData, timeline: v })}>
                      <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMELINE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} - {t.description}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">Proposed Start Date</Label>
                    <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="glass-bg border-[var(--glass-border)]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details & Media */}
          {step === 3 && (
            <div className="space-y-6">
              {selectedType === 'website_rebuild' && (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Current Website (for audit)
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        value={formData.websiteUrl} 
                        onChange={(e) => {
                          setFormData({ ...formData, websiteUrl: e.target.value })
                          // Clear audit results when URL changes (existing audit will update via debounced search)
                          setAuditResults(null)
                        }} 
                        placeholder="https://current-website.com" 
                        className="flex-1 glass-bg border-[var(--glass-border)]" 
                      />
                      {isSearchingAudit && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
                        </div>
                      )}
                    </div>
                    <Button type="button" onClick={runAudit} disabled={isRunningAudit || !formData.websiteUrl} className="gap-2">
                      {isRunningAudit ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Run Audit
                    </Button>
                  </div>
                  
                  {/* Existing Audit Found */}
                  {existingAudit && !auditResults && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-blue-500">
                          <Check className="w-4 h-4" />
                          <span className="font-medium text-sm">Existing Audit Found</span>
                        </div>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {new Date(existingAudit.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                        <div><div className="font-semibold">{existingAudit.performance || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">Performance</div></div>
                        <div><div className="font-semibold">{existingAudit.seo || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">SEO</div></div>
                        <div><div className="font-semibold">{existingAudit.accessibility || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">A11y</div></div>
                        <div><div className="font-semibold">{existingAudit.bestPractices || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">Best Practices</div></div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={useExistingAudit} size="sm" className="flex-1 gap-2">
                          <Check className="w-3 h-3" />
                          Use This Audit
                        </Button>
                        <Button type="button" onClick={runAudit} variant="outline" size="sm" className="gap-2" disabled={isRunningAudit}>
                          {isRunningAudit ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Run New
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Audit Results (either from existing or newly run) */}
                  {auditResults && (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">Audit Complete</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div><div className="font-semibold">{auditResults.performance || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">Performance</div></div>
                        <div><div className="font-semibold">{auditResults.seo || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">SEO</div></div>
                        <div><div className="font-semibold">{auditResults.accessibility || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">A11y</div></div>
                        <div><div className="font-semibold">{auditResults.bestPractices || '-'}</div><div className="text-xs text-[var(--text-tertiary)]">Best Practices</div></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[var(--text-secondary)]"><Target className="w-4 h-4 text-purple-500" />Project Goals *</Label>
                <Textarea value={formData.goals} onChange={(e) => setFormData({ ...formData, goals: e.target.value })} placeholder="What does the client want to achieve? Be specific." rows={3} className="glass-bg border-[var(--glass-border)] resize-none" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[var(--text-secondary)]"><AlertCircle className="w-4 h-4 text-orange-500" />Current Challenges</Label>
                <Textarea value={formData.challenges} onChange={(e) => setFormData({ ...formData, challenges: e.target.value })} placeholder="What problems are they facing?" rows={3} className="glass-bg border-[var(--glass-border)] resize-none" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[var(--text-secondary)]"><Lightbulb className="w-4 h-4 text-yellow-500" />Additional Context</Label>
                <Textarea value={formData.context} onChange={(e) => setFormData({ ...formData, context: e.target.value })} placeholder="Competitor URLs, inspiration, special requirements..." rows={2} className="glass-bg border-[var(--glass-border)] resize-none" />
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <ImageIcon className="w-4 h-4 text-pink-500" />
                  Hero Image (appears on proposal)
                </div>
                <div className="flex items-center gap-4">
                  {formData.heroImagePreview ? (
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                      <img src={formData.heroImagePreview} alt="Hero preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFormData({ ...formData, heroImage: null, heroImagePreview: '' })} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white text-xs">×</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-20 rounded-lg border-2 border-dashed border-[var(--glass-border)] cursor-pointer hover:border-[var(--brand-primary)]/50 transition-colors">
                      <Upload className="w-5 h-5 text-[var(--text-tertiary)] mb-1" />
                      <span className="text-xs text-[var(--text-tertiary)]">Upload</span>
                      <input type="file" accept="image/*" onChange={handleHeroImageChange} className="hidden" />
                    </label>
                  )}
                  <p className="text-sm text-[var(--text-tertiary)]">Recommended: 1920×1080 or higher. Will appear with Uptrade logo overlay.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: AI Clarification */}
          {step === 4 && (
            <div className="space-y-4 h-[400px] flex flex-col">
              <p className="text-sm text-[var(--text-secondary)]">AI is reviewing your inputs. Answer any questions to improve the proposal.</p>
              
              <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', msg.role === 'assistant' ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]' : 'bg-[var(--surface-tertiary)]')}>
                      {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-[var(--text-secondary)]" />}
                    </div>
                    <div className={cn('max-w-[80%] p-3 rounded-2xl', msg.role === 'assistant' ? 'bg-[var(--glass-bg)] border border-[var(--glass-border)]' : 'bg-[var(--brand-primary)] text-white')}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="p-3 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
                    </div>
                  </div>
                )}
              </div>

              {!aiClarificationsDone && (
                <div className="flex gap-2">
                  <Input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendAiMessage()} placeholder="Type your response..." className="flex-1 glass-bg border-[var(--glass-border)]" disabled={isAiThinking} />
                  <Button type="button" onClick={sendAiMessage} disabled={!aiInput.trim() || isAiThinking} className="gap-2">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {aiClarificationsDone && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Ready to generate proposal</span>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl glass-bg border border-[var(--glass-border)] space-y-4">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">Proposal Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Type</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedTypeDetails?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Brand</p>
                    <p className="font-medium text-[var(--text-primary)]">{formData.brandName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Total Investment</p>
                    <p className="font-semibold text-lg text-green-600">${totalWithAddOns.toLocaleString()}</p>
                    {formData.addOns.length > 0 && <p className="text-xs text-[var(--text-tertiary)]">(Base: ${parseFloat(formData.totalPrice).toLocaleString()} + {formData.addOns.length} add-ons)</p>}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Timeline</p>
                    <p className="font-medium text-[var(--text-primary)]">{TIMELINE_OPTIONS.find(t => t.value === formData.timeline)?.label}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--glass-border)]">
                  <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Goals</p>
                  <p className="text-sm text-[var(--text-secondary)]">{formData.goals}</p>
                </div>
                {formData.addOns.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Add-ons Included</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.addOns.map(a => <Badge key={a.id} variant="secondary">{a.name} (+${a.price.toLocaleString()})</Badge>)}
                    </div>
                  </div>
                )}
                {formData.heroImagePreview && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Hero Image</p>
                    <img src={formData.heroImagePreview} alt="Hero" className="h-20 rounded-lg object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Label className="text-[var(--text-secondary)]">Proposal valid for:</Label>
                <Select value={formData.validDays} onValueChange={(v) => setFormData({ ...formData, validDays: v })}>
                  <SelectTrigger className="w-32 glass-bg border-[var(--glass-border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="45">45 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[var(--brand-primary)] mt-0.5" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Ready to generate</p>
                    <p className="text-sm text-[var(--text-secondary)]">GPT-5.1 will create a high-converting proposal with urgency triggers, your brand identity, and professional terms. Generation takes 30-60 seconds.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
          <Button type="button" variant="ghost" onClick={() => step === 1 ? setIsOpen(false) : setStep(step - 1)} disabled={isGenerating} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 5 ? (
            <Button type="button" onClick={() => setStep(step + 1)} disabled={!isStepValid()} className="gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90">
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isGenerating} className="gap-2 min-w-[180px] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90">
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Proposal</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Proposal Preview with AI Chat */}
    <ProposalPreview
      proposal={generatedProposal}
      isOpen={showPreview && !!generatedProposal}
      onApprove={() => setShowSendDialog(true)}
      onEdit={(updatedProposal) => setGeneratedProposal(updatedProposal)}
      onClose={() => {
        setShowPreview(false)
        setGeneratedProposal(null)
      }}
    />

    {/* Send Proposal Email Dialog */}
    <SendProposalDialog
      isOpen={showSendDialog}
      onClose={() => setShowSendDialog(false)}
      proposal={generatedProposal}
      clientEmail={formData.clientEmail}
      clientName={formData.clientName || formData.clientCompany}
      onSend={handleSendProposal}
      isSending={isSending}
    />

    {/* Add New Prospect Dialog */}
    <AddProspectDialog
      isOpen={showAddProspectDialog}
      onClose={() => setShowAddProspectDialog(false)}
      onSuccess={(newProspect) => {
        // Trigger revalidation of the ProspectSelector
        setProspectRevalidateKey(prev => prev + 1)
        
        // Auto-select the newly created prospect
        setFormData(prev => ({
          ...prev,
          contactId: newProspect.id,
          contactType: 'prospect',
          clientName: newProspect.name || '',
          clientCompany: newProspect.company || '',
          clientIndustry: newProspect.industry || '',
          clientEmail: newProspect.email || '',
          brandName: newProspect.company || newProspect.name || '',
          websiteUrl: newProspect.website || ''
        }))
      }}
    />
  </>
  )
}
