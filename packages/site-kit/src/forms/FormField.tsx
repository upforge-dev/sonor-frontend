/**
 * @uptrade/site-kit/forms - Form Field Component
 * 
 * Renders individual form fields based on type.
 * 
 * Styling Options:
 * 1. Use CSS variables to customize the default styles
 * 2. Use the `className` prop on ManagedForm for scoped styles
 * 3. Use the custom render function for complete control
 * 
 * CSS Variables (set these in your stylesheet):
 * --uptrade-input-bg: #ffffff
 * --uptrade-input-border: #d1d5db
 * --uptrade-input-border-focus: #3b82f6
 * --uptrade-input-border-error: #ef4444
 * --uptrade-input-radius: 6px
 * --uptrade-input-padding: 10px 12px
 * --uptrade-label-color: inherit
 * --uptrade-label-weight: 500
 * --uptrade-error-color: #ef4444
 * --uptrade-help-color: #6b7280
 * --uptrade-font-size: 16px
 */

'use client'

import React from 'react'
import type { FormField as FormFieldType } from './types'

interface FormFieldProps {
  field: FormFieldType
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  /** Optional class name prefix for custom styling */
  classPrefix?: string
}

/**
 * Normalize options from various DB formats into [{value, label}]
 * Handles:
 *  - [{value, label}] → pass through
 *  - {choices: ["A", "B"]} → [{value: "A", label: "A"}, ...]
 *  - ["A", "B"] → [{value: "A", label: "A"}, ...]
 */
function normalizeOptions(options: unknown): { value: string; label: string }[] {
  if (!options) return []
  if (Array.isArray(options)) {
    return options.map((opt) => {
      if (typeof opt === 'string') return { value: opt, label: opt }
      if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) return opt as { value: string; label: string }
      if (typeof opt === 'object' && opt !== null && 'label' in opt) return { value: (opt as any).label, label: (opt as any).label }
      return { value: String(opt), label: String(opt) }
    })
  }
  if (typeof options === 'object' && options !== null) {
    const obj = options as Record<string, unknown>
    if (Array.isArray(obj.choices)) return normalizeOptions(obj.choices)
    if (Array.isArray(obj.items)) return normalizeOptions(obj.items)
    if (Array.isArray(obj.options)) return normalizeOptions(obj.options)
  }
  return []
}

