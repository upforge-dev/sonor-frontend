// src/components/ContractAIDialog.jsx
/**
 * AI-Powered Contract Generator Dialog
 * 
 * For clients with Signal enabled to create contracts for their customers.
 * Uses commerce services instead of hardcoded proposal types.
 * 
 * Flow:
 * 1. Select service from commerce_offerings
 * 2. Enter recipient info (name, email, company)
 * 3. Add custom details/notes
 * 4. AI generates contract
 * 5. Preview and send via magic link
 */
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { 
  Sparkles, 
  Loader2, 
  DollarSign, 
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Send,
  Bot,
  User,
  Package,
  Clock,
  Mail,
  Building2,
  UserCircle,
  AlertCircle,
  Plus,
  Trash2,
  Wand2,
  Pencil
} from 'lucide-react'
import { commerceApi } from '../lib/sonor-api'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

// Format price for display
function formatPrice(price, priceType) {
  if (priceType === 'quote') return 'Quote'
  if (priceType === 'free') return 'Free'
  if (!price) return 'TBD'
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

// Service card component
function ServiceCard({ service, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
        'hover:border-[var(--brand-primary)] hover:bg-[var(--surface-secondary)]',
        isSelected 
          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 ring-2 ring-[var(--brand-primary)]/20' 
          : 'border-[var(--glass-border)] bg-[var(--surface-primary)]'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          isSelected ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-tertiary)]'
        )}>
          <Package className={cn(
            'w-5 h-5',
            isSelected ? 'text-white' : 'text-[var(--text-secondary)]'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-[var(--text-primary)] truncate">{service.name}</h4>
          {service.short_description && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">
              {service.short_description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {formatPrice(service.price, service.price_type)}
            </Badge>
            {service.duration_minutes && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="w-3 h-3" />
                {service.duration_minutes}min
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ContractAIDialog({ 
  projectId,
  open,
  onOpenChange,
  onSuccess
}) {
  const [step, setStep] = useState(1) // 1: Service, 2: Recipient, 3: Details, 4: Review
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [generatedContract, setGeneratedContract] = useState(null)
  
  // Services state
  const [services, setServices] = useState([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [servicesError, setServicesError] = useState(null)
  
  // Form state
  // selectedServiceId = '' when no selection, '__custom__' for a one-off offering
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [customOffering, setCustomOffering] = useState({
    name: '',
    description: '',
    basePrice: ''
  })
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientCompany: '',
    customPrice: '',
    notes: '',
    validDays: '30',
    depositPercentage: '50',
    installAddress: '',
    sameAsRecipient: true,
    dimensionsW: '',
    dimensionsH: '',
    dimensionsD: '',
    deliveryMode: 'email', // 'email' | 'in_person'
  })
  // Addon groups: [{ id, label, options: [{id, label, priceDelta, isBase}], selectedOptionId }]
  const [addonGroups, setAddonGroups] = useState([])
  // Project image (rendering / reference photo shown in the contract)
  const [projectImage, setProjectImage] = useState({ url: '', caption: '' })
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState(null)
  
  // AI conversation state
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  
  // Load services on mount
  useEffect(() => {
    if (open && projectId) {
      loadServices()
    }
  }, [open, projectId])
  
  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1)
      setSelectedServiceId('')
      setCustomOffering({ name: '', description: '', basePrice: '' })
      setAddonGroups([])
      setFormData({
        recipientName: '',
        recipientEmail: '',
        recipientCompany: '',
        customPrice: '',
        notes: '',
        validDays: '30',
        depositPercentage: '50',
        installAddress: '',
        sameAsRecipient: true,
        dimensionsW: '',
        dimensionsH: '',
        dimensionsD: '',
        deliveryMode: 'email',
      })
      setGeneratedContract(null)
      setAiMessages([])
      setProjectImage({ url: '', caption: '' })
      setImageUploadError(null)
    }
  }, [open])
  
  async function loadServices() {
    setIsLoadingServices(true)
    setServicesError(null)
    try {
      const response = await commerceApi.getServices(projectId)
      setServices(response.data?.data || response.data || [])
    } catch (error) {
      console.error('Failed to load services:', error)
      setServicesError('Failed to load services. Please try again.')
    } finally {
      setIsLoadingServices(false)
    }
  }
  
  // Get selected service details (preset OR virtual "custom" offering)
  const isCustom = selectedServiceId === '__custom__'
  const selectedService = useMemo(() => {
    if (isCustom) {
      return {
        id: '__custom__',
        name: customOffering.name || 'Custom Project',
        description: customOffering.description,
        price: parseFloat(customOffering.basePrice) || 0,
        price_type: 'fixed',
        isCustom: true,
      }
    }
    return services.find(s => s.id === selectedServiceId)
  }, [services, selectedServiceId, isCustom, customOffering])

  // Sum of addon deltas for currently selected options
  const addonsTotal = useMemo(() => {
    return addonGroups.reduce((sum, g) => {
      const opt = g.options.find(o => o.id === g.selectedOptionId)
      return sum + (opt ? Number(opt.priceDelta) || 0 : 0)
    }, 0)
  }, [addonGroups])

  // Base price: customPrice override > selected service price
  const basePrice = useMemo(() => {
    if (formData.customPrice !== '' && formData.customPrice != null) {
      return parseFloat(formData.customPrice) || 0
    }
    return selectedService?.price || 0
  }, [selectedService, formData.customPrice])

  const totalPrice = basePrice + addonsTotal

  // Validation
  const canProceedStep1 = isCustom
    ? !!(customOffering.name.trim() && customOffering.basePrice !== '')
    : !!selectedServiceId
  const canProceedStep2 = formData.deliveryMode === 'email'
    ? !!(formData.recipientName.trim() && formData.recipientEmail.trim())
    : !!formData.recipientName.trim()
  const canProceedStep3 = true

  // Upload the project image (rendering/photo) to Supabase storage and
  // capture the public URL for inclusion in the drafted contract.
  async function handleImageUpload(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please choose an image file.')
      return
    }
    setIsUploadingImage(true)
    setImageUploadError(null)
    try {
      const fileId = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `commerce/contracts/${projectId}/${fileId}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('files')
        .upload(storagePath, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(storagePath)
      setProjectImage(prev => ({ ...prev, url: urlData?.publicUrl || '' }))
    } catch (err) {
      console.error('Image upload failed', err)
      setImageUploadError(err?.message || 'Upload failed — try again.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Addon group helpers
  const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  function addAddonGroup(preset) {
    const base = {
      id: genId(),
      label: 'New option group',
      options: [
        { id: genId(), label: 'Included (base)', priceDelta: 0, isBase: true },
      ],
      selectedOptionId: null,
    }
    const group = preset ? { ...base, ...preset, id: genId() } : base
    group.selectedOptionId = group.options[0]?.id || null
    setAddonGroups(prev => [...prev, group])
  }
  function updateGroup(id, patch) {
    setAddonGroups(prev => prev.map(g => (g.id === id ? { ...g, ...patch } : g)))
  }
  function removeGroup(id) {
    setAddonGroups(prev => prev.filter(g => g.id !== id))
  }
  function addOption(groupId) {
    setAddonGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, options: [...g.options, { id: genId(), label: 'New option', priceDelta: 0, isBase: false }] }
      : g))
  }
  function updateOption(groupId, optId, patch) {
    setAddonGroups(prev => prev.map(g => g.id !== groupId ? g : {
      ...g,
      options: g.options.map(o => o.id === optId ? { ...o, ...patch } : o),
    }))
  }
  function removeOption(groupId, optId) {
    setAddonGroups(prev => prev.map(g => g.id !== groupId ? g : {
      ...g,
      options: g.options.filter(o => o.id !== optId),
      selectedOptionId: g.selectedOptionId === optId
        ? (g.options.find(o => o.id !== optId)?.id || null)
        : g.selectedOptionId,
    }))
  }
  
  // Generate contract with AI: calls Signal via Portal to draft sections_json
  async function generateContract() {
    setIsGenerating(true)
    try {
      const selectedAddons = addonGroups
        .map(g => {
          const opt = g.options.find(o => o.id === g.selectedOptionId)
          return opt ? { group: g.label, option: opt.label, priceDelta: Number(opt.priceDelta) || 0 } : null
        })
        .filter(Boolean)

      const dimensions = (formData.dimensionsW || formData.dimensionsH || formData.dimensionsD)
        ? {
            width_in: formData.dimensionsW ? Number(formData.dimensionsW) : undefined,
            height_in: formData.dimensionsH ? Number(formData.dimensionsH) : undefined,
            depth_in: formData.dimensionsD ? Number(formData.dimensionsD) : undefined,
          }
        : null

      const installAddress = formData.sameAsRecipient ? null : formData.installAddress

      const intakeData = {
        client_name: formData.recipientName,
        client_email: formData.recipientEmail,
        client_company: formData.recipientCompany || undefined,
        install_address: installAddress || undefined,
        service_name: selectedService.name,
        service_description: isCustom ? customOffering.description : selectedService?.description,
        is_custom_offering: isCustom,
        base_price: basePrice,
        selected_addons: selectedAddons,
        // Signal uses addon_groups presence/absence to decide whether to
        // emit an AddonSelector section. Pass through the full groups so
        // it can reference labels/options if it wants, but the actual
        // interactive picker reads from contract metadata at render time.
        addon_groups: addonGroups.length ? addonGroups : undefined,
        total_amount: totalPrice,
        deposit_percentage: Number(formData.depositPercentage || 0),
        valid_days: parseInt(formData.validDays),
        dimensions,
        notes: formData.notes,
        project_image_url: projectImage.url || undefined,
        project_image_caption: projectImage.caption || undefined,
      }

      let sections_json = null
      try {
        const response = await commerceApi.aiDraftContract(projectId, {
          intake_data: intakeData,
          additional_instructions: formData.notes || undefined,
        })
        sections_json = response.data?.sections_json || response.data?.data?.sections_json || null
      } catch (err) {
        console.error('AI draft failed; proceeding without generated sections', err)
      }

      const contract = {
        title: `${selectedService.name} Agreement`,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        recipientCompany: formData.recipientCompany,
        installAddress,
        dimensions,
        service: selectedService,
        basePrice,
        addons: selectedAddons,
        addonsTotal,
        price: totalPrice,
        notes: formData.notes,
        validDays: parseInt(formData.validDays),
        depositPercentage: Number(formData.depositPercentage || 0),
        sections_json,
        intakeData,
        generatedAt: new Date().toISOString(),
      }
      setGeneratedContract(contract)
      setStep(4)
    } catch (error) {
      console.error('Failed to generate contract:', error)
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Send contract
  async function sendContract() {
    setIsSending(true)
    try {
      // Create the contract in the database
      const depositPct = formData.depositPercentage !== '' ? Number(formData.depositPercentage) : undefined

      // Client-provided schedule (backend also derives a default if we skip this)
      const paymentSchedule = depositPct && depositPct > 0 && depositPct < 100
        ? [
            { label: 'Deposit', percent: depositPct, trigger: 'on_sign' },
            { label: 'Balance on completion', percent: 100 - depositPct, trigger: 'on_completion' },
          ]
        : undefined

      const contractData = {
        doc_type: 'contract',
        offering_id: isCustom ? undefined : selectedServiceId,
        recipient_name: formData.recipientName,
        recipient_email: formData.recipientEmail?.trim() || undefined,
        recipient_company: formData.recipientCompany,
        title: generatedContract.title,
        description: isCustom ? customOffering.description : undefined,
        total_amount: totalPrice,
        deposit_percentage: depositPct,
        payment_schedule: paymentSchedule,
        valid_until: new Date(Date.now() + parseInt(formData.validDays) * 24 * 60 * 60 * 1000).toISOString(),
        sections_json: generatedContract.sections_json || undefined,
        intake_data: generatedContract.intakeData,
        metadata: {
          notes: formData.notes,
          service: selectedService,
          is_custom_offering: isCustom,
          custom_offering: isCustom ? customOffering : undefined,
          base_price: basePrice,
          addon_groups: addonGroups,
          selected_addons: generatedContract.addons,
          addons_total: addonsTotal,
          install_address: generatedContract.installAddress || undefined,
          dimensions: generatedContract.dimensions || undefined,
          delivery_mode: formData.deliveryMode,
          project_image_url: projectImage.url || undefined,
          project_image_caption: projectImage.caption || undefined,
        },
      }

      const response = await commerceApi.createContract(projectId, contractData)
      const contract = response.data?.contract || response.data

      if (formData.deliveryMode === 'email') {
        // Remote: email the magic link to the recipient.
        await commerceApi.sendContract(projectId, contract.id)
      } else if (formData.deliveryMode === 'in_person') {
        // Open the signing page on this device — don't send the email.
        // Contracts share the public /p/:slug route with proposals; the
        // ProposalSignature block detects doc_type='contract' and signs via
        // the contract's access_token.
        const slug = contract.slug
        if (slug) window.open(`/p/${slug}`, '_blank', 'noopener')
      }
      // deliveryMode === 'draft' → created as draft, nothing else. Findable
      // in the contracts list; can be sent/signed later.

      onSuccess?.(contract)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to send contract:', error)
    } finally {
      setIsSending(false)
    }
  }
  
  // Handle AI chat
  async function handleAiChat(message) {
    setAiMessages(prev => [...prev, { role: 'user', content: message }])
    setAiInput('')
    setIsAiThinking(true)
    
    try {
      // TODO: Call Signal API for AI response
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I\'ve noted that. Would you like me to include any specific terms or conditions in the contract?' 
      }])
    } catch (error) {
      console.error('AI chat error:', error)
    } finally {
      setIsAiThinking(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col glass-bg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
            Create Contract with AI
          </DialogTitle>
          <DialogDescription>
            Generate a professional contract for your customer
          </DialogDescription>
        </DialogHeader>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--glass-border)]">
          {[
            { num: 1, label: 'Service' },
            { num: 2, label: 'Recipient' },
            { num: 3, label: 'Details' },
            { num: 4, label: 'Review' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                step === s.num 
                  ? 'bg-[var(--brand-primary)] text-white' 
                  : step > s.num 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'
              )}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && (
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Select the service this contract is for:
              </p>
              
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : servicesError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-[var(--text-secondary)]">{servicesError}</p>
                  <Button variant="outline" onClick={loadServices} className="mt-4">
                    Try Again
                  </Button>
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="font-medium text-[var(--text-primary)]">No Services Found</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Create services in Commerce → Offerings first
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Custom / one-off offering */}
                  <button
                    type="button"
                    onClick={() => setSelectedServiceId('__custom__')}
                    className={cn(
                      'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                      'hover:border-[var(--brand-primary)] hover:bg-[var(--surface-secondary)]',
                      isCustom
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 ring-2 ring-[var(--brand-primary)]/20'
                        : 'border-dashed border-[var(--glass-border)] bg-[var(--surface-primary)]'
                    )}
                  >
                    {isCustom && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        isCustom ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-tertiary)]'
                      )}>
                        <Pencil className={cn('w-5 h-5', isCustom ? 'text-white' : 'text-[var(--text-secondary)]')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[var(--text-primary)]">Custom / One-Off Project</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Not a standard offering — define it inline (e.g. custom entertainment center).
                        </p>
                      </div>
                    </div>
                  </button>

                  {services.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedServiceId === service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                    />
                  ))}
                </div>
              )}

              {/* Custom offering inline fields */}
              {isCustom && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Project Name *</Label>
                    <Input
                      value={customOffering.name}
                      onChange={e => setCustomOffering({ ...customOffering, name: e.target.value })}
                      placeholder="Custom Entertainment Center"
                      className="glass-bg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Description</Label>
                    <Textarea
                      value={customOffering.description}
                      onChange={e => setCustomOffering({ ...customOffering, description: e.target.value })}
                      placeholder="Floor-to-ceiling built-in entertainment center — Traditional package, painted plywood with crown molding..."
                      rows={3}
                      className="glass-bg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Base Price (USD) *</Label>
                    <Input
                      type="number"
                      value={customOffering.basePrice}
                      onChange={e => setCustomOffering({ ...customOffering, basePrice: e.target.value })}
                      placeholder="7995"
                      className="glass-bg"
                    />
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Upsell options (wood upgrades, lighting, etc.) go on Step 3.
                    </p>
                  </div>
                </div>
              )}
              
              {selectedService && !isCustom && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                  <h4 className="font-medium text-[var(--text-primary)] mb-2">
                    {selectedService.name}
                  </h4>
                  {selectedService.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      {selectedService.description}
                    </p>
                  )}
                  {selectedService.features?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedService.features.slice(0, 5).map((feature, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {typeof feature === 'string' ? feature : feature.name || feature.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Recipient Info */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Delivery mode toggle */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'email', Icon: Mail, label: 'Email magic link', hint: 'Client gets a link to sign remotely.' },
                  { id: 'in_person', Icon: UserCircle, label: 'Sign in person', hint: 'Opens the signing page now.' },
                  { id: 'draft', Icon: FileText, label: 'Save for later', hint: 'No email, no auto-open. Review or send later.' },
                ].map(({ id, Icon, label, hint }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMode: id })}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      formData.deliveryMode === id
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                        : 'border-[var(--glass-border)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="font-medium text-sm text-[var(--text-primary)]">{label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{hint}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-[var(--brand-primary)]" />
                    Recipient Name *
                  </Label>
                  <Input
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    placeholder="John Smith"
                    className="glass-bg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[var(--brand-primary)]" />
                    Recipient Email {formData.deliveryMode === 'email' ? '*' : '(optional)'}
                  </Label>
                  <Input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    placeholder={formData.deliveryMode === 'email' ? 'john@example.com' : 'Optional — used to email the signed PDF later'}
                    className="glass-bg"
                  />
                  {formData.deliveryMode === 'in_person' && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      If provided, the signed PDF will be emailed once the deposit is paid.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
                    Company (Optional)
                  </Label>
                  <Input
                    value={formData.recipientCompany}
                    onChange={(e) => setFormData({ ...formData, recipientCompany: e.target.value })}
                    placeholder="ACME Corp"
                    className="glass-bg"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Details & Pricing */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Customize the contract details:
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--brand-primary)]" />
                    Price
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.customPrice || selectedService?.price || ''}
                      onChange={(e) => setFormData({ ...formData, customPrice: e.target.value })}
                      placeholder={selectedService?.price?.toString() || 'Enter price'}
                      className="glass-bg"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">USD</span>
                  </div>
                  {selectedService?.price && !formData.customPrice && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Default price from service: {formatPrice(selectedService.price, 'fixed')}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                    Additional Notes
                  </Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special terms, scope details, or notes for the AI..."
                    rows={4}
                    className="glass-bg"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valid For</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.validDays}
                        onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                        className="w-24 glass-bg"
                        min={1}
                        max={90}
                      />
                      <span className="text-sm text-[var(--text-secondary)]">days</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[var(--brand-primary)]" />
                      Deposit %
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({ ...formData, depositPercentage: e.target.value })}
                        className="w-24 glass-bg"
                        min={0}
                        max={100}
                      />
                      <span className="text-sm text-[var(--text-secondary)]">
                        = {formatPrice(totalPrice * (parseFloat(formData.depositPercentage || '0') / 100), 'fixed')} on sign
                      </span>
                    </div>
                  </div>
                </div>

                {/* Project image (rendering / reference photo) */}
                <div className="space-y-3 pt-2 border-t border-[var(--glass-border)]">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[var(--brand-primary)]" />
                    Project Image <span className="text-xs text-[var(--text-tertiary)] font-normal">(optional)</span>
                  </Label>
                  {projectImage.url ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-[var(--glass-border)]">
                        <img src={projectImage.url} alt="Project reference" className="w-full h-48 object-cover" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setProjectImage({ url: '', caption: '' })}
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                          Remove
                        </Button>
                      </div>
                      <Input
                        value={projectImage.caption}
                        onChange={e => setProjectImage(prev => ({ ...prev, caption: e.target.value }))}
                        placeholder="Caption (e.g. Rendering of the proposed built-in)"
                        className="glass-bg"
                      />
                    </div>
                  ) : (
                    <label className={cn(
                      'flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                      isUploadingImage
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                        : 'border-[var(--glass-border)] hover:border-[var(--brand-primary)] hover:bg-[var(--surface-secondary)]'
                    )}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(file)
                        }}
                      />
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="w-6 h-6 text-[var(--brand-primary)] animate-spin mb-2" />
                          <span className="text-sm text-[var(--text-secondary)]">Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-[var(--text-tertiary)] mb-2" />
                          <span className="text-sm font-medium text-[var(--text-primary)]">Add rendering or reference photo</span>
                          <span className="text-xs text-[var(--text-tertiary)] mt-1">Shown in the contract above Scope of Work</span>
                        </>
                      )}
                    </label>
                  )}
                  {imageUploadError && (
                    <p className="text-xs text-red-500">{imageUploadError}</p>
                  )}
                </div>

                {/* Install site details */}
                <div className="space-y-3 pt-2 border-t border-[var(--glass-border)]">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
                    Install Site
                  </Label>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={formData.sameAsRecipient}
                      onChange={e => setFormData({ ...formData, sameAsRecipient: e.target.checked })}
                      className="accent-[var(--brand-primary)]"
                    />
                    Install address same as recipient
                  </label>
                  {!formData.sameAsRecipient && (
                    <Input
                      value={formData.installAddress}
                      onChange={e => setFormData({ ...formData, installAddress: e.target.value })}
                      placeholder="1234 Oak Ave, Cincinnati OH 45202"
                      className="glass-bg"
                    />
                  )}
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Approximate dimensions (inches, optional)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        value={formData.dimensionsW}
                        onChange={e => setFormData({ ...formData, dimensionsW: e.target.value })}
                        placeholder="Width"
                        className="glass-bg"
                      />
                      <Input
                        type="number"
                        value={formData.dimensionsH}
                        onChange={e => setFormData({ ...formData, dimensionsH: e.target.value })}
                        placeholder="Height"
                        className="glass-bg"
                      />
                      <Input
                        type="number"
                        value={formData.dimensionsD}
                        onChange={e => setFormData({ ...formData, dimensionsD: e.target.value })}
                        placeholder="Depth"
                        className="glass-bg"
                      />
                    </div>
                  </div>
                </div>

                {/* Addon / Upsell option groups */}
                <div className="space-y-3 pt-2 border-t border-[var(--glass-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[var(--brand-primary)]" />
                        Upsell Options
                      </Label>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Group of mutually exclusive choices (e.g. Wood: Painted / Maple +$1,000 / Oak +$1,500).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {addonGroups.length === 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            addAddonGroup({
                              label: 'Wood',
                              options: [
                                { id: genId(), label: 'Painted plywood (included)', priceDelta: 0, isBase: true },
                                { id: genId(), label: 'Maple wood', priceDelta: 1500, isBase: false },
                                { id: genId(), label: 'Oak wood', priceDelta: 2000, isBase: false },
                              ],
                            })
                            addAddonGroup({
                              label: 'Lighting',
                              options: [
                                { id: genId(), label: 'Standard LED (included)', priceDelta: 0, isBase: true },
                                { id: genId(), label: 'Strip lighting', priceDelta: 400, isBase: false },
                                { id: genId(), label: 'Wi-Fi color strip lighting', priceDelta: 1000, isBase: false },
                              ],
                            })
                          }}
                        >
                          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                          Preset: Wood + Lighting
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="outline" onClick={() => addAddonGroup()}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add group
                      </Button>
                    </div>
                  </div>

                  {addonGroups.map(group => (
                    <div
                      key={group.id}
                      className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={group.label}
                          onChange={e => updateGroup(group.id, { label: e.target.value })}
                          placeholder="Group name (e.g. Wood, Lighting)"
                          className="glass-bg flex-1"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeGroup(group.id)}
                          aria-label="Remove group"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        {group.options.map(opt => {
                          const isSelected = group.selectedOptionId === opt.id
                          return (
                            <div
                              key={opt.id}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-md border transition-colors',
                                isSelected
                                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                                  : 'border-[var(--glass-border)]'
                              )}
                            >
                              <input
                                type="radio"
                                name={`group-${group.id}`}
                                checked={isSelected}
                                onChange={() => updateGroup(group.id, { selectedOptionId: opt.id })}
                                className="accent-[var(--brand-primary)]"
                              />
                              <Input
                                value={opt.label}
                                onChange={e => updateOption(group.id, opt.id, { label: e.target.value })}
                                placeholder="Option label"
                                className="glass-bg flex-1 h-8 text-sm"
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-[var(--text-tertiary)]">+$</span>
                                <Input
                                  type="number"
                                  value={opt.priceDelta}
                                  onChange={e => updateOption(group.id, opt.id, { priceDelta: e.target.value === '' ? 0 : Number(e.target.value) })}
                                  className="glass-bg w-24 h-8 text-sm"
                                />
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => removeOption(group.id, opt.id)}
                                disabled={group.options.length <= 1}
                                aria-label="Remove option"
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                              </Button>
                            </div>
                          )
                        })}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => addOption(group.id)}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add option
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Running total */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
                    <div className="text-sm">
                      <span className="text-[var(--text-secondary)]">Base </span>
                      <span className="font-medium text-[var(--text-primary)]">{formatPrice(basePrice, 'fixed')}</span>
                      {addonsTotal > 0 && (
                        <>
                          <span className="text-[var(--text-secondary)]"> + upsells </span>
                          <span className="font-medium text-[var(--text-primary)]">{formatPrice(addonsTotal, 'fixed')}</span>
                        </>
                      )}
                    </div>
                    <div className="text-lg font-bold text-[var(--brand-primary)]">
                      Total {formatPrice(totalPrice, 'fixed')}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Chat for clarifications */}
              <div className="mt-6 p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Ask AI for help
                  </span>
                </div>
                
                {aiMessages.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={cn(
                        'flex items-start gap-2 text-sm',
                        msg.role === 'user' ? 'justify-end' : ''
                      )}>
                        {msg.role === 'assistant' && (
                          <Bot className="w-4 h-4 text-[var(--brand-primary)] mt-0.5" />
                        )}
                        <span className={cn(
                          'px-3 py-1.5 rounded-lg max-w-[80%]',
                          msg.role === 'user' 
                            ? 'bg-[var(--brand-primary)] text-white' 
                            : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)]'
                        )}>
                          {msg.content}
                        </span>
                        {msg.role === 'user' && (
                          <User className="w-4 h-4 text-[var(--text-secondary)] mt-0.5" />
                        )}
                      </div>
                    ))}
                    {isAiThinking && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Bot className="w-4 h-4 text-[var(--brand-primary)]" />
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask about terms, scope, or get suggestions..."
                    className="glass-bg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiInput.trim() && !isAiThinking) {
                        handleAiChat(aiInput.trim())
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    disabled={!aiInput.trim() || isAiThinking}
                    onClick={() => handleAiChat(aiInput.trim())}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Review */}
          {step === 4 && generatedContract && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Review the contract before sending:
              </p>
              
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)] space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {generatedContract.title}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-tertiary)]">Recipient:</span>
                    <p className="font-medium text-[var(--text-primary)]">
                      {generatedContract.recipientName}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      {generatedContract.recipientEmail}
                    </p>
                    {generatedContract.recipientCompany && (
                      <p className="text-[var(--text-secondary)]">
                        {generatedContract.recipientCompany}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--text-tertiary)]">Amount:</span>
                    <p className="text-2xl font-bold text-[var(--brand-primary)]">
                      {formatPrice(generatedContract.price, 'fixed')}
                    </p>
                    {formData.depositPercentage && Number(formData.depositPercentage) > 0 && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Deposit on sign: {formatPrice(generatedContract.price * (Number(formData.depositPercentage) / 100), 'fixed')} ({formData.depositPercentage}%)
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-[var(--text-tertiary)] text-sm">Service:</span>
                  <p className="text-[var(--text-primary)]">{generatedContract.service.name}</p>
                  {generatedContract.service.isCustom && generatedContract.service.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{generatedContract.service.description}</p>
                  )}
                </div>

                {generatedContract.addons?.length > 0 && (
                  <div>
                    <span className="text-[var(--text-tertiary)] text-sm">Selected options:</span>
                    <ul className="mt-1 space-y-1">
                      <li className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Base</span>
                        <span className="text-[var(--text-primary)]">{formatPrice(generatedContract.basePrice, 'fixed')}</span>
                      </li>
                      {generatedContract.addons.map((a, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">{a.group}: {a.option}</span>
                          <span className="text-[var(--text-primary)]">
                            {a.priceDelta > 0 ? `+${formatPrice(a.priceDelta, 'fixed')}` : 'Included'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {generatedContract.notes && (
                  <div>
                    <span className="text-[var(--text-tertiary)] text-sm">Notes:</span>
                    <p className="text-[var(--text-secondary)]">{generatedContract.notes}</p>
                  </div>
                )}
                
                <div className="text-xs text-[var(--text-tertiary)]">
                  Valid for {generatedContract.validDays} days
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-600">
                  {formData.deliveryMode === 'in_person' && (
                    <><strong>In-person signing:</strong> the signing page will open in a new tab after save — hand the device to the client to review and sign.</>
                  )}
                  {formData.deliveryMode === 'draft' && (
                    <><strong>Saved for later:</strong> the contract will be created as a draft. You can review, send by email, or open the signing page from the Contracts list anytime before it expires.</>
                  )}
                  {formData.deliveryMode === 'email' && (
                    <><strong>Note:</strong> The recipient will receive an email with a magic link to view and sign this contract. They don't need a portal account.</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--glass-border)]">
          <Button 
            variant="ghost" 
            onClick={() => step === 1 ? onOpenChange(false) : setStep(step - 1)}
            disabled={isGenerating || isSending}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {step === 3 && (
            <Button
              onClick={generateContract}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Contract
                </>
              )}
            </Button>
          )}
          
          {step === 4 && (
            <Button
              onClick={sendContract}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {formData.deliveryMode === 'email' ? 'Sending…' : 'Saving…'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {formData.deliveryMode === 'email' && 'Send Contract'}
                  {formData.deliveryMode === 'in_person' && 'Save & Open Signing Page'}
                  {formData.deliveryMode === 'draft' && 'Save as Draft'}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
