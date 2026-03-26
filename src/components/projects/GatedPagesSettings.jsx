/**
 * GatedPagesSettings - Configure gated page URLs and metadata fields
 *
 * Each gated page config defines:
 * - label: Display name shown in the "Send Gated Link" dialog
 * - url: The full URL of the gated page (e.g. https://charter.queencityriverboats.com)
 * - metadataFields: Dynamic fields that appear in the dialog (select dropdowns, text inputs)
 *   Each field has: key, label, type ('select' | 'text'), and options (for select type)
 *
 * Stored in project.settings.gated_pages as a JSON array.
 */
import { useState } from 'react'
import {
  Link2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Tag, Globe, Type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function generateId() {
  return `gp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * A single gated page config editor
 */
function GatedPageEditor({ config, onChange, onRemove, isOnly }) {
  const [expanded, setExpanded] = useState(true)

  const updateField = (field, value) => {
    onChange({ ...config, [field]: value })
  }

  const addMetadataField = () => {
    const fields = config.metadataFields || []
    onChange({
      ...config,
      metadataFields: [...fields, { key: '', label: '', type: 'text', options: [] }],
    })
  }

  const updateMetadataField = (index, updates) => {
    const fields = [...(config.metadataFields || [])]
    fields[index] = { ...fields[index], ...updates }
    onChange({ ...config, metadataFields: fields })
  }

  const removeMetadataField = (index) => {
    const fields = [...(config.metadataFields || [])]
    fields.splice(index, 1)
    onChange({ ...config, metadataFields: fields })
  }

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
      {/* Header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Link2 className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {config.label || 'Untitled Page'}
          </p>
          {config.url && (
            <p className="text-xs text-muted-foreground truncate">{config.url}</p>
          )}
        </div>
        {config.metadataFields?.length > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {config.metadataFields.length} field{config.metadataFields.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-[var(--glass-border)] p-4 space-y-4">
          {/* Label + URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Label
              </Label>
              <Input
                value={config.label || ''}
                onChange={(e) => updateField('label', e.target.value)}
                placeholder="e.g. Charter Pricing"
                className="glass-inset"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                URL
              </Label>
              <Input
                value={config.url || ''}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://charter.example.com"
                className="glass-inset"
              />
            </div>
          </div>

          {/* Metadata Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Type className="h-3 w-3" />
                Metadata Fields
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={addMetadataField}
              >
                <Plus className="h-3 w-3" />
                Add Field
              </Button>
            </div>

            {(config.metadataFields || []).length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No metadata fields. These appear as dropdowns or inputs in the "Send Gated Link" dialog.
              </p>
            )}

            {(config.metadataFields || []).map((field, i) => (
              <MetadataFieldEditor
                key={i}
                field={field}
                onChange={(updates) => updateMetadataField(i, updates)}
                onRemove={() => removeMetadataField(i)}
              />
            ))}
          </div>

          {/* Remove button */}
          {!isOnly && (
            <div className="flex justify-end pt-2 border-t border-[var(--glass-border)]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5"
                onClick={onRemove}
              >
                <Trash2 className="h-3 w-3" />
                Remove Page
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Single metadata field row editor
 */
function MetadataFieldEditor({ field, onChange, onRemove }) {
  const updateOptions = (optionsStr) => {
    const options = optionsStr.split(',').map(o => o.trim()).filter(Boolean)
    onChange({ options })
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-dashed border-[var(--glass-border)] bg-muted/20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 flex-1">
        <Input
          value={field.key || ''}
          onChange={(e) => onChange({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
          placeholder="key"
          className="glass-inset text-xs"
        />
        <Input
          value={field.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label"
          className="glass-inset text-xs"
        />
        <Select
          value={field.type || 'text'}
          onValueChange={(val) => onChange({ type: val })}
        >
          <SelectTrigger className="glass-inset text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="select">Select</SelectItem>
          </SelectContent>
        </Select>
        {field.type === 'select' && (
          <Input
            value={(field.options || []).join(', ')}
            onChange={(e) => updateOptions(e.target.value)}
            placeholder="option1, option2, ..."
            className="glass-inset text-xs"
          />
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

/**
 * Main Gated Pages settings card
 */
export default function GatedPagesSettings({ gatedPages = [], onChange, isAdmin }) {
  const handleAdd = () => {
    onChange([
      ...gatedPages,
      { id: generateId(), label: '', url: '', metadataFields: [] },
    ])
  }

  const handleUpdate = (index, updated) => {
    const pages = [...gatedPages]
    pages[index] = updated
    onChange(pages)
  }

  const handleRemove = (index) => {
    const pages = [...gatedPages]
    pages.splice(index, 1)
    onChange(pages)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Gated Pages
        </CardTitle>
        <CardDescription>
          Configure external pages that prospects can access via magic links from the CRM.
          Each page can have custom metadata fields (e.g. vessel, plan tier) that get passed
          to the gated page via the token.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {gatedPages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="p-3 rounded-xl bg-muted/50">
              <Link2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No gated pages configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a page to enable the "Send Gated Link" feature in the CRM.
              </p>
            </div>
          </div>
        ) : (
          gatedPages.map((config, i) => (
            <GatedPageEditor
              key={config.id || i}
              config={config}
              onChange={(updated) => handleUpdate(i, updated)}
              onRemove={() => handleRemove(i)}
              isOnly={gatedPages.length === 1}
            />
          ))
        )}

        {isAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Gated Page
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
