/**
 * PipelineSettingsDialog - Configure custom pipeline stages
 * Allows projects to customize their sales pipeline stages
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GripVertical,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Phone,
  Send,
  MessageSquare,
  CheckCheck
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { crmApi } from '@/lib/portal-api'
import { useBrandColors } from '@/hooks/useBrandColors'

// Default icon options
const ICON_OPTIONS = [
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'send', label: 'Send', icon: Send },
  { value: 'message', label: 'Message', icon: MessageSquare },
  { value: 'check', label: 'Check', icon: CheckCircle2 },
  { value: 'checkcheck', label: 'Double Check', icon: CheckCheck },
  { value: 'x', label: 'X', icon: XCircle },
]

// Color palette
const COLOR_OPTIONS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#EAB308', label: 'Yellow' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#EC4899', label: 'Pink' },
]

export default function PipelineSettingsDialog({ open, onClose, projectId, onUpdate }) {
  const { primary: brandPrimary } = useBrandColors()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [stages, setStages] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)

  // Fetch current pipeline stages
  useEffect(() => {
    if (open && projectId) {
      fetchStages()
    }
  }, [open, projectId])

  const fetchStages = async () => {
    setIsLoading(true)
    try {
      const response = await crmApi.getPipelineStages(projectId)
      // Map API response (camelCase) to frontend format (snake_case)
      const mappedStages = (response.data.stages || []).map(s => ({
        id: s.id,
        stage_key: s.stageKey || s.stage_key,
        stage_label: s.stageLabel || s.stage_label,
        color: s.color,
        icon: s.icon || 'sparkles',
        sort_order: s.sortOrder ?? s.sort_order,
        is_won: s.isWon ?? s.is_won ?? false,
        is_lost: s.isLost ?? s.is_lost ?? false,
      }))
      setStages(mappedStages)
    } catch (err) {
      console.error('Failed to fetch pipeline stages:', err)
      toast.error('Failed to load pipeline configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await crmApi.updatePipelineStages(projectId, stages)
      toast.success('Pipeline configuration saved')
      onUpdate?.()
      onClose()
    } catch (err) {
      console.error('Failed to save pipeline:', err)
      toast.error('Failed to save pipeline configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddStage = () => {
    const newStage = {
      id: `temp-${Date.now()}`,
      stage_key: `stage_${stages.length + 1}`,
      stage_label: 'New Stage',
      color: '#3B82F6',
      icon: 'sparkles',
      sort_order: stages.length,
      is_won: false,
      is_lost: false,
    }
    setStages([...stages, newStage])
  }

  const handleRemoveStage = (index) => {
    const stage = stages[index]
    if (stage.is_won || stage.is_lost) {
      toast.error('Cannot remove won/lost stages')
      return
    }
    setStages(stages.filter((_, i) => i !== index))
  }

  const handleUpdateStage = (index, field, value) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], [field]: value }
    setStages(updated)
  }

  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const updated = [...stages]
    const dragged = updated[draggedIndex]
    updated.splice(draggedIndex, 1)
    updated.splice(index, 0, dragged)
    
    // Update sort order
    updated.forEach((stage, i) => {
      stage.sort_order = i
    })
    
    setStages(updated)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-sonor-help="crm/settings" className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Pipeline Configuration</DialogTitle>
          <DialogDescription>
            Customize your sales pipeline stages. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: brandPrimary }} />
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 overflow-y-auto pr-4 -mr-4" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              <div className="space-y-3 pr-2">
                {stages.map((stage, index) => {
                  const IconComponent = ICON_OPTIONS.find(opt => opt.value === stage.icon)?.icon || Sparkles
                  
                  return (
                    <div
                      key={stage.id}
                      draggable={!stage.is_won && !stage.is_lost}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border bg-[var(--glass-bg)]',
                        draggedIndex === index && 'opacity-50',
                        (stage.is_won || stage.is_lost) ? 'cursor-default' : 'cursor-move'
                      )}
                    >
                      {/* Drag Handle */}
                      {!stage.is_won && !stage.is_lost && (
                        <GripVertical className="h-5 w-5 text-[var(--text-tertiary)] mt-2 flex-shrink-0" />
                      )}

                      {/* Stage Preview */}
                      <div className="flex-shrink-0 mt-2">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: stage.color }}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      {/* Stage Configuration */}
                      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <Label className="text-xs">Stage Label</Label>
                          <Input
                            value={stage.stage_label}
                            onChange={(e) => handleUpdateStage(index, 'stage_label', e.target.value)}
                            disabled={stage.is_won || stage.is_lost}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Stage Key</Label>
                          <Input
                            value={stage.stage_key}
                            onChange={(e) => handleUpdateStage(index, 'stage_key', e.target.value)}
                            disabled={stage.is_won || stage.is_lost}
                            className="h-8 font-mono text-xs"
                          />
                        </div>

                        <div>
                          {/* Color Picker */}
                          <div>
                            <Label className="text-xs">Color</Label>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {COLOR_OPTIONS.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => handleUpdateStage(index, 'color', color.value)}
                                  className={cn(
                                    'w-7 h-7 rounded-lg border-2 transition-all',
                                    stage.color === color.value 
                                      ? 'border-[var(--text-primary)] scale-110' 
                                      : 'border-transparent hover:scale-105'
                                  )}
                                  style={{ backgroundColor: color.value }}
                                  title={color.label}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Icon Picker */}
                          <div>
                            <Label className="text-xs">Icon</Label>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {ICON_OPTIONS.map((iconOpt) => {
                                const Icon = iconOpt.icon
                                return (
                                  <button
                                    key={iconOpt.value}
                                    onClick={() => handleUpdateStage(index, 'icon', iconOpt.value)}
                                    className={cn(
                                      'w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all',
                                      stage.icon === iconOpt.value 
                                        ? 'border-[var(--text-primary)] bg-[var(--glass-bg-inset)] scale-110' 
                                        : 'border-transparent hover:bg-[var(--glass-bg-hover)] hover:scale-105'
                                    )}
                                    title={iconOpt.label}
                                  >
                                    <Icon className="h-4 w-4 text-[var(--text-primary)]" />
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {(stage.is_won || stage.is_lost) && (
                          <Badge variant="outline" className="text-xs">
                            {stage.is_won ? 'Won Stage (Required)' : 'Lost Stage (Required)'}
                          </Badge>
                        )}
                      </div>

                      {/* Remove Button */}
                      {!stage.is_won && !stage.is_lost && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStage(index)}
                          className="flex-shrink-0 mt-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 pt-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleAddStage}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Stage
              </Button>
            </div>
          </>
        )}

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
            style={{ backgroundColor: brandPrimary, color: 'white' }}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Pipeline'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
