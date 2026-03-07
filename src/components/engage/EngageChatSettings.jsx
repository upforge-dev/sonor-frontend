// src/components/engage/EngageChatSettings.jsx
// Configure the live chat widget for a project

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { engageApi, adminApi } from '@/lib/portal-api'
import {
  MessageCircle,
  Settings,
  Palette,
  Users,
  Clock,
  Zap,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  User,
  Sparkles,
  X,
  Plus
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
// EchoNudgeSettings is now a standalone view at /engage → Page Nudges

// Widget icon options
const WIDGET_ICONS = [
  { value: 'chat', label: 'Chat Bubble', icon: MessageCircle },
  { value: 'message', label: 'Message', icon: MessageSquare },
  { value: 'help', label: 'Help', icon: HelpCircle },
  { value: 'user', label: 'Person', icon: User }
]

// Form field options
const FORM_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' }
]

// Days of the week
const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' }
]

// Common timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'UTC' }
]

// Default business hours
const DEFAULT_BUSINESS_HOURS = {
  timezone: 'America/New_York',
  enabled: false,
  schedule: {
    mon: { enabled: true, start: '09:00', end: '17:00' },
    tue: { enabled: true, start: '09:00', end: '17:00' },
    wed: { enabled: true, start: '09:00', end: '17:00' },
    thu: { enabled: true, start: '09:00', end: '17:00' },
    fri: { enabled: true, start: '09:00', end: '17:00' },
    sat: { enabled: false, start: '09:00', end: '17:00' },
    sun: { enabled: false, start: '09:00', end: '17:00' }
  }
}

