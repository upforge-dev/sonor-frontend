/**
 * WebsitePageContent - Page-scoped content blocks (full CRUD).
 * Fetches site content and filters by path; create/update/delete.
 */
import { useState, useMemo } from 'react'
import { FileEdit, Plus, Loader2, MoreVertical, Edit, Trash2, Database, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useSiteContent,
  useCreateSiteContent,
  useUpdateSiteContent,
  useDeleteSiteContent,
  useCreateCmsPage,
} from '@/lib/hooks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const CONTENT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
]

function getPagePath(selectedPage) {
  if (!selectedPage) return ''
  return selectedPage.path ?? (selectedPage.url ? new URL(selectedPage.url, 'https://x').pathname : '') ?? ''
}

export default function WebsitePageContent({ projectId, selectedPage, cmsConnected = false }) {
  const pagePath = getPagePath(selectedPage)
  const { data: allContent = [], isLoading, refetch } = useSiteContent(projectId, { enabled: !!projectId })
  const contentList = useMemo(() => {
    if (!pagePath) return []
    const normalized = pagePath.replace(/\/$/, '') || '/'
    return allContent.filter((c) => {
      const p = (c.path || c.page_path || '').replace(/\/$/, '') || '/'
      return p === normalized
    })
  }, [allContent, pagePath])

  const createMutation = useCreateSiteContent()
  const updateMutation = useUpdateSiteContent()
  const deleteMutation = useDeleteSiteContent()
  const createCmsPage = useCreateCmsPage()

  const [editingItem, setEditingItem] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const [createForm, setCreateForm] = useState({
    path: pagePath,
    section: '',
    content_type: 'text',
    content: '',
  })
  const [editForm, setEditForm] = useState({ path: '', section: '', content_type: 'text', content: '' })

  if (!projectId || !selectedPage) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Select a page to manage its content blocks.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!createForm.section) return
    try {
      await createMutation.mutateAsync({
        projectId,
        data: {
          path: pagePath,
          section: createForm.section,
          content_type: createForm.content_type || 'text',
          content: createForm.content || '',
        },
      })
      toast.success('Content block created')
      setIsCreateOpen(false)
      setCreateForm({ path: pagePath, section: '', content_type: 'text', content: '' })
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingItem?.id) return
    try {
      await updateMutation.mutateAsync({
        id: editingItem.id,
        projectId,
        data: {
          section: editForm.section,
          content_type: editForm.content_type,
          content: editForm.content,
        },
      })
      toast.success('Content updated')
      setEditingItem(null)
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update')
    }
  }

  const handleDelete = async (id) => {
    setIsDeleting(id)
    try {
      await deleteMutation.mutateAsync({ id, projectId })
      toast.success('Content deleted')
      if (editingItem?.id === id) setEditingItem(null)
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete')
    } finally {
      setIsDeleting(null)
    }
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setEditForm({
      path: item.path || pagePath,
      section: item.section || '',
      content_type: item.content_type || 'text',
      content: item.content || '',
    })
  }

  const handleConvertToCms = async () => {
    try {
      await createCmsPage.mutateAsync({
        projectId,
        title: selectedPage?.title || pagePath,
        path: pagePath,
        seoPageId: selectedPage?.id || null,
      })
      toast.success('Page converted to CMS — reload to see the CMS editor')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to convert page')
    }
  }

  return (
    <div className="space-y-4">
      {/* Convert to CMS banner */}
      {cmsConnected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
          <Database className="h-5 w-5 text-violet-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Upgrade to CMS Page</p>
            <p className="text-xs text-muted-foreground">
              Compose this page with rich, reusable sections instead of simple content blocks.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleConvertToCms}
            disabled={createCmsPage.isPending}
            className="shrink-0"
          >
            {createCmsPage.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
            )}
            Convert
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{contentList.length} content block(s)</span>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add block
        </Button>
      </div>

      {contentList.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FileEdit className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No content blocks for this page.</p>
          <Button className="mt-4" variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create content block
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {contentList.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{item.section || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(item.content || '').slice(0, 80)}…
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting === item.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create content block</DialogTitle>
            <DialogDescription>Managed content for this page.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Section ID</Label>
              <Input
                value={createForm.section}
                onChange={(e) => setCreateForm((f) => ({ ...f, section: e.target.value }))}
                placeholder="e.g. hero-headline, footer-cta"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={createForm.content_type}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, content_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={createForm.content}
                onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                placeholder="Content body"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !createForm.section}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit content block</DialogTitle>
            <DialogDescription>Update section and content.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Section ID</Label>
              <Input
                value={editForm.section}
                onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={editForm.content_type}
                onValueChange={(v) => setEditForm((f) => ({ ...f, content_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => editingItem && handleDelete(editingItem.id)}
                disabled={isDeleting === editingItem?.id}
              >
                Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
