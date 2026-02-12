// src/components/engage/EchoNudgeSettings.jsx
// Configure per-page nudge CTAs for the Engage Chat Widget (Signal required)

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { engageApi } from '@/lib/portal-api'
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Clock,
  Globe,
  MessageCircle,
  Zap,
  Eye,
  ToggleLeft,
  X,
  Phone,
  ExternalLink,
  CalendarDays,
  Lock,
  ArrowRight,
  FileText,
  Search
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'

// CTA action options
const CTA_ACTIONS = [
  { value: 'start_chat', label: 'Start Chat', icon: MessageCircle, description: 'Opens chat with a pre-filled message' },
  { value: 'open_url', label: 'Open URL', icon: ExternalLink, description: 'Navigate to a page or external link' },
  { value: 'call', label: 'Phone Call', icon: Phone, description: 'Initiates a phone call' },
  { value: 'schedule', label: 'Schedule', icon: CalendarDays, description: 'Open a scheduling page or widget' }
]

// Nudge types
const NUDGE_TYPES = [
  { value: 'cta', label: 'Call to Action', description: 'Encourage a specific action' },
  { value: 'question', label: 'Conversation Starter', description: 'Invite visitor to chat' },
  { value: 'help', label: 'Help Offer', description: 'Offer contextual assistance' },
  { value: 'tip', label: 'Pro Tip', description: 'Share relevant advice' }
]

// Default new nudge
const DEFAULT_NUDGE = {
  pagePattern: '',
  seoPageId: null,
  headline: '',
  description: '',
  nudgeMessage: '',
  nudgeType: 'cta',
  nudgeDelaySeconds: 15,
  ctaText: '',
  ctaAction: 'start_chat',
  ctaUrl: '',
  secondaryCtaText: '',
  secondaryCtaAction: null,
  secondaryCtaUrl: '',
  suggestedPrompts: [''],
  pageContext: '',
  isActive: true,
  priority: 0
}

