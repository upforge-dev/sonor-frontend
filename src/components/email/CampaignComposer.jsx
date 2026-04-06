import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { GlassCard, GlassCardContent } from '@/components/ui/glass-card'
import { 
  ArrowLeft, 
  ArrowRight,
  Save, 
  Send,
  Clock,
  Users,
  FileText,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Package,
  Mail,
  Search,
  X,
  UserPlus,
  Tag,
  Globe,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import { emailApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import OfferingSelector from './OfferingSelector'
import { EmailTemplateCard } from './EmailTemplateCard'

const STEPS = [
  { id: 'details', label: 'Campaign Details', icon: FileText },
  { id: 'audience', label: 'Select Audience', icon: Users },
  { id: 'content', label: 'Email Content', icon: FileText },
  { id: 'review', label: 'Review & Send', icon: Send }
]

const AUDIENCE_MODES = [
  { id: 'lists', label: 'Subscriber Lists', icon: Tag, description: 'Send to one or more subscriber lists' },
  { id: 'contacts', label: 'Specific Contacts', icon: UserPlus, description: 'Search and pick individual contacts' },
  { id: 'manual', label: 'Email Addresses', icon: Mail, description: 'Enter email addresses directly' },
  { id: 'all', label: 'All Subscribers', icon: Users, description: 'Send to every active subscriber' },
]

export default function CampaignComposer({ campaign, onSave, onBack, onEditTemplate }) {
  const { templates, lists, fetchTemplates, fetchLists, settings, fetchSettings, subscribers, fetchSubscribers } = useEmailPlatformStore()
  const { currentProject } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Email capability (primary domain) — auto-fill from/email
  const [emailCapability, setEmailCapability] = useState(null)
  const [capabilityLoading, setCapabilityLoading] = useState(true)

  // Audience state
  const [audienceMode, setAudienceMode] = useState('lists')
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState([])
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [manualEmail, setManualEmail] = useState('')
  const searchTimeout = useRef(null)

  // Signal Compose prefill
  const prefill = campaign?._prefill || null

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    subject: prefill?.subject || campaign?.subject || '',
    preview_text: prefill?.previewText || campaign?.preview_text || '',
    from_name: campaign?.from_name || '',
    from_email: campaign?.from_email || '',
    reply_to: campaign?.reply_to || '',
    template_id: campaign?.template_id || '',
    list_ids: campaign?.list_ids || [],
    selected_contacts: campaign?.selected_contacts || [],
    manual_emails: campaign?.manual_emails || [],
    audience_mode: campaign?.audience_mode || 'lists',
    send_to_all: campaign?.send_to_all || false,
    schedule_type: 'now',
    scheduled_for: '',
    offering_id: campaign?.offering_id || null,
    offering_snapshot: campaign?.offering_snapshot || null,
    signal_html: prefill?.html || null,
  })

  // Fetch email capability, templates, lists, settings on mount
  useEffect(() => {
    fetchTemplates()
    fetchLists()
    fetchSettings()
    fetchSubscribers()

    if (currentProject?.id) {
      emailApi.checkEmailCapability(currentProject.id)
        .then(res => {
          const data = res.data || res
          setEmailCapability(data)
        })
        .catch(() => setEmailCapability(null))
        .finally(() => setCapabilityLoading(false))
    } else {
      setCapabilityLoading(false)
    }
  }, [fetchTemplates, fetchLists, fetchSettings, fetchSubscribers, currentProject?.id])

  // Auto-fill from/email from capability or settings
  useEffect(() => {
    if (campaign?.from_email) return

    const cap = emailCapability
    const s = settings

    setFormData(prev => {
      const updates = {}
      if (!prev.from_name) {
        updates.from_name = s?.default_from_name || currentProject?.title || ''
      }
      if (!prev.from_email) {
        if (cap?.enabled && cap.email) {
          updates.from_email = cap.email
        } else if (s?.default_from_email) {
          updates.from_email = s.default_from_email
        }
      }
      if (!prev.reply_to) {
        updates.reply_to = s?.default_reply_to || prev.from_email || updates.from_email || ''
      }
      return Object.keys(updates).length ? { ...prev, ...updates } : prev
    })
  }, [emailCapability, settings, campaign?.from_email, currentProject?.title])

  // If pre-filled from Signal, skip to audience selection
  useEffect(() => {
    if (prefill?.html && currentStep === 0) {
      setCurrentStep(1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleList = (listId) => {
    setFormData(prev => ({
      ...prev,
      list_ids: prev.list_ids.includes(listId)
        ? prev.list_ids.filter(id => id !== listId)
        : [...prev.list_ids, listId]
    }))
  }

  // Contact search with debounce
  const handleContactSearch = useCallback((query) => {
    setContactSearch(query)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query || query.length < 2) {
      setContactResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchingContacts(true)
      try {
        const { data } = await emailApi.searchContacts(query)
        const results = Array.isArray(data) ? data : data?.contacts || []
        setContactResults(results.filter(c => c.email))
      } catch {
        setContactResults([])
      } finally {
        setSearchingContacts(false)
      }
    }, 300)
  }, [])

  const addContact = (contact) => {
    setFormData(prev => {
      if (prev.selected_contacts.some(c => c.email === contact.email)) return prev
      return { ...prev, selected_contacts: [...prev.selected_contacts, { id: contact.id, email: contact.email, name: contact.name }] }
    })
    setContactSearch('')
    setContactResults([])
  }

  const removeContact = (email) => {
    setFormData(prev => ({
      ...prev,
      selected_contacts: prev.selected_contacts.filter(c => c.email !== email)
    }))
  }

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address')
      return
    }
    setFormData(prev => {
      if (prev.manual_emails.includes(email)) return prev
      return { ...prev, manual_emails: [...prev.manual_emails, email] }
    })
    setManualEmail('')
  }

  const removeManualEmail = (email) => {
    setFormData(prev => ({
      ...prev,
      manual_emails: prev.manual_emails.filter(e => e !== email)
    }))
  }

  const selectedTemplate = templates.find(t => t.id === formData.template_id)

  const totalRecipients = (() => {
    switch (audienceMode) {
      case 'lists':
        return lists
          .filter(l => formData.list_ids.includes(l.id))
          .reduce((sum, l) => sum + (l.subscriber_count || 0), 0)
      case 'contacts':
        return formData.selected_contacts.length
      case 'manual':
        return formData.manual_emails.length
      case 'all':
        return subscribers.length
      default:
        return 0
    }
  })()

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name && formData.subject && formData.from_name && formData.from_email
      case 1:
        if (audienceMode === 'lists') return formData.list_ids.length > 0
        if (audienceMode === 'contacts') return formData.selected_contacts.length > 0
        if (audienceMode === 'manual') return formData.manual_emails.length > 0
        if (audienceMode === 'all') return true
        return false
      case 2:
        return formData.template_id || formData.signal_html
      case 3:
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      if (currentStep === 1) {
        updateField('audience_mode', audienceMode)
        updateField('send_to_all', audienceMode === 'all')
      }
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const buildPayload = () => ({
    name: formData.name,
    subject: formData.subject,
    previewText: formData.preview_text,
    fromName: formData.from_name,
    fromEmail: formData.from_email,
    replyTo: formData.reply_to,
    templateId: formData.template_id || undefined,
    projectId: currentProject?.id || undefined,
    contentHtml: formData.signal_html || undefined,
    listIds: audienceMode === 'lists' ? formData.list_ids : undefined,
    audienceMode,
    selectedContacts: audienceMode === 'contacts' ? formData.selected_contacts : undefined,
    manualEmails: audienceMode === 'manual' ? formData.manual_emails : undefined,
    sendToAll: audienceMode === 'all' || undefined,
    scheduledAt: formData.schedule_type === 'later' ? formData.scheduled_for : undefined,
    offeringId: formData.offering_id || undefined,
    offeringSnapshot: formData.offering_snapshot || undefined,
  })

  const handleSave = async (sendNow = false) => {
    setIsSaving(true)
    try {
      await onSave(buildPayload(), sendNow)
      toast.success(sendNow ? 'Campaign sent!' : 'Campaign saved!')
    } catch (error) {
      toast.error(error.message || 'Failed to save campaign')
    } finally {
      setIsSaving(false)
    }
  }

  const domainName = emailCapability?.enabled
    ? emailCapability.email?.split('@')[1]
    : null

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-[var(--glass-bg)]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="font-semibold">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-6 py-4">
        <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isComplete = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-[var(--brand-primary)] text-white' 
                      : isComplete 
                        ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
                        : 'bg-[var(--glass-bg-inset)] text-[var(--text-secondary)]'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 mx-2 text-[var(--text-tertiary)]" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className={currentStep === 2 ? 'max-w-6xl mx-auto' : 'max-w-2xl mx-auto'}>
          {/* Step 1: Campaign Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Campaign Name</Label>
                <p className="text-sm text-[var(--text-secondary)] mb-2">Internal name for this campaign</p>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., December Newsletter"
                />
              </div>

              <div>
                <Label className="text-base font-semibold">Email Subject</Label>
                <p className="text-sm text-[var(--text-secondary)] mb-2">What subscribers see in their inbox</p>
                <Input
                  value={formData.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="e.g., Our Holiday Special is Here!"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Suggestions
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">Preview Text</Label>
                <p className="text-sm text-[var(--text-secondary)] mb-2">Shows after the subject line</p>
                <Textarea
                  value={formData.preview_text}
                  onChange={(e) => updateField('preview_text', e.target.value)}
                  placeholder="e.g., Check out our exclusive holiday deals..."
                  rows={2}
                />
              </div>

              {/* Commerce Integration */}
              <GlassCard>
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-[var(--brand-primary)]" />
                    <Label className="text-base font-semibold">Link to Offering (Optional)</Label>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    Connect this campaign to a product, service, class, or event to auto-populate template variables
                  </p>
                  
                  {formData.offering_snapshot ? (
                    <div className="flex items-center justify-between p-3 bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] rounded-md">
                      <div className="flex items-center gap-3">
                        {formData.offering_snapshot.featured_image && (
                          <img 
                            src={formData.offering_snapshot.featured_image} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{formData.offering_snapshot.name}</p>
                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {formData.offering_snapshot.type}
                            </Badge>
                            {formData.offering_snapshot.price && (
                              <span>${formData.offering_snapshot.price}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateField('offering_id', null)
                          updateField('offering_snapshot', null)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <OfferingSelector
                      onSelect={(offering, templateVars, recommendedTemplate) => {
                        updateField('offering_id', offering.id)
                        updateField('offering_snapshot', {
                          id: offering.id,
                          type: offering.type,
                          name: offering.name,
                          slug: offering.slug,
                          price: offering.price,
                          featured_image: offering.featured_image,
                          template_variables: templateVars
                        })
                        if (!formData.name) updateField('name', `${offering.name} Campaign`)
                        if (!formData.subject) {
                          const subjectSuggestions = {
                            product: `Introducing ${offering.name}`,
                            service: `Book Your ${offering.name} Today`,
                            class: `Join Our ${offering.name}`,
                            event: `You're Invited: ${offering.name}`
                          }
                          updateField('subject', subjectSuggestions[offering.type] || `Check out ${offering.name}`)
                        }
                        toast.success('Offering linked! Template variables will be auto-filled.')
                      }}
                    />
                  )}
                </GlassCardContent>
              </GlassCard>

              {/* Sender Info — auto-populated from domain config */}
              <GlassCard className={emailCapability?.enabled ? 'border-emerald-500/20' : ''}>
                <GlassCardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[var(--brand-primary)]" />
                      <Label className="text-base font-semibold">Sender Info</Label>
                    </div>
                    {emailCapability?.enabled && domainName && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                        <Globe className="h-3 w-3" />
                        {domainName}
                      </Badge>
                    )}
                  </div>
                  {emailCapability?.enabled && !capabilityLoading && (
                    <p className="text-xs text-emerald-600 mb-3">
                      Auto-filled from your verified sending domain
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)]">From Name</Label>
                      <Input
                        value={formData.from_name}
                        onChange={(e) => updateField('from_name', e.target.value)}
                        placeholder="Your Company"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--text-secondary)]">From Email</Label>
                      <Input
                        type="email"
                        value={formData.from_email}
                        onChange={(e) => updateField('from_email', e.target.value)}
                        placeholder="hello@yourdomain.com"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-[var(--text-secondary)]">Reply-To Email</Label>
                    <Input
                      type="email"
                      value={formData.reply_to}
                      onChange={(e) => updateField('reply_to', e.target.value)}
                      placeholder="support@yourdomain.com"
                    />
                  </div>
                </GlassCardContent>
              </GlassCard>
            </div>
          )}

          {/* Step 2: Audience */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Audience mode selector */}
              <div>
                <Label className="text-base font-semibold">Who should receive this?</Label>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Choose how to select your audience</p>
                <div className="grid grid-cols-2 gap-3">
                  {AUDIENCE_MODES.map((mode) => {
                    const Icon = mode.icon
                    const isActive = audienceMode === mode.id
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setAudienceMode(mode.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          isActive
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]'
                            : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--text-tertiary)]'
                        }`}
                      >
                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'}`} />
                        <div>
                          <p className={`text-sm font-medium ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>{mode.label}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{mode.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Lists mode */}
              {audienceMode === 'lists' && (
                <div>
                  {lists.length === 0 ? (
                    <GlassCard>
                      <GlassCardContent className="py-8 text-center">
                        <Tag className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
                        <p className="text-[var(--text-secondary)]">No subscriber lists yet</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-[var(--brand-primary)]"
                          onClick={onBack}
                        >
                          Go to Lists to create one
                        </Button>
                      </GlassCardContent>
                    </GlassCard>
                  ) : (
                    <div className="space-y-2">
                      {lists.map((list) => (
                        <GlassCard
                          key={list.id}
                          className={`cursor-pointer transition-all ${
                            formData.list_ids.includes(list.id) 
                              ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]' 
                              : 'hover:border-[var(--text-tertiary)]'
                          }`}
                          onClick={() => toggleList(list.id)}
                        >
                          <GlassCardContent className="p-4 flex items-center gap-4">
                            <Checkbox 
                              checked={formData.list_ids.includes(list.id)}
                              className="pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[var(--text-primary)]">{list.name}</p>
                              {list.description && (
                                <p className="text-sm text-[var(--text-secondary)] truncate">{list.description}</p>
                              )}
                            </div>
                            <Badge className="bg-[var(--glass-bg-inset)] text-[var(--text-secondary)] border-[var(--glass-border)]">
                              {(list.subscriber_count || 0).toLocaleString()} subscribers
                            </Badge>
                          </GlassCardContent>
                        </GlassCard>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contacts mode — search CRM contacts */}
              {audienceMode === 'contacts' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                    <Input
                      value={contactSearch}
                      onChange={(e) => handleContactSearch(e.target.value)}
                      placeholder="Search contacts by name or email..."
                      className="pl-10"
                    />
                    {searchingContacts && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-tertiary)]" />
                    )}
                  </div>

                  {contactResults.length > 0 && (
                    <div className="border border-[var(--glass-border)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {contactResults.map((c) => {
                        const alreadyAdded = formData.selected_contacts.some(sc => sc.email === c.email)
                        return (
                          <button
                            key={c.id}
                            onClick={() => !alreadyAdded && addContact(c)}
                            disabled={alreadyAdded}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-[var(--glass-border)] last:border-0 transition-colors ${
                              alreadyAdded ? 'opacity-50' : 'hover:bg-[var(--glass-bg-hover)]'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center text-xs font-medium text-[var(--brand-primary)]">
                              {(c.name || c.email)[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name || 'No name'}</p>
                              <p className="text-xs text-[var(--text-secondary)] truncate">{c.email}</p>
                            </div>
                            {alreadyAdded ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Plus className="h-4 w-4 text-[var(--text-tertiary)]" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {formData.selected_contacts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                        {formData.selected_contacts.length} contact{formData.selected_contacts.length !== 1 ? 's' : ''} selected
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.selected_contacts.map((c) => (
                          <Badge
                            key={c.email}
                            className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20 gap-1 pr-1"
                          >
                            {c.name || c.email}
                            <button onClick={() => removeContact(c.email)} className="ml-1 hover:bg-[var(--brand-primary)]/20 rounded p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual email addresses */}
              {audienceMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManualEmail())}
                      placeholder="Enter an email address..."
                      type="email"
                      className="flex-1"
                    />
                    <Button onClick={addManualEmail} size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>

                  {formData.manual_emails.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                        {formData.manual_emails.length} recipient{formData.manual_emails.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.manual_emails.map((email) => (
                          <Badge
                            key={email}
                            className="bg-[var(--glass-bg-inset)] text-[var(--text-primary)] border-[var(--glass-border)] gap-1 pr-1"
                          >
                            {email}
                            <button onClick={() => removeManualEmail(email)} className="ml-1 hover:bg-red-500/20 rounded p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* All subscribers */}
              {audienceMode === 'all' && (
                <GlassCard className="border-amber-500/20">
                  <GlassCardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Users className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">Send to all active subscribers</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          This will send to every subscriber who is currently active and not unsubscribed.
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-[var(--text-primary)]">
                        {subscribers.length.toLocaleString()}
                      </span>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              )}

              {/* Recipient count summary */}
              {totalRecipients > 0 && audienceMode !== 'all' && (
                <GlassCard>
                  <GlassCardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--text-secondary)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Total Recipients</span>
                      </div>
                      <span className="text-xl font-bold text-[var(--brand-primary)]">{totalRecipients.toLocaleString()}</span>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              )}
            </div>
          )}

          {/* Step 3: Content */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Select Template</Label>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Choose an email template for your campaign</p>

                {(() => {
                  // Filter out transactional/system templates — those can't be sent as campaigns
                  const campaignTemplates = templates.filter(t => t.category !== 'transactional' && !t.is_system)

                  if (campaignTemplates.length === 0) {
                    return (
                      <GlassCard>
                        <GlassCardContent className="py-8 text-center">
                          <FileText className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
                          <p className="text-[var(--text-secondary)]">No campaign templates available</p>
                          <Button variant="link" size="sm" className="text-[var(--brand-primary)]" onClick={onEditTemplate}>Create a template first</Button>
                        </GlassCardContent>
                      </GlassCard>
                    )
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {campaignTemplates.map((template) => (
                        <EmailTemplateCard
                          key={template.id}
                          template={template}
                          selected={formData.template_id === template.id}
                          onClick={() => updateField('template_id', template.id)}
                        />
                      ))}
                    </div>
                  )
                })()}
              </div>

              {selectedTemplate && (
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => onEditTemplate(selectedTemplate)}>
                    <FileText className="h-4 w-4" />
                    Edit Template
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <GlassCard>
                <GlassCardContent className="p-5">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-4">Campaign Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Campaign Name</p>
                      <p className="font-medium text-[var(--text-primary)]">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Recipients</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {audienceMode === 'all'
                          ? `All subscribers (${subscribers.length.toLocaleString()})`
                          : `${totalRecipients.toLocaleString()} ${audienceMode === 'manual' ? 'email' : audienceMode === 'contacts' ? 'contact' : 'subscriber'}${totalRecipients !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Subject</p>
                      <p className="font-medium text-[var(--text-primary)]">{formData.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">From</p>
                      <p className="font-medium text-[var(--text-primary)]">{formData.from_name} &lt;{formData.from_email}&gt;</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Template</p>
                      <p className="font-medium text-[var(--text-primary)]">{selectedTemplate?.name || (formData.signal_html ? 'Created with Signal' : 'None selected')}</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard>
                <GlassCardContent className="p-5 space-y-4">
                  <h3 className="font-semibold text-[var(--text-primary)]">Schedule</h3>
                  <div className="flex gap-4">
                    <button
                      className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-lg border transition-all ${
                        formData.schedule_type === 'now'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]'
                          : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                      }`}
                      onClick={() => updateField('schedule_type', 'now')}
                    >
                      <Send className="h-5 w-5" />
                      <span className="text-sm font-medium">Send Now</span>
                    </button>
                    <button
                      className={`flex-1 py-4 flex flex-col items-center gap-2 rounded-lg border transition-all ${
                        formData.schedule_type === 'later'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]'
                          : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                      }`}
                      onClick={() => updateField('schedule_type', 'later')}
                    >
                      <Clock className="h-5 w-5" />
                      <span className="text-sm font-medium">Schedule</span>
                    </button>
                  </div>

                  {formData.schedule_type === 'later' && (
                    <div>
                      <Label>Send Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={formData.scheduled_for}
                        onChange={(e) => updateField('scheduled_for', e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>

              {!emailCapability?.enabled && (
                <GlassCard className="border-amber-500/20">
                  <GlassCardContent className="py-4 px-5 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-500">Sending Domain Required</p>
                      <p className="text-sm text-amber-600/80">Configure a verified sending domain or connect Gmail in Domain Setup before sending.</p>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t p-4 bg-[var(--glass-bg)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={() => handleSave(formData.schedule_type === 'now')} 
              disabled={isSaving || !emailCapability?.enabled}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : formData.schedule_type === 'now' ? (
                <Send className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              {formData.schedule_type === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
