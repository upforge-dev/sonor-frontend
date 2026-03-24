import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
import { OutreachEmptyState, OutreachLoading } from '@/components/outreach/ui'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, FileText, ExternalLink, Copy, Eye, Loader2, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'

export default function OutreachLandingPagesTab() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPage, setNewPage] = useState({ headline: '', body: '', cta_label: 'Schedule a Call', cta_url: '' })

  const fetchPages = useCallback(async () => {
    try {
      const { data } = await outreachApi.listLandingPages()
      setPages(data || [])
    } catch {
      toast.error('Failed to load landing pages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPages() }, [fetchPages])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await outreachApi.createLandingPage({
        page_content: {
          headline: newPage.headline,
          body: newPage.body,
          cta_label: newPage.cta_label,
          cta_url: newPage.cta_url,
        },
      })
      toast.success('Landing page created')
      setShowCreate(false)
      setNewPage({ headline: '', body: '', cta_label: 'Schedule a Call', cta_url: '' })
      fetchPages()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create landing page')
    } finally {
      setCreating(false)
    }
  }

  const copyUrl = (token) => {
    const url = `${window.location.origin}/lp/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Landing page URL copied')
  }

  if (loading) {
    return <OutreachLoading />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-secondary)]">Personalized landing pages for outreach campaigns</p>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Landing Page
        </Button>
      </div>

      {pages.length === 0 ? (
        <OutreachEmptyState
          icon={FileText}
          title="No landing pages yet"
          description="Create personalized landing pages for your outreach sequences. Each page can include custom headlines, CTAs, and recipient-specific content."
          action={
            <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Create Your First Page
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <GlassCard hover key={page.id}>
              <GlassCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <GlassCardTitle className="text-base truncate">
                    {page.page_content?.headline || 'Untitled Page'}
                  </GlassCardTitle>
                  <Badge variant={page.expires_at && new Date(page.expires_at) < new Date() ? 'destructive' : 'secondary'}>
                    {page.expires_at && new Date(page.expires_at) < new Date() ? 'Expired' : 'Active'}
                  </Badge>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {page.views || 0} views</span>
                  {page.expires_at && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {new Date(page.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => copyUrl(page.token)}>
                    <Copy className="h-3 w-3" /> Copy URL
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(`/lp/${page.token}`, '_blank')}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Headline</Label>
              <Input placeholder="We'd love to work with {{company_name}}" value={newPage.headline} onChange={(e) => setNewPage({ ...newPage, headline: e.target.value })} />
              <p className="text-xs text-[var(--text-secondary)] mt-1">Use {'{{company_name}}'}, {'{{first_name}}'} for personalization</p>
            </div>
            <div>
              <Label>Body</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Tell them why you're reaching out..."
                value={newPage.body}
                onChange={(e) => setNewPage({ ...newPage, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CTA Button Label</Label>
                <Input value={newPage.cta_label} onChange={(e) => setNewPage({ ...newPage, cta_label: e.target.value })} />
              </div>
              <div>
                <Label>CTA URL</Label>
                <Input placeholder="https://cal.com/..." value={newPage.cta_url} onChange={(e) => setNewPage({ ...newPage, cta_url: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newPage.headline.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
