/**
 * @uptrade/site-kit/forms - Type definitions
 */

// ============================================
// Form Types
// ============================================

export interface ManagedFormConfig {
  id: string
  project_id: string
  slug: string
  name: string
  description?: string
  instructions?: string
  
  /** Form type determines routing */
  form_type: FormRoutingType
  
  /** Configuration */
  success_message: string
  redirect_url?: string
  notification_emails?: string[]
  
  /** Appearance */
  submit_button_text: string
  layout: 'stacked' | 'inline' | 'grid'
  
  /** Behavior - multi-step */
  show_progress: boolean
  enable_save_draft: boolean
  honeypot_enabled?: boolean
  
  /** Status */
  is_active: boolean
  
  /** Timestamps */
  created_at: string
  updated_at: string
  
  /** Relations */
  steps?: FormStep[]
  fields?: FormField[]
  
  // Computed - used by client
  total_steps: number
  is_multi_step: boolean
}

export type FormRoutingType = 
  | 'prospect'      // → CRM prospects/leads
  | 'contact'       // → Contact form (basic)
  | 'support'       // → Support tickets
  | 'feedback'      // → Feedback entries
  | 'newsletter'    // → Email subscribers
  | 'custom'        // → Custom webhook or no routing

// ============================================
// Step Types
// ============================================

export interface FormStep {
  id: string
  form_id: string
  step_number: number
  title?: string
  description?: string
  /** Conditional display based on field values */
  condition?: ConditionalLogic
}

// ============================================
// Field Types
// ============================================

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file'
  | 'signature'
  | 'rating'
  | 'slider'
  | 'hidden'
  | 'heading'
  | 'section_header'
  | 'paragraph'

export interface FormField {
  id: string
  form_id: string
  step_id?: string
  slug: string
  label: string
  placeholder?: string
  help_text?: string
  
  /** Field type */
  field_type: FieldType
  
  /** Options (for select, radio, checkbox) */
  options?: FieldOption[]
  
  /** Validation */
  is_required: boolean
  validation?: ValidationRules
  
  /** Conditional logic */
  conditional?: ConditionalLogic
  
  /** Mapping for routing */
  destination_field?: string
  
  /** Layout */
  width: 'full' | 'half' | 'third' | 'quarter'
  sort_order: number
  
  /** Default value */
  default_value?: string
}

export interface FieldOption {
  value: string
  label: string
}

export interface ValidationRules {
  min_length?: number
  max_length?: number
  min?: number
  max?: number
  pattern?: string
  custom_error?: string
}

export interface ConditionalLogic {
  show_when: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'not_empty'
    value?: string | number | boolean
  }
}

// ============================================
// Submission Types
// ============================================

export interface FormSubmission {
  id: string
  form_id: string
  project_id: string
  
  /** Submitted data */
  data: Record<string, unknown>
  
  /** Routing */
  routing_type: FormRoutingType
  routing_status: 'pending' | 'processing' | 'completed' | 'failed'
  routed_to_id?: string
  routed_to_type?: string
  routing_error?: string
  
  /** Source */
  source_url?: string
  source_page?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referrer?: string
  
  /** Visitor */
  ip_address?: string
  user_agent?: string
  session_id?: string
  
  /** Spam */
  is_spam: boolean
  spam_score?: number
  
  created_at: string
}

// ============================================
// Analytics Types
// ============================================

export interface FormAnalytics {
  id: string
  form_id: string
  session_id: string
  
  /** Progress */
  started_at: string
  current_step: number
  max_step_reached: number
  completed_at?: string
  abandoned_at?: string
  
  /** Time tracking */
  time_per_step?: Record<number, number>
  total_time_seconds?: number
  
  /** Metadata */
  source_url?: string
  device_type?: 'desktop' | 'mobile' | 'tablet'
}

// ============================================
// Component Props
// ============================================

export interface ManagedFormProps {
  /** Form key from Portal */
  formId: string
  
  /** Project ID */
  projectId: string
  
  /** Custom class name */
  className?: string
  
  /** Success callback */
  onSuccess?: (submission: FormSubmission) => void
  
  /** Error callback */
  onError?: (error: Error) => void
  
  /** Custom render function */
  children?: (props: FormRenderProps) => React.ReactNode
}

export interface FormRenderProps {
  /** Form configuration */
  config: ManagedFormConfig
  
  /** All fields for current step */
  fields: FormField[]
  
  /** Current step (1-indexed) */
  step: number
  
  /** Total steps */
  totalSteps: number
  
  /** Current values */
  values: Record<string, unknown>
  
  /** Validation errors */
  errors: Record<string, string>
  
  /** Submit in progress */
  isSubmitting: boolean
  
  /** Progress percentage */
  progress: number
  
  /** Go to next step */
  nextStep: () => boolean
  
  /** Go to previous step */
  prevStep: () => void
  
  /** Go to specific step */
  goToStep: (step: number) => void
  
  /** Submit the form */
  submit: () => Promise<void>
  
  /** Set field value */
  setFieldValue: (key: string, value: unknown) => void
  
  /** Check if field should be visible (conditional logic) */
  isFieldVisible: (field: FormField) => boolean
}
