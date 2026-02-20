// src/components/sync/PlanDayDialog.jsx
// "Plan my day" dialog - Motion-inspired daily planning view
// Shows calendar, tasks, and suggestions side by side for quick planning

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Calendar,
  Clock,
  Target,
  Plus,
  CheckCircle,
  Circle,
  ArrowRight,
  Sparkles,
  Sun,
  Coffee,
  GripVertical,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  CheckSquare,
  Timer,
  Zap,
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
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { format, addDays, isSameDay, startOfDay, addHours } from 'date-fns'
import { syncApi, portalApi } from '@/lib/portal-api'
import { syncApi as signalSyncApi, crmSkillsApi } from '@/lib/signal-api'
import { toast } from 'sonner'
import SignalIcon from '@/components/ui/SignalIcon'

// Time slots for the day
const TIME_SLOTS = [
  { label: 'Morning', start: 8, end: 12, icon: Coffee },
  { label: 'Afternoon', start: 12, end: 17, icon: Sun },
  { label: 'Evening', start: 17, end: 20, icon: Target },
]

// Get priority badge color
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent':
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
    case 'high':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
    case 'normal':
    case 'medium':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
    case 'low':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// Task card component
function TaskCard({ task, onToggle, onSchedule, isDragging }) {
  const isScheduled = !!task.scheduled_slot
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "p-3 rounded-lg border bg-card transition-shadow group cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg ring-2 ring-primary/20",
        isScheduled && "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={task.status === 'completed'}
            onCheckedChange={() => onToggle?.(task)}
            className="h-5 w-5"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-sm font-medium",
              task.status === 'completed' && "line-through text-muted-foreground"
            )}>
              {task.title}
            </span>
            {task.priority && task.priority !== 'normal' && (
              <Badge variant="secondary" className={cn("text-xs", getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>
            )}
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.time_estimate && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {task.time_estimate}
              </span>
            )}
            {task.source_type && (
              <Badge variant="outline" className="text-xs h-5">
                {task.source_type.replace('_', ' ')}
              </Badge>
            )}
            {isScheduled && (
              <Badge className="text-xs h-5 bg-emerald-500">
                <Clock className="h-3 w-3 mr-1" />
                {task.scheduled_slot}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
    </motion.div>
  )
}

// Suggestion card component
function SuggestionCard({ suggestion, onAdd, isAdding }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border border-dashed bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-1.5 rounded-lg shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">
            {suggestion.title || suggestion.name || suggestion.action}
          </span>
          {suggestion.reason && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {suggestion.reason}
            </p>
          )}
          {suggestion.time_estimate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Timer className="h-3 w-3" />
              {suggestion.time_estimate}
            </span>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          style={{ color: 'var(--brand-primary)' }}
          onClick={() => onAdd?.(suggestion)}
          disabled={isAdding}
        >
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </motion.div>
  )
}

// Calendar event component
function CalendarEvent({ event }) {
  const formatTime = (date) => format(new Date(date), 'h:mm a')
  
  return (
    <div className={cn(
      "px-2 py-1.5 rounded text-xs border-l-2",
      event.type === 'meeting' && "bg-rose-50 border-rose-400 dark:bg-rose-500/10",
      event.type === 'focus' && "bg-teal-50 border-teal-400 dark:bg-teal-500/10",
      event.type === 'task' && "bg-amber-50 border-amber-400 dark:bg-amber-500/10",
      !['meeting', 'focus', 'task'].includes(event.type) && "bg-gray-50 border-gray-300 dark:bg-gray-500/10"
    )}>
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-muted-foreground">
        {formatTime(event.start)} - {formatTime(event.end)}
      </div>
    </div>
  )
}

