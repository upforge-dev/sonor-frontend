import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  Calendar,
  Sparkles,
  Package
} from 'lucide-react'
import { toast } from 'sonner'
import { useEmailPlatformStore } from '@/lib/email-platform-store'
import OfferingSelector from './OfferingSelector'

const STEPS = [
  { id: 'details', label: 'Campaign Details', icon: FileText },
  { id: 'audience', label: 'Select Audience', icon: Users },
  { id: 'content', label: 'Email Content', icon: FileText },
  { id: 'review', label: 'Review & Send', icon: Send }
]

export default function CampaignComposer({ campaign, onSave, onBack, onEditTemplate }) {
  const { templates, lists, fetchTemplates, fetchLists, settings } = useEmailPlatformStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Signal Compose prefill — when user creates a campaign from SignalCompose,
  // the campaign object has a _prefill key with { html, subject, previewText }
  const prefill = campaign?._prefill || null

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    subject: prefill?.subject || campaign?.subject || '',
    preview_text: prefill?.previewText || campaign?.preview_text || '',
    from_name: campaign?.from_name || settings?.default_from_name || '',
    from_email: campaign?.from_email || settings?.default_from_email || '',
    reply_to: campaign?.reply_to || settings?.default_reply_to || '',
    template_id: campaign?.template_id || '',
    list_ids: campaign?.list_ids || [],
    schedule_type: 'now', // 'now' or 'later'
    scheduled_for: '',
    // Commerce integration
    offering_id: campaign?.offering_id || null,
    offering_snapshot: campaign?.offering_snapshot || null,
    // Signal-generated HTML (bypasses template selection)
    signal_html: prefill?.html || null,
  })

  useEffect(() => {
    fetchTemplates()
    fetchLists()
  }, [fetchTemplates, fetchLists])

  // If pre-filled from Signal, skip to audience selection (step 2)
  useEffect(() => {
    if (prefill?.html && currentStep === 0) {
      setCurrentStep(1) // Jump to audience selection — content already ready
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings && !formData.from_name) {
      setFormData(prev => ({
        ...prev,
        from_name: settings.default_from_name || prev.from_name,
        from_email: settings.default_from_email || prev.from_email,
        reply_to: settings.default_reply_to || prev.reply_to
      }))
    }
  }, [settings])

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

  const selectedTemplate = templates.find(t => t.id === formData.template_id)
  const totalRecipients = lists
    .filter(l => formData.list_ids.includes(l.id))
    .reduce((sum, l) => sum + (l.subscriber_count || 0), 0)

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Details
        return formData.name && formData.subject && formData.from_name && formData.from_email
      case 1: // Audience
        return formData.list_ids.length > 0
      case 2: // Content
        return formData.template_id || formData.signal_html
      case 3: // Review
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSave = async (sendNow = false) => {
    setIsSaving(true)
    try {
      await onSave({
        ...formData,
        status: sendNow ? 'sending' : (formData.schedule_type === 'later' ? 'scheduled' : 'draft')
      })
      toast.success(sendNow ? 'Campaign sent!' : 'Campaign saved!')
    } catch (error) {
      toast.error(error.message || 'Failed to save campaign')
    } finally {
      setIsSaving(false)
    }
  }

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
            <p className="text-sm text-muted-foreground">
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
      <div className="border-b bg-muted/30 px-6 py-4">
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
                      ? 'bg-primary text-primary-foreground' 
                      : isComplete 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-muted text-muted-foreground'
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
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Campaign Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Campaign Name</Label>
                <p className="text-sm text-muted-foreground mb-2">Internal name for this campaign</p>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., December Newsletter"
                />
              </div>

              <div>
                <Label className="text-base font-semibold">Email Subject</Label>
                <p className="text-sm text-muted-foreground mb-2">What subscribers see in their inbox</p>
                <Input
                  value={formData.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="e.g., 🎄 Our Holiday Special is Here!"
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
                <p className="text-sm text-muted-foreground mb-2">Shows after the subject line</p>
                <Textarea
                  value={formData.preview_text}
                  onChange={(e) => updateField('preview_text', e.target.value)}
                  placeholder="e.g., Check out our exclusive holiday deals..."
                  rows={2}
                />
              </div>

              {/* Commerce Integration - Link to Product/Service/Event */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Link to Offering (Optional)</Label>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect this campaign to a product, service, class, or event to auto-populate template variables
                </p>
                
                {formData.offering_snapshot ? (
                  <div className="flex items-center justify-between p-3 bg-background border rounded-md">
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                      
                      // If campaign name is empty, suggest one
                      if (!formData.name) {
                        updateField('name', `${offering.name} Campaign`)
                      }
                      
                      // If subject is empty, suggest one based on type
                      if (!formData.subject) {
                        const subjectSuggestions = {
                          product: `✨ Introducing ${offering.name}`,
                          service: `🎯 Book Your ${offering.name} Today`,
                          class: `📚 Join Our ${offering.name}`,
                          event: `🎉 You're Invited: ${offering.name}`
                        }
                        updateField('subject', subjectSuggestions[offering.type] || `Check out ${offering.name}`)
                      }
                      
                      toast.success('Offering linked! Template variables will be auto-filled.')
                    }}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={formData.from_name}
                    onChange={(e) => updateField('from_name', e.target.value)}
                    placeholder="Your Company"
                  />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={formData.from_email}
                    onChange={(e) => updateField('from_email', e.target.value)}
                    placeholder="hello@yourdomain.com"
                  />
                </div>
              </div>

              <div>
                <Label>Reply-To Email</Label>
                <Input
                  type="email"
                  value={formData.reply_to}
                  onChange={(e) => updateField('reply_to', e.target.value)}
                  placeholder="support@yourdomain.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Select Lists</Label>
                <p className="text-sm text-muted-foreground mb-4">Choose which subscriber lists to send to</p>
                
                {lists.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No lists available</p>
                      <Button variant="link" size="sm">Create a list first</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {lists.map((list) => (
                      <Card 
                        key={list.id}
                        className={`cursor-pointer transition-all ${
                          formData.list_ids.includes(list.id) 
                            ? 'border-primary ring-1 ring-primary' 
                            : 'hover:border-muted-foreground'
                        }`}
                        onClick={() => toggleList(list.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <Checkbox 
                            checked={formData.list_ids.includes(list.id)}
                            className="pointer-events-none"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{list.name}</p>
                            {list.description && (
                              <p className="text-sm text-muted-foreground">{list.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {(list.subscriber_count || 0).toLocaleString()} subscribers
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {formData.list_ids.length > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Total Recipients</span>
                      </div>
                      <span className="text-2xl font-bold">{totalRecipients.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Content */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold">Select Template</Label>
                <p className="text-sm text-muted-foreground mb-4">Choose an email template for your campaign</p>
                
                {templates.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No templates available</p>
                      <Button variant="link" size="sm" onClick={onEditTemplate}>Create a template first</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          formData.template_id === template.id 
                            ? 'border-primary ring-1 ring-primary' 
                            : 'hover:border-muted-foreground'
                        }`}
                        onClick={() => updateField('template_id', template.id)}
                      >
                        <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <CardContent className="p-4">
                          <p className="font-medium truncate">{template.name}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {template.category}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Campaign Name</p>
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recipients</p>
                      <p className="font-medium">{totalRecipients.toLocaleString()} subscribers</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Subject</p>
                      <p className="font-medium">{formData.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">From</p>
                      <p className="font-medium">{formData.from_name} &lt;{formData.from_email}&gt;</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Template</p>
                      <p className="font-medium">{selectedTemplate?.name || (formData.signal_html ? '✨ Created with Signal' : 'None selected')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      variant={formData.schedule_type === 'now' ? 'default' : 'outline'}
                      className="flex-1 h-auto py-4 flex-col gap-2"
                      onClick={() => updateField('schedule_type', 'now')}
                    >
                      <Send className="h-5 w-5" />
                      <span>Send Now</span>
                    </Button>
                    <Button
                      variant={formData.schedule_type === 'later' ? 'default' : 'outline'}
                      className="flex-1 h-auto py-4 flex-col gap-2"
                      onClick={() => updateField('schedule_type', 'later')}
                    >
                      <Clock className="h-5 w-5" />
                      <span>Schedule</span>
                    </Button>
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
                </CardContent>
              </Card>

              {!settings?.resend_api_key && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">API Key Required</p>
                      <p className="text-sm text-amber-700">Configure your Resend API key in Settings before sending.</p>
                    </div>
                  </CardContent>
                </Card>
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
              disabled={isSaving || !settings?.resend_api_key}
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
