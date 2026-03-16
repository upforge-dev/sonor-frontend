// src/components/sync/BookingTypesPanel.jsx
// Panel for managing booking types (discovery call, audit review, etc.)

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Clock,
  Users,
  Calendar,
  Loader2,
  MoreVertical,
  Eye,
  EyeOff,
  GripVertical,
  Route,
  Phone,
  Briefcase,
  BarChart3,
  Target,
  FileText,
  Search,
  Lightbulb,
  Rocket,
  TrendingUp,
  Handshake
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/portal-api'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'
import HostRoutingPanel from './HostRoutingPanel'

// Icon options for booking types (lucide icons)
const BOOKING_ICONS = [
  { id: 'phone', Icon: Phone, label: 'Phone' },
  { id: 'briefcase', Icon: Briefcase, label: 'Business' },
  { id: 'bar-chart', Icon: BarChart3, label: 'Analytics' },
  { id: 'target', Icon: Target, label: 'Strategy' },
  { id: 'file-text', Icon: FileText, label: 'Document' },
  { id: 'search', Icon: Search, label: 'Review' },
  { id: 'lightbulb', Icon: Lightbulb, label: 'Ideas' },
  { id: 'rocket', Icon: Rocket, label: 'Launch' },
  { id: 'trending-up', Icon: TrendingUp, label: 'Growth' },
  { id: 'handshake', Icon: Handshake, label: 'Partnership' },
]

const COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
]

