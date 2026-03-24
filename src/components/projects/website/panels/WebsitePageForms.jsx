/**
 * WebsitePageForms - Managed forms on this page (page-specific view).
 * Shows only forms whose page_paths include the selected page. Edit/View in Forms module.
 * Add existing project forms to this page via "Add form to page".
 */
import { useState } from 'react'
import { ClipboardList, Plus, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useForms, formsKeys } from '@/lib/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { formsApi } from '@/lib/sonor-api'
import FormsListView from '@/pages/forms/components/FormsListView'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

function getPagePath(selectedPage) {
  if (!selectedPage) return ''
  return selectedPage.path ?? (selectedPage.url ? new URL(selectedPage.url, 'https://x').pathname : '') ?? ''
}

/** Normalize path for comparison (e.g. /about and /about/ match) */
function normalizePath(p) {
  if (typeof p !== 'string') return ''
  const trimmed = p.trim()
  return trimmed === '/' ? '/' : trimmed.replace(/\/+$/, '') || '/'
}

export default function WebsitePageForms({ projectId, selectedPage }) {
  const pagePath = getPagePath(selectedPage)
  const normalizedPagePath = normalizePath(pagePath)
  const queryClient = useQueryClient()
  const { data: formsData, isLoading } = useForms(
    { project_id: projectId },
    { enabled: !!projectId }
  )

  const forms = Array.isArray(formsData) ? formsData : (formsData?.forms ?? [])
  const filteredForms = forms.filter((form) => {
    const paths = form.pagePaths ?? form.page_paths ?? []
    return paths.some((p) => normalizePath(p) === normalizedPagePath)
  })
  const formsNotOnPage = forms.filter((form) => {
    const paths = form.pagePaths ?? form.page_paths ?? []
    return !paths.some((p) => normalizePath(p) === normalizedPagePath)
  })

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addingId, setAddingId] = useState(null)

  const handleAddFormToPage = async (form) => {
    const currentPaths = form.pagePaths ?? form.page_paths ?? []
    if (currentPaths.some((p) => normalizePath(p) === normalizedPagePath)) {
      toast.info('Form is already on this page')
      return
    }
    setAddingId(form.id)
    try {
      await formsApi.update(form.id, {
        pagePaths: [...currentPaths, pagePath || normalizedPagePath || '/'],
      })
      queryClient.invalidateQueries({ queryKey: formsKeys.all })
      toast.success(`Added "${form.name || form.title}" to this page`)
      setAddDialogOpen(false)
    } catch (e) {
      toast.error(e?.message || 'Failed to add form to page')
    } finally {
      setAddingId(null)
    }
  }

  const handleEdit = (id) => {
    window.open(`/forms?id=${id}`, '_blank', 'noopener,noreferrer')
  }
  const handleView = (id) => {
    window.open(`/forms?id=${id}`, '_blank', 'noopener,noreferrer')
  }

  if (!projectId || !selectedPage) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Select a page to see forms on this page.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Forms listed here are linked to this page. Edit or manage them in the Forms module; add
        existing project forms to this page below.
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          disabled={formsNotOnPage.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add form to this page
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="/forms?action=create" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Create form (Forms module)
          </a>
        </Button>
      </div>

      {filteredForms.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No forms on this page</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a form using the button above, or in the Forms module edit a form and add this
            page path to its &quot;Page paths&quot; so it appears here.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 px-2 py-1 rounded inline-block">
            {pagePath || '(no path)'}
          </p>
          {forms.length > 0 && (
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add form to this page
            </Button>
          )}
        </div>
      ) : (
        <FormsListView
          forms={filteredForms}
          isLoading={false}
          viewMode="list"
          filter="all"
          onEdit={handleEdit}
          onView={handleView}
        />
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add form to this page</DialogTitle>
            <DialogDescription>
              Choose a project form to show on this page. It will be added to the form&apos;s
              page paths.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {formsNotOnPage.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All project forms are already on this page, or there are no forms. Create one in
                the Forms module first.
              </p>
            ) : (
              formsNotOnPage.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{form.name || form.title || 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      /{form.slug || form.id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddFormToPage(form)}
                    disabled={addingId !== null}
                  >
                    {addingId === form.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
