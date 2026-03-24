/**
 * WebsitePageMetadata - Full CRUD for page metadata (title, description, canonical).
 */
import { useState, useEffect } from 'react'
import { FileText, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useSeoPage, useUpdateSeoPage } from '@/hooks/seo'
import { seoApi } from '@/lib/sonor-api'
import { useQueryClient } from '@tanstack/react-query'
import { seoPageKeys } from '@/hooks/seo/useSeoPages'

const META_TITLE_MAX = 60
const META_DESC_MAX = 160

export default function WebsitePageMetadata({ projectId, selectedPage }) {
  const pageId = selectedPage?.id
  const queryClient = useQueryClient()
  const { data: page, isLoading, error } = useSeoPage(projectId, pageId)
  const updateMutation = useUpdateSeoPage()

  const [title, setTitle] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [canonical, setCanonical] = useState('')

  useEffect(() => {
    if (page) {
      setTitle(page.title ?? '')
      setMetaTitle(page.meta_title ?? page.title ?? '')
      setMetaDescription(page.meta_description ?? '')
      setCanonical(page.canonical ?? page.url ?? '')
    }
  }, [page])

  const handleSave = async () => {
    if (!pageId) return
    try {
      await seoApi.updatePageMetadata(pageId, {
        meta_title: metaTitle || undefined,
        meta_description: metaDescription || undefined,
        canonical: canonical || undefined,
      })
      queryClient.invalidateQueries({ queryKey: seoPageKeys.detail(pageId) })
      toast.success('Metadata saved')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || err.message || 'Failed to save')
    }
  }

  if (!projectId || !pageId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No page selected.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive text-sm">
          Failed to load page. Try again.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Page metadata
          </CardTitle>
          <CardDescription>
            Title, meta title, meta description, and canonical URL for this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-title">Meta title</Label>
            <Input
              id="meta-title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Page title for search results"
              maxLength={META_TITLE_MAX}
            />
            <p className="text-xs text-muted-foreground">
              {metaTitle.length}/{META_TITLE_MAX} — ~60 chars recommended
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta-desc">Meta description</Label>
            <Textarea
              id="meta-desc"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Short description for search results"
              rows={3}
              maxLength={META_DESC_MAX}
            />
            <p className="text-xs text-muted-foreground">
              {metaDescription.length}/{META_DESC_MAX} — ~160 chars recommended
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="canonical">Canonical URL</Label>
            <Input
              id="canonical"
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              placeholder="https://example.com/page"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save metadata
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
