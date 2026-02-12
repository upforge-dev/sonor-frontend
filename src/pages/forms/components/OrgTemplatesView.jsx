// src/pages/forms/components/OrgTemplatesView.jsx
// Org-wide form templates management

import { useState, useEffect, useCallback } from 'react'
import portalApi from '@/lib/portal-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Globe,
  FileText,
  Copy,
  Trash2,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Layers,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function OrgTemplatesView({ orgId, orgName }) {
  const [templates, setTemplates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCloning, setIsCloning] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  
  const loadTemplates = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await portalApi.get('/forms/templates', { params: { org_id: orgId } })
      setTemplates(response.data?.templates || [])
    } catch (err) {
      console.error('Failed to load org templates:', err)
      setError('Failed to load org templates')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])
  
  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])
  
  async function handleCloneToAll() {
    if (!orgId) return
    setIsCloning(true)
    
    try {
      const response = await portalApi.post(`/forms/templates/${orgId}/clone-all`)
      const results = response.data?.results || []
      const totalCloned = results.reduce((sum, r) => sum + r.clonedCount, 0)
      
      if (totalCloned > 0) {
        toast.success(`Cloned ${totalCloned} template(s) to ${results.length} project(s)`)
      } else {
        toast.info('All projects already have these templates')
      }
    } catch (err) {
      console.error('Clone failed:', err)
      toast.error('Failed to clone templates')
    } finally {
      setIsCloning(false)
    }
  }
  
  async function handleDelete(id) {
    try {
      await portalApi.delete(`/forms/templates/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Org template deleted')
    } catch (err) {
      console.error('Delete failed:', err)
      toast.error('Failed to delete template')
    } finally {
      setDeleteTarget(null)
    }
  }
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={loadTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Globe className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            Org-Wide Templates
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Templates shared across all projects in <strong>{orgName || 'your organization'}</strong>.
            New projects automatically receive these forms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTemplates}
            className="border-[var(--glass-border)]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {templates.length > 0 && (
            <Button
              size="sm"
              onClick={handleCloneToAll}
              disabled={isCloning}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
            >
              {isCloning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Sync to All Projects
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Empty State */}
      {templates.length === 0 && (
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div 
              className="p-4 rounded-2xl mb-4"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
            >
              <Layers className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">No Org Templates Yet</h3>
            <p className="text-sm text-[var(--text-tertiary)] text-center max-w-md">
              Create a form and use "Promote to Org Template" from the form builder to share it 
              across all projects in {orgName || 'your organization'}.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Templates List */}
      <div className="space-y-3">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div 
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
                  >
                    <FileText className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[var(--text-primary)] truncate">
                        {template.name}
                      </h3>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {template.formType || 'custom'}
                      </Badge>
                      {template.isActive ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-tertiary)] truncate">
                      {template.description || `Slug: ${template.slug}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
                      <span>{template.fields?.length || 0} fields</span>
                      <span>Created {template.createdAt ? format(new Date(template.createdAt), 'MMM d, yyyy') : '—'}</span>
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                    >
                      <ChevronRight className="h-4 w-4 mr-2" />
                      {expandedId === template.id ? 'Hide Fields' : 'View Fields'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(template)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Expanded Fields */}
              {expandedId === template.id && template.fields?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                  <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                    Template Fields
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {template.fields.map((field, idx) => (
                      <div 
                        key={field.id || idx}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm"
                      >
                        <span className="text-[var(--text-primary)] font-medium truncate">
                          {field.label}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">
                          {field.fieldType}
                        </Badge>
                        {field.isRequired && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Org Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the template <strong>"{deleteTarget?.name}"</strong> from the organization. 
              Existing forms already cloned to projects will NOT be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteTarget?.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
