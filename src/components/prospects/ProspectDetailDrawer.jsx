/**
 * ProspectDetailDrawer - Slide-over panel for prospect details
 * 
 * Features:
 * - Tabbed content: Overview, Form Response, Timeline, Emails, Meetings
 * - Brand color theming
 * - Quick actions
 * - Signal AI insights (when enabled)
 */
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  X,
  Phone,
  Mail,
  Globe,
  Building2,
  Tag,
  Clock,
  Calendar,
  FileText,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Brain,
  Plus,
  Link2,
  User,
  ShoppingCart,
  Check,
  Eye,
  MousePointer2,
  GripVertical,
  DollarSign,
  Video,
  Copy,
  ChevronLeft,
  ChevronDown,
  BarChart3,
  Zap,
  Shield,
  Search
} from 'lucide-react'
import { UptradeSpinner } from '@/components/UptradeLoading'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { useBrandColors } from '@/hooks/useBrandColors'
import { crmApi, syncApi, auditsApi, emailApi } from '@/lib/portal-api'
import { PIPELINE_STAGES } from '../crm/pipelineStages'
import useAuthStore from '@/lib/auth-store'
import EmailComposeDialog from '../crm/EmailComposeDialog'
import { GmailConnectCompact } from '../email/GmailConnectCard'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Schedule Meeting Modal - Integrates with Sync module
function ScheduleMeetingModal({ open, onClose, prospect, brandColors }) {
  const [step, setStep] = useState('type') // 'type' | 'time' | 'confirm'
  const [bookingTypes, setBookingTypes] = useState([])
  const [hosts, setHosts] = useState([])
  const [selectedType, setSelectedType] = useState(null)
  const [selectedHost, setSelectedHost] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const { currentOrg, currentProject } = useAuthStore()

  // Fetch booking types and hosts when modal opens
  useEffect(() => {
    if (!open) return
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const projectParams = currentProject?.id ? { project_id: currentProject.id } : {}
        const [typesRes, hostsRes] = await Promise.all([
          syncApi.getBookingTypes(projectParams),
          syncApi.getHosts(projectParams)
        ])
        setBookingTypes(typesRes.data?.types || typesRes.data || [])
        setHosts(hostsRes.data?.hosts || hostsRes.data || [])
        
        // Auto-select first type if only one
        if ((typesRes.data?.types || typesRes.data)?.length === 1) {
          setSelectedType((typesRes.data?.types || typesRes.data)[0])
        }
      } catch (err) {
        console.error('Failed to fetch booking data:', err)
        toast.error('Failed to load booking options')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [open])

  // Fetch available slots when date/host/type changes
  useEffect(() => {
    if (!selectedDate || !selectedHost || !selectedType || !currentOrg?.slug) return
    const fetchSlots = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const response = await syncApi.getAvailability(
          currentOrg.slug,
          selectedType.slug,
          selectedDate,
          timezone
        )
        setAvailableSlots(response.data?.slots || [])
      } catch (err) {
        console.error('Failed to fetch slots:', err)
        setAvailableSlots([])
      }
    }
    fetchSlots()
  }, [selectedDate, selectedHost, selectedType, currentOrg?.slug])

  // Handle booking creation
  const handleBookMeeting = async () => {
    if (!selectedType || !selectedHost || !selectedSlot || !currentOrg?.slug) return
    
    setIsBooking(true)
    try {
      const response = await syncApi.createBooking({
        org: currentOrg.slug,
        bookingType: selectedType.slug,
        scheduledAt: selectedSlot.start,
        hostId: selectedHost.id,
        name: prospect.name,
        email: prospect.email,
        phone: prospect.phone,
        company: prospect.company,
        message: message,
        source: 'portal',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        projectId: currentProject?.id,
      })
      
      toast.success('Meeting scheduled successfully!')
      onClose()
      
      // Reset state
      setStep('type')
      setSelectedType(null)
      setSelectedHost(null)
      setSelectedDate('')
      setSelectedSlot(null)
      setMessage('')
    } catch (err) {
      console.error('Failed to book meeting:', err)
      toast.error(err.response?.data?.message || 'Failed to schedule meeting')
    } finally {
      setIsBooking(false)
    }
  }

  // Copy booking link for prospect
  const copyBookingLink = () => {
    if (!currentOrg?.slug || !selectedType?.slug) return
    const url = `https://portal.uptrademedia.com/book/${currentOrg.slug}/${selectedType.slug}`
    navigator.clipboard.writeText(url)
    toast.success('Booking link copied!')
  }

  // Format slot time for display
  const formatSlotTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Get next 7 days for date selection
  const getNextDays = () => {
    const days = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push({
        date: date.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      })
    }
    return days
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" style={{ color: brandColors.primary }} />
            Schedule Meeting with {prospect.name}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Select a meeting type'}
            {step === 'time' && 'Choose a date and time'}
            {step === 'confirm' && 'Confirm meeting details'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <UptradeSpinner size="md" className="[&_p]:hidden" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Step 1: Select Type & Host */}
            {step === 'type' && (
              <>
                <div className="space-y-2">
                  <Label>Meeting Type</Label>
                  <div className="grid gap-2">
                    {bookingTypes.length === 0 ? (
                      <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">
                        No booking types configured. Set up booking types in the Sync module.
                      </p>
                    ) : (
                      bookingTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                            selectedType?.id === type.id
                              ? "border-current bg-[var(--glass-bg)]"
                              : "border-[var(--glass-border)] hover:border-[var(--text-tertiary)]"
                          )}
                          style={selectedType?.id === type.id ? { 
                            borderColor: brandColors.primary,
                            color: brandColors.primary 
                          } : undefined}
                        >
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: brandColors.rgba.primary10 }}
                          >
                            <Video className="h-5 w-5" style={{ color: brandColors.primary }} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-[var(--text-primary)]">{type.title}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {type.duration_minutes} minutes
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {selectedType && hosts.length > 0 && (
                  <div className="space-y-2">
                    <Label>With</Label>
                    <Select value={selectedHost?.id} onValueChange={(id) => setSelectedHost(hosts.find(h => h.id === id))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select host" />
                      </SelectTrigger>
                      <SelectContent>
                        {hosts.map((host) => (
                          <SelectItem key={host.id} value={host.id}>
                            {host.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Action to copy booking link */}
                {selectedType && (
                  <div className="pt-2 border-t border-[var(--glass-border)]">
                    <button
                      onClick={copyBookingLink}
                      className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <Copy className="h-4 w-4" />
                      Copy booking link for prospect
                    </button>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button 
                    onClick={() => setStep('time')}
                    disabled={!selectedType || !selectedHost}
                    style={{ backgroundColor: brandColors.primary, color: 'white' }}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Select Date & Time */}
            {step === 'time' && (
              <>
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {getNextDays().map((day) => (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={cn(
                          "flex-shrink-0 px-3 py-2 rounded-lg border text-sm transition-all",
                          selectedDate === day.date
                            ? "border-current"
                            : "border-[var(--glass-border)] hover:border-[var(--text-tertiary)]"
                        )}
                        style={selectedDate === day.date ? { 
                          borderColor: brandColors.primary,
                          color: brandColors.primary,
                          backgroundColor: brandColors.rgba.primary10
                        } : undefined}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div className="space-y-2">
                    <Label>Available Times</Label>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">
                        No available times on this date
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {availableSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-sm transition-all",
                              selectedSlot?.start === slot.start
                                ? "border-current font-medium"
                                : "border-[var(--glass-border)] hover:border-[var(--text-tertiary)]"
                            )}
                            style={selectedSlot?.start === slot.start ? { 
                              borderColor: brandColors.primary,
                              color: brandColors.primary,
                              backgroundColor: brandColors.rgba.primary10
                            } : undefined}
                          >
                            {formatSlotTime(slot.start)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep('type')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button 
                    onClick={() => setStep('confirm')}
                    disabled={!selectedSlot}
                    style={{ backgroundColor: brandColors.primary, color: 'white' }}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && selectedSlot && (
              <>
                <div className="rounded-lg border border-[var(--glass-border)] p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5" style={{ color: brandColors.primary }} />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{selectedType?.title}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{selectedType?.duration_minutes} minutes with {selectedHost?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5" style={{ color: brandColors.primary }} />
                    <p className="text-sm text-[var(--text-primary)]">
                      {new Date(selectedSlot.start).toLocaleDateString([], { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {formatSlotTime(selectedSlot.start)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5" style={{ color: brandColors.primary }} />
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{prospect.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{prospect.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Add a message (optional)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Any notes for this meeting..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep('time')}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleBookMeeting}
                    disabled={isBooking}
                    style={{ backgroundColor: brandColors.primary, color: 'white' }}
                  >
                    {isBooking ? (
                      <>
                        <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Meeting
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Proposals List Component (Agency only)
function ProposalsList({ prospectId, brandColors }) {
  const [proposals, setProposals] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const response = await crmApi.getProspectProposals(prospectId)
        setProposals(response.data.proposals || [])
      } catch (err) {
        console.error('Failed to fetch proposals:', err)
        setProposals([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProposals()
  }, [prospectId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-[var(--text-tertiary)] mb-3">No proposals sent yet</p>
        <Button 
          size="sm"
          style={{ backgroundColor: brandColors.secondary, color: 'white' }}
          onClick={() => window.location.href = '/commerce?tab=contracts'}
        >
          <Send className="h-4 w-4 mr-2" />
          Send Proposal
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal) => (
        <div 
          key={proposal.id}
          className="p-3 rounded-lg border border-[var(--glass-border)] hover:border-[var(--border-hover)] transition-colors cursor-pointer"
          onClick={() => window.location.href = `/proposals/${proposal.id}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-[var(--text-primary)] truncate">
                {proposal.title}
              </h4>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {formatRelativeTime(proposal.sent_at)}
              </p>
            </div>
            <Badge
              className="ml-2 flex-shrink-0"
              style={{
                backgroundColor: proposal.status === 'signed' 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : proposal.status === 'viewed'
                  ? brandColors.rgba.secondary10
                  : 'var(--glass-bg-inset)',
                color: proposal.status === 'signed'
                  ? 'rgb(34, 197, 94)'
                  : proposal.status === 'viewed'
                  ? brandColors.secondary
                  : 'var(--text-tertiary)',
                border: 'none'
              }}
            >
              {proposal.status === 'signed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {proposal.status === 'viewed' && <Eye className="h-3 w-3 mr-1" />}
              {proposal.status === 'sent' && <Send className="h-3 w-3 mr-1" />}
              {proposal.status}
            </Badge>
          </div>
          {proposal.viewed_at && proposal.status !== 'signed' && (
            <p className="text-xs text-[var(--text-tertiary)]">
              <Eye className="h-3 w-3 inline mr-1" />
              Viewed {formatRelativeTime(proposal.viewed_at)}
            </p>
          )}
          {proposal.status === 'signed' && proposal.signed_at && (
            <p className="text-xs" style={{ color: 'rgb(34, 197, 94)' }}>
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              Signed {formatRelativeTime(proposal.signed_at)}
            </p>
          )}
        </div>
      ))}
      <Button 
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => window.location.href = '/commerce?tab=contracts'}
      >
        <Send className="h-4 w-4 mr-2" />
        Send Another Proposal
      </Button>
    </div>
  )
}

// Overview Tab
function OverviewTab({ prospect, brandColors, onStageChange, onConvert, isConverting, isAgency, onUpdate, onTabChange, isModalMode, pipelineStages = PIPELINE_STAGES }) {
  const [customFields, setCustomFields] = useState([])
  const [isLoadingFields, setIsLoadingFields] = useState(true)
  
  const stageConfig = pipelineStages[prospect.pipeline_stage || 'new_lead']
  const StageIcon = stageConfig?.icon || Sparkles

  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await crmApi.listCustomFields(prospect.project_id)
        setCustomFields(response.data || [])
      } catch (err) {
        console.error('Failed to fetch custom fields:', err)
      } finally {
        setIsLoadingFields(false)
      }
    }
    fetchCustomFields()
  }, [prospect.project_id])

  const handleFieldUpdate = async (field, value) => {
    try {
      const response = await crmApi.updateProspect(prospect.id, {
        [field]: value
      })
      if (response.data) {
        toast.success('Updated successfully')
        if (onUpdate) {
          onUpdate(response.data)
        }
      }
    } catch (err) {
      console.error('Failed to update field:', err)
      toast.error('Failed to update')
    }
  }

  const handleCustomFieldUpdate = async (fieldKey, value) => {
    try {
      const updatedFields = {
        ...(prospect.custom_fields || {}),
        [fieldKey]: value
      }
      const response = await crmApi.updateProspect(prospect.id, {
        custom_fields: updatedFields
      })
      if (response.data) {
        toast.success('Custom field updated')
        if (onUpdate) {
          onUpdate(response.data)
        }
      }
    } catch (err) {
      console.error('Failed to update custom field:', err)
      toast.error('Failed to update')
    }
  }

  const renderCustomField = (field) => {
    const value = prospect.custom_fields?.[field.field_key]
    
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleCustomFieldUpdate(field.field_key, e.target.value)}
            placeholder={`Enter ${field.field_label}`}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleCustomFieldUpdate(field.field_key, parseFloat(e.target.value) || null)}
            placeholder={`Enter ${field.field_label}`}
          />
        )
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleCustomFieldUpdate(field.field_key, e.target.value)}
          />
        )
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleCustomFieldUpdate(field.field_key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleCustomFieldUpdate(field.field_key, e.target.value)}
            placeholder={`Enter ${field.field_label}`}
            rows={3}
          />
        )
      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleCustomFieldUpdate(field.field_key, e.target.value)}
          />
        )
    }
  }

  return (
    <div className="space-y-6 p-4">
      {/* Contact Information */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className={cn(
          isModalMode ? "grid grid-cols-2 gap-3" : "space-y-3"
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)] flex-shrink-0">
              <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-tertiary)]">Email</p>
              <p className="text-sm text-[var(--text-primary)] truncate">
                {prospect.email || 'Not provided'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)] flex-shrink-0">
              <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-tertiary)]">Phone</p>
              <p className="text-sm text-[var(--text-primary)]">
                {prospect.phone || 'Not provided'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)] flex-shrink-0">
              <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-tertiary)]">Company</p>
              <p className="text-sm text-[var(--text-primary)] truncate">
                {prospect.company || 'Not provided'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)] flex-shrink-0">
              <Globe className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-tertiary)]">Website</p>
              {prospect.website ? (
                <a 
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 hover:underline truncate"
                  style={{ color: brandColors.primary }}
                >
                  {prospect.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              ) : (
                <p className="text-sm text-[var(--text-primary)]">Not provided</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stage */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pipeline Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={prospect.pipeline_stage || 'new_lead'} 
            onValueChange={onStageChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <StageIcon className="h-4 w-4" style={{ color: stageConfig?.textColor }} />
                  <span>{stageConfig?.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(pipelineStages).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: config.textColor }} />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Deal Value & Probability */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Deal Value</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-2">
              Deal Value
            </label>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
                <DollarSign className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={prospect.deal_value || ''}
                onChange={(e) => {
                  handleFieldUpdate('deal_value', parseFloat(e.target.value) || null)
                }}
                onBlur={(e) => {
                  handleFieldUpdate('deal_value', parseFloat(e.target.value) || null)
                }}
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-2">
              Win Probability
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={prospect.probability || 50}
                  onChange={(e) => {
                    handleFieldUpdate('probability', parseInt(e.target.value))
                  }}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {prospect.probability || 50}%
                </span>
              </div>
              
              {/* Weighted Value */}
              {prospect.deal_value && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ 
                    backgroundColor: brandColors.rgba.primary10,
                    borderLeft: `3px solid ${brandColors.primary}`
                  }}
                >
                  <p className="text-xs text-[var(--text-tertiary)]">Weighted Pipeline Value</p>
                  <p className="text-lg font-bold" style={{ color: brandColors.primary }}>
                    ${((prospect.deal_value * (prospect.probability || 50)) / 100).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-tertiary)] block mb-2">
              Expected Close Date
            </label>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[var(--glass-bg-inset)]">
                <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <Input
                type="date"
                value={prospect.expected_close_date || ''}
                onChange={(e) => {
                  handleFieldUpdate('expected_close_date', e.target.value || null)
                }}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source & Tags */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Source & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Source</p>
            <Badge variant="outline" className="capitalize gap-1.5">
              {prospect.source === 'form' && <FileText className="h-3.5 w-3.5" />}
              {prospect.source || 'Unknown'}
            </Badge>
            {prospect.form_submission_id && (
              <Badge 
                className="ml-2 gap-1.5"
                style={{ 
                  backgroundColor: brandColors.rgba.primary10,
                  color: brandColors.primary,
                  border: 'none'
                }}
              >
                <Link2 className="h-3.5 w-3.5" />
                Linked to Form
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Handle tags as string or array
                const tagsArray = Array.isArray(prospect.tags) 
                  ? prospect.tags 
                  : (typeof prospect.tags === 'string' ? JSON.parse(prospect.tags || '[]') : [])
                return tagsArray.length > 0 ? (
                  tagsArray.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">No tags</p>
                )
              })()}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Tag
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposals (Agency only) */}
      {isAgency && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <ProposalsList prospectId={prospect.id} brandColors={brandColors} />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="glass cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onTabChange?.('notes')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            Notes
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prospect.notes ? (
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-3">
              {prospect.notes}
            </p>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)] italic">Click to add notes</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Custom Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingFields ? (
              <div className="flex items-center justify-center py-4">
                <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:text-muted-foreground" />
              </div>
            ) : (
              customFields.map((field) => (
                <div key={field.id}>
                  <label className="text-xs text-[var(--text-tertiary)] block mb-2">
                    {field.field_label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderCustomField(field)}
                  {field.help_text && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{field.help_text}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Convert Action (show for closed_won) */}
      {prospect.pipeline_stage === 'closed_won' && (
        <Card className="glass border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">
                  {isAgency ? 'Convert to Contact' : 'Convert to Customer'}
                </h4>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {isAgency 
                    ? 'Create portal user and assign to project' 
                    : 'Add to Commerce customers for purchase tracking'}
                </p>
              </div>
              <Button
                disabled={prospect.converted_to_contact_id || prospect.converted_to_customer_id || isConverting}
                onClick={onConvert}
                style={!(prospect.converted_to_contact_id || prospect.converted_to_customer_id) ? { 
                  backgroundColor: isAgency ? brandColors.secondary : brandColors.primary, 
                  color: 'white' 
                } : {}}
              >
                {prospect.converted_to_contact_id || prospect.converted_to_customer_id ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Converted
                  </>
                ) : isConverting ? (
                  <>
                    <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                    Converting...
                  </>
                ) : (
                  <>
                    {isAgency ? <User className="h-4 w-4 mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                    Convert
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Form Response Tab
function FormResponseTab({ prospect, brandColors }) {
  const [formData, setFormData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchFormData = async () => {
      if (!prospect.form_submission_id) {
        console.log('[FormResponseTab] No form_submission_id on prospect')
        setIsLoading(false)
        return
      }
      
      try {
        console.log('[FormResponseTab] Fetching form data for prospect:', prospect.id)
        const response = await crmApi.getProspectFormSubmission(prospect.id)
        console.log('[FormResponseTab] API Response:', response)
        console.log('[FormResponseTab] Response.data:', response.data)
        setFormData(response.data)
        setError(null)
      } catch (err) {
        console.error('[FormResponseTab] Failed to fetch form data:', err)
        setError('Failed to load form data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFormData()
  }, [prospect.id, prospect.form_submission_id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <UptradeSpinner size="md" className="[&_p]:hidden" />
      </div>
    )
  }

  if (!prospect.form_submission_id) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <div 
          className="p-3 rounded-xl mb-3"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <FileText className="h-8 w-8" style={{ color: brandColors.primary }} />
        </div>
        <h4 className="font-medium text-[var(--text-primary)]">No Form Submission</h4>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          This prospect wasn't created from a form submission
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <Card className="glass">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: brandColors.primary }} />
              {formData?.form?.name || 'Form Submission'}
            </CardTitle>
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ 
                borderColor: brandColors.primary,
                color: brandColors.primary 
              }}
            >
              {formatRelativeTime(formData?.submission?.submittedAt)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {formData?.submission ? (
            <div className="space-y-3">
              {formData.submission.data && (() => {
                // Sort fields by form field order if available
                const fieldOrder = formData?.form?.fieldOrder || []
                const dataEntries = Object.entries(formData.submission.data)
                
                // Sort: fields in fieldOrder first (in order), then remaining fields
                const sortedEntries = dataEntries.sort((a, b) => {
                  const aIndex = fieldOrder.indexOf(a[0])
                  const bIndex = fieldOrder.indexOf(b[0])
                  
                  // Both in fieldOrder - sort by order
                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                  // Only a in fieldOrder - a comes first
                  if (aIndex !== -1) return -1
                  // Only b in fieldOrder - b comes first
                  if (bIndex !== -1) return 1
                  // Neither in fieldOrder - keep original order
                  return 0
                })
                
                return sortedEntries.map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                      {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <div 
                      className="px-3 py-2 rounded-lg text-sm text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--glass-bg-inset)' }}
                    >
                      {typeof value === 'object' ? JSON.stringify(value) : String(value) || '—'}
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-tertiary)]">
                No form data available
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Timeline Tab
function TimelineTab({ prospect, brandColors, isAgency }) {
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await crmApi.getProspectTimeline(prospect.id)
        setActivities(response.data.events || [])
      } catch (err) {
        console.error('Failed to fetch timeline:', err)
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTimeline()
  }, [prospect.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <UptradeSpinner size="md" className="[&_p]:hidden" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <div 
          className="p-3 rounded-xl mb-3"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <Clock className="h-8 w-8" style={{ color: brandColors.primary }} />
        </div>
        <h4 className="font-medium text-[var(--text-primary)]">No Activity Yet</h4>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          Activity will appear here as you interact with this prospect
        </p>
      </div>
    )
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'proposal_sent': return Send
      case 'proposal_viewed': return Eye
      case 'proposal_signed': return CheckCircle2
      case 'email_sent': return Mail
      case 'email_opened': return Eye
      case 'email_clicked': return MousePointer2
      case 'stage_changed': return ChevronRight
      case 'note_added': return MessageSquare
      default: return MessageSquare
    }
  }

  const getActivityColor = (type) => {
    if (type?.includes('proposal')) {
      return isAgency ? brandColors.secondary : brandColors.primary
    }
    return brandColors.primary
  }

  return (
    <div className="p-4">
      <div className="space-y-4">
        {activities.map((activity, i) => {
          const Icon = getActivityIcon(activity.type)
          const activityColor = getActivityColor(activity.type)
          return (
            <div key={i} className="flex gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isAgency && activity.type?.includes('proposal') ? brandColors.rgba.secondary10 : brandColors.rgba.primary10 }}
              >
                <Icon className="h-4 w-4" style={{ color: activityColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">{activity.description}</p>
                {activity.metadata?.proposal_name && (
                  <p className="text-xs font-medium mt-0.5" style={{ color: activityColor }}>
                    {activity.metadata.proposal_name}
                  </p>
                )}
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {formatRelativeTime(activity.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Score Circle Component for Audit Scores
function ScoreCircle({ score, label, size = 'md' }) {
  if (score === null || score === undefined) return null
  
  const getColor = (s) => {
    if (s >= 90) return { stroke: 'var(--accent-success, #22c55e)', text: 'text-green-500' }
    if (s >= 50) return { stroke: 'var(--accent-warning, #f59e0b)', text: 'text-amber-500' }
    return { stroke: 'var(--accent-error, #ef4444)', text: 'text-red-500' }
  }
  
  const colors = getColor(score)
  const radius = size === 'lg' ? 20 : 16
  const strokeWidth = size === 'lg' ? 3 : 2.5
  const dimensions = size === 'lg' ? 48 : 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke="var(--glass-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center font-semibold", colors.text, size === 'lg' ? 'text-sm' : 'text-xs')}>
          {score}
        </div>
      </div>
      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide text-center leading-tight">{label}</span>
    </div>
  )
}

// Audits Tab (Agency Only)
function AuditsTab({ prospect, brandColors }) {
  const [audits, setAudits] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewingAudit, setViewingAudit] = useState(null)

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        // Fetch audits by contact_id (if converted) or by matching target_url
        const response = await auditsApi.list({
          contactId: prospect.converted_contact_id || undefined,
          targetUrl: prospect.website || undefined,
          limit: 20
        })
        setAudits(response.data.audits || [])
      } catch (err) {
        console.error('Failed to fetch audits:', err)
        setAudits([])
      } finally {
        setIsLoading(false)
      }
    }
    
    if (prospect.website || prospect.converted_contact_id) {
      fetchAudits()
    } else {
      setIsLoading(false)
    }
  }, [prospect.id, prospect.website, prospect.converted_contact_id])

  const handleViewAudit = (audit) => {
    // Open audit in new tab with magic link if available
    if (audit.magic_token) {
      window.open(`/audit/${audit.id}?token=${audit.magic_token}`, '_blank')
    } else {
      window.open(`/audits?selected=${audit.id}`, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <UptradeSpinner size="md" className="[&_p]:hidden" />
      </div>
    )
  }

  if (audits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <div 
          className="p-3 rounded-xl mb-3"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <BarChart3 className="h-8 w-8" style={{ color: brandColors.primary }} />
        </div>
        <h4 className="font-medium text-[var(--text-primary)]">No Audits Yet</h4>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {prospect.website 
            ? 'Generate an audit from the Audits page to analyze this website'
            : 'Add a website URL to this prospect to generate audits'}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {audits.map((audit) => {
        const isComplete = audit.status === 'completed' || audit.status === 'complete'
        const createdDate = new Date(audit.created_at).toLocaleDateString()
        
        return (
          <Card key={audit.id} className="overflow-hidden">
            <CardContent className="p-4">
              {/* URL and Status */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate text-[var(--text-primary)]">
                    {audit.target_url}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {createdDate}
                    {audit.sent_at && ` • Sent ${new Date(audit.sent_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Badge 
                  variant={isComplete ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs capitalize',
                    isComplete && 'bg-green-100 text-green-700 hover:bg-green-100'
                  )}
                >
                  {audit.status}
                </Badge>
              </div>
              
              {/* Score Circles */}
              {isComplete && (
                <div className="flex items-center justify-around py-3 px-2 rounded-lg mb-4" style={{ backgroundColor: 'var(--glass-bg-inset)' }}>
                  <ScoreCircle 
                    score={audit.performance_score} 
                    label="Perf" 
                    size="md"
                  />
                  <ScoreCircle 
                    score={audit.seo_score} 
                    label="SEO" 
                    size="md"
                  />
                  <ScoreCircle 
                    score={audit.accessibility_score} 
                    label="A11y" 
                    size="md"
                  />
                  <ScoreCircle 
                    score={audit.best_practices_score} 
                    label="Best" 
                    size="md"
                  />
                </div>
              )}
              
              {/* View Full Audit Button */}
              {isComplete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleViewAudit(audit)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Audit
                </Button>
              )}
              
              {/* Processing state */}
              {!isComplete && (
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-tertiary)]">
                  <UptradeSpinner size="sm" className="[&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                  <span>Processing...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Emails Tab — Org-wide cross-user email visibility
function EmailsTab({ prospect, brandColors, onCompose }) {
  const { currentProject } = useAuthStore()
  const [threads, setThreads] = useState([])
  const [totalEmails, setTotalEmails] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [gmailConnected, setGmailConnected] = useState(null) // null = checking
  const [connecting, setConnecting] = useState(false)
  const [expandedThread, setExpandedThread] = useState(null)

  // Check Gmail connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data } = await crmApi.getGmailStatus()
        setGmailConnected(data?.connected === true)
      } catch {
        setGmailConnected(false)
      }
    }
    checkConnection()
  }, [])

  // Fetch org-wide emails for this contact
  const fetchEmails = async () => {
    setIsLoading(true)
    try {
      const { data } = await crmApi.getContactEmails(prospect.id, { limit: 100 })
      setThreads(data.threads || [])
      setTotalEmails(data.totalEmails || 0)
    } catch (err) {
      console.error('Failed to fetch contact emails:', err)
      setThreads([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (prospect?.id) fetchEmails()
  }, [prospect?.id])

  // Handle Gmail connect
  const handleConnectGmail = async () => {
    if (!currentProject?.id) {
      toast.error('No project selected')
      return
    }
    setConnecting(true)
    try {
      const returnUrl = window.location.href.split('?')[0]
      const response = await emailApi.getGmailAuthUrl(currentProject.id, returnUrl)
      const { authUrl } = response.data || response
      if (!authUrl) throw new Error('No auth URL returned')
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error)
      toast.error('Failed to start Gmail connection')
      setConnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <UptradeSpinner size="md" className="[&_p]:hidden" />
      </div>
    )
  }

  // Show connect prompt only if no one in the org has synced emails for this contact
  if (gmailConnected === false && threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <div 
          className="p-3 rounded-xl mb-3"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <Mail className="h-8 w-8" style={{ color: brandColors.primary }} />
        </div>
        <h4 className="font-medium text-[var(--text-primary)]">Connect Gmail</h4>
        <p className="text-sm text-[var(--text-tertiary)] mt-1 mb-4">
          Connect your Gmail account to view and send emails
        </p>
        <Button 
          style={{ backgroundColor: brandColors.primary, color: 'white' }}
          onClick={handleConnectGmail}
          disabled={connecting}
        >
          {connecting ? (
            <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Connect Gmail
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-medium text-[var(--text-primary)]">Email Threads</h4>
          <p className="text-xs text-[var(--text-tertiary)]">
            {totalEmails} email{totalEmails !== 1 ? 's' : ''} across {threads.length} thread{threads.length !== 1 ? 's' : ''} (all team members)
          </p>
        </div>
        <Button 
          size="sm" 
          style={{ backgroundColor: brandColors.primary, color: 'white' }}
          onClick={() => onCompose?.()}
        >
          <Send className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>
      
      {threads.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--text-tertiary)]">
            No email threads found with {prospect.email}
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-3"
            onClick={() => onCompose?.()}
          >
            <Send className="h-4 w-4 mr-2" />
            Send First Email
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Card 
              key={thread.thread_id} 
              className="glass overflow-hidden cursor-pointer hover:bg-[var(--glass-bg-hover)] transition-colors"
              onClick={() => setExpandedThread(expandedThread === thread.thread_id ? null : thread.thread_id)}
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "font-medium text-sm text-[var(--text-primary)] truncate",
                      thread.has_unread && "font-bold"
                    )}>
                      {thread.subject || '(No subject)'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
                      </span>
                      {thread.needs_response && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                          Needs reply
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                    {formatRelativeTime(thread.latest_date)}
                  </span>
                </div>

                {/* Expanded: show individual messages */}
                {expandedThread === thread.thread_id && thread.messages && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)] space-y-2">
                    {thread.messages.map((msg, i) => (
                      <div key={msg.id || i} className="text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-medium",
                            msg.direction === 'outbound' ? 'text-blue-500' : 'text-[var(--text-primary)]'
                          )}>
                            {msg.direction === 'outbound' ? (
                              <>You → {prospect.name || prospect.email}</>
                            ) : (
                              <>{msg.from_name || msg.from_email} → You</>
                            )}
                          </span>
                          <span className="text-[var(--text-tertiary)]">
                            {formatRelativeTime(msg.email_date)}
                          </span>
                        </div>
                        {msg.snippet && (
                          <p className="text-[var(--text-tertiary)] line-clamp-2">
                            {msg.snippet}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Meetings Tab
function MeetingsTab({ prospect, brandColors, onSchedule }) {
  const [meetings, setMeetings] = useState({ upcoming: [], past: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await crmApi.getProspectMeetings(prospect.id)
        setMeetings(response.data)
      } catch (err) {
        console.error('Failed to fetch meetings:', err)
        setMeetings({ upcoming: [], past: [] })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMeetings()
  }, [prospect.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <UptradeSpinner size="md" className="[&_p]:hidden" />
      </div>
    )
  }

  const totalMeetings = meetings.upcoming.length + meetings.past.length

  if (totalMeetings === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <div 
          className="p-3 rounded-xl mb-3"
          style={{ backgroundColor: brandColors.rgba.primary10 }}
        >
          <Calendar className="h-8 w-8" style={{ color: brandColors.primary }} />
        </div>
        <h4 className="font-medium text-[var(--text-primary)]">No Meetings</h4>
        <p className="text-sm text-[var(--text-tertiary)] mt-1 mb-4">
          Schedule a meeting with this prospect
        </p>
        <Button 
          onClick={onSchedule}
          style={{ backgroundColor: brandColors.primary, color: 'white' }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-[var(--text-primary)]">Meetings</h4>
        <Button 
          size="sm"
          onClick={onSchedule}
          style={{ backgroundColor: brandColors.primary, color: 'white' }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Schedule
        </Button>
      </div>
      
      {meetings.upcoming.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Upcoming</h5>
          <div className="space-y-2">
            {meetings.upcoming.map((meeting, i) => (
              <div key={i} className="border border-[var(--glass-border)] rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: brandColors.rgba.primary10 }}
                  >
                    <Video className="h-4 w-4" style={{ color: brandColors.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)]">{meeting.title || meeting.booking_type?.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {new Date(meeting.scheduled_at).toLocaleDateString([], { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                    {meeting.host?.name && (
                      <p className="text-xs text-[var(--text-tertiary)]">with {meeting.host.name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {meetings.past.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Past</h5>
          <div className="space-y-2">
            {meetings.past.map((meeting, i) => (
              <div key={i} className="border border-[var(--glass-border)] rounded-lg p-3 opacity-60">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg flex-shrink-0 bg-[var(--glass-bg)]">
                    <Video className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)]">{meeting.title || meeting.booking_type?.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {new Date(meeting.scheduled_at).toLocaleDateString([], { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Notes Tab
function NotesTab({ prospect, brandColors, onUpdate }) {
  const [notes, setNotes] = useState(prospect.notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNotes = async () => {
    setIsSaving(true)
    try {
      const response = await crmApi.updateProspect(prospect.id, { notes })
      if (response.data) {
        toast.success('Notes saved')
        onUpdate?.(response.data)
      }
    } catch (err) {
      console.error('Failed to save notes:', err)
      toast.error('Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">Notes</h3>
          <p className="text-xs text-muted-foreground">Keep track of important information</p>
        </div>
        <Button
          onClick={handleSaveNotes}
          disabled={isSaving}
          size="sm"
          style={{ backgroundColor: brandColors.primary, color: 'white' }}
        >
          {isSaving ? (
            <>
              <UptradeSpinner size="sm" className="mr-1.5 [&_p]:hidden [&_svg]:!h-3 [&_svg]:!w-3" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-3 w-3 mr-1.5" />
              Save
            </>
          )}
        </Button>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this prospect..."
        className="min-h-[300px] resize-none"
      />
    </div>
  )
}

// Tracking Tab - Analytics tracking for prospect site visits
function TrackingTab({ prospect, brandColors }) {
  const [trackingData, setTrackingData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { currentProject } = useAuthStore()

  useEffect(() => {
    const fetchTrackingData = async () => {
      if (!prospect.email || !currentProject?.id) {
        setIsLoading(false)
        return
      }
      
      try {
        // Get page views for this prospect's visitor ID or by email match
        const response = await crmApi.getProspectActivity(prospect.id)
        setTrackingData(response.data || { pageViews: [], sessions: [] })
      } catch (err) {
        console.error('Failed to fetch tracking data:', err)
        setTrackingData({ pageViews: [], sessions: [] })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTrackingData()
  }, [prospect.id, prospect.email, currentProject?.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <UptradeSpinner size="md" className="[&_p]:hidden" />
      </div>
    )
  }

  const pageViews = trackingData?.pageViews || []
  const sessions = trackingData?.sessions || []

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Eye className="h-4 w-4" style={{ color: brandColors.primary }} />
          Site Activity
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Track when this prospect visits your site
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <p className="text-2xl font-bold" style={{ color: brandColors.primary }}>
            {sessions.length}
          </p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <p className="text-2xl font-bold" style={{ color: brandColors.secondary }}>
            {pageViews.length}
          </p>
          <p className="text-xs text-muted-foreground">Page Views</p>
        </div>
        <div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <p className="text-2xl font-bold text-amber-500">
            {sessions.length > 0 ? formatRelativeTime(sessions[0]?.started_at) : 'Never'}
          </p>
          <p className="text-xs text-muted-foreground">Last Visit</p>
        </div>
      </div>

      {/* Page View List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">Recent Page Views</h4>
        {pageViews.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[var(--glass-border)] rounded-lg">
            <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No tracked activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Page views will appear here when this prospect visits your site
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pageViews.slice(0, 50).map((view, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]"
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: brandColors.rgba.primary10 }}
                >
                  <MousePointer2 className="h-4 w-4" style={{ color: brandColors.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{view.page_path || view.path}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatRelativeTime(view.created_at || view.timestamp)}</span>
                    {view.referrer && (
                      <>
                        <span>•</span>
                        <span className="truncate">from {view.referrer}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main Drawer Component
export default function ProspectDetailDrawer({
  prospect,
  onClose,
  onUpdate,
  onStageChange,
  isAgency = false,
  embedded = false,  // When true, renders inline without fixed positioning
  pipelineStages: pipelineStagesProp,  // Optional: same config as CRM sidebar/kanban (from Configure pipeline)
  expanded,
  onExpand,
}) {
  const { currentProject } = useAuthStore()
  const { primary: brandPrimary, rgba, primaryHover } = useBrandColors()
  const brandColors = { primary: brandPrimary, rgba, primaryHover }
  const pipelineStages = pipelineStagesProp || PIPELINE_STAGES
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isConverting, setIsConverting] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isModalMode, setIsModalMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showEmailCompose, setShowEmailCompose] = useState(false)
  const stageConfig = pipelineStages[prospect.pipeline_stage || 'new_lead']
  const StageIcon = stageConfig?.icon || Sparkles

  // Handle converting prospect to customer (non-agency) or contact (agency)
  const handleConvert = useCallback(async () => {
    setIsConverting(true)
    try {
      if (isAgency) {
        // Agency: Convert to Contact (create portal user)
        const response = await crmApi.convertProspectToContact(prospect.id)
        if (response.data.contact) {
          toast.success(response.data.message || 'Successfully converted to contact. Setup email sent.')
          if (onUpdate) {
            onUpdate({ 
              ...prospect, 
              converted_to_contact_id: response.data.contact.id 
            })
          }
        }
      } else {
        // Non-agency: Convert to Commerce Customer
        const response = await crmApi.convertProspectToCustomer(prospect.id)
        if (response.data.customer) {
          toast.success(response.data.message || 'Successfully converted to customer')
          if (onUpdate) {
            onUpdate({ 
              ...prospect, 
              converted_to_customer_id: response.data.customer.id 
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to convert:', err)
      toast.error(isAgency ? 'Failed to convert prospect to contact' : 'Failed to convert prospect to customer')
    } finally {
      setIsConverting(false)
    }
  }, [prospect, onUpdate, isAgency])

  const handleDelete = useCallback(async () => {
    try {
      await crmApi.deleteProspect(prospect.id)
      toast.success('Prospect deleted successfully')
      onClose()
      // Trigger refresh if onUpdate callback exists
      if (onUpdate) {
        onUpdate(null)
      }
    } catch (err) {
      console.error('Failed to delete prospect:', err)
      toast.error('Failed to delete prospect')
    }
  }, [prospect, onClose, onUpdate])

  // Drawer content (can be used in modal or sidebar)
  const drawerContent = (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isModalMode 
        ? "h-[80vh] w-full bg-[var(--glass-bg)] rounded-xl" 
        : embedded 
          ? "h-full w-full bg-muted/30" 
          : "fixed inset-y-0 right-0 w-[480px] max-w-full z-50 border-l border-[var(--glass-border)] shadow-2xl bg-[var(--glass-bg)]"
    )}>
        {/* Drag Handle - only show in non-embedded mode */}
        {!embedded && (
          <div className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent cursor-col-resize transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center">
            <div className="absolute left-[-8px] w-4 h-12 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
          </div>
        )}
        
        {/* Header - simplified for embedded mode */}
        <div 
          className={cn(
            "flex-shrink-0 border-b border-[var(--glass-border)]",
            embedded ? "p-4" : "p-4"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div 
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                style={{ backgroundColor: brandPrimary }}
              >
                {prospect.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[var(--text-primary)] truncate text-sm leading-tight">
                  {prospect.name}
                </h2>
                {prospect.company && (
                  <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 truncate mt-0.5">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{prospect.company}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0 flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit prospect</TooltipContent>
              </Tooltip>
              <div className="flex-1" />
              {embedded && !isModalMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => setIsModalMode(!isModalMode)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Expand to modal</TooltipContent>
                </Tooltip>
              )}
              {!isModalMode && !embedded && (
                <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions - Compact row */}
          <div className="flex items-center gap-1.5 mt-2">
            <Button 
              variant="secondary" 
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => setShowEmailCompose(true)}
            >
              <Mail className="h-3 w-3" />
              Email
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              className="h-7 text-xs gap-1 px-2"
              onClick={() => setShowScheduleModal(true)}
            >
              <Calendar className="h-3 w-3" />
              Schedule
            </Button>
            <Badge 
              className="text-xs h-6 gap-1 px-2 ml-auto"
              style={{ 
                backgroundColor: stageConfig?.bgLight,
                color: stageConfig?.textColor,
                border: 'none'
              }}
            >
              <StageIcon className="h-3 w-3" />
              {stageConfig?.label}
            </Badge>
          </div>
        </div>

        {/* Tabs - sidebar style navigation with icon-only when collapsed, always show labels in modal mode */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--glass-border)]">
            {isModalMode && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Details</p>
            )}
            <div className={cn("flex gap-1 flex-wrap", !isModalMode && "justify-center")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'overview' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'overview' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <User className="h-3.5 w-3.5" />
                    {isModalMode && 'Overview'}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Overview</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('form')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors relative',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'form' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'form' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {isModalMode && 'Form'}
                    {prospect.form_submission_id && (
                      <span className={cn(
                        "rounded-full bg-current",
                        isModalMode ? "w-1.5 h-1.5 opacity-75" : "absolute top-1 right-1 w-2 h-2"
                      )} />
                    )}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Form</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'notes' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'notes' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {isModalMode && 'Notes'}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Notes</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'timeline' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'timeline' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {isModalMode && 'Activity'}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Activity</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('emails')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'emails' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'emails' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {isModalMode && 'Emails'}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Emails</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('meetings')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'meetings' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'meetings' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <Video className="h-3.5 w-3.5" />
                    {isModalMode && 'Meetings'}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Meetings</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveTab('tracking')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                      isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                      activeTab === 'tracking' 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={activeTab === 'tracking' ? { backgroundColor: brandPrimary } : undefined}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isModalMode && 'Tracking'}
                  </button>
                </TooltipTrigger>
                {!isModalMode && <TooltipContent side="right">Site Tracking</TooltipContent>}
              </Tooltip>
              {/* Audits Tab - Agency Only */}
              {isAgency && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => setActiveTab('audits')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                        isModalMode ? 'px-3 py-1.5' : 'p-2 justify-center',
                        activeTab === 'audits' 
                          ? 'text-white' 
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                      style={activeTab === 'audits' ? { backgroundColor: brandPrimary } : undefined}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      {isModalMode && 'Audits'}
                    </button>
                  </TooltipTrigger>
                  {!isModalMode && <TooltipContent side="right">Site Audits</TooltipContent>}
                </Tooltip>
              )}
            </div>
          </div>

          {/* Scrollable content area */}
          <ScrollArea className="flex-1 min-h-0">
            <TabsContent value="overview" className="m-0 min-h-full">
              <OverviewTab 
                prospect={prospect} 
                brandColors={brandColors}
                onStageChange={onStageChange}
                onConvert={handleConvert}
                isConverting={isConverting}
                isAgency={isAgency}
                onUpdate={onUpdate}
                onTabChange={setActiveTab}
                isModalMode={isModalMode}
                pipelineStages={pipelineStages}
              />
            </TabsContent>
            <TabsContent value="form" className="m-0 min-h-full">
              <FormResponseTab prospect={prospect} brandColors={brandColors} />
            </TabsContent>
            <TabsContent value="notes" className="m-0 min-h-full">
              <NotesTab prospect={prospect} brandColors={brandColors} onUpdate={onUpdate} />
            </TabsContent>
            <TabsContent value="timeline" className="m-0 min-h-full">
              <TimelineTab prospect={prospect} brandColors={brandColors} isAgency={isAgency} />
            </TabsContent>
            <TabsContent value="emails" className="m-0 min-h-full">
              <EmailsTab 
                prospect={prospect} 
                brandColors={brandColors} 
                onCompose={() => setShowEmailCompose(true)}
              />
            </TabsContent>
            <TabsContent value="meetings" className="m-0 min-h-full">
              <MeetingsTab 
                prospect={prospect} 
                brandColors={brandColors} 
                onSchedule={() => setShowScheduleModal(true)}
              />
            </TabsContent>
            <TabsContent value="tracking" className="m-0 min-h-full">
              <TrackingTab prospect={prospect} brandColors={brandColors} />
            </TabsContent>
            {/* Audits Tab - Agency Only */}
            {isAgency && (
              <TabsContent value="audits" className="m-0 min-h-full">
                <AuditsTab prospect={prospect} brandColors={brandColors} />
              </TabsContent>
            )}
          </ScrollArea>
        </Tabs>
      </div>
  )

  return (
    <TooltipProvider>
      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        prospect={prospect}
        brandColors={brandColors}
      />

      {/* Email Compose Dialog */}
      <EmailComposeDialog
        open={showEmailCompose}
        onOpenChange={setShowEmailCompose}
        contact={prospect}
        projectId={currentProject?.id}
      />

      {isModalMode ? (
        <Dialog open={isModalMode} onOpenChange={setIsModalMode}>
          <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
            {drawerContent}
          </DialogContent>
        </Dialog>
      ) : (
        <>
          {drawerContent}
          {/* Backdrop - only show in non-embedded mode */}
          {!embedded && (
            <div 
              className="fixed inset-0 bg-black/20 z-40"
              onClick={onClose}
            />
          )}
        </>
      )}
    </TooltipProvider>
  )}