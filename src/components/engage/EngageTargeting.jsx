// src/components/engage/EngageTargeting.jsx
// Comprehensive targeting configuration for Engage elements
// Handles triggers, page targeting, audience rules, and form integration

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/lib/toast'
import { engageApi } from '@/lib/sonor-api'
import { cn } from '@/lib/utils'
import {
  Clock,
  ScrollText,
  LogOut,
  MousePointerClick,
  FormInput,
  Zap,
  Monitor,
  Tablet,
  Smartphone,
  Globe,
  Search as SearchIcon,
  Mail,
  Users,
  UserPlus,
  UserCheck,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  FileText,
  Target,
  Filter,
  Loader2,
  ArrowRight,
  ShoppingCart,
  Timer,
  Eye,
  X,
  GripVertical,
  Settings,
  Copy,
  Edit,
  MoreVertical,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Type Configurations
// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  {
    id: 'time_delay',
    label: 'Time Delay',
    description: 'Show after X seconds on page',
    icon: Clock,
    color: 'blue',
    configFields: [
      { key: 'seconds', label: 'Delay (seconds)', type: 'number', default: 5, min: 1 },
    ],
  },
  {
    id: 'scroll_depth',
    label: 'Scroll Depth',
    description: 'Show after scrolling X%',
    icon: ScrollText,
    color: 'green',
    configFields: [
      { key: 'percent', label: 'Scroll percentage', type: 'number', default: 50, min: 1, max: 100 },
    ],
  },
  {
    id: 'exit_intent',
    label: 'Exit Intent',
    description: 'Show when mouse leaves viewport',
    icon: LogOut,
    color: 'red',
    configFields: [
      { key: 'sensitivity', label: 'Sensitivity', type: 'select', default: 'medium', options: ['low', 'medium', 'high'] },
    ],
  },
  {
    id: 'page_load',
    label: 'Page Load',
    description: 'Show immediately on page load',
    icon: Eye,
    color: 'purple',
    configFields: [],
  },
  {
    id: 'inactivity',
    label: 'Inactivity',
    description: 'Show after X seconds of no activity',
    icon: Timer,
    color: 'orange',
    configFields: [
      { key: 'seconds', label: 'Inactivity time (seconds)', type: 'number', default: 30, min: 5 },
    ],
  },
  {
    id: 'click_element',
    label: 'Click Element',
    description: 'Show when user clicks a CSS selector',
    icon: MousePointerClick,
    color: 'teal',
    configFields: [
      { key: 'selector', label: 'CSS Selector', type: 'text', default: '.cta-button', placeholder: 'e.g., .cta-button, #signup' },
    ],
  },
  {
    id: 'form_submit',
    label: 'Form Submit',
    description: 'Show after a form is submitted',
    icon: FormInput,
    color: 'indigo',
    configFields: [
      { key: 'form_id', label: 'Form', type: 'form_select' },
    ],
  },
  {
    id: 'custom_event',
    label: 'Custom Event',
    description: 'Show on custom JavaScript event',
    icon: Zap,
    color: 'yellow',
    configFields: [
      { key: 'event_name', label: 'Event Name', type: 'text', default: '', placeholder: 'e.g., video_complete' },
    ],
  },
  {
    id: 'returning_visitor',
    label: 'Returning Visitor',
    description: 'Show when visitor returns to site',
    icon: UserCheck,
    color: 'cyan',
    configFields: [
      { key: 'min_visits', label: 'Minimum visits', type: 'number', default: 2, min: 2 },
    ],
  },
  {
    id: 'cart_abandonment',
    label: 'Cart Abandonment',
    description: 'Show when cart is inactive',
    icon: ShoppingCart,
    color: 'pink',
    configFields: [
      { key: 'seconds', label: 'Inactive time (seconds)', type: 'number', default: 60, min: 10 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Device & Audience Options
// ─────────────────────────────────────────────────────────────────────────────

const DEVICE_OPTIONS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
]

const TRAFFIC_SOURCES = [
  { id: 'organic', label: 'Organic Search' },
  { id: 'paid', label: 'Paid Ads' },
  { id: 'social', label: 'Social Media' },
  { id: 'direct', label: 'Direct' },
  { id: 'email', label: 'Email' },
  { id: 'referral', label: 'Referral' },
]

const VISITOR_TYPES = [
  { id: 'new', label: 'New Visitors', icon: UserPlus },
  { id: 'returning', label: 'Returning Visitors', icon: UserCheck },
]

const FREQUENCY_OPTIONS = [
  { id: 'once', label: 'Once ever' },
  { id: 'session', label: 'Once per session' },
  { id: 'day', label: 'Once per day' },
  { id: 'week', label: 'Once per week' },
  { id: 'unlimited', label: 'No limit' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EngageTargeting({ 
  element, 
  projectId,
  onChange,
  compact = false,
}) {
  const [activeTab, setActiveTab] = useState('triggers')
  const [triggers, setTriggers] = useState([])
  const [pageRules, setPageRules] = useState([])
  const [availablePages, setAvailablePages] = useState([])
  const [availableForms, setAvailableForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dialog states
  const [addTriggerOpen, setAddTriggerOpen] = useState(false)
  const [addPageRuleOpen, setAddPageRuleOpen] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  
  // Element targeting state (editable)
  const [targeting, setTargeting] = useState({
    device_targets: element?.device_targets || ['desktop', 'mobile', 'tablet'],
    traffic_sources: element?.traffic_sources || ['organic', 'paid', 'social', 'direct', 'email', 'referral'],
    visitor_types: element?.visitor_types || ['new', 'returning'],
    frequency_cap: element?.frequency_cap || 'session',
    max_impressions: element?.max_impressions || null,
    page_patterns: element?.page_patterns || [],
    exclude_patterns: element?.exclude_patterns || [],
    trigger_form_id: element?.trigger_form_id || null,
    target_page_ids: element?.target_page_ids || [],
  })
  
  // Load data on mount
  useEffect(() => {
    if (element?.id) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [element?.id])
  
  const loadData = async () => {
    if (!element?.id || !projectId) return
    setLoading(true)
    try {
      const [triggersRes, rulesRes, pagesRes, formsRes] = await Promise.all([
        engageApi.listTriggers(element.id),
        engageApi.listPageRules(element.id),
        engageApi.listTargetingPages(projectId),
        engageApi.listTargetingForms(projectId),
      ])
      
      setTriggers(triggersRes.data?.data || [])
      setPageRules(rulesRes.data?.data || [])
      setAvailablePages(pagesRes.data?.data || [])
      setAvailableForms(formsRes.data?.data || [])
    } catch (err) {
      console.error('Failed to load targeting data:', err)
      toast.error('Failed to load targeting settings')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle targeting changes
  const handleTargetingChange = useCallback((key, value) => {
    setTargeting(prev => {
      const updated = { ...prev, [key]: value }
      onChange?.(updated)
      return updated
    })
  }, [onChange])
  
  // Toggle array items
  const toggleArrayItem = useCallback((key, item) => {
    setTargeting(prev => {
      const arr = prev[key] || []
      const updated = arr.includes(item)
        ? arr.filter(i => i !== item)
        : [...arr, item]
      onChange?.({ ...prev, [key]: updated })
      return { ...prev, [key]: updated }
    })
  }, [onChange])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Trigger CRUD
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleAddTrigger = async (triggerType, config = {}) => {
    if (!element?.id) return
    setSaving(true)
    try {
      const res = await engageApi.createTrigger({
        element_id: element.id,
        trigger_type: triggerType,
        config,
        is_active: true,
      })
      setTriggers(prev => [...prev, res.data?.data])
      setAddTriggerOpen(false)
      toast.success('Trigger added')
    } catch (err) {
      console.error('Failed to add trigger:', err)
      toast.error('Failed to add trigger')
    } finally {
      setSaving(false)
    }
  }
  
  const handleUpdateTrigger = async (id, updates) => {
    setSaving(true)
    try {
      const res = await engageApi.updateTrigger(id, updates)
      setTriggers(prev => prev.map(t => t.id === id ? res.data?.data : t))
      setEditingTrigger(null)
      toast.success('Trigger updated')
    } catch (err) {
      console.error('Failed to update trigger:', err)
      toast.error('Failed to update trigger')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDeleteTrigger = async (id) => {
    setSaving(true)
    try {
      await engageApi.deleteTrigger(id)
      setTriggers(prev => prev.filter(t => t.id !== id))
      setDeleteConfirmId(null)
      toast.success('Trigger deleted')
    } catch (err) {
      console.error('Failed to delete trigger:', err)
      toast.error('Failed to delete trigger')
    } finally {
      setSaving(false)
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Page Rule CRUD
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleAddPageRule = async (rule) => {
    if (!element?.id) return
    setSaving(true)
    try {
      const res = await engageApi.createPageRule({
        element_id: element.id,
        ...rule,
      })
      setPageRules(prev => [...prev, res.data?.data])
      setAddPageRuleOpen(false)
      toast.success('Page rule added')
    } catch (err) {
      console.error('Failed to add page rule:', err)
      toast.error('Failed to add page rule')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDeletePageRule = async (id) => {
    setSaving(true)
    try {
      await engageApi.deletePageRule(id)
      setPageRules(prev => prev.filter(r => r.id !== id))
      toast.success('Page rule deleted')
    } catch (err) {
      console.error('Failed to delete page rule:', err)
      toast.error('Failed to delete page rule')
    } finally {
      setSaving(false)
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (!element?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Target className="h-8 w-8 mb-2" />
        <p>Save the element first to configure targeting</p>
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-4', compact && 'text-sm')}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="triggers" className="gap-1">
            <Zap className="h-3.5 w-3.5" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="audience" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            Audience
          </TabsTrigger>
          <TabsTrigger value="frequency" className="gap-1">
            <Timer className="h-3.5 w-3.5" />
            Frequency
          </TabsTrigger>
        </TabsList>
        
        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* TRIGGERS TAB */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="triggers" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Element shows when <strong>any</strong> trigger fires
            </p>
            <Dialog open={addTriggerOpen} onOpenChange={setAddTriggerOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Trigger
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Trigger</DialogTitle>
                  <DialogDescription>
                    Choose when this element should appear
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[400px]">
                  <div className="grid gap-2 p-1">
                    {TRIGGER_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            const defaultConfig = {}
                            type.configFields.forEach(f => {
                              if (f.default !== undefined) {
                                defaultConfig[f.key] = f.default
                              }
                            })
                            handleAddTrigger(type.id, defaultConfig)
                          }}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border text-left',
                            'hover:bg-accent hover:border-accent-foreground/20 transition-colors'
                          )}
                          disabled={saving}
                        >
                          <div className={cn(
                            'p-2 rounded-lg',
                            `bg-${type.color}-100 text-${type.color}-600`
                          )}
                          style={{
                            backgroundColor: `var(--${type.color}-100, #e0f2fe)`,
                            color: `var(--${type.color}-600, #0284c7)`,
                          }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          
          {triggers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Zap className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No triggers configured
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a trigger to control when this element appears
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {triggers.map((trigger) => {
                const typeConfig = TRIGGER_TYPES.find(t => t.id === trigger.trigger_type)
                const Icon = typeConfig?.icon || Zap
                return (
                  <Card key={trigger.id} className={cn(!trigger.is_active && 'opacity-50')}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: `var(--${typeConfig?.color || 'gray'}-100, #f3f4f6)`,
                          color: `var(--${typeConfig?.color || 'gray'}-600, #4b5563)`,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{typeConfig?.label || trigger.trigger_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTriggerConfig(trigger)}
                        </p>
                      </div>
                      <Switch
                        checked={trigger.is_active}
                        onCheckedChange={(checked) => handleUpdateTrigger(trigger.id, { is_active: checked })}
                        disabled={saving}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmId(trigger.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
        
        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* PAGES TAB */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="pages" className="space-y-4">
          <div className="space-y-4">
            {/* Page Pattern Input */}
            <div className="space-y-2">
              <Label>Page URL Patterns</Label>
              <p className="text-xs text-muted-foreground">
                Use glob patterns like /blog/* or /products/**
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., /blog/*, /pricing"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      const patterns = [...(targeting.page_patterns || []), e.target.value]
                      handleTargetingChange('page_patterns', patterns)
                      e.target.value = ''
                    }
                  }}
                />
                <Button variant="secondary" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {targeting.page_patterns?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {targeting.page_patterns.map((pattern, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {pattern}
                      <button
                        onClick={() => {
                          const patterns = targeting.page_patterns.filter((_, idx) => idx !== i)
                          handleTargetingChange('page_patterns', patterns)
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Specific Pages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Target Specific Pages</Label>
                <Dialog open={addPageRuleOpen} onOpenChange={setAddPageRuleOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Page
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Pages</DialogTitle>
                      <DialogDescription>
                        Choose specific pages to show or hide this element
                      </DialogDescription>
                    </DialogHeader>
                    <PageSelector
                      pages={availablePages}
                      selectedIds={pageRules.filter(r => r.page_id).map(r => r.page_id)}
                      onSelect={(pageId) => handleAddPageRule({ page_id: pageId, rule_type: 'include' })}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              
              {pageRules.filter(r => r.page_id && r.rule_type === 'include').length > 0 ? (
                <div className="space-y-1">
                  {pageRules
                    .filter(r => r.page_id && r.rule_type === 'include')
                    .map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {rule.page?.path || 'Unknown page'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {rule.page?.title}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleDeletePageRule(rule.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No specific pages selected. Element will use URL patterns above.
                </p>
              )}
            </div>
            
            <Separator />
            
            {/* Exclude Patterns */}
            <div className="space-y-2">
              <Label>Exclude Pages</Label>
              <p className="text-xs text-muted-foreground">
                Patterns to exclude (takes priority over include)
              </p>
              <Input
                placeholder="e.g., /checkout/*, /admin/*"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    const patterns = [...(targeting.exclude_patterns || []), e.target.value]
                    handleTargetingChange('exclude_patterns', patterns)
                    e.target.value = ''
                  }
                }}
              />
              {targeting.exclude_patterns?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {targeting.exclude_patterns.map((pattern, i) => (
                    <Badge key={i} variant="outline" className="gap-1 border-destructive/30 text-destructive">
                      {pattern}
                      <button
                        onClick={() => {
                          const patterns = targeting.exclude_patterns.filter((_, idx) => idx !== i)
                          handleTargetingChange('exclude_patterns', patterns)
                        }}
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* AUDIENCE TAB */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="audience" className="space-y-4">
          {/* Device Targeting */}
          <div className="space-y-3">
            <Label>Devices</Label>
            <div className="flex gap-2">
              {DEVICE_OPTIONS.map((device) => {
                const Icon = device.icon
                const isActive = targeting.device_targets?.includes(device.id)
                return (
                  <Button
                    key={device.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => toggleArrayItem('device_targets', device.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {device.label}
                  </Button>
                )
              })}
            </div>
          </div>
          
          <Separator />
          
          {/* Visitor Type */}
          <div className="space-y-3">
            <Label>Visitor Type</Label>
            <div className="flex gap-2">
              {VISITOR_TYPES.map((type) => {
                const Icon = type.icon
                const isActive = targeting.visitor_types?.includes(type.id)
                return (
                  <Button
                    key={type.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => toggleArrayItem('visitor_types', type.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </Button>
                )
              })}
            </div>
          </div>
          
          <Separator />
          
          {/* Traffic Sources */}
          <div className="space-y-3">
            <Label>Traffic Sources</Label>
            <div className="flex flex-wrap gap-1.5">
              {TRAFFIC_SOURCES.map((source) => {
                const isActive = targeting.traffic_sources?.includes(source.id)
                return (
                  <Button
                    key={source.id}
                    variant={isActive ? 'secondary' : 'outline'}
                    size="sm"
                    className={cn('h-7', isActive && 'bg-primary/10 text-primary border-primary/30')}
                    onClick={() => toggleArrayItem('traffic_sources', source.id)}
                  >
                    {isActive && <Check className="h-3 w-3 mr-1" />}
                    {source.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </TabsContent>
        
        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* FREQUENCY TAB */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="frequency" className="space-y-4">
          <div className="space-y-3">
            <Label>Display Frequency</Label>
            <Select
              value={targeting.frequency_cap}
              onValueChange={(v) => handleTargetingChange('frequency_cap', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <Label>Maximum Impressions (optional)</Label>
            <Input
              type="number"
              min={1}
              value={targeting.max_impressions || ''}
              onChange={(e) => handleTargetingChange('max_impressions', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Leave empty for unlimited"
            />
            <p className="text-xs text-muted-foreground">
              Stop showing after this many impressions per visitor
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trigger?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteTrigger(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

function formatTriggerConfig(trigger) {
  const config = trigger.config || {}
  switch (trigger.trigger_type) {
    case 'time_delay':
      return `After ${config.seconds || 5} seconds`
    case 'scroll_depth':
      return `After scrolling ${config.percent || 50}%`
    case 'exit_intent':
      return `Sensitivity: ${config.sensitivity || 'medium'}`
    case 'page_load':
      return 'Immediately on page load'
    case 'inactivity':
      return `After ${config.seconds || 30}s of inactivity`
    case 'click_element':
      return `On click: ${config.selector || 'element'}`
    case 'form_submit':
      return `After form submission`
    case 'custom_event':
      return `Event: ${config.event_name || 'custom'}`
    case 'returning_visitor':
      return `After ${config.min_visits || 2}+ visits`
    case 'cart_abandonment':
      return `Cart inactive ${config.seconds || 60}s`
    default:
      return JSON.stringify(config)
  }
}

function PageSelector({ pages, selectedIds, onSelect }) {
  const [search, setSearch] = useState('')
  
  const filteredPages = useMemo(() => {
    if (!search) return pages.slice(0, 50)
    const q = search.toLowerCase()
    return pages.filter(p => 
      p.path?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q)
    ).slice(0, 50)
  }, [pages, search])
  
  return (
    <div className="space-y-3">
      <Input
        placeholder="Search pages..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9"
      />
      <ScrollArea className="h-[300px]">
        <div className="space-y-1">
          {filteredPages.map((page) => {
            const isSelected = selectedIds.includes(page.id)
            return (
              <button
                key={page.id}
                onClick={() => !isSelected && onSelect(page.id)}
                disabled={isSelected}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors',
                  isSelected 
                    ? 'bg-primary/10 text-primary cursor-not-allowed' 
                    : 'hover:bg-accent'
                )}
              >
                {isSelected ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{page.path}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {page.title}
                  </p>
                </div>
                {page.clicks_28d > 0 && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {page.clicks_28d} clicks
                  </Badge>
                )}
              </button>
            )
          })}
          {filteredPages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No pages found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
