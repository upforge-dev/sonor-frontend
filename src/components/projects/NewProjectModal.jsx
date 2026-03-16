/**
 * NewProjectModal - Multi-step wizard for creating new projects
 * 
 * Flow:
 * 1. Organization - Select existing or create new (admin only)
 * 2. Project Details - Title, domain, description
 * 3. Primary Contact - Select existing or create new contact
 * 4. Modules - Enable modules for this project
 */
import { useState, useEffect, useMemo } from 'react'
import {
  Building2, Globe, User, Settings2, ChevronRight, ChevronLeft,
  Check, Plus, Loader2, Search, AlertCircle, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Stores
import { useProjects, useCreateProject, projectsKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import portalApi, { adminApi } from '@/lib/portal-api'

// Module definitions
const AVAILABLE_MODULES = [
  { key: 'seo', label: 'SEO', description: 'Search rankings & optimization', icon: '🔍' },
  { key: 'analytics', label: 'Analytics', description: 'Website traffic & visitor tracking', icon: '📊' },
  { key: 'engage', label: 'Engage', description: 'Popups, nudges & conversion tools', icon: '⚡' },
  { key: 'broadcast', label: 'Broadcast', description: 'Social media management', icon: '📡' },
  { key: 'reputation', label: 'Reputation', description: 'Reviews & reputation management', icon: '⭐' },
  { key: 'commerce', label: 'Commerce', description: 'E-commerce & product management', icon: '🛒' },
  { key: 'blog', label: 'Blog', description: 'Blog content management', icon: '📝' },
  { key: 'prospects', label: 'Prospects', description: 'Lead tracking & contact management', icon: '👥' },
  { key: 'outreach', label: 'Outreach', description: 'Email marketing & campaigns', icon: '📧' },
]

// Step indicator component
function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              index < currentStep 
                ? "bg-primary text-primary-foreground"
                : index === currentStep
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
            )}>
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={cn(
              "ml-2 text-sm font-medium hidden sm:inline",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}

export function NewProjectModal({
  open,
  onOpenChange,
  isAdmin = false,
  preselectedOrgId = null,
  onProjectCreated,
}) {
  const createProjectMutation = useCreateProject()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Data
  const [organizations, setOrganizations] = useState([])
  const [contacts, setContacts] = useState([])
  
  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Organization
    orgId: preselectedOrgId || '',
    createNewOrg: false,
    newOrgName: '',
    newOrgSlug: '',
    newOrgDomain: '',
    newOrgPlan: 'starter',
    newOrgPrimaryColor: '#4bbf39',
    
    // Step 2: Project Details
    title: '',
    domain: '',
    description: '',
    logo_url: null,
    brand_primary: '',
    brand_primary: '',
    resend_domain: '',
    resend_from_name: '',
    
    // Step 3: Contact
    contactId: '',
    createNewContact: false,
    newContactName: '',
    newContactEmail: '',
    
    // Step 4: Modules
    enabledModules: ['seo', 'analytics'], // Default modules
    commerce_types: [], // Commerce offering types (if commerce enabled)
    payment_processor: null,
  })

  // Steps configuration
  const steps = useMemo(() => {
    const allSteps = [
      { key: 'org', label: 'Organization', icon: Building2 },
      { key: 'details', label: 'Project Details', icon: Globe },
      { key: 'contact', label: 'Contact', icon: User },
      { key: 'modules', label: 'Modules', icon: Settings2 },
    ]
    // Skip org step if not admin or org is preselected
    if (!isAdmin && preselectedOrgId) {
      return allSteps.slice(1)
    }
    return allSteps
  }, [isAdmin, preselectedOrgId])

  // Load organizations for admin
  useEffect(() => {
    if (open && isAdmin) {
      loadOrganizations()
    }
  }, [open, isAdmin])

  // Load contacts when org is selected
  useEffect(() => {
    if (formData.orgId) {
      loadContacts(formData.orgId)
    }
  }, [formData.orgId])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setFormData({
        orgId: preselectedOrgId || '',
        createNewOrg: false,
        newOrgName: '',
        newOrgSlug: '',
        newOrgDomain: '',
        newOrgPlan: 'starter',
        newOrgPrimaryColor: '#4bbf39',
        title: '',
        domain: '',
        description: '',
        logo_url: null,
        brand_primary: '',
        brand_primary: '',
        resend_domain: '',
        resend_from_name: '',
        contactId: '',
        createNewContact: false,
        newContactName: '',
        newContactEmail: '',
        enabledModules: ['seo', 'analytics'],
        commerce_types: [],
        payment_processor: null,
      })
    }
  }, [open, preselectedOrgId])

  const loadOrganizations = async () => {
    setIsLoading(true)
    try {
      const response = await adminApi.listTenants()
      // Filter to only actual organizations (not projects which have isProjectTenant=true)
      const orgs = (response.data?.organizations || response.data?.tenants || [])
        .filter(org => !org.isProjectTenant)
      setOrganizations(orgs)
    } catch (error) {
      console.error('Failed to load organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setIsLoading(false)
    }
  }

  const loadContacts = async (orgId) => {
    try {
      const response = await portalApi.get(`/contacts?org_id=${orgId}`)
      setContacts(response.data || [])
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts([])
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleModule = (moduleKey) => {
    setFormData(prev => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(moduleKey)
        ? prev.enabledModules.filter(m => m !== moduleKey)
        : [...prev.enabledModules, moduleKey]
    }))
  }

  const validateStep = () => {
    switch (steps[currentStep].key) {
      case 'org':
        if (formData.createNewOrg) {
          return formData.newOrgName.trim().length > 0 && formData.newOrgSlug.trim().length > 0
        }
        return !!formData.orgId
      case 'details':
        return formData.title.trim().length > 0
      case 'contact':
        // Contact is optional - can create project without a contact
        if (formData.createNewContact) {
          return formData.newContactName.trim().length > 0 && 
                 formData.newContactEmail.trim().length > 0
        }
        return true // Allow skipping contact selection
      case 'modules':
        return true // No validation needed
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep()) {
      toast.error('Please fill in all required fields')
      return
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleCreate = async () => {
    if (!validateStep()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    try {
      let orgId = formData.orgId
      let contactId = formData.contactId

      // Step 1: Create org if needed
      if (formData.createNewOrg) {
        const orgResponse = await adminApi.createTenant({
          name: formData.newOrgName,
          slug: formData.newOrgSlug,
          domain: formData.newOrgDomain || undefined,
          plan: formData.newOrgPlan,
        })
        orgId = orgResponse.data.id
      }

      // Step 2: Create contact if needed
      if (formData.createNewContact) {
        const contactResponse = await portalApi.post('/contacts', {
          org_id: orgId,
          name: formData.newContactName,
          email: formData.newContactEmail,
          role: 'client',
        })
        contactId = contactResponse.data.id
      }

      // Step 3: Create the project
      const projectData = {
        title: formData.title,
        description: formData.description || undefined,
        organizationId: orgId,
        // Only include contactId if it's a valid UUID
        ...(contactId ? { contactId } : {}),
      }

      const newProject = await createProjectMutation.mutateAsync(projectData)

      // Step 4: Update project with all settings
      const updateData = {
        domain: formData.domain || undefined,
        features: formData.enabledModules,
        logo_url: formData.logo_url || undefined,
        brand_primary: formData.brand_primary || undefined,
        brand_primary: formData.brand_primary || undefined,
        settings: {
          resend_domain: formData.resend_domain || undefined,
          resend_from_name: formData.resend_from_name || undefined,
          commerce_types: formData.commerce_types,
          payment_processor: formData.payment_processor || undefined,
        },
      }
      
      await portalApi.put(`/projects/${newProject.id}`, updateData)

      toast.success(`Project "${formData.title}" created successfully!`)
      onProjectCreated?.(newProject)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create project:', error)
      toast.error(error.response?.data?.message || 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (steps[currentStep].key) {
      case 'org':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Select Organization</h3>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {!formData.createNewOrg ? (
                  <>
                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Select 
                        value={formData.orgId} 
                        onValueChange={(v) => handleChange('orgId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an organization..." />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map(org => (
                            <SelectItem key={org.id} value={org.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={org.logo_url} />
                                  <AvatarFallback className="text-[10px]">
                                    {org.name?.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {org.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        OR
                      </span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleChange('createNewOrg', true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Organization
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Organization Name *</Label>
                      <Input
                        placeholder="e.g., Acme Corporation"
                        value={formData.newOrgName}
                        onChange={(e) => {
                          handleChange('newOrgName', e.target.value)
                          // Auto-generate slug from name
                          const slug = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')
                          handleChange('newOrgSlug', slug)
                        }}
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>URL Slug *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">app.sonor.io/</span>
                        <Input
                          placeholder="acme-corp"
                          value={formData.newOrgSlug}
                          onChange={(e) => handleChange('newOrgSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Used in URLs and as a unique identifier
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Primary Domain</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="acme.com"
                          value={formData.newOrgDomain}
                          onChange={(e) => handleChange('newOrgDomain', e.target.value.replace(/^https?:\/\//, ''))}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Plan</Label>
                        <Select 
                          value={formData.newOrgPlan} 
                          onValueChange={(v) => handleChange('newOrgPlan', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Brand Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.newOrgPrimaryColor}
                            onChange={(e) => handleChange('newOrgPrimaryColor', e.target.value)}
                            className="w-10 h-9 rounded border cursor-pointer"
                          />
                          <Input
                            value={formData.newOrgPrimaryColor}
                            onChange={(e) => handleChange('newOrgPrimaryColor', e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleChange('createNewOrg', false)}
                    >
                      ← Back to existing organizations
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )

      case 'details':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Project Details</h3>
            </div>
            
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                placeholder="e.g., Main Website Redesign"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Website Domain</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="example.com"
                  value={formData.domain}
                  onChange={(e) => handleChange('domain', e.target.value.replace(/^https?:\/\//, ''))}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for SEO, Analytics, Engage, and website screenshots
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the project..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>
            
            <Separator className="my-4" />
            
            {/* Brand Colors */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Brand Colors (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.brand_primary || '#4bbf39'}
                      onChange={(e) => handleChange('brand_primary', e.target.value)}
                      className="w-10 h-9 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.brand_primary}
                      onChange={(e) => handleChange('brand_primary', e.target.value)}
                      placeholder="#4bbf39"
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.brand_primary || '#39bfb0'}
                      onChange={(e) => handleChange('brand_primary', e.target.value)}
                      className="w-10 h-9 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.brand_primary}
                      onChange={(e) => handleChange('brand_primary', e.target.value)}
                      placeholder="#39bfb0"
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            {/* Email Settings */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Email Settings (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Resend Domain</Label>
                  <Input
                    value={formData.resend_domain}
                    onChange={(e) => handleChange('resend_domain', e.target.value)}
                    placeholder="mail.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">From Name</Label>
                  <Input
                    value={formData.resend_from_name}
                    onChange={(e) => handleChange('resend_from_name', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Custom email domain and sender name for proposals and invoices
              </p>
            </div>
          </div>
        )

      case 'contact':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Primary Contact</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Select or create the primary contact for this project. This person will have access to the project in the portal.
            </p>
            
            {!formData.createNewContact ? (
              <>
                {contacts.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Select Contact</Label>
                    <Select 
                      value={formData.contactId} 
                      onValueChange={(v) => handleChange('contactId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={contact.avatar_url} />
                                <AvatarFallback className="text-[10px]">
                                  {contact.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{contact.name}</span>
                              <span className="text-muted-foreground">({contact.email})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No contacts found for this organization. Create a new contact below.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleChange('createNewContact', true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Contact
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="John Smith"
                      value={formData.newContactName}
                      onChange={(e) => handleChange('newContactName', e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={formData.newContactEmail}
                      onChange={(e) => handleChange('newContactEmail', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      They'll receive an invitation to access the portal
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleChange('createNewContact', false)}
                >
                  ← Back to existing contacts
                </Button>
              </>
            )}
          </div>
        )

      case 'modules':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Enable Modules</h3>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Select which modules to enable for this project. You can change these later in project settings.
            </p>
            
            <div className="grid gap-3">
              {AVAILABLE_MODULES.map(module => (
                <div
                  key={module.key}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    formData.enabledModules.includes(module.key)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleModule(module.key)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{module.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{module.label}</p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={formData.enabledModules.includes(module.key)}
                    onCheckedChange={() => toggleModule(module.key)}
                  />
                </div>
              ))}
            </div>
            
            {/* Commerce Options - Only show if commerce is enabled */}
            {formData.enabledModules.includes('commerce') && (
              <>
                <Separator className="my-6" />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Commerce Options</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which types of offerings this project will sell.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.commerce_types?.includes('product')}
                        onChange={(e) => {
                          e.stopPropagation()
                          const types = formData.commerce_types || []
                          handleChange('commerce_types', 
                            types.includes('product') 
                              ? types.filter(t => t !== 'product')
                              : [...types, 'product']
                          )
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-sm font-medium">Products</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.commerce_types?.includes('service')}
                        onChange={(e) => {
                          e.stopPropagation()
                          const types = formData.commerce_types || []
                          handleChange('commerce_types', 
                            types.includes('service') 
                              ? types.filter(t => t !== 'service')
                              : [...types, 'service']
                          )
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-sm font-medium">Services</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.commerce_types?.includes('class')}
                        onChange={(e) => {
                          e.stopPropagation()
                          const types = formData.commerce_types || []
                          handleChange('commerce_types', 
                            types.includes('class') 
                              ? types.filter(t => t !== 'class')
                              : [...types, 'class']
                          )
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-sm font-medium">Classes</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.commerce_types?.includes('event')}
                        onChange={(e) => {
                          e.stopPropagation()
                          const types = formData.commerce_types || []
                          handleChange('commerce_types', 
                            types.includes('event') 
                              ? types.filter(t => t !== 'event')
                              : [...types, 'event']
                          )
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-sm font-medium">Events</span>
                    </label>
                  </div>
                  
                  <div className="mt-4">
                    <Label className="text-sm">Payment Processor</Label>
                    <Select 
                      value={formData.payment_processor || 'none'} 
                      onValueChange={(v) => handleChange('payment_processor', v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select payment processor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Configure later)</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment processor credentials can be configured in project settings
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const isLastStep = currentStep === steps.length - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new project for your client
          </DialogDescription>
        </DialogHeader>
        
        <StepIndicator steps={steps} currentStep={currentStep} />
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-2">
            {renderStepContent()}
          </div>
        </ScrollArea>
        
        <Separator className="my-4" />
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isCreating}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          {isLastStep ? (
            <Button 
              onClick={handleCreate}
              disabled={isCreating || !validateStep()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={!validateStep()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewProjectModal
