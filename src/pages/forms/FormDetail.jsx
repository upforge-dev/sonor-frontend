// src/pages/forms/FormDetail.jsx
// Form detail view with embedded form builder preview and settings

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Pencil,
  Eye,
  Code,
  Settings,
  BarChart3,
  Inbox,
  Copy,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  Mail,
  MoreHorizontal,
  Trash2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Tablet,
  Monitor,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isValid } from 'date-fns'
import { toast } from 'sonner'
import FormPreview from '@/components/forms/FormPreview'
import FormAnalytics from '@/components/forms/FormAnalytics'
import { formsApi } from '@/lib/portal-api'

// Helpers for submissions (match FormsManager behavior)
const safeFormatDistance = (dateStr) => {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Unknown'
}

const normalizeSubmission = (s) => {
  if (!s) return null
  const fields = s.fields || s.data || {}
  return {
    ...s,
    email: s.email || fields.email,
    name: s.name || fields.name || fields.full_name,
    phone: s.phone || fields.phone,
    company: s.company || fields.company,
    message: s.message || fields.message,
    fields,
    created_at: s.created_at || s.createdAt,
    source_page: s.source_page || s.sourcePage,
    device_type: s.device_type || s.deviceType || 'desktop',
    status: s.status || 'new',
  }
}

function StatusBadge({ status }) {
  const statusConfig = {
    new: { label: 'New', className: 'bg-[var(--brand-primary)] text-white' },
    contacted: { label: 'Contacted', className: 'bg-amber-500 text-white' },
    qualified: { label: 'Qualified', className: 'bg-[var(--brand-primary)] text-white' },
    converted: { label: 'Converted', className: 'bg-emerald-600 text-white' },
    spam: { label: 'Spam', className: 'bg-red-500 text-white' },
  }
  const config = statusConfig[status] || statusConfig.new
  return <Badge className={cn('text-xs', config.className)}>{config.label}</Badge>
}

