/**
 * Forms Manager - Broadcast-style UI for managing website forms
 * 
 * Uses brand_primary and brand_primary colors exclusively
 * Matches Broadcast module design patterns
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Globe,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  XCircle,
  MessageSquare,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Plus,
  Pencil,
  BarChart3,
  Settings,
  TrendingUp,
  Users,
  Clock,
  Inbox,
  Zap,
  Send,
  CheckCircle,
  AlertCircle,
  Copy,
  Code,
  ExternalLink,
  Layers,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useForms, useFormSubmissions, useCreateForm, useUpdateForm, useDeleteForm, formsKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { formsApi } from '@/lib/portal-api'
import { formatDistanceToNow, format, isValid } from 'date-fns'
import { toast } from 'sonner'
import FormBuilder from './FormBuilder'
import FormAnalytics from './FormAnalytics'

// =============================================================================
// HELPERS
// =============================================================================

// Safe date formatting to handle null/invalid dates
const safeFormatDistance = (dateStr) => {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Unknown'
}

const safeFormat = (dateStr, formatStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return isValid(date) ? format(date, formatStr) : 'N/A'
}

// Normalize submission to handle both camelCase (API) and snake_case (legacy) field names
const normalizeSubmission = (s) => {
  if (!s) return null
  const fields = s.fields || s.data || {}
  return {
    ...s,
    // Core contact info - try top-level first, then nested in fields
    email: s.email || fields.email,
    name: s.name || fields.name || fields.full_name,
    phone: s.phone || fields.phone,
    company: s.company || fields.company,
    message: s.message || fields.message,
    // Fields (form data)
    fields,
    // Timestamps - support both formats
    created_at: s.created_at || s.createdAt,
    updated_at: s.updated_at || s.updatedAt,
    // Source info - support both formats
    source_page: s.source_page || s.sourcePage,
    page_url: s.page_url || s.pageUrl,
    device_type: s.device_type || s.deviceType || 'desktop',
    // UTM - support both formats
    utm_source: s.utm_source || s.utmSource,
    utm_medium: s.utm_medium || s.utmMedium,
    utm_campaign: s.utm_campaign || s.utmCampaign,
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS = [
  { id: 'create', label: 'Create', icon: Plus, description: 'New form', accent: true, group: 'create' },
  { id: 'forms', label: 'Forms', icon: Layers, description: 'All forms', group: 'manage' },
  { id: 'submissions', label: 'Submissions', icon: Inbox, description: 'All entries', group: 'manage' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance', group: 'manage' },
]

const FORM_TYPES = {
  'prospect': { label: 'Lead Capture', color: 'var(--brand-primary)', icon: Users },
  'contact': { label: 'Contact', color: 'var(--brand-primary)', icon: MessageSquare },
  'support': { label: 'Support', color: '#007AFF', icon: AlertCircle },
  'feedback': { label: 'Feedback', color: '#FF9500', icon: Send },
  'newsletter': { label: 'Newsletter', color: '#AF52DE', icon: Mail },
  'custom': { label: 'Custom', color: '#666', icon: Zap },
  'lead-capture': { label: 'Lead Capture', color: 'var(--brand-primary)', icon: Users },
  'scheduler': { label: 'Scheduler', color: '#007AFF', icon: Clock },
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ status }) {
  const statusConfig = {
    new: { label: 'New', className: 'bg-[var(--brand-primary)] text-white' },
    contacted: { label: 'Contacted', className: 'bg-amber-500 text-white' },
    qualified: { label: 'Qualified', className: 'bg-[var(--brand-primary)] text-white' },
    converted: { label: 'Converted', className: 'bg-emerald-600 text-white' },
    spam: { label: 'Spam', className: 'bg-red-500 text-white' }
  }
  const config = statusConfig[status] || statusConfig.new
  return (
    <Badge className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  )
}

// =============================================================================
// DEVICE ICON
// =============================================================================

function DeviceIcon({ device }) {
  switch (device) {
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-[var(--text-tertiary)]" />
    case 'tablet':
      return <Tablet className="h-4 w-4 text-[var(--text-tertiary)]" />
    default:
      return <Monitor className="h-4 w-4 text-[var(--text-tertiary)]" />
  }
}

// =============================================================================
// STAT CARD COMPONENT (Broadcast-style)
// =============================================================================

function StatCard({ icon: Icon, label, value, trend, trendUp, subtitle, onClick, highlight }) {
  return (
    <Card 
      className={cn(
        'group relative overflow-hidden border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl transition-all duration-200',
        onClick && 'cursor-pointer hover:border-[var(--brand-primary)]/30 hover:shadow-lg',
        highlight && 'ring-2 ring-[var(--brand-primary)]/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">{value}</span>
              {trend && (
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-semibold',
                  trendUp ? 'text-[var(--brand-primary)]' : 'text-red-500'
                )}>
                  <TrendingUp className={cn('h-3 w-3', !trendUp && 'rotate-180')} />
                  {trend}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10',
            'text-[var(--brand-primary)]'
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {onClick && (
          <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
            <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// FORM DETAIL VIEW COMPONENT
// =============================================================================

function FormDetailView({ 
  form, 
  onBack, 
  onEdit, 
  onViewCode,
  onDelete,
  submissions,
  isLoadingSubmissions,
  onViewSubmission,
  onUpdateSubmissionStatus,
  onDeleteSubmission,
  pagination,
  onPageChange,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
  onSearch
}) {
  const [detailTab, setDetailTab] = useState('analytics')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const formType = FORM_TYPES[form.form_type] || FORM_TYPES.custom
  const TypeIcon = formType.icon

  const handleDelete = () => {
    onDelete?.(form)
    setShowDeleteConfirm(false)
  }

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden bg-[var(--glass-bg)] border border-[var(--glass-border)] m-4">
      {/* Form Header */}
      <div className="shrink-0 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${formType.color} 15%, transparent)` }}
            >
              <TypeIcon className="h-6 w-6" style={{ color: formType.color }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{form.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge 
                  variant="outline" 
                  className="text-xs border-[var(--glass-border)]"
                  style={{ color: formType.color }}
                >
                  {formType.label}
                </Badge>
                <span className="text-sm text-[var(--text-tertiary)] font-mono">{form.slug}</span>
                {form.is_active === false && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewCode?.(form)}
              className="border-[var(--glass-border)]"
            >
              <Code className="h-4 w-4 mr-2" />
              Embed Code
            </Button>
            <Button
              size="sm"
              onClick={() => onEdit?.(form)}
              className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Form
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-6 mt-4 ml-16">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <Inbox className="h-4 w-4 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{form.submission_count || 0}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{form.conversion_rate || '0%'}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Conversion</p>
            </div>
          </div>
          {form.new_count > 0 && (
            <Badge className="bg-[var(--brand-primary)] text-white h-7">
              {form.new_count} new submissions
            </Badge>
          )}
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-4">
          <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[var(--glass-bg)]">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-[var(--glass-bg)]">
              <Inbox className="h-4 w-4 mr-1.5" />
              Submissions
              {form.new_count > 0 && (
                <Badge className="ml-1.5 h-5 bg-[var(--brand-primary)] text-white">
                  {form.new_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[var(--glass-bg)]">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="flex-1 overflow-auto px-4 py-4 m-0">
          <FormAnalytics formId={form.id} projectId={form.project_id} />
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="flex-1 overflow-auto px-4 py-4 m-0">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search by email, name..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="pl-9 bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFiltersChange({ status: value === 'all' ? null : value })}
            >
              <SelectTrigger className="w-[140px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <Filter className="h-4 w-4 mr-2 text-[var(--text-tertiary)]" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submissions Table */}
          <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                  <TableHead className="text-[var(--text-secondary)]">Contact</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Source</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Device</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Status</TableHead>
                  <TableHead className="text-[var(--text-secondary)]">Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSubmissions ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[var(--brand-primary)]" />
                    </TableCell>
                  </TableRow>
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[var(--text-secondary)]">
                      No submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map(rawSubmission => {
                    const submission = normalizeSubmission(rawSubmission)
                    return (
                    <TableRow
                      key={submission.id}
                      className="cursor-pointer border-[var(--glass-border)] hover:bg-[var(--surface-page)]"
                      onClick={() => onViewSubmission(submission.id)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)]">{submission.name || 'Unknown'}</span>
                          <span className="text-sm text-[var(--text-secondary)]">{submission.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[var(--text-secondary)]">{submission.source_page || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {submission.device_type === 'mobile' ? (
                          <Smartphone className="h-4 w-4 text-[var(--text-tertiary)]" />
                        ) : submission.device_type === 'tablet' ? (
                          <Tablet className="h-4 w-4 text-[var(--text-tertiary)]" />
                        ) : (
                          <Monitor className="h-4 w-4 text-[var(--text-tertiary)]" />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-secondary)]">
                        {safeFormatDistance(submission.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[var(--surface-page)]">
                              <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[var(--glass-border)]" />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              onViewSubmission(submission.id)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${submission.email}`} onClick={(e) => e.stopPropagation()}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[var(--glass-border)]" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateSubmissionStatus?.(submission.id, 'spam')
                              }}
                              className="text-red-500"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark as Spam
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteSubmission?.(submission.id)
                              }}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[var(--glass-border)]">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => onPageChange(pagination.page - 1)}
                  className="border-[var(--glass-border)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-[var(--text-secondary)]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => onPageChange(pagination.page + 1)}
                  className="border-[var(--glass-border)]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 overflow-auto px-4 py-4 m-0">
          <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <CardContent className="py-8">
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">Form Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Form ID</p>
                      <p className="text-sm font-mono text-[var(--text-primary)]">{form.id}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Slug</p>
                      <p className="text-sm font-mono text-[var(--text-primary)]">{form.slug}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Type</p>
                      <p className="text-sm text-[var(--text-primary)]">{formType.label}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Status</p>
                      <p className="text-sm text-[var(--text-primary)]">{form.is_active !== false ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={() => onEdit?.(form)}
                      className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Form
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Form
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Form?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">{form.name}</span>?
              <br />
              <br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The form configuration and all fields</li>
                <li>{form.submission_count || 0} submission{form.submission_count !== 1 ? 's' : ''}</li>
                <li>All analytics data for this form</li>
              </ul>
              <br />
              <span className="font-semibold text-red-500">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--glass-border)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// =============================================================================
// FORM CARD COMPONENT (Broadcast-style)
// =============================================================================

function FormCard({ form, onSelect, onEdit, onViewCode }) {
  const formType = FORM_TYPES[form.form_type] || FORM_TYPES.custom
  const TypeIcon = formType.icon

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl',
        'transition-all duration-200 hover:border-[var(--brand-primary)]/30 hover:shadow-lg cursor-pointer'
      )}
      onClick={() => onSelect(form)}
    >
      {/* Gradient accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${formType.color}, ${formType.color}80)` }}
      />
      
      {/* Action buttons - visible on hover */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)]"
              onClick={(e) => { e.stopPropagation(); onViewCode?.(form) }}
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Embed Code</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)]"
              onClick={(e) => { e.stopPropagation(); onEdit?.(form) }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit Form</TooltipContent>
        </Tooltip>
      </div>

      <CardContent className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${formType.color} 15%, transparent)` }}
          >
            <TypeIcon className="h-5 w-5" style={{ color: formType.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{form.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 border-[var(--glass-border)]"
                style={{ color: formType.color }}
              >
                {formType.label}
              </Badge>
              <span className="text-xs text-[var(--text-tertiary)] font-mono">{form.slug}</span>
            </div>
          </div>
          {form.new_count > 0 && (
            <Badge className="bg-[var(--brand-primary)] text-white shrink-0">
              {form.new_count} new
            </Badge>
          )}
        </div>

        {/* URL */}
        {form.website_url && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-page)] mb-3">
            <Globe className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)] truncate">{form.website_url}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <Inbox className="h-4 w-4 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{form.submissionCount || form.submission_count || 0}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
              <TrendingUp className="h-4 w-4 text-[var(--brand-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{form.conversionRate || form.conversion_rate || '0%'}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Conversion</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// EMBED CODE MODAL
// =============================================================================

function EmbedCodeModal({ form, open, onOpenChange }) {
  if (!form) return null

  const reactCode = `import { ManagedForm } from '@uptrade/site-kit/forms'

