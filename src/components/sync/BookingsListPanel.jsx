// src/components/sync/BookingsListPanel.jsx
// Panel for viewing and managing scheduled bookings

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Video,
  MapPin,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronRight,
  Filter,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  StickyNote,
  Tag,
  Save,
  Edit2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { syncApi } from '@/lib/portal-api'
import { toast } from 'sonner'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: Check },
  'no-show': { label: 'No Show', color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400', icon: Ban },
}

export default function BookingsListPanel({ isOpen, onClose, inline = false }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    if (isOpen || inline) {
      fetchBookings()
    }
  }, [isOpen, inline, activeTab])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const params = {
        status: activeTab === 'upcoming' ? 'confirmed,pending' : activeTab === 'past' ? 'completed,no-show' : 'cancelled',
        limit: 50,
      }
      const { data } = await syncApi.getBookings(params)
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (booking) => {
    if (!confirm(`Cancel booking with ${booking.guest_name}?`)) return
    
    try {
      await syncApi.cancelBooking(booking.id, 'Cancelled by admin')
      toast.success('Booking cancelled')
      fetchBookings()
    } catch (error) {
      toast.error('Failed to cancel booking')
    }
  }

  const getDateLabel = (date) => {
    const d = new Date(date)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE, MMM d')
  }

  const filteredBookings = bookings.filter(b => 
    !searchQuery || 
    b.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.guest_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group by date
  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const dateKey = format(new Date(booking.scheduled_at), 'yyyy-MM-dd')
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(booking)
    return groups
  }, {})

  const content = (
    <>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 pb-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-48"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchBookings}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No bookings found</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'upcoming' 
                    ? "You don't have any upcoming bookings"
                    : activeTab === 'past'
                    ? "No past bookings to show"
                    : "No cancelled bookings"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedBookings)
                  .sort(([a], [b]) => activeTab === 'upcoming' ? a.localeCompare(b) : b.localeCompare(a))
                  .map(([dateKey, dateBookings]) => (
                    <div key={dateKey}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                        {getDateLabel(dateKey)}
                      </h3>
                      <div className="space-y-2">
                        {dateBookings.map((booking) => {
                          const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed
                          const StatusIcon = statusConfig.icon
                          const scheduledAt = new Date(booking.scheduled_at)
                          const isPastBooking = isPast(scheduledAt)
                          
                          return (
                            <motion.div
                              key={booking.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer",
                                "hover:bg-muted/50",
                                isPastBooking && activeTab === 'upcoming' && "opacity-60"
                              )}
                              onClick={() => setSelectedBooking(booking)}
                            >
                              {/* Time */}
                              <div className="text-center min-w-[60px]">
                                <div className="text-lg font-bold">
                                  {format(scheduledAt, 'h:mm')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(scheduledAt, 'a')}
                                </div>
                              </div>

                              {/* Color bar */}
                              <div className="w-1 h-12 rounded-full bg-emerald-500" />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold truncate">{booking.guest_name}</h4>
                                  <Badge className={cn("text-xs", statusConfig.color)}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {booking.booking_type_slug?.replace(/-/g, ' ')} • {booking.duration_minutes} min
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {booking.guest_email}
                                  </span>
                                  {booking.video_link && (
                                    <span className="flex items-center gap-1">
                                      <Video className="h-3 w-3" />
                                      Video call
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                {booking.video_link && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(booking.video_link, '_blank')
                                    }}
                                  >
                                    <Video className="h-4 w-4 mr-1.5" />
                                    Join
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    {booking.status === 'confirmed' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleCancelBooking(booking)
                                          }}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Cancel Booking
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>

        {/* Booking Detail Modal */}
        {selectedBooking && (
          <BookingDetailModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onUpdated={fetchBookings}
          />
        )}
    </>
  )

  if (inline) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bookings
            </h2>
            <p className="text-sm text-muted-foreground">View and manage scheduled consultations</p>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 pt-4">
          {content}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bookings
          </DialogTitle>
          <DialogDescription>
            View and manage scheduled consultations
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

function BookingDetailModal({ booking, onClose, onUpdated }) {
  const [internalNotes, setInternalNotes] = useState(booking.internal_notes || '')
  const [tags, setTags] = useState(booking.tags || [])
  const [editingNotes, setEditingNotes] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  
  const scheduledAt = new Date(booking.scheduled_at)
  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await syncApi.updateBooking(booking.id, { internal_notes: internalNotes })
      toast.success('Notes saved')
      setEditingNotes(false)
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    const updatedTags = [...tags, newTag.trim()]
    setSaving(true)
    try {
      await syncApi.updateBooking(booking.id, { tags: updatedTags })
      setTags(updatedTags)
      setNewTag('')
      toast.success('Tag added')
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to add tag')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTag = async (tagToRemove) => {
    const updatedTags = tags.filter(t => t !== tagToRemove)
    setSaving(true)
    try {
      await syncApi.updateBooking(booking.id, { tags: updatedTags })
      setTags(updatedTags)
      toast.success('Tag removed')
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to remove tag')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge className={cn("text-sm", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(scheduledAt, { addSuffix: true })}
            </span>
          </div>

          {/* Guest Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Guest</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {booking.guest_name?.[0]?.toUpperCase() || 'G'}
                </span>
              </div>
              <div>
                <p className="font-semibold">{booking.guest_name}</p>
                <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">When</h4>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(scheduledAt, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(scheduledAt, 'h:mm a')} ({booking.duration_minutes} min)</span>
            </div>
          </div>

          {/* Video Link */}
          {booking.video_link && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Video Call</h4>
              <Button variant="outline" className="w-full" asChild>
                <a href={booking.video_link} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          )}

          {/* Guest Message */}
          {booking.guest_message && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Guest Message</h4>
              <p className="text-sm p-3 bg-muted rounded-md">{booking.guest_message}</p>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="h-6 w-24 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || saving}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Internal Notes
              </h4>
              {!editingNotes && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setEditingNotes(true)}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Add private notes about this booking..."
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleSaveNotes}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setInternalNotes(booking.internal_notes || '')
                      setEditingNotes(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm p-3 bg-muted/50 rounded-md min-h-[40px] text-muted-foreground">
                {internalNotes || 'No internal notes yet. Click Edit to add.'}
              </p>
            )}
          </div>

          {/* Source */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
            <span>Source: {booking.source || 'Direct'}</span>
            <span>ID: {booking.id?.slice(0, 8)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