export default function FormDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Submissions state (for Submissions tab within this form)
  const [submissions, setSubmissions] = useState([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)
  const [submissionsPage, setSubmissionsPage] = useState(1)
  const [submissionsPagination, setSubmissionsPagination] = useState({ totalPages: 1, hasMore: false })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailSubmission, setDetailSubmission] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const loadSubmissions = useCallback(async (overrides = {}) => {
    if (!form?.id) return
    setIsLoadingSubmissions(true)
    const page = overrides.page ?? submissionsPage
    try {
      const params = {
        form_id: form.id,
        page,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter
      const res = await formsApi.listSubmissions(params)
      const data = res?.data || res
      setSubmissions(data.submissions || [])
      setSubmissionsPagination({
        totalPages: data.pagination?.totalPages ?? 1,
        hasMore: data.pagination?.hasMore ?? false,
      })
    } catch (err) {
      console.error('Failed to load submissions:', err)
      toast.error('Failed to load submissions')
      setSubmissions([])
    } finally {
      setIsLoadingSubmissions(false)
    }
  }, [form?.id, submissionsPage, searchQuery, statusFilter])

  useEffect(() => {
    if (form?.id) loadSubmissions()
  }, [form?.id, loadSubmissions])

  const handleViewSubmission = async (submissionId) => {
    try {
      const res = await formsApi.getSubmission(submissionId)
      const data = res?.data || res
      const sub = data.submission || data
      setDetailSubmission(normalizeSubmission(sub))
      setShowDetailModal(true)
    } catch (err) {
      console.error('Failed to load submission:', err)
      toast.error('Failed to load submission details')
    }
  }

  const handleUpdateStatus = async (submissionId, status) => {
    try {
      await formsApi.updateSubmission(submissionId, { status })
      toast.success('Status updated')
      setShowDetailModal(false)
      loadSubmissions()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteSubmission = async (submissionId) => {
    try {
      await formsApi.deleteSubmission(submissionId)
      toast.success('Submission deleted')
      setShowDetailModal(false)
      loadSubmissions()
    } catch (err) {
      toast.error('Failed to delete submission')
    }
  }

  const handleSearchSubmissions = () => {
    setSubmissionsPage(1)
    loadSubmissions({ page: 1 })
  }

  useEffect(() => {
    loadForm()
  }, [id])

  async function loadForm() {
    if (!id) return
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('managed_forms')
        .select(`
          *,
          fields:managed_form_fields(*)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      setForm(data)
    } catch (err) {
      console.error('Failed to load form:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function copyEmbedCode() {
    if (!form) return
    
    const embedCode = `<script src="https://forms.uptrademedia.com/embed.js" data-form="${form.slug}"></script>`
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }
  
  if (!form) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--text-secondary)]">Form not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/forms')}>
          Back to Forms
        </Button>
      </div>
    )
  }
  
  const createdAt = form.created_at ? new Date(form.created_at) : null
  const updatedAt = form.updated_at ? new Date(form.updated_at) : null
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{form.name}</h1>
            <p className="text-sm text-[var(--text-tertiary)]">/{form.slug}</p>
          </div>
          {form.is_active ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
          ) : (
            <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400">Inactive</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyEmbedCode}>
            {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Code className="h-4 w-4 mr-2" />}
            {copied ? 'Copied!' : 'Embed Code'}
          </Button>
          <Button 
            onClick={() => navigate(`/forms/${id}/edit`)}
            style={{ backgroundColor: 'var(--brand-primary)' }}
            className="text-white"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Form
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="preview" className="space-y-6">
        <TabsList className="bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <Inbox className="h-4 w-4 mr-2" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] flex flex-col max-h-[calc(100vh-12rem)] min-h-0 overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Form Preview</CardTitle>
              <CardDescription>
                This is how your form appears to visitors
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0 py-6">
              <FormPreview form={form} fields={form.fields || []} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="submissions">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>
                View and manage form submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <Input
                    placeholder="Search by email, name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmissions()}
                    className="pl-9 bg-[var(--glass-bg)] border-[var(--glass-border)]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSubmissionsPage(1); loadSubmissions({ page: 1 }); }}>
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
                <Button variant="outline" size="icon" onClick={() => loadSubmissions()} disabled={isLoadingSubmissions}>
                  <RefreshCw className={cn('h-4 w-4', isLoadingSubmissions && 'animate-spin')} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleSearchSubmissions}>
                  Search
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
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
                      submissions.map((raw) => {
                        const sub = normalizeSubmission(raw)
                        return (
                          <TableRow
                            key={sub.id}
                            className="cursor-pointer border-[var(--glass-border)] hover:bg-[var(--surface-page)]"
                            onClick={() => handleViewSubmission(sub.id)}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-[var(--text-primary)]">{sub.name || 'Unknown'}</span>
                                <span className="text-sm text-[var(--text-secondary)]">{sub.email || '—'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-[var(--text-secondary)]">{sub.source_page || '—'}</span>
                            </TableCell>
                            <TableCell>
                              {sub.device_type === 'mobile' ? (
                                <Smartphone className="h-4 w-4 text-[var(--text-tertiary)]" />
                              ) : sub.device_type === 'tablet' ? (
                                <Tablet className="h-4 w-4 text-[var(--text-tertiary)]" />
                              ) : (
                                <Monitor className="h-4 w-4 text-[var(--text-tertiary)]" />
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={sub.status} />
                            </TableCell>
                            <TableCell className="text-sm text-[var(--text-secondary)]">
                              {safeFormatDistance(sub.created_at)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleViewSubmission(sub.id)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {sub.email && (
                                    <DropdownMenuItem asChild>
                                      <a href={`mailto:${sub.email}`}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Send Email
                                      </a>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(sub.id, 'spam')}
                                    className="text-red-500"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Mark as Spam
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSubmission(sub.id)}
                                    className="text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {submissionsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submissionsPage === 1}
                    onClick={() => {
                      const nextPage = Math.max(1, submissionsPage - 1)
                      setSubmissionsPage(nextPage)
                      loadSubmissions({ page: nextPage })
                    }}
                    className="border-[var(--glass-border)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-[var(--text-secondary)]">
                    Page {submissionsPage} of {submissionsPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!submissionsPagination.hasMore}
                    onClick={() => {
                      const nextPage = submissionsPage + 1
                      setSubmissionsPage(nextPage)
                      loadSubmissions({ page: nextPage })
                    }}
                    className="border-[var(--glass-border)]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission detail modal */}
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-[var(--brand-primary)]" />
                    <DialogTitle className="text-[var(--text-primary)]">
                      {detailSubmission?.name || detailSubmission?.email || 'Submission'}
                    </DialogTitle>
                  </div>
                  {detailSubmission && <StatusBadge status={detailSubmission.status} />}
                </div>
                <DialogDescription>
                  {detailSubmission?.created_at && safeFormatDistance(detailSubmission.created_at)}
                </DialogDescription>
              </DialogHeader>
              {detailSubmission && (
                <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-2">
                  {detailSubmission.email && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Email</p>
                      <a href={`mailto:${detailSubmission.email}`} className="text-sm text-[var(--text-primary)] hover:underline">
                        {detailSubmission.email}
                      </a>
                    </div>
                  )}
                  {detailSubmission.phone && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Phone</p>
                      <p className="text-sm text-[var(--text-primary)]">{detailSubmission.phone}</p>
                    </div>
                  )}
                  {detailSubmission.message && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-1">Message</p>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{detailSubmission.message}</p>
                    </div>
                  )}
                  {detailSubmission.fields && Object.keys(detailSubmission.fields).length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] uppercase mb-2">Form data</p>
                      <div className="space-y-1.5">
                        {Object.entries(detailSubmission.fields).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4 p-2 rounded bg-[var(--surface-page)]">
                            <span className="text-sm text-[var(--text-secondary)] capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm text-[var(--text-primary)] text-right">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] flex flex-col max-h-[calc(100vh-12rem)] min-h-0 overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Form Analytics</CardTitle>
              <CardDescription>
                Track form performance and conversions
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1 min-h-0">
              <FormAnalytics formId={form.id} projectId={form.project_id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="grid gap-6">
            {/* Embed Configuration */}
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardHeader>
                <CardTitle>Embed Configuration</CardTitle>
                <CardDescription>
                  Configure how the form appears when embedded
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-[var(--glass-bg-hover)] rounded-lg text-sm text-[var(--text-secondary)] overflow-x-auto">
                  {JSON.stringify(form.embed_config || {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
            
            {/* Form Info */}
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardHeader>
                <CardTitle>Form Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Created</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {createdAt && isValid(createdAt) ? format(createdAt, 'PPP') : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Last Updated</p>
                    <p className="text-sm text-[var(--text-primary)]">
                      {updatedAt && isValid(updatedAt) 
                        ? formatDistanceToNow(updatedAt, { addSuffix: true })
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Form ID</p>
                    <p className="text-sm text-[var(--text-primary)] font-mono">{form.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Version</p>
                    <p className="text-sm text-[var(--text-primary)]">{form.version || 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
