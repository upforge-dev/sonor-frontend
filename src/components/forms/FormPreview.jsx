/**
 * FormPreview - Renders a live preview of a managed form
 * 
 * This component displays form fields in a read-only preview format,
 * matching how the form would appear to end users.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Star,
  Upload,
  Image,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'

// Normalize field.options to an array of { label, value } (API may return object or non-array)
function getFieldOptions(field) {
  const raw = field?.options
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw.map(opt =>
    typeof opt === 'string'
      ? { label: opt, value: opt.toLowerCase().replace(/\s+/g, '_') }
      : { label: opt?.label ?? opt?.value ?? '', value: opt?.value ?? String(opt?.label ?? '').toLowerCase().replace(/\s+/g, '_') }
  )
}

// =============================================================================
// PREVIEW FIELD INPUT - Renders actual form inputs for preview
// =============================================================================

function PreviewFieldInput({ field }) {
  const effectivePlaceholder = field.placeholder || `Enter ${field.label?.toLowerCase() || 'value'}...`
  
  const baseInputClass = "w-full px-3 py-2.5 rounded-lg border border-[var(--input-border)] text-sm bg-[var(--input-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
  
  switch (field.field_type) {
    case 'text':
    case 'number':
      return (
        <input 
          type={field.field_type}
          placeholder={effectivePlaceholder}
          className={baseInputClass}
          disabled
        />
      )
    
    case 'email':
      return (
        <input 
          type="email"
          placeholder={field.placeholder || 'your@email.com'}
          className={baseInputClass}
          disabled
        />
      )
    
    case 'phone':
      return (
        <input 
          type="tel"
          placeholder={field.placeholder || '(555) 123-4567'}
          className={baseInputClass}
          disabled
        />
      )
    
    case 'textarea':
      return (
        <textarea 
          placeholder={field.placeholder || 'Enter your message...'}
          className={cn(baseInputClass, "min-h-[100px] resize-none")}
          disabled
        />
      )
    
    case 'select':
      return (
        <select className={cn(baseInputClass, "cursor-not-allowed")} disabled>
          <option value="">{field.placeholder || 'Select an option...'}</option>
          {getFieldOptions(field).map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    
    case 'checkbox':
      return (
        <label className="flex items-center gap-3">
          <input 
            type="checkbox" 
            className="w-5 h-5 rounded border-[var(--input-border)] text-[var(--brand-primary)]" 
            disabled
          />
          <span className="text-sm text-[var(--text-secondary)]">{field.placeholder || 'I agree to the terms'}</span>
        </label>
      )
    
    case 'radio': {
      const opts = getFieldOptions(field)
      return (
        <div className="space-y-2">
          {(opts.length > 0 ? opts : [{ label: 'Option 1', value: 'option_1' }]).map((opt, i) => (
            <label key={i} className="flex items-center gap-3">
              <input 
                type="radio" 
                name={field.slug} 
                className="w-5 h-5 border-[var(--input-border)] text-[var(--brand-primary)]" 
                disabled
              />
              <span className="text-sm text-[var(--text-secondary)]">{opt.label}</span>
            </label>
          ))}
        </div>
      )
    }
    
    case 'date':
      return (
        <input 
          type="date"
          className={baseInputClass}
          disabled
        />
      )
    
    case 'time':
      return (
        <input 
          type="time"
          className={baseInputClass}
          disabled
        />
      )
    
    case 'file':
      return (
        <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-[var(--input-border)] rounded-lg bg-[var(--glass-bg)]">
          <div className="text-center">
            <Upload className="h-6 w-6 mx-auto text-[var(--text-tertiary)] mb-1" />
            <span className="text-sm text-[var(--text-secondary)]">Drop files here or click to upload</span>
          </div>
        </div>
      )
    
    case 'image':
      return (
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--input-border)] rounded-lg bg-[var(--glass-bg)]">
          <div className="text-center">
            <Image className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
            <span className="text-sm text-[var(--text-secondary)]">Drop image or click to browse</span>
            <span className="block text-xs text-[var(--text-tertiary)] mt-1">PNG, JPG, GIF up to 10MB</span>
          </div>
        </div>
      )
    
    case 'rating':
      return (
        <div className="flex gap-1">
          {[1,2,3,4,5].map(star => (
            <Star key={star} className="h-6 w-6 text-[var(--text-tertiary)]" />
          ))}
        </div>
      )
    
    case 'heading':
      return (
        <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--glass-border)] pb-2">
          {field.label}
        </h3>
      )
    
    case 'paragraph':
      return (
        <p className="text-sm text-[var(--text-secondary)]">
          {field.placeholder || 'Descriptive text appears here...'}
        </p>
      )
    
    case 'hidden':
      return null
    
    case 'slider':
      return (
        <input 
          type="range"
          min={field.validation?.min || 0}
          max={field.validation?.max || 100}
          className="w-full h-2 bg-[var(--glass-bg)] rounded-lg appearance-none cursor-not-allowed"
          disabled
        />
      )
    
    default:
      return (
        <input 
          type="text"
          placeholder={effectivePlaceholder}
          className={baseInputClass}
          disabled
        />
      )
  }
}

// =============================================================================
// PREVIEW FIELD - Renders a single field with label
// =============================================================================

function PreviewField({ field }) {
  const isDisplayField = ['heading', 'paragraph'].includes(field.field_type)
  const isHidden = field.field_type === 'hidden'
  
  if (isHidden) return null
  
  return (
    <div className="space-y-1.5">
      {/* Label */}
      {!isDisplayField && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {field.label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input */}
      <PreviewFieldInput field={field} />
      
      {/* Help text */}
      {field.help_text && (
        <p className="text-xs text-[var(--text-tertiary)]">{field.help_text}</p>
      )}
    </div>
  )
}

