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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Zap,
  Mail,
  Clock,
  Tag,
  Users,
  MessageSquare,
  ArrowRight,
  Play,
  Pause,
  Loader2,
  ShoppingBag,
  Ticket,
  Receipt,
  FileSignature
} from 'lucide-react'
import { toast } from 'sonner'
import { useEmailPlatformStore } from '@/lib/email-platform-store' // Keep for complex email state
import { formsApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { useCommerceSettings, commerceKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'

// Trigger type definitions
const triggerTypes = [
  {
    id: 'subscriber_added',
    label: 'When someone subscribes',
    description: 'Trigger when a new subscriber joins a list',
    icon: Users,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'tag_added',
    label: 'When a tag is added',
    description: 'Trigger when a specific tag is added to a subscriber',
    icon: Tag,
    color: 'bg-blue-100 text-blue-600',
    hasConfig: true,
    configFields: [{ name: 'tagName', label: 'Tag Name', type: 'text' }]
  },
  {
    id: 'tag_removed',
    label: 'When a tag is removed',
    description: 'Trigger when a specific tag is removed from a subscriber',
    icon: Tag,
    color: 'bg-amber-100 text-amber-600',
    hasConfig: true,
    configFields: [{ name: 'tagName', label: 'Tag Name', type: 'text' }]
  },
  {
    id: 'date_field',
    label: 'Date-based trigger',
    description: 'Trigger based on a date field (birthday, anniversary, etc.)',
    icon: Clock,
    color: 'bg-purple-100 text-purple-600',
    hasConfig: true,
    configFields: [
      { name: 'dateField', label: 'Date Field', type: 'select', options: ['birthday', 'anniversary', 'signup_date', 'custom'] },
      { name: 'daysBefore', label: 'Days Before', type: 'number' }
    ]
  },
  {
    id: 'form_submitted',
    label: 'When form is submitted',
    description: 'Trigger when a specific form is submitted',
    icon: MessageSquare,
    color: 'bg-cyan-100 text-cyan-600',
    hasConfig: true,
    configFields: [
      { name: 'formId', label: 'Form', type: 'form' }
    ]
  },
  {
    id: 'campaign_opened',
    label: 'When email is opened',
    description: 'Trigger when a specific campaign email is opened',
    icon: Mail,
    color: 'bg-indigo-100 text-indigo-600',
    hasConfig: true,
    configFields: [{ name: 'campaignId', label: 'Campaign ID', type: 'text' }]
  },
  {
    id: 'campaign_clicked',
    label: 'When link is clicked',
    description: 'Trigger when a link in a campaign is clicked',
    icon: Mail,
    color: 'bg-rose-100 text-rose-600',
    hasConfig: true,
    configFields: [{ name: 'campaignId', label: 'Campaign ID', type: 'text' }, { name: 'linkUrl', label: 'Link URL (optional)', type: 'text' }]
  },
  {
    id: 'manual',
    label: 'Manual trigger',
    description: 'Manually add subscribers to this automation',
    icon: Zap,
    color: 'bg-gray-100 text-gray-600'
  },
  // Commerce triggers - filtered by commerce_settings.enabled_types
  {
    id: 'product_purchased',
    label: 'When product is purchased',
    description: 'Trigger when a product sale is completed',
    icon: ShoppingBag,
    color: 'bg-emerald-100 text-emerald-600',
    commerceType: 'product',
    hasConfig: true,
    configFields: [
      { name: 'offeringId', label: 'Product (optional)', type: 'offering', offeringType: 'product' }
    ]
  },
  {
    id: 'event_registered',
    label: 'When someone registers for event',
    description: 'Trigger when a ticket is purchased for an event',
    icon: Ticket,
    color: 'bg-violet-100 text-violet-600',
    commerceType: 'event',
    hasConfig: true,
    configFields: [
      { name: 'offeringId', label: 'Event (optional)', type: 'offering', offeringType: 'event' }
    ]
  },
  {
    id: 'invoice_received',
    label: 'When invoice is created',
    description: 'Trigger when a new invoice is sent to a client',
    icon: Receipt,
    color: 'bg-amber-100 text-amber-600',
    commerceType: 'service'
  },
  {
    id: 'invoice_paid',
    label: 'When invoice is paid',
    description: 'Trigger when a client pays an invoice',
    icon: Receipt,
    color: 'bg-teal-100 text-teal-600',
    commerceType: 'service'
  },
  {
    id: 'contract_received',
    label: 'When contract is sent',
    description: 'Trigger when a new contract is sent for signature',
    icon: FileSignature,
    color: 'bg-blue-100 text-blue-600',
    commerceType: 'service'
  },
  {
    id: 'contract_signed',
    label: 'When contract is signed',
    description: 'Trigger when a client signs a contract',
    icon: FileSignature,
    color: 'bg-sky-100 text-sky-600',
    commerceType: 'service'
  }
]

// Step type definitions
const stepTypes = [
  {
    id: 'send_email',
    label: 'Send Email',
    description: 'Send an email to the subscriber',
    icon: Mail,
    color: 'bg-blue-100 text-blue-600',
    configFields: [
      { name: 'template_id', label: 'Email Template', type: 'template' },
      { name: 'subject', label: 'Subject Line', type: 'text' },
      { name: 'from_name', label: 'From Name (optional)', type: 'text' }
    ]
  },
  {
    id: 'wait',
    label: 'Wait',
    description: 'Wait for a specific time period',
    icon: Clock,
    color: 'bg-amber-100 text-amber-600',
    configFields: [
      { name: 'duration', label: 'Duration', type: 'number' },
      { name: 'unit', label: 'Unit', type: 'select', options: ['minutes', 'hours', 'days', 'weeks'] }
    ]
  },
  {
    id: 'add_tag',
    label: 'Add Tag',
    description: 'Add a tag to the subscriber',
    icon: Tag,
    color: 'bg-green-100 text-green-600',
    configFields: [
      { name: 'tagName', label: 'Tag Name', type: 'text' }
    ]
  },
  {
    id: 'remove_tag',
    label: 'Remove Tag',
    description: 'Remove a tag from the subscriber',
    icon: Tag,
    color: 'bg-red-100 text-red-600',
    configFields: [
      { name: 'tagName', label: 'Tag Name', type: 'text' }
    ]
  },
  {
    id: 'add_to_list',
    label: 'Add to List',
    description: 'Add subscriber to another list',
    icon: Users,
    color: 'bg-purple-100 text-purple-600',
    configFields: [
      { name: 'list_id', label: 'List', type: 'list' }
    ]
  },
  {
    id: 'remove_from_list',
    label: 'Remove from List',
    description: 'Remove subscriber from a list',
    icon: Users,
    color: 'bg-orange-100 text-orange-600',
    configFields: [
      { name: 'list_id', label: 'List', type: 'list' }
    ]
  }
]

export default function AutomationBuilder({ automation, onSave, onBack }) {
  const { templates, lists, fetchTemplates, fetchLists } = useEmailPlatformStore()
  const { currentProject } = useAuthStore()
  
  const [name, setName] = useState(automation?.name || '')
  const [description, setDescription] = useState(automation?.description || '')
  const [triggerType, setTriggerType] = useState(automation?.trigger_type || '')
  const [triggerConfig, setTriggerConfig] = useState(automation?.trigger_config || {})
  const [selectedLists, setSelectedLists] = useState(automation?.list_ids || [])
  const [steps, setSteps] = useState(automation?.steps || [])
  const [isSaving, setIsSaving] = useState(false)
  const [showAddStep, setShowAddStep] = useState(false)
  const [editingStep, setEditingStep] = useState(null)
  const [forms, setForms] = useState([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [commerceSettings, setCommerceSettings] = useState(null)

  // Fetch commerce settings to filter available triggers
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentProject?.id) return
      try {
        const settings = await getCommerceSettings(currentProject.id)
        setCommerceSettings(settings)
      } catch (error) {
        console.error('Failed to fetch commerce settings:', error)
      }
    }
    fetchSettings()
  }, [currentProject?.id])

  // Filter trigger types based on commerce settings
  const availableTriggerTypes = triggerTypes.filter(trigger => {
    // If trigger has a commerceType requirement, check if it's enabled
    if (trigger.commerceType) {
      const enabledTypes = commerceSettings?.enabled_types || []
      // enabled_types stores singular values: 'product', 'service', 'event'
      return enabledTypes.includes(trigger.commerceType)
    }
    return true
  })

  // Fetch forms for the project
  useEffect(() => {
    const fetchForms = async () => {
      if (!currentProject?.id) return
      setFormsLoading(true)
      try {
        const res = await formsApi.list({ projectId: currentProject.id })
        setForms(res.data?.forms || res.data || [])
      } catch (error) {
        console.error('Failed to fetch forms:', error)
      } finally {
        setFormsLoading(false)
      }
    }
    fetchForms()
  }, [currentProject?.id])

  useEffect(() => {
    fetchTemplates()
    fetchLists()
  }, [fetchTemplates, fetchLists])

  // Auto-add Send Email step when form_submitted trigger is selected
  useEffect(() => {
    if (triggerType === 'form_submitted' && steps.length === 0) {
      const confirmationStep = {
        id: `step-${Date.now()}`,
        step_type: 'send_email',
        config: {
          subject: 'Thank you for your submission'
        }
      }
      setSteps([confirmationStep])
      setEditingStep(0)
    }
  }, [triggerType])

  const selectedTrigger = triggerTypes.find(t => t.id === triggerType)

  const handleAddStep = (stepType) => {
    const stepDef = stepTypes.find(s => s.id === stepType)
    const newStep = {
      id: `step-${Date.now()}`,
      step_type: stepType,
      config: {}
    }
    setSteps([...steps, newStep])
    setShowAddStep(false)
    setEditingStep(steps.length) // Edit the new step
  }

  const handleUpdateStep = (index, config) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], config }
    setSteps(updated)
  }

  const handleRemoveStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index))
    if (editingStep === index) setEditingStep(null)
  }

  const moveStep = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= steps.length) return
    const updated = [...steps]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    setSteps(updated)
    if (editingStep === fromIndex) setEditingStep(toIndex)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter an automation name')
      return
    }
    if (!triggerType) {
      toast.error('Please select a trigger')
      return
    }
    if (steps.length === 0) {
      toast.error('Please add at least one step')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        id: automation?.id,
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        list_ids: selectedLists,
        steps: steps.map((step, index) => ({
          step_type: step.step_type,
          config: step.config
        }))
      })
      toast.success('Automation saved successfully')
    } catch (error) {
      toast.error(error.message || 'Failed to save automation')
    } finally {
      setIsSaving(false)
    }
  }

  const renderConfigField = (field, value, onChange) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            placeholder={field.label}
            min={0}
          />
        )
      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(opt => (
                <SelectItem key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'template':
        // Only show transactional templates for automations
        const transactionalTemplates = templates.filter(t => 
          t.category === 'transactional' || 
          (t.is_system && ['form-confirmation', 'thank-you'].includes(t.system_type))
        )
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select transactional email" />
            </SelectTrigger>
            <SelectContent>
              {transactionalTemplates.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No transactional emails yet
                </SelectItem>
              ) : (
                transactionalTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )
      case 'list':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select list" />
            </SelectTrigger>
            <SelectContent>
              {lists.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'form':
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={formsLoading}>
            <SelectTrigger>
              <SelectValue placeholder={formsLoading ? "Loading forms..." : "Select form"} />
            </SelectTrigger>
            <SelectContent>
              {forms.length === 0 && !formsLoading ? (
                <SelectItem value="_none" disabled>
                  No forms found
                </SelectItem>
              ) : (
                forms.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.name}
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor={field.name} className="text-sm font-normal cursor-pointer">
              {field.label}
            </Label>
          </div>
        )
      default:
        return null
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Automation name..."
              className="text-lg font-semibold border-none focus-visible:ring-0 p-0 h-auto"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save Automation'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this automation do?"
              rows={2}
            />
          </div>

          {/* Trigger Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Trigger
              </CardTitle>
              <CardDescription>Choose what starts this automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={triggerType} onValueChange={(value) => {
                setTriggerType(value)
                setTriggerConfig({})
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTriggerTypes.map(trigger => (
                    <SelectItem key={trigger.id} value={trigger.id}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="h-4 w-4" />
                        {trigger.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTrigger && selectedTrigger.hasConfig && (
                <div className="space-y-3 pt-2 border-t">
                  {selectedTrigger.configFields.map(field => (
                    <div key={field.name} className="space-y-1">
                      <Label>{field.label}</Label>
                      {renderConfigField(field, triggerConfig[field.name], (value) => {
                        setTriggerConfig({ ...triggerConfig, [field.name]: value })
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* List Selection for subscriber_added trigger */}
              {triggerType === 'subscriber_added' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label>Apply to Lists</Label>
                  <div className="flex flex-wrap gap-2">
                    {lists.map(list => (
                      <Badge
                        key={list.id}
                        variant={selectedLists.includes(list.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedLists.includes(list.id)) {
                            setSelectedLists(selectedLists.filter(id => id !== list.id))
                          } else {
                            setSelectedLists([...selectedLists, list.id])
                          }
                        }}
                      >
                        {list.name}
                      </Badge>
                    ))}
                    {lists.length === 0 && (
                      <p className="text-sm text-muted-foreground">No lists available</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Automation Steps</h3>
              <p className="text-sm text-muted-foreground">
                {steps.length} step{steps.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Trigger indicator */}
            {triggerType && (
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedTrigger?.color || 'bg-gray-100'}`}>
                  {selectedTrigger && <selectedTrigger.icon className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedTrigger?.label || 'Trigger'}</p>
                </div>
              </div>
            )}

            {/* Steps List */}
            {steps.map((step, index) => {
              const stepDef = stepTypes.find(s => s.id === step.step_type)
              const StepIcon = stepDef?.icon || Zap
              
              return (
                <div key={step.id || index}>
                  {/* Connector Line */}
                  <div className="flex items-center gap-3 ml-4 h-8">
                    <div className="w-0.5 h-full bg-border" />
                  </div>
                  
                  {/* Step Card */}
                  <Card className={editingStep === index ? 'ring-2 ring-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="cursor-grab">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        
                        <div className={`p-2 rounded-lg ${stepDef?.color || 'bg-gray-100'}`}>
                          <StepIcon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Step {index + 1}
                            </Badge>
                            <span className="font-medium">{stepDef?.label || step.step_type}</span>
                          </div>
                          
                          {editingStep === index ? (
                            <div className="space-y-3 mt-3">
                              {stepDef?.configFields?.map(field => (
                                <div key={field.name} className="space-y-1">
                                  <Label className="text-xs">{field.label}</Label>
                                  {renderConfigField(field, step.config?.[field.name], (value) => {
                                    handleUpdateStep(index, { ...step.config, [field.name]: value })
                                  })}
                                </div>
                              ))}
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => setEditingStep(null)}
                              >
                                Done
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {step.step_type === 'send_email' && step.config?.subject && (
                                <span>Subject: {step.config.subject}</span>
                              )}
                              {step.step_type === 'wait' && step.config?.duration && (
                                <span>Wait {step.config.duration} {step.config.unit || 'days'}</span>
                              )}
                              {(step.step_type === 'add_tag' || step.step_type === 'remove_tag') && step.config?.tagName && (
                                <span>Tag: {step.config.tagName}</span>
                              )}
                              {!Object.keys(step.config || {}).length && (
                                <span className="text-amber-600">Click to configure</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveStep(index, index - 1)}
                            disabled={index === 0}
                          >
                            <ArrowRight className="h-4 w-4 rotate-[-90deg]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveStep(index, index + 1)}
                            disabled={index === steps.length - 1}
                          >
                            <ArrowRight className="h-4 w-4 rotate-90" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (editingStep === index) {
                                setEditingStep(null)
                              } else {
                                setEditingStep(index)
                              }
                            }}
                          >
                            <span className="text-xs font-medium">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStep(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}

            {/* Add Step Button */}
            <div className="flex items-center gap-3 ml-4">
              {steps.length > 0 && <div className="w-0.5 h-8 bg-border" />}
            </div>
            
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddStep(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
        </div>
      </div>

      {/* Add Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Step</DialogTitle>
            <DialogDescription>Choose what action to perform next in this automation</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {stepTypes.map(stepType => (
              <Card 
                key={stepType.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleAddStep(stepType.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stepType.color}`}>
                      <stepType.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stepType.label}</p>
                      <p className="text-xs text-muted-foreground">{stepType.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
