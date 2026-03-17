/**
 * WebsitePageCmsContent - CMS section editor for CMS-backed pages.
 * Replaces WebsitePageContent when a page has CMS data.
 * Full section CRUD with drag-reorder, section type editors, publish flow,
 * save-as-template, duplicate, revision history, and real-time presence.
 */
import { useState, useCallback } from 'react'
import {
  Database,
  Plus,
  GripVertical,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Globe,
  GlobeLock,
  Eye,
  BookTemplate,
  History,
  RotateCcw,
  Copy,
} from 'lucide-react'
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useCmsPage,
  useAddCmsSection,
  useUpdateCmsSection,
  useDeleteCmsSection,
  useReorderCmsSections,
  usePublishCmsPage,
  useUnpublishCmsPage,
  useSaveAsTemplate,
  useCmsPageRevisions,
  useRestoreRevision,
  useCmsPresence,
} from '@/lib/hooks'
import useAuthStore from '@/lib/auth-store'
import { toast } from 'sonner'
import { SECTION_EDITORS } from '@/components/cms/sections'

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero' },
  { value: 'richText', label: 'Rich Text' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'faq', label: 'FAQ' },
  { value: 'form', label: 'Form' },
  { value: 'custom', label: 'Custom' },
]

// ---------------------------------------------------------------------------
// Skeleton loader for sections
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sortable Section Card
// ---------------------------------------------------------------------------

function SortableSectionCard({ section, pageId, projectId, onDuplicate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SectionCard
        section={section}
        pageId={pageId}
        projectId={projectId}
        onDuplicate={onDuplicate}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  )
}