export default function EchoNudgeSettings({ projectId }) {
  const [nudges, setNudges] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingNudge, setEditingNudge] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Signal & pages state
  const [signalEnabled, setSignalEnabled] = useState(null) // null = loading
  const [pages, setPages] = useState([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [pageSearch, setPageSearch] = useState('')

  // Fetch signal status + nudges on mount
  useEffect(() => {
    if (projectId) {
      checkSignalStatus()
      fetchNudges()
      fetchPages()
    }
  }, [projectId])

  const checkSignalStatus = async () => {
    try {
      const { data } = await engageApi.getNudgeSignalStatus(projectId)
      const payload = data?.data || data
      setSignalEnabled(payload?.signalEnabled ?? false)
    } catch (error) {
      console.error('Failed to check signal status:', error)
      setSignalEnabled(false)
    }
  }

  const fetchNudges = async () => {
    setLoading(true)
    try {
      const { data } = await engageApi.getEchoConfigs(projectId)
      const payload = data?.data || data
      setNudges(payload?.configs || [])
    } catch (error) {
      console.error('Failed to fetch nudges:', error)
      toast.error('Failed to load nudges')
    } finally {
      setLoading(false)
    }
  }

  const fetchPages = async () => {
    setPagesLoading(true)
    try {
      const { data } = await engageApi.getNudgePages(projectId)
      const payload = data?.data || data
      setPages(payload?.pages || [])
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    } finally {
      setPagesLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingNudge({ ...DEFAULT_NUDGE })
    setIsDialogOpen(true)
  }

  const handleEdit = (nudge) => {
    setEditingNudge({
      id: nudge.id,
      seoPageId: nudge.seo_page_id || null,
      pagePattern: nudge.page_pattern || '',
      headline: nudge.headline || '',
      description: nudge.description || '',
      nudgeMessage: nudge.nudge_message || '',
      nudgeType: nudge.nudge_type || 'cta',
      nudgeDelaySeconds: nudge.nudge_delay_seconds || 15,
      ctaText: nudge.cta_text || '',
      ctaAction: nudge.cta_action || 'start_chat',
      ctaUrl: nudge.cta_url || '',
      secondaryCtaText: nudge.secondary_cta_text || '',
      secondaryCtaAction: nudge.secondary_cta_action || null,
      secondaryCtaUrl: nudge.secondary_cta_url || '',
      suggestedPrompts: nudge.suggested_prompts?.length ? nudge.suggested_prompts : [''],
      pageContext: nudge.page_context || '',
      isActive: nudge.is_active !== false,
      priority: nudge.priority || 0
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingNudge.headline && !editingNudge.nudgeMessage && !editingNudge.description) {
      toast.error('A headline or description is required')
      return
    }
    if (!editingNudge.seoPageId && !editingNudge.pagePattern) {
      toast.error('Select a page or enter a URL pattern')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...editingNudge,
        projectId,
        // Auto-set page_pattern from the selected page if not manually entered
        pagePattern: editingNudge.pagePattern || getPagePath(editingNudge.seoPageId) || '*',
        // Sync nudge_message from description for backward compat
        nudgeMessage: editingNudge.nudgeMessage || editingNudge.description || '',
        suggestedPrompts: (editingNudge.suggestedPrompts || []).filter(p => p.trim())
      }

      if (editingNudge.id) {
        await engageApi.updateEchoConfig(editingNudge.id, payload)
        toast.success('Nudge updated')
      } else {
        await engageApi.createEchoConfig(payload)
        toast.success('Nudge created')
      }

      setIsDialogOpen(false)
      setEditingNudge(null)
      fetchNudges()
    } catch (error) {
      console.error('Failed to save nudge:', error)
      toast.error('Failed to save nudge')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (nudgeId) => {
    try {
      await engageApi.deleteEchoConfig(nudgeId)
      toast.success('Nudge deleted')
      setDeleteConfirm(null)
      fetchNudges()
    } catch (error) {
      console.error('Failed to delete nudge:', error)
      toast.error('Failed to delete nudge')
    }
  }

  const handleToggleActive = async (nudge) => {
    try {
      await engageApi.updateEchoConfig(nudge.id, {
        isActive: !nudge.is_active
      })
      fetchNudges()
    } catch (error) {
      console.error('Failed to toggle nudge:', error)
      toast.error('Failed to update nudge')
    }
  }

  const updateField = (field, value) => {
    setEditingNudge(prev => ({ ...prev, [field]: value }))
  }

  const getPagePath = (pageId) => {
    const page = pages.find(p => p.id === pageId)
    return page?.path || ''
  }

  const getPageLabel = (pageId) => {
    const page = pages.find(p => p.id === pageId)
    return page?.label || ''
  }

  const filteredPages = pages.filter(p =>
    !pageSearch ||
    p.label?.toLowerCase().includes(pageSearch.toLowerCase()) ||
    p.path?.toLowerCase().includes(pageSearch.toLowerCase())
  )

  // Helper: get friendly page label for a nudge (from seo_page_id or page_pattern)
  const getNudgePageLabel = (nudge) => {
    if (nudge.seo_page_id) {
      const page = pages.find(p => p.id === nudge.seo_page_id)
      return page?.label || nudge.page_pattern
    }
    if (nudge.page_pattern === '*' || nudge.page_pattern === '/*') return 'All Pages'
    return nudge.page_pattern
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Signal not enabled: upgrade prompt
  // ─────────────────────────────────────────────────────────────────────────────

  if (signalEnabled === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!signalEnabled) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upgrade to Signal for Nudges</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Per-page nudges use Signal AI to proactively engage visitors with contextual CTAs.
              Enable Signal on this project to unlock this powerful conversion tool.
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-violet-500" />
                Page-specific CTAs
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                AI-powered engagement
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4 text-emerald-500" />
                Smart timing
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <SignalIcon className="w-5 h-5" />
            Page Nudges
          </h3>
          <p className="text-sm text-muted-foreground">
            Per-page CTAs that pop up from the chat widget to drive specific actions
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Nudge
        </Button>
      </div>

      {/* Info */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Nudges appear above the chat widget after a configurable delay,
          offering page-specific CTAs like "Schedule a Tour" or "Get a Quote".
          They're powered by Signal and can start AI conversations.
        </AlertDescription>
      </Alert>

      {/* Nudges List */}
      {nudges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-2">No nudges configured yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first nudge to proactively engage visitors with page-specific CTAs
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Nudge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {nudges.map((nudge) => (
            <NudgeCard
              key={nudge.id}
              nudge={nudge}
              pageLabel={getNudgePageLabel(nudge)}
              onEdit={() => handleEdit(nudge)}
              onToggle={() => handleToggleActive(nudge)}
              onDelete={() => setDeleteConfirm(nudge.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNudge?.id ? 'Edit Nudge' : 'Create New Nudge'}
            </DialogTitle>
            <DialogDescription>
              Configure a per-page CTA that appears above the chat widget
            </DialogDescription>
          </DialogHeader>

          {editingNudge && (
            <div className="grid gap-6 py-4 md:grid-cols-[1fr,280px]">
              {/* Left: Form */}
              <div className="space-y-5">
                {/* Page Selection */}
                <div className="space-y-2">
                  <Label>Page</Label>
                  {pages.length > 0 ? (
                    <div className="space-y-2">
                      <Select
                        value={editingNudge.seoPageId || '__custom__'}
                        onValueChange={(value) => {
                          if (value === '__custom__') {
                            updateField('seoPageId', null)
                          } else if (value === '__all__') {
                            updateField('seoPageId', null)
                            updateField('pagePattern', '*')
                          } else {
                            updateField('seoPageId', value)
                            const page = pages.find(p => p.id === value)
                            if (page) updateField('pagePattern', page.path)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a page..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <div className="relative mb-2">
                              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Search pages..."
                                value={pageSearch}
                                onChange={(e) => setPageSearch(e.target.value)}
                                className="pl-8 h-8 text-sm"
                              />
                            </div>
                          </div>
                          <SelectItem value="__all__">
                            <span className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5" />
                              All Pages
                            </span>
                          </SelectItem>
                          {filteredPages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              <span className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                {page.label}
                                <span className="text-xs text-muted-foreground">{page.path}</span>
                              </span>
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__">
                            <span className="flex items-center gap-2">
                              <Pencil className="h-3.5 w-3.5" />
                              Custom URL pattern...
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {!editingNudge.seoPageId && editingNudge.pagePattern !== '*' && (
                        <Input
                          placeholder="/pricing, /apartments/*, /contact"
                          value={editingNudge.pagePattern}
                          onChange={(e) => updateField('pagePattern', e.target.value)}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="/pricing, /apartments/*, /contact"
                        value={editingNudge.pagePattern}
                        onChange={(e) => updateField('pagePattern', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        No SEO pages found. Run a site crawl to populate the page picker, or enter URL patterns manually.
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Headline & Description */}
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    placeholder="e.g. Schedule a Tour Today"
                    value={editingNudge.headline}
                    onChange={(e) => updateField('headline', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="e.g. See our available apartments in person. Tours take about 30 minutes."
                    value={editingNudge.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Primary CTA */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Primary CTA</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Button Text</Label>
                      <Input
                        placeholder="e.g. Schedule a Tour"
                        value={editingNudge.ctaText}
                        onChange={(e) => updateField('ctaText', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Action</Label>
                      <Select
                        value={editingNudge.ctaAction}
                        onValueChange={(value) => updateField('ctaAction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_ACTIONS.map(a => (
                            <SelectItem key={a.value} value={a.value}>
                              <span className="flex items-center gap-2">
                                <a.icon className="h-3.5 w-3.5" />
                                {a.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(editingNudge.ctaAction === 'open_url' || editingNudge.ctaAction === 'schedule') && (
                    <Input
                      placeholder="https://..."
                      value={editingNudge.ctaUrl}
                      onChange={(e) => updateField('ctaUrl', e.target.value)}
                    />
                  )}
                  {editingNudge.ctaAction === 'call' && (
                    <Input
                      placeholder="Phone number"
                      value={editingNudge.ctaUrl}
                      onChange={(e) => updateField('ctaUrl', e.target.value)}
                    />
                  )}
                </div>

                {/* Secondary CTA (optional) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Secondary CTA</Label>
                    {editingNudge.secondaryCtaAction ? (
                      <Button size="sm" variant="ghost" onClick={() => {
                        updateField('secondaryCtaAction', null)
                        updateField('secondaryCtaText', '')
                        updateField('secondaryCtaUrl', '')
                      }}>
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => updateField('secondaryCtaAction', 'call')}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                  {editingNudge.secondaryCtaAction && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="e.g. Call Us"
                        value={editingNudge.secondaryCtaText}
                        onChange={(e) => updateField('secondaryCtaText', e.target.value)}
                      />
                      <Select
                        value={editingNudge.secondaryCtaAction}
                        onValueChange={(value) => updateField('secondaryCtaAction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTA_ACTIONS.map(a => (
                            <SelectItem key={a.value} value={a.value}>
                              <span className="flex items-center gap-2">
                                <a.icon className="h-3.5 w-3.5" />
                                {a.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Timing & Priority */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Show After</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={3}
                        max={300}
                        value={editingNudge.nudgeDelaySeconds}
                        onChange={(e) => updateField('nudgeDelaySeconds', parseInt(e.target.value) || 15)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">seconds</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={String(editingNudge.priority)}
                      onValueChange={(value) => updateField('priority', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Normal</SelectItem>
                        <SelectItem value="1">High</SelectItem>
                        <SelectItem value="2">Highest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* AI Context (collapsed) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Advanced: AI Context & Quick Replies
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div className="space-y-2">
                      <Label>Page Context (for AI)</Label>
                      <Textarea
                        placeholder="Extra context to help the AI give relevant responses on this page..."
                        value={editingNudge.pageContext}
                        onChange={(e) => updateField('pageContext', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Quick Reply Buttons</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateField('suggestedPrompts', [...(editingNudge.suggestedPrompts || []), ''])}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                      {(editingNudge.suggestedPrompts || []).map((prompt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder={`Quick reply ${i + 1}`}
                            value={prompt}
                            onChange={(e) => {
                              const updated = [...editingNudge.suggestedPrompts]
                              updated[i] = e.target.value
                              updateField('suggestedPrompts', updated)
                            }}
                          />
                          {editingNudge.suggestedPrompts.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => {
                              updateField('suggestedPrompts', editingNudge.suggestedPrompts.filter((_, j) => j !== i))
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                {/* Active toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable this nudge</p>
                  </div>
                  <Switch
                    checked={editingNudge.isActive}
                    onCheckedChange={(checked) => updateField('isActive', checked)}
                  />
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Preview</Label>
                <NudgePreview nudge={editingNudge} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
                  Save Nudge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Nudge?</DialogTitle>
            <DialogDescription>
              This will permanently delete this nudge. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Nudge Card (list item)
// ─────────────────────────────────────────────────────────────────────────────

function NudgeCard({ nudge, pageLabel, onEdit, onToggle, onDelete }) {
  const ctaAction = CTA_ACTIONS.find(a => a.value === nudge.cta_action)
  const CtaIcon = ctaAction?.icon || Zap

  return (
    <Card className={cn('transition-opacity', !nudge.is_active && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0',
            nudge.is_active
              ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10'
              : 'bg-muted'
          )}>
            <Zap className={cn('h-5 w-5', nudge.is_active ? 'text-emerald-600' : 'text-muted-foreground')} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-sm truncate">
                {nudge.headline || nudge.nudge_message?.slice(0, 50) || 'Untitled Nudge'}
              </span>
              <Badge variant={nudge.is_active ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                {nudge.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {nudge.priority > 0 && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  Priority {nudge.priority}
                </Badge>
              )}
            </div>

            {nudge.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-1.5">
                {nudge.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {pageLabel}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {nudge.nudge_delay_seconds}s
              </span>
              {nudge.cta_text && (
                <span className="flex items-center gap-1">
                  <CtaIcon className="h-3 w-3" />
                  {nudge.cta_text}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onToggle} title={nudge.is_active ? 'Disable' : 'Enable'}>
              <ToggleLeft className={cn('h-4 w-4', nudge.is_active && 'text-primary')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Nudge Preview (matches Uptrade screenshot style)
// ─────────────────────────────────────────────────────────────────────────────

function NudgePreview({ nudge }) {
  return (
    <div className="relative">
      {/* Fake page background */}
      <div className="bg-muted rounded-xl p-4 min-h-[300px] flex flex-col justify-end">
        {/* Nudge card */}
        <div className="bg-white rounded-xl shadow-lg p-4 space-y-3 border">
          {/* Close button */}
          <button className="absolute top-8 right-8 text-muted-foreground/50 hover:text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Icon + Headline */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-snug">
                {nudge.headline || 'Your Headline'}
              </h4>
              {(nudge.description || nudge.nudgeMessage) && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {nudge.description || nudge.nudgeMessage || 'Your description text here...'}
                </p>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          {(nudge.ctaText || nudge.secondaryCtaText) && (
            <div className="flex items-center gap-2">
              {nudge.ctaText && (
                <button className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5">
                  {nudge.ctaText}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
              {nudge.secondaryCtaText && (
                <button className="px-4 py-2 border rounded-lg text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                  {nudge.secondaryCtaAction === 'call' && <Phone className="h-3 w-3" />}
                  {nudge.secondaryCtaText}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fake chat widget button */}
        <div className="flex justify-end mt-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
