// src/pages/forms/components/FormDefaultsView.jsx
// Pre-built form templates that can be created with one click
// These are commonly-needed forms that almost every site requires

import { useState } from 'react'
import { 
  Mail, 
  MessageSquare, 
  Star, 
  Phone, 
  Calendar, 
  UserPlus,
  FileText,
  Send,
  Sparkles,
  Check,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formsApi } from '@/lib/sonor-api'
import { toast } from 'sonner'

// =============================================================================
// FORM TEMPLATES - Pre-built form configurations
// =============================================================================

const FORM_TEMPLATES = [
  {
    id: 'newsletter',
    name: 'Newsletter Subscribe',
    description: 'Simple email capture for newsletter signups. Essential for building your mailing list.',
    icon: Mail,
    category: 'lead-capture',
    fields: [
      { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'Enter your email' },
    ],
    settings: {
      submit_button_text: 'Subscribe',
      success_message: 'Thanks for subscribing! Check your inbox for a confirmation.',
      prevent_duplicates: true,
    },
    preview: {
      style: 'minimal',
      accent: 'brand-primary',
    },
  },
  {
    id: 'contact',
    name: 'Contact Form',
    description: 'Standard contact form with name, email, and message. Perfect for general inquiries.',
    icon: MessageSquare,
    category: 'communication',
    fields: [
      { name: 'name', type: 'text', label: 'Your Name', required: true, placeholder: 'John Smith' },
      { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com' },
      { name: 'message', type: 'textarea', label: 'Message', required: true, placeholder: 'How can we help you?' },
    ],
    settings: {
      submit_button_text: 'Send Message',
      success_message: 'Thanks for reaching out! We\'ll get back to you within 24 hours.',
    },
    preview: {
      style: 'card',
      accent: 'brand-primary',
    },
  },
  {
    id: 'feedback',
    name: 'Feedback Form',
    description: 'Collect customer feedback with rating and comments. Great for improving your service.',
    icon: Star,
    category: 'feedback',
    fields: [
      { name: 'rating', type: 'rating', label: 'How would you rate your experience?', required: true },
      { name: 'feedback', type: 'textarea', label: 'Tell us more', required: false, placeholder: 'What did you love? What could be better?' },
      { name: 'email', type: 'email', label: 'Email (optional)', required: false, placeholder: 'For follow-up (optional)' },
    ],
    settings: {
      submit_button_text: 'Submit Feedback',
      success_message: 'Thank you for your feedback! It helps us improve.',
    },
    preview: {
      style: 'card',
      accent: 'brand-primary',
    },
  },
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Comprehensive lead form with contact details. Ideal for sales funnels and consultations.',
    icon: UserPlus,
    category: 'lead-capture',
    fields: [
      { name: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'John Smith' },
      { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'john@company.com' },
      { name: 'phone', type: 'tel', label: 'Phone Number', required: false, placeholder: '(555) 123-4567' },
      { name: 'company', type: 'text', label: 'Company', required: false, placeholder: 'Your Company Name' },
    ],
    settings: {
      submit_button_text: 'Get Started',
      success_message: 'Thanks! A member of our team will be in touch shortly.',
    },
    preview: {
      style: 'card',
      accent: 'brand-primary',
    },
  },
  {
    id: 'appointment',
    name: 'Appointment Request',
    description: 'Allow visitors to request appointments or consultations with preferred dates.',
    icon: Calendar,
    category: 'booking',
    fields: [
      { name: 'name', type: 'text', label: 'Your Name', required: true, placeholder: 'John Smith' },
      { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com' },
      { name: 'phone', type: 'tel', label: 'Phone Number', required: true, placeholder: '(555) 123-4567' },
      { name: 'preferred_date', type: 'date', label: 'Preferred Date', required: true },
      { name: 'preferred_time', type: 'select', label: 'Preferred Time', required: true, options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)'] },
      { name: 'notes', type: 'textarea', label: 'Additional Notes', required: false, placeholder: 'Any special requests or information?' },
    ],
    settings: {
      submit_button_text: 'Request Appointment',
      success_message: 'Your appointment request has been submitted. We\'ll confirm within 24 hours.',
    },
    preview: {
      style: 'card',
      accent: 'brand-primary',
    },
  },
  {
    id: 'quote-request',
    name: 'Quote Request',
    description: 'Gather project details for providing estimates. Essential for service businesses.',
    icon: FileText,
    category: 'lead-capture',
    fields: [
      { name: 'name', type: 'text', label: 'Your Name', required: true, placeholder: 'John Smith' },
      { name: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com' },
      { name: 'phone', type: 'tel', label: 'Phone Number', required: false, placeholder: '(555) 123-4567' },
      { name: 'service_type', type: 'select', label: 'Service Type', required: true, options: ['Consultation', 'Full Service', 'Custom Project', 'Other'] },
      { name: 'budget', type: 'select', label: 'Budget Range', required: false, options: ['Under $1,000', '$1,000 - $5,000', '$5,000 - $10,000', '$10,000+'] },
      { name: 'details', type: 'textarea', label: 'Project Details', required: true, placeholder: 'Tell us about your project...' },
    ],
    settings: {
      submit_button_text: 'Get Quote',
      success_message: 'Thank you! We\'ll review your request and send a quote within 48 hours.',
    },
    preview: {
      style: 'card',
      accent: 'brand-primary',
    },
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'lead-capture', label: 'Lead Capture' },
  { id: 'communication', label: 'Communication' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'booking', label: 'Booking' },
]

// =============================================================================
// TEMPLATE CARD COMPONENT
// =============================================================================

function TemplateCard({ template, onUse, isCreating }) {
  const Icon = template.icon
  
  return (
    <Card className="group relative overflow-hidden bg-[var(--glass-bg)]/80 backdrop-blur-sm border-border hover:border-[var(--brand-primary)]/50 transition-all duration-300 hover:shadow-lg">
      {/* Preview Header */}
      <div 
        className="h-32 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary) 100%)` 
        }}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full border-2 border-white/20" />
        </div>
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
        
        {/* Field count badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-3 left-3 bg-white/20 text-white border-white/30 backdrop-blur-sm"
        >
          {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Field preview */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {template.fields.slice(0, 4).map((field, i) => (
            <Badge 
              key={i} 
              variant="outline" 
              className="text-xs font-normal bg-muted/50"
            >
              {field.label}
            </Badge>
          ))}
          {template.fields.length > 4 && (
            <Badge variant="outline" className="text-xs font-normal bg-muted/50">
              +{template.fields.length - 4} more
            </Badge>
          )}
        </div>
        
        {/* Action button */}
        <Button 
          className="w-full gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
          onClick={() => onUse(template)}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Use Template
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FormDefaultsView({ projectId, onFormCreated }) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [creatingTemplate, setCreatingTemplate] = useState(null)
  
  const filteredTemplates = activeCategory === 'all' 
    ? FORM_TEMPLATES 
    : FORM_TEMPLATES.filter(t => t.category === activeCategory)
  
  const handleUseTemplate = async (template) => {
    if (!projectId) {
      toast.error('No project selected')
      return
    }
    
    setCreatingTemplate(template.id)
    
    try {
      // Create the form from template
      const formData = {
        projectId: projectId,
        name: template.name,
        slug: `${template.id}-${Date.now()}`,
        description: template.description,
        formType: template.id,
        successMessage: template.settings.submit_button_text,
        submitButtonText: template.settings.submit_button_text,
        isActive: true,
        fields: template.fields.map((f, idx) => ({
          slug: f.name,
          label: f.label,
          fieldType: f.type,
          placeholder: f.placeholder || '',
          isRequired: f.required || false,
          width: f.width || 'full',
          sortOrder: idx,
        })),
      }
      
      const result = await formsApi.create(formData)
      
      if (result.data) {
        toast.success(`"${template.name}" form created!`, {
          description: 'You can now customize it or embed it on your site.',
          action: {
            label: 'Edit Form',
            onClick: () => onFormCreated?.(result.data.id, 'edit'),
          },
        })
        onFormCreated?.(result.data.id, 'view')
      }
    } catch (error) {
      console.error('Failed to create form:', error)
      toast.error('Failed to create form', {
        description: error.message || 'Please try again',
      })
    } finally {
      setCreatingTemplate(null)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Form Templates</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          Start with a pre-built form template. Customize fields, styling, and behavior after creation.
        </p>
      </div>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              activeCategory === category.id && 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]'
            )}
          >
            {category.label}
          </Button>
        ))}
      </div>
      
      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUse={handleUseTemplate}
            isCreating={creatingTemplate === template.id}
          />
        ))}
      </div>
      
      {/* Empty state */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No templates in this category</p>
        </div>
      )}
      
      {/* Custom Form CTA */}
      <Card className="bg-gradient-to-r from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/5 border-[var(--brand-primary)]/20">
        <CardContent className="flex items-center justify-between py-6">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Need something custom?</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Build a form from scratch with our drag-and-drop builder.
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Send className="h-4 w-4" />
            Create Custom Form
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
