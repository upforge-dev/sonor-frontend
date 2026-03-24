import { useState, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, ArrowDown, GitBranch, Eye, MousePointer,
  Reply, Clock, Save, AlertCircle, Shuffle
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { outreachApi } from '@/lib/sonor-api'
import { outreachSkillsApi } from '@/lib/signal-api'

const TRIGGER_OPTIONS = [
  { value: 'always', label: 'Always (wait N days)', icon: Clock },
  { value: 'opened', label: 'If opened', icon: Eye },
  { value: 'clicked', label: 'If clicked', icon: MousePointer },
  { value: 'replied', label: 'If replied', icon: Reply },
  { value: 'no_open', label: 'If NOT opened after N days', icon: Eye },
  { value: 'no_reply', label: 'If NOT replied after N days', icon: Reply },
  { value: 'no_click', label: 'If NOT clicked after N days', icon: MousePointer },
]

const TRIGGER_COLORS = {
  always: 'border-blue-300 bg-blue-50/50',
  opened: 'border-emerald-300 bg-emerald-50/50',
  clicked: 'border-purple-300 bg-purple-50/50',
  replied: 'border-teal-300 bg-teal-50/50',
  no_open: 'border-amber-300 bg-amber-50/50',
  no_reply: 'border-orange-300 bg-orange-50/50',
  no_click: 'border-red-300 bg-red-50/50',
}

function StepNode({ step, index, steps, onUpdate, onDelete, onAddBranch }) {
  const [editOpen, setEditOpen] = useState(false)
  const [spamScore, setSpamScore] = useState(null)
  const [scoring, setScoring] = useState(false)
  const [spintaxPreview, setSpintaxPreview] = useState(null)

  const triggerConfig = TRIGGER_OPTIONS.find(t => t.value === (step.trigger || 'always'))
  const TriggerIcon = triggerConfig?.icon || Clock

  const branches = steps.filter(s => s.trigger_step === step.id)
  const hasBranches = branches.length > 0

  const handleScoreCheck = async () => {
    setScoring(true)
    try {
      const result = await outreachSkillsApi.scoreDeliverability(step.subject, step.body_template)
      setSpamScore(result)
    } catch { setSpamScore(null) }
    setScoring(false)
  }

  const handleSpintaxPreview = async () => {
    try {
      const res = await outreachApi.previewSpintax({
        subject: step.subject,
        body_template: step.body_template,
      })
      setSpintaxPreview(res?.data || res)
    } catch { setSpintaxPreview(null) }
  }

  return (
    <div className="relative">
      {/* Connection line from above */}
      {index > 0 && !step.trigger_step && (
        <div className="flex justify-center mb-2">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Condition badge */}
      {step.trigger && step.trigger !== 'always' && (
        <div className="flex justify-center mb-1">
          <Badge variant="outline" className={cn('text-xs', TRIGGER_COLORS[step.trigger])}>
            <TriggerIcon className="h-3 w-3 mr-1" />
            {triggerConfig?.label} {step.wait_days ? `(${step.wait_days}d)` : ''}
          </Badge>
        </div>
      )}

      <Card className={cn(
        'border-2 transition-all hover:shadow-md',
        TRIGGER_COLORS[step.trigger || 'always'] || 'border-muted'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <span className="text-sm font-medium truncate max-w-[200px]">
                {step.subject || 'Untitled Step'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <SignalIcon className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Step {index + 1}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Trigger Condition</Label>
                        <Select value={step.trigger || 'always'} onValueChange={v => onUpdate(index, { ...step, trigger: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TRIGGER_OPTIONS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Wait Days</Label>
                        <Input
                          type="number"
                          min={0}
                          value={step.wait_days ?? step.day ?? 1}
                          onChange={e => onUpdate(index, { ...step, wait_days: parseInt(e.target.value) || 1, day: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    {step.trigger && step.trigger !== 'always' && (
                      <div>
                        <Label className="text-xs">Trigger Step</Label>
                        <Select value={step.trigger_step || ''} onValueChange={v => onUpdate(index, { ...step, trigger_step: v })}>
                          <SelectTrigger><SelectValue placeholder="Select trigger step" /></SelectTrigger>
                          <SelectContent>
                            {steps.filter(s => s.id !== step.id).map((s, i) => (
                              <SelectItem key={s.id} value={s.id}>Step {i + 1}: {s.subject?.slice(0, 40) || 'Untitled'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Subject Line</Label>
                      <Input
                        value={step.subject}
                        onChange={e => onUpdate(index, { ...step, subject: e.target.value })}
                        placeholder="Subject line (supports {spintax|syntax})"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Email Body</Label>
                      <Textarea
                        value={step.body_template}
                        onChange={e => onUpdate(index, { ...step, body_template: e.target.value })}
                        placeholder="Email body (supports {spintax|syntax} and merge tags)"
                        rows={8}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleScoreCheck} disabled={scoring}>
                        <SignalIcon className={cn('h-3.5 w-3.5 mr-1.5', scoring && 'animate-spin')} />
                        {scoring ? 'Scoring...' : 'Check Spam Score'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSpintaxPreview}>
                        <Shuffle className="h-3.5 w-3.5 mr-1.5" />
                        Preview Spintax
                      </Button>
                    </div>

                    {spamScore && (
                      <div className={cn('p-3 rounded-lg border',
                        spamScore.score >= 70 ? 'border-emerald-300 bg-emerald-50/50' :
                        spamScore.score >= 40 ? 'border-amber-300 bg-amber-50/50' :
                        'border-red-300 bg-red-50/50'
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Deliverability Score</span>
                          <span className={cn('text-lg font-bold',
                            spamScore.score >= 70 ? 'text-emerald-600' :
                            spamScore.score >= 40 ? 'text-amber-600' : 'text-red-600'
                          )}>{spamScore.score}/100</span>
                        </div>
                        {spamScore.issues?.length > 0 && (
                          <div className="space-y-1">
                            {spamScore.issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <AlertCircle className={cn('h-3 w-3 mt-0.5 flex-shrink-0',
                                  issue.severity === 'high' ? 'text-red-500' :
                                  issue.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                                )} />
                                <div>
                                  <span className="font-medium">{issue.issue}</span>
                                  <span className="text-muted-foreground"> — {issue.suggestion}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {spintaxPreview && (
                      <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {spintaxPreview.subject_variations * spintaxPreview.body_variations} possible variations
                        </p>
                        {spintaxPreview.subject_previews?.map((p, i) => (
                          <div key={i} className="text-xs p-2 bg-background rounded border">
                            <span className="font-medium">Subject:</span> {p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => onDelete(index)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">
            {step.body_template?.slice(0, 120) || 'No content yet...'}
          </p>

          {step.variants?.length > 1 && (
            <div className="mt-2 flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">A/B</Badge>
              <span className="text-[10px] text-muted-foreground">{step.variants.length} variants</span>
            </div>
          )}

          {/* Add branch button */}
          <div className="mt-2 pt-2 border-t">
            <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={() => onAddBranch(step.id)}>
              <GitBranch className="h-3 w-3 mr-1" /> Add Branch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branch children */}
      {hasBranches && (
        <div className="mt-2 ml-8 pl-4 border-l-2 border-dashed border-muted-foreground/30 space-y-3">
          {branches.map((branch, bi) => {
            const branchIndex = steps.findIndex(s => s.id === branch.id)
            return (
              <StepNode
                key={branch.id}
                step={branch}
                index={branchIndex}
                steps={steps}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAddBranch={onAddBranch}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SequenceBuilder({ steps = [], onChange }) {
  const generateId = () => `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const rootSteps = useMemo(() => {
    return steps.filter(s => !s.trigger_step)
  }, [steps])

  const handleUpdate = useCallback((index, updatedStep) => {
    const newSteps = [...steps]
    newSteps[index] = updatedStep
    onChange(newSteps)
  }, [steps, onChange])

  const handleDelete = useCallback((index) => {
    const deletedId = steps[index]?.id
    const newSteps = steps.filter((_, i) => i !== index).map(s => ({
      ...s,
      trigger_step: s.trigger_step === deletedId ? undefined : s.trigger_step,
    }))
    onChange(newSteps)
  }, [steps, onChange])

  const handleAddStep = useCallback(() => {
    const newStep = {
      id: generateId(),
      day: steps.length + 1,
      wait_days: steps.length === 0 ? 0 : 2,
      subject: '',
      body_template: '',
      trigger: 'always',
    }
    onChange([...steps, newStep])
  }, [steps, onChange])

  const handleAddBranch = useCallback((parentStepId) => {
    const newStep = {
      id: generateId(),
      day: 0,
      wait_days: 2,
      subject: '',
      body_template: '',
      trigger: 'no_reply',
      trigger_step: parentStepId,
    }
    onChange([...steps, newStep])
  }, [steps, onChange])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Sequence Flow</span>
          <Badge variant="secondary" className="text-xs">{steps.length} steps</Badge>
        </div>
      </div>

      {rootSteps.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">No steps yet. Add your first email step.</p>
          <Button onClick={handleAddStep}>
            <Plus className="h-4 w-4 mr-1.5" /> Add First Step
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rootSteps.map((step, i) => {
            const globalIndex = steps.findIndex(s => s.id === step.id)
            return (
              <StepNode
                key={step.id}
                step={step}
                index={globalIndex}
                steps={steps}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddBranch={handleAddBranch}
              />
            )
          })}
        </div>
      )}

      <Button variant="outline" onClick={handleAddStep} className="w-full mt-4">
        <Plus className="h-4 w-4 mr-1.5" /> Add Step
      </Button>
    </div>
  )
}