function SectionCard({ section, pageId, projectId, onDuplicate, dragAttributes, dragListeners }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localData, setLocalData] = useState(section.data || {})
  const [isDirty, setIsDirty] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const deleteSection = useDeleteCmsSection()
  const updateSection = useUpdateCmsSection()

  const handleDataChange = useCallback((newData) => {
    setLocalData(newData)
    setIsDirty(true)
  }, [])

  const handleSave = async () => {
    try {
      await updateSection.mutateAsync({
        pageId,
        sectionId: section._id,
        data: { data: localData },
      })
      setIsDirty(false)
      toast.success('Section saved')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save section')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteSection.mutateAsync({ pageId, sectionId: section._id })
      toast.success('Section deleted')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete section')
    }
  }

  const Editor = SECTION_EDITORS[section.sectionType]

  return (
    <>
      <Card className="group">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity touch-none"
              aria-label="Drag to reorder section"
              {...dragAttributes}
              {...dragListeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 flex-1 text-left"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${section.displayName || section.sectionType} section`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-sm font-medium">
                {section.displayName || section.sectionType}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {section.sectionType}
              </Badge>
            </button>
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={updateSection.isPending}
              >
                {updateSection.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDuplicate?.(section)}
                  aria-label="Duplicate section"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Duplicate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteSection.isPending}
                  aria-label="Delete section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{
            maxHeight: isExpanded ? '2000px' : '0px',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <CardContent className="pt-0 px-4 pb-4">
            {Editor ? (
              <Editor data={localData} onChange={handleDataChange} />
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-4 text-center">
                No editor available for section type: <strong>{section.sectionType}</strong>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{section.displayName || section.sectionType}</strong> section
              and all its content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Revision History (improved)
// ---------------------------------------------------------------------------

function RevisionHistory({ pageId }) {
  const { data: revisions = [], isLoading } = useCmsPageRevisions(pageId)
  const restoreRevision = useRestoreRevision()
  const [confirmRestore, setConfirmRestore] = useState(null)

  const handleRestore = async (rev) => {
    try {
      await restoreRevision.mutateAsync({ pageId, rev })
      toast.success('Page restored to previous revision')
      setConfirmRestore(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to restore revision')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No revision history available.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {revisions.map((rev, i) => (
          <div
            key={rev._rev || i}
            className={`flex items-center justify-between py-2.5 px-3 rounded-md group transition-colors ${
              i === 0
                ? 'bg-primary/5 border border-primary/10'
                : 'hover:bg-muted/50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {rev.title || 'Content update'}
                </p>
                {i === 0 && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    Current
                  </Badge>
                )}
                {rev.status === 'published' && i !== 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                    Published
                  </Badge>
                )}
                {rev.status === 'draft' && i !== 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Draft
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rev._updatedAt
                  ? formatRelativeTime(rev._updatedAt)
                  : 'Unknown date'}
                {rev.metadata?.lastEditedBy && (
                  <span className="ml-1.5">by {rev.metadata.lastEditedBy}</span>
                )}
              </p>
            </div>
            {i > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setConfirmRestore(rev._rev)}
                disabled={restoreRevision.isPending}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restore
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Restore confirmation */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this revision?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current page content with the selected revision.
              The current version will be preserved in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRestore(confirmRestore)}>
              {restoreRevision.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Format a date as relative time (e.g., "2 hours ago", "Yesterday") */
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WebsitePageCmsContent({ projectId, project, selectedPage, cmsPage }) {
  const [addingSectionType, setAddingSectionType] = useState('')
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const { data: fullPage, isLoading } = useCmsPage(cmsPage?.id)
  const addSection = useAddCmsSection()
  const reorderSections = useReorderCmsSections()
  const publishPage = usePublishCmsPage()
  const unpublishPage = useUnpublishCmsPage()
  const saveAsTemplate = useSaveAsTemplate()

  // Real-time presence — show other editors on this page
  const { user } = useAuthStore()
  const { editors } = useCmsPresence(cmsPage?.sanity_document_id || cmsPage?.id, {
    enabled: !!cmsPage,
  })
  const otherEditors = editors.filter((e) => e.userId !== user?.id)

  const pageData = fullPage || cmsPage
  const sections = pageData?.sections || pageData?.sanityContent?.sections || []
  const status = pageData?.status || cmsPage?.status || 'draft'

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = sections.findIndex((s) => s._id === active.id)
      const newIndex = sections.findIndex((s) => s._id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(sections, oldIndex, newIndex)
      const sectionIds = reordered.map((s) => s._id)

      try {
        await reorderSections.mutateAsync({ pageId: cmsPage.id, sectionIds })
        toast.success('Sections reordered')
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to reorder')
      }
    },
    [sections, cmsPage?.id, reorderSections],
  )

  const handleDuplicateSection = useCallback(
    async (section) => {
      try {
        await addSection.mutateAsync({
          pageId: cmsPage.id,
          data: {
            sectionType: section.sectionType,
            displayName: `${section.displayName || section.sectionType} (copy)`,
            data: section.data || {},
          },
        })
        toast.success('Section duplicated')
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to duplicate section')
      }
    },
    [cmsPage?.id, addSection],
  )

  const handleAddSection = async () => {
    if (!addingSectionType) return
    try {
      await addSection.mutateAsync({
        pageId: cmsPage.id,
        data: {
          sectionType: addingSectionType,
          displayName: SECTION_TYPES.find(t => t.value === addingSectionType)?.label || addingSectionType,
          data: {},
        },
      })
      toast.success('Section added')
      setAddingSectionType('')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add section')
    }
  }

  const handlePublish = async () => {
    try {
      await publishPage.mutateAsync({ id: cmsPage.id, projectId })
      toast.success('Page published')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to publish')
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublishPage.mutateAsync({ id: cmsPage.id, projectId })
      toast.success('Page unpublished')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to unpublish')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return
    try {
      await saveAsTemplate.mutateAsync({
        pageId: cmsPage.id,
        name: templateName.trim(),
        projectId,
      })
      toast.success('Saved as template')
      setShowTemplateDialog(false)
      setTemplateName('')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save template')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <SectionSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: CMS badge + publish actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">CMS Page</span>
          <Badge
            variant="outline"
            className={
              status === 'published'
                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }
          >
            {status === 'published' ? '● Published' : '○ Draft'}
          </Badge>
          {/* Active editors indicator */}
          {otherEditors.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <div className="flex -space-x-2">
                {otherEditors.slice(0, 3).map((editor) => (
                  <Tooltip key={editor.userId}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        {editor.avatar ? (
                          <img
                            src={editor.avatar}
                            alt={editor.userName}
                            className="h-6 w-6 rounded-full border-2 border-background ring-2 ring-green-500"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-background ring-2 ring-green-500 bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {editor.userName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-background" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {editor.userName} is editing
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              {otherEditors.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{otherEditors.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
            title="Save as Template"
          >
            <BookTemplate className="h-3.5 w-3.5 mr-1.5" />
            Save as Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const siteUrl = project?.site_url || project?.url || ''
              if (!siteUrl) {
                toast.error('No site URL configured for this project')
                return
              }
              const pagePath = cmsPage.path || selectedPage?.path || '/'
              const previewUrl = `${siteUrl.replace(/\/$/, '')}${pagePath}?preview=true`
              window.open(previewUrl, '_blank')
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
          {status === 'published' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={unpublishPage.isPending}
            >
              {unpublishPage.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <GlobeLock className="h-3.5 w-3.5 mr-1.5" />
              )}
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishPage.isPending}
            >
              {publishPage.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5 mr-1.5" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: Sections / History */}
      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">
            Sections
            {sections.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                {sections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1.5" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4 mt-4">
          {/* Sections list */}
          {sections.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground">No sections yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first section to start building this page.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sections.map((section) => (
                    <SortableSectionCard
                      key={section._id}
                      section={section}
                      pageId={cmsPage.id}
                      projectId={projectId}
                      onDuplicate={handleDuplicateSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add section */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Select value={addingSectionType} onValueChange={setAddingSectionType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Section type..." />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSection}
              disabled={!addingSectionType || addSection.isPending}
            >
              {addSection.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Add Section
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <RevisionHistory pageId={cmsPage?.id} />
        </TabsContent>
      </Tabs>

      {/* Save as Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Service Page, Landing Page..."
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a reusable template from this page's current sections.
              New pages can be created pre-populated from this template.
            </p>
            <Button
              className="w-full"
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || saveAsTemplate.isPending}
            >
              {saveAsTemplate.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BookTemplate className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
