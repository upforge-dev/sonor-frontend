// src/components/EditProposalDialog.jsx
/**
 * Edit Proposal Dialog
 * 
 * Allows editing proposal pricing, add-ons, content, and media
 * after creation.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
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
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  Calendar, 
  FileText,
  Loader2,
  Check,
  Save,
  Image as ImageIcon,
  Upload,
  Zap,
  Clock,
  Eye,
  Send,
  AlertTriangle,
  User
} from 'lucide-react'
import { adminApi, filesApi, proposalsApi } from '@/lib/portal-api'
import { cn } from '@/lib/utils'

// Payment terms options
const PAYMENT_TERMS = [
  { value: '50-50', label: '50% upfront, 50% on completion' },
  { value: '100-upfront', label: '100% upfront (5% discount)' },
  { value: '25-25-25-25', label: '25% quarterly milestones' },
  { value: 'monthly', label: 'Monthly billing (retainers)' },
  { value: 'custom', label: 'Custom terms' }
]

// Timeline options
const TIMELINE_OPTIONS = [
  { value: '1-week', label: '1 Week' },
  { value: '2-weeks', label: '2 Weeks' },
  { value: '3-weeks', label: '3 Weeks' },
  { value: '4-weeks', label: '4 Weeks' },
  { value: '5-weeks', label: '5 Weeks' },
  { value: '6-weeks', label: '6 Weeks' },
  { value: '8-weeks', label: '8 Weeks' },
  { value: '10-weeks', label: '10 Weeks' },
  { value: '12-weeks', label: '12 Weeks' },
  { value: '16-weeks', label: '16 Weeks' },
  { value: '3-months', label: '3 Months' },
  { value: '6-months', label: '6 Months' },
  { value: 'ongoing', label: 'Ongoing' }
]

// Status options
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'viewed', label: 'Viewed', color: 'bg-yellow-500' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-500' },
  { value: 'declined', label: 'Declined', color: 'bg-red-500' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-400' }
]

export default function EditProposalDialog({ 
  proposal, 
  clients: clientsProp = [],
  open, 
  onOpenChange, 
  onSuccess,
  onNavigate
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState('pricing')
  const [clients, setClients] = useState([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft',
    totalAmount: '',
    paymentTerms: '50-50',
    customTerms: '',
    timeline: '6-weeks',
    validUntil: '',
    heroImageUrl: '',
    addOns: [],
    contactId: ''
  })

  // Initialize form data from proposal
  useEffect(() => {
    if (proposal) {
      setFormData({
        title: proposal.title || '',
        description: proposal.description || '',
        status: proposal.status || 'draft',
        totalAmount: proposal.total_amount || proposal.totalAmount || '',
        paymentTerms: proposal.payment_terms || proposal.paymentTerms || '50-50',
        customTerms: proposal.custom_terms || '',
        timeline: proposal.timeline || '6-weeks',
        validUntil: proposal.valid_until || proposal.validUntil || '',
        heroImageUrl: proposal.hero_image_url || proposal.heroImageUrl || '',
        addOns: proposal.add_ons || proposal.addOns || [],
        contactId: proposal.contact_id || proposal.contactId || ''
      })
    }
  }, [proposal])

  // Use clients from props if available, otherwise fetch
  useEffect(() => {
    const fetchClients = async () => {
      // Use prop clients if available
      if (clientsProp && clientsProp.length > 0) {
        setClients(clientsProp)
        return
      }
      
      if (!open || formData.status !== 'draft') return
      
      setIsLoadingClients(true)
      try {
        const response = await adminApi.listClients()
        setClients(response.data.clients || response.data || [])
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      } finally {
        setIsLoadingClients(false)
      }
    }
    
    fetchClients()
  }, [open, formData.status, clientsProp])

  // Handle hero image upload
  const handleHeroImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageFormData = new FormData()
      imageFormData.append('file', file)
      imageFormData.append('category', 'proposal-hero')
      
      const response = await filesApi.upload(imageFormData)
      
      setFormData(prev => ({
        ...prev,
        heroImageUrl: response.data.url
      }))
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image')
    }
  }

  // Save changes
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const updatePayload = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        totalAmount: formData.totalAmount,
        paymentTerms: formData.paymentTerms,
        customTerms: formData.customTerms,
        timeline: formData.timeline,
        validUntil: formData.validUntil,
        heroImageUrl: formData.heroImageUrl,
        addOns: formData.addOns
      }
      
      // Only include contactId for draft proposals
      if (proposal.status === 'draft' && formData.contactId) {
        updatePayload.contactId = formData.contactId
      }
      
      const response = await proposalsApi.update(proposal.id, updatePayload)

      if (response.data.proposal || response.data.success) {
        onSuccess(response.data.proposal || { ...proposal, ...formData })
      }
    } catch (error) {
      console.error('Failed to save proposal:', error)
      alert('Failed to save: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSaving(false)
    }
  }

  // Send proposal to client
  const handleSend = async () => {
    if (formData.status !== 'draft') {
      if (!confirm('This proposal has already been sent. Send again?')) return
    }
    
    setIsSending(true)
    
    try {
      await proposalsApi.send(proposal.id)
      
      setFormData(prev => ({ ...prev, status: 'sent' }))
      onSuccess({ ...proposal, ...formData, status: 'sent' })
      alert('Proposal sent successfully!')
    } catch (error) {
      console.error('Failed to send proposal:', error)
      alert('Failed to send: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSending(false)
    }
  }

  // Calculate total with add-ons
  const totalWithAddOns = useMemo(() => {
    const base = parseFloat(formData.totalAmount) || 0
    const addOnsTotal = formData.addOns.reduce((sum, a) => sum + (a.price || 0), 0)
    return base + addOnsTotal
  }, [formData.totalAmount, formData.addOns])

  // Check if valid until date is past
  const isExpired = formData.validUntil && new Date(formData.validUntil) < new Date()

  if (!proposal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col glass-bg border-[var(--glass-border)]">
        <DialogHeader className="pb-4 border-b border-[var(--glass-border)]">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-[var(--text-primary)]">Edit Proposal</span>
              <DialogDescription className="font-normal text-sm mt-0.5 flex items-center gap-2">
                {proposal.title}
                <Badge className={cn(
                  'text-xs',
                  STATUS_OPTIONS.find(s => s.value === formData.status)?.color,
                  'text-white'
                )}>
                  {formData.status}
                </Badge>
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Expired Warning */}
        {isExpired && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-600">This proposal has expired. Update the valid until date before sending.</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-4 mt-4 grid grid-cols-3 w-fit">
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Media
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Base Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <Input
                      type="number"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                      placeholder="15000"
                      className="pl-9 glass-bg border-[var(--glass-border)]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Payment Terms</Label>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(v) => setFormData({ ...formData, paymentTerms: v })}
                  >
                    <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.paymentTerms === 'custom' && (
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Custom Terms</Label>
                  <Input
                    value={formData.customTerms}
                    onChange={(e) => setFormData({ ...formData, customTerms: e.target.value })}
                    placeholder="e.g., 30% upfront, 40% at milestone, 30% on launch"
                    className="glass-bg border-[var(--glass-border)]"
                  />
                </div>
              )}

              {/* Add-ons */}
              {formData.addOns.length > 0 && (
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Add-ons
                  </Label>
                  <div className="space-y-2">
                    {formData.addOns.map((addOn, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                        <span className="flex-1 text-sm text-[var(--text-primary)]">{addOn.name}</span>
                        <div className="relative w-32">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-tertiary)]" />
                          <Input
                            type="number"
                            value={addOn.price}
                            onChange={(e) => {
                              const newAddOns = [...formData.addOns]
                              newAddOns[index] = { ...addOn, price: parseFloat(e.target.value) || 0 }
                              setFormData({ ...formData, addOns: newAddOns })
                            }}
                            className="pl-6 h-8 text-sm glass-bg border-[var(--glass-border)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              addOns: formData.addOns.filter((_, i) => i !== index)
                            })
                          }}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Total Proposal Value</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${totalWithAddOns.toLocaleString()}
                  </span>
                </div>
                {formData.addOns.length > 0 && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Base: ${parseFloat(formData.totalAmount || 0).toLocaleString()} + Add-ons: ${formData.addOns.reduce((sum, a) => sum + (a.price || 0), 0).toLocaleString()}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 space-y-6">
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="glass-bg border-[var(--glass-border)]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="glass-bg border-[var(--glass-border)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Timeline
                  </Label>
                  <Select
                    value={formData.timeline}
                    onValueChange={(v) => setFormData({ ...formData, timeline: v })}
                  >
                    <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMELINE_OPTIONS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    Valid Until
                  </Label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className={cn(
                      'glass-bg border-[var(--glass-border)]',
                      isExpired && 'border-orange-500'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', s.color)} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Assignment - Only for draft proposals */}
              {proposal.status === 'draft' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <User className="w-4 h-4 text-blue-500" />
                    Assign to Client
                  </Label>
                  <Select
                    value={formData.contactId || ''}
                    onValueChange={(v) => setFormData({ ...formData, contactId: v })}
                    disabled={isLoadingClients}
                  >
                    <SelectTrigger className="glass-bg border-[var(--glass-border)]">
                      <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span>{client.name || client.email}</span>
                            {client.name && client.email && (
                              <span className="text-xs text-[var(--text-tertiary)]">{client.email}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    You can reassign this proposal to a different client while it's still a draft.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="mt-0 space-y-6">
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <ImageIcon className="w-4 h-4 text-pink-500" />
                  Hero Image
                </Label>

                <div className="flex items-start gap-4">
                  {formData.heroImageUrl ? (
                    <div className="relative w-64 h-36 rounded-xl overflow-hidden border border-[var(--glass-border)]">
                      <img
                        src={formData.heroImageUrl}
                        alt="Hero"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, heroImageUrl: '' })}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white text-sm hover:bg-black/70"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-64 h-36 rounded-xl border-2 border-dashed border-[var(--glass-border)] cursor-pointer hover:border-[var(--brand-primary)]/50 transition-colors bg-[var(--surface-secondary)]">
                      <Upload className="w-8 h-8 text-[var(--text-tertiary)] mb-2" />
                      <span className="text-sm text-[var(--text-tertiary)]">Upload hero image</span>
                      <span className="text-xs text-[var(--text-tertiary)] mt-1">1920×1080 recommended</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHeroImageChange}
                        className="hidden"
                      />
                    </label>
                  )}

                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-secondary)]">
                      The hero image appears at the top of the proposal with your Upforge logo overlaid.
                    </p>
                    <p className="text-sm text-[var(--text-tertiary)] mt-2">
                      For best results, use a high-quality image that represents the client's industry or project.
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Input for hero */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Or enter image URL</Label>
                <Input
                  value={formData.heroImageUrl}
                  onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                  placeholder="https://..."
                  className="glass-bg border-[var(--glass-border)]"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/p/${proposal.slug}`, '_blank')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isSending}
            >
              Cancel
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || isSending}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>

            <Button
              onClick={handleSend}
              disabled={isSaving || isSending || isExpired}
              className="gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] hover:opacity-90"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send to Client
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