export function FormField({ field, value, error, onChange, classPrefix = 'uptrade-form' }: FormFieldProps) {
  // Normalize options once
  const options = normalizeOptions(field.options)
  // Use CSS variables with inline style fallbacks
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--uptrade-input-padding, 10px 12px)',
    fontSize: 'var(--uptrade-font-size, 16px)',
    border: error 
      ? '1px solid var(--uptrade-input-border-error, #ef4444)' 
      : '1px solid var(--uptrade-input-border, #d1d5db)',
    borderRadius: 'var(--uptrade-input-radius, 6px)',
    backgroundColor: 'var(--uptrade-input-bg, #ffffff)',
    outline: 'none',
    fontFamily: 'inherit',
  }
  
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontWeight: 'var(--uptrade-label-weight, 500)' as any,
    color: 'var(--uptrade-label-color, inherit)',
  }
  
  const errorStyle: React.CSSProperties = {
    color: 'var(--uptrade-error-color, #ef4444)',
    fontSize: 14,
    marginTop: 4,
  }
  
  const helpStyle: React.CSSProperties = {
    color: 'var(--uptrade-help-color, #6b7280)',
    fontSize: 14,
    marginTop: 4,
  }
  
  // Heading / Section Header (display only)
  if (field.field_type === 'heading' || field.field_type === 'section_header') {
    return <h3 className={`${classPrefix}__heading`} style={{ margin: '16px 0 8px', fontWeight: 600, fontSize: 18 }}>{field.label}</h3>
  }
  
  // Paragraph (display only)
  if (field.field_type === 'paragraph') {
    return <p className={`${classPrefix}__paragraph`} style={{ color: 'var(--uptrade-help-color, #6b7280)', margin: '8px 0' }}>{field.help_text || field.label}</p>
  }
  
  // Hidden field
  if (field.field_type === 'hidden') {
    return <input type="hidden" name={field.slug} value={String(value || '')} />
  }
  
  return (
    <div className={`${classPrefix}__field ${classPrefix}__field--${field.field_type}`}>
      <label className={`${classPrefix}__label`} style={labelStyle}>
        {field.label}
        {field.is_required && <span style={{ color: 'var(--uptrade-error-color, #ef4444)' }}> *</span>}
      </label>
      
      {/* Text, Email, Phone/Tel, Number */}
      {['text', 'email', 'phone', 'tel', 'number'].includes(field.field_type) && (
        <input
          className={`${classPrefix}__input`}
          type={field.field_type === 'phone' || field.field_type === 'tel' ? 'tel' : field.field_type}
          name={field.slug}
          value={String(value || '')}
          placeholder={field.placeholder}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
          style={baseInputStyle}
        />
      )}
      
      {/* Textarea */}
      {field.field_type === 'textarea' && (
        <textarea
          className={`${classPrefix}__textarea`}
          name={field.slug}
          value={String(value || '')}
          placeholder={field.placeholder}
          required={field.is_required}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...baseInputStyle, resize: 'vertical' }}
        />
      )}
      
      {/* Select */}
      {field.field_type === 'select' && (
        <select
          className={`${classPrefix}__select`}
          name={field.slug}
          value={String(value || '')}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
          style={baseInputStyle}
        >
          <option value="">{field.placeholder || 'Select an option'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      
      {/* Multi-select */}
      {field.field_type === 'multi-select' && (
        <select
          className={`${classPrefix}__select ${classPrefix}__select--multi`}
          name={field.slug}
          value={Array.isArray(value) ? value : []}
          required={field.is_required}
          multiple
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, opt => opt.value)
            onChange(selected)
          }}
          style={{ ...baseInputStyle, height: 120 }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      
      {/* Radio */}
      {field.field_type === 'radio' && (
        <div className={`${classPrefix}__radio-group`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((option) => (
            <label key={option.value} className={`${classPrefix}__radio-option`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                name={field.slug}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
      
      {/* Checkbox (single) */}
      {field.field_type === 'checkbox' && options.length === 0 && (
        <label className={`${classPrefix}__checkbox`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            name={field.slug}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.help_text || field.label}
        </label>
      )}
      
      {/* Checkbox (multiple options) */}
      {field.field_type === 'checkbox' && options.length > 0 && (
        <div className={`${classPrefix}__checkbox-group`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((option) => {
            const selectedValues = Array.isArray(value) ? value : []
            const isChecked = selectedValues.includes(option.value)
            
            return (
              <label key={option.value} className={`${classPrefix}__checkbox-option`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    if (isChecked) {
                      onChange(selectedValues.filter(v => v !== option.value))
                    } else {
                      onChange([...selectedValues, option.value])
                    }
                  }}
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )}
      
      {/* Date */}
      {field.field_type === 'date' && (
        <input
          className={`${classPrefix}__input ${classPrefix}__input--date`}
          type="date"
          name={field.slug}
          value={String(value || '')}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
          style={baseInputStyle}
        />
      )}
      
      {/* Time */}
      {field.field_type === 'time' && (
        <input
          className={`${classPrefix}__input ${classPrefix}__input--time`}
          type="time"
          name={field.slug}
          value={String(value || '')}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
          style={baseInputStyle}
        />
      )}
      
      {/* DateTime */}
      {field.field_type === 'datetime' && (
        <input
          className={`${classPrefix}__input ${classPrefix}__input--datetime`}
          type="datetime-local"
          name={field.slug}
          value={String(value || '')}
          required={field.is_required}
          onChange={(e) => onChange(e.target.value)}
          style={baseInputStyle}
        />
      )}
      
      {/* File */}
      {field.field_type === 'file' && (
        <input
          className={`${classPrefix}__input ${classPrefix}__input--file`}
          type="file"
          name={field.slug}
          required={field.is_required}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              // Could upload to Supabase Storage here
              onChange(file.name)
            }
          }}
          style={baseInputStyle}
        />
      )}
      
      {/* Rating */}
      {field.field_type === 'rating' && (
        <div className={`${classPrefix}__rating`} style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`${classPrefix}__rating-star`}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: (value as number) >= star ? 'var(--uptrade-rating-active, #fbbf24)' : 'var(--uptrade-rating-inactive, #d1d5db)',
              }}
            >
              ★
            </button>
          ))}
        </div>
      )}
      
      {/* Slider */}
      {field.field_type === 'slider' && (
        <div className={`${classPrefix}__slider`}>
          <input
            type="range"
            name={field.slug}
            value={Number(value || 50)}
            min={field.validation?.min || 0}
            max={field.validation?.max || 100}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div className={`${classPrefix}__slider-value`} style={{ textAlign: 'center', marginTop: 4 }}>{String(value || 50)}</div>
        </div>
      )}
      
      {/* Error message */}
      {error && <p className={`${classPrefix}__error`} style={errorStyle}>{error}</p>}
      
      {/* Help text */}
      {field.help_text && !error && field.field_type !== 'checkbox' && (
        <p className={`${classPrefix}__help`} style={helpStyle}>{field.help_text}</p>
      )}
    </div>
  )
}
