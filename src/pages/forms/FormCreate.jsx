// src/pages/forms/FormCreate.jsx
// Create new form wizard - will eventually include AI assistance via Signal

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import portalApi from '@/lib/sonor-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  FileText,
  Mail,
  Phone,
  User,
  MessageSquare,
  Building,
  Calendar,
  Star,
  Sparkles,
  Zap,
  Globe,
  Info,
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { useSignalAccess } from '@/lib/signal-access'
import { toast } from 'sonner'

const FORM_TEMPLATES = [
  {
    id: 'contact',
    name: 'Contact Form',
    description: 'Simple contact form with name, email, and message',
    icon: Mail,
    fields: ['name', 'email', 'message'],
  },
  {
    id: 'lead',
    name: 'Lead Capture',
    description: 'Capture leads with company info',
    icon: User,
    fields: ['name', 'email', 'phone', 'company'],
  },
  {
    id: 'quote',
    name: 'Quote Request',
    description: 'Request quotes with project details',
    icon: FileText,
    fields: ['name', 'email', 'phone', 'company', 'project_details', 'budget'],
  },
  {
    id: 'booking',
    name: 'Booking Request',
    description: 'Schedule appointments or consultations',
    icon: Calendar,
    fields: ['name', 'email', 'phone', 'preferred_date', 'preferred_time', 'notes'],
  },
  {
    id: 'blank',
    name: 'Blank Form',
    description: 'Start from scratch',
    icon: Zap,
    fields: [],
  },
]

export default function FormCreate() {
  const navigate = useNavigate()
  const { currentProject, currentOrg, isSuperAdmin, accessLevel } = useAuthStore()
  const { hasSignal } = useSignalAccess()
  
  const [step, setStep] = useState('template')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [isOrgWide, setIsOrgWide] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Can the user create org-wide templates?
  const canCreateOrgTemplate = isSuperAdmin || 
    accessLevel === 'organization' || 
    currentOrg?.org_type === 'agency'
  
  async function handleCreate() {
    if (!currentProject?.id || !formName.trim()) return
    
    setIsSaving(true)
    try {
      const slug = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      
      // Create the project-level form first
      const { data, error } = await supabase
        .from('managed_forms')
        .insert({
          project_id: currentProject.id,
          name: formName.trim(),
          slug,
          description: formDescription.trim() || null,
          form_type: selectedTemplate?.id || 'custom',
          is_active: false,
          version: 1,
        })
        .select()
        .single()
      
      if (error) throw error
      
      // If org-wide, also create the org template
      if (isOrgWide && currentOrg?.id) {
        try {
          await portalApi.post('/forms/templates', {
            orgId: currentOrg.id,
            slug,
            name: formName.trim(),
            description: formDescription.trim() || null,
            formType: selectedTemplate?.id || 'custom',
            isActive: true,
          })
          toast.success('Org-wide template created — it will auto-clone to new projects')
        } catch (tplErr) {
          console.error('Failed to create org template:', tplErr)
          toast.error('Form created but org template failed — you can promote it later')
        }
      }
      
      // Navigate to edit the new form
      navigate(`/forms/${data.id}/edit`)
    } catch (err) {
      console.error('Failed to create form:', err)
      toast.error('Failed to create form')
    } finally {
      setIsSaving(false)
    }
  }
  
  function handleTemplateSelect(template) {
    setSelectedTemplate(template)
    if (template.id !== 'blank') {
      setFormName(template.name)
      setFormSlug(template.id)
    }
    setStep('details')
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/forms')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Create Form</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {step === 'template' ? 'Choose a template to get started' : 'Configure your form'}
          </p>
        </div>
      </div>
      
      {/* Template Selection */}
      {step === 'template' && (
        <div className="space-y-6">
          {/* Signal AI suggestion */}
          {hasSignal && (
            <Card className="bg-gradient-to-r from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/5 border-[var(--glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                  >
                    <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Create with Signal AI
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Describe what you need and let Signal build the perfect form
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Try Signal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORM_TEMPLATES.map((template) => {
              const Icon = template.icon
              
              return (
                <Card 
                  key={template.id}
                  className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 cursor-pointer transition-all group"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-6">
                    <div 
                      className="p-3 rounded-xl w-fit mb-4"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                    >
                      <Icon className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <h3 className="font-medium text-[var(--text-primary)] mb-1">{template.name}</h3>
                    <p className="text-sm text-[var(--text-tertiary)]">{template.description}</p>
                    {template.fields.length > 0 && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {template.fields.length} fields
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Form Details */}
      {step === 'details' && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
            <CardDescription>
              Configure the basic settings for your form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Contact Form"
              />
            </div>
            
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-tertiary)]">/forms/</span>
                <Input
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="contact-form"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What is this form for?"
                rows={3}
              />
            </div>
            
            {/* Org-wide template toggle */}
            {canCreateOrgTemplate && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: isOrgWide ? 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' : 'var(--glass-bg)' }}
                  >
                    <Globe className="h-4 w-4" style={{ color: isOrgWide ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="org-wide-toggle" className="text-sm font-medium cursor-pointer">
                        Make available org-wide
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Creates an org template that will automatically be added to any new projects created under <strong>{currentOrg?.name || 'this organization'}</strong>.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      Auto-clones this form to all current & future projects in {currentOrg?.name || 'the org'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="org-wide-toggle"
                  checked={isOrgWide}
                  onCheckedChange={setIsOrgWide}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
              <Button variant="outline" onClick={() => setStep('template')}>
                Back to Templates
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formName.trim() || isSaving}
                style={{ backgroundColor: 'var(--brand-primary)' }}
                className="text-white"
              >
                {isSaving ? 'Creating...' : 'Create & Edit Form'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
