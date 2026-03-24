import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { PenLine, Pencil, Copy, Clipboard, Trash2, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'
import useAuthStore from '@/lib/auth-store'
import { renderSignature } from '../signature-templates'

const SignatureEditor = lazy(() => import('./SignatureEditor'))
const SignatureTeamManager = lazy(() => import('./SignatureTeamManager'))

export default function SignaturesTab() {
  const [view, setView] = useState('list')
  const [editingSignatureId, setEditingSignatureId] = useState(null)
  const [signatures, setSignatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [dismissedUpdates, setDismissedUpdates] = useState(new Set())

  const user = useAuthStore((s) => s.user)

  const fetchSignatures = useCallback(async () => {
    try {
      const { data } = await outreachApi.getSignatures()
      setSignatures(data || [])
    } catch (err) {
      toast.error('Failed to load signatures')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSignatures() }, [fetchSignatures])

  const handleEdit = (id) => {
    setEditingSignatureId(id)
    setView('editor')
  }

  const handleCreate = () => {
    setEditingSignatureId(null)
    setView('editor')
  }

  const handleDuplicate = async (id) => {
    try {
      await outreachApi.duplicateSignature(id)
      toast.success('Signature duplicated')
      fetchSignatures()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate signature')
    }
  }

  const handleCopyHtml = (sig) => {
    try {
      let html
      if (sig.config?.mode === 'animated' && sig.animated_gif_url) {
        html = `<img src="${sig.animated_gif_url}" alt="${sig.config?.name || 'Email signature'}" style="display:block;max-width:600px;" />`
      } else {
        html = renderSignature(sig.config)
      }
      navigator.clipboard.writeText(html)
      toast.success('HTML copied to clipboard')
    } catch (err) {
      toast.error('Failed to copy HTML')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await outreachApi.deleteSignature(deleteTarget)
      toast.success('Signature deleted')
      setDeleteTarget(null)
      fetchSignatures()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete signature')
    } finally {
      setDeleting(false)
    }
  }

  // Check for stale signatures against current user info
  const staleSignatures = signatures.filter((sig) => {
    if (dismissedUpdates.has(sig.id)) return false
    if (!user || !sig.config) return false
    const c = sig.config
    return (
      (user.name && c.name && c.name !== user.name) ||
      (user.email && c.email && c.email !== user.email) ||
      (user.phone && c.phone && c.phone !== user.phone)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Editor view
  if (view === 'editor') {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <SignatureEditor
          signatureId={editingSignatureId}
          onBack={() => setView('list')}
          onSaved={() => {
            fetchSignatures()
            setView('list')
          }}
        />
      </Suspense>
    )
  }

  // List view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Signatures</h2>
          <p className="text-muted-foreground">
            Create and manage professional email signatures with social links, booking CTAs, and animated options.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <PenLine className="h-4 w-4" />
          Create Signature
        </Button>
      </div>

      {/* Stale signature banner */}
      {staleSignatures.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                {staleSignatures.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between">
                    <p className="text-sm text-amber-800">
                      Your contact info has changed since <span className="font-medium">{sig.name || 'Untitled'}</span> was last updated.
                    </p>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setDismissedUpdates((prev) => new Set([...prev, sig.id]))}
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(sig.id)}
                      >
                        Update Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {signatures.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <PenLine className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create your first email signature</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Professional email signatures with social links, booking CTAs, and animated options
            </p>
            <Button onClick={handleCreate} className="gap-2">
              <PenLine className="h-4 w-4" />
              Create Signature
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Signature grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {signatures.map((sig) => (
            <Card key={sig.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Mini preview — centered and scaled to use the canvas (not stuck in a corner) */}
                <div
                  className="relative h-[152px] overflow-hidden border-b bg-white"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleEdit(sig.id)}
                >
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    {sig.config?.mode === 'animated' && sig.animated_gif_url ? (
                      <img
                        src={sig.animated_gif_url}
                        alt=""
                        className="max-h-full max-w-full object-contain pointer-events-none select-none"
                      />
                    ) : (
                      <div
                        className="[&_table]:max-w-none"
                        style={{
                          transform: 'scale(0.92)',
                          transformOrigin: 'center center',
                          pointerEvents: 'none',
                        }}
                        dangerouslySetInnerHTML={{ __html: renderSignature(sig.config || {}) }}
                      />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate">{sig.name || 'Untitled'}</h3>
                    {sig.is_default && (
                      <Badge variant="default" className="text-[10px] h-5">Default</Badge>
                    )}
                    {sig.config?.mode === 'animated' && (
                      <Badge variant="secondary" className="text-[10px] h-5">Animated</Badge>
                    )}
                  </div>
                  {sig.config?.name && (
                    <p className="text-xs text-muted-foreground truncate">{sig.config.name}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit"
                      onClick={() => handleEdit(sig.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Duplicate"
                      onClick={() => handleDuplicate(sig.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Copy HTML"
                      onClick={() => handleCopyHtml(sig)}
                    >
                      <Clipboard className="h-4 w-4" />
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => setDeleteTarget(sig.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Signatures */}
      {signatures.length > 0 && (
        <Suspense fallback={null}>
          <SignatureTeamManager
            signatures={signatures}
            onCreateForMember={(member) => {
              setEditingSignatureId(member.signatureId || null)
              setView('editor')
            }}
          />
        </Suspense>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete signature?</DialogTitle>
            <DialogDescription>
              This will permanently remove this email signature. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
