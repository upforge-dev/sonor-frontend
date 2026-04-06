/**
 * EditProspectDialog - Modal for editing prospect/contact details
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Save, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { crmApi } from '@/lib/sonor-api'

const SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'google', label: 'Google' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'other', label: 'Other' }
]

export default function EditProspectDialog({ 
  prospect, 
  isOpen, 
  onClose, 
  onSave 
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    source: ''
  })

  // Populate form when prospect changes
  useEffect(() => {
    if (prospect) {
      setFormData({
        firstName: prospect.first_name || prospect.name?.split(' ')[0] || '',
        lastName: prospect.last_name || prospect.name?.split(' ').slice(1).join(' ') || '',
        email: prospect.email || '',
        phone: prospect.phone || '',
        company: prospect.company || '',
        website: prospect.website || '',
        source: prospect.source || ''
      })
    }
  }, [prospect])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!prospect?.id) return

    setIsSaving(true)
    try {
      // CRM prospects must use /crm/prospects — admin/clients only maps name/company/phone/status
      // and omits email, website, source entirely.
      const { data: updated } = await crmApi.updateProspect(prospect.id, {
        first_name: formData.firstName,
        last_name: formData.lastName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        website: formData.website || undefined,
        source: formData.source || undefined,
      })

      toast.success('Contact updated successfully')

      if (onSave && updated) {
        onSave(updated)
      }

      onClose()
    } catch (error) {
      console.error('Failed to update contact:', error)
      toast.error(error.response?.data?.error || 'Failed to update contact')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Company name"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={formData.source}
              onValueChange={(value) => handleChange('source', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(source => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !formData.firstName}
              className="border-0 text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
