// ═══════════════════════════════════════════════════════════════════════════════
// Portfolio Settings — Inline Panel
// Rendered inside PortfolioList's ModuleLayout.Content (no separate route).
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Save, Palette, Layout, Globe, Sparkles, Loader2 } from 'lucide-react'

const DEFAULT_SETTINGS = {
  defaultCategory: '',
  defaultTemplate: false,
  aiDirective: '',
  autoGenerateScreenshots: true,
  includeMetricsInGeneration: true,
}

export default function PortfolioSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: persist settings via portfolioApi
      await new Promise(r => setTimeout(r, 600))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">

      {/* ── General Settings ────────────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-lg">
            <Layout className="h-5 w-5 text-[var(--brand-primary)]" />
            General Settings
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="defaultCategory"
              className="text-sm text-[var(--text-primary)]"
            >
              Default Category
            </Label>
            <Input
              id="defaultCategory"
              placeholder="e.g. Web Design, Marketing, Branding"
              value={settings.defaultCategory}
              onChange={e => updateSetting('defaultCategory', e.target.value)}
              className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              New portfolio items will be created with this category by default.
            </p>
          </div>

          <Separator className="bg-[var(--glass-border)]" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm text-[var(--text-primary)]">
                Default Template
              </Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                Coming soon — apply a default layout template to new items.
              </p>
            </div>
            <Switch
              checked={settings.defaultTemplate}
              onCheckedChange={v => updateSetting('defaultTemplate', v)}
              disabled
              className="data-[state=checked]:bg-[var(--brand-primary)] opacity-50"
            />
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ── Brand Customization ─────────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-[var(--brand-primary)]" />
            Brand Customization
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Brand colors and fonts are configured at the organization level.
            Portfolio items inherit your org brand automatically.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings/brand')}
            className="border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
          >
            <Globe className="mr-1.5 h-4 w-4" />
            Open Brand Settings
          </Button>
        </GlassCardContent>
      </GlassCard>

      {/* ── AI Generation Defaults ──────────────────────────────────── */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            AI Generation Defaults
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="aiDirective"
              className="text-sm text-[var(--text-primary)]"
            >
              Default Directive
            </Label>
            <textarea
              id="aiDirective"
              rows={4}
              placeholder="Default instructions for AI when generating portfolio content..."
              value={settings.aiDirective}
              onChange={e => updateSetting('aiDirective', e.target.value)}
              className={cn(
                'flex w-full rounded-md border px-3 py-2 text-sm',
                'bg-[var(--glass-bg)] border-[var(--glass-border)]',
                'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-0',
                'resize-none',
              )}
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              These instructions are prepended to every AI generation request for portfolio content.
            </p>
          </div>

          <Separator className="bg-[var(--glass-border)]" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm text-[var(--text-primary)]">
                Auto-generate Screenshots
              </Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                Automatically capture screenshots when generating portfolio items from projects.
              </p>
            </div>
            <Switch
              checked={settings.autoGenerateScreenshots}
              onCheckedChange={v => updateSetting('autoGenerateScreenshots', v)}
              className="data-[state=checked]:bg-[var(--brand-primary)]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm text-[var(--text-primary)]">
                Include Metrics in Generation
              </Label>
              <p className="text-xs text-[var(--text-tertiary)]">
                Feed analytics and performance metrics to AI when generating portfolio descriptions.
              </p>
            </div>
            <Switch
              checked={settings.includeMetricsInGeneration}
              onCheckedChange={v => updateSetting('includeMetricsInGeneration', v)}
              className="data-[state=checked]:bg-[var(--brand-primary)]"
            />
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* ── Save ────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
        >
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
