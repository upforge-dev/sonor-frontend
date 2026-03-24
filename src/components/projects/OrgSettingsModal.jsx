/**
 * OrgSettingsModal - Lightweight modal for org settings from Projects module
 *
 * Simplified to just:
 * - Organization name (rename)
 * - Primary brand color
 */
import { useState, useCallback } from 'react'
import {
  Save, Loader2, Palette, Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { adminApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'

const DEFAULT_BRAND_COLOR_1 = '#4bbf39'

export default function OrgSettingsModal({
  organization,
  open,
  onOpenChange,
  onSettingsSaved
}) {
  const { user, currentOrg } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState(() => ({
    orgName: organization?.name || '',
    primaryColor: organization?.theme?.brandColor1 || organization?.theme?.primaryColor || DEFAULT_BRAND_COLOR_1,
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

      await adminApi.updateOrgSettings(organization.id, payload)

      if (currentOrg?.id === organization.id) {
        const updatedOrg = {
          ...currentOrg,
          name: settings.orgName.trim(),
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
