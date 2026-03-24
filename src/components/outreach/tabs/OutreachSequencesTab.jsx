import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreVertical, Play, Pause, Edit, Trash2, Users, ListOrdered,
  Loader2, CheckCircle2, Mail, Clock, ArrowRight, GitBranch,
} from 'lucide-react'
import { toast } from 'sonner'
import { outreachApi } from '@/lib/sonor-api'
import SequenceBuilder from '../SequenceBuilder'

const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'destructive' },
}

export default function OutreachSequencesTab() {
  const [sequences, setSequences] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingSequence, setEditingSequence] = useState(null)
  const [search, setSearch] = useState('')

  const fetchSequences = useCallback(async () => {
    try {
      const { data } = await outreachApi.listSequences()
      setSequences(data || [])
    } catch (err) {
      toast.error('Failed to load sequences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSequences() }, [fetchSequences])

  const handleCreate = async (formData) => {
    try {
      await outreachApi.createSequence(formData)
      toast.success('Sequence created')
      setShowCreate(false)
      fetchSequences()
    } catch (err) {
      toast.error('Failed to create sequence')
    }
  }

  const handleActivate = async (id) => {
    try {
      await outreachApi.activateSequence(id)
      toast.success('Sequence activated')
      fetchSequences()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate')
    }
  }

  const handlePause = async (id) => {
    try {
      await outreachApi.pauseSequence(id)
      toast.success('Sequence paused')
      fetchSequences()
    } catch (err) {
      toast.error('Failed to pause sequence')
    }
  }

  const handleDelete = async (id) => {
    try {
      await outreachApi.deleteSequence(id)
      toast.success('Sequence deleted')
      fetchSequences()
    } catch (err) {
      toast.error('Failed to delete sequence')
    }
  }

  const filtered = sequences.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cold Outreach Sequences</h2>
          <p className="text-muted-foreground">Multi-step cold email sequences with Signal personalization</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><ListOrdered className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{sequences.length}</p>
                <p className="text-xs text-muted-foreground">Sequences</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><Play className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{sequences.filter(s => s.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100"><Users className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{sequences.reduce((s, seq) => s + (seq.total_enrolled || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Total Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100"><Mail className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{sequences.reduce((s, seq) => s + (seq.total_replied || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Total Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search sequences..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sequences yet</h3>
            <p className="text-muted-foreground mb-4">Create your first cold outreach sequence</p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((seq) => {
            const steps = seq.steps || []
            const statusConfig = STATUS_CONFIG[seq.status] || STATUS_CONFIG.draft
            return (
              <Card key={seq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{seq.name}</h3>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </div>
                      {seq.description && <p className="text-sm text-muted-foreground truncate">{seq.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{steps.length} steps</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{seq.total_enrolled || 0} enrolled</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{seq.total_replied || 0} replies</span>
                        {steps.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Day {steps[0]?.day}
                            {steps.length > 1 && <><ArrowRight className="h-3 w-3" />Day {steps[steps.length - 1]?.day}</>}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {seq.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleActivate(seq.id)}><Play className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>
                        )}
                        {seq.status === 'active' && (
                          <DropdownMenuItem onClick={() => handlePause(seq.id)}><Pause className="h-4 w-4 mr-2" />Pause</DropdownMenuItem>
                        )}
                        {seq.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleActivate(seq.id)}><Play className="h-4 w-4 mr-2" />Resume</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setEditingSequence(seq)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(seq.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CreateSequenceDialog open={showCreate} onOpenChange={setShowCreate} onSave={handleCreate} />

      {editingSequence && (
        <EditSequenceDialog
          sequence={editingSequence}
          open={!!editingSequence}
          onOpenChange={(open) => !open && setEditingSequence(null)}
          onSave={async (updates) => {
            try {
              await outreachApi.updateSequence(editingSequence.id, updates)
              toast.success('Sequence updated')
              setEditingSequence(null)
              fetchSequences()
            } catch {
              toast.error('Failed to update sequence')
            }
          }}
        />
      )}
    </div>
  )
}

function EditSequenceDialog({ sequence, open, onOpenChange, onSave }) {
  const [name, setName] = useState(sequence?.name || '')
  const [description, setDescription] = useState(sequence?.description || '')
  const [steps, setSteps] = useState(() => {
    const raw = sequence?.steps || []
    return raw.map((s, i) => ({
      ...s,
      id: s.id || `step_${i}_${Date.now()}`,
    }))
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ name, description, steps })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Edit Sequence
          </DialogTitle>
          <DialogDescription>Build your sequence flow with conditional branching, spintax, and A/B testing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Sequence name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <SequenceBuilder steps={steps} onChange={setSteps} />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateSequenceDialog({ open, onOpenChange, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        steps: [
          { day: 1, subject: 'Introduction', body_template: '<p>Hi {{first_name}},</p><p>{{personalized_intro}}</p>' },
          { day: 3, subject: 'Following up', body_template: '<p>Hi {{first_name}},</p><p>Just wanted to follow up on my previous email.</p>' },
          { day: 7, subject: 'Quick question', body_template: '<p>Hi {{first_name}},</p><p>Would you have 15 minutes this week for a quick call?</p>' },
        ],
      })
      setName('')
      setDescription('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sequence</DialogTitle>
          <DialogDescription>Start with a 3-step template. You can customize steps after creation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input placeholder="Sequence name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