export default function PlanDayDialog({ 
  open, 
  onOpenChange, 
  projectId,
  initialDate = new Date(),
  onPlanComplete,
}) {
  const [selectedDate, setSelectedDate] = useState(startOfDay(initialDate))
  const [tasks, setTasks] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load all data for the selected day
  const loadDayData = useCallback(async () => {
    if (!projectId) return
    
    try {
      setLoading(true)
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      // Parallel fetch tasks, suggestions, and calendar
      const [tasksResult, crmResult, briefingResult] = await Promise.allSettled([
        // Unified tasks (today + overdue) for project
        syncApi.getUnifiedTasks(projectId),
        
        // CRM suggestions
        crmSkillsApi.prioritizeFollowups(5),
        
        // Daily briefing
        signalSyncApi.getDailyBriefing({ 
          focusAreas: ['sales', 'project', 'meeting-prep'],
          date: dateStr,
        }),
      ])

      // Process tasks (unified-tasks returns today, overdue, upcoming)
      if (tasksResult.status === 'fulfilled') {
        const res = tasksResult.value?.data || tasksResult.value
        const allTasks = [...(res?.today || []), ...(res?.overdue || [])]
        const todayTasks = allTasks.filter(t =>
          !t.status || !['completed', 'done', 'cancelled'].includes(t.status)
        )
        setTasks(todayTasks)
      }

      // Process suggestions
      const allSuggestions = []
      
      if (crmResult.status === 'fulfilled' && crmResult.value?.prioritized_prospects) {
        const crm = crmResult.value.prioritized_prospects.slice(0, 3).map(s => ({
          id: `crm-${s.id}`,
          source: 'crm',
          title: `Follow up with ${s.name}`,
          name: s.name,
          reason: s.reason,
          time_estimate: '15 min',
          ...s,
        }))
        allSuggestions.push(...crm)
      }

      if (briefingResult.status === 'fulfilled' && briefingResult.value?.data?.priorities) {
        const priorities = briefingResult.value.data.priorities.slice(0, 3).map(p => ({
          id: `briefing-${p.rank}`,
          source: 'briefing',
          title: p.action,
          reason: p.reason,
          time_estimate: p.timeEstimate,
          urgency: p.urgency,
          ...p,
        }))
        allSuggestions.push(...priorities)
      }
      
      setSuggestions(allSuggestions)
      
      // TODO: Load calendar events from sync when calendar-items endpoint exists
      // For now, use briefing meetings if available
      if (briefingResult.status === 'fulfilled' && briefingResult.value?.data?.calendar) {
        setCalendarEvents(briefingResult.value.data.calendar || [])
      }
      
    } catch (err) {
      console.error('Failed to load day data:', err)
      toast.error('Failed to load planning data')
    } finally {
      setLoading(false)
    }
  }, [projectId, selectedDate])

  useEffect(() => {
    if (open) {
      loadDayData()
    }
  }, [open, loadDayData])

  // Navigate dates
  const navigateDay = (delta) => {
    setSelectedDate(prev => addDays(prev, delta))
  }

  // Add suggestion as task
  const handleAddSuggestion = async (suggestion) => {
    setAddingId(suggestion.id)
    
    try {
      const payload = {
        source_type: suggestion.source === 'crm' ? 'crm_reminder' : 'uptrade_task',
        title: suggestion.title,
        description: suggestion.reason || '',
        project_id: projectId,
        priority: suggestion.urgency === 'critical' || suggestion.urgency === 'high' ? 'high' : 'normal',
        due_date: selectedDate.toISOString(),
      }

      await syncApi.createUnifiedTask(payload)
      
      // Remove from suggestions, add to tasks
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
      await loadDayData() // Refresh tasks
      
      toast.success(`Added: ${suggestion.title}`)
    } catch (err) {
      console.error('Failed to add suggestion:', err)
      toast.error('Failed to add task')
    } finally {
      setAddingId(null)
    }
  }

  // Toggle task completion
  const handleToggleTask = async (task) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
        : t
    ))
    
    try {
      // TODO: Call API to update task status when endpoint exists
      // For now just the optimistic update
    } catch (err) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.id === task.id ? task : t
      ))
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const highPriority = tasks.filter(t => ['urgent', 'critical', 'high'].includes(t.priority)).length
    
    return { total, completed, remaining: total - completed, highPriority }
  }, [tasks])

  const isToday = isSameDay(selectedDate, new Date())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDay(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDay(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  Plan {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                </DialogTitle>
                <DialogDescription>
                  {format(selectedDate, 'MMMM d, yyyy')}
                  {stats.remaining > 0 && ` · ${stats.remaining} task${stats.remaining !== 1 ? 's' : ''} remaining`}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadDayData} 
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: 'var(--brand-primary)' }} />
                <p className="text-sm text-muted-foreground">Loading your day...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left: Tasks list */}
              <div className="flex-1 border-r overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Tasks for {isToday ? 'Today' : format(selectedDate, 'MMM d')}
                    </h3>
                    <div className="flex items-center gap-2">
                      {stats.highPriority > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {stats.highPriority} urgent
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {stats.completed}/{stats.total} done
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {tasks.length > 0 ? (
                        tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={handleToggleTask}
                          />
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12 text-muted-foreground"
                        >
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No tasks for this day</p>
                          <p className="text-xs mt-1">Add tasks from suggestions below</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Calendar + Suggestions */}
              <div className="w-80 flex flex-col overflow-hidden">
                {/* Mini Calendar Schedule */}
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </h3>
                </div>
                
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Time slots with events */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {TIME_SLOTS.map((slot) => {
                        const SlotIcon = slot.icon
                        const slotEvents = calendarEvents.filter(e => {
                          const hour = new Date(e.start).getHours()
                          return hour >= slot.start && hour < slot.end
                        })
                        
                        return (
                          <div key={slot.label}>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <SlotIcon className="h-3.5 w-3.5" />
                              <span className="font-medium">{slot.label}</span>
                              <span>({slot.start}:00 - {slot.end}:00)</span>
                            </div>
                            
                            {slotEvents.length > 0 ? (
                              <div className="space-y-1.5 ml-5">
                                {slotEvents.map((event, i) => (
                                  <CalendarEvent key={event.id || i} event={event} />
                                ))}
                              </div>
                            ) : (
                              <div className="ml-5 text-xs text-muted-foreground/50 italic">
                                Free time
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>

                  {/* Signal Suggestions */}
                  <div className="border-t">
                    <div className="px-4 py-3 border-b bg-muted/30">
                      <h3 className="font-medium flex items-center gap-2">
                        <SignalIcon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                        Signal Suggests
                      </h3>
                    </div>
                    
                    <ScrollArea className="h-48 p-4">
                      <div className="space-y-2">
                        {suggestions.length > 0 ? (
                          suggestions.map((suggestion) => (
                            <SuggestionCard
                              key={suggestion.id}
                              suggestion={suggestion}
                              onAdd={handleAddSuggestion}
                              isAdding={addingId === suggestion.id}
                            />
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No suggestions right now</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {stats.remaining === 0 && stats.total > 0 ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                All tasks completed!
              </span>
            ) : (
              <span>
                Drag tasks to reorder priorities
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              style={{ backgroundColor: 'var(--brand-primary)' }}
              onClick={() => {
                onPlanComplete?.()
                onOpenChange(false)
                toast.success('Day planned!')
              }}
            >
              <Zap className="h-4 w-4 mr-1" />
              Start Day
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
