// =============================================================================
// PortfolioEditor — Section-based portfolio case study editor
// Three-column layout: section list (left), section editor (center), meta (right)
// Uses ModuleLayout with left + right sidebars, GlassCard surfaces, CSS variables.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ModuleLayout from '@/components/ModuleLayout'
import { MODULE_ICONS } from '@/lib/module-icons'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { SonorSpinner } from '@/components/SonorLoading'
import { portfolioApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Save, Eye, ExternalLink, RefreshCw, Plus, GripVertical,
  Trash2, Sparkles, ChevronDown, ChevronRight, Settings, Image,
  Type, Target, Zap, BarChart3, TrendingUp, Code, Users, Quote,
  Play, Layers, Star, Phone, Layout, ArrowUpDown, CheckCircle2,
  AlertTriangle, Clock, Globe, Edit2, Briefcase, FileText
} from 'lucide-react'

// =============================================================================
// Section type configuration — icons, labels, accent colors
// =============================================================================

const SECTION_TYPE_CONFIG = {
  portfolioHero:             { label: 'Hero',              icon: Layout,     color: 'brand' },
  portfolioChallenges:       { label: 'Challenges',        icon: Target,     color: 'orange' },
  portfolioStrategy:         { label: 'Strategy',          icon: Zap,        color: 'blue' },
  portfolioResults:          { label: 'Results',           icon: TrendingUp, color: 'emerald' },
  portfolioTechStack:        { label: 'Tech Stack',        icon: Code,       color: 'purple' },
  portfolioServices:         { label: 'Services',          icon: Briefcase,  color: 'teal' },
  portfolioTestimonial:      { label: 'Testimonial',       icon: Quote,      color: 'pink' },
  portfolioGallery:          { label: 'Gallery',           icon: Image,      color: 'amber' },
  portfolioVideo:            { label: 'Video',             icon: Play,       color: 'red' },
  portfolioTeam:             { label: 'Team',              icon: Users,      color: 'blue' },
  portfolioFeatureSpotlight: { label: 'Feature Spotlight', icon: Star,       color: 'brand' },
  portfolioBeforeAfter:      { label: 'Before / After',    icon: Layers,     color: 'purple' },
  portfolioMetricsTimeline:  { label: 'Metrics Timeline',  icon: BarChart3,  color: 'emerald' },
  portfolioConversionFunnel: { label: 'Conversion Funnel', icon: TrendingUp, color: 'blue' },
  portfolioDetails:          { label: 'Details',           icon: FileText,   color: 'teal' },
  portfolioSeo:              { label: 'SEO',               icon: Globe,      color: 'green' },
  portfolioCTA:              { label: 'Call to Action',     icon: Phone,      color: 'brand' },
}

// Map color names to Tailwind-compatible classes for icon backgrounds
const COLOR_MAP = {
  brand:   'bg-[var(--brand-primary)]',
  orange:  'bg-orange-500',
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple:  'bg-purple-500',
  teal:    'bg-teal-500',
  pink:    'bg-pink-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  green:   'bg-green-500',
}

const COLOR_MAP_MUTED = {
  brand:   'bg-[var(--brand-primary)]/15',
  orange:  'bg-orange-500/15',
  blue:    'bg-blue-500/15',
  emerald: 'bg-emerald-500/15',
  purple:  'bg-purple-500/15',
  teal:    'bg-teal-500/15',
  pink:    'bg-pink-500/15',
  amber:   'bg-amber-500/15',
  red:     'bg-red-500/15',
  green:   'bg-green-500/15',
}

const COLOR_MAP_TEXT = {
  brand:   'text-[var(--brand-primary)]',
  orange:  'text-orange-500',
  blue:    'text-blue-500',
  emerald: 'text-emerald-500',
  purple:  'text-purple-500',
  teal:    'text-teal-500',
  pink:    'text-pink-500',
  amber:   'text-amber-500',
  red:     'text-red-500',
  green:   'text-green-500',
}

// Available section types for the "Add Section" dropdown
const SECTION_TYPE_OPTIONS = Object.entries(SECTION_TYPE_CONFIG).map(([type, config]) => ({
  type,
  ...config,
}))

