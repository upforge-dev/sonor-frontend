/**
 * TenantModulesDialog - Manage module access for tenant projects
 */
import { useState, useEffect } from 'react'
import { 
  Target, Edit, Users, ClipboardCheck, Eye, BarChart3,
  Check, Loader2, Settings2, Sparkles, ShoppingCart,
  MessageSquare, Mail, HelpCircle, Info, Building2
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog'
import { Card, CardContent } from '../ui/card'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription } from '../ui/alert'

import { useUpdateProject } from '@/lib/hooks'

// Modules that are always enabled for all tenants (not toggleable)
const ALWAYS_ON_MODULES = [
  { 
    key: 'analytics', 
    label: 'Analytics', 
    icon: BarChart3, 
    description: 'Traffic analytics and conversion tracking (always enabled)'
  },
  { 
    key: 'forms', 
    label: 'Forms', 
    icon: ClipboardCheck, 
    description: 'Form builder and submission management (always enabled)'
  },
  { 
    key: 'messages', 
    label: 'Messages', 
    icon: MessageSquare, 
    description: 'Internal messaging and notifications (always enabled)'
  },
]

// Modules that can be toggled on/off per tenant
const TOGGLEABLE_MODULES = [
  { 
    key: 'seo', 
    label: 'SEO Tools', 
    icon: Target, 
    description: 'Search optimization, keyword tracking, and analytics',
    category: 'core'
  },
  { 
    key: 'blog', 
    label: 'Blog / CMS', 
    icon: Edit, 
    description: 'Content management and blog publishing',
    category: 'core'
  },
  { 
    key: 'crm', 
    label: 'CRM', 
    icon: Users, 
    description: 'Customer relationship management and contacts',
    category: 'core'
  },
  { 
    key: 'engage', 
    label: 'Engage', 
    icon: Eye, 
    description: 'Popups, nudges, banners, and live chat',
    category: 'engagement'
  },
  { 
    key: 'signal', 
    label: 'Signal AI', 
    icon: Sparkles, 
    description: 'AI assistant, knowledge base, and automation',
    category: 'ai'
  },
  { 
    key: 'email_manager', 
    label: 'Outreach', 
    icon: Mail, 
    description: 'Email campaigns and SMS messaging',
    category: 'marketing'
  },
  { 
    key: 'commerce', 
    label: 'Commerce', 
    icon: ShoppingCart, 
    description: 'Products, services, classes & event sales',
    category: 'sales'
  },
  { 
    key: 'support', 
    label: 'Support', 
    icon: HelpCircle, 
    description: 'Help desk and ticket management',
    category: 'engagement'
  },
]

// Group modules by category
const CATEGORIES = {
  core: { label: 'Core Modules', description: 'Essential portal features' },
  engagement: { label: 'Engagement', description: 'Customer interaction tools' },
  marketing: { label: 'Marketing', description: 'Outreach and campaigns' },
  sales: { label: 'Sales', description: 'Commerce and transactions' },
  ai: { label: 'AI Features', description: 'Intelligent automation' },
}

const TenantModulesDialog = ({ open, onOpenChange, project }) => {
  const updateProjectMutation = useUpdateProject()

  // Track enabled modules locally
  const [enabledModules, setEnabledModules] = useState(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (project && open) {
      const features = project.features || project.tenant_features || project.tenantFeatures || []
      setEnabledModules(new Set(features))
      setHasChanges(false)
    }
  }, [project, open])

  // Toggle a module
  const toggleModule = (moduleKey) => {
    setEnabledModules(prev => {
      const updated = new Set(prev)
      if (updated.has(moduleKey)) {
        updated.delete(moduleKey)
      } else {
        updated.add(moduleKey)
      }
      return updated
    })
    setHasChanges(true)
  }

  // Save changes
  const handleSave = async () => {
    if (!project) return
    
    setIsSaving(true)
    try {
      // Always include the always-on modules plus user selections
      const allEnabledFeatures = [
        ...ALWAYS_ON_MODULES.map(m => m.key),
        ...Array.from(enabledModules)
      ]
      
      await updateProjectMutation.mutateAsync({
        id: project.id,
        updates: { features: allEnabledFeatures },
      })
      toast.success('Module access updated')
      setHasChanges(false)
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Failed to update modules')
    } finally {
      setIsSaving(false)
    }
  }

  // Enable all toggleable modules
  const enableAll = () => {
    setEnabledModules(new Set(TOGGLEABLE_MODULES.map(m => m.key)))
    setHasChanges(true)
  }

  // Disable all toggleable modules
  const disableAll = () => {
    setEnabledModules(new Set())
    setHasChanges(true)
  }

  // Group toggleable modules by category
  const modulesByCategory = TOGGLEABLE_MODULES.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = []
    acc[module.category].push(module)
    return acc
  }, {})

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Manage Module Access
          </DialogTitle>
          <DialogDescription>
            Configure which modules are available for <strong>{project.title}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 py-2 border-b">
          <span className="text-sm text-[var(--text-secondary)]">Quick:</span>
          <Button variant="ghost" size="sm" onClick={enableAll}>
            Enable All
          </Button>
          <Button variant="ghost" size="sm" onClick={disableAll}>
            Disable All
          </Button>
          <div className="flex-1" />
          <Badge variant="outline">
            {enabledModules.size} of {TOGGLEABLE_MODULES.length} enabled
          </Badge>
        </div>

        {/* Scrollable Module List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 min-h-0">
          
          {/* Always-On Modules Info */}
          <Alert className="bg-[var(--surface-secondary)] border-[var(--border-secondary)]">
            <Info className="w-4 h-4" />
            <AlertDescription>
              <span className="font-medium">Always enabled:</span>{' '}
              {ALWAYS_ON_MODULES.map(m => m.label).join(', ')} — these are included for all tenants.
            </AlertDescription>
          </Alert>
          
          {/* Toggleable Modules by Category */}
          {Object.entries(CATEGORIES).map(([categoryKey, category]) => {
            const modules = modulesByCategory[categoryKey] || []
            if (modules.length === 0) return null
            
            return (
              <div key={categoryKey}>
                <div className="mb-3">
                  <h4 className="font-medium text-sm">{category.label}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{category.description}</p>
                </div>
                
                <div className="space-y-2">
                  {modules.map((module) => {
                    const Icon = module.icon
                    const isEnabled = enabledModules.has(module.key)

                    return (
                      <Card
                        key={module.key}
                        className={`transition-colors cursor-pointer ${
                          isEnabled ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : ''
                        }`}
                        onClick={() => toggleModule(module.key)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isEnabled
                              ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{module.label}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {module.description}
                            </p>
                          </div>

                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() => toggleModule(module.key)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="glass-primary" 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TenantModulesDialog
