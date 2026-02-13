/**
 * @uptrade/site-kit/forms - useForm Hook
 * 
 * Headless hook for complete control over form rendering.
 * Fetches form config from API, handles validation, state, and submission.
 * 
 * @example
 * ```tsx
 * const { form, fields, values, errors, setFieldValue, submit, isSubmitting } = useForm('contact-form')
 * 
 * return (
 *   <form onSubmit={(e) => { e.preventDefault(); submit() }}>
 *     {fields.map(field => (
 *       <MyCustomInput
 *         key={field.slug}
 *         label={field.label}
 *         value={values[field.slug]}
 *         error={errors[field.slug]}
 *         onChange={(val) => setFieldValue(field.slug, val)}
 *       />
 *     ))}
 *     <button type="submit" disabled={isSubmitting}>Submit</button>
 *   </form>
 * )
 * ```
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFormTracking } from './useFormTracking'
import type { 
  ManagedFormConfig, 
  FormField, 
  FormSubmission 
} from './types'

// ============================================
// Types
// ============================================

export interface UseFormOptions {
  /** Project ID (defaults to SiteKitProvider config) */
  projectId?: string
  /** Callback when form submits successfully */
  onSuccess?: (submission: FormSubmission) => void
  /** Callback when submission fails */
  onError?: (error: Error) => void
  /** Initial values to prefill */
  initialValues?: Record<string, unknown>
  /** Auto-redirect after success (override form config) */
  redirectUrl?: string | false
}

export interface UseFormReturn {
  /** Form configuration (null while loading) */
  form: ManagedFormConfig | null
  /** Loading state */
  isLoading: boolean
  /** Error fetching form */
  fetchError: Error | null
  
  /** All form fields */
  allFields: FormField[]
  /** Fields for current step (multi-step) or all fields (single step) */
  fields: FormField[]
  /** Visible fields only (respecting conditional logic) */
  visibleFields: FormField[]
  
  /** Current form values */
  values: Record<string, unknown>
  /** Current validation errors */
  errors: Record<string, string>
  
  /** Set a single field value */
  setFieldValue: (key: string, value: unknown) => void
  /** Set multiple field values at once */
  setValues: (values: Record<string, unknown>) => void
  /** Clear all errors */
  clearErrors: () => void
  
  /** Multi-step state */
  step: number
  totalSteps: number
  isMultiStep: boolean
  progress: number
  
  /** Multi-step navigation */
  nextStep: () => boolean
  prevStep: () => void
  goToStep: (step: number) => void
  canGoNext: boolean
  canGoPrev: boolean
  isLastStep: boolean
  
  /** Validate current step */
  validate: () => boolean
  /** Validate a single field */
  validateField: (field: FormField) => string | null
  /** Check if a field is visible (conditional logic) */
  isFieldVisible: (field: FormField) => boolean
  
  /** Submit the form */
  submit: () => Promise<void>
  /** Submission state */
  isSubmitting: boolean
  isComplete: boolean
  /** Reset form to initial state */
  reset: () => void
}

// ============================================
// Helper: Get UTM params
// ============================================

function getUTMParams() {
  if (typeof window === 'undefined') return {}
  
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
  }
}

// ============================================
// Hook
// ============================================