<ManagedForm 
  formId="${form.slug}"
  projectId="${form.project_id}"
  className="max-w-lg mx-auto"
/>`

  const htmlCode = `<div id="uptrade-form-${form.slug}"></div>
<script src="https://cdn.sonor.io/forms.js"></script>
<script>
  UptradeFormsm.render({
    formId: '${form.slug}',
    projectId: '${form.project_id}',
    target: '#uptrade-form-${form.slug}'
  })
</script>`

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    toast.success('Copied to clipboard!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-[var(--brand-primary)]" />
            Embed {form.name}
          </DialogTitle>
          <DialogDescription>
            Add this form to your website using one of the methods below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* React/Next.js */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">React / Next.js (Recommended)</h4>
              <Button variant="ghost" size="sm" onClick={() => copyCode(reactCode)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)] text-xs overflow-x-auto">
              <code className="text-[var(--text-secondary)]">{reactCode}</code>
            </pre>
          </div>

          {/* HTML/Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">HTML / JavaScript</h4>
              <Button variant="ghost" size="sm" onClick={() => copyCode(htmlCode)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)] text-xs overflow-x-auto">
              <code className="text-[var(--text-secondary)]">{htmlCode}</code>
            </pre>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
            <CheckCircle className="h-4 w-4 text-[var(--brand-primary)] shrink-0" />
            <p className="text-xs text-[var(--text-secondary)]">
              The form will automatically route submissions to your CRM, support system, or custom webhook based on form settings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// SUBMISSION DETAIL MODAL
// =============================================================================

function SubmissionDetailModal({ submission, open, onOpenChange, onUpdateStatus, onDelete }) {
  if (!submission) return null
  
  // Handle both wrapped format { submission, relatedSubmissions } and flat submission object
  const rawSub = submission.submission || submission
  const relatedSubmissions = (submission.relatedSubmissions || []).map(normalizeSubmission)
  
  // Normalize field names
  const sub = normalizeSubmission(rawSub)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                <User className="h-5 w-5 text-[var(--brand-primary)]" />
                {sub.name || sub.email}
              </DialogTitle>
              <DialogDescription>
                Submitted {safeFormatDistance(sub.created_at)}
              </DialogDescription>
            </div>
            <StatusBadge status={sub.status} />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Contact Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
                  <Mail className="h-4 w-4 text-[var(--brand-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Email</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{sub.email}</p>
                </div>
              </div>
              {sub.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
                    <Phone className="h-4 w-4 text-[var(--brand-primary)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Phone</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{sub.phone}</p>
                  </div>
                </div>
              )}
              {sub.company && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
                    <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Company</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{sub.company}</p>
                  </div>
                </div>
              )}
              {sub.source_page && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
                    <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase">Source Page</p>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{sub.source_page}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            {sub.message && (
              <div className="p-4 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Message</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{sub.message}</p>
              </div>
            )}

            {/* Additional Fields */}
            {sub.fields && Object.keys(sub.fields).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Form Fields</h4>
                <div className="grid gap-2">
                  {Object.entries(sub.fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <span className="text-sm text-[var(--text-secondary)] capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UTM Parameters */}
            {(sub.utm_source || sub.utm_medium || sub.utm_campaign) && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Attribution</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {sub.utm_source && (
                    <div className="p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)]">Source</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{sub.utm_source}</p>
                    </div>
                  )}
                  {sub.utm_medium && (
                    <div className="p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)]">Medium</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{sub.utm_medium}</p>
                    </div>
                  )}
                  {sub.utm_campaign && (
                    <div className="p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)]">Campaign</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{sub.utm_campaign}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Device Info */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Device Information</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                  <DeviceIcon device={sub.device_type} />
                  <span className="text-sm text-[var(--text-primary)] capitalize">{sub.device_type || 'Desktop'}</span>
                </div>
                {sub.browser && (
                  <div className="p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                    <p className="text-[10px] text-[var(--text-tertiary)]">Browser</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{sub.browser}</p>
                  </div>
                )}
                {sub.os && (
                  <div className="p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                    <p className="text-[10px] text-[var(--text-tertiary)]">OS</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{sub.os}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Related Submissions */}
            {relatedSubmissions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Other Submissions from this Contact</h4>
                <div className="space-y-2">
                  {relatedSubmissions.map(rel => (
                    <div key={rel.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-page)] border border-[var(--glass-border)]">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[var(--text-tertiary)]" />
                        <span className="text-sm text-[var(--text-primary)]">{rel.form?.name || 'Unknown Form'}</span>
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {safeFormatDistance(rel.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
          <Select
            value={sub.status}
            onValueChange={(value) => onUpdateStatus(sub.id, value)}
          >
            <SelectTrigger className="w-[180px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="border-[var(--glass-border)]">
              <a href={`mailto:${sub.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
            {sub.phone && (
              <Button variant="outline" size="sm" asChild className="border-[var(--glass-border)]">
                <a href={`tel:${sub.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={() => {
                onUpdateStatus(sub.id, 'spam')
                onOpenChange(false)
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Spam
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={() => {
                onDelete?.(sub.id)
                onOpenChange(false)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// MAIN FORMS MANAGER COMPONENT
// =============================================================================

export default function FormsManager() {
  const {
    forms,
    submissions,
    currentSubmission,
    currentForm,
    pagination,
    filters,
    isLoading,
    isLoadingSubmissions,
    fetchForms,
    fetchForm,
    fetchSubmissions,
    fetchSubmission,
    updateSubmission,
    createForm,
    updateForm,
    setFilters,
    setPage,
    clearCurrentSubmission,
    clearCurrentForm
  } = useFormsStore()

  const [activeTab, setActiveTab] = useState('forms')
  const [selectedForm, setSelectedForm] = useState(null)
  const [viewingFormDetail, setViewingFormDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const [embedForm, setEmbedForm] = useState(null)
  const [editingForm, setEditingForm] = useState(null)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)

  // Computed stats
  const stats = useMemo(() => {
    const totalForms = forms.length
    const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionCount || f.submission_count || 0), 0)
    const newSubmissions = forms.reduce((acc, f) => acc + (f.newCount || f.new_count || 0), 0)
    const activeForms = forms.filter(f => f.isActive !== false && f.is_active !== false).length
    return { totalForms, totalSubmissions, newSubmissions, activeForms }
  }, [forms])

  // Load forms on mount
  useEffect(() => {
    fetchForms({ includeGlobal: true })
  }, [fetchForms])

  // Load submissions when needed
  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions({
        formId: selectedForm?.id,
        search: filters.search,
        status: filters.status
      })
    }
  }, [activeTab, selectedForm, filters, fetchSubmissions])

  const handleSelectForm = (form) => {
    setSelectedForm(form)
    setViewingFormDetail(true)
    setFilters({ formId: form.id })
    // Fetch submissions for this form
    fetchSubmissions({ formId: form.id })
  }

  const handleBackFromDetail = () => {
    setViewingFormDetail(false)
    setSelectedForm(null)
    setFilters({ formId: null })
  }

  const handleDeleteForm = async (form) => {
    try {
      await formsApi.delete(form.id)
      toast.success('Form deleted successfully')
      setViewingFormDetail(false)
      setSelectedForm(null)
      fetchForms({ includeGlobal: true })
    } catch (error) {
      toast.error('Failed to delete form')
      console.error('Delete form error:', error)
    }
  }

  const handleViewSubmission = async (submissionId) => {
    await fetchSubmission(submissionId)
    setShowDetail(true)
  }

  const handleUpdateStatus = async (submissionId, status) => {
    try {
      await updateSubmission(submissionId, { status })
      toast.success('Status updated')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteSubmission = async (submissionId) => {
    try {
      await formsApi.deleteSubmission(submissionId)
      toast.success('Submission deleted')
      // Refresh submissions list
      fetchSubmissions({
        formId: selectedForm?.id,
        search: filters.search,
        status: filters.status
      })
    } catch (error) {
      toast.error('Failed to delete submission')
      console.error('Delete submission error:', error)
    }
  }

  const handleSearch = () => {
    setFilters({ search: searchQuery })
  }

  const handleRefresh = () => {
    if (activeTab === 'forms') {
      fetchForms({ includeGlobal: true })
    } else {
      fetchSubmissions({
        formId: selectedForm?.id,
        search: filters.search,
        status: filters.status
      })
    }
  }

  const handleCreateForm = () => {
    clearCurrentForm()
    setEditingForm(null)
    setShowBuilder(true)
  }

  const handleEditForm = async (form) => {
    // Fetch full form with fields from API
    setSelectedForm(form)
    const fullForm = await fetchForm(form.id)
    if (fullForm) {
      setEditingForm(fullForm)
      setShowBuilder(true)
    }
  }

  const handleViewCode = (form) => {
    setEmbedForm(form)
    setShowEmbedCode(true)
  }

  const handleSaveForm = async (formData) => {
    try {
      // Transform steps from string array to StepDto array if needed
      const transformedSteps = formData.steps?.map((step, index) => {
        if (typeof step === 'string') {
          return { stepNumber: index + 1, title: step, name: step }
        }
        return {
          id: step.id,
          stepNumber: step.step_number ?? step.stepNumber ?? index + 1,
          title: step.title || step.name,
          name: step.name || step.title,
          description: step.description,
        }
      })
      
      // Generate slug if not provided
      const slug = formData.slug || formData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'form'
      
      // Transform snake_case to camelCase for API
      const apiPayload = {
        ...formData,
        slug,
        formType: formData.form_type || formData.formType || 'contact',
        description: formData.description,
        instructions: formData.instructions,
        successMessage: formData.success_message || formData.successMessage,
        redirectUrl: formData.redirect_url || formData.redirectUrl,
        notificationEmails: formData.notification_emails || formData.notificationEmails,
        submitButtonText: formData.submit_text || formData.submit_button_text || formData.submitButtonText || 'Submit',
        showProgress: formData.show_progress ?? formData.showProgress,
        enableSaveDraft: formData.enable_save_draft ?? formData.enableSaveDraft,
        isActive: formData.is_active ?? formData.isActive,
        fields: formData.fields?.map(f => ({
          id: f.id,
          slug: f.slug,
          label: f.label,
          fieldType: f.field_type || f.fieldType || 'text',
          placeholder: f.placeholder,
          helpText: f.help_text || f.helpText,
          defaultValue: f.default_value || f.defaultValue,
          isRequired: f.is_required ?? f.isRequired,
          hideLabel: f.hide_label ?? f.hideLabel ?? false,
          validation: f.validation,
          options: f.options,
          conditional: f.conditional,
          width: f.width || 'full',
          sortOrder: f.sort_order ?? f.sortOrder ?? 0,
          destinationField: f.destination_field || f.destinationField,
          stepId: f.step_id || f.stepId,
        })),
        steps: transformedSteps,
      }
      
      if (editingForm?.id) {
        await updateForm(editingForm.id, apiPayload)
        toast.success('Form updated')
      } else {
        await createForm(apiPayload)
        toast.success('Form created')
      }
      setShowBuilder(false)
      setEditingForm(null)
      fetchForms({ projectId: formData.projectId })
    } catch (error) {
      toast.error('Failed to save form')
    }
  }

  const handleCloseBuilder = () => {
    setShowBuilder(false)
    setEditingForm(null)
  }

  // If builder is open, show full-screen builder
  if (showBuilder) {
    return (
      <div className="h-full">
        <FormBuilder
          formId={editingForm?.id}
          projectId={editingForm?.projectId || selectedForm?.project_id}
          initialData={editingForm}
          onSave={handleSaveForm}
          onCancel={handleCloseBuilder}
        />
      </div>
    )
  }

  // If viewing a specific form's detail view
  if (viewingFormDetail && selectedForm) {
    return (
      <TooltipProvider>
        <div className="flex h-full min-h-0 flex-col bg-[var(--surface-page)]">
          <FormDetailView
            form={selectedForm}
            onBack={handleBackFromDetail}
            onEdit={handleEditForm}
            onViewCode={handleViewCode}
            onDelete={handleDeleteForm}
            submissions={submissions}
            isLoadingSubmissions={isLoadingSubmissions}
            onViewSubmission={handleViewSubmission}
            onUpdateSubmissionStatus={handleUpdateStatus}
            onDeleteSubmission={handleDeleteSubmission}
            pagination={pagination}
            onPageChange={setPage}
            filters={filters}
            onFiltersChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
          />
          
          {/* Submission Detail Modal */}
          <SubmissionDetailModal
            submission={currentSubmission}
            open={showDetail}
            onOpenChange={setShowDetail}
            onUpdateStatus={handleUpdateStatus}
            submissions={submissions}
          />
          
          {/* Embed Code Modal */}
          <EmbedCodeModal
            form={embedForm}
            open={showEmbedCode}
            onOpenChange={setShowEmbedCode}
          />
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-[var(--surface-page)]">
        {/* ================================================================== */}
        {/* HERO HEADER - Brand gradient tile (Broadcast-style) */}
        {/* ================================================================== */}
        <div className={cn(
          "shrink-0 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] shadow-lg transition-all duration-300 mx-4 mt-4",
          isHeaderCollapsed ? "py-0" : ""
        )}>
          {/* Background pattern */}
          {!isHeaderCollapsed && (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute -bottom-10 right-1/4 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
            </div>
          )}
          
          <div className={cn(
            "relative px-6 transition-all duration-300",
            isHeaderCollapsed ? "py-3" : "py-5"
          )}>
            {/* Top row: Title and actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex items-center justify-center rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-sm transition-all duration-300 border border-white/20 dark:border-white/10",
                  isHeaderCollapsed ? "h-8 w-8" : "h-12 w-12"
                )}>
                  <FileText className={cn(
                    "text-white transition-all duration-300",
                    isHeaderCollapsed ? "h-4 w-4" : "h-6 w-6"
                  )} />
                </div>
                <div>
                  <h1 className={cn(
                    "font-bold text-white transition-all duration-300",
                    isHeaderCollapsed ? "text-lg" : "text-2xl"
                  )}>Forms</h1>
                  {!isHeaderCollapsed && (
                    <p className="text-sm text-white/70">
                      Build, deploy, and track website forms
                    </p>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="text-white/80 hover:text-white hover:bg-white/10 dark:hover:bg-black/20"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateForm}
                  className="bg-white/20 dark:bg-black/20 text-white hover:bg-white/30 dark:hover:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                  className="text-white/80 hover:text-white hover:bg-white/10 dark:hover:bg-black/20"
                >
                  {isHeaderCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Stats Row - Hidden when collapsed */}
            {!isHeaderCollapsed && (
              <div className="mt-5 grid grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm p-3 border border-white/20 dark:border-white/10">
                  <p className="text-xs text-white/60 uppercase tracking-wide">Total Forms</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.totalForms}</p>
                </div>
                <div className="rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm p-3 border border-white/20 dark:border-white/10">
                  <p className="text-xs text-white/60 uppercase tracking-wide">Active</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.activeForms}</p>
                </div>
                <div className="rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm p-3 border border-white/20 dark:border-white/10">
                  <p className="text-xs text-white/60 uppercase tracking-wide">Total Submissions</p>
                  <p className="mt-1 text-2xl font-bold text-white">{stats.totalSubmissions}</p>
                </div>
                <div className="rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm p-3 border border-white/20 dark:border-white/10">
                  <p className="text-xs text-white/60 uppercase tracking-wide">New Leads</p>
                  <div className="flex items-baseline gap-2">
                    <p className="mt-1 text-2xl font-bold text-white">{stats.newSubmissions}</p>
                    {stats.newSubmissions > 0 && (
                      <span className="text-xs text-white/60">pending</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* TABS AND CONTENT */}
        {/* ================================================================== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-4">
          {/* Tab Header */}
          <div className="shrink-0 flex items-center justify-between pb-4">
            <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              {TABS.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className={cn(
                    "data-[state=active]:bg-[var(--glass-bg)]",
                    tab.accent && "data-[state=active]:text-[var(--brand-primary)]"
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-1.5" />
                  {tab.label}
                  {tab.id === 'submissions' && stats.newSubmissions > 0 && (
                    <Badge className="ml-1.5 h-5 bg-[var(--brand-primary)] text-white">
                      {stats.newSubmissions}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Filters for submissions tab */}
            {activeTab === 'submissions' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <Input
                    placeholder="Search by email, name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9 w-[250px] bg-[var(--glass-bg)] border-[var(--glass-border)]"
                  />
                </div>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => setFilters({ status: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="w-[140px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
                    <Filter className="h-4 w-4 mr-2 text-[var(--text-tertiary)]" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Create Tab */}
            <TabsContent value="create" className="m-0 h-full data-[state=inactive]:hidden">
              <Card className="h-full border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/20 mb-6">
                    <Plus className="h-10 w-10 text-[var(--brand-primary)]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create a New Form</h2>
                  <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
                    Build beautiful, conversion-optimized forms with our drag-and-drop builder. 
                    Submissions automatically route to your CRM, support system, or custom webhooks.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      onClick={handleCreateForm}
                      className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white hover:opacity-90"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Start Building
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-[var(--glass-border)]"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Use Template
                    </Button>
                  </div>

                  {/* Quick Form Types */}
                  <div className="mt-10 grid grid-cols-3 gap-4 max-w-2xl">
                    {Object.entries(FORM_TYPES).slice(0, 3).map(([key, type]) => (
                      <button
                        key={key}
                        onClick={handleCreateForm}
                        className="flex items-center gap-3 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--brand-primary)]/50 transition-colors text-left"
                      >
                        <div 
                          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                          style={{ backgroundColor: `color-mix(in srgb, ${type.color} 15%, transparent)` }}
                        >
                          <type.icon className="h-5 w-5" style={{ color: type.color }} />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{type.label}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">Quick start</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Forms Tab */}
            <TabsContent value="forms" className="m-0 h-full overflow-auto data-[state=inactive]:hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                </div>
              ) : forms.length === 0 ? (
                <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <CardContent className="flex flex-col items-center justify-center h-64">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-primary)]/10 mb-4">
                      <FileText className="h-8 w-8 text-[var(--brand-primary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No forms yet</h3>
                    <p className="text-[var(--text-secondary)] text-center mb-4">
                      Create your first form to start capturing leads
                    </p>
                    <Button 
                      onClick={handleCreateForm}
                      className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Form
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-4">
                  {forms.map(form => (
                    <FormCard 
                      key={form.id} 
                      form={form} 
                      onSelect={handleSelectForm} 
                      onEdit={handleEditForm}
                      onViewCode={handleViewCode}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Submissions Tab */}
            <TabsContent value="submissions" className="m-0 h-full overflow-auto data-[state=inactive]:hidden">
              <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                      <TableHead className="text-[var(--text-secondary)]">Contact</TableHead>
                      <TableHead className="text-[var(--text-secondary)]">Form</TableHead>
                      <TableHead className="text-[var(--text-secondary)]">Source</TableHead>
                      <TableHead className="text-[var(--text-secondary)]">Device</TableHead>
                      <TableHead className="text-[var(--text-secondary)]">Status</TableHead>
                      <TableHead className="text-[var(--text-secondary)]">Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingSubmissions ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[var(--brand-primary)]" />
                        </TableCell>
                      </TableRow>
                    ) : submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-[var(--text-secondary)]">
                          No submissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      submissions.map(rawSubmission => {
                        const submission = normalizeSubmission(rawSubmission)
                        return (
                        <TableRow
                          key={submission.id}
                          className="cursor-pointer border-[var(--glass-border)] hover:bg-[var(--surface-page)]"
                          onClick={() => handleViewSubmission(submission.id)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-[var(--text-primary)]">{submission.name || 'Unknown'}</span>
                              <span className="text-sm text-[var(--text-secondary)]">{submission.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[var(--glass-border)]">
                              {submission.form?.name || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-[var(--text-secondary)] truncate max-w-[200px] block">
                              {submission.source_page || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DeviceIcon device={submission.device_type} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={submission.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm text-[var(--text-primary)]">
                                {safeFormat(submission.created_at, 'MMM d, yyyy')}
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)]">
                                {safeFormat(submission.created_at, 'h:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="hover:bg-[var(--surface-page)]">
                                  <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[var(--glass-border)]" />
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewSubmission(submission.id)
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={`mailto:${submission.email}`} onClick={(e) => e.stopPropagation()}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[var(--glass-border)]" />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateStatus(submission.id, 'spam')
                                  }}
                                  className="text-red-500"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Mark as Spam
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteSubmission(submission.id)
                                  }}
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )})
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--glass-border)]">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} submissions
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => setPage(pagination.page - 1)}
                        className="border-[var(--glass-border)]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-[var(--text-secondary)]">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasMore}
                        onClick={() => setPage(pagination.page + 1)}
                        className="border-[var(--glass-border)]"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="m-0 h-full overflow-auto p-0 data-[state=inactive]:hidden">
              {/* Global Forms Analytics Overview */}
              <div className="p-4 space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={Layers}
                    label="Total Forms"
                    value={stats.totalForms}
                    subtitle={`${stats.activeForms} active`}
                  />
                  <StatCard
                    icon={Inbox}
                    label="Total Submissions"
                    value={stats.totalSubmissions}
                    highlight={stats.newSubmissions > 0}
                  />
                  <StatCard
                    icon={Users}
                    label="New Submissions"
                    value={stats.newSubmissions}
                    subtitle="Unread"
                    highlight={stats.newSubmissions > 0}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Avg Conversion"
                    value={forms.length > 0 
                      ? `${Math.round(forms.reduce((acc, f) => acc + (parseFloat(f.conversionRate || f.conversion_rate) || 0), 0) / forms.length)}%`
                      : '0%'
                    }
                    subtitle="Across all forms"
                  />
                </div>

                {/* Forms Performance Table */}
                <Card className="border-[var(--glass-border)] bg-[var(--glass-bg)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-[var(--brand-primary)]" />
                      Form Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                          <TableHead className="text-[var(--text-secondary)]">Form</TableHead>
                          <TableHead className="text-[var(--text-secondary)] text-right">Submissions</TableHead>
                          <TableHead className="text-[var(--text-secondary)] text-right">New</TableHead>
                          <TableHead className="text-[var(--text-secondary)] text-right">Conversion</TableHead>
                          <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forms.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-[var(--text-secondary)]">
                              No forms found. Create your first form to see analytics.
                            </TableCell>
                          </TableRow>
                        ) : (
                          forms.map(form => {
                            const formType = FORM_TYPES[form.form_type] || FORM_TYPES.custom
                            const TypeIcon = formType.icon
                            return (
                              <TableRow
                                key={form.id}
                                className="cursor-pointer border-[var(--glass-border)] hover:bg-[var(--surface-page)]"
                                onClick={() => handleSelectForm(form)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                                      style={{ backgroundColor: `color-mix(in srgb, ${formType.color} 15%, transparent)` }}
                                    >
                                      <TypeIcon className="h-4 w-4" style={{ color: formType.color }} />
                                    </div>
                                    <div>
                                      <span className="font-medium text-[var(--text-primary)]">{form.name}</span>
                                      <p className="text-xs text-[var(--text-tertiary)]">{formType.label}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-[var(--text-primary)]">
                                  {form.submissionCount || form.submission_count || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(form.newCount || form.new_count) > 0 ? (
                                    <Badge className="bg-[var(--brand-primary)] text-white">
                                      {form.newCount || form.new_count}
                                    </Badge>
                                  ) : (
                                    <span className="text-[var(--text-tertiary)]">0</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-[var(--text-primary)]">
                                  {form.conversionRate || form.conversion_rate || '0%'}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSelectForm(form)
                                    }}
                                  >
                                    View
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Modals */}
        <SubmissionDetailModal
          submission={currentSubmission}
          open={showDetail}
          onOpenChange={(open) => {
            setShowDetail(open)
            if (!open) clearCurrentSubmission()
          }}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDeleteSubmission}
        />

        <EmbedCodeModal
          form={embedForm}
          open={showEmbedCode}
          onOpenChange={setShowEmbedCode}
        />
      </div>
    </TooltipProvider>
  )
}
