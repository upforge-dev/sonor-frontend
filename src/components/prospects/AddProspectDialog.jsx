/**
 * AddProspectDialog - Dialog for adding new prospects
 * Wrapper around the CRM AddProspectDialog with proper API routing
 */
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus, Building2, Mail, Phone, Globe, Tag, FileText } from 'lucide-react'
import { crmApi } from '@/lib/sonor-api'
import { toast } from '@/lib/toast'
import { useBrandColors } from '@/hooks/useBrandColors'

const LEAD_SOURCES = [
  { value: 'manual', label: 'Manual Entry', description: 'Added manually' },
  { value: 'form', label: 'Form', description: 'Form submission' },
  { value: 'referral', label: 'Referral', description: 'Client referral' },
  { value: 'import', label: 'Import', description: 'Imported from file' },
]

export default function AddProspectDialog({ open, onOpenChange, onProspectAdded }) {
  const { primary: brandPrimary, rgba } = useBrandColors()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    website: '',
    source: 'manual',
    notes: ''
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (formData.website && formData.website.trim() && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const response = await crmApi.createProspect({
        name: formData.name,
        email: formData.email || null,
        company: formData.company || null,
        phone: formData.phone || null,
        website: formData.website || null,
        source: formData.source,
        notes: formData.notes || null,
        pipelineStage: 'new_lead'
      })
      
      toast.success('Prospect added successfully')
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        website: '',
        source: 'manual',
        notes: ''
      })
      
      onOpenChange(false)
      onProspectAdded?.(response.data)
    } catch (err) {
      console.error('Failed to add prospect:', err)
      toast.error(err.response?.data?.error || 'Failed to add prospect')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg glass border-[var(--glass-border)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: rgba.primary20 }}
            >
              <UserPlus className="h-5 w-5" style={{ color: brandPrimary }} />
            </div>
            Add New Prospect
          </DialogTitle>
          <DialogDescription>
            Add a prospect to your pipeline. They'll start in the "New Lead" stage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name & Company Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <UserPlus className="h-3.5 w-3.5" />
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="John Smith"
                className={errors.name ? 'border-red-500/50' : ''}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <Building2 className="h-3.5 w-3.5" />
                Company
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {/* Email & Phone Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@acme.com"
                className={errors.email ? 'border-red-500/50' : ''}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Website & Source Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <Globe className="h-3.5 w-3.5" />
                Website
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://acme.com"
                className={errors.website ? 'border-red-500/50' : ''}
              />
              {errors.website && (
                <p className="text-xs text-red-500">{errors.website}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="source" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <Tag className="h-3.5 w-3.5" />
                Source
              </Label>
              <Select value={formData.source} onValueChange={(v) => updateField('source', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map(src => (
                    <SelectItem key={src.value} value={src.value}>
                      <div className="flex flex-col">
                        <span>{src.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional context about this prospect..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: brandPrimary, color: 'white' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Prospect
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
