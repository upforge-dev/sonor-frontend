/**
 * ProjectSettingsPanel - Project configuration and settings
 * 
 * Includes:
 * - Brand colors (primary & secondary) - replaces org-level colors
 * - Signal enablement toggle
 * - Module features toggle
 * - Domain & tracking settings
 */
import { useState, useEffect, useRef } from 'react'
import { 
  Palette, Zap, Globe, Save, RotateCcw, Info, Settings2,
  Check, CheckCircle, AlertCircle, Loader2, ShoppingBag, CreditCard, ExternalLink, Mail,
  Upload, Image as ImageIcon, X, Users, Bell, Building2, MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Stores
import useAuthStore from '@/lib/auth-store'
import { useSignalAccess } from '@/lib/signal-access'

// API
import { portalApi } from '@/lib/portal-api'

// Commerce setup dialogs
import StripeSetupDialog from '@/components/commerce/StripeSetupDialog'
import SquareSetupDialog from '@/components/commerce/SquareSetupDialog'

// API Keys manager
import APIKeysManager from '@/components/projects/APIKeysManager'

// Shared components
import BusinessProfileCard from '@/components/shared/BusinessProfileCard'

// Constants
import { INDUSTRY_CATEGORIES } from '@/lib/constants/industries'
import { US_STATES } from '@/lib/constants/us-states'
import { PROJECT_STATUS_CONFIG } from '@/lib/hooks'

// Default brand colors (Uptrade)
const DEFAULT_BRAND_PRIMARY = '#4bbf39'
const DEFAULT_BRAND_SECONDARY = '#39bfb0'

// Normalize hex color to 6-digit format (required for <input type="color">)
function normalizeHex(hex) {
  if (!hex) return null
  // Remove # if present
  const cleanHex = hex.replace('#', '')
  // Expand 3-digit to 6-digit: #abc -> #aabbcc
  if (cleanHex.length === 3) {
    return '#' + cleanHex.split('').map(c => c + c).join('')
  }
  // Already 6-digit
  if (cleanHex.length === 6) {
    return '#' + cleanHex.toLowerCase()
  }
  return null
}

// Color picker with hex input
function ColorPicker({ value, onChange, label, description, defaultValue }) {
  // Normalize the value for display (always show 6-digit hex)
  const normalizedValue = normalizeHex(value) || ''
  const [hexInput, setHexInput] = useState(normalizedValue)
  
  useEffect(() => {
    // When value changes externally, update the input with normalized value
    setHexInput(normalizeHex(value) || '')
  }, [value])
  
  const handleHexChange = (e) => {
    const hex = e.target.value
    setHexInput(hex)
    // Validate hex (allow both 3 and 6 digit)
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
      // Always store as 6-digit normalized
      const normalized = normalizeHex(hex)
      if (normalized) {
        onChange(normalized)
      }
    }
  }
  
  const handleColorChange = (e) => {
    const hex = e.target.value
    setHexInput(hex)
    onChange(hex)
  }
  
  // Get the color value for the input (must be 6-digit)
  const colorInputValue = normalizeHex(value) || defaultValue || DEFAULT_BRAND_PRIMARY
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={colorInputValue}
              onChange={handleColorChange}
              className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--glass-border)] overflow-hidden"
            />
          </div>
          <Input
            value={hexInput}
            onChange={handleHexChange}
            placeholder="#4bbf39"
            className="w-24 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  )
}

// Feature toggle component
function FeatureToggle({ feature, enabled, onChange, description, isAdmin }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{feature}</span>
          {!isAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Contact your admin to change this setting</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        disabled={!isAdmin}
      />
    </div>
  )
}

