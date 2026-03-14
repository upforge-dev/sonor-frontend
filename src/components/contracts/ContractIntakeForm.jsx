import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

/**
 * ContractIntakeForm — renders a dynamic form from a contract template's intake_schema.
 * Field schema matches the managed_forms field structure.
 */
export default function ContractIntakeForm({ template, onSubmit, isSubmitting = false }) {
  const fields = useMemo(() => template?.intake_schema || [], [template])
  const [values, setValues] = useState(() => {
    const initial = {}
    fields.forEach(f => {
      initial[f.slug] = f.default_value ?? ''
    })
    return initial
  })
  const [errors, setErrors] = useState({})

  const handleChange = useCallback((slug, value) => {
    setValues(prev => ({ ...prev, [slug]: value }))
    setErrors(prev => {
      if (prev[slug]) {
        const next = { ...prev }
        delete next[slug]
        return next
      }
      return prev
    })
  }, [])

  const validate = useCallback(() => {
    const errs = {}
    fields.forEach(f => {
      if (f.is_required && !values[f.slug] && values[f.slug] !== 0) {
        errs[f.slug] = `${f.label} is required`
      }
      if (f.field_type === 'email' && values[f.slug]) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRe.test(values[f.slug])) errs[f.slug] = 'Invalid email'
      }
      if (f.field_type === 'number' && values[f.slug] !== '' && isNaN(Number(values[f.slug]))) {
        errs[f.slug] = 'Must be a number'
      }
    })
    return errs
  }, [fields, values])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    const cleaned = { ...values }
    fields.forEach(f => {
      if (f.field_type === 'number' && cleaned[f.slug] !== '') {
        cleaned[f.slug] = Number(cleaned[f.slug])
      }
    })
    onSubmit?.(cleaned)
  }, [values, fields, validate, onSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        {fields.map(field => (
          <IntakeField
            key={field.slug}
            field={field}
            value={values[field.slug]}
            error={errors[field.slug]}
            onChange={handleChange}
          />
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Contract
        </Button>
      </div>
    </form>
  )
}

function IntakeField({ field, value, error, onChange }) {
  const widthClass = field.width === 'full' ? 'sm:col-span-2' : ''
  const id = `intake-${field.slug}`

  const renderInput = () => {
    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            value={value || ''}
            onChange={e => onChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
            className={error ? 'border-red-300' : ''}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={val => onChange(field.slug, val)}>
            <SelectTrigger className={error ? 'border-red-300' : ''}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label}...`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <Input
            id={id}
            type="date"
            value={value || ''}
            onChange={e => onChange(field.slug, e.target.value)}
            className={error ? 'border-red-300' : ''}
          />
        )

      case 'number':
        return (
          <Input
            id={id}
            type="number"
            step="any"
            value={value ?? ''}
            onChange={e => onChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            className={error ? 'border-red-300' : ''}
          />
        )

      case 'email':
        return (
          <Input
            id={id}
            type="email"
            value={value || ''}
            onChange={e => onChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            className={error ? 'border-red-300' : ''}
          />
        )

      case 'phone':
        return (
          <Input
            id={id}
            type="tel"
            value={value || ''}
            onChange={e => onChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            className={error ? 'border-red-300' : ''}
          />
        )

      default:
        return (
          <Input
            id={id}
            type="text"
            value={value || ''}
            onChange={e => onChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            className={error ? 'border-red-300' : ''}
          />
        )
    }
  }

  return (
    <div className={widthClass}>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {field.label}
        {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {renderInput()}
      {field.help_text && <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