export function useForm(
  formIdOrSlug: string,
  options: UseFormOptions = {}
): UseFormReturn {
  const { 
    projectId: optionsProjectId,
    onSuccess, 
    onError, 
    initialValues = {},
    redirectUrl,
  } = options
  
  // Get projectId from window globals if not provided
  const projectId = optionsProjectId || 
    (typeof window !== 'undefined' ? (window as any).__SITE_KIT_PROJECT_ID__ : undefined)
  
  // State
  const [form, setForm] = useState<ManagedFormConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<Error | null>(null)
  const [values, setValuesState] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  
  const totalSteps = form?.total_steps || 1
  const isMultiStep = (form?.is_multi_step) || false
  
  const { trackStepChange, trackComplete } = useFormTracking({
    formId: form?.id || '',
    totalSteps,
  })
  
  // Fetch form config (project is derived from API key on the backend; projectId is optional)
  useEffect(() => {
    const apiUrl = typeof window !== 'undefined'
      ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
      : 'https://api.uptrademedia.com'
    const apiKey = typeof window !== 'undefined'
      ? (window as any).__SITE_KIT_API_KEY__
      : undefined

    if (!apiKey) {
      setFetchError(new Error('API key is required. Provide it via SiteKitProvider (apiKey) or set __SITE_KIT_API_KEY__.'))
      setIsLoading(false)
      return
    }

    async function fetchForm() {
      try {
        setIsLoading(true)
        setFetchError(null)
        
        const response = await fetch(`${apiUrl}/api/public/forms/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            formIdOrSlug: formIdOrSlug,
          }),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch form: ${response.statusText}`)
        }
        
        const data = await response.json()
        if (!data) throw new Error('Form not found')
        
        // Sort steps and fields
        if (data.steps) {
          data.steps.sort((a: any, b: any) => (a.step_number || 0) - (b.step_number || 0))
        }
        if (data.fields) {
          data.fields.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        }
        
        // Compute multi-step properties
        const total_steps = data.steps?.length || 1
        const is_multi_step = total_steps > 1
        
        setForm({
          ...data,
          total_steps,
          is_multi_step,
        })
        
        // Set default values from field configs
        const defaults: Record<string, unknown> = {}
        for (const field of data.fields || []) {
          if (field.default_value !== undefined && field.default_value !== null) {
            defaults[field.slug] = field.default_value
          }
        }
        setValuesState({ ...defaults, ...initialValues })
        
      } catch (err) {
        setFetchError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchForm()
  }, [formIdOrSlug, projectId])
  
  // All fields
  const allFields = useMemo(() => form?.fields || [], [form])
  
  // Fields for current step
  const fields = useMemo(() => {
    if (!isMultiStep) return allFields
    
    const currentStepConfig = form?.steps?.find(s => s.step_number === step)
    if (!currentStepConfig) return allFields
    
    return allFields.filter(f => f.step_id === currentStepConfig.id)
  }, [form, step, allFields, isMultiStep])
  
  // Check if field is visible (conditional logic)
  const isFieldVisible = useCallback((field: FormField): boolean => {
    if (!field.conditional?.show_when) return true
    
    const { field: condField, operator, value } = field.conditional.show_when
    const fieldValue = values[condField]
    
    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'contains':
        return String(fieldValue || '').includes(String(value))
      case 'not_contains':
        return !String(fieldValue || '').includes(String(value))
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
  
  // Visible fields only
  const visibleFields = useMemo(() => {
    return fields.filter(isFieldVisible)
  }, [fields, isFieldVisible])
  
  // Validate a single field
  const validateField = useCallback((field: FormField): string | null => {
    if (!isFieldVisible(field)) return null
    
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
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    
    for (const field of fields) {
      const error = validateField(field)
      if (error) {
        newErrors[field.slug] = error
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [fields, validateField])
  
  // Set single field value
  const setFieldValue = useCallback((key: string, value: unknown) => {
    setValuesState(prev => ({ ...prev, [key]: value }))
    // Clear error when field changes
    setErrors(prev => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return prev
    })
  }, [])
  
  // Set multiple values
  const setValues = useCallback((newValues: Record<string, unknown>) => {
    setValuesState(prev => ({ ...prev, ...newValues }))
  }, [])
  
  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])
  
  // Step navigation
  const canGoNext = step < totalSteps
  const canGoPrev = step > 1
  const isLastStep = step === totalSteps
  const progress = Math.round((step / totalSteps) * 100)
  
  const nextStep = useCallback((): boolean => {
    if (!validate()) return false
    
    if (step < totalSteps) {
      const newStep = step + 1
      setStep(newStep)
      trackStepChange(newStep)
      return true
    }
    return false
  }, [step, totalSteps, validate, trackStepChange])
  
  const prevStep = useCallback(() => {
    if (step > 1) {
      const newStep = step - 1
      setStep(newStep)
      trackStepChange(newStep)
    }
  }, [step, trackStepChange])
  
  const goToStep = useCallback((targetStep: number) => {
    if (targetStep >= 1 && targetStep <= totalSteps) {
      setStep(targetStep)
      trackStepChange(targetStep)
    }
  }, [totalSteps, trackStepChange])
  
  // Submit form
  const submit = useCallback(async () => {
    if (!form) return
    if (!validate()) return
    
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
      
      const submission = {
        formId: form.id,
        data: values,
        metadata: {
          pageUrl: typeof window !== 'undefined' ? window.location.href : null,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          sessionId: typeof sessionStorage !== 'undefined' 
            ? sessionStorage.getItem('_uptrade_sid') 
            : null,
          ...getUTMParams(),
        },
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
        throw new Error(`Form submission failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      trackComplete()
      setIsComplete(true)
      onSuccess?.(data)
      
      // Redirect handling
      const finalRedirect = redirectUrl !== false 
        ? (redirectUrl || form.redirect_url) 
        : undefined
        
      if (finalRedirect) {
        window.location.href = finalRedirect
      }
    } catch (error) {
      console.error('[useForm] Submission error:', error)
      onError?.(error as Error)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, values, validate, trackComplete, onSuccess, onError, redirectUrl])
  
  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrors({})
    setStep(1)
    setIsComplete(false)
  }, [initialValues])
  
  return {
    form,
    isLoading,
    fetchError,
    
    allFields,
    fields,
    visibleFields,
    
    values,
    errors,
    setFieldValue,
    setValues,
    clearErrors,
    
    step,
    totalSteps,
    isMultiStep,
    progress,
    
    nextStep,
    prevStep,
    goToStep,
    canGoNext,
    canGoPrev,
    isLastStep,
    
    validate,
    validateField,
    isFieldVisible,
    
    submit,
    isSubmitting,
    isComplete,
    reset,
  }
}