// Status badge styles
const STATUS_STYLES = {
  draft:     'bg-amber-500/10 text-amber-600 border-amber-500/20',
  published: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  archived:  'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

const GEN_STATUS_STYLES = {
  idle:       'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  generating: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  complete:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  failed:     'bg-red-500/10 text-red-500 border-red-500/20',
}

// =============================================================================
// Helper: format date
// =============================================================================

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// =============================================================================
// SectionIcon — Renders a section type icon with colored background
// =============================================================================

function SectionIcon({ type, size = 'md' }) {
  const config = SECTION_TYPE_CONFIG[type]
  if (!config) return null

  const Icon = config.icon
  const sizeClasses = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className={cn(
      'flex items-center justify-center rounded-lg shrink-0',
      sizeClasses,
      COLOR_MAP_MUTED[config.color] || 'bg-[var(--glass-bg)]',
    )}>
      <Icon className={cn(iconSize, COLOR_MAP_TEXT[config.color] || 'text-[var(--text-secondary)]')} />
    </div>
  )
}

// =============================================================================
// AddSectionMenu — Dropdown for adding a new section
// =============================================================================

function AddSectionMenu({ onAdd, disabled }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] backdrop-blur-xl shadow-lg overflow-hidden">
            <ScrollArea className="max-h-[320px]">
              <div className="p-1">
                {SECTION_TYPE_OPTIONS.map(({ type, label, icon: Icon, color }) => (
                  <button
                    key={type}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors text-left"
                    onClick={() => {
                      onAdd(type)
                      setOpen(false)
                    }}
                  >
                    <div className={cn(
                      'flex items-center justify-center h-6 w-6 rounded shrink-0',
                      COLOR_MAP_MUTED[color],
                    )}>
                      <Icon className={cn('h-3.5 w-3.5', COLOR_MAP_TEXT[color])} />
                    </div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// Left Sidebar — Section list with navigation and actions
// =============================================================================

function SectionListSidebar({
  sections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onBack,
  onOverview,
  loading,
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="px-3 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] -ml-1"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to list
        </Button>
      </div>

      <Separator className="bg-[var(--glass-border)]" />

      {/* Overview button */}
      <div className="px-2 pt-2">
        <button
          onClick={onOverview}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
            !selectedSectionId
              ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20'
              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'
          )}
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span className="font-medium">Overview</span>
        </button>
      </div>

      <Separator className="bg-[var(--glass-border)] mt-2" />

      {/* Section list header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Sections
        </span>
        <AddSectionMenu onAdd={onAddSection} disabled={loading} />
      </div>

      <Separator className="bg-[var(--glass-border)]" />

      {/* Section cards */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && sections.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <SonorSpinner size="sm" label="Loading sections..." />
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 px-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-[var(--brand-primary)]/10 mx-auto mb-3">
                <Layers className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">No sections yet</p>
              <p className="text-xs text-[var(--text-tertiary)]">Add sections to build your case study</p>
            </div>
          ) : (
            sections.map((section) => {
              const config = SECTION_TYPE_CONFIG[section._type] || SECTION_TYPE_CONFIG[section.sectionType] || {
                label: section._type || section.sectionType || 'Unknown',
                icon: FileText,
                color: 'brand',
              }
              const isActive = section._id === selectedSectionId || section.id === selectedSectionId
              const sectionId = section._id || section.id

              return (
                <SectionCard
                  key={sectionId}
                  section={section}
                  config={config}
                  isActive={isActive}
                  onClick={() => onSelectSection(sectionId)}
                />
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Section count footer */}
      {sections.length > 0 && (
        <>
          <Separator className="bg-[var(--glass-border)]" />
          <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// SectionCard — Individual section item in the sidebar list
// =============================================================================

function SectionCard({ section, config, isActive, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isGenerated = section.generated || section._createdAt
  const Icon = config.icon

  return (
    <button
      className={cn(
        'group flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-all duration-150',
        isActive
          ? 'bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30'
          : 'bg-[var(--glass-bg)] border border-transparent hover:bg-[var(--surface-secondary)] hover:border-[var(--glass-border)]',
      )}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn(
        'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
        COLOR_MAP_MUTED[config.color],
      )}>
        <Icon className={cn('h-4 w-4', COLOR_MAP_TEXT[config.color])} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]',
        )}>
          {config.label}
        </p>
        <p className="text-xs text-[var(--text-tertiary)] truncate">
          {isGenerated ? 'Generated' : 'Manual'}
        </p>
      </div>

      <GripVertical className={cn(
        'h-4 w-4 shrink-0 transition-opacity',
        hovered || isActive ? 'opacity-40' : 'opacity-0',
        'text-[var(--text-tertiary)] cursor-grab',
      )} />
    </button>
  )
}

// =============================================================================
// Center Panel — Section editor or overview
// =============================================================================

function SectionEditorPanel({
  section,
  sectionConfig,
  onSave,
  onRegenerate,
  onDelete,
  saving,
  regenerating,
}) {
  const [jsonContent, setJsonContent] = useState('')
  const [jsonError, setJsonError] = useState(null)
  const [directive, setDirective] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)

  // Initialize content when section changes
  useEffect(() => {
    if (section) {
      try {
        setJsonContent(JSON.stringify(section, null, 2))
        setJsonError(null)
      } catch {
        setJsonContent('')
        setJsonError('Failed to serialize section data')
      }
    }
  }, [section])

  const handleJsonChange = useCallback((value) => {
    setJsonContent(value)
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (e) {
      setJsonError(e.message)
    }
  }, [])

  const handleSave = useCallback(() => {
    if (jsonError) return
    try {
      const parsed = JSON.parse(jsonContent)
      onSave(parsed)
    } catch (e) {
      setJsonError(e.message)
    }
  }, [jsonContent, jsonError, onSave])

  const handleRegenerate = useCallback(() => {
    onRegenerate(directive || undefined)
    setDirective('')
    setShowRegenInput(false)
  }, [directive, onRegenerate])

  if (!section) return null

  const Icon = sectionConfig?.icon || FileText

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex items-center justify-center h-10 w-10 rounded-xl shrink-0',
          COLOR_MAP_MUTED[sectionConfig?.color || 'brand'],
        )}>
          <Icon className={cn('h-5 w-5', COLOR_MAP_TEXT[sectionConfig?.color || 'brand'])} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {sectionConfig?.label || 'Section'}
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            Type: {section._type || section.sectionType || 'unknown'}
          </p>
        </div>
      </div>

      {/* JSON Editor */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-base">Section Data</GlassCardTitle>
            <Badge variant="outline" className="text-xs font-mono border-[var(--glass-border)] text-[var(--text-tertiary)]">
              JSON
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            V1 editor — edit raw section data. A rich form editor is planned for a future release.
          </p>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="relative">
            <Textarea
              value={jsonContent}
              onChange={(e) => handleJsonChange(e.target.value)}
              className={cn(
                'font-mono text-xs min-h-[320px] resize-y',
                'bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]',
                'focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/30',
                jsonError && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30',
              )}
              spellCheck={false}
            />
            {jsonError && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">{jsonError}</span>
              </div>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* AI Regeneration */}
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
              <GlassCardTitle className="text-base">AI Regeneration</GlassCardTitle>
            </div>
            {!showRegenInput && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                onClick={() => setShowRegenInput(true)}
                disabled={regenerating}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate with AI
              </Button>
            )}
          </div>
        </GlassCardHeader>
        {showRegenInput && (
          <GlassCardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-[var(--text-secondary)] mb-1.5 block">
                  Directive (optional)
                </Label>
                <Textarea
                  value={directive}
                  onChange={(e) => setDirective(e.target.value)}
                  placeholder="e.g., Make the tone more professional, emphasize mobile performance gains..."
                  className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)] text-sm min-h-[80px] resize-y focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Regenerate
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowRegenInput(false); setDirective('') }}
                  disabled={regenerating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </GlassCardContent>
        )}
      </GlassCard>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          className="gap-1.5 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
          onClick={handleSave}
          disabled={saving || !!jsonError}
        >
          {saving ? (
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

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Section
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// OverviewPanel — Shown when no section is selected
// =============================================================================

function OverviewPanel({ item, sections, onSelectSection }) {
  if (!item) return null

  const genStatus = item.generation_status || item.generationStatus || 'idle'

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="text-center py-6">
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)]/70 mx-auto mb-4">
          <Briefcase className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
          {item.title || 'Untitled Portfolio Item'}
        </h2>
        {item.description && (
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant="outline" className={cn('text-xs border', STATUS_STYLES[item.status] || STATUS_STYLES.draft)}>
            {item.status || 'draft'}
          </Badge>
          <Badge variant="outline" className={cn('text-xs border', GEN_STATUS_STYLES[genStatus])}>
            {genStatus}
          </Badge>
        </div>
      </div>

      <Separator className="bg-[var(--glass-border)]" />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--brand-primary)]">{sections.length}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Sections</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {item.category || '--'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Category</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">
            {item.featured ? 'Yes' : 'No'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Featured</p>
        </GlassCard>
      </div>

      {/* Lighthouse Scores */}
      {item.lighthouse_scores && (item.lighthouse_scores.before || item.lighthouse_scores.after) && (
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--brand-primary)]" />
              Lighthouse Scores
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {['after', 'before'].filter(phase => item.lighthouse_scores[phase]).map(phase => {
              const scores = item.lighthouse_scores[phase]
              const categories = [
                { key: 'performance', label: 'Performance', value: scores.performance },
                { key: 'seo', label: 'SEO', value: scores.seo },
                { key: 'accessibility', label: 'Accessibility', value: scores.accessibility },
                { key: 'bestPractices', label: 'Best Practices', value: scores.bestPractices },
              ].filter(c => c.value != null)

              if (!categories.length) return null

              return (
                <div key={phase} className="mb-4 last:mb-0">
                  <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                    {phase === 'after' ? 'Current' : 'Before'}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map(({ key, label, value }) => {
                      const score = Math.round(value)
                      const color = score >= 90 ? 'rgb(34, 197, 94)' : score >= 50 ? 'rgb(234, 179, 8)' : 'rgb(239, 68, 68)'
                      const circumference = 2 * Math.PI * 28
                      const offset = circumference - (score / 100) * circumference
                      return (
                        <div key={key} className="flex flex-col items-center gap-1.5">
                          <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--glass-border)" strokeWidth="4" />
                              <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4"
                                strokeDasharray={circumference} strokeDashoffset={offset}
                                strokeLinecap="round" className="transition-all duration-700" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
                              {score}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--text-tertiary)] text-center leading-tight">{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {item.lighthouse_scores.before && item.lighthouse_scores.after && (
              <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { key: 'performance', label: 'Perf' },
                    { key: 'seo', label: 'SEO' },
                    { key: 'accessibility', label: 'A11y' },
                    { key: 'bestPractices', label: 'BP' },
                  ].map(({ key, label }) => {
                    const before = item.lighthouse_scores.before?.[key]
                    const after = item.lighthouse_scores.after?.[key]
                    if (before == null || after == null) return null
                    const diff = Math.round(after - before)
                    return (
                      <div key={key}>
                        <span className={cn('text-xs font-semibold', diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-[var(--text-tertiary)]')}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                        <p className="text-[9px] text-[var(--text-tertiary)]">{label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Section overview list */}
      {sections.length > 0 && (
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-base">Section Overview</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-1">
              {sections.map((section, idx) => {
                const sectionId = section._id || section.id
                const config = SECTION_TYPE_CONFIG[section._type] || SECTION_TYPE_CONFIG[section.sectionType] || {
                  label: section._type || section.sectionType || 'Unknown',
                  icon: FileText,
                  color: 'brand',
                }
                const Icon = config.icon

                return (
                  <button
                    key={sectionId}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-left hover:bg-[var(--brand-primary)]/5 transition-colors"
                    onClick={() => onSelectSection(sectionId)}
                  >
                    <span className="text-xs text-[var(--text-tertiary)] w-5 text-right shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className={cn(
                      'flex items-center justify-center h-6 w-6 rounded shrink-0',
                      COLOR_MAP_MUTED[config.color],
                    )}>
                      <Icon className={cn('h-3 w-3', COLOR_MAP_TEXT[config.color])} />
                    </div>
                    <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                      {config.label}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  </button>
                )
              })}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}

// =============================================================================
// Right Sidebar — Portfolio metadata panel
// =============================================================================

function MetadataSidebar({
  item,
  meta,
  onMetaChange,
  onSaveAll,
  onPublish,
  onUnpublish,
  onDelete,
  onRefreshMetrics,
  onResetGeneration,
  saving,
  refreshingMetrics,
}) {
  if (!item) return null

  const genStatus = item.generation_status || item.generationStatus || 'idle'
  const sourceProject = item.source_project || item.sourceProject
  const metricsBaseline = item.metrics_baseline_at || item.metricsBaselineAt
  const metricsRefreshed = item.metrics_refreshed_at || item.metricsRefreshedAt
  const isPublished = meta.status === 'published'

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Status
          </Label>
          <Select value={meta.status || 'draft'} onValueChange={(val) => onMetaChange('status', val)}>
            <SelectTrigger className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Slug
          </Label>
          <Input
            value={meta.slug || ''}
            onChange={(e) => onMetaChange('slug', e.target.value)}
            placeholder="my-project-case-study"
            className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/30"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Category
          </Label>
          <Input
            value={meta.category || ''}
            onChange={(e) => onMetaChange('category', e.target.value)}
            placeholder="e.g., Web Development, Branding"
            className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)] text-[var(--text-primary)] text-sm focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/30"
          />
        </div>

        {/* Featured toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Featured
          </Label>
          <Switch
            checked={meta.featured || false}
            onCheckedChange={(val) => onMetaChange('featured', val)}
          />
        </div>

        <Separator className="bg-[var(--glass-border)]" />

        {/* Source Project */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Source Project
          </Label>
          {sourceProject ? (
            <GlassCard variant="inset" className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--brand-primary)]/10 shrink-0">
                  <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {sourceProject.name || sourceProject.title || 'Project'}
                  </p>
                  {sourceProject.domain && (
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {sourceProject.domain}
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)] italic">No linked project</p>
          )}
        </div>

        {/* Generation Status */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Generation Status
          </Label>
          <Badge variant="outline" className={cn('text-xs border', GEN_STATUS_STYLES[genStatus])}>
            {genStatus}
          </Badge>
          {genStatus === 'generating' && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 text-xs mt-1"
              onClick={onResetGeneration}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Stuck Generation
            </Button>
          )}
        </div>

        <Separator className="bg-[var(--glass-border)]" />

        {/* Metrics */}
        <div className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Metrics
          </Label>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Baseline captured</span>
              <span className="text-[var(--text-primary)]">
                {formatDate(metricsBaseline) || 'none'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Last refreshed</span>
              <span className="text-[var(--text-primary)]">
                {formatDate(metricsRefreshed) || 'never'}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/30"
            onClick={onRefreshMetrics}
            disabled={refreshingMetrics}
          >
            {refreshingMetrics ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Metrics
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            disabled
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View Metrics Delta
          </Button>
        </div>

        <Separator className="bg-[var(--glass-border)]" />

        {/* Actions */}
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Actions
          </Label>

          <Button
            className="w-full gap-1.5 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
            onClick={onSaveAll}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save All Changes
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full gap-1.5 border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/30"
            onClick={isPublished ? onUnpublish : onPublish}
          >
            {isPublished ? (
              <>
                <Eye className="h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Publish
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete Portfolio Item
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}

// =============================================================================
// PortfolioEditor — Main component
// =============================================================================

export default function PortfolioEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentOrg } = useAuthStore()

  // ── State ──
  const [item, setItem] = useState(null)
  const [sections, setSections] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [refreshingMetrics, setRefreshingMetrics] = useState(false)

  // Editable metadata (local state that tracks item fields)
  const [meta, setMeta] = useState({
    status: 'draft',
    slug: '',
    category: '',
    featured: false,
  })

  // ── Fetch portfolio item ──
  const fetchItem = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await portfolioApi.getItem(id)
      const data = res.data?.data || res.data
      setItem(data)
      setMeta({
        status: data.status || 'draft',
        slug: data.slug || '',
        category: data.category || '',
        featured: !!data.featured,
      })

      // Fetch sections from Sanity via portfolio API
      if (data.sanity_document_id || data.sanityDocumentId) {
        setSectionsLoading(true)
        try {
          const secRes = await portfolioApi.getSections(data.id)
          const secData = secRes.data?.data || secRes.data || []
          setSections(Array.isArray(secData) ? secData : [])
        } catch (secErr) {
          console.error('Failed to fetch sections:', secErr)
          setSections([])
        } finally {
          setSectionsLoading(false)
        }
      }
    } catch (err) {
      console.error('Failed to fetch portfolio item:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load portfolio item')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchItem()
  }, [fetchItem])

  // ── Derived ──
  const sanityId = item?.sanity_document_id || item?.sanityDocumentId
  const selectedSection = useMemo(
    () => sections.find((s) => (s._id || s.id) === selectedSectionId) || null,
    [sections, selectedSectionId]
  )
  const selectedSectionConfig = useMemo(() => {
    if (!selectedSection) return null
    const type = selectedSection._type || selectedSection.sectionType
    return SECTION_TYPE_CONFIG[type] || {
      label: type || 'Unknown',
      icon: FileText,
      color: 'brand',
    }
  }, [selectedSection])

  // ── Handlers ──
  const handleMetaChange = useCallback((field, value) => {
    setMeta((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSaveAll = useCallback(async () => {
    if (!id) return
    setSaving(true)
    try {
      await portfolioApi.updateItem(id, {
        status: meta.status,
        slug: meta.slug,
        category: meta.category,
        featured: meta.featured,
      })
      // Refresh item data
      const res = await portfolioApi.getItem(id)
      const data = res.data?.data || res.data
      setItem(data)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }, [id, meta])

  const handleSaveSection = useCallback(async (sectionData) => {
    if (!sanityId || !selectedSectionId) return
    setSaving(true)
    try {
      await portfolioApi.updateSection(sanityId, selectedSectionId, sectionData)
      // Refresh sections
      const secRes = await portfolioApi.getSections(sanityId)
      const secData = secRes.data?.data || secRes.data || []
      setSections(Array.isArray(secData) ? secData : [])
    } catch (err) {
      console.error('Failed to save section:', err)
    } finally {
      setSaving(false)
    }
  }, [sanityId, selectedSectionId])

  const handleRegenerateSection = useCallback(async (directive) => {
    if (!id || !selectedSectionId) return
    setRegenerating(true)
    try {
      const sectionType = selectedSection?._type || selectedSection?.sectionType
      await portfolioApi.regenerateSection(id, {
        sectionId: selectedSectionId,
        sectionType,
        directive,
      })
      // Refresh sections after regeneration
      if (sanityId) {
        const secRes = await portfolioApi.getSections(sanityId)
        const secData = secRes.data?.data || secRes.data || []
        setSections(Array.isArray(secData) ? secData : [])
      }
    } catch (err) {
      console.error('Failed to regenerate section:', err)
    } finally {
      setRegenerating(false)
    }
  }, [id, selectedSectionId, selectedSection, sanityId])

  const handleDeleteSection = useCallback(async () => {
    if (!sanityId || !selectedSectionId) return
    if (!window.confirm('Delete this section? This cannot be undone.')) return
    try {
      await portfolioApi.deleteSection(sanityId, selectedSectionId)
      setSelectedSectionId(null)
      // Refresh sections
      const secRes = await portfolioApi.getSections(sanityId)
      const secData = secRes.data?.data || secRes.data || []
      setSections(Array.isArray(secData) ? secData : [])
    } catch (err) {
      console.error('Failed to delete section:', err)
    }
  }, [sanityId, selectedSectionId])

  const handleAddSection = useCallback(async (sectionType) => {
    if (!sanityId) return
    try {
      const res = await portfolioApi.addSection(sanityId, { _type: sectionType, sectionType })
      const newSection = res.data?.data || res.data
      // Refresh sections
      const secRes = await portfolioApi.getSections(sanityId)
      const secData = secRes.data?.data || secRes.data || []
      setSections(Array.isArray(secData) ? secData : [])
      // Auto-select the new section
      if (newSection?._id || newSection?.id) {
        setSelectedSectionId(newSection._id || newSection.id)
      }
    } catch (err) {
      console.error('Failed to add section:', err)
    }
  }, [sanityId])

  const handlePublish = useCallback(async () => {
    if (!id) return
    try {
      await portfolioApi.publishItem(id)
      setMeta((prev) => ({ ...prev, status: 'published' }))
      const res = await portfolioApi.getItem(id)
      setItem(res.data?.data || res.data)
    } catch (err) {
      console.error('Failed to publish:', err)
    }
  }, [id])

  const handleUnpublish = useCallback(async () => {
    if (!id) return
    try {
      await portfolioApi.unpublishItem(id)
      setMeta((prev) => ({ ...prev, status: 'draft' }))
      const res = await portfolioApi.getItem(id)
      setItem(res.data?.data || res.data)
    } catch (err) {
      console.error('Failed to unpublish:', err)
    }
  }, [id])

  const handleDeleteItem = useCallback(() => {
    if (!id) return
    setDeleteDialogOpen(true)
  }, [id])

  const confirmDeleteItem = useCallback(async () => {
    if (!id) return
    setDeleting(true)
    try {
      await portfolioApi.deleteItem(id)
      navigate('/portfolio')
    } catch (err) {
      console.error('Failed to delete:', err)
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }, [id, navigate])

  const handleResetGeneration = useCallback(async () => {
    if (!id) return
    try {
      await portfolioApi.resetGeneration(id)
      const res = await portfolioApi.getItem(id)
      if (res?.data) setItem(res.data)
    } catch (err) {
      console.error('Failed to reset generation:', err)
    }
  }, [id])

  const handleRefreshMetrics = useCallback(async () => {
    if (!id) return
    setRefreshingMetrics(true)
    try {
      await portfolioApi.refreshMetrics(id)
      const res = await portfolioApi.getItem(id)
      setItem(res.data?.data || res.data)
    } catch (err) {
      console.error('Failed to refresh metrics:', err)
    } finally {
      setRefreshingMetrics(false)
    }
  }, [id])

  const handleBack = useCallback(() => {
    navigate('/portfolio')
  }, [navigate])

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-0">
        <SonorSpinner size="lg" label="Loading portfolio item..." />
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-0 p-4">
        <GlassCard className="max-w-md w-full p-6 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-500/10 mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Failed to load portfolio item
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{error}</p>
          <Button
            variant="outline"
            className="gap-1.5 border-[var(--glass-border)]"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolio
          </Button>
        </GlassCard>
      </div>
    )
  }

  // ── Breadcrumbs ──
  const itemTitle = item?.title || 'Untitled'
  const breadcrumbs = [
    { label: 'Portfolio', href: '/portfolio' },
    { label: itemTitle },
  ]

  // ── Header actions ──
  const headerActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10"
        disabled
      >
        <Eye className="h-3.5 w-3.5" />
        Preview
      </Button>
      <Button
        size="sm"
        className="gap-1.5 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90"
        onClick={handleSaveAll}
        disabled={saving}
      >
        {saving ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-3.5 w-3.5" />
            Save
          </>
        )}
      </Button>
    </>
  )

  // ── Left sidebar content ──
  const leftSidebarContent = (
    <SectionListSidebar
      sections={sections}
      selectedSectionId={selectedSectionId}
      onSelectSection={setSelectedSectionId}
      onAddSection={handleAddSection}
      onBack={handleBack}
      onOverview={() => setSelectedSectionId(null)}
      loading={sectionsLoading}
    />
  )

  // ── Right sidebar content ──
  const rightSidebarContent = (
    <MetadataSidebar
      item={item}
      meta={meta}
      onMetaChange={handleMetaChange}
      onSaveAll={handleSaveAll}
      onPublish={handlePublish}
      onUnpublish={handleUnpublish}
      onDelete={handleDeleteItem}
      onRefreshMetrics={handleRefreshMetrics}
      onResetGeneration={handleResetGeneration}
      saving={saving}
      refreshingMetrics={refreshingMetrics}
    />
  )

  return (
    <ModuleLayout
      leftSidebar={leftSidebarContent}
      rightSidebar={rightSidebarContent}
      defaultLeftSidebarOpen={true}
      defaultRightSidebarOpen={true}
      leftSidebarTitle="Sections"
      rightSidebarTitle="Portfolio Settings"
      ariaLabel="Portfolio Editor"
    >
      <ModuleLayout.Header
        title={itemTitle}
        icon={MODULE_ICONS.portfolio}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />
      <ModuleLayout.Content noPadding>
        {selectedSection ? (
          <SectionEditorPanel
            section={selectedSection}
            sectionConfig={selectedSectionConfig}
            onSave={handleSaveSection}
            onRegenerate={handleRegenerateSection}
            onDelete={handleDeleteSection}
            saving={saving}
            regenerating={regenerating}
          />
        ) : (
          <OverviewPanel
            item={item}
            sections={sections}
            onSelectSection={setSelectedSectionId}
          />
        )}
      </ModuleLayout.Content>

      {/* Branded Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !deleting && setDeleteDialogOpen(open)}>
      <DialogContent className="sm:max-w-md bg-[var(--surface-primary)] border-[var(--glass-border)] backdrop-blur-2xl p-0 overflow-hidden">
        {deleting ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <SonorSpinner size="lg" />
            <p className="text-sm text-[var(--text-secondary)] animate-pulse">Deleting portfolio item...</p>
          </div>
        ) : (
          <>
            <div className="px-6 pt-8 pb-4 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Delete Portfolio Item
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">
                This will permanently delete <span className="font-medium text-[var(--text-primary)]">{item?.title}</span> and all its generated sections. This cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[var(--glass-border)] hover:bg-[var(--glass-bg)]"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                onClick={confirmDeleteItem}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </>
        )}
      </DialogContent>
      </Dialog>
    </ModuleLayout>
  )
}