export default function BookingTypesPanel({ isOpen, onClose, inline = false }) {
  const { currentOrg, currentProject } = useAuthStore()
  const [bookingTypes, setBookingTypes] = useState([])
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [routingType, setRoutingType] = useState(null)

  // Fetch booking types and hosts - re-fetch when project changes
  useEffect(() => {
    if (isOpen || inline) {
      fetchBookingTypes()
      fetchHosts()
    }
  }, [isOpen, inline, currentProject?.id])

  const fetchHosts = async () => {
    try {
      const params = {}
      if (currentProject?.id) params.project_id = currentProject.id
      const { data } = await syncApi.getHosts(params)
      setHosts(data.hosts || [])
    } catch (error) {
      console.error('Failed to fetch hosts:', error)
    }
  }

  const fetchBookingTypes = async () => {
    try {
      setLoading(true)
      const params = {}
      if (currentProject?.id) params.project_id = currentProject.id
      const { data } = await syncApi.getBookingTypes(params)
      setBookingTypes(data?.types ?? [])
    } catch (error) {
      console.error('Failed to fetch booking types:', error)
      toast.error('Failed to load booking types')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublic = async (type, isPublic) => {
    try {
      await syncApi.updateBookingType(type.id, { is_public: isPublic })
      setBookingTypes(types => 
        types.map(t => t.id === type.id ? { ...t, is_public: isPublic } : t)
      )
      toast.success(isPublic ? 'Booking type is now public' : 'Booking type hidden')
    } catch (error) {
      toast.error('Failed to update booking type')
    }
  }

  const handleDelete = async (typeId) => {
    if (!confirm('Are you sure you want to delete this booking type?')) return
    
    try {
      await syncApi.deleteBookingType(typeId)
      setBookingTypes(types => types.filter(t => t.id !== typeId))
      toast.success('Booking type deleted')
    } catch (error) {
      toast.error('Failed to delete booking type')
    }
  }

  const copyBookingLink = (type) => {
    const orgSlug = currentOrg?.slug || 'uptrade-media'
    const link = `https://app.sonor.io/book/${orgSlug}/${type.slug}`
    navigator.clipboard.writeText(link)
    toast.success('Booking link copied to clipboard')
  }

  if (!isOpen && !inline) return null

  const content = (
    <>
        <div className="flex-1 overflow-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bookingTypes.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No booking types yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first booking type to start accepting meetings
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Booking Type
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingTypes.map((type) => (
                <motion.div
                  key={type.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-sm transition-shadow"
                >
                  {/* Icon */}
                  {(() => {
                    const iconConfig = BOOKING_ICONS.find(i => i.id === type.icon) || BOOKING_ICONS[0]
                    const IconComponent = iconConfig.Icon
                    return (
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: (type.color || '#10b981') + '20' }}
                      >
                        <IconComponent className="h-6 w-6" style={{ color: type.color || '#10b981' }} />
                      </div>
                    )
                  })()}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{type.name}</h3>
                      {!type.is_public && (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {type.description || 'No description'}
                    </p>
                    {type.slug && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        slug: {type.slug}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {type.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {type.buffer_after_minutes} min buffer
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={type.is_public}
                      onCheckedChange={(checked) => handleTogglePublic(type, checked)}
                    />
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyBookingLink(type)}
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy Link
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingType(type)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoutingType(type)}>
                          <Route className="h-4 w-4 mr-2" />
                          Host Routing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyBookingLink(type)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Preview Page
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(type.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        <BookingTypeFormModal
          isOpen={showCreateModal || !!editingType}
          onClose={() => {
            setShowCreateModal(false)
            setEditingType(null)
          }}
          editingType={editingType}
          projectId={currentProject?.id}
          onSaved={() => {
            setShowCreateModal(false)
            setEditingType(null)
            fetchBookingTypes()
          }}
        />

        {/* Host Routing Modal */}
        <HostRoutingPanel
          isOpen={!!routingType}
          onClose={() => setRoutingType(null)}
          bookingType={routingType}
          hosts={hosts}
          onUpdated={fetchBookingTypes}
        />
    </>
  )

  if (inline) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Booking Types
            </h2>
            <p className="text-sm text-muted-foreground">Manage your booking types for consultations and meetings</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking Type
          </Button>
        </div>
        <div className="flex-1 overflow-auto px-6">
          {content}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Booking Types
          </DialogTitle>
          <DialogDescription>
            Manage your booking types for consultations and meetings
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking Type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Form modal for create/edit
function BookingTypeFormModal({ isOpen, onClose, editingType, projectId, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    duration_minutes: '30',
    buffer_after_minutes: '15',
    min_notice_hours: '24',
    max_advance_days: '60',
    icon: 'phone',
    color: '#10b981',
    is_public: true,
  })

  useEffect(() => {
    if (editingType) {
      setFormData({
        name: editingType.name || '',
        slug: editingType.slug || '',
        description: editingType.description || '',
        duration_minutes: String(editingType.duration_minutes || 30),
        buffer_after_minutes: String(editingType.buffer_after_minutes || 15),
        min_notice_hours: String(editingType.min_notice_hours || 24),
        max_advance_days: String(editingType.max_advance_days || 60),
        icon: editingType.icon || 'phone',
        color: editingType.color || '#10b981',
        is_public: editingType.is_public !== false,
      })
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        duration_minutes: '30',
        buffer_after_minutes: '15',
        min_notice_hours: '24',
        max_advance_days: '60',
        icon: 'phone',
        color: '#10b981',
        is_public: true,
      })
    }
  }, [editingType, isOpen])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name')
      return
    }

    setSaving(true)
    try {
      const rawSlug = (formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')).replace(/-+/g, '-').replace(/^-|-$/g, '')
      const slug = rawSlug || formData.name.toLowerCase().replace(/\s+/g, '-')

      if (editingType) {
        const data = {
          ...formData,
          slug,
          duration_minutes: parseInt(formData.duration_minutes),
          buffer_after_minutes: parseInt(formData.buffer_after_minutes),
          min_notice_hours: parseInt(formData.min_notice_hours),
          max_advance_days: parseInt(formData.max_advance_days),
        }
        if (projectId) data.projectId = projectId
        await syncApi.updateBookingType(editingType.id, data)
        toast.success('Booking type updated')
      } else {
        // API expects camelCase for create
        const data = {
          slug,
          name: formData.name.trim(),
          description: formData.description || undefined,
          projectId: projectId || undefined,
          durationMinutes: parseInt(formData.duration_minutes) || 30,
          slotIntervalMinutes: 15,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: parseInt(formData.buffer_after_minutes) || 15,
          minNoticeHours: parseInt(formData.min_notice_hours) || 24,
          maxAdvanceDays: parseInt(formData.max_advance_days) || 60,
          maxPerDay: 8,
          allowGuestCancel: formData.allow_guest_cancel !== false,
          allowGuestReschedule: formData.allow_guest_reschedule !== false,
          icon: formData.icon || undefined,
          color: formData.color || undefined,
          isPublic: formData.is_public !== false,
          sortOrder: 0,
        }
        await syncApi.createBookingType(data)
        toast.success('Booking type created')
      }
      onSaved()
    } catch (error) {
      const status = error?.response?.status
      const msg = error?.response?.data?.error?.message ?? error?.message ?? (editingType ? 'Failed to update' : 'Failed to create')
      if (status === 409) {
        onSaved()
        toast.warning('That slug already exists for this project. Refreshed the list—edit the existing booking type if needed.')
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingType ? 'Edit Booking Type' : 'New Booking Type'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Icon & Color */}
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {BOOKING_ICONS.map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setFormData(f => ({ ...f, icon: id }))}
                    className={cn(
                      "w-9 h-9 rounded-md flex items-center justify-center transition-colors",
                      formData.icon === id ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
                    )}
                    title={label}
                  >
                    <Icon className="h-5 w-5" style={{ color: formData.color }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setFormData(f => ({ ...f, color: color.value }))}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      formData.color === color.value && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Discovery Call"
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="schedule-a-tour"
              value={formData.slug}
              onChange={(e) => setFormData(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier for the booking widget. Use this in <code className="rounded bg-muted px-1">bookingTypeSlug</code> (e.g. <code className="rounded bg-muted px-1">schedule-a-tour</code>). Leave blank to auto-generate from name.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Learn about your business and explore how we can help"
              value={formData.description}
              onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Duration & Buffer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select 
                value={formData.duration_minutes} 
                onValueChange={(v) => setFormData(f => ({ ...f, duration_minutes: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buffer After</Label>
              <Select 
                value={formData.buffer_after_minutes}
                onValueChange={(v) => setFormData(f => ({ ...f, buffer_after_minutes: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notice & Advance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Notice</Label>
              <Select 
                value={formData.min_notice_hours}
                onValueChange={(v) => setFormData(f => ({ ...f, min_notice_hours: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Advance</Label>
              <Select 
                value={formData.max_advance_days}
                onValueChange={(v) => setFormData(f => ({ ...f, max_advance_days: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">2 weeks</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                  <SelectItem value="60">2 months</SelectItem>
                  <SelectItem value="90">3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reschedule & Cancel Policy */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Guest Policies</Label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <span className="text-sm">Allow guest cancel</span>
                <input
                  type="checkbox"
                  checked={formData.allow_guest_cancel !== false}
                  onChange={(e) => setFormData(f => ({ ...f, allow_guest_cancel: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <span className="text-sm">Allow guest reschedule</span>
                <input
                  type="checkbox"
                  checked={formData.allow_guest_reschedule !== false}
                  onChange={(e) => setFormData(f => ({ ...f, allow_guest_reschedule: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
              </label>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingType ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
