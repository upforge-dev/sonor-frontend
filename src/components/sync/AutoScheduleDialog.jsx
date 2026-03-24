// src/components/sync/AutoScheduleDialog.jsx
// Auto-scheduling dialog - Signal suggests optimal time slots for a task

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Zap,
  Timer,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { syncApi as signalSyncApi } from '@/lib/signal-api'
import { syncApi as portalSyncApi } from '@/lib/sonor-api'
import { toast } from 'sonner'
import SignalIcon from '@/components/ui/SignalIcon'

// Slot card component
function SlotCard({ slot, isSelected, onSelect, isLoading }) {
  const startTime = parseISO(slot.startAt)
  const endTime = parseISO(slot.endAt)
  const isToday = new Date().toDateString() === startTime.toDateString()
  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === startTime.toDateString()
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-gray-600 dark:text-gray-400'
  }
  
  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Fair'
  }
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all",
        isSelected 
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20" 
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
      onClick={() => onSelect(slot)}
      disabled={isLoading}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Date */}
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(startTime, 'EEEE, MMM d')}
            </span>
          </div>
          
          {/* Time */}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}
            </span>
          </div>
          
          {/* Reasoning */}
          <p className="text-sm text-muted-foreground">
            {slot.reasoning}
          </p>
          
          {/* Conflicts */}
          {slot.conflicts && slot.conflicts.length > 0 && (
            <div className="mt-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {slot.conflicts.map((c, i) => (
                  <span key={i} className="block">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Score */}
        <div className="text-right">
          <div className={cn("text-2xl font-bold", getScoreColor(slot.score))}>
            {slot.score}
          </div>
          <div className="text-xs text-muted-foreground">
            {getScoreLabel(slot.score)}
          </div>
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-3 pt-3 border-t flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Selected</span>
        </div>
      )}
    </motion.button>
  )
}

export default function AutoScheduleDialog({ 
  open, 
  onOpenChange, 
  task,
  onScheduled,
}) {
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [slots, setSlots] = useState([])
  const [reasoning, setReasoning] = useState('')
  const [warnings, setWarnings] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [error, setError] = useState(null)
  
  // Fetch suggested slots when dialog opens
  useEffect(() => {
    if (open && task) {
      fetchSlots()
    }
  }, [open, task])
  
  const fetchSlots = async () => {
    setLoading(true)
    setError(null)
    setSlots([])
    setSelectedSlot(null)
    
    try {
      const estimatedMinutes = task.estimated_hours 
        ? task.estimated_hours * 60 
        : 60 // Default 1 hour if not set
      
      const result = await signalSyncApi.scheduleTask({
        title: task.title,
        description: task.description,
        estimatedMinutes,
        dueDate: task.due_at || task.due_date,
        priority: task.priority === 'urgent' ? 'high' : task.priority || 'medium',
        requiresFocus: true,
        projectId: task.project_id,
      })
      
      setSlots(result.suggestedSlots || [])
      setReasoning(result.reasoning || '')
      setWarnings(result.warnings || [])
      
      // Auto-select first slot if it's excellent
      if (result.suggestedSlots?.length > 0 && result.suggestedSlots[0].score >= 80) {
        setSelectedSlot(result.suggestedSlots[0])
      }
    } catch (err) {
      console.error('Failed to get schedule suggestions:', err)
      setError('Failed to get scheduling suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSchedule = async () => {
    if (!selectedSlot) return
    
    setScheduling(true)
    try {
      // Create a focus time block on the calendar
      await signalSyncApi.blockFocusTime({
        start: selectedSlot.startAt,
        end: selectedSlot.endAt,
        title: `Focus: ${task.title}`,
        taskId: task.id,
        taskSource: task.source_type,
      })
      
      toast.success('Task scheduled!', {
        description: `Blocked ${format(parseISO(selectedSlot.startAt), 'EEEE h:mm a')} for "${task.title}"`,
      })
      
      onScheduled?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to schedule task:', err)
      toast.error('Failed to schedule task')
    } finally {
      setScheduling(false)
    }
  }
  
  if (!task) return null
  
  const estimatedHours = task.estimated_hours || 1
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
            >
              <SignalIcon className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <span>Auto-Schedule Task</span>
          </DialogTitle>
          <DialogDescription>
            Signal analyzed your calendar to find the best time for this task.
          </DialogDescription>
        </DialogHeader>
        
        {/* Task Info */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <h4 className="font-medium mb-1">{task.title}</h4>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              {estimatedHours} {estimatedHours === 1 ? 'hour' : 'hours'}
            </span>
            {task.due_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due {format(parseISO(task.due_at), 'MMM d')}
              </span>
            )}
            {task.priority && task.priority !== 'normal' && (
              <Badge variant="outline" className="text-xs capitalize">
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Analyzing your calendar...
            </p>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSlots}>
              Try Again
            </Button>
          </div>
        )}
        
        {/* Results */}
        {!loading && !error && slots.length > 0 && (
          <>
            {/* Reasoning */}
            {reasoning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {reasoning}
                </p>
              </div>
            )}
            
            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  {warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Slot Options */}
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {slots.map((slot, i) => (
                  <SlotCard
                    key={i}
                    slot={slot}
                    isSelected={selectedSlot === slot}
                    onSelect={setSelectedSlot}
                    isLoading={scheduling}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
        
        {/* No Slots */}
        {!loading && !error && slots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No suitable time slots found. Your calendar may be too busy.
            </p>
            <Button variant="outline" size="sm" onClick={fetchSlots} className="mt-3">
              Try Again
            </Button>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!selectedSlot || scheduling}
            className="gap-2"
          >
            {scheduling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Schedule Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
