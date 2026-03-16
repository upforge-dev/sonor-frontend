/**
 * OrgSettingsModal - Lightweight modal for org settings from Projects module
 * 
 * Simplified to just:
 * - Organization name (rename)
 * - Primary brand color
 * - Signal AI toggle (Sonor admins only)
 */
import { useState, useCallback } from 'react'
import { 
  Save, Loader2, Palette, Building2, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { adminApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'

const UPTRADE_ORG_SLUGS = ['uptrade-media']
const UPTRADE_ORG_TYPES = ['agency']
const DEFAULT_BRAND_COLOR_1 = '#4bbf39'

export default function OrgSettingsModal({ 
  organization, 
  open, 
  onOpenChange,
  onSettingsSaved
}) {
  const { user, currentOrg } = useAuthStore()
  const [saving, setSaving] = useState(false)
  
  const isUptradeAdmin = user?.role === 'admin' || 
    user?.isSuperAdmin || 
    UPTRADE_ORG_SLUGS.includes(currentOrg?.slug) ||
    UPTRADE_ORG_TYPES.includes(currentOrg?.org_type)
  
  const [settings, setSettings] = useState(() => ({
    orgName: organization?.name || '',
    primaryColor: organization?.theme?.brandColor1 || organization?.theme?.primaryColor || DEFAULT_BRAND_COLOR_1,
    signalEnabled: organization?.signal_enabled || false,
    isRateLimited: true,
    budgetTokens: null,
    budgetPeriod: 'monthly',
  }))

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = async () => {
    if (!settings.orgName.trim()) {
      toast.error('Organization name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: settings.orgName.trim(),
        theme: {
          brandColor1: settings.primaryColor,
          primaryColor: settings.primaryColor,
        },
      }
      
      if (isUptradeAdmin) {
        payload.signal_enabled = settings.signalEnabled
        if (settings.signalEnabled && !organization?.signal_enabled) {
          payload.signal_enabled_at = new Date().toISOString()
        }
        if (settings.signalEnabled) {
          payload.token_budget = {
            is_rate_limited: settings.isRateLimited,
            budget_tokens: settings.budgetTokens,
            budget_period: settings.budgetPeriod,
          }
        }
      }
      
      await adminApi.updateOrgSettings(organization.id, payload)
      
      if (currentOrg?.id === organization.id) {
        const updatedOrg = {
          ...currentOrg,
          name: settings.orgName.trim(),
          signal_enabled: settings.signalEnabled,
          signal_enabled_at: settings.signalEnabled && !organization?.signal_enabled
            ? new Date().toISOString()
            : currentOrg.signal_enabled_at,
          theme: {
            ...currentOrg.theme,
            ...payload.theme,
          },
        }
        useAuthStore.getState().setOrganization(updatedOrg)
        localStorage.setItem('currentOrganization', JSON.stringify(updatedOrg))
      }
      
      toast.success('Organization settings saved')
      onSettingsSaved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save org settings:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save settings'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (!organization) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Organization Settings
          </DialogTitle>
          <DialogDescription>
            Manage organization name and branding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={settings.orgName}
              onChange={(e) => updateSetting('orgName', e.target.value)}
              placeholder="Organization name"
            />
          </div>

          <Separator />

          {/* Primary Color */}
          <div className="space-y-2">
            <Label>Primary Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={settings.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="font-mono text-sm max-w-[140px]"
                placeholder="#4bbf39"
              />
              <div
                className="h-8 flex-1 rounded"
                style={{ backgroundColor: settings.primaryColor }}
              />
            </div>
          </div>

          {/* Signal AI - Sonor Admin Only */}
          {isUptradeAdmin && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <Label className="text-base font-medium">Enable Signal AI</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enables AI features for all projects in this organization
                    </p>
                  </div>
                  <Switch
                    checked={settings.signalEnabled}
                    onCheckedChange={(checked) => updateSetting('signalEnabled', checked)}
                  />
                </div>
                
                {settings.signalEnabled && (
                  <>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                      <Label className="text-sm font-medium">Enabled Features</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Echo AI Chat</Badge>
                        <Badge variant="secondary">Sync Signal</Badge>
                        <Badge variant="secondary">AI Skills</Badge>
                        <Badge variant="secondary">Knowledge Base</Badge>
                        <Badge variant="secondary">Memory & Learning</Badge>
                      </div>
                      {organization?.signal_enabled_at && (
                        <p className="text-xs text-muted-foreground">
                          Signal enabled since {new Date(organization.signal_enabled_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Rate Limiting</Label>
                        <p className="text-xs text-muted-foreground">
                          Enforce token budget limits for this organization
                        </p>
                      </div>
                      <Switch
                        checked={settings.isRateLimited}
                        onCheckedChange={(checked) => updateSetting('isRateLimited', checked)}
                      />
                    </div>
                    
                    {settings.isRateLimited && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Token Budget</Label>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            value={settings.budgetTokens || ''}
                            onChange={(e) => updateSetting('budgetTokens', e.target.value ? parseInt(e.target.value) : null)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Leave empty for unlimited
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Reset Period</Label>
                          <Select 
                            value={settings.budgetPeriod || 'monthly'} 
                            onValueChange={(value) => updateSetting('budgetPeriod', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                    {!settings.isRateLimited && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          Rate limiting is disabled. This organization has unlimited AI access.
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {!settings.signalEnabled && (
                  <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
                    <p className="text-sm">
                      Enable Signal AI to unlock AI-powered features for this organization's projects.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
