// src/pages/forms/components/FormsListView.jsx
// Grid/List view for forms with actions

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  MoreVertical,
  Pencil,
  Eye,
  Copy,
  Archive,
  Trash2,
  ExternalLink,
  Code,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow, isValid } from 'date-fns'

const FORM_TYPE_COLORS = {
  contact: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  lead: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  quote: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  booking: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  survey: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  support: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  custom: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}

function FormCard({ form, onEdit, onView, onViewSubmissions, onDuplicate, onArchive, onDelete }) {
  const createdAt = form.createdAt ? new Date(form.createdAt) : null
  const updatedAt = form.updatedAt ? new Date(form.updatedAt) : null
  
  return (
    <Card 
      className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/50 transition-colors group cursor-pointer"
      onClick={() => onViewSubmissions?.(form.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg mt-0.5"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <FileText className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">{form.name}</h3>
              <p className="text-sm text-[var(--text-tertiary)] mt-0.5">/{form.slug}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(form.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView?.(form.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Code className="h-4 w-4 mr-2" />
                Embed Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDuplicate?.(form.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onArchive?.(form.id)}
                className="text-amber-600 dark:text-amber-400"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(form.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            {form.isActive ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Active</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-[var(--text-tertiary)]">Inactive</span>
              </>
            )}
          </div>
          
          {/* Submission count */}
          <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <Inbox className="h-3.5 w-3.5" />
            <span className="text-xs">{form.submissionCount || 0} submissions</span>
          </div>
          
          {/* Type badge */}
          {form.formType && (
            <Badge className={cn("text-xs", FORM_TYPE_COLORS[form.formType] || FORM_TYPE_COLORS.custom)}>
              {form.formType}
            </Badge>
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between text-xs text-[var(--text-tertiary)]" onClick={(e) => e.stopPropagation()}>
          <span>
            Updated {updatedAt && isValid(updatedAt) 
              ? formatDistanceToNow(updatedAt, { addSuffix: true })
              : 'never'
            }
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit?.(form.id)}>
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FormRow({ form, onEdit, onView, onViewSubmissions, onDuplicate, onArchive, onDelete }) {
  const createdAt = form.createdAt ? new Date(form.createdAt) : null
  const updatedAt = form.updatedAt ? new Date(form.updatedAt) : null
  
  return (
    <TableRow 
      className="group cursor-pointer hover:bg-[var(--glass-bg-hover)]"
      onClick={() => onViewSubmissions?.(form.id)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <FileText className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)]">{form.name}</p>
            <p className="text-sm text-[var(--text-tertiary)]">/{form.slug}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {form.isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
        ) : (
          <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400">Inactive</Badge>
        )}
      </TableCell>
      <TableCell>
        {form.formType && (
          <Badge className={cn("text-xs", FORM_TYPE_COLORS[form.formType] || FORM_TYPE_COLORS.custom)}>
            {form.formType}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-[var(--text-secondary)]">
        {form.submissionCount || 0}
      </TableCell>
      <TableCell className="text-[var(--text-tertiary)] text-sm">
        {updatedAt && isValid(updatedAt) 
          ? formatDistanceToNow(updatedAt, { addSuffix: true })
          : '-'
        }
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(form.id)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView?.(form.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Code className="h-4 w-4 mr-2" />
                Embed Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(form.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onArchive?.(form.id)}
                className="text-amber-600 dark:text-amber-400"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(form.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function FormsListView({
  forms = [],
  isLoading,
  viewMode = 'list',
  filter = 'all',
  onEdit,
  onView,
  onViewSubmissions,
  onDuplicate,
  onArchive,
  onDelete,
}) {
  // Apply filter
  const filteredForms = forms.filter(form => {
    if (filter === 'all') return true
    if (filter === 'active') return form.isActive
    if (filter === 'draft') return !form.isActive
    if (filter === 'archived') return form.status === 'archived'
    return true
  })

  if (isLoading) {
    return viewMode === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-[var(--glass-bg)] rounded-lg">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (filteredForms.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          {filter === 'all' ? 'No forms yet' : `No ${filter} forms`}
        </h3>
        <p className="text-[var(--text-secondary)] mb-4">
          {filter === 'all' 
            ? 'Create your first form to start collecting leads'
            : `You don't have any ${filter} forms`
          }
        </p>
        {filter === 'all' && (
          <Button style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white">
            Create Form
          </Button>
        )}
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredForms.map((form) => (
          <FormCard
            key={form.id}
            form={form}
            onEdit={onEdit}
            onView={onView}
            onViewSubmissions={onViewSubmissions}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[var(--text-tertiary)]">Form</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Status</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Type</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Submissions</TableHead>
            <TableHead className="text-[var(--text-tertiary)]">Last Updated</TableHead>
            <TableHead className="text-[var(--text-tertiary)] w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredForms.map((form) => (
            <FormRow
              key={form.id}
              form={form}
              onEdit={onEdit}
              onView={onView}
              onViewSubmissions={onViewSubmissions}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
