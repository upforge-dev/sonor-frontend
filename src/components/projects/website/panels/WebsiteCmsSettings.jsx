/**
 * WebsiteCmsSettings - CMS enablement, configuration, and template management.
 * Shown in the site-wide "CMS" section of the Website sidebar.
 */
import { useState } from 'react'
import { Database, Check, ExternalLink, Loader2, BookTemplate, Trash2, Plus, Globe, Shield, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useEnableCms,
  useLinkCms,
  useCmsTemplates,
  useDeleteTemplate,
  useCreateCmsPage,
  useImportFromUrl,
  useRegisterCmsSchemas,
} from '@/lib/hooks'
import { toast } from 'sonner'

export default function WebsiteCmsSettings({ projectId, project, cmsStatus }) {
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkForm, setLinkForm] = useState({ sanityProjectId: '', dataset: '', apiToken: '' })
  const [showNewPageFromTemplate, setShowNewPageFromTemplate] = useState(false)
  const [newPageForm, setNewPageForm] = useState({ templateId: '', path: '', title: '' })
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(null)
  const [templateSearch, setTemplateSearch] = useState('')

  const enableCms = useEnableCms()
  const linkCms = useLinkCms()
  const deleteTemplate = useDeleteTemplate()
  const createPage = useCreateCmsPage()
  const importFromUrl = useImportFromUrl()
  const registerSchemas = useRegisterCmsSchemas()

  const { data: templates = [] } = useCmsTemplates(projectId, {
    enabled: !!projectId && !!cmsStatus?.connected,
  })

  const templatesList = Array.isArray(templates) ? templates : []

  const handleEnable = async () => {
    try {
      await enableCms.mutateAsync()
      toast.success('CMS enabled successfully')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to enable CMS')
    }
  }

  const handleLink = async (e) => {
    e.preventDefault()
    try {
      await linkCms.mutateAsync(linkForm)
      toast.success('External Sanity project linked')
      setShowLinkForm(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to link Sanity project')
    }
  }

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteTemplate.mutateAsync({ templateId, projectId })
      toast.success('Template deleted')
      setConfirmDeleteTemplate(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete template')
    }
  }

  const filteredTemplates = templateSearch
    ? templates.filter((t) => t.name?.toLowerCase().includes(templateSearch.toLowerCase()))
    : templates

  const handleCreateFromTemplate = async () => {
    if (!newPageForm.templateId || !newPageForm.path || !newPageForm.title) return
    try {
      await createPage.mutateAsync({
        projectId,
        templateId: newPageForm.templateId,
        path: newPageForm.path.startsWith('/') ? newPageForm.path : `/${newPageForm.path}`,
        title: newPageForm.title,
      })
      toast.success('Page created from template')
      setShowNewPageFromTemplate(false)
      setNewPageForm({ templateId: '', path: '', title: '' })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create page')
    }
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return
    try {
      await importFromUrl.mutateAsync({ projectId, url: importUrl.trim() })
      toast.success('Page imported successfully')
      setShowImportDialog(false)
      setImportUrl('')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to import page')
    }
  }

  if (cmsStatus?.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Content Management System
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            CMS is active. Manage page content using the Content tab on any CMS page.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Connection Status
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {cmsStatus.sanityProjectId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sanity Project</span>
                <span className="font-mono text-xs">{cmsStatus.sanityProjectId}</span>
              </div>
            )}
            {cmsStatus.dataset && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dataset</span>
                <span className="font-mono text-xs">{cmsStatus.dataset}</span>
              </div>
            )}
            {typeof cmsStatus.pageCount === 'number' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CMS Pages</span>
                <span>{cmsStatus.pageCount}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BookTemplate className="h-4 w-4" />
                Page Templates
              </CardTitle>
              {templatesList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewPageFromTemplate(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Page from Template
                </Button>
              )}
            </div>
            <CardDescription>
              Reusable page structures. Save any CMS page as a template, then create new pages pre-populated with that structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templatesList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Use "Save as Template" on any CMS page to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {templatesList.length > 4 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search templates..."
                      className="h-8 text-xs pl-8"
                    />
                  </div>
                )}
                {filteredTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No templates match "{templateSearch}"
                  </p>
                ) : (
                  filteredTemplates.map((tmpl) => (
                    <div
                      key={tmpl._id}
                      className="flex items-center justify-between py-2 px-3 rounded-md border group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tmpl.sectionCount} section{tmpl.sectionCount !== 1 ? 's' : ''}
                          {tmpl.sectionTypes?.length > 0 && (
                            <> &middot; {[...new Set(tmpl.sectionTypes)].join(', ')}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setNewPageForm(f => ({ ...f, templateId: tmpl._id }))
                            setShowNewPageFromTemplate(true)
                          }}
                        >
                          Use
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => setConfirmDeleteTemplate(tmpl)}
                          aria-label={`Delete template ${tmpl.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import from URL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Import from URL
            </CardTitle>
            <CardDescription>
              Import an existing webpage into CMS. The page content will be converted into editable sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowImportDialog(true)}
            >
              <Globe className="h-4 w-4 mr-2" />
              Import Page from URL
            </Button>
          </CardContent>
        </Card>

        {/* Import from URL Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Import Page from URL</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Page URL</Label>
                <Input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/about"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The page HTML will be fetched and converted into CMS sections (hero, rich text, FAQ, CTA).
              </p>
              <Button
                className="w-full"
                onClick={handleImportFromUrl}
                disabled={!importUrl.trim() || importFromUrl.isPending}
              >
                {importFromUrl.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Import
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schema Registration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Schema Validation
            </CardTitle>
            <CardDescription>
              Register document schemas with Sanity to enable server-side content validation
              and meaningful field names in the Content Lake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const result = await registerSchemas.mutateAsync()
                  if (result.ok) {
                    toast.success('Schemas registered successfully')
                  } else {
                    toast.error(result.message || 'Schema registration failed')
                  }
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Failed to register schemas')
                }
              }}
              disabled={registerSchemas.isPending}
            >
              {registerSchemas.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Register Schemas
            </Button>
          </CardContent>
        </Card>

        {/* Create from Template Dialog */}
        <Dialog open={showNewPageFromTemplate} onOpenChange={setShowNewPageFromTemplate}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Page from Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Template</Label>
                <Select
                  value={newPageForm.templateId}
                  onValueChange={(v) => setNewPageForm(f => ({ ...f, templateId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesList.map((tmpl) => (
                      <SelectItem key={tmpl._id} value={tmpl._id}>
                        {tmpl.name} ({tmpl.sectionCount} sections)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Page Title</Label>
                <Input
                  value={newPageForm.title}
                  onChange={(e) => setNewPageForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. About Us"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Page Path</Label>
                <Input
                  value={newPageForm.path}
                  onChange={(e) => setNewPageForm(f => ({ ...f, path: e.target.value }))}
                  placeholder="/about"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateFromTemplate}
                disabled={!newPageForm.templateId || !newPageForm.path || !newPageForm.title || createPage.isPending}
              >
                {createPage.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Page
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Template Confirmation */}
        <AlertDialog open={!!confirmDeleteTemplate} onOpenChange={() => setConfirmDeleteTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete template?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the template <strong>"{confirmDeleteTemplate?.name}"</strong>.
                Existing pages created from this template are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteTemplate(confirmDeleteTemplate?._id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteTemplate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Content Management System
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enable CMS to compose pages with rich, reusable content sections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick enable */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Setup</CardTitle>
            <CardDescription>
              Enable CMS with Sonor's managed content infrastructure. No configuration needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleEnable}
              disabled={enableCms.isPending}
              className="w-full"
            >
              {enableCms.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Enable CMS
            </Button>
          </CardContent>
        </Card>

        {/* Link external */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link External Sanity</CardTitle>
            <CardDescription>
              Connect your own Sanity project for full control over the content lake.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showLinkForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowLinkForm(true)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Link Sanity Project
              </Button>
            ) : (
              <form onSubmit={handleLink} className="space-y-3">
                <div>
                  <Label htmlFor="sanityProjectId">Sanity Project ID</Label>
                  <Input
                    id="sanityProjectId"
                    value={linkForm.sanityProjectId}
                    onChange={(e) => setLinkForm(f => ({ ...f, sanityProjectId: e.target.value }))}
                    placeholder="e.g. l55lyemx"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataset">Dataset</Label>
                  <Input
                    id="dataset"
                    value={linkForm.dataset}
                    onChange={(e) => setLinkForm(f => ({ ...f, dataset: e.target.value }))}
                    placeholder="production"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="apiToken">API Token</Label>
                  <Input
                    id="apiToken"
                    type="password"
                    value={linkForm.apiToken}
                    onChange={(e) => setLinkForm(f => ({ ...f, apiToken: e.target.value }))}
                    placeholder="Sanity API token"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={linkCms.isPending} size="sm">
                    {linkCms.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowLinkForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