// =============================================================================
// FORM PREVIEW COMPONENT
// =============================================================================

export default function FormPreview({ form, fields = [], className }) {
  const [viewMode, setViewMode] = useState('desktop')
  
  // Sort fields by sort_order
  const sortedFields = [...fields].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  
  // Group fields into rows based on width
  // half + half = 1 row, full = 1 row, half alone = 1 row
  const groupFieldsIntoRows = (fields) => {
    const rows = []
    let i = 0
    
    while (i < fields.length) {
      const field = fields[i]
      
      // Skip hidden fields in layout
      if (field.field_type === 'hidden') {
        i++
        continue
      }
      
      if (field.width === 'half') {
        // Check if next field is also half-width
        const nextField = fields[i + 1]
        if (nextField && nextField.width === 'half' && nextField.field_type !== 'hidden') {
          // Pair them together
          rows.push({ type: 'pair', fields: [field, nextField] })
          i += 2
        } else {
          // Single half-width field takes half the row
          rows.push({ type: 'half', field })
          i++
        }
      } else {
        // Full width field
        rows.push({ type: 'full', field })
        i++
      }
    }
    
    return rows
  }
  
  const fieldRows = groupFieldsIntoRows(sortedFields)
  
  const previewWidthClass = {
    desktop: 'w-full max-w-2xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[375px] max-w-full'
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Device Toggle */}
      <div className="flex justify-center gap-1 p-1 bg-[var(--glass-bg)] rounded-lg w-fit mx-auto">
        <button
          onClick={() => setViewMode('desktop')}
          className={cn(
            "p-2 rounded-md transition-colors",
            viewMode === 'desktop' 
              ? "bg-white dark:bg-gray-800 shadow-sm" 
              : "hover:bg-[var(--glass-bg-hover)]"
          )}
          title="Desktop view"
        >
          <Monitor className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={() => setViewMode('tablet')}
          className={cn(
            "p-2 rounded-md transition-colors",
            viewMode === 'tablet' 
              ? "bg-white dark:bg-gray-800 shadow-sm" 
              : "hover:bg-[var(--glass-bg-hover)]"
          )}
          title="Tablet view"
        >
          <Tablet className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={() => setViewMode('mobile')}
          className={cn(
            "p-2 rounded-md transition-colors",
            viewMode === 'mobile' 
              ? "bg-white dark:bg-gray-800 shadow-sm" 
              : "hover:bg-[var(--glass-bg-hover)]"
          )}
          title="Mobile view"
        >
          <Smartphone className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>
      
      {/* Form Preview */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div 
          className={cn(
            "bg-white dark:bg-gray-900 rounded-xl border border-[var(--glass-border)] p-6 transition-all duration-300",
            previewWidthClass[viewMode]
          )}
        >
          {/* Form Header */}
          {form?.name && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{form.name}</h2>
              {form.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-1">{form.description}</p>
              )}
            </div>
          )}
          
          {/* Form Instructions */}
          {form?.instructions && (
            <div className="mb-6 p-4 bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)]">
              <p className="text-sm text-[var(--text-secondary)]">{form.instructions}</p>
            </div>
          )}
          
          {/* Form Fields */}
          {fieldRows.length > 0 ? (
            <div className="space-y-4">
              {fieldRows.map((row, rowIndex) => {
                if (row.type === 'pair') {
                  // Two half-width fields side by side
                  // On mobile, stack them
                  return (
                    <div 
                      key={rowIndex} 
                      className={cn(
                        "grid gap-4",
                        viewMode === 'mobile' ? "grid-cols-1" : "grid-cols-2"
                      )}
                    >
                      <PreviewField field={row.fields[0]} />
                      <PreviewField field={row.fields[1]} />
                    </div>
                  )
                } else if (row.type === 'half') {
                  // Single half-width field
                  return (
                    <div 
                      key={rowIndex} 
                      className={cn(
                        viewMode === 'mobile' ? "w-full" : "w-1/2"
                      )}
                    >
                      <PreviewField field={row.field} />
                    </div>
                  )
                } else {
                  // Full width field
                  return (
                    <div key={rowIndex}>
                      <PreviewField field={row.field} />
                    </div>
                  )
                }
              })}
              
              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  className="w-full text-white"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  disabled
                >
                  {form?.submit_button_text || 'Submit'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[var(--text-tertiary)]">No fields configured</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Add fields to see the form preview
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