export default function EngageChatSettings({ projectId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [signalEnabled, setSignalEnabled] = useState(false)
  const [project, setProject] = useState(null)
  const [activeTab, setActiveTab] = useState('general')

  // Fetch config on mount
  useEffect(() => {
    if (projectId) {
      fetchConfig()
    }
  }, [projectId])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const { data: responseData } = await engageApi.getChatConfig(projectId)
      // Backend returns { success, data: { config, signalEnabled, project } }
      const payload = responseData?.data || responseData
      const rawConfig = payload?.config || {}
      
      // Initialize business_hours if null
      const configWithDefaults = {
        ...rawConfig,
        business_hours: rawConfig.business_hours || DEFAULT_BUSINESS_HOURS
      }
      
      setConfig(configWithDefaults)
      setSignalEnabled(payload?.signalEnabled ?? false)
      setProject(payload?.project ?? null)
      
      // Fetch team members if org is available
      if (payload?.project?.org?.id) {
        fetchTeamMembers(payload.project.org.id)
      }
    } catch (error) {
      console.error('Failed to fetch chat config:', error)
      toast.error('Failed to load chat settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async (orgId) => {
    try {
      setLoadingMembers(true)
      const { data } = await adminApi.listOrgMembers(orgId)
      setTeamMembers(data.members || [])
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  // Helper functions for custom assignees
  const toggleAssignee = (contactId) => {
    const current = config.custom_assignees || []
    if (current.includes(contactId)) {
      updateConfig({ custom_assignees: current.filter(id => id !== contactId) })
    } else {
      updateConfig({ custom_assignees: [...current, contactId] })
    }
  }

  const isAssigned = (contactId) => {
    return (config.custom_assignees || []).includes(contactId)
  }

  // Helper functions for business hours
  const updateBusinessHours = (updates) => {
    updateConfig({
      business_hours: { ...config.business_hours, ...updates }
    })
  }

  const updateDaySchedule = (day, updates) => {
    updateConfig({
      business_hours: {
        ...config.business_hours,
        schedule: {
          ...config.business_hours?.schedule,
          [day]: { ...config.business_hours?.schedule?.[day], ...updates }
        }
      }
    })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await engageApi.updateChatConfig(projectId, config)
      toast.success('Chat settings saved!')
    } catch (error) {
      console.error('Failed to save chat config:', error)
      const data = error.response?.data
      const errMsg = typeof data?.error === 'string' ? data.error : (data?.error?.message ?? data?.message ?? 'Failed to save settings')
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const toggleRequiredField = (field) => {
    const required = config.form_required_fields || []
    const optional = config.form_optional_fields || []
    
    if (required.includes(field)) {
      // Move to optional
      updateConfig({
        form_required_fields: required.filter(f => f !== field),
        form_optional_fields: [...optional, field]
      })
    } else if (optional.includes(field)) {
      // Remove entirely
      updateConfig({
        form_optional_fields: optional.filter(f => f !== field)
      })
    } else {
      // Add as required
      updateConfig({
        form_required_fields: [...required, field]
      })
    }
  }

  const getFieldState = (field) => {
    if (config?.form_required_fields?.includes(field)) return 'required'
    if (config?.form_optional_fields?.includes(field)) return 'optional'
    return 'hidden'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load chat settings</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Live Chat Widget
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure the chat widget for {project?.title || 'this project'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Enable Widget */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Chat Widget</Label>
              <p className="text-sm text-muted-foreground">
                Show the chat widget on your website
              </p>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => updateConfig({ is_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {config.is_enabled && (
        <>
          {/* Chat Mode (auto-derived from Signal status) */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {signalEnabled ? (
                    <>
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          AI Chat with Handoff
                          <Badge variant="outline" className="text-xs">Signal</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          AI responds instantly. Visitors can request human handoff anytime.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium">Live Chat Only</div>
                        <p className="text-sm text-muted-foreground">
                          Visitors connect directly with your team. Enable Signal to add AI chat.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Badge variant={signalEnabled ? 'default' : 'secondary'}>
                  {signalEnabled ? 'AI Enabled' : 'Live Only'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">
                <Settings className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="w-4 h-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="form">
                <MessageSquare className="w-4 h-4 mr-2" />
                Form
              </TabsTrigger>
              <TabsTrigger value="routing">
                <Users className="w-4 h-4 mr-2" />
                Routing
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-open widget</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically open the widget after a delay
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          placeholder="Off"
                          value={config.auto_open_delay || ''}
                          onChange={(e) => updateConfig({ 
                            auto_open_delay: e.target.value ? parseInt(e.target.value) : null 
                          })}
                        />
                        <span className="text-sm text-muted-foreground">seconds</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Play sound on new message</Label>
                        <p className="text-xs text-muted-foreground">
                          Alert visitors when agents reply
                        </p>
                      </div>
                      <Switch
                        checked={config.play_sound_on_message}
                        onCheckedChange={(checked) => updateConfig({ play_sound_on_message: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show unread indicator</Label>
                        <p className="text-xs text-muted-foreground">
                          Show badge when there are unread messages
                        </p>
                      </div>
                      <Switch
                        checked={config.show_unread_indicator}
                        onCheckedChange={(checked) => updateConfig({ show_unread_indicator: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show "Powered by Uptrade"</Label>
                        <p className="text-xs text-muted-foreground">
                          Display branding on the widget
                        </p>
                      </div>
                      <Switch
                        checked={config.show_powered_by}
                        onCheckedChange={(checked) => updateConfig({ show_powered_by: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Settings (only show when Signal is enabled) */}
              {signalEnabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Chat Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Initial AI Message</Label>
                      <Textarea
                        placeholder="Hi! 👋 How can I help you today?"
                        value={config.initial_message || ''}
                        onChange={(e) => updateConfig({ initial_message: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable human handoff</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow visitors to request a human agent
                        </p>
                      </div>
                      <Switch
                        checked={config.handoff_enabled}
                        onCheckedChange={(checked) => updateConfig({ handoff_enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Welcome Screen Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Welcome Screen
                  </CardTitle>
                  <CardDescription>
                    What visitors see before they start chatting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show welcome screen</Label>
                      <p className="text-xs text-muted-foreground">
                        Display a greeting with quick-action prompts before the chat starts
                      </p>
                    </div>
                    <Switch
                      checked={config.welcome_screen_enabled ?? true}
                      onCheckedChange={(checked) => updateConfig({ welcome_screen_enabled: checked })}
                    />
                  </div>

                  {config.welcome_screen_enabled !== false && (
                    <>
                      <Separator />

                      <div className="space-y-2">
                        <Label>Quick Action Prompts</Label>
                        <p className="text-xs text-muted-foreground">
                          Suggested questions visitors can click to start a conversation
                        </p>
                        {(config.welcome_quick_actions || []).map((action, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={action}
                              onChange={(e) => {
                                const updated = [...(config.welcome_quick_actions || [])]
                                updated[index] = e.target.value
                                updateConfig({ welcome_quick_actions: updated })
                              }}
                              placeholder="e.g. What apartments are available?"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const updated = (config.welcome_quick_actions || []).filter((_, i) => i !== index)
                                updateConfig({ welcome_quick_actions: updated })
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {(config.welcome_quick_actions || []).length < 6 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateConfig({
                                welcome_quick_actions: [...(config.welcome_quick_actions || []), '']
                              })
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add prompt
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Offline Behavior */}
              <Card>
                <CardHeader>
                  <CardTitle>Offline Messaging</CardTitle>
                  <CardDescription>
                    What visitors see when no agents are available
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Offline Heading</Label>
                    <Input
                      placeholder="No agents available right now"
                      value={config.offline_heading || ''}
                      onChange={(e) => updateConfig({ offline_heading: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Offline Subheading</Label>
                    <Textarea
                      placeholder="Leave us a message and we'll get back to you!"
                      value={config.offline_subheading || ''}
                      onChange={(e) => updateConfig({ offline_subheading: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The widget automatically uses your project's <strong>brand colors</strong> and <strong>logo</strong> from{' '}
                  <span className="font-medium">Project Settings</span>. The accent color below is used as an optional override.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Widget Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select
                        value={config.position}
                        onValueChange={(value) => updateConfig({ position: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={config.widget_icon}
                        onValueChange={(value) => updateConfig({ widget_icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WIDGET_ICONS.map(icon => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <icon.icon className="w-4 h-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 cursor-pointer"
                        value={config.theme?.accent || '#4bbf39'}
                        onChange={(e) => updateConfig({ 
                          theme: { ...config.theme, accent: e.target.value } 
                        })}
                      />
                      <Input
                        value={config.theme?.accent || '#4bbf39'}
                        onChange={(e) => updateConfig({ 
                          theme: { ...config.theme, accent: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-background to-muted" />
                    {/* Widget Preview */}
                    <div 
                      className={cn(
                        'absolute bottom-4',
                        config.position === 'bottom-right' ? 'right-4' : 'left-4'
                      )}
                    >
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform"
                        style={{ backgroundColor: config.theme?.accent || '#4bbf39' }}
                      >
                        {(() => {
                          const IconComponent = WIDGET_ICONS.find(i => i.value === config.widget_icon)?.icon || MessageCircle
                          return <IconComponent className="w-6 h-6 text-white" />
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Form Tab */}
            <TabsContent value="form" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Form</CardTitle>
                  <CardDescription>
                    {signalEnabled
                      ? 'Shown when visitors request human handoff'
                      : 'Shown when no agents are available (offline form)'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Form Heading</Label>
                    <Input
                      placeholder="Chat with our team"
                      value={config.form_heading || ''}
                      onChange={(e) => updateConfig({ form_heading: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Form Description</Label>
                    <Textarea
                      placeholder="Leave your info and we'll respond shortly."
                      value={config.form_description || ''}
                      onChange={(e) => updateConfig({ form_description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Form Fields</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Click to cycle: Required → Optional → Hidden
                    </p>
                    <div className="grid gap-2">
                      {FORM_FIELDS.map(field => {
                        const state = getFieldState(field.value)
                        return (
                          <div
                            key={field.value}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                              state === 'required' && 'bg-primary/5 border-primary/30',
                              state === 'optional' && 'bg-muted border-muted-foreground/20',
                              state === 'hidden' && 'opacity-50'
                            )}
                            onClick={() => toggleRequiredField(field.value)}
                          >
                            <span className="font-medium">{field.label}</span>
                            <Badge variant={state === 'required' ? 'default' : 'outline'}>
                              {state}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show message field</Label>
                      <p className="text-xs text-muted-foreground">
                        "How can we help?" textarea
                      </p>
                    </div>
                    <Switch
                      checked={config.form_show_message}
                      onCheckedChange={(checked) => updateConfig({ form_show_message: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Submit Button Text</Label>
                    <Input
                      placeholder="Start Chat"
                      value={config.form_submit_text || ''}
                      onChange={(e) => updateConfig({ form_submit_text: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Routing Tab */}
            <TabsContent value="routing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chat Routing</CardTitle>
                  <CardDescription>
                    Choose who receives chat messages and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Route chats to</Label>
                    <Select
                      value={config.routing_type}
                      onValueChange={(value) => updateConfig({ routing_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project">Project Team</SelectItem>
                        <SelectItem value="org">Organization Admins</SelectItem>
                        <SelectItem value="uptrade">Uptrade Media Team</SelectItem>
                        <SelectItem value="custom">Custom Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {config.routing_type === 'project' && 'Members assigned to this project will receive chats'}
                      {config.routing_type === 'org' && 'Organization administrators will receive chats'}
                      {config.routing_type === 'uptrade' && 'Uptrade Media team will handle all chats'}
                      {config.routing_type === 'custom' && 'Select specific team members below'}
                    </p>
                  </div>

                  {config.routing_type === 'custom' && (
                    <div className="space-y-3">
                      <Label>Custom Assignees</Label>
                      <p className="text-xs text-muted-foreground">
                        Select team members who will receive chat notifications
                      </p>
                      
                      {loadingMembers ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading team members...
                        </div>
                      ) : teamMembers.length === 0 ? (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No team members found. Add members to your organization first.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="space-y-2">
                          {/* Selected assignees */}
                          {(config.custom_assignees || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {(config.custom_assignees || []).map(contactId => {
                                const member = teamMembers.find(m => m.contact?.id === contactId)
                                if (!member) return null
                                return (
                                  <Badge key={contactId} variant="secondary" className="pl-1 pr-1 gap-1">
                                    <Avatar className="w-5 h-5">
                                      <AvatarImage src={member.contact?.avatar} />
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(member.contact?.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs">{member.contact?.name}</span>
                                    <button
                                      onClick={() => toggleAssignee(contactId)}
                                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Available team members */}
                          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {teamMembers
                              .filter(m => !isAssigned(m.contact?.id))
                              .map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => toggleAssignee(member.contact?.id)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left transition-colors"
                                >
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={member.contact?.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(member.contact?.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {member.contact?.name || member.contact?.email}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.contact?.email}
                                    </p>
                                  </div>
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                </button>
                              ))}
                            {teamMembers.filter(m => !isAssigned(m.contact?.id)).length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                All team members are assigned
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Business Hours
                  </CardTitle>
                  <CardDescription>
                    Configure availability for human handoff (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Enable business hours */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Restrict to business hours</Label>
                      <p className="text-xs text-muted-foreground">
                        Only offer human handoff during specified hours
                      </p>
                    </div>
                    <Switch
                      checked={config.business_hours?.enabled || false}
                      onCheckedChange={(checked) => updateBusinessHours({ enabled: checked })}
                    />
                  </div>

                  {config.business_hours?.enabled && (
                    <>
                      <Separator />
                      
                      {/* Timezone */}
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select
                          value={config.business_hours?.timezone || 'America/New_York'}
                          onValueChange={(value) => updateBusinessHours({ timezone: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map(tz => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Weekly schedule */}
                      <div className="space-y-2">
                        <Label>Weekly Schedule</Label>
                        <div className="border rounded-lg divide-y">
                          {DAYS_OF_WEEK.map(day => {
                            const daySchedule = config.business_hours?.schedule?.[day.value] || {
                              enabled: day.value !== 'sat' && day.value !== 'sun',
                              start: '09:00',
                              end: '17:00'
                            }
                            
                            return (
                              <div key={day.value} className="flex items-center gap-4 p-3">
                                <div className="w-24">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={daySchedule.enabled}
                                      onCheckedChange={(checked) => 
                                        updateDaySchedule(day.value, { enabled: checked })
                                      }
                                    />
                                    <span className={cn(
                                      'text-sm font-medium',
                                      !daySchedule.enabled && 'text-muted-foreground'
                                    )}>
                                      {day.label.slice(0, 3)}
                                    </span>
                                  </div>
                                </div>
                                
                                {daySchedule.enabled ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      type="time"
                                      value={daySchedule.start}
                                      onChange={(e) => 
                                        updateDaySchedule(day.value, { start: e.target.value })
                                      }
                                      className="w-28"
                                    />
                                    <span className="text-muted-foreground">to</span>
                                    <Input
                                      type="time"
                                      value={daySchedule.end}
                                      onChange={(e) => 
                                        updateDaySchedule(day.value, { end: e.target.value })
                                      }
                                      className="w-28"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Closed</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Offline behavior */}
                      <div className="space-y-2">
                        <Label>Outside business hours</Label>
                        <Select
                          value={config.offline_mode || 'show_form'}
                          onValueChange={(value) => updateConfig({ offline_mode: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="show_form">Show "Leave a message" form</SelectItem>
                            {signalEnabled && (
                              <SelectItem value="ai_only">AI chat only (no handoff option)</SelectItem>
                            )}
                            <SelectItem value="hide_handoff">Hide handoff button</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          What happens when visitors request human help outside business hours
                        </p>
                      </div>
                    </>
                  )}

                  {!config.business_hours?.enabled && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Human handoff is available 24/7. Enable business hours to restrict availability.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          {/* Site-Kit Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Installation
              </CardTitle>
              <CardDescription>
                The chat widget is automatically included when you use @uptrademedia/site-kit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <MessageCircle className="h-4 w-4" />
                <AlertDescription>
                  The chat widget is built into Site-Kit and will automatically appear on your website once installed. 
                  No manual embed code needed.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Site-Kit Package</Label>
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      <code>@uptrademedia/site-kit</code>
                    </pre>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Usage Example</Label>
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
                      <code>{`import { ChatWidget } from '@uptrademedia/site-kit/engage'

<ChatWidget projectId="${projectId}" />`}</code>
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add the ChatWidget component to your layout (typically in a floating action component). 
                    All configuration is managed here in the Portal and automatically synced.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
