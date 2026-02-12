/**
 * @uptrade/site-kit/forms - Form Client Component
 * 
 * Handles form state, validation, and submission
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useFormTracking } from './useFormTracking'
import { FormField } from './FormField'
import type { 
  ManagedFormConfig, 
  FormField as FormFieldType, 
  FormRenderProps,
  FormSubmission,
} from './types'

interface FormClientProps {
  config: ManagedFormConfig
  className?: string
  onSuccess?: (submission: FormSubmission) => void
  onError?: (error: Error) => void
  customRender?: (props: FormRenderProps) => React.ReactNode
}

export function FormClient({
  config,
  className,
  onSuccess,
  onError,
  customRender,
}: FormClientProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  
  const { trackStepChange, trackComplete } = useFormTracking({
    formId: config.id,
    totalSteps: config.total_steps,
  })
  
  // Get fields for current step
  const currentFields = useMemo(() => {
    if (!config.is_multi_step) {
      return config.fields || []
    }
    
    const currentStepConfig = config.steps?.find(s => s.step_number === step)
    if (!currentStepConfig) return config.fields || []
    
    return (config.fields || []).filter(f => f.step_id === currentStepConfig.id)
  }, [config, step])
  
  // Check if field is visible (conditional logic)
  const isFieldVisible = useCallback((field: FormFieldType): boolean => {
    if (!field.conditional?.show_when) return true
    
    const { field: condField, operator, value } = field.conditional.show_when
    const fieldValue = values[condField]
    
    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'contains':
        return String(fieldValue).includes(String(value))
      case 'not_contains':
        return !String(fieldValue).includes(String(value))
      case 'is_empty':
        return !fieldValue || fieldValue === ''
      case 'not_empty':
        return !!fieldValue && fieldValue !== ''
      case 'greater_than':
        return Number(fieldValue) > Number(value)
      case 'less_than':
        return Number(fieldValue) < Number(value)
      default:
        return true
    }
  }, [values])
  
  // Validate field
  const validateField = useCallback((field: FormFieldType): string | null => {
    if (!isFieldVisible(field)) return null
    // Skip display-only field types
    if (['heading', 'section_header', 'paragraph', 'hidden'].includes(field.field_type)) return null
    
    const value = values[field.slug]
    const rules = field.validation || {}
    
    // Required check
    if (field.is_required && (!value || value === '')) {
      return rules.custom_error || `${field.label} is required`
    }
    
    if (!value) return null
    
    const strValue = String(value)
    
    // Length checks
    if (rules.min_length && strValue.length < rules.min_length) {
      return `${field.label} must be at least ${rules.min_length} characters`
    }
    if (rules.max_length && strValue.length > rules.max_length) {
      return `${field.label} must be no more than ${rules.max_length} characters`
    }
    
    // Numeric checks
    if (rules.min !== undefined && Number(value) < rules.min) {
      return `${field.label} must be at least ${rules.min}`
    }
    if (rules.max !== undefined && Number(value) > rules.max) {
      return `${field.label} must be no more than ${rules.max}`
    }
    
    // Pattern check
    if (rules.pattern && !new RegExp(rules.pattern).test(strValue)) {
      return rules.custom_error || `${field.label} is invalid`
    }
    
    // Email check
    if (field.field_type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
      return 'Please enter a valid email address'
    }
    
    // Phone check
    if (field.field_type === 'phone' && !/^[\d\s\-\+\(\)]+$/.test(strValue)) {
      return 'Please enter a valid phone number'
    }
    
    return null
  }, [values, isFieldVisible])
  
  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    
    for (const field of currentFields) {
      const error = validateField(field)
      if (error) {
        newErrors[field.slug] = error
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [currentFields, validateField])
  
  // Set field value
  const setFieldValue = useCallback((key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }))
    // Clear error when field changes
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }, [errors])
  
  // Step navigation
  const nextStep = useCallback((): boolean => {
    if (!validateStep()) return false
    
    if (step < config.total_steps) {
      const newStep = step + 1
      setStep(newStep)
      trackStepChange(newStep)
      return true
    }
    return false
  }, [step, config.total_steps, validateStep, trackStepChange])
  
  const prevStep = useCallback(() => {
    if (step > 1) {
      const newStep = step - 1
      setStep(newStep)
      trackStepChange(newStep)
    }
  }, [step, trackStepChange])
  
  const goToStep = useCallback((targetStep: number) => {
    if (targetStep >= 1 && targetStep <= config.total_steps) {
      setStep(targetStep)
      trackStepChange(targetStep)
    }
  }, [config.total_steps, trackStepChange])
  
  // Submit form
  const submit = useCallback(async () => {
    if (!validateStep()) return
    
    setIsSubmitting(true)
    
    try {
      const apiUrl = typeof window !== 'undefined' 
        ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
        : 'https://api.uptrademedia.com'
      const apiKey = typeof window !== 'undefined' 
        ? (window as any).__SITE_KIT_API_KEY__
        : undefined
      
      if (!apiKey) {
        throw new Error('API key is required. Set NEXT_PUBLIC_UPTRADE_API_KEY in your .env')
      }
      
      // Create submission with all required metadata
      const submission = {
        form_id: config.id,
        project_id: config.project_id,
        data: values,
        routing_type: config.form_type,
        status: 'new',
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        session_id: typeof sessionStorage !== 'undefined' 
          ? sessionStorage.getItem('_uptrade_sid') 
          : null,
        ...getUTMParams(),
      }
      
      const response = await fetch(`${apiUrl}/api/public/forms/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(submission),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      trackComplete()
      setIsComplete(true)
      onSuccess?.(data)
      
      // Redirect if configured
      if (config.redirect_url) {
        window.location.href = config.redirect_url
      }
    } catch (error) {
      console.error('[Forms] Submission error:', error)
      onError?.(error as Error)
    } finally {
      setIsSubmitting(false)
    }
  }, [config, values, validateStep, trackComplete, onSuccess, onError])
  
  // Progress percentage
  const progress = useMemo(() => {
    return Math.round((step / config.total_steps) * 100)
  }, [step, config.total_steps])
  
  // Render props for custom rendering
  const renderProps: FormRenderProps = {
    config,
    fields: currentFields,
    step,
    totalSteps: config.total_steps,
    values,
    errors,
    isSubmitting,
    progress,
    nextStep,
    prevStep,
    goToStep,
    submit,
    setFieldValue,
    isFieldVisible,
  }
  
  // Show success message
  if (isComplete) {
    return (
      <div className={className}>
        <p>{config.success_message}</p>
      </div>
    )
  }
  
  // Custom render
  if (customRender) {
    return <>{customRender(renderProps)}</>
  }
  
  // Default render
  return (
    <form
      className={`uptrade-form ${className || ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (step < config.total_steps) {
          nextStep()
        } else {
          submit()
        }
      }}
    >
      {/* Step indicator for multi-step */}
      {config.is_multi_step && (
        <div className="uptrade-form__progress" style={{ marginBottom: 20 }}>
          <div className="uptrade-form__progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="uptrade-form__progress-step">Step {step} of {config.total_steps}</span>
            <span className="uptrade-form__progress-percent">{progress}%</span>
          </div>
          <div className="uptrade-form__progress-track" style={{ 
            height: 4, 
            backgroundColor: 'var(--uptrade-progress-bg, #e5e7eb)', 
            borderRadius: 2,
            overflow: 'hidden' 
          }}>
            <div className="uptrade-form__progress-bar" style={{ 
              width: `${progress}%`, 
              height: '100%', 
              backgroundColor: 'var(--uptrade-progress-fill, #3b82f6)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}
      
      {/* Fields */}
      <div className="uptrade-form__fields">
        {currentFields.map((field) => {
          if (!isFieldVisible(field)) return null
          
          return (
            <div key={field.id} className={`uptrade-form__field-wrapper uptrade-form__field-wrapper--${field.width || 'full'}`}>
              <FormField
                field={field}
                value={values[field.slug]}
                error={errors[field.slug]}
                onChange={(value) => setFieldValue(field.slug, value)}
              />
            </div>
          )
        })}
      </div>
      
      {/* Navigation buttons */}
      <div className="uptrade-form__actions" style={{ 
        display: 'flex', 
        justifyContent: step > 1 ? 'space-between' : 'flex-end',
        marginTop: 24 
      }}>
        {step > 1 && (
          <button type="button" className="uptrade-form__btn uptrade-form__btn--back" onClick={prevStep}>
            Back
          </button>
        )}
        <button type="submit" className="uptrade-form__btn uptrade-form__btn--submit" disabled={isSubmitting}>
          {isSubmitting 
            ? 'Submitting...' 
            : step < config.total_steps 
              ? 'Next' 
              : config.submit_button_text
          }
        </button>
      </div>
      
      {/* Honeypot field */}
      {config.honeypot_enabled && (
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          style={{ 
            position: 'absolute', 
            left: -9999, 
            opacity: 0,
            pointerEvents: 'none' 
          }}
          onChange={(e) => {
            if (e.target.value) {
              // Bot detected
              console.warn('[Forms] Honeypot triggered')
            }
          }}
        />
      )}
    </form>
  )
}

// Helper
function getUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const params = new URLSearchParams(window.location.search)
  const utmParams: Record<string, string> = {}
  
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = params.get(key)
    if (value) utmParams[key] = value
  }
  
  return utmParams
}