export default function ProjectSettingsPanel({ project, isAdmin, onProjectUpdate }) {
  const { currentOrg, setProject } = useAuthStore()
  const { hasOrgSignal, hasCurrentProjectSignal, isAdmin: isSignalAdmin, orgActuallyHasSignal } = useSignalAccess()
  
  // Form state
  const [formData, setFormData] = useState({
    title: project?.title || '',
    status: project?.status || 'planning',
    logo_url: project?.logo_url || null,
    brand_primary: project?.brand_primary || '',
    brand_secondary: project?.brand_secondary || '',
    domain: project?.domain || '',
    resend_domain: project?.settings?.resend_domain || '',
    resend_from_name: project?.settings?.resend_from_name || '',
    notification_recipients: project?.settings?.notification_recipients || [],
    features: project?.features || [],
    signal_enabled: project?.signal_enabled || false,
    commerce_types: project?.settings?.commerce_types || ['product', 'service'],
    payment_processor: project?.settings?.payment_processor || 'stripe', // 'stripe' or 'square'
    shopify_connected: project?.settings?.shopify_connected || false,
    // Business Profile fields - Universal source of truth for location/industry
    city: project?.city || '',
    state_code: project?.state_code || '',
    country_code: project?.country_code || 'US',
    postal_code: project?.postal_code || '',
    address_line1: project?.address_line1 || '',
    address_line2: project?.address_line2 || '',
    industry: project?.industry || '',
    industry_subcategory: project?.industry_subcategory || '',
    google_trends_category_id: project?.google_trends_category_id || 0,
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [commerceSettings, setCommerceSettings] = useState(null)
  const [loadingCommerce, setLoadingCommerce] = useState(false)
  const [showStripeSetup, setShowStripeSetup] = useState(false)
  const [showSquareSetup, setShowSquareSetup] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const fileInputRef = useRef(null)
  
  // Update form when project changes
  useEffect(() => {
    if (project) {
      console.log('Loading project data:', {
        logo_url: project.logo_url,
        resend_domain: project.settings?.resend_domain,
        resend_from_name: project.settings?.resend_from_name,
        commerce_types: project.settings?.commerce_types,
        city: project.city,
        state_code: project.state_code,
        google_trends_category_id: project.google_trends_category_id,
      })
      setFormData({
        title: project.title || '',
        status: project.status || 'planning',
        logo_url: project.logo_url || null,
        brand_primary: project.brand_primary || '',
        brand_secondary: project.brand_secondary || '',
        domain: project.domain || '',
        resend_domain: project.settings?.resend_domain || '',
        resend_from_name: project.settings?.resend_from_name || '',
        notification_recipients: project.settings?.notification_recipients || [],
        features: Array.isArray(project.features) ? project.features : [],
        signal_enabled: project.signal_enabled || false,
        // Don't use defaults - use saved values or empty arrays
        commerce_types: Array.isArray(project.settings?.commerce_types) ? project.settings.commerce_types : [],
        payment_processor: project.settings?.payment_processor || null,
        shopify_connected: project.settings?.shopify_connected || false,
        // Business Profile fields
        city: project.city || '',
        state_code: project.state_code || '',
        country_code: project.country_code || 'US',
        postal_code: project.postal_code || '',
        address_line1: project.address_line1 || '',
        address_line2: project.address_line2 || '',
        industry: project.industry || '',
        industry_subcategory: project.industry_subcategory || '',
        google_trends_category_id: project.google_trends_category_id || 0,
      })
      setHasChanges(false)
    }
  }, [project])
  
  // Load commerce settings when commerce is enabled
  useEffect(() => {
    const isCommerceEnabled = formData.features.includes('commerce') || formData.features.includes('ecommerce')
    if (project?.id && isCommerceEnabled) {
      loadCommerceSettings()
    }
  }, [project?.id, formData.features])
  
  const loadCommerceSettings = async () => {
    if (!project?.id) return
    setLoadingCommerce(true)
    try {
      const response = await portalApi.get(`/commerce/settings/${project.id}`)
      setCommerceSettings(response.data)
      
      // Sync enabled_types from commerce_settings to form data
      // Commerce settings is the source of truth for enabled types
      if (response.data?.enabled_types && Array.isArray(response.data.enabled_types)) {
        setFormData(prev => ({
          ...prev,
          commerce_types: response.data.enabled_types
        }))
        console.log('Loaded commerce types from commerce_settings:', response.data.enabled_types)
      }
    } catch (error) {
      console.error('Failed to load commerce settings:', error)
    } finally {
      setLoadingCommerce(false)
    }
  }
  
  // Load team members for notification recipients
  useEffect(() => {
    if (project?.id && currentOrg?.id) {
      loadTeamMembers()
    }
  }, [project?.id, currentOrg?.id])
  
  const loadTeamMembers = async () => {
    if (!project?.id || !currentOrg?.id) return
    setLoadingMembers(true)
    try {
      // Get project members (includes user details via join)
      const projectRes = await portalApi.get(`/admin/projects/${project.id}/members`)
      const projectMembers = projectRes.data || []
      
      // Get org members (includes user details via join)
      const orgRes = await portalApi.get(`/admin/organizations/${currentOrg.id}/members`)
      const orgMembers = orgRes.data || []
      
      // Combine and dedupe by user_id
      const memberMap = new Map()
      
      // Process project members
      projectMembers.forEach(m => {
        const userId = m.user_id || m.id
        if (userId && m.email) {
          memberMap.set(userId, {
            id: userId,
            email: m.email,
            full_name: m.full_name || m.name || m.email,
            source: 'project'
          })
        }
      })
      
      // Process org members (add if not already present)
      orgMembers.forEach(m => {
        const userId = m.user_id || m.id
        if (userId && m.email && !memberMap.has(userId)) {
          memberMap.set(userId, {
            id: userId,
            email: m.email,
            full_name: m.full_name || m.name || m.email,
            source: 'org'
          })
        }
      })
      
      setTeamMembers(Array.from(memberMap.values()))
    } catch (error) {
      console.error('Failed to load team members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }
  
  // Toggle notification recipient
  const toggleRecipient = (userId) => {
    setFormData(prev => {
      const recipients = Array.isArray(prev.notification_recipients) ? [...prev.notification_recipients] : []
      const index = recipients.indexOf(userId)
      if (index > -1) {
        recipients.splice(index, 1)
      } else {
        recipients.push(userId)
      }
      return { ...prev, notification_recipients: recipients }
    })
    setHasChanges(true)
  }
  
  // Track changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }
  
  // Toggle feature in array
  const toggleFeature = (feature) => {
    setFormData(prev => {
      const features = Array.isArray(prev.features) ? [...prev.features] : []
      const index = features.indexOf(feature)
      if (index > -1) {
        features.splice(index, 1)
      } else {
        features.push(feature)
      }
      return { ...prev, features }
    })
    setHasChanges(true)
  }
  
  // Toggle commerce type in array
  const toggleCommerceType = (type) => {
    setFormData(prev => {
      const types = Array.isArray(prev.commerce_types) ? [...prev.commerce_types] : ['product', 'service']
      const index = types.indexOf(type)
      if (index > -1) {
        types.splice(index, 1)
      } else {
        types.push(type)
      }
      return { ...prev, commerce_types: types }
    })
    setHasChanges(true)
  }
  
  // Check if Signal is enabled via org or project
  const isSignalEnabled = hasOrgSignal || formData.signal_enabled || formData.features.includes('signal')
  
  // Save settings
  const handleSave = async () => {
    if (!project?.id) return
    
    setIsSaving(true)
    try {
      // Merge commerce_types into existing settings
      const updatedSettings = {
        ...(project?.settings || {}),
        commerce_types: formData.commerce_types,
        payment_processor: formData.payment_processor,
        shopify_connected: formData.shopify_connected,
        resend_domain: formData.resend_domain || null,
        resend_from_name: formData.resend_from_name || null,
        notification_recipients: formData.notification_recipients || [],
      }
      
      console.log('Saving project with data:', {
        logo_url: formData.logo_url,
        settings: updatedSettings,
      })
      
      const response = await portalApi.patch(`/projects/${project.id}`, {
        title: formData.title,
        status: formData.status,
        logo_url: formData.logo_url,
        brand_primary: formData.brand_primary || null,
        brand_secondary: formData.brand_secondary || null,
        domain: formData.domain || null,
        features: formData.features,
        signal_enabled: formData.signal_enabled,
        signal_enabled_at: formData.signal_enabled ? (project.signal_enabled_at || new Date().toISOString()) : null,
        settings: updatedSettings,
        // Business Profile fields - Universal source of truth
        city: formData.city || null,
        state_code: formData.state_code || null,
        country_code: formData.country_code || 'US',
        postal_code: formData.postal_code || null,
        address_line1: formData.address_line1 || null,
        address_line2: formData.address_line2 || null,
        industry: formData.industry || null,
        industry_subcategory: formData.industry_subcategory || null,
        google_trends_category_id: formData.google_trends_category_id || 0,
      })
      
      console.log('Project update response:', response.data)
      
      if (response.data) {
        // Sync commerce_types to commerce_settings.enabled_types
        // The Commerce module uses commerce_settings.enabled_types, not project.settings.commerce_types
        if (formData.features.includes('commerce') || formData.features.includes('ecommerce')) {
          try {
            await portalApi.put(`/commerce/settings/${project.id}`, {
              enabled_types: formData.commerce_types,
            })
            console.log('Synced commerce_types to commerce_settings.enabled_types')
          } catch (error) {
            console.error('Failed to sync commerce_types to commerce_settings:', error)
            // Don't fail the save if this errors
          }
        }
        
        // Create completely new project object to ensure Zustand triggers update
        const updatedProject = {
          ...project,
          ...response.data,
          settings: {
            ...(project?.settings || {}),
            ...(response.data.settings || {}),
          }
        }
        
        console.log('Updating store with:', {
          logo_url: updatedProject.logo_url,
          settings: updatedProject.settings,
        })
        
        // Update local project state
        if (onProjectUpdate) {
          onProjectUpdate(updatedProject)
        }
        
        // Update auth store - this should trigger useEffect
        setProject(updatedProject)
        
        // Also manually sync formData to ensure UI updates immediately
        setFormData({
          title: updatedProject.title || '',
          status: updatedProject.status || 'planning',
          logo_url: updatedProject.logo_url || null,
          brand_primary: updatedProject.brand_primary || '',
          brand_secondary: updatedProject.brand_secondary || '',
          domain: updatedProject.domain || '',
          resend_domain: updatedProject.settings?.resend_domain || '',
          resend_from_name: updatedProject.settings?.resend_from_name || '',
          notification_recipients: updatedProject.settings?.notification_recipients || [],
          features: Array.isArray(updatedProject.features) ? updatedProject.features : [],
          commerce_types: Array.isArray(updatedProject.settings?.commerce_types) ? updatedProject.settings.commerce_types : [],
          payment_processor: updatedProject.settings?.payment_processor || null,
          shopify_connected: updatedProject.settings?.shopify_connected || false,
          // Business Profile fields
          city: updatedProject.city || '',
          state_code: updatedProject.state_code || '',
          country_code: updatedProject.country_code || 'US',
          postal_code: updatedProject.postal_code || '',
          address_line1: updatedProject.address_line1 || '',
          address_line2: updatedProject.address_line2 || '',
          industry: updatedProject.industry || '',
          industry_subcategory: updatedProject.industry_subcategory || '',
          google_trends_category_id: updatedProject.google_trends_category_id || 0,
        })
        
        toast.success('Project settings saved')
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to save project settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }
  
  // Logo upload handlers
  const handleLogoUpload = async (file) => {
    if (!file) return
    
    // Validate file type
    const validTypes = ['image/svg+xml', 'image/png']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an SVG or PNG file')
      return
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }
    
    setUploadingLogo(true)
    
    // Convert file to base64 and show preview immediately
    const reader = new FileReader()
    
    reader.onload = async () => {
      try {
        // Show preview immediately
        const previewUrl = reader.result
        setFormData(prev => ({ ...prev, logo_url: previewUrl }))
        setHasChanges(true)
        
        const base64Data = reader.result.split(',')[1]
        
        // Use consistent filename so uploads overwrite previous logo
        const extension = file.type === 'image/svg+xml' ? 'svg' : 'png'
        const filename = `logo.${extension}`
        
        // Upload to files API
        const response = await portalApi.post(`/files`, {
          projectId: project.id,
          folderPath: 'Logos',
          filename,
          mimeType: file.type,
          fileSize: file.size,
          base64Data,
        })
        
        console.log('Upload response:', response.data)
        
        // API returns { success, file: { ... }, url }
        const uploadedUrl = response.data?.url || response.data?.file?.url
        if (uploadedUrl) {
          // Update with final URL from server
          setFormData(prev => ({ ...prev, logo_url: uploadedUrl }))
          toast.success('Logo ready to save')
        } else {
          console.error('No URL in response:', response.data)
          toast.warning('Upload completed but no URL returned')
        }
      } catch (error) {
        console.error('Failed to upload logo:', error)
        toast.error('Failed to upload logo')
        setFormData(prev => ({ ...prev, logo_url: project?.logo_url || null }))
        setHasChanges(false)
      } finally {
        setUploadingLogo(false)
      }
    }
    
    reader.onerror = () => {
      toast.error('Failed to read file')
      setUploadingLogo(false)
    }
    
    reader.readAsDataURL(file)
  }
  
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }
  
  const removeLogo = () => {
    handleChange('logo_url', null)
  }
  
  // Reset to original
  const handleReset = () => {
    if (project) {
      setFormData({
        title: project.title || '',
        status: project.status || 'planning',
        logo_url: project.logo_url || null,
        brand_primary: project.brand_primary || '',
        brand_secondary: project.brand_secondary || '',
        domain: project.domain || '',
        features: Array.isArray(project.features) ? project.features : [],
        commerce_types: Array.isArray(project.settings?.commerce_types) ? project.settings.commerce_types : ['product', 'service'],
        payment_processor: project.settings?.payment_processor || 'stripe',
        shopify_connected: project.settings?.shopify_connected || false,
      })
      setHasChanges(false)
    }
  }
  
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a project to view settings</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Project Settings</h2>
            <p className="text-muted-foreground">
              Configure {project.title} settings
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
        
        {/* Top Row - Logo (fixed col), Project Name + Domain fill remaining; Status + Signal row 2. 2xl: 5x1. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[160px_1fr_1fr] 2xl:grid-cols-[180px_1fr_1fr_1fr_1fr] gap-4">
          {/* Project Logo - Fixed-size square tile; lg: col 1 only so next two tiles fill 1fr 1fr */}
          <Card className="size-[160px] shrink-0 self-start flex-shrink-0 overflow-hidden lg:col-start-1 lg:row-start-1 2xl:col-auto 2xl:row-auto">
            <CardContent className="flex items-center justify-center p-3 h-full min-h-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {formData.logo_url ? (
                <div className="relative group w-full">
                  <div className="flex items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg aspect-square">
                    <img 
                      src={formData.logo_url} 
                      alt="Project logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white hover:bg-gray-100"
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={removeLogo}
                      className="bg-white hover:bg-red-50 text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square"
                >
                  <div 
                    className={cn(
                      "border-2 border-dashed rounded-lg h-full flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all",
                      isDragging && "border-[var(--brand-primary)] scale-105",
                      !isDragging && "border-gray-300 dark:border-gray-700"
                    )}
                    style={{
                      '--brand-primary': formData.brand_primary || DEFAULT_BRAND_PRIMARY,
                      backgroundColor: isDragging 
                        ? `${formData.brand_primary || DEFAULT_BRAND_PRIMARY}10` 
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.borderColor = formData.brand_primary || DEFAULT_BRAND_PRIMARY
                        e.currentTarget.style.backgroundColor = `${formData.brand_primary || DEFAULT_BRAND_PRIMARY}10`
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.borderColor = ''
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: formData.brand_primary || DEFAULT_BRAND_PRIMARY }} />
                        <p className="text-xs text-muted-foreground px-2">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${formData.brand_primary || DEFAULT_BRAND_PRIMARY}20` }}
                        >
                          <Upload className="h-5 w-5" style={{ color: formData.brand_primary || DEFAULT_BRAND_PRIMARY }} />
                        </div>
                        <div className="text-xs px-2">
                          <p className="font-medium">Drop logo</p>
                          <p className="text-muted-foreground">SVG/PNG</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Project Name - lg: fills first 1fr next to logo */}
          <Card className="min-w-0 lg:col-start-2 lg:row-start-1 2xl:col-auto 2xl:row-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Project name"
              />
            </CardContent>
          </Card>
          
          {/* Domain & Tracking - lg: fills second 1fr next to logo */}
          <Card className="min-w-0 lg:col-start-3 lg:row-start-1 2xl:col-auto 2xl:row-auto">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Domain & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Input
                  value={formData.domain}
                  onChange={(e) => handleChange('domain', e.target.value)}
                  placeholder="example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for SEO, Analytics, and Engage
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Project status - lg: row 2, first 1fr */}
          <Card className="min-w-0 lg:col-start-2 lg:row-start-2 2xl:col-auto 2xl:row-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project status</CardTitle>
              <CardDescription>Lifecycle stage for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.status || 'planning'}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* Signal AI - lg: row 2, second 1fr */}
          <Card className="min-w-0 lg:col-start-3 lg:row-start-2 2xl:col-auto 2xl:row-auto">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Signal AI
                {orgActuallyHasSignal && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-auto text-xs">
                    Org-Wide
                  </Badge>
                )}
                {!orgActuallyHasSignal && formData.signal_enabled && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 ml-auto text-xs">
                    Project
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orgActuallyHasSignal ? (
                <>
                  {/* Org-wide Signal is ON — project inherits automatically */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Signal enabled organization-wide</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI chat, Echo, and all Signal features are active for every project in this organization.
                  </p>
                </>
              ) : (
                <>
                  {/* Per-project toggle — org doesn't have Signal */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Signal for this project</Label>
                      <p className="text-xs text-muted-foreground">
                        AI chat, Echo, and AI-powered features
                      </p>
                    </div>
                    <Switch
                      checked={formData.signal_enabled}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, signal_enabled: checked }))
                        setHasChanges(true)
                      }}
                      disabled={!isAdmin && !isSignalAdmin}
                    />
                  </div>
                  {!isAdmin && !isSignalAdmin && (
                    <p className="text-xs text-muted-foreground italic">
                      Only admins can enable Signal.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Row - Brand Colors + Email Settings (2 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>
                Project-level brand colors that override organization defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label="Primary Color"
                description="Main brand color for buttons, links, and accents"
                value={formData.brand_primary}
                onChange={(v) => handleChange('brand_primary', v)}
                defaultValue={DEFAULT_BRAND_PRIMARY}
              />
              <ColorPicker
                label="Secondary Color"
                description="Secondary brand color for highlights and gradients"
                value={formData.brand_secondary}
                onChange={(v) => handleChange('brand_secondary', v)}
                defaultValue={DEFAULT_BRAND_SECONDARY}
              />
            
            {/* Color preview */}
            <div className="pt-4 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg border shadow-sm"
                  style={{ backgroundColor: formData.brand_primary || DEFAULT_BRAND_PRIMARY }}
                />
                <div 
                  className="w-12 h-12 rounded-lg border shadow-sm"
                  style={{ backgroundColor: formData.brand_secondary || DEFAULT_BRAND_SECONDARY }}
                />
                <Button
                  size="sm"
                  style={{ 
                    backgroundColor: formData.brand_primary || DEFAULT_BRAND_PRIMARY,
                    color: 'white'
                  }}
                >
                  Sample Button
                </Button>
              </div>
            </div>
            
            {/* Note about inheritance */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-muted-foreground">
                <p>If not set, colors will inherit from the organization settings.</p>
                <p className="mt-1">Current org colors: {currentOrg?.brand_primary || 'Default'}</p>
              </div>
            </div>
          </CardContent>
          </Card>
          
          {/* Email Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Custom email sending domain for proposals and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Resend Domain</Label>
                <Input
                  value={formData.resend_domain}
                  onChange={(e) => handleChange('resend_domain', e.target.value)}
                  placeholder="mail.example.com"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Custom domain for sending emails via Resend
                </p>
              </div>
              <div>
                <Label>From Name</Label>
                <Input
                  value={formData.resend_from_name}
                  onChange={(e) => handleChange('resend_from_name', e.target.value)}
                  placeholder="Company Name"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Display name for outgoing emails
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Business Profile - Shared component */}
        <BusinessProfileCard
          data={formData}
          onChange={(updatedData) => {
            setFormData(updatedData)
            setHasChanges(true)
          }}
          mode="edit"
          showIndustry={true}
        />
        
        {/* Notification Recipients - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Recipients
            </CardTitle>
            <CardDescription>
              Select team members who should receive form submission and commerce notifications.
              If none are selected, all team members will receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <p>No team members found. Add members to this project or organization first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamMembers.map(member => (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        formData.notification_recipients?.includes(member.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleRecipient(member.id)}
                    >
                      <Checkbox
                        checked={formData.notification_recipients?.includes(member.id)}
                        onCheckedChange={() => toggleRecipient(member.id)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {member.source === 'project' ? 'Project' : 'Org'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="text-muted-foreground">
                    <p><strong>Forms:</strong> Selected recipients will be notified when forms are submitted.</p>
                    <p className="mt-1"><strong>Commerce:</strong> Selected recipients will be notified about purchases and event registrations.</p>
                    <p className="mt-1"><em>Note: Invoice paid and contract signed notifications always go to the creator.</em></p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Module Features - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Module Features
            </CardTitle>
            <CardDescription>
              Enable or disable specific modules for this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* SEO */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="SEO"
                  enabled={formData.features.includes('seo')}
                  onChange={() => toggleFeature('seo')}
                  description="Search optimization & tracking"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Analytics */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Analytics"
                  enabled={formData.features.includes('analytics')}
                  onChange={() => toggleFeature('analytics')}
                  description="Website analytics & visitor tracking"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Forms */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Forms"
                  enabled={formData.features.includes('forms')}
                  onChange={() => toggleFeature('forms')}
                  description="Lead capture forms & submissions"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Engage */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Engage"
                  enabled={formData.features.includes('engage')}
                  onChange={() => toggleFeature('engage')}
                  description="Popups, nudges & conversion tools"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Broadcast */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Broadcast"
                  enabled={formData.features.includes('broadcast')}
                  onChange={() => toggleFeature('broadcast')}
                  description="Social media management"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Reputation */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Reputation"
                  enabled={formData.features.includes('reputation')}
                  onChange={() => toggleFeature('reputation')}
                  description="Reviews & reputation management"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Commerce */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Commerce"
                  enabled={formData.features.includes('commerce') || formData.features.includes('ecommerce')}
                  onChange={() => toggleFeature('commerce')}
                  description="Products, services, classes & events"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Blog */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Blog"
                  enabled={formData.features.includes('blog')}
                  onChange={() => toggleFeature('blog')}
                  description="Blog content management"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Prospects (was CRM) */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Prospects"
                  enabled={formData.features.includes('prospects') || formData.features.includes('crm')}
                  onChange={() => toggleFeature('prospects')}
                  description="Lead tracking & contact management"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Outreach (was Email) */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Outreach"
                  enabled={formData.features.includes('outreach') || formData.features.includes('email')}
                  onChange={() => toggleFeature('outreach')}
                  description="Email marketing & campaigns"
                  isAdmin={isAdmin}
                />
              </div>
              
              {/* Affiliates */}
              <div className="p-3 rounded-lg border bg-card">
                <FeatureToggle
                  feature="Affiliates"
                  enabled={formData.features.includes('affiliates')}
                  onChange={() => toggleFeature('affiliates')}
                  description="Affiliate tracking & referral links"
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for site-kit integration (forms, analytics)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <APIKeysManager projectId={project?.id} isAdmin={isAdmin} />
          </CardContent>
        </Card>
        
        {/* Commerce Options - Only visible when Commerce module is enabled */}
        {(formData.features.includes('commerce') || formData.features.includes('ecommerce')) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Commerce Options
              </CardTitle>
              <CardDescription>
                Configure offering types and payment processors for this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Offering Types */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Enabled Offering Types</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.commerce_types?.includes('product') ?? true}
                      onChange={() => toggleCommerceType('product')}
                      className="rounded border-border"
                      disabled={!isAdmin}
                    />
                    <span className="text-sm font-medium">Products</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.commerce_types?.includes('service') ?? true}
                      onChange={() => toggleCommerceType('service')}
                      className="rounded border-border"
                      disabled={!isAdmin}
                    />
                    <span className="text-sm font-medium">Services</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.commerce_types?.includes('event') ?? false}
                      onChange={() => toggleCommerceType('event')}
                      className="rounded border-border"
                      disabled={!isAdmin}
                    />
                    <span className="text-sm font-medium">Events</span>
                  </label>
                </div>
              </div>
              
              <Separator />
              
              {/* Payment Processors */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Processor
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose either Square or Stripe for payment processing.
                  </p>
                  
                  {loadingCommerce ? (
                    <div className="flex items-center justify-center p-8 border rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Stripe */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Stripe</p>
                          {commerceSettings?.stripe_connected ? (
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                              <Check className="h-3 w-3" />
                              Connected • {commerceSettings.stripe_publishable_key?.substring(0, 20)}...
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">Not connected</p>
                          )}
                        </div>
                        {commerceSettings?.stripe_connected ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Disconnect Stripe? This will stop all Stripe payments.')) {
                                portalApi.put(`/commerce/settings/${projectId}`, {
                                  stripe_connected: false,
                                  stripe_secret_key: null,
                                  stripe_publishable_key: null,
                                  stripe_webhook_secret: null,
                                }).then(() => {
                                  toast.success('Stripe disconnected')
                                  loadCommerceSettings()
                                })
                              }
                            }}
                            disabled={!isAdmin}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowStripeSetup(true)}
                            disabled={!isAdmin}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                      
                      {/* Square */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Square</p>
                          {commerceSettings?.square_connected ? (
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                              <Check className="h-3 w-3" />
                              Connected • {commerceSettings.square_location_id}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">Not connected</p>
                          )}
                        </div>
                        {commerceSettings?.square_connected ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Disconnect Square? This will stop all Square payments.')) {
                                portalApi.put(`/commerce/settings/${project.id}`, {
                                  square_connected: false,
                                  square_application_id: null,
                                  square_access_token: null,
                                  square_location_id: null,
                                }).then(() => {
                                  toast.success('Square disconnected')
                                  loadCommerceSettings()
                                })
                              }
                            }}
                            disabled={!isAdmin}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSquareSetup(true)}
                            disabled={!isAdmin}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                      
                      {(commerceSettings?.stripe_connected && commerceSettings?.square_connected) && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Both processors are connected. You can use either for different offerings.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Shopify Integration */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">E-commerce Platform</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Connect to Shopify to sync products and inventory.
                  </p>
                  {formData.shopify_connected ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        <span className="font-medium">Shopify Connected</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement disconnect
                          handleChange('shopify_connected', false)
                        }}
                        disabled={!isAdmin}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement Shopify OAuth flow
                        toast.info('Shopify integration coming soon')
                      }}
                      disabled={!isAdmin}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Shopify
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Setup Dialogs */}
      <StripeSetupDialog
        open={showStripeSetup}
        onOpenChange={setShowStripeSetup}
        projectId={project?.id}
        onSuccess={loadCommerceSettings}
      />
      <SquareSetupDialog
        open={showSquareSetup}
        onOpenChange={setShowSquareSetup}
        projectId={project?.id}
        onSuccess={loadCommerceSettings}
      />
    </div>
  )
}
