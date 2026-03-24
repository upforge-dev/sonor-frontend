import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Palette,
  Type,
  User,
  Building,
  Globe,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Edit,
  Check,
  X,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
} from 'lucide-react'
import { portalApi } from '@/lib/sonor-api'

const SOCIAL_ICONS = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
}

export function BrandExtractView({ scrapeId, scrapeData, onRefresh }) {
  const [brand, setBrand] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    fetchBrand()
  }, [scrapeId])

  const fetchBrand = async () => {
    try {
      setLoading(true)
      const response = await portalApi.get(`/site-scrape/${scrapeId}/brand`)
      if (response.brand) {
        setBrand(response.brand)
      }
    } catch (err) {
      toast.error('Failed to load brand data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (field, value) => {
    setEditing(field)
    setEditValue(value || '')
  }

  const saveEdit = async (field) => {
    try {
      await portalApi.patch(`/site-scrape/${scrapeId}/brand`, {
        [field]: editValue,
      })
      setBrand((prev) => ({ ...prev, [field]: editValue }))
      toast.success('Updated successfully')
    } catch (err) {
      toast.error('Failed to update')
    }
    setEditing(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditValue('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="text-center py-12">
        <Palette className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          No Brand Data Available
        </h3>
        <p className="text-[var(--text-secondary)] mt-2">
          Brand extraction may still be in progress.
        </p>
        <Button onClick={fetchBrand} className="mt-4" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  const colors = brand.color_palette || {}
  const typography = brand.typography || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Brand Identity
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Extracted brand elements from the scraped site
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBrand}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Info */}
        <div className="space-y-4 p-4 bg-[var(--surface-secondary)] rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Building className="h-5 w-5 text-[var(--brand-primary)]" />
            <h4 className="font-semibold text-[var(--text-primary)]">Business Info</h4>
          </div>

          <EditableField
            label="Business Name"
            value={brand.business_name}
            field="business_name"
            editing={editing}
            editValue={editValue}
            setEditValue={setEditValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
            icon={Building}
          />

          <EditableField
            label="Tagline"
            value={brand.tagline}
            field="tagline"
            editing={editing}
            editValue={editValue}
            setEditValue={setEditValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
            icon={Type}
          />

          <EditableField
            label="Industry"
            value={brand.industry}
            field="industry"
            editing={editing}
            editValue={editValue}
            setEditValue={setEditValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
            icon={Globe}
          />
        </div>

        {/* Contact Info */}
        <div className="space-y-4 p-4 bg-[var(--surface-secondary)] rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-5 w-5 text-[var(--brand-primary)]" />
            <h4 className="font-semibold text-[var(--text-primary)]">Contact Info</h4>
          </div>

          <EditableField
            label="Email"
            value={brand.email}
            field="email"
            editing={editing}
            editValue={editValue}
            setEditValue={setEditValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
            icon={Mail}
          />

          <EditableField
            label="Phone"
            value={brand.phone}
            field="phone"
            editing={editing}
            editValue={editValue}
            setEditValue={setEditValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
            icon={Phone}
          />

          <EditableField
            label="Address"
            value={brand.address}
            field="address"
            editing={editing}
            editValue={editValue}
            setEditValue={setEditValue}
            onEdit={startEdit}
            onSave={saveEdit}
            onCancel={cancelEdit}
            icon={MapPin}
            multiline
          />
        </div>

        {/* Color Palette */}
        <div className="space-y-4 p-4 bg-[var(--surface-secondary)] rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-5 w-5 text-[var(--brand-primary)]" />
            <h4 className="font-semibold text-[var(--text-primary)]">Color Palette</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorSwatch label="Primary" color={colors.primary} />
            <ColorSwatch label="Secondary" color={colors.secondary} />
            <ColorSwatch label="Accent" color={colors.accent} />
            <ColorSwatch label="Background" color={colors.background} />
            <ColorSwatch label="Text" color={colors.text} />
          </div>

          {brand.detected_colors && brand.detected_colors.length > 0 && (
            <div className="pt-3 border-t border-[var(--glass-border)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">
                Other detected colors:
              </p>
              <div className="flex flex-wrap gap-2">
                {brand.detected_colors.slice(0, 8).map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-[var(--glass-border)]"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Typography */}
        <div className="space-y-4 p-4 bg-[var(--surface-secondary)] rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Type className="h-5 w-5 text-[var(--brand-primary)]" />
            <h4 className="font-semibold text-[var(--text-primary)]">Typography</h4>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Heading Font</p>
              <p
                className="text-lg font-bold text-[var(--text-primary)]"
                style={{ fontFamily: typography.headings }}
              >
                {typography.headings || 'Not detected'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Body Font</p>
              <p
                className="text-base text-[var(--text-secondary)]"
                style={{ fontFamily: typography.body }}
              >
                {typography.body || 'Not detected'}
              </p>
            </div>
          </div>

          {brand.detected_fonts && brand.detected_fonts.length > 0 && (
            <div className="pt-3 border-t border-[var(--glass-border)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-2">
                All detected fonts:
              </p>
              <div className="flex flex-wrap gap-1">
                {brand.detected_fonts.map((font, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {font}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Social Links */}
        <div className="space-y-4 p-4 bg-[var(--surface-secondary)] rounded-lg md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-[var(--brand-primary)]" />
            <h4 className="font-semibold text-[var(--text-primary)]">Social Links</h4>
          </div>

          <div className="flex flex-wrap gap-3">
            {brand.social_links &&
              Object.entries(brand.social_links).map(([platform, url]) => {
                if (!url) return null
                const Icon = SOCIAL_ICONS[platform] || Globe
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg',
                      'bg-[var(--surface-primary)] hover:bg-[var(--surface-hover)]',
                      'text-[var(--text-secondary)] hover:text-[var(--brand-primary)]',
                      'transition-colors'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm capitalize">{platform}</span>
                  </a>
                )
              })}
            {(!brand.social_links ||
              Object.values(brand.social_links).filter(Boolean).length === 0) && (
              <p className="text-sm text-[var(--text-tertiary)]">
                No social links detected
              </p>
            )}
          </div>
        </div>

        {/* Brand Personality */}
        {brand.brand_personality && brand.brand_personality.length > 0 && (
          <div className="space-y-4 p-4 bg-[var(--surface-secondary)] rounded-lg md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-[var(--brand-primary)]" />
              <h4 className="font-semibold text-[var(--text-primary)]">Brand Personality</h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {brand.brand_personality.map((trait, i) => (
                <Badge
                  key={i}
                  className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white"
                >
                  {trait}
                </Badge>
              ))}
            </div>

            {brand.tone_of_voice && (
              <div className="pt-3 border-t border-[var(--glass-border)]">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Tone of Voice</p>
                <p className="text-sm text-[var(--text-secondary)]">{brand.tone_of_voice}</p>
              </div>
            )}

            {brand.unique_value_proposition && (
              <div className="pt-3 border-t border-[var(--glass-border)]">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">
                  Unique Value Proposition
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {brand.unique_value_proposition}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EditableField({
  label,
  value,
  field,
  editing,
  editValue,
  setEditValue,
  onEdit,
  onSave,
  onCancel,
  icon: Icon,
  multiline,
}) {
  const isEditing = editing === field

  return (
    <div>
      <Label className="text-xs text-[var(--text-tertiary)]">{label}</Label>
      <div className="flex items-start gap-2 mt-1">
        <Icon className="h-4 w-4 text-[var(--text-tertiary)] mt-1 shrink-0" />
        {isEditing ? (
          <div className="flex-1 flex gap-2">
            {multiline ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 min-h-[60px]"
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
              />
            )}
            <Button size="icon" variant="ghost" onClick={() => onSave(field)}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-[var(--text-primary)]">
              {value || <span className="text-[var(--text-tertiary)] italic">Not set</span>}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => onEdit(field, value)}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ColorSwatch({ label, color }) {
  if (!color) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--glass-border)] flex items-center justify-center">
          <X className="h-4 w-4 text-[var(--text-tertiary)]" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
          <p className="text-sm text-[var(--text-secondary)]">Not set</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-lg border border-[var(--glass-border)]"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
        <p className="text-sm font-mono text-[var(--text-secondary)]">{color}</p>
      </div>
    </div>
  )
}

export default BrandExtractView
