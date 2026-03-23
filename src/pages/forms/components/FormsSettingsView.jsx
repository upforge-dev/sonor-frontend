// src/pages/forms/components/FormsSettingsView.jsx
// Forms module settings - notifications, spam filters, defaults

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  Shield,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Save,
  X,
  Users,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import portalApi from '@/lib/portal-api'

export default function FormsSettingsView({ projectId }) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [savedEmails, setSavedEmails] = useState([])
  const [formCount, setFormCount] = useState(0)
  const [settings, setSettings] = useState({
    defaultNotificationEmails: [],
    defaultSuccessMessage: 'Thank you for your submission!',
    enableSpamFilter: true,
    enableHoneypot: true,
    requireRecaptcha: false,
    allowDrafts: false,
    defaultSubmitButtonText: 'Submit',
  })
  const [emailInput, setEmailInput] = useState('')
  
  const loadSettings = useCallback(async () => {
    if (!projectId) return
    
    try {
      const { data } = await supabase
        .from('projects')
        .select('settings')
        .eq('id', projectId)
        .single()
      
      if (data?.settings?.forms) {
        const loadedSettings = { ...settings, ...data.settings.forms }
        setSettings(loadedSettings)
        setSavedEmails(loadedSettings.defaultNotificationEmails || [])
      }
      
      // Load form count for this project
      const { count } = await supabase
        .from('managed_forms')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
      
      setFormCount(count || 0)
      setIsLoaded(true)
    } catch (err) {
      console.error('Failed to load settings:', err)
      setIsLoaded(true)
    }
  }, [projectId])
  
  useEffect(() => {
    loadSettings()
  }, [loadSettings])
  
  async function handleSave() {
    if (!projectId) return
    
    setIsSaving(true)
    try {
      // Get current settings
      const { data: currentData } = await supabase
        .from('projects')
        .select('settings')
        .eq('id', projectId)
        .single()
      
      const currentSettings = currentData?.settings || {}
      
      // Update with forms settings
      const { error } = await supabase
        .from('projects')
        .update({
          settings: {
            ...currentSettings,
            forms: settings,
          },
        })
        .eq('id', projectId)
      
      if (error) throw error
      
      // Also sync notification emails to all existing forms that have empty notification_emails
      if (settings.defaultNotificationEmails.length > 0) {
        try {
          const { data: forms } = await supabase
            .from('managed_forms')
            .select('id, notification_emails')
            .eq('project_id', projectId)
          
          const formsToUpdate = (forms || []).filter(
            f => !f.notification_emails || f.notification_emails.length === 0
          )
          
          if (formsToUpdate.length > 0) {
            for (const form of formsToUpdate) {
              await supabase
                .from('managed_forms')
                .update({ notification_emails: settings.defaultNotificationEmails })
                .eq('id', form.id)
            }
            toast.success(`Settings saved — synced to ${formsToUpdate.length} form(s)`)
          } else {
            toast.success('Settings saved')
          }
        } catch (syncErr) {
          console.error('Failed to sync emails to forms:', syncErr)
          toast.success('Settings saved (form sync failed)')
        }
      } else {
        toast.success('Settings saved')
      }
      
      setSavedEmails([...settings.defaultNotificationEmails])
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }
  
  function handleAddEmail() {
    const email = emailInput.trim().toLowerCase()
    if (!email) return
    
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    
    if (settings.defaultNotificationEmails.includes(email)) {
      toast.error('Email already added')
      return
    }
    
    setSettings({
      ...settings,
      defaultNotificationEmails: [...settings.defaultNotificationEmails, email],
    })
    setEmailInput('')
  }
  
  function handleRemoveEmail(email) {
    setSettings({
      ...settings,
      defaultNotificationEmails: settings.defaultNotificationEmails.filter(e => e !== email),
    })
  }
  
  const hasUnsavedChanges = JSON.stringify(settings.defaultNotificationEmails) !== JSON.stringify(savedEmails)
  
  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Forms Settings</h2>
            <p className="text-[var(--text-secondary)] mt-1">
              Configure default settings for all forms in this project
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="gap-2 text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Notifications */}
        <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
              >
                <Bell className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Default email recipients for form submissions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Notification Emails</Label>
              <p className="text-sm text-muted-foreground mb-2">
                These emails will receive notifications when any form in this project is submitted
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="email@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                />
                <Button onClick={handleAddEmail} variant="outline">
                  Add
                </Button>
              </div>
              
              {/* Current recipients */}
              {settings.defaultNotificationEmails.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {settings.defaultNotificationEmails.map((email) => (
                      <Badge 
                        key={email} 
                        variant="secondary" 
                        className="gap-1 px-3 py-1.5"
                      >
                        <Mail className="h-3 w-3 mr-1 opacity-60" />
                        {email}
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {hasUnsavedChanges && (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Unsaved changes — click "Save Changes" to apply
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    No notification emails configured — form submissions won't trigger email alerts
                  </p>
                </div>
              )}
              
              {/* Saved confirmation */}
              {isLoaded && savedEmails.length > 0 && !hasUnsavedChanges && (
                <div className="mt-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">
                        Notifications active
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {savedEmails.length} recipient{savedEmails.length !== 1 ? 's' : ''} will be notified for all {formCount} form{formCount !== 1 ? 's' : ''} in this project
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Default Messages */}
        <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
              >
                <MessageSquare className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <CardTitle>Default Messages</CardTitle>
                <CardDescription>Default text for new forms</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Success Message</Label>
              <Textarea
                placeholder="Thank you for your submission!"
                value={settings.defaultSuccessMessage}
                onChange={(e) => setSettings({ ...settings, defaultSuccessMessage: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Submit Button Text</Label>
              <Input
                placeholder="Submit"
                value={settings.defaultSubmitButtonText}
                onChange={(e) => setSettings({ ...settings, defaultSubmitButtonText: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Spam Protection */}
        <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
              >
                <Shield className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <CardTitle>Security & Spam Protection</CardTitle>
                <CardDescription>Protect your forms from spam and abuse</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Spam Filter</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically flag suspicious submissions
                </p>
              </div>
              <Switch
                checked={settings.enableSpamFilter}
                onCheckedChange={(checked) => setSettings({ ...settings, enableSpamFilter: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Honeypot Field</Label>
                <p className="text-sm text-muted-foreground">
                  Add hidden field to catch bots (recommended)
                </p>
              </div>
              <Switch
                checked={settings.enableHoneypot}
                onCheckedChange={(checked) => setSettings({ ...settings, enableHoneypot: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require reCAPTCHA</Label>
                <p className="text-sm text-muted-foreground">
                  Require reCAPTCHA verification (requires setup)
                </p>
              </div>
              <Switch
                checked={settings.requireRecaptcha}
                onCheckedChange={(checked) => setSettings({ ...settings, requireRecaptcha: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Features */}
        <Card className="bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
              >
                <CheckCircle className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <CardTitle>Form Features</CardTitle>
                <CardDescription>Default feature settings for new forms</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Save Draft</Label>
                <p className="text-sm text-muted-foreground">
                  Enable users to save and resume forms later
                </p>
              </div>
              <Switch
                checked={settings.allowDrafts}
                onCheckedChange={(checked) => setSettings({ ...settings, allowDrafts: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
